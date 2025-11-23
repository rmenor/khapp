import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const auditoriums = db.prepare('SELECT * FROM auditoriums').all();
        return NextResponse.json(auditoriums);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, color } = await request.json();
        const result = db.prepare('INSERT INTO auditoriums (name, color) VALUES (?, ?)').run(name, color || '#3b82f6');
        return NextResponse.json({ id: result.lastInsertRowid, name, color });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
