
'use client';

import * as XLSX from 'xlsx';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import type { Transaction, TransactionStatus } from '@/lib/types';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { EditTransactionDialog } from './edit-transaction-dialog';
import { Button } from './ui/button';
import { FilePenLine, FileSpreadsheet, Trash2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DeleteTransactionDialog } from './delete-transaction-dialog';

export function RecentTransactions({
  transactions,
  title,
  description,
}: {
  transactions: Transaction[];
  title: string;
  description: string;
}) {

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

  const typeLabels: Record<string, string> = {
    income: 'Ingreso',
    expense: 'Gasto',
    branch_transfer: 'Envío a Sucursal'
  }

  const getBadgeClass = (type: string) => {
    switch (type) {
      case 'income':
        return 'text-green-600 border-green-200';
      case 'expense':
        return 'text-red-600 border-red-200';
      case 'branch_transfer':
        return 'text-blue-600 border-blue-200';
      default:
        return '';
    }
  }

  const getAmountClass = (type: string) => {
    switch (type) {
        case 'income':
          return 'text-green-600';
        case 'expense':
        case 'branch_transfer':
          return 'text-red-600';
        default:
          return '';
      }
  }

  const getAmountPrefix = (type: string) => {
    return type === 'income' ? '+' : '-';
  }
  
  const getStatusBadge = (status?: TransactionStatus) => {
    if (!status) return null;

    const statusClasses: Record<TransactionStatus, string> = {
        'Pendiente de envío': 'text-orange-600 border-orange-200',
        'Enviado': 'text-blue-600 border-blue-200',
        'Completado': 'text-green-600 border-green-200',
    };

    return <Badge variant="outline" className={cn(statusClasses[status])}>{status}</Badge>;
  }

  const handleExport = () => {
    const dataToExport = transactions.map(t => ({
        'Fecha': format(new Date(t.date), 'dd/MM/yyyy'),
        'Descripción': t.description || 'N/A',
        'Tipo': typeLabels[t.type] || 'N/A',
        'Categoría': t.category ? categoryLabels[t.category] : 'N/A',
        'Estado': t.status || 'N/A',
        'Importe': t.type === 'income' ? t.amount : -t.amount,
    }));
    
    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Transacciones');
    
    // Set column widths
    worksheet['!cols'] = [
        { wch: 12 }, // Fecha
        { wch: 40 }, // Descripción
        { wch: 15 }, // Tipo
        { wch: 15 }, // Categoría
        { wch: 20 }, // Estado
        { wch: 12 }, // Importe
    ];

    XLSX.writeFile(workbook, 'transacciones.xlsx');
  }

  return (
    <Card>
        <CardHeader className="flex flex-row items-center justify-between">
            <div>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </div>
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                         <Button variant="outline" size="icon" onClick={handleExport} disabled={transactions.length === 0}>
                            <FileSpreadsheet className="h-4 w-4" />
                            <span className="sr-only">Exportar a Excel</span>
                        </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Exportar a Excel</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Descripción</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="text-right">Cantidad</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow key={transaction.id}>
                <TableCell className="font-medium">{transaction.description || 'N/A'}</TableCell>
                <TableCell>
                    <Badge variant="outline" className={cn(getBadgeClass(transaction.type))}>
                        {typeLabels[transaction.type]}
                    </Badge>
                </TableCell>
                <TableCell>
                    {transaction.category ? (
                        <Badge variant="secondary">{categoryLabels[transaction.category]}</Badge>
                    ) : 'N/A'}
                </TableCell>
                <TableCell>
                    {getStatusBadge(transaction.status)}
                </TableCell>
                <TableCell>{format(new Date(transaction.date), 'PPP', { locale: es })}</TableCell>
                <TableCell className={cn("text-right font-semibold", getAmountClass(transaction.type))}>
                  {getAmountPrefix(transaction.type)} {formatCurrency(transaction.amount)}
                </TableCell>
                 <TableCell className="text-center">
                    <div className="flex items-center justify-center space-x-1">
                        {transaction.type !== 'branch_transfer' && (
                            <EditTransactionDialog transaction={transaction}>
                                <Button variant="ghost" size="icon">
                                    <FilePenLine className="h-4 w-4" />
                                    <span className="sr-only">Editar</span>
                                </Button>
                            </EditTransactionDialog>
                        )}
                        <DeleteTransactionDialog transactionId={transaction.id}>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600">
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Eliminar</span>
                            </Button>
                        </DeleteTransactionDialog>
                    </div>
                </TableCell>
              </TableRow>
            ))}
             {transactions.length === 0 && (
                <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                        No hay transacciones para este período.
                    </TableCell>
                </TableRow>
             )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
