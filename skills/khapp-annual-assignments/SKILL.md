---
name: khapp-annual-assignments
description: >
  Enforces the annual assignments domain in KH App: three sibling collections (pioneer_talks, special_talks, memorials) sharing a year+date structure, the discriminated delete pattern, and the per-type update split.
  Trigger: Modifying src/lib/actions.ts annual assignment actions, the /annual-assignments page, or any of the add/edit/delete dialogs for pioneer talks, special talks, or memorials.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding or modifying actions in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (lines 690-838 cover the entire annual assignments workflow).
- When changing the [/annual-assignments page](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/annual-assignments/page.tsx).
- When touching any of the dialogs:
  - [add-pioneer-talk-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-pioneer-talk-dialog.tsx)
  - [add-special-talk-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-special-talk-dialog.tsx)
  - [add-memorial-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-memorial-dialog.tsx)
- When introducing a new kind of "annual assignment" (e.g.Assembly, Convention, Circuit Overseer Visit) — it must follow the same shape.

## Critical Patterns

### 1. The Three Collections

There are **exactly three** annual assignment collections, and they share a common shape:

| Collection | `year` | `date` | Speaker field(s) | Prayer field(s) | Special role |
|------------|--------|--------|------------------|-----------------|--------------|
| `pioneer_talks` | ✅ | ✅ | `speaker1`, `speaker2` | `openingPrayer`, `closingPrayer` | — |
| `special_talks` | ✅ | ✅ | `speaker`, `auxiliarySpeaker` | `closingPrayer` | `president` |
| `memorials` | ✅ | ✅ | `speaker` | `openingPrayer`, `breadPrayer`, `winePrayer` | `president` |

Reference: [types.ts:57-99](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts) and [data-model.md:50-87](file:///Users/ramonmenor/trabajo/github/khapp/docs/data-model.md).

**Anti-pattern**: do NOT unify the three into a single `assignments` collection with a `type` discriminator. The dialogs, types, and validation are intentionally separate — keep them that way for type safety.

### 2. Common Required Fields

All three schemas enforce:

- `year: z.coerce.number()` — auto-coerced from form string
- `date: z.string().min(1)` — accepted as a string (ISO date), then converted to `Timestamp.fromDate(new Date(date))` on write
- All speaker/prayer fields: `z.string().min(1)` — no empty strings, no whitespace-only allowed

Reference: [actions.ts:692-718](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 3. Per-Type Add Actions (No Generic)

There are **three separate add actions**, one per collection. The pattern is identical except for the collection name and the success message:

```typescript
export async function addPioneerTalkAction(data: z.infer<typeof PioneerTalkSchema>) {
  // ... validation, db check
  await addDoc(collection(db, 'pioneer_talks'), { ...rest, date: Timestamp.fromDate(new Date(date)) });
  revalidatePath('/annual-assignments');
  return { success: true, message: 'Discurso con los precursores añadido.' };
}
```

Reference: [actions.ts:720-772](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

**Anti-pattern**: do not introduce a generic `addAnnualAssignmentAction(type, data)` even though the bodies look similar. The schemas' `z.infer` types are different per collection — a generic action would lose type safety on the data argument.

### 4. Per-Type Update Actions (Same Discriminator Logic)

Same goes for updates: there are three separate `update*Action` functions. Each accepts `(id: string, data: <SchemaType>)`. Reference: [actions.ts:774-826](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 5. The ONE Function That IS Generic: Delete

The single exception is `deleteAnnualAssignmentAction` ([actions.ts:828-838](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)):

```typescript
export async function deleteAnnualAssignmentAction(
  id: string,
  type: 'pioneer_talks' | 'special_talks' | 'memorials'
) {
  await deleteDoc(doc(db, type, id));
}
```

The `type` parameter is a **string literal union** that Firestore accepts as a collection name. This is the canonical discriminated-delete pattern in this codebase — replicate it for any new sibling collection that needs a delete (don't write three new functions).

### 6. Update Flow: Spread-Then-Date-Override

Every update action follows the same shape:

```typescript
const { date, ...rest } = validatedFields.data;
await updateDoc(doc(db, 'pioneer_talks', id), {
  ...rest,
  date: Timestamp.fromDate(new Date(date)),
});
```

The destructure-then-spread pattern is the cleanest way to swap the string `date` for a `Timestamp`. **Anti-pattern**: don't try to do this in place with an intermediate variable — it muddies the type.

### 7. No Status, No Audit Trail

Annual assignments have **no status field** (no Pendiente/Aprobado), no `createdBy`, no `updatedAt`. The collections are append-only from the user's perspective. If you need audit history later, add a `createdAt: Timestamp` (read-only, set on add) — don't introduce a generic audit trail framework.

### 8. Year Filter on the Page

The `/annual-assignments` page lets the user filter by year, and the data is sorted by `date` within the year. Year is the only stable filter — month-by-month is not exposed in the UI even though `date` is a `Timestamp` with full resolution.

## Code Examples

### Add a Pioneer Talk

```typescript
const PioneerTalkSchema = z.object({
  year: z.coerce.number(),
  date: z.string().min(1),
  speaker1: z.string().min(1),
  speaker2: z.string().min(1),
  openingPrayer: z.string().min(1),
  closingPrayer: z.string().min(1),
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
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al añadir el discurso.' };
  }
}
```

Reference: [actions.ts:692-736](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Delete (Discriminated by Type)

```typescript
export async function deleteAnnualAssignmentAction(
  id: string,
  type: 'pioneer_talks' | 'special_talks' | 'memorials'
) {
  if (!db) return { success: false, message: 'La base de datos no está disponible.' };
  try {
    await verifySessionOrThrow();
    await deleteDoc(doc(db, type, id));
    revalidatePath('/annual-assignments');
    return { success: true, message: 'Registro eliminado correctamente.' };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al eliminar el registro.' };
  }
}
```

Reference: [actions.ts:828-838](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

## Commands

```bash
# Type check — all three schemas must compile
npm run typecheck

# Manual smoke test
# 1. Add a pioneer talk for year 2026 → appears in /annual-assignments list
# 2. Edit it → updates correctly
# 3. Add a special talk and a memorial → both appear
# 4. Delete one of each → all three are removed cleanly
npm run dev
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** unify the three collections into a single `assignments` collection with a `type` field.
- ❌ **Do not** write a generic `addAnnualAssignmentAction(type, data)` that loses type safety.
- ❌ **Do not** change the `type` parameter of `deleteAnnualAssignmentAction` to `string` — keep it as the literal union.
- ❌ **Do not** add a `status` field to any annual assignment. They are always final.
- ❌ **Do not** introduce a new "annual assignment" collection (e.g. `conventions`) without first deciding whether it should be its own collection or slot into one of the three existing ones.
- ❌ **Do not** change the destructure-then-spread pattern in updates — it's the cleanest way to swap a string date for a `Timestamp`.
