# Tareas: Contabilidad local con SQLite e importación de informes PDF

## Fase 1: Modelos y base de datos

- [x] `src/lib/db/schema.ts` — DDL de las 9 tablas con índices y claves foráneas
- [x] `src/lib/db/client.ts` — conexión `node:sqlite`, `PRAGMA foreign_keys`, singleton en `globalThis`
- [x] `src/lib/finance/types.ts` — tipos del dominio y tipos de parsing
- [x] `src/lib/db/queries/months.ts` — meses, totales y conteo de movimientos
- [x] `src/lib/db/queries/transactions.ts` — filtros, movimientos y totales recalculados
- [x] `src/lib/db/queries/concepts.ts` — conceptos, reglas y resolución de concepto
- [x] `src/lib/db/queries/stats.ts` — agregados mensuales, trimestrales y anuales, media, mediana y reparto
- [x] `src/lib/db/reconciliation.ts` — cuadre S-30 / S-26 y encadenado de saldos

## Fase 2: Lectura de PDF y parsers

- [x] `src/lib/finance/pdf/font-widths.ts` — anchos de Helvetica, Helvetica Bold, Times y Times Bold
- [x] `src/lib/finance/pdf/extract.ts` — extracción de palabras con posición y detección de escaneo
- [x] `src/lib/finance/pdf/layout.ts` — agrupación en líneas y celdas
- [x] `src/lib/finance/pdf/columns.ts` — detección de cabecera, columnas y asignación por posición
- [x] `src/lib/finance/normalize/amount.ts` — importes con coma decimal
- [x] `src/lib/finance/normalize/month.ts` — mes de la cabecera y del nombre del fichero
- [x] `src/lib/finance/parser/detect.ts` — clasificación por contenido y congregación
- [x] `src/lib/finance/parser/s26.ts` — movimientos del S-26
- [x] `src/lib/finance/parser/s30.ts` — resumen del S-30 con niveles de sangría

## Fase 3: Importación

- [x] `src/lib/finance/importer.ts` — vista previa sin efectos, hash sha256, avisos y escritura transaccional
- [x] `src/lib/finance/preview-store.ts` — almacén en memoria de la vista previa con caducidad
- [x] `src/app/api/finance/import/preview/route.ts`
- [x] `src/app/api/finance/import/confirm/route.ts`
- [x] `src/app/api/finance/import/folder/route.ts`
- [x] `src/app/api/finance/movimientos.csv/route.ts`

## Fase 4: Acciones de servidor

- [x] `src/lib/finance/actions.ts` — conceptos, reglas y reaplicación
- [x] `src/lib/finance/resolutions-actions.ts` — resoluciones (desactivar, no borrar)
- [x] `src/lib/finance/backup-actions.ts` — copia de seguridad y restauración

## Fase 5: Interfaz de usuario

- [x] `src/components/finance/finance-nav.tsx` — sub-navegación
- [x] `src/components/finance/period-label.tsx` — periodo activo
- [x] `src/components/finance/finance-charts.tsx` — barras, líneas y reparto
- [x] `src/components/finance/reconciliation-table.tsx` — cuadre con diferencias en rojo
- [x] `src/components/finance/import-dropzone.tsx` — arrastrar y soltar, selector y carpeta
- [x] `src/components/finance/import-preview.tsx` — vista previa editable
- [x] `src/components/finance/import-history.tsx` — historial y fallos
- [x] `src/components/finance/import-client.tsx` — coordinación de la importación
- [x] `src/components/finance/finance-filters.tsx` — filtros combinables en la URL
- [x] `src/components/finance/movements-table.tsx` — tabla y exportaciones
- [x] `src/components/finance/concepts-manager.tsx` — CRUD de conceptos y reglas

## Fase 6: Páginas

- [x] `src/app/(app)/finance/layout.tsx` — layout con sub-navegación
- [x] `src/app/(app)/finance/page.tsx` — resumen
- [x] `src/app/(app)/finance/importar/page.tsx` — importar
- [x] `src/app/(app)/finance/movimientos/page.tsx` — movimientos
- [x] `src/app/(app)/finance/estadisticas/page.tsx` — estadísticas
- [x] `src/app/(app)/finance/conceptos/page.tsx` — conceptos

## Fase 7: Limpieza de Firestore

- [x] `src/lib/actions.ts` — eliminar las acciones de finanzas y sus schemas
- [x] `src/lib/types.ts` — eliminar los tipos de transacciones y resoluciones
- [x] Eliminar `home-page-content.tsx`, `dashboard-client.tsx`, `recent-transactions.tsx`,
      `add-transaction-dialog.tsx`, `edit-transaction-dialog.tsx`,
      `delete-transaction-dialog.tsx`, `manage-resolutions-dialog.tsx` y `charts.tsx`
- [x] `src/app/settings/page.tsx` — la copia de seguridad pasa a usar SQLite

## Fase 8: Herramientas y documentación

- [x] `scripts/db-init.ts`, `scripts/seed-demo.ts`, `scripts/finance-inspect.ts`,
      `scripts/finance-report.ts`, `scripts/generate-samples.ts`
- [x] `package.json` — scripts, `engines` y dependencias (`unpdf`, `vitest`, `tsx`, `eslint`)
- [x] `tsconfig.json` — `allowImportingTsExtensions`
- [x] `eslint.config.mjs` — configuración flat (Next 16 ya no incluye `next lint`)
- [x] `.gitignore` — ignorar la base de datos
- [x] `.env.example` — `CONTABILIDAD_DB_PATH`, `VAULT_INFORMES_PATH`
- [x] `.nvmrc` — versión mínima de Node
- [x] `README.md` y `docs/contabilidad.md`

## Fase 9: Verificación

- [x] `tests/amount.test.ts` — normalización de importes
- [x] `tests/s26.test.ts` — parser del S-26 con el formato real
- [x] `tests/s30.test.ts` — parser del S-30 con el formato real
- [x] `tests/scan.test.ts` — detección de escaneo y de mes
- [x] `tests/importer.test.ts` — importación, duplicados y no escritura en disco
- [x] `tests/reconciliation.test.ts` — cuadre y tolerancia de 0,01 €
- [x] `npm run typecheck`, `npm run lint` y `npm test` en verde
- [ ] Verificación manual con los 17 informes reales del vault
