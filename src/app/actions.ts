'use server';

import prisma from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { MediaService } from '@/services/media-service';
import { sendWebPushNotification } from '@/lib/push';
import { chatChannel, pusherServer, userConversationChannel } from '@/lib/pusher';
import { requireAuth } from '@/lib/auth';
import { z } from 'zod';

const sanitize = (text: string) => text.replace(/<[^>]*>?/gm, '').trim();

export async function createPost(formData: FormData) {
    const caption = sanitize(formData.get('caption') as string);
    const location = sanitize(formData.get('location') as string || '');

    // Collect all media URLs
    const mediaUrls: string[] = [];
    let i = 0;
    while (formData.has(`media-${i}`)) {
        mediaUrls.push(formData.get(`media-${i}`) as string);
        i++;
    }

    // Fallback to legacy 'image' field if no media-X fields
    const legacyImage = formData.get('image') as string;
    if (mediaUrls.length === 0 && legacyImage) {
        mediaUrls.push(legacyImage);
    }

    if (mediaUrls.length === 0) {
        throw new Error('At least one media item is required');
    }

    try {
        // 1. Identify User (SECURE)
        const user = await requireAuth();

        // 2. Process Media
        // We handle Shots (video) and Posts (images/carousel)
        // If the first item is a video, we create a Shot
        const firstMedia = mediaUrls[0];
        const isVideo = firstMedia.endsWith('.mp4') || firstMedia.endsWith('.webm') || firstMedia.startsWith('data:video/');

        if (isVideo) {
            // Processing for Shot (Single Video)
            let videoUrl = firstMedia;
            if (firstMedia.startsWith('data:')) {
                const res = await MediaService.processAndUpload(firstMedia);
                videoUrl = res.url;
            }

            const shot = await prisma.shot.create({
                data: {
                    video: videoUrl,
                    caption: caption + (location ? ` • ${location}` : ''),
                    userId: user.id,
                    music: 'Original Audio',
                    location: location || undefined
                }
            });
            revalidatePath('/shots');

            // Trigger Real-time update for Shots
            await pusherServer.trigger('feed', 'new-shot', {
                ...shot,
                user: { username: user.username, avatar: user.avatar }
            });

            return shot;
        } else {
            // Processing for Post (Can be carousel)
            const post = await prisma.post.create({
                data: {
                    caption: caption + (location ? ` • ${location}` : ''),
                    userId: user.id,
                    location: location || undefined
                }
            });

            // Create Media entries for each URL
            for (let j = 0; j < mediaUrls.length; j++) {
                let currentUrl = mediaUrls[j];
                let type = currentUrl.endsWith('.mp4') || currentUrl.startsWith('data:video/') ? 'VIDEO' : 'IMAGE';

                if (currentUrl.startsWith('data:')) {
                    const res = await MediaService.processAndUpload(currentUrl);
                    currentUrl = res.url;
                    type = res.type.toUpperCase();
                }

                await prisma.media.create({
                    data: {
                        url: currentUrl,
                        type,
                        order: j,
                        postId: post.id
                    }
                });
            }

            revalidatePath('/');
            revalidatePath('/profile');

            // Trigger Real-time update for Posts
            await pusherServer.trigger('feed', 'new-post', {
                ...post,
                media: await prisma.media.findMany({ where: { postId: post.id } }),
                user: { username: user.username, avatar: user.avatar }
            });

            return post;
        }

    } catch (error) {
        console.error('Server Action Error (createPost):', error);
        throw new Error('Failed to create content: ' + (error as Error).message);
    }
}

export async function createStory(formData: FormData) {
    const imageUrl = formData.get('image') as string;
    if (!imageUrl) throw new Error('Story image is required');

    try {
        const user = await requireAuth();

        let finalUrl = imageUrl;
        if (imageUrl.startsWith('data:')) {
            const res = await MediaService.processAndUpload(imageUrl);
            finalUrl = res.url;
        }

        const story = await prisma.story.create({
            data: {
                image: finalUrl,
                userId: user.id,
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
            }
        });

        revalidatePath('/');

        // Trigger Real-time update for Stories
        await pusherServer.trigger('stories', 'new-story', {
            ...story,
            user: { username: user.username, avatar: user.avatar }
        });

        return story;
    } catch (error) {
        console.error('Create Story Error:', error);
        throw new Error('Failed to create story');
    }
}

