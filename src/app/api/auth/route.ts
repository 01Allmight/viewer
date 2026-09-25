import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { cookies } from 'next/headers';
import { verifyPassword, getSession } from '@/lib/auth';

/**
 * Handle Login — Validates username or email against hashed password
 */
export async function POST(req: Request) {
    
    try {
        const { username, password } = await req.json();

        if (!username || !password) {
            return NextResponse.json({ error: 'Username/Email and password are required' }, { status: 400 });
        }

        // Find user by either username or email
        const user = await prisma.user.findFirst({
            where: {
                OR: [
                    { username: username },
                    { email: username }
                ]
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Verify password hash
        const isValid = await verifyPassword(password, user.password);
        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Secure Session Cookie — 7 days
        const sessionExpiry = 60 * 60 * 24 * 7;
        (await cookies()).set('userId', user.id, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: sessionExpiry,
            path: '/'
        });

        // Return user without password
        const { password: _, ...userWithoutPassword } = user;
        return NextResponse.json({ success: true, user: userWithoutPassword });

    } catch (error) {
        console.error('Auth POST error:', error);
        return NextResponse.json(
            { error: 'Authentication failed due to an unexpected error.' },
            { status: 500 }
        );
    }
}

/**
 * Verify Session
 */
export async function GET() {
    try {
        const user = await getSession();

        if (!user) {
            return NextResponse.json({ authenticated: false }, { status: 200 });
        }

        return NextResponse.json({ authenticated: true, user }, { status: 200 });
    } catch (error) {
        console.error('Auth GET error:', error);
        return NextResponse.json({ authenticated: false }, { status: 500 });
    }
}

/**
 * Logout
 */
export async function DELETE() {
    (await cookies()).delete('userId');
    return NextResponse.json({ success: true });
}
