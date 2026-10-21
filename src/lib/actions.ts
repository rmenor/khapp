
'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  doc,
  Timestamp,
  deleteDoc,
  getDoc,
  setDoc,
} from 'firebase/firestore';
import { cookies } from 'next/headers';
import { signSession, verifySession } from './auth-session';

const LoginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});


/** Extrae un mensaje de error de un valor desconocido. */
function errorMessage(error: unknown): string | undefined {
  return error instanceof Error ? error.message : undefined;
}

export async function loginAction(data: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: 'Usuario y contraseña son obligatorios.' };
  }

  const { username, password } = validatedFields.data;
  const adminUser = process.env.ADMIN_USERNAME || 'admin_prado';
  const adminPass = process.env.ADMIN_PASSWORD || 'LucasMateo1914';

  if (username === adminUser && password === adminPass) {
    const expireTime = String(Date.now() + 1000 * 60 * 60 * 24);
    const sessionToken = await signSession(expireTime);
    
    const cookieStore = await cookies();
    cookieStore.set('__session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return { success: true, message: 'Inicio de sesión correcto.' };
  }

  return { success: false, message: 'Usuario o contraseña incorrectos.' };
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
  return { success: true, message: 'Sesión cerrada correctamente.' };
}

export async function verifySessionOrThrow() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('__session')?.value;
  const isValid = await verifySession(sessionCookie);
  if (!isValid) {
    throw new Error('No autorizado.');
  }
}


const CongregationSchema = z.object({
  name: z.string().min(1, { message: 'El nombre de la congregación es obligatorio.' }),
});


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
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al obtener la congregación.', name: '' };
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
    await verifySessionOrThrow();
    const { name } = validatedFields.data;
    const docRef = doc(db, 'congregations', 'main');
    await setDoc(docRef, { name });

    revalidatePath('/settings');
    return { success: true, message: 'Nombre de la congregación actualizado correctamente.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al actualizar la congregación.' };
  }
}

// Annual Assignments

const PioneerTalkSchema = z.object({
  year: z.coerce.number(),
  date: z.string().min(1),
  speaker1: z.string().min(1),
  speaker2: z.string().min(1),
  openingPrayer: z.string().min(1),
  closingPrayer: z.string().min(1),
});

const SpecialTalkSchema = z.object({
  year: z.coerce.number(),
  president: z.string().min(1),
  speaker: z.string().min(1),
  closingPrayer: z.string().min(1),
  auxiliarySpeaker: z.string().min(1),
  date: z.string().min(1),
});

const MemorialSchema = z.object({
  year: z.coerce.number(),
  president: z.string().min(1),
  openingPrayer: z.string().min(1),
  speaker: z.string().min(1),
  breadPrayer: z.string().min(1),
  winePrayer: z.string().min(1),
  date: z.string().min(1),
});

export async function addPioneerTalkAction(data: z.infer<typeof PioneerTalkSchema>) {
  const validatedFields = PioneerTalkSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await addDoc(collection(db, 'pioneer_talks'), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Discurso con los precursores añadido.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al añadir el discurso.' };
  }
}

export async function addSpecialTalkAction(data: z.infer<typeof SpecialTalkSchema>) {
  const validatedFields = SpecialTalkSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await addDoc(collection(db, 'special_talks'), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Discurso especial añadido.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al añadir el discurso.' };
  }
}

export async function addMemorialAction(data: z.infer<typeof MemorialSchema>) {
  const validatedFields = MemorialSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await addDoc(collection(db, 'memorials'), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Conmemoración añadida.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al añadir la conmemoración.' };
  }
}

export async function updatePioneerTalkAction(id: string, data: z.infer<typeof PioneerTalkSchema>) {
  const validatedFields = PioneerTalkSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await updateDoc(doc(db, 'pioneer_talks', id), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Discurso con los precursores actualizado.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al actualizar el discurso.' };
  }
}

export async function updateSpecialTalkAction(id: string, data: z.infer<typeof SpecialTalkSchema>) {
  const validatedFields = SpecialTalkSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await updateDoc(doc(db, 'special_talks', id), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Discurso especial actualizado.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al actualizar el discurso.' };
  }
}

export async function updateMemorialAction(id: string, data: z.infer<typeof MemorialSchema>) {
  const validatedFields = MemorialSchema.safeParse(data);
  if (!validatedFields.success) return { success: false, message: 'Datos inválidos.' };
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    const { date, ...rest } = validatedFields.data;
    await updateDoc(doc(db, 'memorials', id), {
      ...rest,
      date: Timestamp.fromDate(new Date(date)),
    });
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Conmemoración actualizada.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al actualizar la conmemoración.' };
  }
}

export async function deleteAnnualAssignmentAction(id: string, type: 'pioneer_talks' | 'special_talks' | 'memorials') {
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    await deleteDoc(doc(db, type, id));
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Registro eliminado correctamente.' };
  } catch (e: unknown) {
    return { success: false, message: errorMessage(e) || 'Error al eliminar el registro.' };
  }
}


