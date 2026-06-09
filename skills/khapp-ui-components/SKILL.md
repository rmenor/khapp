---
name: khapp-ui-components
description: >
  Enforces rules for building UI components, shadcn/ui integrations, separating Client/Server components, and handling forms and notifications in KH App.
  Trigger: Modifying files in src/components/ or src/app/, adding/modifying dialogs, or writing UI components.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When building or styling new user interface views.
- When creating dialog forms or tables under `src/components/`.
- When deciding whether to use `'use client'` or server rendering.

## Critical Patterns

- **Server vs Client Components**:
  - **Server Components**: Keep pages and layout wrappers in `src/app/` as Server Components by default to load data server-side and pass it down.
  - **Client Components**: Mark interactive components, forms, and dialogs in `src/components/` with the `'use client'` directive.
- **Naming Conventions**:
  - Components should follow kebab-case (e.g., `add-transaction-dialog.tsx`, `sidebar.tsx`).
- **Styling**:
  - Use Tailwind CSS 3 and `shadcn/ui` utility configurations. Refer to [components.json](file:///Users/ramonmenor/trabajo/github/khapp/components.json) for shadcn paths.
  - Do not use arbitrary custom style files when Tailwind utilities or Tailwind theme variables can accomplish the design.
- **Notifications**:
  - Use the `useToast` hook for showing status feedback following Server Action results.
- **Forms and Validation**:
  - Use `react-hook-form` together with `@hookform/resolvers/zod` for validating Client-side forms before calling Server Actions.

## Code Examples

### Interactive Client Dialog Component

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

## Commands

```bash
# Run Next.js build locally to verify all component boundaries and styling are correct
npm run build
```
