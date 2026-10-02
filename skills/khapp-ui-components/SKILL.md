---
name: khapp-ui-components
description: >
  Enforces rules for building UI components, shadcn/ui integrations, separating Client/Server components, and handling forms and notifications in KH App.
  Trigger: Modifying files in src/components/ or src/app/, adding/modifying dialogs, or writing UI components.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.2"
---

## When to Use

- When building or styling new user interface views.
- When creating dialog forms or tables under `src/components/`.
- When deciding whether to use `'use client'` or server rendering.
- When adding or modifying forms that submit to a Server Action.
- When showing user feedback (toasts) after a Server Action response.

## Critical Patterns

### 1. Server vs Client Components — The Aspiration vs The Reality

The **aspiration** in this codebase (and what the original spec says) is:

- **Server Components** (default): pages and layout wrappers in `src/app/` load data server-side and pass it down.
- **Client Components** (`'use client'`): interactive components, forms, and dialogs in `src/components/`.

The **reality** (as of 2026-06-24): every page in `src/app/(app)/` is currently `'use client'`, including the layouts. This is **deliberate drift** for the live-refresh pattern — pages fetch directly from Firestore and bump a `refreshKey` state to reload after mutations. Reverting to Server Components would break the live UI.

**For new pages, follow the existing pattern**: mark them `'use client'` if they need live data refresh. Mark them as Server Components only if you also wire up a revalidation strategy (e.g. `router.refresh()` after Server Actions).

Pages currently using `'use client'`:

- [finance/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/finance/page.tsx)
- [requests/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/requests/page.tsx)
- [groups/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/groups/page.tsx)
- [privileges/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/privileges/page.tsx)
- [publishers/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/publishers/page.tsx)
- [annual-assignments/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/annual-assignments/page.tsx)
- [settings/page.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/settings/page.tsx)
- The root [layout.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/layout.tsx) itself

**Anti-pattern**: do NOT convert a client page to a server page without also reworking the data-fetch and refresh strategy. The current design has the page re-querying on every action via `refreshKey`, which is incompatible with Server Components.

### 2. Naming Conventions

