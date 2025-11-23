'use client';

import { useEffect, useState } from 'react';

interface Todo {
    id: number;
    title: string;
    completed: number;
}

export default function DashboardPage() {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [newTodo, setNewTodo] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const todosRes = await fetch('/api/todos');
                if (todosRes.ok) {
                    const todosData = await todosRes.json();
                    setTodos(todosData);
                }
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleAddTodo = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTodo.trim()) return;

        const res = await fetch('/api/todos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title: newTodo }),
        });

        if (res.ok) {
            const todo = await res.json();
            setTodos([todo, ...todos]);
            setNewTodo('');
        }
    };

    if (loading) {
        return <div>Loading...</div>;
    }

    return (
        <div style={{ display: 'grid', gap: '2rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
            <div className="card">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>My Todos</h2>

                <form onSubmit={handleAddTodo} style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <input
                        type="text"
                        className="input"
                        placeholder="Add a new task..."
                        value={newTodo}
                        onChange={(e) => setNewTodo(e.target.value)}
                    />
                    <button type="submit" className="btn btn-primary">
                        Add
                    </button>
                </form>

                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {todos.map((todo) => (
                        <li key={todo.id} style={{ padding: '1rem', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: todo.completed ? 'var(--success)' : 'var(--accent)' }}></div>
                            <span>{todo.title}</span>
                        </li>
                    ))}
                    {todos.length === 0 && (
                        <li style={{ color: '#64748b', textAlign: 'center', padding: '1rem' }}>No todos yet.</li>
                    )}
                </ul>
            </div>

            <div className="card">
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>API Documentation</h2>
                <p style={{ marginBottom: '1rem', color: '#94a3b8' }}>
                    This boilerplate includes a fully functional REST API. Here are the available endpoints:
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                        <span style={{ color: '#22c55e', fontWeight: 'bold', marginRight: '0.5rem' }}>GET</span>
                        <code>/api/auth/me</code>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Get current user session</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                        <span style={{ color: '#3b82f6', fontWeight: 'bold', marginRight: '0.5rem' }}>POST</span>
                        <code>/api/todos</code>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>Create a new todo item</p>
                    </div>
                    <div style={{ padding: '1rem', backgroundColor: '#0f172a', borderRadius: '0.5rem', border: '1px solid #334155' }}>
                        <span style={{ color: '#22c55e', fontWeight: 'bold', marginRight: '0.5rem' }}>GET</span>
                        <code>/api/todos</code>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: '0.25rem' }}>List all todos for current user</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
