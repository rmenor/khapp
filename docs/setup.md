# Development Setup

## Prerrequisitos

- Node.js 18+
- Firebase project configurado (`finanzas-jw`)
- npm o pnpm

## Instalación

```bash
git clone <repo>
cd khapp
npm install
```

## Variables de Entorno

La configuración de Firebase está hardcodeada en `src/lib/firebase.ts`:

```typescript
const firebaseConfig = {
  projectId: 'finanzas-jw',
  appId: '1:857727640897:web:5ed8d3d20e9b2452afadc0',
  apiKey: 'AIzaSyBW7N7R4YGnIArQNL_5Onewntgq25RKnVo',
  // ...
};
```

**⚠️ Para producción**: Mover a variables de entorno `.env.local`:

```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

## Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Next.js con Turbopack (default: localhost:3000) |
| `npm run build` | Build de producción |
| `npm run start` | Servir build de producción |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript sin emit |
| `npm run genkit:dev` | Genkit dev server (puerto 4000) |
| `npm run genkit:watch` | Genkit con hot reload |

## Firebase Firestore Rules (Recomendado)

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Desarrollo abierto - CAMBIAR para producción
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

## PWA Testing

```bash
npm run build
npm run start
# Lighthouse → "Progressive Web App" tab
```

## Notas Importantes

1. **Autenticación es mock**: `localStorage.isAuthenticated` — no usar en producción
2. **Genkit requiere GOOGLE_API_KEY** para funciones de IA
3. **PWA**: Service worker solo activo en build (`NODE_ENV !== 'development'`)
4. **Turbopack**: Usado por defecto en `next.config.mjs`
