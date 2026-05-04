# Project Structure

## Estructura de Directorios

```
khapp/
├── src/
│   ├── ai/                    # Genkit AI integration
│   │   ├── dev.ts             # Dev server para Genkit
│   │   └── genkit.ts          # Configuración Google AI
│   ├── app/                   # Next.js App Router
│   │   ├── (app)/             # Rutas protegidas (requieren auth)
│   │   │   ├── layout.tsx     # Sidebar + auth check
│   │   │   ├── dashboard/     # Panel principal con gráficas
│   │   │   ├── finance/       # Ingresos, gastos, resoluciones
│   │   │   ├── requests/      # Solicitudes de precursoría
│   │   │   ├── annual-assignments/ # Charlas y conmemoración
│   │   │   └── settings/      # Configuración congregación
│   │   ├── login/             # Página de login (mock)
│   │   ├── requests/pub/      # Formulario público (sin auth)
│   │   ├── layout.tsx         # Root layout (font, toaster)
│   │   ├── page.tsx           # Redirect a /dashboard
│   │   └── globals.css        # Estilos globales + variables shadcn
│   ├── components/            # React Components
│   │   ├── ui/               # shadcn/ui components (30+)
│   │   ├── sidebar.tsx        # Navegación principal
│   │   ├── dashboard-client.tsx
│   │   ├── charts.tsx         # Recharts wrappers
│   │   └── [feature]-dialog.tsx # Diálogos CRUD
│   ├── hooks/
│   │   └── use-toast.ts       # Toast notifications
│   └── lib/
│       ├── actions.ts         # Server Actions (700+ líneas)
│       ├── firebase.ts        # Firebase init
│       ├── types.ts           # Tipos compartidos
│       ├── auth.ts            # Stub para Firebase Auth
│       └── utils.ts           # cn(), formatters
├── public/
│   ├── manifest.json          # PWA manifest
│   └── icon.svg
├── docs/
│   ├── blueprint.md           # Requisitos originales
│   └── [generated docs]
├── next.config.mjs            # Next.js + PWA config
├── tailwind.config.ts         # Extiende tema shadcn
└── package.json
```

## Convenciones

### Nombres de archivo
- Páginas: `page.tsx` (App Router convention)
- Layouts: `layout.tsx`
- Componentes UI: kebab-case (`add-transaction-dialog.tsx`)
- Server Actions: siempre en `src/lib/actions.ts`

### Componentes
- **Server Components**: por defecto en `app/`
- **Client Components**: `'use client'` en `components/`
- **UI**: shadcn/ui generado en `components/ui/`

### Firestore Collections
| Collection | Tipo | Descripción |
|------------|------|-------------|
| `transactions` | Transaction | Ingresos, gastos, envíos |
| `requests` | Request | Solicitudes precursoría |
| `resolutions` | Resolution | Resoluciones de gasto |
| `pioneer_talks` | PioneerTalk | Charlas con precursores |
| `special_talks` | SpecialTalk | Charlas especiales |
| `memorials` | Memorial | Conmemoración |
| `congregations/main` | Doc | Configuración congregación |
