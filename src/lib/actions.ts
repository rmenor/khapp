
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  writeBatch,
  Timestamp,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import type { RequestStatus, TransactionStatus } from './types';

const IncomeSchema = z.object({
  amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
  date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
  description: z.string().max(100, { message: 'La descripción debe tener 100 caracteres o menos.' }).optional(),
  category: z.enum(['congregation', 'worldwide_work', 'renovation'], {
    errorMap: () => ({ message: 'Por favor, selecciona una categoría válida.' }),
  }),
});

const ExpenseSchema = z.object({
  amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
  date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
  description: z.string().max(100, { message: 'La descripción debe tener 100 caracteres o menos.' }).optional(),
});

const BranchTransferSchema = z.object({
  amount: z.coerce.number().positive({ message: 'La cantidad debe ser mayor que cero.' }),
  date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
  description: z.string().max(100, { message: 'La descripción debe tener 100 caracteres o menos.' }).optional(),
  transactionIds: z.array(z.string()).min(1, { message: 'Debes seleccionar al menos una transacción.' }),
});

const UpdateTransactionSchema = z.object({
    id: z.string(),
    type: z.enum(['income', 'expense', 'branch_transfer']),
    amount: z.coerce.number().positive({ message: 'La cantidad debe ser un número positivo.' }),
    date: z.string().min(1, { message: 'La fecha es obligatoria.' }),
    description: z.string().max(100, { message: 'La descripción debe tener 100 caracteres o menos.' }).optional(),
    category: z.enum(['congregation', 'worldwide_work', 'renovation']).optional(),
    status: z.enum(['Completado', 'Pendiente de envío', 'Enviado']).optional(),
});

const DeleteTransactionSchema = z.object({
    id: z.string().min(1, { message: 'El ID de la transacción es obligatorio.' }),
});

const RestoreTransactionSchema = z.object({
    type: z.enum(['income', 'expense', 'branch_transfer']),
    amount: z.number(),
    date: z.object({
      seconds: z.number(),
      nanoseconds: z.number(),
    }).transform(t => Timestamp.fromMillis(t.seconds * 1000)),
    description: z.string().optional(),
    category: z.enum(['congregation', 'worldwide_work', 'renovation']).optional(),
    status: z.enum(['Completado', 'Pendiente de envío', 'Enviado']).optional(),
  });

const RequestSchema = z.object({
    name: z.string().min(3, { message: 'El nombre es obligatorio y debe tener al menos 3 caracteres.' }),
    year: z.coerce.number({required_error: 'El año es obligatorio.'}),
    months: z.array(z.string()).optional(),
    isContinuous: z.boolean(),
    hours: z.coerce.number().optional(),
}).refine(data => {
    if (!data.isContinuous) {
        return data.months && data.months.length > 0;
    }
    return true;
}, {
    message: 'Debes especificar los meses si la solicitud no es de servicio continuo.',
    path: ['months'],
}).refine(data => {
    if (!data.isContinuous) {
        return !!data.hours;
    }
    return true;
}, {
    message: 'Debes seleccionar una modalidad de horas.',
    path: ['hours'],
});


const UpdateRequestStatusSchema = z.object({
    id: z.string().min(1, { message: 'El ID de la solicitud es obligatorio.' }),
    status: z.enum(['Aprobado', 'Rechazado'], {
      errorMap: () => ({ message: 'Por favor, selecciona un estado válido.' }),
    }),
});

const DeleteRequestSchema = z.object({
    id: z.string().min(1, { message: 'El ID de la solicitud es obligatorio.' }),
});

const ParalyzeRequestSchema = z.object({
    id: z.string().min(1, { message: 'El ID de la solicitud es obligatorio.' }),
});

const CongregationSchema = z.object({
    name: z.string().min(1, { message: 'El nombre de la congregación es obligatorio.' }),
});


