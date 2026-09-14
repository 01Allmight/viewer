import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import crypto from 'crypto';

// Replace these with actual endpoint URLs of your OAuth provider
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token'; // Example: Google
const USERINFO_ENDPOINT = 'https://www.googleapis.com/oauth2/v3/userinfo';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const code = searchParams.get('code');
        const state = searchParams.get('state');
        const cookieStore = await cookies();
        const storedState = cookieStore.get('google_oauth_state')?.value;

        if (state !== storedState) {
            return NextResponse.redirect(new URL('/?error=InvalidOAuthState', req.url));
        }

        cookieStore.delete('google_oauth_state');

        const clientId = process.env.GOOGLE_CLIENT_ID || process.env.OAUTH_CLIENT_ID || '';
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.OAUTH_CLIENT_SECRET || '';
        const redirectUri = process.env.NEXT_PUBLIC_APP_URL
            ? `${process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '')}/api/auth/oauth/callback`
            : 'http://localhost:3000/api/auth/oauth/callback';

        // The provider redirect sends an authorization `code`
        if (!code) {
            return NextResponse.redirect(new URL('/?error=NoCodeProvided', req.url));
        }

        if (!clientId || !clientSecret) {
            return NextResponse.redirect(new URL('/?error=MissingClientId', req.url));
        }

        // 1. Exchange the Authorization Code for an Access Token
        const tokenResponse = await fetch(TOKEN_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json',
            },
            body: new URLSearchParams({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                redirect_uri: redirectUri,
                grant_type: 'authorization_code',
            }),
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            console.error('Token Exchange Error:', tokenData);
            return NextResponse.redirect(new URL('/?error=TokenExchangeFailed', req.url));
        }

        const accessToken = tokenData.access_token;

        // 2. Use the Access Token to get User Information
        const userResponse = await fetch(USERINFO_ENDPOINT, {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/json',
            },
        });

        const userData = await userResponse.json();

        if (!userResponse.ok || !userData.email) {
            console.error('User Info Error:', userData);
            return NextResponse.redirect(new URL('/?error=UserInfoFailed', req.url));
        }

        // 3. Authenticate User into our Database (Verify User)
        // Find existing user or create a new one based on their email from the provider
        let user = await prisma.user.findUnique({
            where: { email: userData.email },
        });

        if (!user) {
            // User doesn't exist, create an account for them
            // Generate a random placeholder password since they used OAuth
            const randomPassword = crypto.randomBytes(32).toString('hex');

            user = await prisma.user.create({
                data: {
                    email: userData.email,
                    // Use their name as username, making it safe/unique
                    username: (userData.name || userData.login || 'user').toLowerCase().replace(/[^a-z0-9]/g, '') + Math.floor(Math.random() * 10000),
                    fullName: userData.name || '',
                    avatar: userData.picture || userData.avatar_url || '',
                    password: randomPassword,
                    isVerified: true, // Social accounts are usually pre-verified
                },
            });
        } else if (!user.avatar && (userData.picture || userData.avatar_url)) {
            // Optional: update their avatar if they didn't have one
            user = await prisma.user.update({
                where: { id: user.id },
                data: { avatar: userData.picture || userData.avatar_url }
            })
        }

        // 4. Create Session Cookie (Login the User)
        cookieStore.set('userId', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1 week
            path: '/',
        });

        // Redirect back to Feed after successful OAuth verification
        return NextResponse.redirect(new URL('/', req.url));

    } catch (error) {
        console.error('OAuth Callback Critical Error:', error);
        return NextResponse.redirect(new URL('/?error=OAuthFailed', req.url));
    }
}
