---
name: khapp-people-entities
description: >
  Enforces the people-entity domain in KH App: the publishers/groups/privileges CRUD pattern, the reference-by-ID convention, the publisher-deletion cascade that scrubs all group and privilege references in one batch, and the export/restore soft-delete flow.
  Trigger: Modifying the publishers, groups, or privileges collections, their dialogs, their pages, or any action in src/lib/actions.ts that touches these collections.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding or modifying any action in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (lines 844-1175 cover publishers, groups, and privileges).
- When changing the dialogs:
  - [add-publisher-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-publisher-dialog.tsx)
  - [add-group-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-group-dialog.tsx)
  - [add-privilege-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-privilege-dialog.tsx)
- When modifying any of the three pages:
  - [publishers/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/publishers/page.tsx)
  - [groups/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/groups/page.tsx)
  - [privileges/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/privileges/page.tsx)
- When touching the spec docs at [openspec/specs/groups/spec.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/groups/spec.md) and [openspec/specs/privileges/spec.md](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/privileges/spec.md).

## Critical Patterns

### 1. Three Collections, One Pattern

All three (`publishers`, `groups`, `privileges`) follow the **same CRUD shape**:

| Operation | Publisher | Group | Privilege |
|-----------|-----------|-------|-----------|
| Add | `addPublisherAction` | `addGroupAction` | `addPrivilegeAction` |
| Update | `updatePublisherAction` | `updateGroupAction` | `updatePrivilegeAction` |
| Delete | `deletePublisherAction` | `deleteGroupAction` | `deletePrivilegeAction` |
| Restore | `restorePublishersAction` | `restoreGroupsAction` | `restorePrivilegesAction` |

