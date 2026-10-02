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
import { Checkbox } from '@/components/ui/checkbox';
import { addPrivilegeAction, updatePrivilegeAction } from '@/lib/actions';
import { useToast } from '@/hooks/use-toast';
import type { Privilege, Publisher } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';

const FormSchema = z.object({
    name: z.string().min(2, 'El nombre del privilegio debe tener al menos 2 caracteres.'),
    publisherIds: z.array(z.string()).default([]),
});

interface AddPrivilegeDialogProps {
    initialData?: Privilege;
    publishers: Publisher[];
    onComplete?: () => void;
}

export function AddPrivilegeDialog({ initialData, publishers, onComplete }: AddPrivilegeDialogProps) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const isEditing = !!initialData;

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            name: initialData?.name || '',
            publisherIds: initialData?.publisherIds || [],
        },
    });

    useEffect(() => {
        if (open) {
            form.reset({
                name: initialData?.name || '',
                publisherIds: initialData?.publisherIds || [],
            });
        }
    }, [open, initialData, form]);

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        const result = isEditing
            ? await updatePrivilegeAction({ id: initialData.id, ...data })
            : await addPrivilegeAction(data);

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
                        Añadir Privilegio
                    </Button>
                )}
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{isEditing ? 'Editar' : 'Añadir'} Privilegio</DialogTitle>
                    <DialogDescription>
                        {isEditing ? 'Modifica' : 'Define'} los detalles del privilegio y asigna publicadores.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Nombre del Privilegio</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Ej. Micrófonos" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="publisherIds"
                            render={() => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className="mb-2">Publicadores Autorizados</FormLabel>
                                    <div className="border rounded-md p-2">
                                        <ScrollArea className="h-[180px] w-full pr-4">
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
