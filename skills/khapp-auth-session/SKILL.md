---
name: khapp-auth-session
description: >
  Enforces the HMAC-based session authentication pattern in KH App: cookie format, middleware route protection, login/logout flow, and Web Crypto API usage.
  Trigger: Modifying src/middleware.ts, src/lib/auth-session.ts, login/logout actions, SESSION_SECRET handling, or any auth-related routing in KH App.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When adding, modifying, or debugging the authentication flow in [actions.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) (functions `loginAction`, `logoutAction`, `verifySessionOrThrow`).
- When touching the route protection logic in [middleware.ts](file:///Users/ramonmenor/trabajo/github/khapp/src/middleware.ts).
- When adding new protected routes or exposing a new public route.
- When handling the `__session` cookie from server actions or route handlers.
- When changing the credentials source (`ADMIN_USERNAME`, `ADMIN_PASSWORD`) or `SESSION_SECRET`.

## Critical Patterns

### 1. Session Token Format

The session token is a **plain string** in the format `expireTime.signatureHex`:

```
1719254400000.a3f9c0e8b2d1...  (256 hex chars = SHA-256)
```

- `expireTime` is a base-10 unix epoch in milliseconds.
- `signatureHex` is the lowercase hex-encoded HMAC-SHA256 of `expireTime` using `SESSION_SECRET`.
- **No JWT**. No library. Just `crypto.subtle`.

Reference: [auth-session.ts:18-19](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/auth-session.ts) — return statement in `signSession`.

### 2. Web Crypto API, Not `node:crypto`

Always use the **Web Crypto API** (`crypto.subtle`) so the code works in both Edge Runtime (middleware) and Node Runtime (server actions). Do NOT import from `node:crypto` — it would break the Edge middleware.

```typescript
// ✅ Correct — runs in Edge + Node
const cryptoKey = await crypto.subtle.importKey(
  'raw',
  encoder.encode(SESSION_SECRET),
  { name: 'HMAC', hash: 'SHA-256' },
  false,
  ['sign']
);

// ❌ Wrong — breaks middleware
import { createHmac } from 'node:crypto';
```

### 3. Cookie Configuration

The session cookie `__session` is set in [actions.ts:43-50](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) with these **non-negotiable** attributes:

| Attribute | Value | Reason |
|-----------|-------|--------|
| `httpOnly` | `true` | Blocks XSS exfiltration |
| `sameSite` | `'strict'` | Blocks CSRF on cross-site navigations |
| `secure` | `process.env.NODE_ENV === 'production'` | HTTPS-only in prod, allowed on localhost in dev |
| `maxAge` | `60 * 60 * 24` (24h) | Matches the token's expire window |
| `path` | `'/'` | Available to all routes |

**Anti-pattern**: never relax `httpOnly` or `sameSite: 'strict'` to debug a redirect loop — fix the root cause instead.

### 4. Middleware Matcher

The matcher in [middleware.ts:46-58](file:///Users/ramonmenor/trabajo/github/khapp/src/middleware.ts) excludes these paths from auth:

- `/api`
- `/_next/static`
- `/_next/image`
- `/favicon.ico`
- `/manifest.json`
- `/requests/pub` ← **the public pioneer request form is exempt by name**

If you add a new public route, add it to **both** the matcher exclusion list AND keep it out of `PROTECTED_ROUTES`. The matcher filter alone is not enough because [middleware.ts:23](file:///Users/ramonmenor/trabajo/github/khapp/src/middleware.ts) does `PROTECTED_ROUTES.some(...)` checks.

### 5. `PROTECTED_ROUTES` List

Maintain this list in [middleware.ts:5-13](file:///Users/ramonmenor/trabajo/github/khapp/src/middleware.ts) as the single source of truth:

```typescript
const PROTECTED_ROUTES = [
  '/dashboard',
  '/finance',
  '/annual-assignments',
  '/publishers',
  '/groups',
  '/privileges',
  '/settings',
];
```

When adding a new top-level route, **add it here** AND make sure the new layout in `src/app/(app)/<route>/` doesn't bypass the auth context.

### 6. Session Validation Order

`verifySession()` runs three guards in this order — preserve them:

1. **Empty/short check** — `parts.length !== 2` returns `false` (catches malformed tokens).
2. **Expiry check** — `expireNum < Date.now()` returns `false` (catches expired tokens).
3. **Signature check** — recompute HMAC and compare strings (catches tampered tokens).

**Anti-pattern**: don't reverse the order. If you check signature before expiry, an expired-but-valid token will recompute the same hash and slip through if you forget step 2.

### 7. Credentials Source

`ADMIN_USERNAME` and `ADMIN_PASSWORD` are read from `process.env` in [actions.ts:36-37](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts) with **fallback defaults**:

```typescript
const adminUser = process.env.ADMIN_USERNAME || 'admin_prado';
const adminPass = process.env.ADMIN_PASSWORD || 'LucasMateo1914';
```

**These defaults are dev-only and must be removed before production deploy.** The `env.local` file at the repo root currently has them — if you see them in a production build, the env vars were not injected.

`SESSION_SECRET` has a fallback of `'fallback-secret-for-development-only-1914'` in [auth-session.ts:2](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/auth-session.ts). Same caveat: if prod cookies are signed with the fallback, anyone can forge sessions.

## Code Examples

### Standard Login Server Action

```typescript
'use server';

import { z } from 'zod';
import { cookies } from 'next/headers';
import { signSession } from './auth-session';

const LoginSchema = z.object({
  username: z.string().min(1, { message: 'El usuario es obligatorio.' }),
  password: z.string().min(1, { message: 'La contraseña es obligatoria.' }),
});

export async function loginAction(data: z.infer<typeof LoginSchema>) {
  const validatedFields = LoginSchema.safeParse(data);
  if (!validatedFields.success) {
    return { success: false, message: 'Datos inválidos.' };
  }

  const { username, password } = validatedFields.data;
  const adminUser = process.env.ADMIN_USERNAME || 'admin_prado';
  const adminPass = process.env.ADMIN_PASSWORD || 'LucasMateo1914';

  if (username === adminUser && password === adminPass) {
    const expireTime = String(Date.now() + 1000 * 60 * 60 * 24);
    const sessionToken = await signSession(expireTime);

    const cookieStore = await cookies();
    cookieStore.set('__session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24,
      path: '/',
    });

    return { success: true, message: 'Inicio de sesión correcto.' };
  }

  return { success: false, message: 'Usuario o contraseña incorrectos.' };
}
```

Reference: [actions.ts:24-56](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Standard Logout

```typescript
export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete('__session');
  return { success: true, message: 'Sesión cerrada correctamente.' };
}
```

Reference: [actions.ts:58-62](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Throwing Inside Protected Server Actions

Use `verifySessionOrThrow()` from any server action that should fail closed:

```typescript
export async function deleteTransactionAction(data: z.infer<typeof DeleteTransactionSchema>) {
  await verifySessionOrThrow();   // ← Throws 'No autorizado.' if cookie is missing or invalid
  // ... rest of the action
}
```

Reference: [actions.ts:64-71](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/actions.ts).

### Client-Side Logout Trigger

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { logoutAction } from '@/lib/actions';

export function LogoutButton() {
  const router = useRouter();
  const handleLogout = async () => {
    await logoutAction();
    router.push('/login');
    router.refresh();
  };
  return <button onClick={handleLogout}>Cerrar sesión</button>;
}
```

Reference: [layout.tsx:37-41](file:///Users/ramonmenor/trabajo/github/khapp/src/app/(app)/layout.tsx).

## Commands

```bash
# Type check (catches any breakage in auth-session.ts or actions.ts)
npm run typecheck

# Lint
npm run lint

# Dev server — verify redirect flow manually:
# 1. Visit http://localhost:3000/dashboard while logged out → should redirect to /login
# 2. Log in with admin creds → should land on /dashboard
# 3. Hit /login while logged in → should redirect to /dashboard
npm run dev
```

## Migration Notes

This is a custom session implementation, **not** Firebase Auth. The `src/lib/auth.ts` file is a stub reserved for future Firebase Auth integration ([auth.ts:1-2](file:///Users/ramonmenor/trabajo/github/khapp/src/lib/auth.ts)). If/when Firebase Auth is wired in:

- `loginAction` and `logoutAction` will be replaced (or supplemented) by Firebase's `signInWithEmailAndPassword` / `signOut`.
- The cookie strategy can be replaced with `firebase-admin`'s `createSessionCookie`.
- The `verifySessionOrThrow` pattern should remain as the single chokepoint for protected actions — replace the body, keep the call sites.
- `PROTECTED_ROUTES` stays as the single source of truth for the middleware.
