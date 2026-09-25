import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
    _request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const comments = await prisma.comment.findMany({
            where: { postId: id },
            include: {
                user: { select: { id: true, username: true, avatar: true, fullName: true } }
            },
            orderBy: { createdAt: 'asc' }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error('Failed to fetch post comments:', error);
        return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }
}