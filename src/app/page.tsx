'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Head from 'next/head';

interface Item {
  id: number;
  name: string;
  description: string;
  price: number;
}

export default function Home() {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    document.title = 'Inicio';
  }, []);

  return (
    <>
      <Navbar />
      <main className="container" style={{ padding: '4rem 1rem' }}>
        <section style={{ textAlign: 'center', marginBottom: '4rem' }}>
          <h1 className="title">Welcome</h1>
          <p className="subtitle"></p>
        </section>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '2rem' }}>Loading ...</div>
        ) : (
          
        )}
      </main>
    </>
  );
}
