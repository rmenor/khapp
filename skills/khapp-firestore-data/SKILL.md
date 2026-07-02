---
name: khapp-firestore-data
description: >
  Enforces conventions for Firebase Firestore interactions, type mappings between client and database, and atomic operations using writeBatch in KH App.
  Trigger: Modifying src/lib/types.ts, writing Firestore queries, performing batch writes, or working with collections (transactions, requests, resolutions, publishers, groups, privileges, pioneer_talks, special_talks, memorials, congregations).
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## When to Use

- When adding or modifying data models in [types.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).
- When writing queries to Firestore collections.
- When performing multi-document updates or atomic batch operations (such as resolving state changes across multiple items).
- When exporting or restoring data via the JSON backup/restore flow.
- When touching the [docs/data-model.md](file:///Users/ramonmenor/trabajo/github/khapp/docs/data-model.md) reference doc.

## Critical Patterns

### 1. Dual-Type Pattern: Client vs Firestore

Maintain strict separation of:

- **Client types** (using native `Date`) — used in components, dialogs, and any `'use client'` code.
- **Firestore types** (using Firebase `Timestamp`) — used as the immediate shape returned by `getDocs` / `getDoc` / `addDoc` / `updateDoc` payloads, and in the `Restore*Schema` for backup files.

Example: `Transaction` (Client, `date: Date`) vs `FirestoreTransaction` (Firestore, `date: Timestamp`). Reference: [types.ts:11-24](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).

```typescript
// Client model
export type Transaction = {
  id: string;
  type: TransactionType;
  amount: number;
  date: Date;
  description: string;
  category?: IncomeCategory;
  status?: TransactionStatus;
};

// Firestore model
export type FirestoreTransaction = Omit<Transaction, 'id' | 'date'> & {
  date: Timestamp;
};
```

The pattern is repeated for `Request`, `Resolution`, `PioneerTalk`, `SpecialTalk`, `Memorial`, `Publisher`, `Group`, `Privilege` — see [types.ts:26-123](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).

**Anti-pattern**: do NOT add a `Date` field to a `Firestore*` type or a `Timestamp` field to a `*` (client) type. The boundary is sacred.

### 2. Explicit Date Conversions

- **Client → Firestore**: Always map native `Date` to Firebase `Timestamp` when writing to the database using `Timestamp.fromDate(new Date(dateString))`. The `dateString` is the ISO string from a form's `<input type="date">`.
- **Firestore → Client**: Convert Firestore `Timestamp` properties to native `Date` **in Client components only** using `data.date.toDate()`.

Reference examples in the codebase:

- Server action writing: [actions.ts:196](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) — `date: Timestamp.fromDate(new Date(date))`
- Client component reading: [requests/page.tsx:24-33](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx) — the `serializeRequest` helper

**Anti-pattern**: do NOT call `toDate()` on the server. Server actions can pass `Timestamp` objects directly to the response; the client component does the conversion.

### 3. Atomic Operations with `writeBatch`

Always use `writeBatch(db)` when creating or modifying multiple documents at once. The two canonical examples in this codebase are:

1. **Branch transfer** ([actions.ts:288-326](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) — updates N income transactions to `Enviado` and creates one new `branch_transfer` doc, all atomically.
2. **Publisher delete cascade** ([actions.ts:925-986](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) — deletes the publisher, scrubs all group references, scrubs all privilege references, all in one batch.

Both follow the same shape:

```typescript
const batch = writeBatch(db);
// ... batch.set / batch.update / batch.delete calls
await batch.commit();
revalidatePath('/<affected-path>');
```

**Anti-pattern**: do NOT split a multi-document mutation into separate `await` calls. If the second one fails, the data is left inconsistent.

### 4. Collection Constants

Keep the database collections structured. The 10 collections in this app are:

| Collection | Document shape | Reference |
|------------|---------------|-----------|
| `transactions` | `FirestoreTransaction` | [actions.ts:193-200](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `requests` | `FirestoreRequest` | [actions.ts:457](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `resolutions` | `FirestoreResolution` | [actions.ts:655](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `pioneer_talks` | `FirestorePioneerTalk` | [actions.ts:727](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `special_talks` | `FirestoreSpecialTalk` | [actions.ts:745](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `memorials` | `FirestoreMemorial` | [actions.ts:763](file:///Users/ramonmenor/github/khapp/src/lib/actions.ts) |
| `publishers` | `FirestorePublisher` | [actions.ts:896](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `groups` | `FirestoreGroup` | [actions.ts:1000](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `privileges` | `FirestorePrivilege` | [actions.ts:1054](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |
| `congregations/main` | `{ name: string }` (single doc) | [actions.ts:620](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) |

**Anti-pattern**: do NOT use collection names that are not in this table without first updating [types.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts), [docs/data-model.md](file:///Users/ramonmenor/trabajo/github/khapp/docs/data-model.md), and the relevant domain skill.

### 5. The JSON Restore Transform

The `Restore*Schema` ([actions.ts:110-120](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) for transactions, and the analogous ones for publishers/groups/privileges at [actions.ts:1119-1175](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) has a **non-obvious transform**:

```typescript
date: z.object({
  seconds: z.number(),
  nanoseconds: z.number(),
}).transform(t => Timestamp.fromMillis(t.seconds * 1000))
```

This exists because the JSON export of a Firestore `Timestamp` serializes to `{seconds, nanoseconds}` (not a full ISO string). The schema accepts that shape and re-hydrates a `Timestamp` from it.

**This is the only thing keeping the restore flow working.** If you change the export format, change this transform in lockstep. If you change this transform, the export side must match.

Reference: [actions.ts:113-116](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 6. Restore Creates NEW Documents

`restoreTransactionsAction` uses `doc(collection(db, 'transactions'))` — a **fresh ref** — it does NOT restore the original IDs. After restore, the docs are duplicates with new IDs, not the same docs back.

**Anti-pattern**: do NOT try to "preserve" the original ID by parsing it from the JSON. The schema strips it (`const { id, ...dataToValidate } = ...`) for a reason. Reference: [actions.ts:404-415](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### 7. References by ID, Not by Name

Groups reference publishers via `superintendentId`, `auxiliaryId`, and `publisherIds: string[]` — all of which are **publisher document IDs**, not names. The UI fetches publisher names by joining client-side.

**Anti-pattern**: do NOT denormalize publisher names into group documents. The publisher name can change; the ID is stable. See [khapp-people-entities](../khapp-people-entities/SKILL.md) for the full cascade rules.

### 8. `Timestamp.now()` vs `Timestamp.fromDate(new Date())`

These are **equivalent for `Timestamp.now()`** and for the current instant. The codebase consistently uses `Timestamp.fromDate(new Date())` rather than `Timestamp.now()`. Either works, but stay consistent — don't introduce `Timestamp.now()` in new code.

### 9. `deleteField()` to Remove a Field, Not `null`

To remove a field (e.g. clearing `endDate` on a reactivated request), use `deleteField()`. See [actions.ts:578](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

**Anti-pattern**: do NOT use `endDate: null`. Firestore treats `null` as a real value, and `where('endDate', '==', null)` queries behave differently than `where('endDate', '==', undefined)`.

### 10. Single-Field Updates vs Full-Document Updates

For most updates, this codebase passes the **full document payload** to `updateDoc`. Firestore merges with existing fields. The one exception is `updateTransactionAction` ([actions.ts:328-370](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) which uses an `Object.keys(...).forEach(... === undefined && delete ...)` cleanup to strip undefined values before the update.

**Anti-pattern**: do NOT pass `undefined` values to `updateDoc` — Firestore will store them as `null` in some cases. Strip them first or build the object with only the keys you want to change.

## Code Examples

### Dual-Type Pattern Definition

```typescript
import { Timestamp } from 'firebase/firestore';

// Client Model
export type Item = {
  id: string;
  name: string;
  date: Date;
};

// Firestore Model
export type FirestoreItem = Omit<Item, 'id' | 'date'> & {
  date: Timestamp;
};
```

Reference: [types.ts:11-24](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).

### Client-Side Date Conversion (in a Page)

```typescript
const serializeRequest = (doc: any): Request => {
  const data = doc.data() as FirestoreRequest;
  return {
    id: doc.id,
    ...data,
    requestDate: (data.requestDate as unknown as Timestamp).toDate(),
    endDate: data.endDate ? (data.endDate as unknown as Timestamp).toDate() : undefined,
    months: data.months || [],
  };
};
```

Reference: [requests/page.tsx:24-33](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx).

### Writing with Batch

```typescript
import { db } from './firebase';
import { doc, collection, writeBatch, Timestamp } from 'firebase/firestore';

export async function processBatchItems(itemIds: string[], targetDate: string) {
  if (!db) throw new Error('Database not available');
  
  const batch = writeBatch(db);
  
  itemIds.forEach((id) => {
    const docRef = doc(db, 'items', id);
    batch.update(docRef, {
      processed: true,
      processedAt: Timestamp.fromDate(new Date(targetDate))
    });
  });
  
  await batch.commit();
}
```

### Restore with Transform

```typescript
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
```

Reference: [actions.ts:110-120](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Removing a Field

```typescript
import { deleteField } from 'firebase/firestore';

await updateDoc(requestRef, { endDate: deleteField() });
```

Reference: [actions.ts:578](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

## Domain-Specific Firestore Reference

This skill covers the **common** Firestore patterns. For domain-specific rules:

- [khapp-finance-domain](../khapp-finance-domain/SKILL.md) — status derivation, branch transfer atomicity
- [khapp-precursor-requests](../khapp-precursor-requests/SKILL.md) — request state machine, endDate semantics
- [khapp-annual-assignments](../khapp-annual-assignments/SKILL.md) — three sibling collections
- [khapp-people-entities](../khapp-people-entities/SKILL.md) — publisher cascade, reference-by-ID

## Commands

```bash
# Verify Firebase configurations or dependencies
npm run typecheck

# Open the Firestore console (manual)
# https://console.firebase.google.com/project/finanzas-jw/firestore
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** put `Date` in a `Firestore*` type or `Timestamp` in a client type.
- ❌ **Do not** call `toDate()` on the server — only in client components.
- ❌ **Do not** split a multi-document mutation into separate `await` calls. Use `writeBatch`.
- ❌ **Do not** use a collection name not in the table above without updating `types.ts`, `data-model.md`, and the relevant domain skill.
- ❌ **Do not** change the `{seconds, nanoseconds}` restore transform without updating the export side in lockstep.
- ❌ **Do not** try to preserve original IDs in a restore. New docs get new IDs.
- ❌ **Do not** denormalize names into reference-bearing documents. Reference by ID.
- ❌ **Do not** use `endDate: null` to "clear" a field. Use `deleteField()`.
- ❌ **Do not** pass `undefined` values to `updateDoc`. Strip them first.
