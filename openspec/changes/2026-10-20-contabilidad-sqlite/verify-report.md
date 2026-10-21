# Informe de Verificación: Contabilidad local con SQLite e importación de informes PDF

## 1. Pruebas Automatizadas

### `npm run typecheck`

```
> kh-app@0.1.0 typecheck
> tsc --noEmit
```

Sin errores.

### `npm run lint`

```
> kh-app@0.1.0 lint
> eslint .
```

Sin errores ni avisos.

> Nota: `next lint` se eliminó en Next 16, así que el script `lint` ahora usa
> ESLint 9 con configuración flat (`eslint.config.mjs`). El script estaba roto
> antes de este cambio.

### `npm test`

```
 Test Files  7 passed (7)
      Tests  50 passed (50)
```

| Fichero | Tests | Qué cubre |
|---------|-------|-----------|
| `tests/amount.test.ts` | 6 | Coma decimal, millares, signos y rechazo de lo que no es un importe |
| `tests/s26.test.ts` | 9 | Formato real del S-26: 6 movimientos, códigos CT, separación entrada/salida por posición |
| `tests/s30.test.ts` | 9 | Formato real del S-30: saldos, totales, secciones y niveles de sangría |
| `tests/scan.test.ts` | 8 | Detección de escaneo y detección de mes (cabecera y nombre de fichero) |
| `tests/importer.test.ts` | 7 | Importación, duplicados por hash, escaneo y no escritura en disco |
| `tests/reconciliation.test.ts` | 5 | Cuadre S-30 / S-26, tolerancia de 0,01 € y traspasos |
| `tests/filters.test.ts` | 6 | Filtros combinables, texto libre sin tildes y recálculo de totales |

### `npm run build`

```
✓ Compiled successfully
Route (app)
├ ƒ /api/finance/import/confirm
├ ƒ /api/finance/import/folder
├ ƒ /api/finance/import/preview
├ ƒ /api/finance/movimientos.csv
├ ƒ /finance
├ ƒ /finance/conceptos
├ ƒ /finance/estadisticas
├ ƒ /finance/importar
├ ƒ /finance/movimientos
```

> El build requiere las variables de Firebase. Sin ellas, la inicialización del
> SDK de Firebase falla al recoger los datos de página (problema previo a este
> cambio, ajeno al módulo de contabilidad).

## 2. Plan de Verificación Manual (Pasos en el Navegador)

Verificado con el servidor de desarrollo y la base de ejemplo
(`CONTABILIDAD_DB_PATH=data/contabilidad.demo.db npm run dev`).

### 2.1 Importación

1. **Subir informes**: en *Finanzas → Importar*, se arrastran el S-26 y el S-30
   de un mes. ✅ Aparece la vista previa con el mes detectado (9/2026), los
   movimientos, los totales y los avisos.
2. **Confirmar**: se pulsa *Confirmar importación*. ✅ Se guardan 1 mes y 6
   movimientos; el histórico muestra el nombre del fichero, la fecha y las
   filas.
3. **Duplicado**: se vuelven a subir los mismos ficheros. ✅ Avisa de que el
   mes ya está importado y de que el hash es idéntico; sin *reemplazar* se
   rechaza con un mensaje claro.
4. **Reemplazar**: se marca la casilla de reemplazo. ✅ Sustituye el mes sin
   duplicar.
5. **Escaneo**: se sube un PDF sin capa de texto. ✅ Avisa *"Parece un escaneo,
   no puedo leerlo: el PDF no tiene capa de texto (es una imagen). No se han
   extraído cifras."* y no guarda ninguna fila.
6. **Carpeta**: se indica la ruta de una carpeta con PDF. ✅ Analiza todos los
   ficheros **sin copiar, mover ni borrar nada** de ella.
7. **Corrección**: se cambia el concepto de un movimiento en la vista previa.
   ✅ Se guarda con el concepto elegido.

### 2.2 No persistencia

8. Tras importar, `data/` contiene solo `contabilidad.db` (y sus ficheros
   `-wal` / `-shm`). ✅ No hay ningún PDF.
9. La tabla `imports` solo tiene `source_hash`, `filename`, `imported_at`,
   `rows`, `warnings`, `doc_type`, `status` y `month_id`. ✅ Nunca el PDF.

