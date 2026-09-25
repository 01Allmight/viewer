import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getSession } from '@/lib/auth';

const PROFILE_FIELDS = ['username', 'fullName', 'bio', 'avatar', 'coverPhoto', 'website', 'category', 'isPrivate'] as const;

export async function GET() {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: session.id },
            include: {
                posts: {
                    include: {
                        likes: true,
                        comments: true,
                        media: { orderBy: { order: 'asc' } }
                    },
                    orderBy: { createdAt: 'desc' },
                    take: 100,
                },
                shots: true,
                _count: {
                    select: {
                        followedBy: true,
                        following: true
                    }
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Return fields expected by the frontend
        const responseUser = {
            id: user.id,
            username: user.username,
            avatar: user.avatar,
            coverPhoto: user.coverPhoto,
            bio: user.bio,
            website: user.website,
            category: user.category,
            fullName: user.fullName || user.username,
            isPrivate: user.isPrivate,
            createdAt: user.createdAt,
            _count: {
                posts: user.posts ? user.posts.length : 0,
                shots: user.shots ? user.shots.length : 0,
                followedBy: user._count.followedBy,
                following: user._count.following
            },
            posts: user.posts || [],
            shots: user.shots || [],
        };

        return NextResponse.json(responseUser);
    } catch (err) {
        console.error('API Error (GET /api/users/me):', err);
        return NextResponse.json({
            error: 'Internal Server Error'
        }, { status: 500 });
    }
}

export async function PATCH(request: Request) {
    try {
        const session = await getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const data = Object.fromEntries(
            PROFILE_FIELDS
                .filter(field => body[field] !== undefined)
                .map(field => [field, body[field]])
        );

        const user = await prisma.user.update({
            where: { id: session.id },
            data
        });

        return NextResponse.json({
            id: user.id,
            username: user.username,
            fullName: user.fullName,
            bio: user.bio,
            avatar: user.avatar,
            coverPhoto: user.coverPhoto,
            website: user.website,
            category: user.category,
            isPrivate: user.isPrivate
        });
    } catch (err) {
        console.error('API Error (PATCH /api/users/me):', err);
        return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
    }
}
