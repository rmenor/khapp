# Módulo de contabilidad

Contabilidad local de la congregación: importa los informes mensuales en PDF
(S-26 y S-30), los guarda en una base de datos SQLite local y permite
consultarlos, filtrarlos y analizarlos.

Todo lo que la aplicación muestra procede de los PDF importados. **No se
inventan datos**: si un documento no se puede leer, se avisa; si un importe no
se puede interpretar, se descarta con un aviso; si una cifra no cuadra, se
muestra la diferencia en rojo.

---

## 1. Los documentos de origen

### S-26 — Hoja de cuentas

Es el libro de movimientos del mes: una fila por transacción.

```
FECHA  DESCRIPCIÓN DE LA TRANSACCIÓN  CT  ENTRADA  SALIDA  ENTRADA  SALIDA
03  Congregación                          C   150,00
04  MOISES DEUSA (ALQUILER SEPTIEMBRE EXHIBIDORES)  G  40,00
08  Depósito de las donaciones (cajas)     D  220,00  220,00
10  Obra mundial                          OM   5,00
28  Donación electrónica donate.jw.org     T  267,00
30  Para la sucursal – #459137 (5/10/26)      295,00
```

Códigos CT:

| Código | Significado |
|--------|-------------|
| `C` | Recibido para la congregación |
| `G` | Gasto |
| `D` | Depósito de las donaciones (traspaso caja → banco) |
| `OM` | Obra mundial |
| `T` | Transferencia / donación electrónica |

### S-30 — Informe mensual de las cuentas

Es el resumen del mes: fondos al comienzo, ingresos por concepto,
desembolsos por concepto y fondos al final.

```
Fondos al comienzo del mes                3376,55
INGRESOS
  RECIBIDO PARA LA CONGREGACIÓN
    Donaciones para la congregación (cajas)      425,00
    Total recibido para la congregación          692,00
  Total de ingresos                              787,00
DESEMBOLSOS
  GASTOS DE LA CONGREGACIÓN …
Fondos al final del mes
```

### Documentos que se ignoran

"Estado de cuentas", "Acuse de recibo de donaciones", "TO-62"… No son S-26 ni
S-30, así que se **ignoran sin romper la importación**. La clasificación se
hace **por el contenido del documento**, nunca por el nombre del fichero: hay
meses cuyo nombre no sigue ningún patrón (por ejemplo, `Estado de cuentas -
08-2026.pdf` frente a `Estado de cuentas - 2026-09.pdf`).

---

## 2. El pipeline de importación

```
PDF (bytes en memoria)
  └─ pdf/extract.ts    texto con posición (x, y) de cada palabra
      └─ pdf/layout.ts    agrupación en líneas y celdas
          └─ pdf/columns.ts  detección de la cabecera y de las columnas
              └─ parser/s26.ts, parser/s30.ts   movimientos y resumen
                  └─ importer.ts   vista previa (sin escribir nada)
                      └─ importer.ts   escritura en SQLite (transaccional)
```

### 2.1 Extracción con posición

pdf.js entrega el texto como fragmentos que pueden contener varias palabras y
puede fusionar operaciones de texto contiguas. `extract.ts` divide cada
fragmento en palabras y calcula la posición horizontal de cada una repartiendo
el ancho del fragmento según el ancho real de cada carácter (tablas de
Helvetica, Helvetica Bold, Times y Times Bold en `pdf/font-widths.ts`).

Esta posición es **imprescindible**: es lo que permite distinguir una "entrada
en caja" de una "salida en banco" cuando una fila lleva dos importes.

> pdf.js puede transferir el buffer al worker, lo que deja inutilizable el
> `Uint8Array` del llamante. Por eso se trabaja siempre sobre una copia.

### 2.2 Detección de escaneo

Si el documento tiene menos de 20 caracteres de capa de texto, se considera un
escaneo y se aborta con el aviso **"parece un escaneo, no puedo leerlo"**. No
se extrae ninguna cifra ni se guarda ninguna fila.

### 2.3 Columnas del S-26

La cabecera se detecta por las etiquetas `ENTRADA` / `SALIDA` (a nivel de
palabra, porque en la cabecera real van muy juntas y una celda podría fundir
ambos rótulos).

- **Dirección** (`entrada` / `salida`): sale de la etiqueta.
- **Cuenta** (`caja` / `banco`): sale de la cabecera de grupo `CAJA` / `BANCO`
  si existe; si no, se aplica la convención *primer par = caja, segundo par =
  banco*, y la vista previa deja constancia de que se ha aplicado para que
  pueda revisarse.

Cada importe se asigna a su columna **por su posición horizontal**, nunca por
el orden textual.

### 2.4 Mes y año

El mes se lee de la cabecera del PDF (`"septiembre de 2026"`), que es la fuente
de verdad. El nombre del fichero solo se usa para **avisar** cuando no
coincide.

### 2.5 Importes

Se normalizan con coma decimal y sin símbolo de moneda: `"1.234,56"` → `1234.56`.
Si el texto no es un importe, se devuelve `null`: nunca se inventa una cifra.

---

## 3. La vista previa

Antes de confirmar, se muestra:

- el mes detectado y el número de movimientos,
- los totales del S-30 y la suma de los movimientos del S-26,
- los avisos (escaneo, mes que no coincide, S-26 sin S-30, fila sin importe,
  mes ya importado, hash duplicado),
- la tabla de movimientos, con el concepto de cada uno editable.

