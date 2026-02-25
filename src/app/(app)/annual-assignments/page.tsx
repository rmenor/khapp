
'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { deleteAnnualAssignmentAction } from '@/lib/actions';
import type { PioneerTalk, SpecialTalk, Memorial } from '@/lib/types';
import { AddPioneerTalkDialog } from '@/components/add-pioneer-talk-dialog';
import { AddSpecialTalkDialog } from '@/components/add-special-talk-dialog';
import { AddMemorialDialog } from '@/components/add-memorial-dialog';

export default function AnnualAssignmentsPage() {
    const [pioneerTalks, setPioneerTalks] = useState<PioneerTalk[]>([]);
    const [specialTalks, setSpecialTalks] = useState<SpecialTalk[]>([]);
    const [memorials, setMemorials] = useState<Memorial[]>([]);

    useEffect(() => {
        if (!db) return;

        const qPioneer = query(collection(db, 'pioneer_talks'), orderBy('year', 'desc'));
        const unsubPioneer = onSnapshot(qPioneer, (snapshot) => {
            setPioneerTalks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PioneerTalk)));
        });

        const qSpecial = query(collection(db, 'special_talks'), orderBy('year', 'desc'));
        const unsubSpecial = onSnapshot(qSpecial, (snapshot) => {
            setSpecialTalks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SpecialTalk)));
        });

        const qMemorial = query(collection(db, 'memorials'), orderBy('year', 'desc'));
        const unsubMemorial = onSnapshot(qMemorial, (snapshot) => {
            setMemorials(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Memorial)));
        });

        return () => {
            unsubPioneer();
            unsubSpecial();
            unsubMemorial();
        };
    }, []);

    const handleDelete = async (id: string, type: 'pioneer_talks' | 'special_talks' | 'memorials') => {
        if (confirm('¿Estás seguro de que quieres eliminar este registro?')) {
            await deleteAnnualAssignmentAction(id, type);
        }
    };

    const isDatePassed = (date: any) => {
        if (!date) return false;
        const assignmentDate = new Date((date as any).seconds * 1000);
        // Compare dates ignoring time to be more user-friendly
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        assignmentDate.setHours(0, 0, 0, 0);
        return assignmentDate < today;
    };

    return (
        <div className="flex flex-col w-full gap-4">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold tracking-tight">Asignaciones anuales</h1>
            </div>

            <Tabs defaultValue="pioneer" className="w-full">
                <TabsList>
                    <TabsTrigger value="pioneer">Reunión con Precursores</TabsTrigger>
                    <TabsTrigger value="special">Discurso Especial</TabsTrigger>
                    <TabsTrigger value="memorial">Conmemoración</TabsTrigger>
                </TabsList>

                <TabsContent value="pioneer" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Discurso con los Precursores</CardTitle>
                                <CardDescription>Asignaciones anuales para el discurso con precursores.</CardDescription>
                            </div>
                            <AddPioneerTalkDialog />
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Año</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Discursante 1</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Discursante 2</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Inicial</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Final</th>
                                            <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {pioneerTalks.map((talk) => (
                                            <tr key={talk.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-2 align-middle">{talk.year}</td>
                                                <td className="p-2 align-middle">{talk.date && format(new Date((talk.date as any).seconds * 1000), 'dd/MM/yyyy')}</td>
                                                <td className="p-2 align-middle">{talk.speaker1}</td>
                                                <td className="p-2 align-middle">{talk.speaker2}</td>
                                                <td className="p-2 align-middle">{talk.openingPrayer}</td>
                                                <td className="p-2 align-middle">{talk.closingPrayer}</td>
                                                <td className="p-2 align-middle text-right flex justify-end gap-2">
                                                    {!isDatePassed(talk.date) && (
                                                        <>
                                                            <AddPioneerTalkDialog initialData={talk} />
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(talk.id, 'pioneer_talks')}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="special" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Discurso Especial</CardTitle>
                                <CardDescription>Asignaciones anuales para el discurso especial.</CardDescription>
                            </div>
                            <AddSpecialTalkDialog />
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50">
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Año</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Presidente</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Discursante</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orador Aux.</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Final</th>
                                            <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {specialTalks.map((talk) => (
                                            <tr key={talk.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-2 align-middle">{talk.year}</td>
                                                <td className="p-2 align-middle">{talk.date && format(new Date((talk.date as any).seconds * 1000), 'dd/MM/yyyy')}</td>
                                                <td className="p-2 align-middle">{talk.president}</td>
                                                <td className="p-2 align-middle">{talk.speaker}</td>
                                                <td className="p-2 align-middle">{talk.auxiliarySpeaker}</td>
                                                <td className="p-2 align-middle">{talk.closingPrayer}</td>
                                                <td className="p-2 align-middle text-right flex justify-end gap-2">
                                                    {!isDatePassed(talk.date) && (
                                                        <>
                                                            <AddSpecialTalkDialog initialData={talk} />
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(talk.id, 'special_talks')}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="memorial" className="space-y-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <div>
                                <CardTitle>Conmemoración</CardTitle>
                                <CardDescription>Asignaciones anuales para la Conmemoración.</CardDescription>
                            </div>
                            <AddMemorialDialog />
                        </CardHeader>
                        <CardContent>
                            <div className="relative w-full overflow-auto">
                                <table className="w-full caption-bottom text-sm">
                                    <thead className="[&_tr]:border-b">
                                        <tr className="border-b transition-colors hover:bg-muted/50">
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Año</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Fecha</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Presidente</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Inicial</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Discursante</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Pan</th>
                                            <th className="h-10 px-2 text-left align-middle font-medium text-muted-foreground">Orac. Vino</th>
                                            <th className="h-10 px-2 text-right align-middle font-medium text-muted-foreground">Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody className="[&_tr:last-child]:border-0">
                                        {memorials.map((memorial) => (
                                            <tr key={memorial.id} className="border-b transition-colors hover:bg-muted/50">
                                                <td className="p-2 align-middle">{memorial.year}</td>
                                                <td className="p-2 align-middle">{memorial.date && format(new Date((memorial.date as any).seconds * 1000), 'dd/MM/yyyy')}</td>
                                                <td className="p-2 align-middle">{memorial.president}</td>
                                                <td className="p-2 align-middle">{memorial.openingPrayer}</td>
                                                <td className="p-2 align-middle">{memorial.speaker}</td>
                                                <td className="p-2 align-middle">{memorial.breadPrayer}</td>
                                                <td className="p-2 align-middle">{memorial.winePrayer}</td>
                                                <td className="p-2 align-middle text-right flex justify-end gap-2">
                                                    {!isDatePassed(memorial.date) && (
                                                        <>
                                                            <AddMemorialDialog initialData={memorial} />
                                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(memorial.id, 'memorials')}>
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
