import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const jornadas = db.prepare('SELECT * FROM jornadas ORDER BY date DESC').all();
        return NextResponse.json(jornadas);
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
        const { name, date, description } = await request.json();

        if (!name || !date) {
            return NextResponse.json({ error: 'Name and Date are required' }, { status: 400 });
        }

        const result = db.prepare(
            'INSERT INTO jornadas (name, date, description) VALUES (?, ?, ?)'
        ).run(name, date, description || '');

        return NextResponse.json({
            id: result.lastInsertRowid,
            name,
            date,
            description
        });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
