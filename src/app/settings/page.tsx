
'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Download, Upload, Loader2, Save } from 'lucide-react';
import { AppLogo } from '@/components/icons';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs } from 'firebase/firestore';
import { restoreTransactionsAction, updateCongregationAction, getCongregationAction } from '@/lib/actions';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';


export default function SettingsPage() {
    const [isBackingUp, setIsBackingUp] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [backupFile, setBackupFile] = useState<File | null>(null);
    const [congregationName, setCongregationName] = useState('');
    const [isSavingCongregation, setIsSavingCongregation] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        const fetchCongregationName = async () => {
            const { success, name, message } = await getCongregationAction();
            if (success) {
                setCongregationName(name);
            } else {
                toast({
                    variant: 'destructive',
                    title: 'Error al cargar datos',
                    description: message,
                });
            }
        };

        fetchCongregationName();
    }, [toast]);


    const handleBackup = async () => {
        setIsBackingUp(true);
        try {
            const querySnapshot = await getDocs(collection(db, 'transactions'));
            const transactions = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const dataStr = JSON.stringify(transactions, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            const url = window.URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            const date = new Date().toISOString().split('T')[0];
            link.download = `finanzas-kh-backup-${date}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            
            toast({
                title: 'Éxito',
                description: 'Copia de seguridad descargada correctamente.',
            });

        } catch (error: any) {
            toast({
                variant: 'destructive',
                title: 'Error en la copia de seguridad',
                description: error.message || 'No se pudo completar la copia de seguridad.',
            });
        } finally {
            setIsBackingUp(false);
        }
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.files) {
            setBackupFile(event.target.files[0]);
        }
    };

    const handleRestore = async () => {
        if (!backupFile) {
            toast({
                variant: 'destructive',
                title: 'Error',
                description: 'Por favor, selecciona un archivo de copia de seguridad.',
            });
            return;
        }

        setIsRestoring(true);

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const content = event.target?.result as string;
                const transactions = JSON.parse(content);

                // Basic validation
                if (!Array.isArray(transactions)) {
                    throw new Error('El archivo de copia de seguridad no es válido.');
                }
                
                const result = await restoreTransactionsAction(transactions);

                if (result.success) {
                    toast({
                        title: 'Éxito',
                        description: 'Datos restaurados correctamente. La página se recargará.',
                    });
                    setTimeout(() => window.location.assign('/dashboard'), 2000);
                } else {
                    throw new Error(result.message || 'Error desconocido al restaurar.');
                }

            } catch (error: any) {
                 toast({
                    variant: 'destructive',
                    title: 'Error de Restauración',
                    description: error.message,
                });
            } finally {
                 setIsRestoring(false);
            }
        };
        reader.readAsText(backupFile);
    };

    const handleSaveCongregation = async () => {
        setIsSavingCongregation(true);
        const result = await updateCongregationAction({ name: congregationName });
        if (result.success) {
            toast({
                title: 'Éxito',
                description: 'Nombre de la congregación guardado.',
            });
        } else {
            toast({
                variant: 'destructive',
                title: 'Error al guardar',
                description: result.message || 'No se pudo guardar el nombre de la congregación.',
            });
        }
        setIsSavingCongregation(false);
    };


  return (
    <div className="flex min-h-screen w-full flex-col bg-muted/40">
       <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background px-4 md:px-6 z-10">
        <div className="flex items-center gap-2 font-semibold">
            <AppLogo className="h-6 w-6 text-primary" />
            <span className="">KH App - Configuración</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
            <Link href="/finance">
                <Button variant="outline">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Volver al Panel
                </Button>
            </Link>
        </div>
      </header>
      <main className="flex flex-1 flex-col items-center justify-start p-4 md:p-8 space-y-8">

        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Información de la Congregación</CardTitle>
            <CardDescription>
                Establece el nombre de tu congregación.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex items-center gap-4">
            <Input 
                placeholder="Nombre de la congregación" 
                value={congregationName}
                onChange={(e) => setCongregationName(e.target.value)}
            />
            <Button onClick={handleSaveCongregation} disabled={isSavingCongregation}>
                {isSavingCongregation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                {isSavingCongregation ? 'Guardando...' : 'Guardar'}
            </Button>
          </CardContent>
        </Card>


        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Copia de Seguridad</CardTitle>
            <CardDescription>
              Descarga una copia de seguridad de todas tus transacciones en un archivo JSON.
              Guarda este archivo en un lugar seguro.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={isBackingUp}>
                {isBackingUp ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
                {isBackingUp ? 'Generando copia...' : 'Descargar Copia de Seguridad'}
            </Button>
          </CardContent>
        </Card>
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle>Restaurar Copia de Seguridad</CardTitle>
            <CardDescription>
              Restaura tus datos desde un archivo de copia de seguridad JSON. Esta acción añadirá
              las transacciones del archivo a tu base de datos actual.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
              <Input type="file" accept=".json" onChange={handleFileChange} disabled={isRestoring}/>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                    <Button variant="destructive" disabled={isRestoring || !backupFile}>
                        {isRestoring ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                        {isRestoring ? 'Restaurando...' : 'Restaurar Datos'}
                    </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>¿Estás seguro?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta acción restaurará los datos desde el archivo seleccionado. Esto no borrará los datos existentes, pero podría crear duplicados si las transacciones ya existen. ¿Deseas continuar?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={handleRestore}>Sí, Restaurar</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
