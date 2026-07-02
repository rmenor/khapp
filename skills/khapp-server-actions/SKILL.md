---
name: khapp-server-actions
description: >
  Enforces conventions for Next.js Server Actions, input validation with Zod, unified error handling, and cache revalidation in KH App.
  Trigger: Modifying src/lib/actions.ts, creating new Server Actions, or writing next.js server-side mutation logic.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## When to Use

- When writing new Next.js Server Actions for forms or operations.
- When modifying existing actions in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).
- When validating client-submitted forms before database persistence.
- When deciding whether a new mutation should live in `actions.ts` or in a domain-specific file (see §10 below — this is currently changing).

## Critical Patterns

### 1. File Location: `src/lib/actions.ts` (for now)

All Server Actions must currently reside in [src/lib/actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and start with the `'use server'` directive at the top of the file.

This file is **1176 lines** (as of 2026-06-24) and is starting to overflow. See §10 for the planned split.

### 2. Input Validation: `safeParse` + flattened errors

Use Zod schema validation using `.safeParse(data)` at the top of the action. On failure, return:

```typescript
return {
  success: false,
  message: 'Datos inválidos.',
  errors: validatedFields.error.flatten().fieldErrors
};
```

The `errors` field is **critical** for the dialogs to show field-level error messages. Returning only `{ success: false, message }` will leave the form unable to highlight the bad field. Reference: [actions.ts:174-176](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (canonical example in `addIncomeAction`).

**Anti-pattern**: do NOT use `.parse(data)` (throws ZodError) or `try/catch` around the validation — always use `.safeParse` and return the response shape.

### 3. Unified Response Format

All actions must return an object matching:

```typescript
type ActionResult<T = undefined> = {
  success: boolean;
  message: string;
  errors?: Record<string, string[]>;
  data?: T;  // For actions that return payload (rare)
};
```

The dialogs and pages depend on this shape. Changing it is a breaking change across all callers.

Reference: [actions.ts:175](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (income, expense, branch transfer all conform).

### 4. Database Safety: Check `db` Before Use

`db` is imported from [src/lib/firebase.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/firebase.ts). Always check if `db` is available before executing Firestore actions:

```typescript
if (!db) {
  return { success: false, message: 'La base de datos no está disponible.' };
}
```

This guard is required in **every action that touches Firestore**. It's a leftover from the days when `db` could be `null` in SSR — keep the guard for safety even though it's currently always defined.

Reference: [actions.ts:178-180](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 5. `verifySessionOrThrow()` on Every Protected Action

Any action that **mutates** a protected collection (`transactions`, `requests`, `resolutions`, `publishers`, `groups`, `privileges`, `pioneer_talks`, `special_talks`, `memorials`, `congregations/main`) MUST start with:

```typescript
await verifySessionOrThrow();
```

This goes **after** the `db` check and **before** any Firestore write. Reference: [actions.ts:183](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and [actions.ts:64-71](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (the `verifySessionOrThrow` definition).

**Anti-pattern**: do NOT call `verifySessionOrThrow()` inside the try block without re-checking the error — it throws on failure, so the catch will return a generic error. The current pattern is `await verifySessionOrThrow();` as the first line of the try block, which is fine.

Exception: the public form at `/requests/pub` does NOT call `verifySessionOrThrow()` because there's no session. See [khapp-precursor-requests](../khapp-precursor-requests/SKILL.md) for that pattern.

### 6. Cache Revalidation: `revalidatePath()` After Every Write

Call `revalidatePath()` for **all** paths affected by the write operation, to update Next.js Router cache:

```typescript
revalidatePath('/finance');
revalidatePath('/requests');   // ← if the mutation affects requests too
```

Cross-cutting mutations: `addPublisherAction` and `updatePublisherAction` revalidate `/publishers`, `/groups`, AND `/privileges` because publisher changes affect the dropdowns on the other two pages. Reference: [actions.ts:897-899](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

**Anti-pattern**: do NOT skip `revalidatePath` "to save a render" — the UI will go stale. When in doubt, revalidate every page that lists the mutated collection.

### 7. Error Handling: try/catch with a Spanish message

Wrap the action logic in a `try...catch` block. The catch should return a Spanish error message and a `success: false`:

```typescript
} catch (e: any) {
  const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
  return { success: false, message: `Error al ...: ${message}` };
}
```

**Anti-pattern**: do NOT `console.error` and return a generic message — losing the original error message makes debugging impossible from the browser console.

### 8. `verifySessionOrThrow` is the Single Auth Chokepoint

Do NOT inline your own `verifySession(cookie)` calls. The chokepoint is `verifySessionOrThrow()` in [actions.ts:64-71](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts). For detailed cookie/session/HMAC rules, see [khapp-auth-session](../khapp-auth-session/SKILL.md).

### 9. Always `import { z } from 'zod'` at the Top

Even if a single schema uses it. Co-locating the schema and the action helps readability. Reference: [actions.ts:4](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 10. The File Is at Capacity — Future Split Plan

`actions.ts` is **1176 lines** and growing. The plan, documented here so future agents honor it:

When adding a new domain action (e.g. `schools`, `meetings`, `service-reports`):

- Create `src/lib/actions/<domain>.ts` with `'use server'` at the top.
- Re-export from `actions.ts` to keep existing imports working: `export * from './actions/<domain>';`

Do NOT add new domains to the bottom of `actions.ts` — create a new file. Existing actions stay where they are; we are not rewriting history.

**Anti-pattern**: do NOT create `actions/<domain>.ts` AND import it from `actions.ts` AND keep duplicating schemas. Pick one path (the re-export approach above).

## Code Examples

### Standard Server Action Template (addMutation)

```typescript
'use server';

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
    await verifySessionOrThrow();
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

Reference: [actions.ts:171-206](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) — `addIncomeAction` is the canonical example.

### Standard Update Action

Same shape as add, but uses `updateDoc(doc(db, '<collection>', id), {...})`. The `id` comes from a schema that extends the base schema with `{ id: z.string().min(1) }`. Reference: [actions.ts:328-370](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) — `updateTransactionAction`.

### Standard Delete Action

```typescript
const DeleteTransactionSchema = z.object({
  id: z.string().min(1, { message: 'El ID de la transacción es obligatorio.' }),
});

export async function deleteTransactionAction(data: z.infer<typeof DeleteTransactionSchema>) {
  const validatedFields = DeleteTransactionSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: 'Datos inválidos.' };
  }
  if (!db) {
    return { success: false, message: 'La base de datos no está disponible.' };
  }
  try {
    await verifySessionOrThrow();
    const { id } = validatedFields.data;
    await deleteDoc(doc(db, 'transactions', id));
    revalidatePath('/finance');
    return { success: true, message: 'Transacción eliminada correctamente.' };
  } catch (e: any) {
    const message = e instanceof Error ? e.message : 'Ocurrió un error desconocido.';
    return { success: false, message: `Error al eliminar la transacción: ${message}` };
  }
}
```

Reference: [actions.ts:372-393](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

## Domain-Specific Action Reference

This skill covers the **common** shape. For domain-specific rules (status derivation, cascading deletes, cross-collection references), see:

- [khapp-finance-domain](../khapp-finance-domain/SKILL.md) — transactions, resolutions, branch transfer, status derivation
- [khapp-precursor-requests](../khapp-precursor-requests/SKILL.md) — request validation refinements, paralysis, reactivation
- [khapp-annual-assignments](../khapp-annual-assignments/SKILL.md) — three sibling collections, discriminated delete
- [khapp-people-entities](../khapp-people-entities/SKILL.md) — publisher cascade, reference-by-ID
- [khapp-auth-session](../khapp-auth-session/SKILL.md) — login/logout/session cookies

## Commands

```bash
# Run type check to verify actions compile
npm run typecheck

# Run linter
npm run lint

# Quick sanity check for the response shape across all actions
grep -n "return { success:" src/lib/actions.ts
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** add a new domain action to the bottom of `actions.ts` (file is at capacity). Create `src/lib/actions/<domain>.ts` and re-export.
- ❌ **Do not** use `.parse()` — always `.safeParse()`.
- ❌ **Do not** skip the `db` check.
- ❌ **Do not** skip `verifySessionOrThrow()` on a protected action.
- ❌ **Do not** return a response without the `success: boolean` field.
- ❌ **Do not** return only `message` on validation failure — also return `errors: error.flatten().fieldErrors` so the form can highlight fields.
- ❌ **Do not** skip `revalidatePath()` — the UI will go stale.
- ❌ **Do not** write `await verifySession(cookie)` inline — use the `verifySessionOrThrow` chokepoint.
- ❌ **Do not** add console.log debug noise to production actions. Use the catch block to return the error.
- ❌ **Do not** add custom HTTP status logic — Server Actions don't return HTTP responses, they return the `ActionResult` shape.
