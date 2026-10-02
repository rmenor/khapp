'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose,
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
import { useToast } from '@/hooks/use-toast';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import { Resolution } from '@/lib/types';
import { addResolutionAction, deleteResolutionAction } from '@/lib/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { ScrollArea } from './ui/scroll-area';

const resolutionSchema = z.object({
    description: z.string().min(1, { message: 'La descripción es obligatoria.' }),
    amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
    startDate: z.date({ required_error: 'La fecha de inicio es obligatoria.' }),
});

type ResolutionFormValues = z.infer<typeof resolutionSchema>;

export function ManageResolutionsDialog({ resolutions }: { resolutions: Resolution[] }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();

    const form = useForm<ResolutionFormValues>({
        resolver: zodResolver(resolutionSchema),
        defaultValues: {
            amount: 0,
            description: '',
        },
    });

    const { isSubmitting } = form.formState;

    const handleSuccess = (message: string) => {
        toast({
            title: 'Éxito',
            description: message,
        });
        form.reset();
        // Refresh page to see new list
        window.location.reload();
    };

    const handleError = (message: string) => {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: message,
        });
    };

    async function onSubmit(values: ResolutionFormValues) {
        const data = {
            ...values,
            startDate: format(values.startDate, 'yyyy-MM-dd'),
        };
        const result = await addResolutionAction(data);
        if (result.success) {
            handleSuccess(result.message);
        } else {
            handleError(result.message || 'Error al añadir la resolución.');
        }
    }

    async function handleDelete(id: string) {
        if (!confirm('¿Estás seguro de que deseas eliminar esta resolución?')) return;

        const result = await deleteResolutionAction({ id });
        if (result.success) {
            handleSuccess(result.message);
        } else {
            handleError(result.message || 'Error al eliminar la resolución.');
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline">Gestionar Resoluciones</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Gestionar Resoluciones</DialogTitle>
                    <DialogDescription>
                        Añade o elimina resoluciones fijas mensuales.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                    <ScrollArea className="flex-1 border rounded-md p-4">
                        {resolutions.length === 0 ? (
                            <p className="text-center text-muted-foreground py-10">No hay resoluciones activas.</p>
                        ) : (
                            <div className="space-y-4">
                                {resolutions.map((res) => (
                                    <Card key={res.id}>
                                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
                                            <div className="space-y-1">
                                                <CardTitle className="text-base">{res.description}</CardTitle>
                                                <CardDescription>Desde {format(new Date(res.startDate), 'PPP', { locale: es })}</CardDescription>
                                            </div>
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(res.id)}>
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </CardHeader>
                                        <CardContent className="p-4 pt-0">
                                            <div className="text-xl font-bold">{new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(res.amount)} / mes</div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </ScrollArea>

                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 border-t pt-4">
                            <h3 className="font-semibold text-sm">Nueva Resolución</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="description"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Descripción</FormLabel>
                                            <FormControl>
                                                <Input placeholder="p.ej. Alquiler salón" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="amount"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Importe Mensual</FormLabel>
                                            <FormControl>
                                                <Input type="number" step="0.01" placeholder="0.00" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <FormField
                                control={form.control}
                                name="startDate"
                                render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel>Fecha de Inicio</FormLabel>
                                        <Popover>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        variant={'outline'}
                                                        className={cn(
                                                            'w-full pl-3 text-left font-normal',
                                                            !field.value && 'text-muted-foreground'
                                                        )}
                                                    >
                                                        {field.value ? (
                                                            format(field.value, 'PPP', { locale: es })
                                                        ) : (
                                                            <span>Elige una fecha</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value}
                                                    onSelect={field.onChange}
                                                    disabled={(date) =>
                                                        date < new Date('1900-01-01')
                                                    }
                                                    initialFocus
                                                    locale={es}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <Button type="submit" disabled={isSubmitting} className="w-full">
                                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Añadir Resolución
                            </Button>
                        </form>
                    </Form>
                </div>
            </DialogContent>
        </Dialog>
    );
}
