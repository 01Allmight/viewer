import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { pusherServer } from '@/lib/pusher';

export async function POST(request: Request) {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (
        !process.env.PUSHER_APP_ID ||
        !process.env.PUSHER_KEY ||
        !process.env.PUSHER_SECRET ||
        !process.env.PUSHER_CLUSTER
    ) {
        return NextResponse.json({ error: 'Realtime messaging is not configured' }, { status: 503 });
    }

    const formData = await request.formData();
    const socketId = formData.get('socket_id');
    const channelName = formData.get('channel_name');

    if (typeof socketId !== 'string' || typeof channelName !== 'string') {
        return NextResponse.json({ error: 'Invalid Pusher authorization request' }, { status: 400 });
    }

    let authorized = false;

    if (channelName.startsWith('private-chat-')) {
        const conversationId = channelName.slice('private-chat-'.length);
        const conversation = await prisma.conversation.findFirst({
            where: {
                id: conversationId,
                participants: { some: { id: session.id } }
            },
            select: { id: true }
        });
        authorized = Boolean(conversation);
    } else if (channelName === `private-user-conv-${session.id}`) {
        authorized = true;
    }

    if (!authorized) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const authResponse = pusherServer.authorizeChannel(socketId, channelName);
    return NextResponse.json(authResponse);
}