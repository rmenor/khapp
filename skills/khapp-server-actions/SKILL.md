---
name: khapp-server-actions
description: >
  Enforces conventions for Next.js Server Actions, input validation with Zod, unified error handling, and cache revalidation in KH App.
  Trigger: Modifying src/lib/actions.ts, creating new Server Actions, or writing next.js server-side mutation logic.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When writing new Next.js Server Actions for forms or operations.
- When modifying existing actions in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).
- When validating client-submitted forms before database persistence.

## Critical Patterns

- **Location**: All Server Actions must reside in `src/lib/actions.ts` and start with the `'use server'` directive.
- **Input Validation**: Use Zod schema validation using `.safeParse(data)` at the top of the action.
- **Unified Response Format**: All actions must return an object matching the type `{ success: boolean, message: string, errors?: Record<string, string[]> }`.
- **Database Safety**: Always check if `db` is available before executing Firestore actions.
- **Cache Revalidation**: Call `revalidatePath()` for all paths affected by the write operation to update Next.js Router cache.
- **Error Handling**: Wrap the action logic in a `try...catch` block. Catch blocks should log errors properly and return a safe error message.

## Code Examples

### Standard Server Action Template

```typescript
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { db } from './firebase';
import { collection, addDoc, Timestamp } from 'firebase/firestore';

const CustomActionSchema = z.object({
  name: z.string().min(3, { message: 'El nombre debe tener al menos 3 caracteres.' }),
  value: z.coerce.number().positive({ message: 'El valor debe ser positivo.' }),
});

export async function addCustomItemAction(data: z.infer<typeof CustomActionSchema>) {
  const validatedFields = CustomActionSchema.safeParse(data);

  if (!validatedFields.success) {
    return {
      success: false,
      message: 'Datos inválidos.',
      errors: validatedFields.error.flatten().fieldErrors
    };
  }

  if (!db) {
    return { success: false, message: 'La base de datos no está disponible.' };
  }

  try {
    const { name, value } = validatedFields.data;

    await addDoc(collection(db, 'custom_items'), {
      name,
      value,
      createdAt: Timestamp.fromDate(new Date()),
    });

    revalidatePath('/dashboard');
    return { success: true, message: 'Elemento añadido correctamente.' };
  } catch (e: any) {
    const message = e instanceof Error ? e.message : 'Error desconocido.';
    return { success: false, message: `Error al procesar: ${message}` };
  }
}
```

## Commands

```bash
# Run type check to verify actions compile
npm run typecheck

# Run linter
npm run lint
```
