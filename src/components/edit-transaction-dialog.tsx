
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
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
  FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { updateTransactionAction } from '@/lib/actions';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';

const FormSchema = z.object({
    amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
    date: z.date({ required_error: 'La fecha es obligatoria.' }),
    description: z.string().max(100).optional(),
    category: z.enum(['congregation', 'worldwide_work', 'renovation']).optional(),
    status: z.enum(['Completado', 'Pendiente de envío', 'Enviado']).optional(),
});
  
type FormValues = z.infer<typeof FormSchema>;

interface EditTransactionDialogProps {
  transaction: Transaction;
  children: React.ReactNode;
}

export function EditTransactionDialog({ transaction, children }: EditTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      amount: transaction.amount,
      date: new Date(transaction.date),
      description: transaction.description || '',
      category: transaction.category,
      status: transaction.status,
    },
  });
  const { isSubmitting } = form.formState;

  const handleSuccess = (message: string) => {
    toast({
      title: 'Éxito',
      description: message,
    });
    setOpen(false);
    window.location.reload();
  };

  const handleError = (message: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  };

  async function onSubmit(values: FormValues) {
    const data: any = {
        id: transaction.id,
        type: transaction.type,
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
    };

    if (transaction.type === 'expense') {
        delete data.category;
        delete data.status;
    }
    
    const result = await updateTransactionAction(data);
    if (result.success) {
      handleSuccess(result.message);
    } else {
      handleError(result.message || 'Ocurrió un error desconocido.');
    }
  }

  const isBranchDonation = transaction.type === 'income' && 
                           (transaction.category === 'worldwide_work' || transaction.category === 'renovation');

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Editar Transacción</DialogTitle>
          <DialogDescription>
            Modifica los detalles de la transacción y guarda los cambios.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Cantidad</FormLabel>
                    <FormControl>
                        <Input type="number" step="0.01" placeholder="0.00" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                {transaction.type === 'income' && (
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Categoría</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona una categoría" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="congregation">Congregación</SelectItem>
                                <SelectItem value="worldwide_work">Obra Mundial</SelectItem>
                                <SelectItem value="renovation">Renovación</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}
                <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>Fecha</FormLabel>
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
                                date > new Date() || date < new Date('1900-01-01')
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
                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Descripción (Opcional)</FormLabel>
                    <FormControl>
                        <Input placeholder="p.ej., Donación mensual" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />

                {isBranchDonation && (
                     <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Estado</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecciona un estado" />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                <SelectItem value="Pendiente de envío">Pendiente de envío</SelectItem>
                                <SelectItem value="Enviado">Enviado</SelectItem>
                                </SelectContent>
                            </Select>
                             <FormDescription>
                                Cambiar a &apos;Enviado&apos; es una acción manual. Normalmente se gestiona con un envío a sucursal.
                            </FormDescription>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                )}

                <DialogFooter className="pt-4">
                    <DialogClose asChild>
                        <Button type="button" variant="outline">Cancelar</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Guardar Cambios
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
