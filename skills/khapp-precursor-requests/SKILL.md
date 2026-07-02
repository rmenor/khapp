---
name: khapp-precursor-requests
description: >
  Enforces the precursor service request workflow in KH App: continuous vs monthly mode, Zod cross-field validation, status transitions, paralysis and reactivation, and the year/month filtering on the requests page.
  Trigger: Modifying src/lib/actions.ts request actions, the /requests page, AddRequestDialog, RequestActions, or any business rule around pioneer service months/hours/status.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding or modifying request actions in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (lines 122-585 cover the entire request workflow).
- When changing the form fields, validation, or submit logic in [AddRequestDialog](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-request-dialog.tsx).
- When modifying the per-row actions in [RequestActions](file:///Users/ramonmenor/trabajo/github/khapp/src/components/request-actions.tsx) (approve/reject/paralyze/reactivate/delete).
- When changing the year/month/status filters in [/requests page](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx).
- When touching the public form at `/requests/pub` (it shares the same collection but bypasses auth).

## Critical Patterns

### 1. Two Service Modes

A request is either **continuous** or **monthly** — this choice controls which fields are required:

| Mode | `isContinuous` | `months` | `hours` | Stored shape |
|------|---------------|----------|---------|--------------|
| Continuous | `true` | `[]` (force-empty) | _omitted_ | `{ name, isContinuous, requestDate, status, year, months: [] }` |
| Monthly | `false` | non-empty array of month names | `15` or `30` | `{ name, isContinuous, requestDate, status, year, months, hours }` |

The full list of allowed month names is in [requests/page.tsx:35-49](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx) — keep this list in lockstep everywhere it appears. Allowed values: `Enero, Febrero, Marzo, Abril, Mayo, Junio, Julio, Agosto, Septiembre, Octubre, Noviembre, Diciembre`.

### 2. Zod Cross-Field Validation (`.refine`)

The `RequestSchema` ([actions.ts:122-144](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) uses **two `.refine()` blocks** that depend on `isContinuous`. This is the canonical pattern — replicate it for any new conditional required field:

```typescript
const RequestSchema = z.object({
  name: z.string().min(3, { message: 'El nombre es obligatorio y debe tener al menos 3 caracteres.' }),
  year: z.coerce.number({ required_error: 'El año es obligatorio.' }),
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
```

**Anti-pattern**: do NOT add a single `.refine` that returns early; both blocks are needed so the user sees both errors at once if applicable.

### 3. `hours` is a Literal Type

`hours` is **always** `15` or `30`, never anything else. The Zod schema uses `z.coerce.number().optional()` but the UI restricts selection to these two values. If you add a third hour option (e.g. for irregular pioneers), update:

- The Zod schema (`.refine` to allow the new value)
- The form select in [AddRequestDialog](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-request-dialog.tsx)
- The TypeScript type in [types.ts:37](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts) (`hours?: 15 | 30`)

### 4. Status State Machine

`RequestStatus` is `'Pendiente' | 'Aprobado' | 'Rechazado'`. Transitions:

```
(Pendiente) ─approve─▶ Aprobado
(Pendiente) ─reject──▶ Rechazado
(Aprobado)  ─delete──▶ (gone)
```

- A new request always starts as `'Pendiente'` ([actions.ts:446](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)).
- `updateRequestStatusAction` only accepts `Aprobado` or `Rechazado` ([actions.ts:147-152](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)). It cannot move back to `Pendiente`.
- After approval, a continuous request can be `paralyzeRequestAction`'d (sets `endDate`).
- After paralysis, only `reactivateRequestAction` clears `endDate` (uses `deleteField()`).

### 5. Paralysis Uses `Timestamp.now()` and `deleteField()`

This pair is critical — see [actions.ts:552](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and [actions.ts:578](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts):

```typescript
// Paralyze — set endDate to now
await updateDoc(requestRef, { endDate: Timestamp.fromDate(new Date()) });

// Reactivate — remove the endDate field entirely
await updateDoc(requestRef, { endDate: deleteField() });
```

**Anti-pattern**: do not set `endDate: null` to "clear" it. Firestore treats `null` as a real value and queries (`where('endDate', '==', null)`) behave differently than `where('endDate', '==', undefined)`. Use `deleteField()`.

### 6. Year is Always Set

Every request carries a `year: number` ([actions.ts:447](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)). The year is the **canonical filter** for the page; months are just visual. The page defaults to the current year on first load ([requests/page.tsx:80-89](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx)) and lets the user switch.

### 7. The Page Loads Data Client-Side

[/requests page](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx) is marked `'use client'` and reads Firestore directly via `getDocs` — it does NOT use Server Actions for reads. The page is refreshed via the `refreshKey` state, bumped by `onActionComplete` callbacks. This is the **opposite** of the typical Next.js pattern (server component for data, client for interaction), and it's an intentional choice for live refresh after mutations.

**Anti-pattern**: do NOT convert this page to a Server Component without also rewriting the live-refresh mechanism. The current design assumes the page re-queries after every action.

### 8. Public Form Has No Server Action

The public request form lives at `/requests/pub` (excluded from the auth matcher, see [middleware.ts:56](file:///Users/ramonmenor/trabajo/github/khapp/src/middleware.ts)). It posts directly to Firestore via a `addDoc` from the client. **Do not** add a `verifySessionOrThrow()` to that path — it would block public submitters. If you ever move it to a server action, gate it by something other than the session cookie (e.g. a public reCAPTCHA token).

### 9. Spanish-Month Name Mapping

The page uses a **literal Spanish month name** (e.g. `'Enero'`) in `months: string[]`. The mapping `monthNameToNumber` ([requests/page.tsx:50](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx)) converts to 0-indexed for date-fns operations. If you ever internationalize this, refactor the schema first — the array of strings is the storage shape, not just a UI thing.

## Code Examples

### Adding a Request (with mode-aware payload)

```typescript
const requestData: any = {
  name,
  isContinuous,
  requestDate: Timestamp.fromDate(new Date()),
  status: 'Pendiente',
  year,
  months: months || [],
};

if (!isContinuous) {
  requestData.hours = hours;
} else {
  requestData.months = [];   // force-empty for continuous
}

await addDoc(collection(db, 'requests'), requestData);
```

Reference: [actions.ts:440-457](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Paralyze / Reactivate Pair

```typescript
// Paralyze
const requestRef = doc(db, 'requests', id);
await updateDoc(requestRef, { endDate: Timestamp.fromDate(new Date()) });

// Reactivate
await updateDoc(requestRef, { endDate: deleteField() });
```

Reference: [actions.ts:532-585](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Client-Side Status Change

```typescript
const handleStatusChange = async () => {
  if (!actionToConfirm) return;
  setIsUpdating(true);
  const result = await updateRequestStatusAction({ id: request.id, status: actionToConfirm });
  setIsUpdating(false);
  if (result.success) {
    toast({ title: 'Éxito', description: result.message });
    onActionComplete?.();
  } else {
    toast({ variant: 'destructive', title: 'Error', description: result.message });
  }
};
```

Reference: [request-actions.tsx:41-64](file:///Users/ramonmenor/trabajo/github/khapp/src/components/request-actions.tsx).

## Commands

```bash
# Verify all Zod refinements still typecheck
npm run typecheck

# Manual smoke test
# 1. Add a continuous request for "Juan" year=2026 → no months, no hours, status=Pendiente
# 2. Add a monthly request for "María" with months=[Enero,Febrero] hours=15 → status=Pendiente
# 3. Try to add monthly without months or hours → should see two Zod errors
# 4. Approve a continuous request → click "Paralyze" → endDate set
# 5. Reactivate → endDate field removed
npm run dev
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** add a `status` value beyond `Pendiente | Aprobado | Rechazado` without rewriting the page filters and dropdown options.
- ❌ **Do not** make `hours` an arbitrary number. The Pioneer rule is 15h or 30h.
- ❌ **Do not** set `endDate: null` to "clear" paralysis. Use `deleteField()`.
- ❌ **Do not** move the public form (`/requests/pub`) behind a session check.
- ❌ **Do not** change the month-name list in one place (page, schema, public form) without updating the others.
- ❌ **Do not** add a server-side read pattern to the page without preserving the live-refresh flow.
- ❌ **Do not** introduce a `status: 'Pendiente'` → `status: 'Pendiente'` no-op call; the action only accepts `Aprobado` or `Rechazado`.
- ❌ **Do not** hardcode `request.status === 'Aprobado'` inside `continuousRequests`. The global status filter is already applied via `filteredRequests`; re-applying it inside one tab breaks the counter↔list contract (Pendientes count includes continuous requests, but the continuous tab would hide them). Both tabs must respect the same status filter the user picked.
