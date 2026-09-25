'use client';

import React, { useState, useTransition } from 'react';
import {
    Heart,
    MessageCircle,
    Send,
    Bookmark,
    MoreHorizontal,
    UserPlus,
    UserMinus
} from 'lucide-react';
import styles from './Post.module.css';
import { toggleLike, toggleShotLike, toggleSavedPost, toggleSavedShot, addComment, addShotComment, trackView } from '@/app/actions';
import PostDetailModal from '../modals/PostDetailModal';
import { formatDistanceToNow } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import { pusherClient } from '@/lib/pusher';
import { triggerHaptic, triggerHapticNotification } from '@/lib/haptics';
import { ImpactStyle, NotificationType } from '@capacitor/haptics';
import RichText from '../common/RichText';
import { useToast } from '@/contexts/ToastContext';

interface PostProps {
    id: string;
    type?: 'post' | 'shot';
    user: {
        username: string;
        avatar?: string | null;
    };
    image?: string;
    video?: string;
    likes: number;
    isLiked?: boolean;
    caption: string;
    time: string;
    media?: Array<{ url: string; type: string; order: number }>;
    comments?: Array<{
        id: string;
        text: string;
        user: {
            username: string;
            avatar?: string;
        };
        createdAt: string;
    }>;
}

const Post: React.FC<PostProps> = ({ id, type = 'post', user, image, video, media = [], likes, isLiked: initialIsLiked, caption, time, comments = [] }) => {
    const [isLiked, setIsLiked] = useState(initialIsLiked || false);
    const [localLikes, setLocalLikes] = useState(likes);
    const [localViews, setLocalViews] = useState(0); // View count starts at 0 for simplicity if not provided
    const [isPending, startTransition] = useTransition();
    const { showToast } = useToast();
    const [showHeart, setShowHeart] = useState(false);
    const [isSaved, setIsSaved] = useState(false);
    const [isFollowingAuthor, setIsFollowingAuthor] = useState(false);
    const [imageLoaded, setImageLoaded] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [showCollections, setShowCollections] = useState(false);
    const [savedToastText, setSavedToastText] = useState<string | null>(null);
    const [comment, setComment] = useState('');
    const [localComments, setLocalComments] = useState(comments);
    const [captionExpanded, setCaptionExpanded] = useState(false);
    const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const videoRef = React.useRef<HTMLVideoElement>(null);
    const postRef = React.useRef<HTMLElement>(null);
    const viewTracked = React.useRef(false);

    const handleImageClick = () => {
        if (type === 'post') {
            setIsDetailOpen(true);
            triggerHaptic(ImpactStyle.Light);
        }
    };

    // Real-time Listeners
    React.useEffect(() => {
        const channelName = `${type}-${id}`;
        const channel = pusherClient.subscribe(channelName);

        channel.bind('like-update', (data: any) => {
            setLocalLikes(prev => prev + (data.increment || 1));
        });

        channel.bind('new-comment', (data: any) => {
            const newComment = {
                id: data.id || Date.now().toString(),
                text: data.text,
                user: { username: data.username, avatar: data.avatar || '' },
                createdAt: data.createdAt || new Date().toISOString()
            };
            setLocalComments(prev => [newComment, ...prev]);
        });

        channel.bind('view-update', (data: any) => {
            setLocalViews(prev => prev + (data.increment || 1));
        });

        return () => {
            pusherClient.unsubscribe(channelName);
        };
    }, [id, type]);

    // View Tracking
    React.useEffect(() => {
        if (!postRef.current) return;

        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !viewTracked.current) {
                viewTracked.current = true;
                trackView(id, type.toUpperCase() as any);
            }
        }, { threshold: 0.5 });

        observer.observe(postRef.current);
        return () => observer.disconnect();
    }, [id, type]);

    const handleLike = async () => {
        const newIsLiked = !isLiked;
        setIsLiked(newIsLiked);
        setLocalLikes(prev => newIsLiked ? prev + 1 : prev - 1);

        if (newIsLiked) {
            setShowHeart(true);
            triggerHaptic(ImpactStyle.Medium);
            setTimeout(() => setShowHeart(false), 1000);
        } else {
            triggerHaptic(ImpactStyle.Light);
        }

        startTransition(async () => {
            try {
                if (type === 'shot' || video) {
                    await toggleShotLike(id);
                } else {
                    await toggleLike(id);
                }
            } catch (error) {
                setIsLiked(!newIsLiked);
                setLocalLikes(prev => !newIsLiked ? prev + 1 : prev - 1);
                console.error('Failed to toggle like:', error);
            }
        });
    };

    // Auto-play video on intersect could be added here, but simple controls or autoplay loop is fine for now

    // ... comment and share handlers ...

    const handleComment = () => {
        if (comment.trim()) {
            const newComment = {
                id: Date.now().toString(),
                text: comment,
                user: { username: 'You', avatar: '' }, // Optimistic user
                createdAt: new Date().toISOString()
            };
            setLocalComments([...localComments, newComment]);
            setComment('');
            triggerHaptic(ImpactStyle.Light);

            startTransition(async () => {
                try {
                    if (type === 'shot' || video) {
                        await addShotComment(id, newComment.text);
                    } else {
                        await addComment(id, newComment.text);
                    }
                } catch (error) {
                    console.error('Failed to post comment:', error);
                    // Revert optimistic update
                    setLocalComments(prev => prev.filter(c => c.id !== newComment.id));
                }
            });
        }
    };

    const handleSave = () => {
        const newIsSaved = !isSaved;
        setIsSaved(newIsSaved);
        triggerHapticNotification(NotificationType.Success);
        showToast(newIsSaved ? 'Saved to bookmarks 🔖' : 'Removed from bookmarks', 'info');

        startTransition(async () => {
            try {
                if (type === 'shot' || video) {
                    await toggleSavedShot(id);
                } else {
                    await toggleSavedPost(id);
                }
            } catch (error) {
                setIsSaved(!newIsSaved);
                console.error('Failed to toggle save:', error);
            }
        });
    };

    const handleFollow = () => {
        const next = !isFollowingAuthor;
        setIsFollowingAuthor(next);
        showToast(next ? `Following @${user.username} ✨` : `Unfollowed @${user.username}`, 'info');

        startTransition(async () => {
            try {
                const { toggleFollow } = await import('@/app/actions');
                await toggleFollow(user.username);
            } catch (err) {
                console.error('Follow toggle failed', err);
                setIsFollowingAuthor(!next);
            }
        });
    };

    const handleShare = () => {
        if (navigator.share) {
            navigator.share({
                title: `Post by ${user.username}`,
                text: caption,
                url: window.location.href,
            }).catch(() => {
                navigator.clipboard.writeText(window.location.href);
                showToast('Link copied to clipboard! 📋', 'success');
            });
        } else {
            navigator.clipboard.writeText(window.location.href);
            triggerHaptic(ImpactStyle.Light);
            showToast('Link copied to clipboard! 📋', 'success');
        }
    };

    const formatLikes = (count: number) => {
        if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
        if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
        return count.toLocaleString();
    };

    return (
        <motion.article
            ref={postRef as any}
            layout
            className={styles.post}
            variants={{
                hidden: { opacity: 0, y: 20 },
                show: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } }
            }}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
        >
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.userInfo}>
                    <div className={styles.avatarRing}>
                        <Image src={user.avatar || 'https://i.pravatar.cc/150'} alt={user.username} className={styles.avatar} width={40} height={40} />
                    </div>
                    <div className={styles.userMeta}>
                        <span className={styles.username}>{user.username}</span>
                        <span className={styles.time}>{time}</span>
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button className={styles.followBtn} onClick={(e) => { e.stopPropagation(); handleFollow(); }}>
                        {isFollowingAuthor ? <UserMinus size={16} /> : <UserPlus size={16} />}
                        <span style={{ marginLeft: 6 }}>{isFollowingAuthor ? 'Following' : 'Follow'}</span>
                    </button>
                    <button className={styles.moreBtn}>
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>

            {/* Content (Image or Video) */}
            <div className={styles.imageContainer} onDoubleClick={handleLike} onClick={handleImageClick}>
                {!imageLoaded && !video && (
                    <div className={`${styles.imageSkeleton} skeleton`}></div>
                )}

                <div className={styles.mediaCarousel}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={media.length > 0 ? media[currentMediaIndex]?.url : (image || video)}
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className={styles.mediaWrapper}
                        >
                            {(media[currentMediaIndex]?.type === 'VIDEO' || video) ? (
                                <video
                                    ref={videoRef}
                                    src={media.length > 0 ? media[currentMediaIndex].url : video}
                                    className={styles.postImage}
                                    autoPlay
                                    muted
                                    loop
                                    playsInline
                                    onLoadedData={() => setImageLoaded(true)}
                                />
                            ) : (
                                (media.length > 0 ? media[currentMediaIndex].url : image) ? (
                                    <Image
                                        src={media.length > 0 ? media[currentMediaIndex].url : (image || '')}
                                        alt="Post content"
                                        className={`${styles.postImage} ${imageLoaded ? styles.loaded : ''}`}
                                        width={600}
                                        height={600}
                                        onLoad={() => setImageLoaded(true)}

                                    />
                                ) : (
                                    <div className={styles.imagePlaceholder}>
                                        <span>Image not available</span>
                                    </div>
                                )
                            )}
                        </motion.div>
                    </AnimatePresence>

                    {media.length > 1 && (
                        <>
                            {currentMediaIndex > 0 && (
                                <button className={styles.carouselBtnPrev} onClick={() => setCurrentMediaIndex(i => i - 1)}>
                                    ‹
                                </button>
                            )}
                            {currentMediaIndex < media.length - 1 && (
                                <button className={styles.carouselBtnNext} onClick={() => setCurrentMediaIndex(i => i + 1)}>
                                    ›
                                </button>
                            )}
                            <div className={styles.carouselDots}>
                                {media.map((_, i) => (
                                    <div key={i} className={`${styles.dot} ${i === currentMediaIndex ? styles.activeDot : ''}`} />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                <AnimatePresence>
                    {showHeart && (
                        <motion.div
                            className={styles.largeHeart}
                            initial={{ scale: 0, opacity: 0 }}
                            animate={{ scale: 1.2, opacity: 1 }}
                            exit={{ scale: 0, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 12 }}
                        >
                            <Heart size={80} fill="white" color="white" />
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Actions */}
            <div className={styles.actions}>
                <div className={styles.leftActions}>
                    <motion.button
                        whileTap={{ scale: 0.75 }}
                        className={`${styles.actionButton} ${isLiked ? styles.liked : ''}`}
                        onClick={handleLike}
                        disabled={isPending}
                    >
                        <Heart size={24} fill={isLiked ? '#ed4956' : 'none'} color={isLiked ? '#ed4956' : 'currentColor'} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.75 }}
                        className={styles.actionButton}
                        onClick={() => setShowComments(!showComments)}
                    >
                        <MessageCircle size={24} />
                    </motion.button>
                    <motion.button
                        whileTap={{ scale: 0.75 }}
                        className={styles.actionButton}
                        onClick={handleShare}
                    >
                        <Send size={22} />
                    </motion.button>
                </div>
                <div style={{ position: 'relative' }}>
                    <motion.button
                        whileTap={{ scale: 0.75 }}
                        className={`${styles.actionButton} ${isSaved ? styles.saved : ''}`}
                        onClick={handleSave}
                        onContextMenu={(e: { preventDefault: () => void; }) => { e.preventDefault(); setShowCollections(!showCollections); }}
                    >
                        <Bookmark size={24} fill={isSaved ? 'currentColor' : 'none'} />
                    </motion.button>

                    {/* Bookmark Collections Popover */}
                    <AnimatePresence>
                        {showCollections && (
                            <motion.div
                                className={styles.collectionsPopover}
                                initial={{ opacity: 0, y: 8, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 8, scale: 0.95 }}
                            >
                                <div className={styles.collectionsTitle}>Save to Collection</div>
                                {['⭐ Favorites', '🎨 Design Ideas', '✈️ Travel Bucket List', '🍳 Recipes', '💡 Inspiration'].map(col => (
                                    <button
                                        key={col}
                                        className={styles.collectionItem}
                                        onClick={() => {
                                            if (!isSaved) handleSave();
                                            setShowCollections(false);
                                            setSavedToastText(`Saved to ${col}`);
                                            setTimeout(() => setSavedToastText(null), 2000);
                                        }}
                                    >
                                        {col}
                                    </button>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Saved Toast */}
            <AnimatePresence>
                {savedToastText && (
                    <motion.div
                        className={styles.savedToast}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                    >
                        ✅ {savedToastText}
                    </motion.div>
                )}
            </AnimatePresence>


            {/* Engagement */}
            <div className={styles.engagement}>
                <div style={{ display: 'flex', gap: 12 }}>
                    <div className={styles.likes}>{formatLikes(localLikes)} likes</div>
                    <div className={styles.likes}>{formatLikes(localViews)} views</div>
                </div>
                <div className={styles.caption}>
                    <span className={styles.captionUser}>{user.username}</span>
                    {caption.length > 100 && !captionExpanded ? (
                        <>
                            <RichText text={caption.substring(0, 100) + '... '} />
                            <button
                                className={styles.moreBtn}
                                onClick={() => setCaptionExpanded(true)}
                            >
                                more
                            </button>
                        </>
                    ) : (
                        <RichText text={caption} />
                    )}
                </div>
                <button
                    className={styles.viewComments}
                    onClick={() => setShowComments(!showComments)}
                >
                    View all comments
                </button>
            </div>

            {/* Comment Input */}
            <AnimatePresence>
                {showComments && (
                    <motion.div
                        className={styles.commentSection}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        {localComments && localComments.length > 0 && (
                            <div className={styles.commentList}>
                                {localComments.map((c) => (
                                    <div key={c.id} className={styles.comment}>
                                        <div className={styles.commentContent}>
                                            <div>
                                                <span className={styles.commentUser}>{c.user.username}</span>
                                                <span className={styles.commentText}>{c.text}</span>
                                            </div>
                                            <span className={styles.commentTime}>
                                                {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        <div className={styles.commentInput}>
                            <input
                                type="text"
                                placeholder="Add a comment..."
                                value={comment}
                                onChange={(e) => setComment(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                                className={styles.input}
                            />
                            {comment.trim() && (
                                <motion.button
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    className={styles.postBtn}
                                    onClick={handleComment}
                                >
                                    Post
                                </motion.button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
            {isDetailOpen && (
                <PostDetailModal
                    isOpen={isDetailOpen}
                    onClose={() => setIsDetailOpen(false)}
                    post={{
                        id,
                        userId: '', // Placeholder
                        user: user as any,
                        image: image || (media.length > 0 ? media[0].url : ''),
                        caption,
                        likes: localLikes,
                        comments: localComments.length,
                        isLiked,
                        isSaved,
                        createdAt: new Date(), // Placeholder
                        media
                    }}
                />
            )}
        </motion.article>
    );
};

export default Post;
