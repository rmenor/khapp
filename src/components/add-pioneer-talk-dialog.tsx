
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2 } from 'lucide-react';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { addPioneerTalkAction, updatePioneerTalkAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { PioneerTalk } from '@/lib/types';

const FormSchema = z.object({
    year: z.coerce.number().min(2000),
    date: z.string().min(1, 'La fecha es obligatoria'),
    speaker1: z.string().min(1, 'El discursante es obligatorio'),
    speaker2: z.string().min(1, 'El discursante es obligatorio'),
    openingPrayer: z.string().min(1, 'La oración inicial es obligatoria'),
    closingPrayer: z.string().min(1, 'La oración final es obligatoria'),
});

interface AddPioneerTalkDialogProps {
    initialData?: PioneerTalk;
}

export function AddPioneerTalkDialog({ initialData }: AddPioneerTalkDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const isEditing = !!initialData;

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            year: initialData?.year || new Date().getFullYear(),
            date: initialData?.date ? format(new Date((initialData.date as any).seconds * 1000), 'yyyy-MM-dd') : '',
            speaker1: initialData?.speaker1 || '',
            speaker2: initialData?.speaker2 || '',
            openingPrayer: initialData?.openingPrayer || '',
            closingPrayer: initialData?.closingPrayer || '',
        },
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const result = isEditing
            ? await updatePioneerTalkAction(initialData.id, data)
            : await addPioneerTalkAction(data);

        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            setOpen(false);
            if (!isEditing) form.reset();
        } else {
            toast({ title: 'Error', description: result.message, variant: 'destructive' });
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {isEditing ? (
                    <Button variant="ghost" size="icon">
                        <Edit2 className="h-4 w-4" />
                    </Button>
                ) : (
                    <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Añadir
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Discurso con Precursores</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica' : 'Rellena'} los detalles del discurso anual con los precursores.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="year"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Año</FormLabel>
                                        <FormControl>
                                            <Input type="number" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="date"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Fecha</FormLabel>
                                        <FormControl>
                                            <Input type="date" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <FormField
                            control={form.control}
                            name="speaker1"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discursante 1</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="speaker2"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Discursante 2</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nombre" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="openingPrayer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Orac. Inicial</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <FormField
                                control={form.control}
                                name="closingPrayer"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Orac. Final</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Nombre" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