Components follow **kebab-case** file names: `add-transaction-dialog.tsx`, `sidebar.tsx`, `request-actions.tsx`. Match the existing style — see [src/components/](file:///Users/ramonmenor/trabajo/github/khapp/src/components/) for the full list.

**Anti-pattern**: do NOT use `PascalCase.tsx` for the file name even if the component is exported as PascalCase. The Next.js convention in this repo is kebab-case for files.

### 3. Styling: Tailwind 3 + shadcn/ui

Use Tailwind CSS 3 and `shadcn/ui` utility configurations. Refer to [components.json](file:///Users/ramonmenor/trabajo/github/khapp/components.json) for shadcn paths.

- The Tailwind config is at [tailwind.config.ts](file:///Users/ramonmenor/trabajo/github/khapp/tailwind.config.ts).
- shadcn primitives live in [src/components/ui/](file:///Users/ramonmenor/trabajo/github/khapp/src/components/ui/) (35+ components).
- shadcn alias map: `components` → `@/components`, `ui` → `@/components/ui`, `lib` → `@/lib`, `hooks` → `@/hooks`, `utils` → `@/lib/utils`.
- Base color is `neutral`, icon library is `lucide`.

**Anti-pattern**: do NOT add a custom CSS file for things Tailwind utilities or shadcn theme variables can express. See the `cn()` helper at [lib/utils.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/utils.ts).

### 4. Notifications: `useToast` Hook

Use the `useToast` hook from [src/hooks/use-toast.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/hooks/use-toast.ts) for showing status feedback after Server Action results:

```typescript
import { useToast } from '@/hooks/use-toast';

const { toast } = useToast();

if (result.success) {
  toast({ title: 'Éxito', description: result.message });
} else {
  toast({ variant: 'destructive', title: 'Error', description: result.message });
}
```

The hook is set up by [src/components/ui/toaster.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/ui/toaster.tsx), which is mounted in the root [layout.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/app/layout.tsx). You don't need to render `<Toaster />` in every page.

**Anti-pattern**: do NOT use `window.alert`, `console.log`, or `alert()` for user feedback. The `useToast` hook is the only acceptable channel.

### 5. Forms: `react-hook-form` + Zod Resolver

The original spec says: use `react-hook-form` together with `@hookform/resolvers/zod` for client-side form validation.

**The reality**: most dialogs in this codebase do NOT use `react-hook-form`. They use raw `useState` for form fields and call the Server Action directly. This is a drift, but it's the current pattern. Both are acceptable — pick one per dialog and stay consistent within that dialog.

If you use `react-hook-form`:

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const formSchema = z.object({
  name: z.string().min(2),
});
type FormValues = z.infer<typeof formSchema>;

const form = useForm<FormValues>({
  resolver: zodResolver(formSchema),
  defaultValues: { name: '' },
});
```

If you use raw `useState`:

```typescript
const [name, setName] = useState('');
const [loading, setLoading] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setLoading(true);
  const result = await addItemAction({ name });
  setLoading(false);
  if (result.success) { toast({ title: 'Éxito', description: result.message }); setOpen(false); }
  else { toast({ variant: 'destructive', title: 'Error', description: result.message }); }
};
```

### 6. Server Action Call Sites

Every dialog that mutates data calls a Server Action from `src/lib/actions.ts`:

```typescript
import { addCustomItemAction } from '@/lib/actions';

const result = await addCustomItemAction({ name, value });
```

The dialog handles:

1. Loading state (disable submit button, show spinner).
2. Toast on result.
3. Close the dialog on success.
4. Refresh parent state via a callback (e.g. `onActionComplete`).

Reference: [request-actions.tsx:41-64](file:///Users/ramonmenor/trabajo/github/khapp/src/components/request-actions.tsx) — canonical example of this pattern.

### 7. Date Picker: `react-day-picker`

`react-day-picker` is the canonical date picker. It's used in dialogs like [add-pioneer-talk-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-pioneer-talk-dialog.tsx) and [add-transaction-dialog.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/add-transaction-dialog.tsx). The shadcn wrapper is at [src/components/ui/calendar.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/ui/calendar.tsx).

**Anti-pattern**: do NOT introduce a different date picker (e.g. MUI's, native `<input type="date">` for non-trivial dates). Stick with `react-day-picker` to match the design system.

### 8. Multi-Select: `multi-select.tsx`

The shadcn-derived multi-select component at [src/components/ui/multi-select.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/ui/multi-select.tsx) is used for picking multiple publishers (in groups and privileges). Use it instead of building a custom chip-based selector.

### 9. Icons: `lucide-react`

All icons come from `lucide-react`. The icon library is configured in [components.json:20](file:///Users/ramonmenor/trabajo/github/khapp/components.json) — `iconLibrary: lucide`. There is also a custom [src/components/icons.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/icons.tsx) for the app logo (`AppLogo`).

**Anti-pattern**: do NOT import from `react-icons` (it's in deps but is being phased out — see [package.json:52](file:///Users/ramonmenor/trabajo/github/khapp/package.json)). Use `lucide-react` exclusively for new code.

### 10. Charts: `recharts` Wrapped in `charts.tsx`

`recharts` is the chart library. The wrappers at [src/components/charts.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/charts.tsx) provide the typed `ChartContainer`, `ChartTooltip`, `ChartTooltipContent`, etc. Use these wrappers instead of importing `recharts` directly in pages.

Reference: [dashboard-client.tsx](file:///Users/ramonmenor/trabajo/github/khapp/src/components/dashboard-client.tsx) — uses the wrappers.

### 11. Print-Friendly Layouts

The dashboard and requests pages have print rules in the layout (`print:pl-0`, `print:py-0`, `print:hidden` on the header). When you add a new page, decide if it should be printable — if so, mirror the existing pattern.

Reference: [layout.tsx:46-97](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/layout.tsx).

### 12. The `schools/` Folder Is Reserved

There's an empty `src/app/(app)/schools/` directory. It is reserved for a future feature. Don't put unrelated pages there.

## Code Examples

### Interactive Client Dialog Component (raw useState pattern)

```typescript
'use client';

import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { addCustomItemAction } from '@/lib/actions';

export function AddItemDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const result = await addCustomItemAction({
      name: formData.get('name') as string,
      value: Number(formData.get('value')),
    });
    
    setLoading(false);
    if (result.success) {
      toast({ title: 'Éxito', description: result.message });
      setOpen(false);
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Añadir Elemento</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nuevo Elemento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input name="name" className="border p-2 w-full" placeholder="Nombre" required />
          <input name="value" type="number" className="border p-2 w-full" placeholder="Valor" required />
          <Button type="submit" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### Refresh Pattern After Server Action

```typescript
'use client';

import { useState } from 'react';
import { deleteItemAction } from '@/lib/actions';

interface ItemActionsProps {
  item: Item;
  onActionComplete?: () => void;   // ← parent bumps refreshKey
}

export function ItemActions({ item, onActionComplete }: ItemActionsProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    const result = await deleteItemAction({ id: item.id });
    setIsDeleting(false);
    if (result.success) {
      toast({ title: 'Eliminado', description: result.message });
      onActionComplete?.();   // ← triggers parent refresh
    } else {
      toast({ variant: 'destructive', title: 'Error', description: result.message });
    }
  };

  return <Button onClick={handleDelete} disabled={isDeleting}>{isDeleting ? 'Eliminando...' : 'Eliminar'}</Button>;
}
```

## Commands

```bash
# Run Next.js build locally to verify all component boundaries and styling are correct
npm run build

# Type check (catches missing 'use client', wrong Server Action imports, etc.)
npm run typecheck

# Lint
npm run lint

# Add a new shadcn component (if you need one not in src/components/ui/)
# (Requires the shadcn CLI; install with: npx shadcn@latest init --yes)
# (But KH App already has shadcn set up — see components.json)
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** convert client pages to Server Components without reworking the data-fetch and refresh strategy. Live refresh depends on the current pattern.
- ❌ **Do not** use `window.alert` or `console.log` for user feedback. Use `useToast`.
- ❌ **Do not** use `react-icons` for new code. Use `lucide-react`.
- ❌ **Do not** import `recharts` directly in pages. Use the `charts.tsx` wrappers.
- ❌ **Do not** introduce a different date picker. Use `react-day-picker` via the shadcn `Calendar` component.
- ❌ **Do not** use a custom CSS file for things Tailwind or shadcn theme variables can express.
- ❌ **Do not** use `PascalCase.tsx` for the file name. The convention is kebab-case.
- ❌ **Do not** forget to call `onActionComplete?.()` after a successful mutation — the parent page won't refresh otherwise.
