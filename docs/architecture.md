# Architecture Overview

## Tech Stack

| Capa | Tecnología | Propósito |
|------|-----------|-----------|
| Framework | Next.js 16 (App Router) | SSR, Server Actions, PWA |
| UI | React 18 + Radix UI | Componentes accesibles |
| Estilos | Tailwind CSS 3 + shadcn/ui | Sistema de diseño |
| Datos | Firebase Firestore | Base de datos NoSQL |
| Validación | Zod + React Hook Form | Formularios tipados |
| IA | Genkit + Google AI | Funciones de IA (pendiente) |
| PWA | next-pwa | Soporte offline |

## Arquitectura de Capas

```
src/
├── app/           # App Router (páginas, layouts, Server Components)
├── components/    # UI Components (Client Components)
├── lib/           # Lógica de negocio
│   ├── actions.ts # Server Actions (mutaciones)
│   ├── firebase.ts# Configuración Firebase
│   ├── types.ts   # Tipos TypeScript compartidos
│   └── utils.ts   # Utilidades
├── ai/            # Genkit flows
└── hooks/         # Custom hooks (cliente)
```

## Patrones Clave

### Server Actions (src/lib/actions.ts)
- Todas las mutaciones usan `'use server'`
- Validación con Zod antes de escribir a Firestore
- `revalidatePath()` para actualizar caché de Next.js
- Manejo de errores con `{ success, message, errors }`

### Tipos Duales (src/lib/types.ts)
```typescript
// Cliente: usa Date nativo
Transaction { date: Date }

// Firestore: usa Timestamp
FirestoreTransaction { date: Timestamp }
```
**Conversión**: `Timestamp.fromDate()` / `toDate()` en los componentes cliente.

### Autenticación (Mock)
- **Actual**: localStorage `isAuthenticated` (mock en `(app)/layout.tsx`)
- **Firebase Auth**: configurado en `src/lib/firebase.ts` pero no usado aún
- `src/lib/auth.ts` reservado para futura integración

### PWA
- Service Worker vía `@ducanh2912/next-pwa`
- Manifest en `public/manifest.json`
- Deshabilitado en desarrollo (`NODE_ENV === 'development'`)
