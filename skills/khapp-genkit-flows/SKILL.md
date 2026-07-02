---
name: khapp-genkit-flows
description: >
  Enforces the Genkit AI flow pattern in KH App: flow location, input/output Zod schemas, dev server wiring, model selection, and integration with Next.js Server Actions.
  Trigger: Creating or modifying files in src/ai/, adding a new Genkit flow, running the genkit dev server, or invoking a flow from a Server Action.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When creating a new file in [src/ai/](file:///Users/ramonmenor/trabajo/github/khapp/src/ai/) (e.g. a new flow).
- When modifying the global Genkit configuration in [src/ai/genkit.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/ai/genkit.ts).
- When wiring a flow into the dev server via [src/ai/dev.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/ai/dev.ts).
- When invoking a flow from a Server Action in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).
- When adding or rotating the model in `genkit.ts`.

## Critical Patterns

### 1. The Three Files of `src/ai/`

The AI integration has **exactly three** top-level files. Keep it that way:

| File | Role | Touch it when... |
|------|------|------------------|
| `src/ai/genkit.ts` | Global `ai` instance: plugins + default model | Adding a new plugin, rotating the model |
| `src/ai/dev.ts` | Dev server entry point — imports flows for side effects | Adding a new flow that should be visible in the Genkit dev UI |
| `src/ai/flows/<name>.ts` | The actual flows | Adding a new flow |

**Anti-pattern**: do NOT scatter `genkit({...})` initialization calls around the codebase. There is **one** `ai` instance, exported from `genkit.ts`, and every flow imports it.

### 2. Current Model: `googleai/gemini-2.5-flash`

