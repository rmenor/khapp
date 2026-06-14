'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddPrivilegeDialog } from '@/components/add-privilege-dialog';
import { PrivilegeActions } from '@/components/privilege-actions';
import type { Privilege, Publisher } from '@/lib/types';
import { Award, Users, Printer } from 'lucide-react';

export default function PrivilegesPage() {
    const [privileges, setPrivileges] = useState<Privilege[]>([]);
    const [publishers, setPublishers] = useState<Publisher[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshKey, setRefreshKey] = useState(0);

    const fetchData = async () => {
        try {
            if (!auth.currentUser) {
                await signInAnonymously(auth);
            }
            
            // Fetch publishers
            const pubCol = collection(db, 'publishers');
            const pubSnap = await getDocs(query(pubCol, orderBy('name', 'asc')));
            const pubList = pubSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name } as Publisher));
            setPublishers(pubList);

            // Fetch privileges
            const privCol = collection(db, 'privileges');
            const privSnap = await getDocs(query(privCol, orderBy('name', 'asc')));
            const privList = privSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    publisherIds: data.publisherIds || [],
                } as Privilege;
            });
            setPrivileges(privList);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [refreshKey]);

    const handleComplete = () => {
        setRefreshKey(prev => prev + 1);
    };

    const getPublisherName = (id: string) => {
        return publishers.find(p => p.id === id)?.name || null;
    };

    return (
        <div className="flex flex-col w-full space-y-4">
            {/* Header visible on screen only */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Privilegios</h1>
                    <p className="text-sm text-muted-foreground">
                        Gestiona los privilegios de servicio y los publicadores autorizados.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => window.print()} className="w-full md:w-auto">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir PDF
                    </Button>
                    <AddPrivilegeDialog publishers={publishers} onComplete={handleComplete} />
                </div>
            </div>

            {/* Print View: Clean, styled grid only visible during printing */}
            <div className="hidden print:block space-y-3">
                <div className="border-b pb-2">
                    <h1 className="text-base font-bold">Listado de Privilegios de Servicio</h1>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                        Generado el {new Date().toLocaleDateString('es-ES')} - KH App
                    </p>
                </div>
                <div className="print:grid print:grid-cols-3 print:gap-2">
                    {privileges.map(priv => {
                        const members = priv.publisherIds.map(id => getPublisherName(id)).filter(Boolean);
                        return (
                            <div key={priv.id} className="border border-gray-400 p-2 rounded print:break-inside-avoid flex flex-col justify-between bg-white">
                                <div>
                                    <h2 className="text-xs font-bold border-b pb-1 mb-1 text-primary">
                                        {priv.name}
                                    </h2>
                                    {members.length > 0 ? (
                                        <p className="text-[10px] text-gray-800 leading-snug">
                                            {members.join(', ')}
                                        </p>
                                    ) : (
                                        <p className="text-[9px] text-muted-foreground italic">
                                            Sin publicadores asignados
                                        </p>
                                    )}
                                </div>
                                <div className="text-[8px] text-muted-foreground mt-2 text-right">
                                    Total: {members.length}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid visible on screen only */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:hidden">
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                    <Skeleton className="h-[200px] w-full" />
                </div>
            ) : privileges.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:hidden">
                    {privileges.map(priv => {
                        const members = priv.publisherIds.map(id => getPublisherName(id)).filter(Boolean);

                        return (
                            <Card key={priv.id} className="flex flex-col justify-between">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                                            <Award className="h-5 w-5 text-primary" />
                                            {priv.name}
                                        </CardTitle>
                                        <CardDescription>Publicadores con este privilegio</CardDescription>
                                    </div>
                                    <div className="print:hidden">
                                        <PrivilegeActions privilege={priv} publishers={publishers} onComplete={handleComplete} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="space-y-1.5 pt-2 border-t">
                                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>Asignados ({members.length})</span>
                                        </div>
                                        {members.length > 0 ? (
                                            <div className="flex flex-wrap gap-1">
                                                {members.map((name, i) => (
                                                    <Badge key={i} variant="secondary" className="text-xs font-normal">
                                                        {name}
                                                    </Badge>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-muted-foreground italic">
                                                No hay publicadores asignados a este privilegio.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-3 rounded-b-lg border-t flex justify-between items-center text-xs text-muted-foreground">
                                    <span>KH App Privilegios</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                        Servicio
                                    </Badge>
                                </CardFooter>
                            </Card>
                        );
                    })}
                </div>
            ) : (
                <Card className="print:hidden">
                    <CardContent className="text-center py-10 space-y-2">
                        <p className="text-muted-foreground">
                            No hay privilegios creados. Haz clic en &quot;Añadir Privilegio&quot; para registrar uno.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