export async function toggleLike(postId: string) {
    const user = await requireAuth();

    const existingLike = await prisma.like.findUnique({
        where: {
            userId_postId: {
                userId: user.id,
                postId: postId,
            },
        },
    });

    if (existingLike) {
        await prisma.like.delete({
            where: { id: existingLike.id },
        });
    } else {
        await prisma.like.create({
            data: {
                userId: user.id,
                postId: postId,
            },
        });

        // Notify Author
        const post = await prisma.post.findUnique({
            where: { id: postId },
            select: { userId: true }
        });

        if (post && post.userId !== user.id) {
            // Send Web Push Notification
            await sendWebPushNotification(post.userId, {
                title: 'New Like',
                body: `${user.username || 'Someone'} liked your post!`,
                url: `/post/${postId}`
            });
        }
    }

    // Trigger Pusher for real-time Like count increment (optional enhancement)
    await pusherServer.trigger(`post-${postId}`, 'like-update', { count: 1 });

    revalidatePath('/');
}

export async function toggleShotLike(shotId: string) {
    const user = await requireAuth();

    const existingLike = await prisma.shotLike.findUnique({
        where: {
            userId_shotId: {
                userId: user.id,
                shotId: shotId,
            },
        },
    });

    if (existingLike) {
        await prisma.shotLike.delete({
            where: { id: existingLike.id },
        });
    } else {
        await prisma.shotLike.create({
            data: {
                userId: user.id,
                shotId: shotId,
            },
        });
    }

    await pusherServer.trigger(`shot-${shotId}`, 'like-update', { increment: 1 });

    revalidatePath('/shots');
}

export async function addComment(postId: string, text: string) {
    const user = await requireAuth();
    const cleanText = sanitize(text);

    if (!cleanText) throw new Error('Comment cannot be empty');

    const comment = await prisma.comment.create({
        data: {
            text: cleanText,
            userId: user.id,
            postId
        },
        include: {
            user: { select: { username: true, avatar: true } }
        }
    });

    const post = await prisma.post.findUnique({ where: { id: postId }, select: { userId: true } });
    if (post && post.userId !== user.id) {
        // Send Web Push Notification
        await sendWebPushNotification(post.userId, {
            title: 'New Comment',
            body: `${user.username || 'Someone'} commented: "${cleanText}"`,
            url: `/post/${postId}`
        });
    }

    // Real-time update for comments
    await pusherServer.trigger(`post-${postId}`, 'new-comment', comment);

    revalidatePath('/');
}

export async function addShotComment(shotId: string, text: string) {
    const user = await requireAuth();
    const cleanText = sanitize(text);

    if (!cleanText) throw new Error('Comment cannot be empty');

    await prisma.shotComment.create({
        data: {
            text: cleanText,
            userId: user.id,
            shotId
        }
    });

    await pusherServer.trigger(`shot-${shotId}`, 'new-comment', {
        text: cleanText,
        username: user.username,
        createdAt: new Date()
    });

    revalidatePath('/shots');
}

export async function toggleSavedPost(postId: string) {
    const user = await requireAuth();

    const existingSave = await prisma.savedPost.findUnique({
        where: {
            userId_postId: {
                userId: user.id,
                postId
            }
        }
    });

    if (existingSave) {
        await prisma.savedPost.delete({
            where: { id: existingSave.id }
        });
    } else {
        await prisma.savedPost.create({
            data: {
                userId: user.id,
                postId
            }
        });
    }

    // Not strictly necessary for suggested feed rank, but good practice
    revalidatePath('/');
    revalidatePath('/saved');
}

