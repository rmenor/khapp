# Agentes y Skills de KH App

Este archivo registra las skills de desarrollo específicas para el proyecto `khapp`. Estas skills definen guías, convenciones y patrones críticos para que el modelo de IA mantenga la calidad y consistencia del código.

## Catálogo de Skills

### Core (transversales a todo el proyecto)

| Skill | Descripción | Archivo de Especificación |
| :--- | :--- | :--- |
| `khapp-server-actions` | Convenciones para Server Actions, validación con Zod, manejo de respuestas, `revalidatePath`, y plan de split del fichero `actions.ts`. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-server-actions/SKILL.md) |
| `khapp-firestore-data` | Patrones de Firestore: tipos duales `Date`/`Timestamp`, conversiones explícitas, `writeBatch`, y el transform `{seconds, nanoseconds}` del restore. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-firestore-data/SKILL.md) |
| `khapp-ui-components` | shadcn/ui, separación server/client, `useToast`, `react-day-picker`, `recharts`, drift conocido de páginas a `'use client'`. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-ui-components/SKILL.md) |
| `khapp-auth-session` | Sistema custom de autenticación: HMAC-SHA256 con Web Crypto, cookie `__session`, middleware matcher, `verifySessionOrThrow`. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-auth-session/SKILL.md) |
| `khapp-openspec-workflow` | Flujo spec-driven: 5 fases (proposal → specs → design → tasks → verify), escenarios Given/When/Then, archive de cambios. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-openspec-workflow/SKILL.md) |
| `khapp-pwa-conventions` | `next-pwa`, service worker deshabilitado en dev, manifest, iconos PNG, validación con Lighthouse. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-pwa-conventions/SKILL.md) |
| `khapp-genkit-flows` | Patrón de flow de Genkit: `src/ai/flows/`, schemas Zod, `dev.ts`, invocación desde Server Actions. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-genkit-flows/SKILL.md) |

### De dominio (específicas de cada bounded context)

| Skill | Descripción | Archivo de Especificación |
| :--- | :--- | :--- |
| `khapp-finance-domain` | Transacciones, derivación de status desde `category`, branch transfer atómico, resoluciones, restore JSON. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-finance-domain/SKILL.md) |
| `khapp-precursor-requests` | Solicitudes de precursoría: continuous vs monthly, refinements Zod, parálisis con `endDate`, reactivación con `deleteField`. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-precursor-requests/SKILL.md) |
| `khapp-annual-assignments` | Tres colecciones hermanas (`pioneer_talks`, `special_talks`, `memorials`), add/update separados, delete discriminado. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-annual-assignments/SKILL.md) |
| `khapp-people-entities` | Publishers, groups, privileges: CRUD, cascada atómica al borrar publicador, referencia por ID, restore JSON. | [SKILL.md](file:///Users/ramonmenor/trabajo/github/khapp/skills/khapp-people-entities/SKILL.md) |

## Orden de Carga Recomendado

Cuando el agente trabaja en una tarea, las skills deben cargarse en este orden:

1. **Primero, una transversal** según el área:
   - Tocando `actions.ts` o un Server Action → `khapp-server-actions`
   - Tocando `types.ts` o queries de Firestore → `khapp-firestore-data`
   - Tocando un componente o página → `khapp-ui-components`
   - Tocando auth/cookies/middleware → `khapp-auth-session`
   - Creando un change de OpenSpec → `khapp-openspec-workflow`
   - Tocando PWA/manifest/next.config.mjs → `khapp-pwa-conventions`
   - Tocando `src/ai/` o invocando un flow → `khapp-genkit-flows`

2. **Después, la de dominio** según la colección afectada:
   - `transactions` o `resolutions` → `khapp-finance-domain`
   - `requests` → `khapp-precursor-requests`
   - `pioneer_talks` / `special_talks` / `memorials` → `khapp-annual-assignments`
   - `publishers` / `groups` / `privileges` → `khapp-people-entities`

3. **Si la tarea cruza varios dominios** (ej. añadir una columna a la tabla de grupos que muestra un campo de publicador), carga las dos skills de dominio afectadas.

## Estado de las Skills

- **Core originales** (`khapp-server-actions`, `khapp-firestore-data`, `khapp-ui-components`): engrosadas en 2026-06-24 con anti-patrones, referencias concretas a `actions.ts` y al drift conocido.
- **Skills nuevas** (8 en total): creadas en 2026-06-24 para cubrir dominios y áreas transversales que no tenían skill.
