
'use client';

import { useState } from 'react';
import { useForm, type UseFormReturn } from 'react-hook-form';
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
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { addIncomeAction, addExpenseAction, addBranchTransferAction } from '@/lib/actions';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';
import { cn } from '@/lib/utils';
import type { Transaction } from '@/lib/types';
import { Checkbox } from './ui/checkbox';
import { ScrollArea } from './ui/scroll-area';

const incomeSchema = z.object({
  amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
  date: z.date({ required_error: 'La fecha es obligatoria.' }),
  description: z.string().max(100).optional(),
  category: z.enum(['congregation', 'worldwide_work', 'renovation'], {
    required_error: 'Por favor, selecciona una categoría.',
  }),
});

const expenseSchema = z.object({
  amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
  date: z.date({ required_error: 'La fecha es obligatoria.' }),
  description: z.string().max(100).optional(),
});

const branchTransferSchema = z.object({
    date: z.date({ required_error: 'La fecha es obligatoria.' }),
    description: z.string().max(100).optional(),
    transactionIds: z.array(z.string()).refine(value => value.length > 0, {
      message: 'Debes seleccionar al menos una transacción para enviar.',
    }),
});

type IncomeFormValues = z.infer<typeof incomeSchema>;
type ExpenseFormValues = z.infer<typeof expenseSchema>;
type BranchTransferFormValues = z.infer<typeof branchTransferSchema>;

interface AddTransactionDialogProps {
    pendingBranchTransactions: Transaction[];
}

