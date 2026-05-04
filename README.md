# KH App — Gestión de Finanzas JW

Aplicación Next.js para la gestión de finanzas, solicitudes de precursoría y asignaciones anuales de una congregación.

## Stack

- **Next.js 16** (App Router, Server Actions, Turbopack)
- **React 18** + **TypeScript**
- **Tailwind CSS 3** + **shadcn/ui** (Radix UI)
- **Firebase Firestore** (base de datos)
- **Genkit** + Google AI (funciones IA)
- **PWA** vía `next-pwa`

## Estructura

```
src/
├── app/           # Páginas (App Router)
├── components/    # UI Components
├── lib/           # Server Actions, Firebase, tipos
├── ai/            # Genkit flows
└── hooks/         # Custom hooks
```

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Desarrollo con Turbopack |
| `npm run build` | Build producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript check |
| `npm run genkit:dev` | Genkit dev server |

## Documentación

Ver `docs/` para detalles de arquitectura:
- `docs/architecture.md` — Stack y patrones
- `docs/project-structure.md` — Estructura y convenciones
- `docs/data-model.md` — Modelo de datos Firestore
- `docs/setup.md` — Configuración de desarrollo
- `docs/workflows.md` — Flujos de trabajo

## Estado Actual

- ✅ Gestión de ingresos/gastos (Firestore)
- ✅ Solicitudes de precursoría
- ✅ Resoluciones y envíos a sucursal
- ✅ Asignaciones anuales (charlas, conmemoración)
- ✅ PWA instalable
- ⚠️ Autenticación es mock (`localStorage`) — pendiente Firebase Auth