The model is hardcoded in [src/ai/genkit.ts:6](file:///Users/ramonmenor/trabajo/github/khapp/src/ai/genkit.ts):

```typescript
export const ai = genkit({
  plugins: [googleAI()],
  model: 'googleai/gemini-2.5-flash',
});
```

The `googleAI()` plugin reads `GOOGLE_API_KEY` from the environment. **Without it, flows will fail at runtime with a credential error.**

Reference: [docs/setup.md:74-75](file:///Users/ramonmenor/trabajo/github/khapp/docs/setup.md) — "Genkit requiere GOOGLE_API_KEY para funciones de IA".

**Anti-pattern**: do not change the model without updating the `GOOGLE_API_KEY` if you switch providers. The current key is for Google AI only.

### 3. Flow Location: `src/ai/flows/<name>.ts`

Every flow lives in its own file under `src/ai/flows/`. The file should:

- Export a single named function (the flow) as default or named export.
- Define an **input schema** and **output schema** using Zod.
- Import `ai` from `@/ai/genkit` (or `../genkit`).
- Use the `ai.defineFlow(...)` pattern.

Sketch:

```typescript
'use server';  // ← Flows are server-side. Mark them.

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const InputSchema = z.object({
  text: z.string().min(1),
});
const OutputSchema = z.object({
  result: z.string(),
});

export const myFlow = ai.defineFlow(
  {
    name: 'myFlow',
    inputSchema: InputSchema,
    outputSchema: OutputSchema,
  },
  async (input) => {
    const { text } = input;
    const { output } = await ai.generate({
      prompt: `Process this: ${text}`,
      output: { schema: OutputSchema },
    });
    return output!;
  }
);
```

### 4. Flow Names Are camelCase

The `name` field in `ai.defineFlow` is a camelCase identifier, not a path. Use names like `'summarizeRequest'`, `'suggestCategory'`, `'generateMonthlyReport'`. Avoid dashes, slashes, or dots.

### 5. Wire Every New Flow into `dev.ts`

[src/ai/dev.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/ai/dev.ts) currently contains only a comment:

```typescript
// Flows will be imported for their side effects in this file.
```

When you add a flow at `src/ai/flows/<name>.ts`, add an import line here:

```typescript
import './flows/<name>';   // ← For its side effects
```

Without this, the flow is invisible in the Genkit dev UI (`npm run genkit:dev` on port 4000).

**Anti-pattern**: do not call the flow from `dev.ts` — just import it. The dev server picks it up via the import side effect.

### 6. Invoke Flows from Server Actions, Not Client Components

Flows are server-side (`'use server'`). The standard call pattern is:

```typescript
// src/lib/actions.ts
'use server';
import { myFlow } from '@/ai/flows/my-flow';

export async function runFlowAction(data: z.infer<typeof InputSchema>) {
  // ... validation
  try {
    const result = await myFlow(data);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error en la IA.' };
  }
}
```

The client component calls the Server Action, never the flow directly.

**Anti-pattern**: do NOT mark the flow file with `'use client'`. It must run on the server (or in a Genkit runtime).

### 7. Output Schema Is Enforced

When you pass `output: { schema: OutputSchema }` to `ai.generate`, the model is **forced** to return JSON that matches the schema. If the model's output doesn't match, Genkit will retry or throw. Always define an output schema — do not return untyped strings.

### 8. The `!` Non-Null Assertion on `output`

You'll see code like `return output!;`. The `!` is safe **only** because `output: { schema: OutputSchema }` is set. Without the output schema, `output` can be `null` and the assertion is a lie.

### 9. Streaming Is Optional

Genkit supports `ai.generateStream()` for streaming flows. If you add a streaming flow, the Server Action must return a `ReadableStream` to the client, and the client must consume it with `useEffect` + a `ReadableStreamDefaultReader`. Don't try to `await` a stream.

### 10. No Flow State in the Browser

Flows do not have direct access to Firestore. If a flow needs data (e.g. a list of transactions to summarize), pass it as input from the calling Server Action. The action fetches from Firestore; the flow only processes the input.

## Code Examples

### Canonical Flow File

```typescript
'use server';

import { z } from 'zod';
import { ai } from '@/ai/genkit';

const SuggestCategoryInputSchema = z.object({
  description: z.string().min(1).max(200),
});

const SuggestCategoryOutputSchema = z.object({
  category: z.enum(['congregation', 'worldwide_work', 'renovation']),
  confidence: z.number().min(0).max(1),
});

export const suggestCategoryFlow = ai.defineFlow(
  {
    name: 'suggestCategory',
    inputSchema: SuggestCategoryInputSchema,
    outputSchema: SuggestCategoryOutputSchema,
  },
  async (input) => {
    const prompt = `Given this transaction description: "${input.description}",
suggest the most likely category for the KH App finance tracker.
Categories: congregation, worldwide_work, renovation.
Return your best guess and a confidence between 0 and 1.`;

    const { output } = await ai.generate({
      prompt,
      output: { schema: SuggestCategoryOutputSchema },
    });
    return output!;
  }
);
```

### Wire the Flow into `dev.ts`

```typescript
// src/ai/dev.ts
import './flows/suggest-category';   // ← side-effect import
```

### Invoke from a Server Action

```typescript
// src/lib/actions.ts
'use server';
import { z } from 'zod';
import { suggestCategoryFlow } from '@/ai/flows/suggest-category';

const SuggestSchema = z.object({ description: z.string().min(1).max(200) });

export async function suggestCategoryAction(data: z.infer<typeof SuggestSchema>) {
  const parsed = SuggestSchema.safeParse(data);
  if (!parsed.success) return { success: false, message: 'Descripción inválida.' };
  try {
    const result = await suggestCategoryFlow(parsed.data);
    return { success: true, data: result };
  } catch (e: any) {
    return { success: false, message: e.message || 'Error al sugerir categoría.' };
  }
}
```

## Commands

```bash
# Required env var (already in env.local at the repo root)
# GOOGLE_API_KEY=<your-key>

# Dev server: Next.js on :3000, Genkit on :4000
npm run dev              # Next.js
npm run genkit:dev       # Genkit dev UI — visit http://localhost:4000
npm run genkit:watch     # Genkit with hot reload on flow changes

# Test a flow in the Genkit UI:
# 1. Open http://localhost:4000
# 2. Find the flow by its `name` (e.g. "suggestCategory")
# 3. Provide sample input matching the inputSchema
# 4. Run and inspect the output JSON

# Type check after adding a flow
npm run typecheck
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** create a new `genkit({...})` instance anywhere other than `src/ai/genkit.ts`. There is one global.
- ❌ **Do not** call a flow from a Client Component. Wrap it in a Server Action.
- ❌ **Do not** add a flow without wiring it into `src/ai/dev.ts` (it will be invisible in the dev UI).
- ❌ **Do not** skip the `output: { schema: OutputSchema }` option in `ai.generate` — untyped output is unsearchable and unsafe to feed to the rest of the app.
- ❌ **Do not** give a flow a name with slashes, dashes, or dots. camelCase only.
- ❌ **Do not** access Firestore from inside a flow. Pass data as input.
- ❌ **Do not** change the model in `genkit.ts` without also updating `GOOGLE_API_KEY` for the new provider.
