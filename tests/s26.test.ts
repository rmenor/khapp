import { describe, expect, it } from 'vitest';
import { extractWords } from '@/lib/finance/pdf/extract';
import { buildLines } from '@/lib/finance/pdf/layout';
import { parseS26 } from '@/lib/finance/parser/s26';
import { buildS26Sample } from './fixtures/pdf.ts';

async function parseSample() {
  const extracted = await extractWords(buildS26Sample());
  const lines = buildLines(extracted.pages);
  return { extracted, lines, result: parseS26(lines) };
}

describe('parser S-26', () => {
  it('extrae la capa de texto del PDF', async () => {
    const { extracted } = await parseSample();
    expect(extracted.looksLikeScan).toBe(false);
    expect(extracted.characterCount).toBeGreaterThan(100);
  });

  it('detecta la cabecera y las cuatro columnas de importes', async () => {
    const { result } = await parseSample();
    expect(result.header).not.toBeNull();
    expect(result.header!.columns).toHaveLength(4);
    expect(result.header!.columns.map((c) => c.direction)).toEqual([
      'entrada',
      'salida',
      'entrada',
      'salida',
    ]);
  });

  it('parsea los 6 movimientos del ejemplo real', async () => {
    const { result } = await parseSample();
    expect(result.transactions).toHaveLength(6);
    expect(result.transactions.map((t) => t.day)).toEqual([3, 4, 8, 10, 28, 30]);
  });

  it('conserva las descripciones', async () => {
    const { result } = await parseSample();
    expect(result.transactions[0].description).toBe('Congregación');
    expect(result.transactions[1].description).toBe(
      'MOISES DEUSA (ALQUILER SEPTIEMBRE EXHIBIDORES)',
    );
    expect(result.transactions[2].description).toBe('Depósito de las donaciones (cajas)');
  });

  it('conserva los codigos CT', async () => {
    const { result } = await parseSample();
    expect(result.transactions.map((t) => t.ctCode)).toEqual([
      'C',
      'G',
      'D',
      'OM',
      'T',
      null,
    ]);
  });

  it('separa los importes de una fila con entrada y salida en cuentas distintas', async () => {
    const { result } = await parseSample();
    const deposito = result.transactions[2];

    // Es un traspaso caja -> banco: salida de caja y entrada de banco.
    expect(deposito.entries).toHaveLength(2);
    expect(deposito.entries[0]).toEqual({ account: 'caja', direction: 'salida', amount: 220 });
    expect(deposito.entries[1]).toEqual({ account: 'banco', direction: 'entrada', amount: 220 });

    // Los dos importes se conservan por separado, no sumados a ciegas.
    expect(deposito.outflow).toBe(220);
    expect(deposito.inflow).toBe(220);
    expect(deposito.isTransfer).toBe(true);
    expect(deposito.accountFrom).toBe('caja');
    expect(deposito.accountTo).toBe('banco');
  });

  it('marca como traspaso solo los movimientos entre cuentas distintas', async () => {
    const { result } = await parseSample();
    // Ingreso simple: no es traspaso.
    expect(result.transactions[0].isTransfer).toBe(false);
    expect(result.transactions[4].isTransfer).toBe(false);
  });

  it('distingue entrada de salida por la posicion de la columna', async () => {
    const { result } = await parseSample();
    // Fila 04: gasto en la columna SALIDA.
    expect(result.transactions[1].inflow).toBe(0);
    expect(result.transactions[1].outflow).toBe(40);
    // Fila 28: donacion electronica en la columna ENTRADA del banco.
    expect(result.transactions[4].inflow).toBe(267);
    expect(result.transactions[4].outflow).toBe(0);
  });

  it('no inventa cifras en filas sin importe', async () => {
    const { result } = await parseSample();
    for (const transaction of result.transactions) {
      expect(Number.isFinite(transaction.inflow)).toBe(true);
      expect(Number.isFinite(transaction.outflow)).toBe(true);
    }
  });
});
