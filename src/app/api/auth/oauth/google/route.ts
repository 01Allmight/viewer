import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

export async function GET(req: Request) {
    const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID;
    const redirectUri = process.env.NEXT_PUBLIC_APP_URL
        ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/auth/oauth/callback`
        : 'http://localhost:3000/api/auth/oauth/callback';

    const state = crypto.randomBytes(16).toString('hex');
    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 5,
        path: '/'
    });
    
    // In local development without Google Cloud credentials, log in with dev account
    if (!clientId) {
        let user = await prisma.user.findFirst({
            where: { email: 'google.dev@example.com' }
        });

        if (!user) {
            user = await prisma.user.create({
                data: {
                    email: 'google.dev@example.com',
                    username: 'google_creator',
                    fullName: 'Google User',
                    avatar: 'https://i.pravatar.cc/150?u=google',
                    password: 'password123',
                    isVerified: true
                }
            });
        }

        cookieStore.set('userId', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7,
            path: '/'
        });

        return NextResponse.redirect(new URL('/', req.url));
    }

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.append('client_id', clientId);
    authUrl.searchParams.append('redirect_uri', redirectUri);
    authUrl.searchParams.append('response_type', 'code');
    authUrl.searchParams.append('scope', 'openid email profile');
    authUrl.searchParams.append('access_type', 'offline');
    authUrl.searchParams.append('prompt', 'select_account consent');
    authUrl.searchParams.append('state', state);

    return NextResponse.redirect(authUrl.toString());
}
