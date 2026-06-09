'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AddPublisherDialog } from '@/components/add-publisher-dialog';
import { PublisherActions } from '@/components/publisher-actions';
import { Skeleton } from '@/components/ui/skeleton';
import type { Publisher } from '@/lib/types';

const serializePublisher = (doc: any): Publisher => {
    return {
        id: doc.id,
        name: doc.data().name,
    };
};

export default function PublishersPage() {
    const [publishers, setPublishers] = useState<Publisher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchPublishers = async () => {
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            const colRef = collection(db, 'publishers');
            const q = query(colRef, orderBy('name', 'asc'));
            const querySnapshot = await getDocs(q);
            const fetched = querySnapshot.docs.map(serializePublisher);
            setPublishers(fetched);
        } catch (error) {
            console.error('Error fetching publishers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPublishers();
    }, [refreshKey]);

    const handleComplete = () => {
        setRefreshKey((prev) => prev + 1);
    };

    return (
        <div className="flex flex-col w-full space-y-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Publicadores</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona la lista de publicadores de la congregación.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <AddPublisherDialog onComplete={handleComplete} />
                </div>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Listado de Publicadores</CardTitle>
                    <CardDescription>
                        Todos los publicadores activos registrados en el sistema.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    ) : publishers.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nombre</TableHead>
                                    <TableHead className="text-right print:hidden">Acciones</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {publishers.map((pub) => (
                                    <TableRow key={pub.id}>
                                        <TableCell className="font-medium">{pub.name}</TableCell>
                                        <TableCell className="text-right print:hidden">
                                            <PublisherActions publisher={pub} onActionComplete={handleComplete} />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-muted-foreground text-center py-10">
                            No hay publicadores registrados. Haz clic en &quot;Añadir Publicador&quot; para crear uno.
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
