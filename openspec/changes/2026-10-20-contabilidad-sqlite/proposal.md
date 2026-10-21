# Propuesta de Cambio: Contabilidad local con SQLite e importación de informes PDF

## Goal

Sustituir el módulo de finanzas basado en Firestore por una contabilidad local
que importa los informes mensuales de la congregación (S-26 y S-30) en PDF, los
guarda en una base de datos SQLite local y permite consultarlos, filtrarlos y
analizarlos, sin que ningún PDF quede en el disco.

## Scope

### En el alcance (In-Scope)

- **Base de datos**: nueva base SQLite local (`data/contabilidad.db`) con el
  esquema `months`, `transactions`, `transaction_entries`, `summary_lines`,
  `concepts`, `concept_rules`, `accounts`, `imports` y `resolutions`.
- **Importación**: subida por arrastrar y soltar o selector de uno o varios
  PDF, con import en lote desde una carpeta local en modo lectura. Los ficheros
  se procesan en memoria y se descartan.
- **Vista previa**: antes de confirmar se muestran el mes detectado, el número
  de movimientos, los totales, los avisos y una tabla de movimientos editable.
- **Duplicados**: detección por hash del contenido (sha256) y aviso cuando el
  mes ya está importado, con opción de reemplazar o cancelar.
- **Parsers**: extracción de texto con posición (pdf.js) y parsing por líneas y
  por columnas de los formatos S-26 y S-30.
- **Cuadre**: vista que compara el resumen (S-30) con los movimientos (S-26)
  y marca en rojo las diferencias, con tolerancia de 0,01 €.
- **Pantallas**: resumen, importar, movimientos, estadísticas y conceptos.
- **Filtros**: combinables y persistidos en la URL, con totales recalculados
  y exportación a CSV y a PDF.
- **Conceptos**: alta y edición de conceptos y de reglas de asignación.
- **Limpieza**: eliminación del código de finanzas de Firestore y de sus
  diálogos; las resoluciones pasan a SQLite.

### Fuera del alcance (Out-of-Scope)

- OCR: los PDF tienen capa de texto y no se añade reconocimiento óptico.
- Migrar los datos de finanzas que hubiera en Firestore: se empiezan de cero.
- Cambiar los demás dominios (solicitudes, publicadores, grupos, privilegios,
  asignaciones anuales), que siguen en Firestore.
- Multiusuario y sincronización en la nube: la app es local.
- Revisar o modificar el vault de origen: solo se lee.

## Technical Approach

1. **Esquema y acceso**: `src/lib/db/schema.ts` con el DDL en código y
   `src/lib/db/client.ts` con `node:sqlite` (módulo integrado, sin
   dependencias nativas), conexión única en `globalThis` y `PRAGMA
   foreign_keys = ON`.
2. **Extracción**: `src/lib/finance/pdf/extract.ts` usa `unpdf` y divide el
   texto de pdf.js en palabras con posición horizontal, repartiendo el ancho
   del fragmento según el ancho real de cada carácter.
3. **Layout y columnas**: `layout.ts` agrupa por `y` en líneas y por huecos de
   `x` en celdas; `columns.ts` detecta la cabecera del S-26 y define las
   columnas de importe con su dirección (entrada/salida) y su cuenta
   (caja/banco).
4. **Parsers**: `parser/s26.ts` y `parser/s30.ts` construyen los movimientos y
   las líneas de resumen; `normalize/amount.ts` y `normalize/month.ts` se
   encargan de los importes (coma decimal) y del mes (la cabecera del PDF es la
   fuente de verdad).
5. **Importador**: `src/lib/finance/importer.ts` genera la vista previa sin
   efectos (hash, avisos, agrupación por mes) y la escribe en SQLite dentro de
   una transacción.
6. **Rutas**: `POST /api/finance/import/preview`, `POST
   /api/finance/import/confirm`, `POST /api/finance/import/folder` y `GET
   /api/finance/movimientos.csv`. Todas verifican la sesión.
7. **Consultas y cuadre**: `src/lib/db/queries/*` y
   `src/lib/db/reconciliation.ts`.
8. **Interfaz**: `src/app/(app)/finance/*` (resumen, importar, movimientos,
   estadísticas, conceptos) y `src/components/finance/*`.

## Rollback Plan

- Revertir los archivos modificados a su estado inicial en Git.
- Eliminar las carpetas de páginas creadas bajo `src/app/(app)/finance/`.
- Eliminar `src/lib/db/`, `src/lib/finance/`, `src/components/finance/` y
  `src/app/api/finance/`.
- La base de datos es un fichero local: se puede borrar `data/contabilidad.db`
  sin dejar rastro. Los datos de Firestore no se tocan, así que el módulo
  anterior puede restaurarse tal cual.

## Impacted Files / Modules

- `src/lib/db/` (nuevo): `client.ts`, `schema.ts`, `reconciliation.ts`,
  `queries/`.
- `src/lib/finance/` (nuevo): `pdf/`, `parser/`, `normalize/`, `importer.ts`,
  `preview-store.ts`, `actions.ts`, `resolutions-actions.ts`,
  `backup-actions.ts`, `types.ts`.
- `src/components/finance/` (nuevo): `finance-nav.tsx`, `finance-charts.tsx`,
  `finance-filters.tsx`, `movements-table.tsx`, `panel` y `import-*`.
- `src/app/(app)/finance/` (nuevo): `layout.tsx`, `page.tsx`, `importar/`,
  `movimientos/`, `estadisticas/`, `conceptos/`.
- `src/app/api/finance/` (nuevo): `import/{preview,confirm,folder}`,
  `movimientos.csv`.
- `src/lib/actions.ts` (modificación): se eliminan las acciones de finanzas.
- `src/lib/types.ts` (modificación): se eliminan los tipos de transacciones y
  resoluciones de Firestore.
- `src/app/settings/page.tsx` (modificación): la copia de seguridad pasa a
  incluir la contabilidad de SQLite.
- `src/components/` (eliminación): `home-page-content.tsx`,
  `dashboard-client.tsx`, `recent-transactions.tsx`, `add-transaction-dialog.tsx`,
  `edit-transaction-dialog.tsx`, `delete-transaction-dialog.tsx`,
  `manage-resolutions-dialog.tsx`, `charts.tsx`.
- `scripts/` (nuevo): `db-init.ts`, `seed-demo.ts`, `finance-inspect.ts`,
  `finance-report.ts`, `generate-samples.ts`.
- `tests/` (nuevo): `amount`, `s26`, `s30`, `scan`, `importer`,
  `reconciliation`.
- `package.json`, `tsconfig.json`, `eslint.config.mjs`, `.gitignore`,
  `.env.example`, `.nvmrc` (modificación).
- `README.md`, `docs/contabilidad.md` (nuevo y modificación).