export function AddTransactionDialog({ pendingBranchTransactions }: AddTransactionDialogProps) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();

  const incomeForm = useForm<IncomeFormValues>({
    resolver: zodResolver(incomeSchema),
    defaultValues: {
      amount: 0,
      description: '',
    },
  });

  const expenseForm = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      amount: 0,
      description: '',
    },
  });

  const branchTransferForm = useForm<BranchTransferFormValues>({
      resolver: zodResolver(branchTransferSchema),
      defaultValues: {
        description: 'Envío a la sucursal',
        transactionIds: [],
      },
    });

  const handleSuccess = (message: string) => {
    toast({
      title: 'Éxito',
      description: message,
    });
    setOpen(false);
    // This will trigger a reload of the page to reflect the new data.
    window.location.reload();
  };

  const handleError = (message: string) => {
    toast({
      variant: 'destructive',
      title: 'Error',
      description: message,
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">Añadir Transacción</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Añadir Nueva Transacción</DialogTitle>
          <DialogDescription>
            Selecciona el tipo de transacción y completa los detalles.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="income" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="income">Ingreso</TabsTrigger>
            <TabsTrigger value="expense">Gasto</TabsTrigger>
            <TabsTrigger value="branch_transfer">Envío Sucursal</TabsTrigger>
          </TabsList>
          <TabsContent value="income">
            <IncomeForm form={incomeForm} onSuccess={handleSuccess} onError={handleError} />
          </TabsContent>
          <TabsContent value="expense">
            <ExpenseForm form={expenseForm} onSuccess={handleSuccess} onError={handleError} />
          </TabsContent>
          <TabsContent value="branch_transfer">
            <BranchTransferForm 
                form={branchTransferForm}
                onSuccess={handleSuccess} 
                onError={handleError} 
                pendingTransactions={pendingBranchTransactions}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface IncomeFormProps {
    form: UseFormReturn<IncomeFormValues>;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}

function IncomeForm({ form, onSuccess, onError }: IncomeFormProps) {
  const { isSubmitting } = form.formState;

  async function onSubmit(values: IncomeFormValues) {
    const data = {
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
    };
    const result = await addIncomeAction(data);
    if (result.success) {
      onSuccess(result.message);
      form.reset();
    } else {
      onError(result.message || 'Ocurrió un error desconocido.');
    }
  }

  return (
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
                <Input placeholder="p.ej., Donación mensual" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="pt-4">
            <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Ingreso
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

interface ExpenseFormProps {
    form: UseFormReturn<ExpenseFormValues>;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
}

function ExpenseForm({ form, onSuccess, onError }: ExpenseFormProps) {
  const { isSubmitting } = form.formState;

  async function onSubmit(values: ExpenseFormValues) {
    const data = {
        ...values,
        date: format(values.date, 'yyyy-MM-dd'),
    };
    const result = await addExpenseAction(data);
    if (result.success) {
      onSuccess(result.message);
      form.reset();
    } else {
      onError(result.message || 'Ocurrió un error desconocido.');
    }
  }

  return (
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
        <FormField
          control={form.control}
          name="date"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Fecha del Gasto</FormLabel>
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
              <FormLabel>Descripción</FormLabel>
              <FormControl>
                <Input placeholder="p.ej., Factura de servicios" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <DialogFooter className="pt-4">
             <DialogClose asChild>
                <Button type="button" variant="outline">Cancelar</Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Añadir Gasto
            </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
};

const categoryLabels: Record<string, string> = {
    congregation: 'Congregación',
    worldwide_work: 'Obra Mundial',
    renovation: 'Renovación'
}

interface BranchTransferFormProps {
    form: UseFormReturn<BranchTransferFormValues>;
    onSuccess: (msg: string) => void;
    onError: (msg: string) => void;
    pendingTransactions: Transaction[];
}

function BranchTransferForm({ 
    form,
    onSuccess, 
    onError,
    pendingTransactions,
}: BranchTransferFormProps) {
    const { isSubmitting } = form.formState;

    const selectedTransactionIds = form.watch('transactionIds') || [];
    const totalAmount = selectedTransactionIds.reduce((sum, id) => {
        const transaction = pendingTransactions.find(t => t.id === id);
        return sum + (transaction?.amount || 0);
    }, 0);
  
    async function onSubmit(values: BranchTransferFormValues) {
      const data = {
          ...values,
          date: format(values.date, 'yyyy-MM-dd'),
          amount: totalAmount,
      };
      const result = await addBranchTransferAction(data);
      if (result.success) {
        onSuccess(result.message);
        form.reset();
      } else {
        onError(result.message || 'Ocurrió un error desconocido.');
      }
    }
  
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
            <FormField
                control={form.control}
                name="transactionIds"
                render={() => (
                    <FormItem>
                        <div className="mb-4">
                            <FormLabel className="text-base">Donaciones Pendientes de Envío</FormLabel>
                            <FormDescription>
                                Selecciona las donaciones que quieres incluir en este envío.
                            </FormDescription>
                        </div>
                        <ScrollArea className="h-40 w-full rounded-md border p-4">
                         {pendingTransactions.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-10">No hay donaciones pendientes.</p>
                         ) : pendingTransactions.map((item) => (
                            <FormField
                                key={item.id}
                                control={form.control}
                                name="transactionIds"
                                render={({ field }) => {
                                return (
                                    <FormItem
                                    key={item.id}
                                    className="flex flex-row items-center justify-between space-x-3 py-2 border-b last:border-b-0"
                                    >
                                        <FormControl>
                                            <Checkbox
                                            checked={field.value?.includes(item.id)}
                                            onCheckedChange={(checked) => {
                                                return checked
                                                ? field.onChange([...(field.value || []), item.id])
                                                : field.onChange(
                                                    field.value?.filter(
                                                        (value) => value !== item.id
                                                    )
                                                    )
                                            }}
                                            />
                                        </FormControl>
                                        <FormLabel className="font-normal flex-1 cursor-pointer">
                                           <div className='flex justify-between items-center'>
                                                <div>
                                                    <p className='text-sm'>{categoryLabels[item.category!]}</p>
                                                    <p className='text-xs text-muted-foreground'>{format(new Date(item.date), 'PPP', { locale: es })}</p>
                                                </div>
                                                <p className='font-medium'>{formatCurrency(item.amount)}</p>
                                           </div>
                                        </FormLabel>
                                    </FormItem>
                                )
                                }}
                            />
                            ))}
                        </ScrollArea>
                        <FormMessage />
                    </FormItem>
                )}
            />
            <div className="flex justify-between items-center font-semibold text-lg p-2 bg-muted rounded-md">
                <span>Total a Enviar:</span>
                <span>{formatCurrency(totalAmount)}</span>
            </div>
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Fecha del Envío</FormLabel>
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
                <FormLabel>Descripción</FormLabel>
                <FormControl>
                  <Input placeholder="p.ej., Envío mensual" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter className="pt-4">
               <DialogClose asChild>
                  <Button type="button" variant="outline">Cancelar</Button>
              </DialogClose>
              <Button type="submit" disabled={isSubmitting || totalAmount === 0}>
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Confirmar Envío
              </Button>
          </DialogFooter>
        </form>
      </Form>
    );
  }

    