export async function addIncomeAction(data: z.infer<typeof IncomeSchema>) {
  const validatedFields = IncomeSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
  }
  
  if (!db) {
    return { success: false, message: 'La base de datos no está disponible.' };
  }

  try {
    const { amount, date, description, category } = validatedFields.data;

    let status: TransactionStatus;
    if (category === 'congregation') {
        status = 'Completado';
    } else {
        status = 'Pendiente de envío';
    }

    await addDoc(collection(db, 'transactions'), {
        type: 'income',
        amount,
        date: Timestamp.fromDate(new Date(date)),
        description: description || '',
        category,
        status,
    });
    revalidatePath('/finance');
    return { success: true, message: 'Ingreso añadido correctamente.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al añadir el ingreso.' };
  }
}

export async function addExpenseAction(data: z.infer<typeof ExpenseSchema>) {
  const validatedFields = ExpenseSchema.safeParse(data);

  if (!validatedFields.success) {
    return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
  }

  if (!db) {
    return { success: false, message: 'La base de datos no está disponible.' };
  }

  try {
    const { amount, date, description } = validatedFields.data;
    await addDoc(collection(db, 'transactions'), {
        type: 'expense',
        amount,
        date: Timestamp.fromDate(new Date(date)),
        description: description || '',
        status: 'Completado',
     });
    revalidatePath('/finance');
    return { success: true, message: 'Gasto añadido correctamente.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al añadir el gasto.' };
  }
}

export async function addBranchTransferAction(data: z.infer<typeof BranchTransferSchema>) {
    const validatedFields = BranchTransferSchema.safeParse(data);
  
    if (!validatedFields.success) {
      return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.' };
    }
  
    try {
      const { amount, date, description, transactionIds } = validatedFields.data;
      
      const batch = writeBatch(db);

      transactionIds.forEach(id => {
          const docRef = doc(db, 'transactions', id);
          batch.update(docRef, { status: 'Enviado' });
      });

      const newTransferRef = doc(collection(db, 'transactions'));
      batch.set(newTransferRef, {
        amount, 
        date: Timestamp.fromDate(new Date(date)), 
        type: 'branch_transfer', 
        description: description || 'Envío a la sucursal',
        status: 'Completado',
      });

      await batch.commit();

      revalidatePath('/finance');
      return { success: true, message: 'Envío a la sucursal añadido correctamente.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al añadir el envío a la sucursal.' };
    }
  }

export async function updateTransactionAction(data: z.infer<typeof UpdateTransactionSchema>) {
    const validatedFields = UpdateTransactionSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }

    if (!db) {
        return { success: false, message: 'La base de datos no está disponible.' };
    }

    try {
        const { id, ...rest } = validatedFields.data;
        
        const transactionRef = doc(db, 'transactions', id);
        
        const updateData: any = {
            ...rest,
            date: Timestamp.fromDate(new Date(rest.date)),
            description: rest.description || '',
        };

        if (rest.type === 'income' && rest.category) {
            if (rest.category === 'congregation') {
                updateData.status = 'Completado';
            } else if (updateData.status !== 'Enviado') {
                updateData.status = 'Pendiente de envío';
            }
        }
        
        Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
        
        await updateDoc(transactionRef, updateData);

        revalidatePath('/finance');
        revalidatePath('/requests');
        return { success: true, message: 'Transacción actualizada correctamente.' };
    } catch (e: any) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
        return { success: false, message: `Error al actualizar la transacción: ${message}` };
    }
}

export async function deleteTransactionAction(data: z.infer<typeof DeleteTransactionSchema>) {
    const validatedFields = DeleteTransactionSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos.' };
    }

    if (!db) {
        return { success: false, message: 'La base de datos no está disponible.' };
    }

    try {
        const { id } = validatedFields.data;
        await deleteDoc(doc(db, 'transactions', id));
        revalidatePath('/finance');
        return { success: true, message: 'Transacción eliminada correctamente.' };
    } catch (e: any) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
        return { success: false, message: `Error al eliminar la transacción: ${message}` };
    }
}