### 2.3 Consulta

10. **Resumen** (`/finance`): ✅ muestra los KPIs del mes, el gráfico de barras
    de ingresos y gastos, la línea de evolución del saldo y la tabla de cuadre.
11. **Cuadre**: ✅ con la base de ejemplo muestra *"Todo cuadra"*. Si un mes no
    cuadra, la diferencia aparece en rojo.
12. **Movimientos** (`/finance/movimientos`): ✅ tabla con los 14 movimientos y
    los totales recalculados.
13. **Filtros**: ✅ año, mes, trimestre, concepto, código CT, cuenta, texto
    libre y rango de importe se combinan y se reflejan en la URL. Comprobado
    con `?year=2026&mes=8` (5 filas) y `?q=electronica` (encuentra
    "Donación electrónica" **sin tilde**).
14. **Periodo activo**: ✅ se muestra siempre ("Periodo activo: …").
15. **CSV**: ✅ `GET /api/finance/movimientos.csv` con los mismos filtros
    devuelve exactamente las filas de la vista.
16. **PDF**: ✅ el botón de exportar usa la impresión del navegador con las
    reglas de estilo del resto de la aplicación.
17. **Estadísticas** (`/finance/estadisticas`): ✅ media, mediana, agregados
    mensual/trimestral/anual, comparación con el año anterior y reparto por
    concepto.
18. **Conceptos** (`/finance/conceptos`): ✅ alta, edición y borrado de
    conceptos y reglas; *Reaplicar conceptos* reclasifica los movimientos.

### 2.4 Seguridad

19. Sin sesión, `GET /api/finance/movimientos.csv` devuelve **401**. ✅
20. Sin sesión, `/finance/*` redirige a `/login` (middleware). ✅

## 3. Incidencias encontradas y corregidas

| Incidencia | Causa | Corrección |
|------------|-------|------------|
| Los acentos salían corruptos (`GandÃ-a`) | El PDF usaba WinAnsi y los bytes se escribían en UTF-8 | Se codifica el texto en WinAnsi (`tests/fixtures/pdf.ts`) |
| "ENTRADA" y "SALIDA" se fundían en una celda | La detección de cabeceraworked con celdas, no con palabras | La cabecera se detecta a nivel de palabra (`pdf/columns.ts`) |
| Las posiciones horizontales de las palabras eran erróneas | El avance de caracteres no se acumulaba | Se acumula el avance real de cada carácter (`pdf/extract.ts`) |
| El hash salía vacío al volver a procesar un fichero | pdf.js **transfiere** el buffer y deja inutilizable el `Uint8Array` del llamante | Se trabaja sobre una copia (`pdf/extract.ts`) |
| `/finance/movimientos` devolvía 500 | `node:sqlite` devuelve filas sin prototipo y React no las serializa | `plainRows` / `plainRow` copian las filas (`db/client.ts`) |
| Buscar "electronica" no encontraba "Donación electrónica" | SQLite no normaliza acentos en `LIKE` | Columna `search_text` normalizada + filtro sobre ella |
| El filtro de importe máximo incluía filas con salida 0 | La condición comparaba entrada **o** salida | Se filtra por el importe del movimiento (`CASE WHEN inflow > 0 …`) |

## 4. Verificación pendiente

Queda pendiente, porque requiere los informes reales del vault, que no están
en esta máquina:

- [ ] Importar los 17 meses reales sin errores ni duplicados.
- [ ] Comprobar que el saldo final de cada S-30 coincide con el calculado por
      la app a partir del S-26 y del saldo inicial, con tolerancia de 0,01 €.
- [ ] Calibrar, si fuera necesario, la convención de cuentas (caja/banco) de
      las columnas del S-26 real con `npm run finance:inspect -- <pdf>`.
- [ ] Revisar la clasificación de conceptos con los textos reales y ajustar las
      reglas en *Finanzas → Conceptos*.

Los tests de los tres meses reales (mayo 2025, enero 2026 y septiembre 2026)
quedan prepared en `tests/fixtures/` con sus totales esperados; se activan en
cuanto se dispongan de los ficheros.
