---
name: khapp-pwa-conventions
description: >
  Enforces the PWA conventions in KH App: next-pwa configuration, service worker behavior in dev vs prod, manifest fields, icon sizes, installability, and offline caveats.
  Trigger: Modifying next.config.mjs, the PWA plugin options, public/manifest.json, public/icons/, or debugging install/offline behavior.
license: Apache-2.0
metadata:
  author: gentleman-programming
  version: "1.0"
---

## When to Use

- When modifying [next.config.mjs](file:///Users/ramonmenor/trabajo/github/khapp/next.config.mjs) — the PWA wrapper is set up here.
- When changing the [public/manifest.json](file:///Users/ramonmenor/trabajo/github/khapp/public/manifest.json) (app name, icons, theme color, start URL).
- When adding or replacing PWA icons under [public/icons/](file:///Users/ramonmenor/trabajo/github/khapp/public/).
- When debugging why the install prompt doesn't appear, or why the service worker isn't registering.
- When changing the offline behavior / cache strategy.

## Critical Patterns

### 1. The PWA Wrapper: `withPWA` Wraps the Next Config

[next.config.mjs:2-16](file:///Users/ramonmenor/trabajo/github/khapp/next.config.mjs) wraps the Next config with `withPWA` from `@ducanh2912/next-pwa`:

```javascript
import withPWA from '@ducanh2912/next-pwa';

const nextConfig = { turbopack: {} };

const pwaConfig = withPWA({
  dest: 'public',
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === 'development',
});

export default pwaConfig(nextConfig);
```

This is the **only** place the PWA is configured. Touching it without reading the [next-pwa docs](https://github.com/DuCanhGH/next-pwa) will break the build.

**Anti-pattern**: do NOT move PWA config into `next.config.mjs` as raw webpack tweaks. Use the `withPWA` options object.

### 2. Service Worker Is Disabled in Development

The `disable: process.env.NODE_ENV === 'development'` line is **load-bearing**. It means:

- In `npm run dev`: no service worker, no offline cache, no install prompt.
- In `npm run build` + `npm run start`: full PWA enabled.

This is intentional — a stale service worker during dev will serve old bundles and confuse you. If you need to test PWA behavior, **always run a production build** (`npm run build` then `npm run start`).

**Anti-pattern**: do NOT remove the `disable` line to "make PWA work in dev". You'll end up with a sticky SW that won't go away without a hard reload + DevTools "Unregister" dance.

### 3. Service Worker Output Goes to `public/`

`dest: 'public'` means the generated `sw.js` and `workbox-*.js` are written to the `public/` directory at build time. This is also why `public/` is in `.gitignore`-equivalent territory — you should never commit `sw.js` files; they're regenerated on every build.

**Anti-pattern**: do NOT commit `public/sw.js`, `public/workbox-*.js`, or `public/swe-worker-*.js`. They are build artifacts.

### 4. `skipWaiting: true` Forces Immediate Activation

`skipWaiting: true` means the new service worker activates immediately, bypassing the usual "wait for all clients to close" prompt. This is a UX trade-off:

- ✅ Pro: users get new code on the next page load without a reload prompt.
- ❌ Con: a user mid-action might lose state if the new SW clears caches.

For an internal congregation app, the trade-off favors immediacy. If you add features that depend on persistent offline state (e.g. queued mutations), reconsider this flag.

### 5. `register: true` Auto-Registers the SW

`register: true` injects a registration script. If you build a custom PWA install flow (e.g. an "Install App" button that triggers `BeforeInstallPromptEvent`), you still need this `true` to bootstrap the SW. Set it to `false` only if you plan to manage registration entirely yourself.

### 6. The Manifest Lives in `public/manifest.json`

The manifest is **not** auto-generated; it's a static file you edit by hand. Current shape ([public/manifest.json](file:///Users/ramonmenor/trabajo/github/khapp/public/manifest.json)):

```json
{
  "name": "KH App",
  "short_name": "KH App",
  "description": "Aplicación para la gestión de finanzas de la congregación.",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#008080",
  "icons": [
    { "src": "/icons/icon-192x192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icons/icon-512x512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

When editing the manifest:

- `name` and `short_name` are user-visible. `short_name` is what shows under the home-screen icon. Keep `short_name` ≤ 12 characters.
- `theme_color` must match the CSS variable `--primary` in `globals.css` (currently `#008080` per [docs/blueprint.md:14](file:///Users/ramonmenor/trabajo/github/khapp/docs/blueprint.md) — deep teal).
- `background_color` is the splash screen color — make it match the app's first paint, not the dark-mode background.
- `start_url` should be `/` (or `/dashboard` if you want the app to always open on the dashboard). The current `/` works because `src/app/page.tsx` redirects to `/dashboard`.

### 7. Required Icon Sizes

The manifest references two icon files in `public/icons/`:

- `icon-192x192.png` — used for the install splash and Android home screen.
- `icon-512x512.png` — used for the install splash on higher-density displays and as the source for maskable icons.

**Anti-pattern**: do NOT link to a single SVG (`/icon.svg` exists in `public/` but is not the PWA icon). iOS Safari and the install splash expect PNG. If you change icons, regenerate both sizes — the `sizes` field in the manifest must match the actual file dimensions.

### 8. Icons Path Is `public/icons/`, Not `public/`

The manifest references `/icons/...`, which resolves to `public/icons/...`. There's also a top-level `/icon.svg` (in `public/icon.svg`) used for the **favicon**, not the PWA. Don't conflate them.

### 9. iOS Install Requires Extra Meta Tags

iOS Safari does not honor the manifest's icons for the home-screen icon. You need a `<link rel="apple-touch-icon" ...>` in the root layout, plus `apple-mobile-web-app-capable` and `apple-mobile-web-app-status-bar-style` meta tags. Check `src/app/layout.tsx` if iOS install looks wrong.

**Anti-pattern**: do NOT assume the manifest alone is enough. iOS has its own rules.

### 10. Lighthouse Is the Acceptance Gate

Per [docs/setup.md:64-69](file:///Users/ramonmenor/trabajo/github/khapp/docs/setup.md), the canonical PWA test is:

```bash
npm run build
npm run start
# Open Chrome DevTools → Lighthouse → "Progressive Web App" → Run
```

Lighthouse checks: installability, manifest validity, SW registration, HTTPS, splash screen. Don't ship PWA changes that don't pass this check.

## Code Examples

### Verifying the Service Worker After Build

After `npm run build` + `npm run start`:

1. Open DevTools → Application → Service Workers.
2. Confirm `sw.js` is registered with status "activated and running".
3. Toggle "Offline" in DevTools → Network → reload → the app shell should still load.

### Adding a New Theme Color (matching the brand)

1. Edit `src/app/globals.css` — `--primary` HSL value.
2. Edit [public/manifest.json](file:///Users/ramonmenor/trabajo/github/khapp/public/manifest.json) — `theme_color` to the resolved hex.
3. Re-run `npm run build` to regenerate the SW (it caches the manifest).
4. Verify in Lighthouse.

### Adding a 1024x1024 Icon (iOS App Store readiness)

1. Place `public/icons/icon-1024x1024.png`.
2. Add an entry to the manifest `icons` array.
3. Re-build.

## Commands

```bash
# Build the production bundle (regenerates the service worker)
npm run build

# Serve the production bundle locally
npm run start

# Lighthouse PWA audit (Chrome DevTools → Lighthouse tab → "Progressive Web App")
# Pass criteria:
#   - Installable
#   - PWA Optimized
#   - Service worker registered
#   - Manifest valid

# In Chrome DevTools:
# - Application → Service Workers → check status
# - Application → Manifest → check no errors
# - Network → Offline checkbox → reload → app shell loads

# Clear stale SW during dev
# Application → Service Workers → "Unregister" + "Update on reload"
```

## Anti-Patterns (Read Before Modifying)

- ❌ **Do not** remove `disable: process.env.NODE_ENV === 'development'`. You'll get a sticky SW that fights your dev workflow.
- ❌ **Do not** commit `public/sw.js` or `public/workbox-*.js`. They are build artifacts.
- ❌ **Do not** reference SVG icons in the PWA manifest. iOS won't honor them.
- ❌ **Do not** change `theme_color` without also updating `--primary` in `globals.css`. Mismatch looks broken.
- ❌ **Do not** set `start_url` to anything that requires auth. The user might be on a fresh install.
- ❌ **Do not** add custom webpack config in `next.config.mjs` for the PWA — go through `withPWA` options.
- ❌ **Do not** ship a PWA change that fails Lighthouse's PWA audit.