export async function toggleSavedShot(shotId: string) {
    const user = await requireAuth();

    const existingSave = await prisma.savedShot.findUnique({
        where: {
            userId_shotId: {
                userId: user.id,
                shotId
            }
        }
    });

    if (existingSave) {
        await prisma.savedShot.delete({
            where: { id: existingSave.id }
        });
    } else {
        await prisma.savedShot.create({
            data: {
                userId: user.id,
                shotId
            }
        });
    }

    revalidatePath('/shots');
    revalidatePath('/saved');
}

export async function toggleFollow(targetUsername: string) {
    const user = await requireAuth();

    const target = await prisma.user.findUnique({ where: { username: targetUsername } });
    if (!target) throw new Error('Target user not found');

    // Check existing follow
    const existing = await prisma.follows.findFirst({
        where: {
            followerId: user.id,
            followingId: target.id,
        }
    });

    if (existing) {
        await prisma.follows.delete({ where: { id: existing.id } });
    } else {
        await prisma.follows.create({ data: { followerId: user.id, followingId: target.id } });

        // send notification (best effort)
        if (target.id !== user.id) {
            // Send Web Push Notification
            await sendWebPushNotification(target.id, {
                title: 'New Follower',
                body: `${user.username || 'Someone'} started following you!`,
                url: `/profile/${user.username}`
            });
        }
    }

    // Revalidate profile routes
    revalidatePath('/profile');
}

export async function updateUserSettings(data: {
    fullName?: string;
    username?: string;
    bio?: string;
    website?: string;
    isPrivate?: boolean;
    avatar?: string;
    coverPhoto?: string;
}) {
    const schema = z.object({
        fullName: z.string().max(50).optional(),
        username: z.string().min(3).max(20).regex(/^[a-zA-Z0-9_]+$/).optional(),
        bio: z.string().max(200).optional(),
        website: z.string().url().or(z.literal('')).optional(),
        isPrivate: z.boolean().optional(),
        avatar: z.string().url().optional(),
        coverPhoto: z.string().max(500).optional(),
    });

    try {
        const validated = schema.parse(data);
        const user = await requireAuth();

        const updatedUser = await prisma.user.update({
            where: { id: user.id },
            data: {
                fullName: validated.fullName ? sanitize(validated.fullName) : undefined,
                username: validated.username,
                bio: validated.bio ? sanitize(validated.bio) : undefined,
                website: validated.website,
                isPrivate: validated.isPrivate,
                avatar: validated.avatar,
                coverPhoto: validated.coverPhoto,
            }
        });

        revalidatePath('/settings');
        revalidatePath('/profile');
        revalidatePath('/');

        return { success: true, user: updatedUser };
    } catch (error) {
        console.error('Update Settings Error:', error);
        return { success: false, error: (error as Error).message };
    }
}

export async function trackView(targetId: string, targetType: 'POST' | 'SHOT') {
    try {
        // Trigger real-time view counter update
        await pusherServer.trigger(`${targetType.toLowerCase()}-${targetId}`, 'view-update', { increment: 1 });

        return { success: true };
    } catch (error) {
        console.warn('View tracking failed', error);
        return { success: false };
    }
}

export async function getConversations() {
    const user = await requireAuth();

    const conversations = await prisma.conversation.findMany({
        where: {
            participants: {
                some: { id: user.id }
            }
        },
        include: {
            participants: {
                where: { id: { not: user.id } },
                select: {
                    id: true,
                    username: true,
                    avatar: true,
                    fullName: true
                }
            },
            messages: {
                orderBy: { createdAt: 'desc' },
                take: 1
            }
        },
        orderBy: { updatedAt: 'desc' }
    });

    return conversations;
}

export async function getMessages(conversationId: string) {
    const user = await requireAuth();

    // Verify user is participant
    const conversation = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            participants: { some: { id: user.id } }
        }
    });

    if (!conversation) throw new Error('Conversation not found');

    const messages = await prisma.message.findMany({
        where: { conversationId },
        include: {
            sender: {
                select: {
                    id: true,
                    username: true,
                    avatar: true
                }
            }
        },
        orderBy: { createdAt: 'asc' }
    });

    return messages;
}