export async function restoreTransactionsAction(transactions: unknown[]) {
    if (!db) {
        return { success: false, message: 'La base de datos no está disponible.' };
    }

    const batch = writeBatch(db);
    
    try {
        for (const transactionData of transactions) {
            const { id, ...dataToValidate } = transactionData as any;
            
            const validatedFields = RestoreTransactionSchema.safeParse(dataToValidate);
    
            if (!validatedFields.success) {
              console.error('Invalid transaction in backup file:', validatedFields.error.flatten().fieldErrors);
              continue;
            }

            const newDocRef = doc(collection(db, 'transactions'));
            batch.set(newDocRef, validatedFields.data);
        }
    
        await batch.commit();
        revalidatePath('/finance');
        return { success: true, message: 'Transacciones restauradas correctamente.' };

    } catch (e: any) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
        return { success: false, message: `Error al restaurar las transacciones: ${message}` };
    }
}

export async function addRequestAction(data: z.infer<typeof RequestSchema>) {
    const validatedFields = RequestSchema.safeParse(data);
  
    if (!validatedFields.success) {
      return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }
    
    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.' };
    }
  
    try {
      const { name, months, isContinuous, year, hours } = validatedFields.data;
  
      const requestData: any = {
        name,
        isContinuous,
        requestDate: Timestamp.fromDate(new Date()),
        status: 'Pendiente',
        year,
        months: months || [],
      };

      if(!isContinuous) {
        requestData.hours = hours;
      } else {
        requestData.months = [];
      }

      await addDoc(collection(db, 'requests'), requestData);

      revalidatePath('/requests');
      return { success: true, message: 'Solicitud añadida correctamente.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al añadir la solicitud.' };
    }
}

export async function updateRequestStatusAction(data: z.infer<typeof UpdateRequestStatusSchema>) {
    const validatedFields = UpdateRequestStatusSchema.safeParse(data);
  
    if (!validatedFields.success) {
      return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }
    
    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.' };
    }
  
    try {
      const { id, status } = validatedFields.data;
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, { status });
      
      revalidatePath('/requests');
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, message: 'Estado de la solicitud actualizado correctamente.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al actualizar el estado de la solicitud.' };
    }
}

export async function deleteRequestAction(data: z.infer<typeof DeleteRequestSchema>) {
    const validatedFields = DeleteRequestSchema.safeParse(data);

    if (!validatedFields.success) {
        return { success: false, message: 'Datos inválidos.' };
    }

    if (!db) {
        return { success: false, message: 'La base de datos no está disponible.' };
    }

    try {
        const { id } = validatedFields.data;
        await deleteDoc(doc(db, 'requests', id));
        revalidatePath('/requests');
        return { success: true, message: 'Solicitud eliminada correctamente.' };
    } catch (e: any) {
        const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
        return { success: false, message: `Error al eliminar la solicitud: ${message}` };
    }
}

export async function paralyzeRequestAction(data: z.infer<typeof ParalyzeRequestSchema>) {
    const validatedFields = ParalyzeRequestSchema.safeParse(data);
  
    if (!validatedFields.success) {
      return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }
    
    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.' };
    }
  
    try {
      const { id } = validatedFields.data;
      const requestRef = doc(db, 'requests', id);
      await updateDoc(requestRef, { endDate: Timestamp.fromDate(new Date()) });
      
      revalidatePath('/requests');
      return { success: true, message: 'El servicio continuo ha sido paralizado.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al paralizar la solicitud.' };
    }
}

export async function getCongregationAction() {
    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.', name: '' };
    }
  
    try {
      const docRef = doc(db, 'congregations', 'main');
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        return { success: true, name: docSnap.data().name };
      } else {
        return { success: true, name: '' };
      }
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al obtener la congregación.', name: '' };
    }
  }
  
  export async function updateCongregationAction(data: z.infer<typeof CongregationSchema>) {
    const validatedFields = CongregationSchema.safeParse(data);
  
    if (!validatedFields.success) {
      return { success: false, message: 'Datos inválidos.', errors: validatedFields.error.flatten().fieldErrors };
    }
  
    if (!db) {
      return { success: false, message: 'La base de datos no está disponible.' };
    }
  
    try {
      const { name } = validatedFields.data;
      const docRef = doc(db, 'congregations', 'main');
      await setDoc(docRef, { name });
  
      revalidatePath('/settings');
      return { success: true, message: 'Nombre de la congregación actualizado correctamente.' };
    } catch (e: any) {
      return { success: false, message: e.message || 'Error al actualizar la congregación.' };
    }
  }