Reference: [actions.ts:888-1175](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and [types.ts:99-123](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).

### 2. Schemas: `name` is the Only Required Field (for Publisher/Privilege)

`PublisherSchema` ([actions.ts:844-846](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) is just:

```typescript
const PublisherSchema = z.object({
  name: z.string().min(2, { message: 'El nombre debe tener al menos 2 caracteres.' }),
});
```

`PrivilegeSchema` ([actions.ts:871-874](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) is the same plus `publisherIds: z.array(z.string()).default([])`.

`GroupSchema` ([actions.ts:856-861](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) adds two nullable single-references and a member list:

```typescript
const GroupSchema = z.object({
  name: z.string().min(2, { message: 'El nombre del grupo debe tener al menos 2 caracteres.' }),
  superintendentId: z.string().optional().nullable(),
  auxiliaryId: z.string().optional().nullable(),
  publisherIds: z.array(z.string()).default([]),
});
```

**Anti-pattern**: do NOT add `createdAt` or `updatedAt` to these entities. The collection audit is not tracked — and the spec docs explicitly say "el borrado de un grupo NO debe eliminar a los publicadores asociados" (cascade direction matters).

### 3. References Are Always by ID (string), Never by Name

Groups reference publishers via `superintendentId`, `auxiliaryId`, and `publisherIds: string[]` — **all of which are publisher document IDs**, not names. The UI fetches publisher names by joining client-side.

**Anti-pattern**: do not denormalize publisher names into group docs. The publisher name can change; the ID is stable. Keeping the reference as an ID forces the right join at read time.

### 4. The Cascade on Publisher Delete Is the Big Pattern

This is the most important pattern in this domain. `deletePublisherAction` ([actions.ts:925-986](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) **must** be atomic across three collections:

1. Delete the publisher document.
2. Fetch all `groups`, scrub the publisher from `superintendentId`, `auxiliaryId`, and `publisherIds` in any group that references it.
3. Fetch all `privileges`, scrub the publisher from `publisherIds` in any privilege that references it.
4. **All three go in one `writeBatch` and one `commit()`**.

The batch is built up in memory and committed atomically — this is what prevents the system from being left in an inconsistent state where a `superintendentId` points at a non-existent publisher.

**Anti-pattern**: do NOT split this into three separate `await` calls. If step 2 fails, you end up with orphan references. The batch is non-negotiable.

```typescript
const batch = writeBatch(db);

// 1. Delete publisher
batch.delete(doc(db, 'publishers', id));

// 2. Scrub from groups
const groupsSnap = await getDocs(collection(db, 'groups'));
groupsSnap.docs.forEach((groupDoc) => {
  const data = groupDoc.data();
  const isSuper = data.superintendentId === id;
  const isAux = data.auxiliaryId === id;
  const isMember = (data.publisherIds || []).includes(id);

  if (isSuper || isAux || isMember) {
    const updateData: any = {};
    if (isSuper) updateData.superintendentId = null;
    if (isAux) updateData.auxiliaryId = null;
    if (isMember) updateData.publisherIds = data.publisherIds.filter((pid: string) => pid !== id);
    batch.update(doc(db, 'groups', groupDoc.id), updateData);
  }
});

// 3. Scrub from privileges
const privilegesSnap = await getDocs(collection(db, 'privileges'));
privilegesSnap.docs.forEach((privDoc) => {
  const data = privDoc.data();
  if ((data.publisherIds || []).includes(id)) {
    batch.update(doc(db, 'privileges', privDoc.id), {
      publisherIds: data.publisherIds.filter((pid: string) => pid !== id),
    });
  }
});

await batch.commit();
```

### 5. Group/Privilege Deletes Do NOT Cascade to Publishers

The reverse direction is **not** a cascade. Per [specs/groups/spec.md:43](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/groups/spec.md) and [specs/privileges/spec.md:23](file:///Users/ramonmenor/trabajo/github/khapp/openspec/specs/privileges/spec.md):

> El borrado de un grupo NO debe eliminar a los publicadores asociados.
> Esto NO debe borrar a los publicadores asociados de la colección de `publishers`.

`deleteGroupAction` ([actions.ts:1025-1040](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) and `deletePrivilegeAction` ([actions.ts:1079-1100](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)) only `deleteDoc` their own document. Publishers survive.

**Anti-pattern**: do NOT add a cascade the other way. The spec says explicitly not to.

### 6. Multi-Path `revalidatePath` After Publisher Mutations

`addPublisherAction`, `updatePublisherAction`, and `deletePublisherAction` all call `revalidatePath` for `/publishers`, `/groups`, **and** `/privileges` ([actions.ts:897-899](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts)). This is because changes to publishers affect the dropdowns in the groups and privileges forms.

When you add a new "thing that references publishers" (e.g. a future `assignments` collection), add its path to the publisher-mutation `revalidatePath` calls.

### 7. Soft Delete via JSON Backup/Restore

There is no real soft delete. Like transactions, these three entities support export-to-JSON / restore-from-JSON:

- `restorePublishersAction` ([actions.ts:1119-1140](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts))
- `restoreGroupsAction` ([actions.ts:1140-1158](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts))
- `restorePrivilegesAction` ([actions.ts:1159-1175](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts))

Each takes an `unknown[]`, validates each entry with its `Restore*Schema`, and writes them as **new documents** in a single batch. Like the transactions restore, the original IDs are not preserved.

**Anti-pattern**: don't try to "re-create" the old IDs. The new docs will have fresh IDs. If you need to re-establish references between restored groups and restored publishers, you must do a second pass to rewrite the references — this is currently NOT implemented and is a known limitation of the restore flow.

### 8. Page Pattern: Client-Side Data Fetch + Local State

All three pages are `'use client'` and read from Firestore directly via `getDocs` (not server actions). This is consistent with the `/requests` page pattern. Mutations refresh the page state via a `refreshKey` bump in the action callbacks.

## Code Examples

### Add Publisher (with Multi-Path Revalidation)

```typescript
export async function addPublisherAction(data: z.infer<typeof PublisherSchema>) {
  // ... validation, db check
  await addDoc(collection(db, 'publishers'), validatedFields.data);
  revalidatePath('/publishers');
  revalidatePath('/groups');
  revalidatePath('/privileges');
  return { success: true, message: 'Publicador añadido correctamente.' };
}
```

Reference: [actions.ts:888-904](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Delete Publisher with Cascade (the canonical pattern)

See the full example in §4 above. Reference: [actions.ts:925-986](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Add Group

```typescript
const GroupSchema = z.object({
  name: z.string().min(2),
  superintendentId: z.string().optional().nullable(),
  auxiliaryId: z.string().optional().nullable(),
  publisherIds: z.array(z.string()).default([]),
});

export async function addGroupAction(data: z.infer<typeof GroupSchema>) {
  // ... validation, db check
  await addDoc(collection(db, 'groups'), validatedFields.data);
  revalidatePath('/groups');
  return { success: true, message: 'Grupo añadido correctamente.' };
}
```

Reference: [actions.ts:856-861](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) and [actions.ts:992-1006](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

## Commands

```bash
# Type check
npm run typecheck

# Manual smoke test
# 1. Create a publisher "Juan" → appears in /publishers
# 2. Create a group "Grupo Norte" with Juan as superintendent → Juan is referenced
# 3. Delete Juan → both /publishers and /groups refresh; the group now has superintendentId=null
# 4. Verify no orphan references in Firestore console
# 5. Export /groups to JSON, delete them, restore → new group docs created (with new IDs)
npm run dev
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** cascade-delete publishers when a group or privilege is deleted. The spec forbids it.
- ❌ **Do not** split the publisher-delete cascade into separate awaits. It must be one batch.
- ❌ **Do not** store publisher names in group/privilege documents. Reference by ID only.
- ❌ **Do not** add `createdAt` / `updatedAt` to these entities. They are not tracked.
- ❌ **Do not** forget to `revalidatePath('/groups')` and `revalidatePath('/privileges')` after a publisher mutation.
- ❌ **Do not** assume restore preserves IDs. It doesn't — and references between restored entities are broken until you write a second-pass reconciler.
- ❌ **Do not** unify the three schemas into a generic "entity with publisher references" — the cascading behavior differs (publisher→group+privilege, not the reverse).
