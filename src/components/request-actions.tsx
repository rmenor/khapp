
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
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface RequestActionsProps {
  request: Request;
  onActionComplete?: (deletedId?: string) => void;
}

export function RequestActions({ request, onActionComplete }: RequestActionsProps) {
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
      if (onActionComplete) {
        onActionComplete();
      }
    } else {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: result.message || 'No se pudo actualizar el estado.',
      });
    }
  };

   const handleDelete = async () => {
    if (!request?.id) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'ID de solicitud no válido.',
      });
      return;
    }

    setIsDeleting(true);
    
    try {
      const result = await deleteRequestAction({ id: request.id });
      
      if (result.success) {
        if (onActionComplete) {
          onActionComplete(request.id);
        }
        setDeleteDialogOpen(false);
      } else {
        toast({
          variant: 'destructive',
          title: 'Error al eliminar',
          description: result.message || 'No se pudo eliminar la solicitud.',
        });
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error inesperado',
        description: error.message || 'Ocurrió un error inesperado.',
      });
    } finally {
      setIsDeleting(false);
    }
  }

  const handleParalyze = async () => {
    setIsParalyzing(true);
    const result = await paralyzeRequestAction({ id: request.id });
    setIsParalyzing(false);
    setParalyzeDialogOpen(false);

    if (result.success) {
        toast({ title: 'Éxito', description: result.message });
        if (onActionComplete) {
          onActionComplete();
        }
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
      <DropdownmenuTrigger asChild>
        <Button variant="ghost" size="icon" disabled={isUpdating || isDeleting}>
          <MoreHorizontal className="h-4 w-4" />
          <span className="sr-only">Acciones</span>
        </Button>
      </DropdownmenuTrigger>
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
    {statusChangeDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setStatusChangeDialogOpen(false)} />
        <div className="relative bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">¿Estás seguro?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esta acción cambiará el estado de la solicitud a &quot;{actionToConfirm}&quot;.
            Esta acción no se puede deshacer fácilmente.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setStatusChangeDialogOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleStatusChange} disabled={isUpdating}>
              {isUpdating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Actualizando...</> : `Sí, marcar como ${actionToConfirm}`}
            </Button>
          </div>
        </div>
      </div>
    )}
    
    {/* Delete Confirmation Dialog */}
    {deleteDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setDeleteDialogOpen(false)} />
        <div className="relative bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">¿Estás seguro de que quieres eliminar?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esta acción es permanente y no se puede deshacer. La solicitud se eliminará definitivamente.
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
              Cancelar
            </Button>
            <Button 
              type="button"
              onClick={() => {
                console.log('Delete button clicked - calling handleDelete');
                handleDelete();
              }}
              disabled={isDeleting} 
              className="bg-destructive hover:bg-destructive/90"
            >
              {isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
            </Button>
          </div>
        </div>
      </div>
    )}

     {/* Paralyze Confirmation Dialog */}
     {paralyzeDialogOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <div className="fixed inset-0 bg-black/50" onClick={() => setParalyzeDialogOpen(false)} />
        <div className="relative bg-background p-6 rounded-lg shadow-lg max-w-md w-full">
          <h2 className="text-lg font-semibold mb-2">¿Paralizar servicio continuo?</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Esta acción marcará el fin del servicio continuo para este precursor a partir de hoy. Ya no aparecerá en los meses futuros. ¿Deseas continuar?
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setParalyzeDialogOpen(false)} disabled={isParalyzing}>
              Cancelar
            </Button>
            <Button onClick={handleParalyze} disabled={isParalyzing}>
              {isParalyzing ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Paralizando...</> : 'Sí, paralizar'}
            </Button>
          </div>
        </div>
      </div>
    )}

    </>
  );
}
