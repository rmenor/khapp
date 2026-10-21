import type { ImportPreview } from './importer';

/**
 * Almacén en memoria de las vistas previas de importación.
 *
 * La vista previa debe sobrevivir entre la petición de subida y la de
 * confirmación, pero **nada se escribe en disco**: los PDF ya se han
 * descartado y aquí solo queda lo que se ha extraído de ellos.
 *
 * Las entradas caducan a los 30 minutos para que no crezca sin límite.
 */
const TTL_MS = 30 * 60 * 1000;

interface StoredPreview {
  preview: ImportPreview;
  expiresAt: number;
}

const globalForStore = globalThis as unknown as {
  __contabilidadPreviews?: Map<string, StoredPreview>;
};

function store(): Map<string, StoredPreview> {
  if (!globalForStore.__contabilidadPreviews) {
    globalForStore.__contabilidadPreviews = new Map();
  }
  return globalForStore.__contabilidadPreviews;
}

function purgeExpired(): void {
  const now = Date.now();
  for (const [token, entry] of store()) {
    if (entry.expiresAt <= now) store().delete(token);
  }
}

export function savePreview(preview: ImportPreview): void {
  purgeExpired();
  store().set(preview.token, { preview, expiresAt: Date.now() + TTL_MS });
}

export function getPreview(token: string): ImportPreview | null {
  purgeExpired();
  return store().get(token)?.preview ?? null;
}

export function dropPreview(token: string): void {
  store().delete(token);
}
