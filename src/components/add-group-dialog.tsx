'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Plus, Edit2 } from 'lucide-react';

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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { addGroupAction, updateGroupAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { Group, Publisher } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const FormSchema = z.object({
    name: z.string().min(2, 'El nombre del grupo debe tener al menos 2 caracteres.'),
    superintendentId: z.string().optional().nullable(),
    auxiliaryId: z.string().optional().nullable(),
    publisherIds: z.array(z.string()).default([]),
});

interface AddGroupDialogProps {
    initialData?: Group;
    publishers: Publisher[];
    onComplete?: () => void;
}

export function AddGroupDialog({ initialData, publishers, onComplete }: AddGroupDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const isEditing = !!initialData;

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: initialData?.name || '',
            superintendentId: initialData?.superintendentId || 'none',
            auxiliaryId: initialData?.auxiliaryId || 'none',
            publisherIds: initialData?.publisherIds || [],
        },
    });

    // Reset default values when initialData changes or dialog opens
    useEffect(() => {
        if (open) {
            form.reset({
                name: initialData?.name || '',
                superintendentId: initialData?.superintendentId || 'none',
                auxiliaryId: initialData?.auxiliaryId || 'none',
                publisherIds: initialData?.publisherIds || [],
            });
        }
    }, [open, initialData, form]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const payload = {
            ...data,
            superintendentId: data.superintendentId === 'none' ? null : data.superintendentId,
            auxiliaryId: data.auxiliaryId === 'none' ? null : data.auxiliaryId,
        };

        const result = isEditing
            ? await updateGroupAction({ id: initialData.id, ...payload })
            : await addGroupAction(payload);

        if (result.success) {
            toast({ title: 'Éxito', description: result.message });
            setOpen(false);
            if (!isEditing) form.reset();
            if (onComplete) onComplete();
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
                        Añadir Grupo
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Grupo</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica' : 'Define'} los detalles del grupo y sus asignaciones.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Grupo</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Grupo 1" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="superintendentId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Superintendente</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || 'none'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Sin asignar</SelectItem>
                                                {publishers.map((pub) => (
                                                    <SelectItem key={pub.id} value={pub.id}>
                                                        {pub.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="auxiliaryId"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Auxiliar</FormLabel>
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || 'none'}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Seleccionar" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">Sin asignar</SelectItem>
                                                {publishers.map((pub) => (
                                                    <SelectItem key={pub.id} value={pub.id}>
                                                        {pub.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        <FormField
                            control={form.control}
                            name="publisherIds"
                            render={() => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="mb-2">Miembros del Grupo</FormLabel>
                                    <div className="border rounded-md p-2">
                                        <ScrollArea className="h-[150px] w-full pr-4">
                                            {publishers.length === 0 ? (
                                                <p className="text-xs text-muted-foreground text-center py-8">
                                                    No hay publicadores registrados. Créalos primero en la sección de Publicadores.
                                                </p>
                                            ) : (
                                                <div className="space-y-2">
                                                    {publishers.map((pub) => (
                                                        <FormField
                                                            key={pub.id}
                                                            control={form.control}
                                                            name="publisherIds"
                                                            render={({ field }) => {
                                                                return (
                                                                    <FormItem
                                                                        key={pub.id}
                                                                        className="flex flex-row items-start space-x-3 space-y-0"
                                                                    >
                                                                        <FormControl>
                                                                            <Checkbox
                                                                                checked={field.value?.includes(pub.id)}
                                                                                onCheckedChange={(checked) => {
                                                                                    return checked
                                                                                        ? field.onChange([...field.value, pub.id])
                                                                                        : field.onChange(
                                                                                            field.value?.filter(
                                                                                                (value) => value !== pub.id
                                                                                            )
                                                                                        );
                                                                                }}
                                                                            />
                                                                        </FormControl>
                                                                        <FormLabel className="text-sm font-normal cursor-pointer select-none">
                                                                            {pub.name}
                                                                        </FormLabel>
                                                                    </FormItem>
                                                                );
                                                            }}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </div>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <DialogFooter>
                            <Button type="submit">Guardar</Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
