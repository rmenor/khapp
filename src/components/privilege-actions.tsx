'use client';

import { useState } from 'react';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from './ui/button';
import { MoreHorizontal, Trash2, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { deletePrivilegeAction } from '@/lib/actions';
import { type Privilege, type Publisher } from '@/lib/types';
import { AddPrivilegeDialog } from './add-privilege-dialog';

interface PrivilegeActionsProps {
	privilege: Privilege;
	publishers: Publisher[];
	onComplete?: () => void;
}

export function PrivilegeActions({ privilege, publishers, onComplete }: PrivilegeActionsProps) {
	const [isDeleting, setIsDeleting] = useState(false);
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
	const { toast } = useToast();

	const handleDelete = async () => {
		setIsDeleting(true);
		try {
			const result = await deletePrivilegeAction({ id: privilege.id });
			if (result.success) {
				toast({ title: 'Éxito', description: result.message });
				if (onComplete) onComplete();
				setDeleteDialogOpen(false);
			} else {
				toast({
					variant: 'destructive',
					title: 'Error al eliminar',
					description: result.message || 'No se pudo eliminar el privilegio.',
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
	};

	return (
		<>
			<div className="flex items-center gap-1 justify-end">
				<AddPrivilegeDialog initialData={privilege} publishers={publishers} onComplete={onComplete} />
				<DropdownMenu>
					<DropdownMenuTrigger asChild>
						<Button variant="ghost" size="icon" disabled={isDeleting}>
							<MoreHorizontal className="h-4 w-4" />
							<span className="sr-only">Acciones</span>
						</Button>
					</DropdownMenuTrigger>
					<DropdownMenuContent align="end">
						<DropdownMenuItem onSelect={() => setDeleteDialogOpen(true)} className="text-red-500">
							<Trash2 className="mr-2 h-4 w-4" />
							<span>Eliminar</span>
						</DropdownMenuItem>
					</DropdownMenuContent>
				</DropdownMenu>
			</div>

			{/* Delete Confirmation Dialog */}
			{deleteDialogOpen && (
				<div className="fixed inset-0 z-50 flex items-center justify-center">
					<div className="fixed inset-0 bg-black/50" onClick={() => setDeleteDialogOpen(false)} />
					<div className="relative bg-background p-6 rounded-lg shadow-lg max-w-md w-full z-10">
						<h2 className="text-lg font-semibold mb-2">¿Estás seguro de que quieres eliminar este privilegio?</h2>
						<p className="text-sm text-muted-foreground mb-4">
							Esta acción es permanente y no se puede deshacer. Los publicadores asignados a este privilegio no serán eliminados.
						</p>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
								Cancelar
							</Button>
							<Button
								type="button"
								onClick={handleDelete}
								disabled={isDeleting}
								className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
							>
								{isDeleting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Eliminando...</> : 'Sí, eliminar'}
							</Button>
						</div>
					</div>
				</div>
			)}
		</>
	);
}
