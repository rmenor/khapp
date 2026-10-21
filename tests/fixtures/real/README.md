# Informes reales del vault

En esta carpeta se colocan los PDF reales para que los tests de
`tests/real-months.test.ts` puedan ejecutarse.

## Estructura

```
tests/fixtures/real/
├── 2025-05/          # mayo de 2025
│   ├── S-26-mayo2025.pdf
│   └── S-30-mayo2025.pdf
├── 2026-01/          # enero de 2026
└── 2026-09/          # septiembre de 2026
```

Una carpeta por mes, con el nombre `<año>-<mes>`. El nombre de los ficheros
da igual: la aplicación clasifica los documentos **por su contenido**.

## Totales esperados

Los totales que deben coincidir se declaran en
`tests/fixtures/expected-totals.ts`:

```typescript
export const EXPECTED_TOTALS: Record<string, ExpectedMonth> = {
  '2025-05': { opening: 0, closing: 0, income: 0, expense: 0, rows: 0 },
  '2026-01': { opening: 0, closing: 0, income: 0, expense: 0, rows: 0 },
  '2026-09': { opening: 3376.55, closing: 0, income: 787, expense: 0, rows: 0 },
};
```

Los valores salen de los propios informes: `opening` y `closing` son los
"fondos al comienzo" y "fondos al final" del S-30, `income` y `expense` sus
totales, y `rows` el número de movimientos del S-26.

## Qué comprueba el test

- Que ningún fichero falle al importarse.
- Que los totales guardados coincidan con los esperados.
- Que el número de movimientos sea el esperado.
- Que el **saldo final del S-30 coincida con el calculado** a partir del
  S-26 y del saldo inicial, con tolerancia de 0,01 €.

Si la carpeta de un mes no existe, su test se marca como omitido (`skipped`) y
el resto de la suite sigue en verde.

## Antes de añadirlos

Los informes reales pueden contener descripciones con datos personales de
donantes. Revisa el contenido antes de copiarlo aquí: esta carpeta forma parte
del repositorio.