export async function sendMessage(conversationId: string, content: string) {
    const user = await requireAuth();
    const cleanContent = sanitize(content);

    if (!cleanContent) throw new Error('Message cannot be empty');

    // Verify participant
    const conv = await prisma.conversation.findFirst({
        where: {
            id: conversationId,
            participants: { some: { id: user.id } }
        }
    });

    if (!conv) throw new Error('Unauthorized or invalid conversation');

    const message = await prisma.message.create({
        data: {
            content: cleanContent,
            conversationId,
            senderId: user.id
        },
        include: {
            sender: {
                select: {
                    id: true,
                    username: true,
                    avatar: true
                }
            }
        }
    });

    // Update conversation timestamp
    await prisma.conversation.update({
        where: { id: conversationId },
        data: { updatedAt: new Date() }
    });

    // Trigger Pusher for real-time delivery
    await pusherServer.trigger(chatChannel(conversationId), 'new-message', message);

    // Trigger update for conversation list (for other participant)
    const otherParticipant = await prisma.user.findFirst({
        where: {
            conversations: { some: { id: conversationId } },
            id: { not: user.id }
        }
    });

    if (otherParticipant) {
        await pusherServer.trigger(userConversationChannel(otherParticipant.id), 'conversation-update', {
            conversationId,
            lastMessage: message
        });

        // Push Notification
        await sendWebPushNotification(otherParticipant.id, {
            title: `Message from ${user.username}`,
            body: cleanContent,
            url: `/messages?conv=${conversationId}`
        });
    }

    return message;
}

export async function startConversation(participantUsername: string) {
    const user = await requireAuth();
    
    const otherUser = await prisma.user.findUnique({
        where: { username: participantUsername }
    });

    if (!otherUser) throw new Error('User not found');
    if (otherUser.id === user.id) throw new Error('Cannot start conversation with yourself');

    // Check for existing 1:1 conversation
    const existing = await prisma.conversation.findFirst({
        where: {
            AND: [
                { participants: { some: { id: user.id } } },
                { participants: { some: { id: otherUser.id } } }
            ]
        }
    });

    if (existing) return existing;

    const conversation = await prisma.conversation.create({
        data: {
            participants: {
                connect: [{ id: user.id }, { id: otherUser.id }]
            }
        }
    });

    return conversation;
}

export async function broadcastTyping(conversationId: string, isTyping: boolean) {
    const user = await requireAuth();
    try {
        const conversation = await prisma.conversation.findFirst({
            where: { id: conversationId, participants: { some: { id: user.id } } },
            select: { id: true }
        });

        if (!conversation) return { success: false };

        await pusherServer.trigger(chatChannel(conversationId), 'typing-status', {
            userId: user.id,
            username: user.username,
            isTyping
        });
        return { success: true };
    } catch (error) {
        console.error('Typing trigger error:', error);
        return { success: false };
    }
}

export async function broadcastReaction(conversationId: string, messageId: string, emoji: string) {
    const user = await requireAuth();
    try {
        const message = await prisma.message.findFirst({
            where: {
                id: messageId,
                conversationId,
                conversation: { participants: { some: { id: user.id } } }
            },
            select: { id: true }
        });

        if (!message) return { success: false };

        await pusherServer.trigger(chatChannel(conversationId), 'message-reaction', {
            messageId,
            userId: user.id,
            username: user.username,
            emoji
        });
        return { success: true };
    } catch (error) {
        console.error('Reaction trigger error:', error);
        return { success: false };
    }
}

export async function deleteMessage(conversationId: string, messageId: string) {
    const user = await requireAuth();
    try {
        const msg = await prisma.message.findUnique({
            where: { id: messageId }
        });

        if (!msg || msg.senderId !== user.id) {
            throw new Error('Unauthorized or message not found');
        }

        await prisma.message.delete({
            where: { id: messageId }
        });

        await pusherServer.trigger(chatChannel(conversationId), 'message-deleted', {
            messageId
        });

        return { success: true };
    } catch (error) {
        console.error('Delete message error:', error);
        return { success: false, error: (error as Error).message };
    }
}
