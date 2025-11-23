
'use client';

import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { CheckCircle, MoreHorizontal, XCircle, Trash2, Loader2, PauseCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { updateRequestStatusAction, deleteRequestAction, paralyzeRequestAction } from '@/lib/actions';
import { type Request, type RequestStatus } from '@/lib/types';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
  } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RequestActionsProps {
  request: Request;
}

export function RequestActions({ request }: RequestActionsProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isParalyzing, setIsParalyzing] = useState(false);

  const [statusChangeDialogOpen, setStatusChangeDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paralyzeDialogOpen, setParalyzeDialogOpen] = useState(false);

  const [actionToConfirm, setActionToConfirm] = useState<'Aprobado' | 'Rechazado' | null>(null);

  const { toast } = useToast();

  const handleStatusChange = async () => {
    if (!actionToConfirm) return;

    setIsUpdating(true);
    const result = await updateRequestStatusAction({ id: request.id, status: actionToConfirm });
    setIsUpdating(false);
    setStatusChangeDialogOpen(false);


    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message,
      });
       window.location.reload();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message || 'No se pudo actualizar el estado.',
      });
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteRequestAction({ id: request.id });
    setIsDeleting(false);
    setDeleteDialogOpen(false);
    
    if (result.success) {
      toast({
        title: 'Éxito',
        description: result.message,
      });
      window.location.reload();
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message || 'No se pudo eliminar la solicitud.',
      });
    }
  }

  const handleParalyze = async () => {
    setIsParalyzing(true);
    const result = await paralyzeRequestAction({ id: request.id });
    setIsParalyzing(false);
    setParalyzeDialogOpen(false);

    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        window.location.reload();
    } else {
        toast({
            variant: 'destructive',
            title: 'Error',
            description: result.message || 'No se pudo paralizar la solicitud.',
        });
    }
  }

  const openStatusConfirmation = (status: 'Aprobado' | 'Rechazado') => {
    setActionToConfirm(status);
    setStatusChangeDialogOpen(true);
  }

  const canBeParalyzed = request.isContinuous && request.status === 'Aprobado' && !request.endDate;

  return (
    <>
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isUpdating || isDeleting}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {request.status === 'Pendiente' && (
            <>
                <DropdownMenuItem onSelect={() => openStatusConfirmation('Aprobado')}>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                <span>Aprobar</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => openStatusConfirmation('Rechazado')}>
                <XCircle className="mr-2 h-4 w-4 text-red-500" />
                <span>Rechazar</span>
                </DropdownMenuItem>
            </>
        )}
        {canBeParalyzed && (
             <DropdownMenuItem onSelect={() => setParalyzeDialogOpen(true)}>
                <PauseCircle className="mr-2 h-4 w-4 text-orange-500" />
                <span>Paralizar Servicio</span>
            </DropdownMenuItem>
        )}
        {request.endDate && (
             <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
                Finalizado el {format(request.endDate, 'PPP', { locale: es })}
            </DropdownMenuLabel>
        )}
        {(request.status !== 'Pendiente' || canBeParalyzed || request.endDate) && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)} className="text-red-500">
          <Trash2 className="mr-2 h-4 w-4" />
          <span>Eliminar</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>

    {/* Status Change Dialog */}
    <AlertDialog open={statusChangeDialogOpen} onOpenChange={setStatusChangeDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción cambiará el estado de la solicitud a &quot;{actionToConfirm}&quot;.
                Esta acción no se puede deshacer fácilmente.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isUpdating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleStatusChange} disabled={isUpdating}>
                {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...</> : `Sí, marcar como ${actionToConfirm}`}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    
    {/* Delete Confirmation Dialog */}
    <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Estás seguro de que quieres eliminar?</AlertDialogTitle>
            <AlertDialogDescription>
               Esta acción es permanente y no se puede deshacer. La solicitud se eliminará definitivamente.
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                 {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : `Sí, eliminar`}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

     {/* Paralyze Confirmation Dialog */}
     <AlertDialog open={paralyzeDialogOpen} onOpenChange={setParalyzeDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
            <AlertDialogTitle>¿Paralizar servicio continuo?</AlertDialogTitle>
            <AlertDialogDescription>
                Esta acción marcará el fin del servicio continuo para este precursor a partir de hoy. Ya no aparecerá en los meses futuros. ¿Deseas continuar?
            </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
            <AlertDialogCancel disabled={isParalyzing}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleParalyze} disabled={isParalyzing}>
                {isParalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Paralizando...</> : 'Sí, paralizar'}
            </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </>
  );
}
