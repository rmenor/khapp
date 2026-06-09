---
name: khapp-firestore-data
description: >
  Enforces conventions for Firebase Firestore interactions, type mappings between client and database, and atomic operations using writeBatch in KH App.
  Trigger: Modifying src/lib/types.ts, writing Firestore queries, performing batch writes, or working with collections (transactions, requests, resolutions).
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding or modifying data models in [types.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/types.ts).
- When writing queries to Firestore collections.
- When performing multi-document updates or atomic batch operations (such as resolving state changes across multiple items).

## Critical Patterns

- **Dual-Type Pattern**: Maintain strict separation of Client-side types (using Native `Date`) and Firestore-side types (using Firebase `Timestamp`).
  - Example: `Transaction` (Client, `date: Date`) vs `FirestoreTransaction` (Firestore, `date: Timestamp`).
- **Explicit Date Conversions**:
  - **Client to Firestore**: Always map native `Date` to Firebase `Timestamp` when writing to the database using `Timestamp.fromDate(new Date(dateString))`.
  - **Firestore to Client**: Convert Firestore `Timestamp` properties to native `Date` within Client components using `data.date.toDate()`.
- **Atomic Operations**:
  - Always use `writeBatch(db)` when creating or modifying multiple documents at once (e.g. bulk transactions, updating status of items and logging the action concurrently).
- **Collection Constants**: Keep database collections structured:
  - `transactions`
  - `requests`
  - `resolutions`
  - `pioneer_talks`
  - `special_talks`
  - `memorials`
  - `congregations/main` (Single Document)

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

## Commands

```bash
# Verify Firebase configurations or dependencies
npm run typecheck
```
