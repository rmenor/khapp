/**
 * Genera los PDF de ejemplo (S-26 y S-30) en un directorio, para poder
 * probar el importador y el inspector sin tener los informes reales.
 *
 *   npx tsx scripts/generate-samples.ts [directorio]
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildS26Sample, buildS30Sample } from '../tests/fixtures/pdf.ts';

const target = resolve(process.cwd(), process.argv[2] ?? 'data/muestras');

mkdirSync(target, { recursive: true });

writeFileSync(resolve(target, 'S-26-septiembre2026.pdf'), buildS26Sample());
writeFileSync(resolve(target, 'S-30-septiembre2026.pdf'), buildS30Sample());

console.log(`PDF de ejemplo escritos en ${target}`);
