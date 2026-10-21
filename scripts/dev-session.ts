/**
 * Genera una cookie de sesión válida para las comprobaciones locales.
 *
 *   npx tsx scripts/dev-session.ts
 *
 * ⚠️ Es una herramienta de desarrollo local: firma una sesión con el mismo
 * secreto que usa la aplicación. No la uses en un entorno compartido.
 */
import { signSession } from '../src/lib/auth-session.ts';

async function main() {
  const expireTime = String(Date.now() + 1000 * 60 * 60 * 24);
  const token = await signSession(expireTime);
  console.log(token);
}

main();
