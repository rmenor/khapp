'use client';

import { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { signInAnonymously } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AddGroupDialog } from '@/components/add-group-dialog';
import { GroupActions } from '@/components/group-actions';
import type { Group, Publisher } from '@/lib/types';
import { User, ShieldAlert, Users, Printer } from 'lucide-react';

export default function GroupsPage() {
    const [groups, setGroups] = useState<Group[]>([]);
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

            // Fetch groups
            const groupCol = collection(db, 'groups');
            const groupSnap = await getDocs(query(groupCol, orderBy('name', 'asc')));
            const groupList = groupSnap.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    name: data.name,
                    superintendentId: data.superintendentId,
                    auxiliaryId: data.auxiliaryId,
                    publisherIds: data.publisherIds || [],
                } as Group;
            });
            setGroups(groupList);
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

    const getPublisherName = (id?: string) => {
        if (!id) return null;
        return publishers.find(p => p.id === id)?.name || null;
    };

    return (
        <div className="flex flex-col w-full space-y-4">
            {/* Header visible on screen only */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 print:hidden">
                <div className="space-y-1">
                    <h1 className="text-2xl font-bold tracking-tight">Grupos</h1>
                    <p className="text-sm text-muted-foreground">
                        Organiza la congregación en grupos de servicio.
                    </p>
                </div>
                <div className="flex items-center gap-2 w-full md:w-auto">
                    <Button variant="outline" onClick={() => window.print()} className="w-full md:w-auto">
                        <Printer className="mr-2 h-4 w-4" />
                        Imprimir PDF
                    </Button>
                    <AddGroupDialog publishers={publishers} onComplete={handleComplete} />
                </div>
            </div>

            {/* Print View: Clean, styled grid only visible during printing */}
            <div className="hidden print:block space-y-3">
                <div className="border-b pb-2">
                    <h1 className="text-base font-bold">Listado de Grupos de Servicio</h1>
                    <p className="text-[9px] text-muted-foreground mt-0.5">
                        Generado el {new Date().toLocaleDateString('es-ES')} - KH App
                    </p>
                </div>
                <div className="print:grid print:grid-cols-3 print:gap-2">
                    {groups.map(group => {
                        const superName = getPublisherName(group.superintendentId);
                        const auxName = getPublisherName(group.auxiliaryId);
                        const members = group.publisherIds.map(id => getPublisherName(id)).filter(Boolean);

                        return (
                            <div key={group.id} className="border border-gray-400 p-2 rounded print:break-inside-avoid flex flex-col justify-between bg-white">
                                <div>
                                    <h2 className="text-xs font-bold border-b pb-1 mb-1 text-primary">
                                        {group.name}
                                    </h2>
                                    <div className="space-y-0.5 text-[9px] text-gray-700 mb-1.5">
                                        <div className="flex gap-1">
                                            <span className="font-semibold">Superintendente:</span>
                                            <span>{superName || 'Sin asignar'}</span>
                                        </div>
                                        <div className="flex gap-1">
                                            <span className="font-semibold">Auxiliar:</span>
                                            <span>{auxName || 'Sin asignar'}</span>
                                        </div>
                                    </div>
                                    <div className="border-t pt-1">
                                        <p className="text-[8px] font-semibold mb-0.5 text-gray-800">Miembros ({members.length}):</p>
                                        {members.length > 0 ? (
                                            <p className="text-[9px] text-gray-800 leading-snug">
                                                {members.join(', ')}
                                            </p>
                                        ) : (
                                            <p className="text-[8px] text-muted-foreground italic">
                                                Sin publicadores asignados
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Grid visible on screen only */}
            {loading ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:hidden">
                    <Skeleton className="h-[250px] w-full" />
                    <Skeleton className="h-[250px] w-full" />
                    <Skeleton className="h-[250px] w-full" />
                </div>
            ) : groups.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 print:hidden">
                    {groups.map(group => {
                        const superName = getPublisherName(group.superintendentId);
                        const auxName = getPublisherName(group.auxiliaryId);
                        const members = group.publisherIds.map(id => getPublisherName(id)).filter(Boolean);

                        return (
                            <Card key={group.id} className="flex flex-col justify-between">
                                <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                                    <div className="space-y-1">
                                        <CardTitle className="text-lg font-bold">{group.name}</CardTitle>
                                        <CardDescription>Detalles del grupo y sus miembros</CardDescription>
                                    </div>
                                    <div className="print:hidden">
                                        <GroupActions group={group} publishers={publishers} onComplete={handleComplete} />
                                    </div>
                                </CardHeader>
                                <CardContent className="space-y-4 flex-1">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <ShieldAlert className="h-4 w-4 text-primary shrink-0" />
                                            <span className="font-semibold text-foreground">Superintendente:</span>
                                            <span className={superName ? 'text-foreground font-medium' : 'text-muted-foreground italic'}>
                                                {superName || 'Sin asignar'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                            <User className="h-4 w-4 text-primary shrink-0" />
                                            <span className="font-semibold text-foreground">Auxiliar:</span>
                                            <span className={auxName ? 'text-foreground font-medium' : 'text-muted-foreground italic'}>
                                                {auxName || 'Sin asignar'}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 pt-2 border-t">
                                        <div className="flex items-center gap-2 text-sm font-semibold mb-1">
                                            <Users className="h-4 w-4 text-muted-foreground shrink-0" />
                                            <span>Miembros ({members.length})</span>
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
                                                No hay publicadores asignados a este grupo.
                                            </p>
                                        )}
                                    </div>
                                </CardContent>
                                <CardFooter className="bg-muted/50 p-3 rounded-b-lg border-t flex justify-between items-center text-xs text-muted-foreground">
                                    <span>KH App Congregación</span>
                                    <Badge variant="outline" className="text-[10px] uppercase font-semibold">
                                        Grupo
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
                            No hay grupos creados. Haz clic en &quot;Añadir Grupo&quot; para registrar uno.
                        </p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
