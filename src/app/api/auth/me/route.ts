import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';

export async function GET() {
    const session = await getSession();

    if (!session) {
        return NextResponse.json({ user: null });
    }

    const user = db.prepare('SELECT id, email, name, created_at FROM users WHERE id = ?').get(session.sub) as any;

    if (!user) {
        return NextResponse.json({ user: null });
    }

    return NextResponse.json({ user });
}

export async function PUT(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, email, password } = await request.json();

        // Build query dynamically
        const updates = [];
        const params = [];

        if (name) {
            updates.push('name = ?');
            params.push(name);
        }

        if (email) {
            updates.push('email = ?');
            params.push(email);
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updates.push('password = ?');
            params.push(hashedPassword);
        }

        if (updates.length === 0) {
            return NextResponse.json({ message: 'No changes' });
        }

        params.push(session.sub); // Where clause

        const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
        db.prepare(query).run(...params);

        return NextResponse.json({ message: 'Profile updated successfully' });

    } catch (error) {
        console.error('Update error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