La vista previa **no escribe nada**: ni en disco ni en la base de datos. Vive
en memoria en el servidor (con caducidad de 30 minutos) hasta que se confirma.

Al confirmar, todo se escribe en **una única transacción** de SQLite: si algo
falla, no queda nada a medias.

---

## 4. Esquema de la base de datos

`data/contabilidad.db` (SQLite, ruta configurable con `CONTABILIDAD_DB_PATH`).
El DDL está en `src/lib/db/schema.ts`.

| Tabla | Contenido |
|-------|-----------|
| `months` | Un mes importado: año, mes, congregación, saldos y totales del S-30, hash del S-26 |
| `transactions` | Un movimiento: día, descripción, código CT, concepto, cuentas, entrada, salida y el texto original |
| `transaction_entries` | Cada importe por separado, con su cuenta y su sentido |
| `summary_lines` | Las líneas del S-30 con su sección y su nivel de sangría |
| `concepts` | Catálogo de conceptos: nombre, tipo (`income`/`expense`/`transfer`), categoría y código CT |
| `concept_rules` | Reglas de asignación: "texto que contiene" → concepto |
| `accounts` | Cuentas: caja, banco |
| `imports` | Historial: hash, nombre del fichero, fecha, filas, avisos y estado |
| `resolutions` | Resoluciones (acuerdos) de la congregación |

Claves foráneas activas (`PRAGMA foreign_keys = ON`) e índices por `month_id`,
`concept_id` y `ct_code`.

### Los importes nunca se suman a ciegas

Una fila con entrada y salida en cuentas distintas (por ejemplo, el depósito de
las donaciones: 220,00 salen de caja y 220,00 entran en banco) se guarda como
**un movimiento con dos importes**, y cada importe por separado en
`transaction_entries`. La suma ciega de los dos importes daría 440,00 en lugar
de 0,00 y descuadraría el mes.

---

## 5. El cuadre S-30 / S-26

En `src/lib/db/reconciliation.ts`, con tolerancia de **0,01 €**:

| Comprobación | Cálculo |
|--------------|---------|
| Ingresos | `months.income_total` (S-30) frente a la suma de las entradas de los movimientos con concepto de tipo `income` |
| Gastos | `months.expense_total` (S-30) frente a la suma de las salidas de los movimientos con concepto de tipo `expense` |
| Saldo | `opening_balance` + (Σ entradas − Σ salidas de **todos** los movimientos) frente a `closing_balance` |

Los movimientos con concepto de tipo `transfer` (un traspaso entre caja y banco)
**no cuentan como ingreso ni como gasto**, pero sí mueven los fondos, así que
intervienen en el cálculo del saldo.

Además se comprueba que el saldo final de un mes encadena con el saldo inicial
del siguiente.

Cuando algo no cuadra, la diferencia se muestra **en rojo**: es preferible
enseñar el descuadre a ocultarlo.

---

## 6. Conceptos y reglas

Un concepto tiene un tipo:

- `income` — cuenta como ingreso,
- `expense` — cuenta como gasto,
- `transfer` — traspaso entre cuentas: mueve fondos pero no es ingreso ni gasto.

El concepto de un movimiento se resuelve así:

1. por su **código CT** (campo `concepts.ct_code`),
2. si no, por las **reglas de texto**: la primera regla cuyo patrón aparezca en
   la descripción,
3. si no, el movimiento queda **sin clasificar** y se ve así en la interfaz.

Las reglas se pueden cambiar y volver a aplicar a todos los movimientos
importados con el botón **"Reaplicar conceptos a todos los movimientos"**, sin
volver a subir los PDF.

---

## 7. Filtros y exportación

Todos los filtros de la pantalla de movimientos se combinan y **se guardan en la
URL**, de modo que la vista se puede compartir:

| Parámetro | Filtro |
|-----------|--------|
| `year` | Año |
| `mes` | Mes |
| `trimestre` | Trimestre |
| `concepto` | Concepto |
| `ct` | Código CT |
| `cuenta` | Cuenta (caja / banco) |
| `q` | Texto libre en la descripción |
| `min` / `max` | Rango de importe |

Los totales se recalculan con el filtro aplicado y el periodo activo se
muestra siempre en la pantalla.

La exportación a **CSV** usa exactamente los mismos filtros
(`/api/finance/movimientos.csv`). La exportación a **PDF** usa la impresión del
navegador (`window.print()`), con las mismas reglas de estilo que el resto de
la aplicación.

---

## 8. Herramientas de línea de comandos

```bash
# Diagnóstico de un PDF: palabras con posición, líneas, columnas,
# movimientos parseados y avisos. Sirve para calibrar el parser.
npm run finance:inspect -- "ruta/al/informe.pdf"

# Meses importados y ficheros que han fallado, con su motivo.
npm run finance:report

# Volcado de ejemplo con 3 meses sintéticos (sin datos personales).
npm run db:demo
CONTABILIDAD_DB_PATH=data/contabilidad.demo.db npm run dev
```

---

## 9. Privacidad

- Los PDF se procesan **en memoria** y se descartan. No se escribe ninguna
  copia en el disco, ni en `tmp`, ni en el vault, ni se envía a ningún servicio
  externo.
- La carpeta de origen, en el import en lote, se abre **en modo lectura**: no
  se copia, mueve ni borra nada.
- En la tabla `imports` solo se guardan el hash, el nombre del fichero, la
  fecha, el número de filas y los avisos. **Nunca el PDF**.
- No hay telemetría, analítica ni servicios externos.
