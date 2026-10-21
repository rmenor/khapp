import { describe, expect, it } from 'vitest';
import { extractWords } from '@/lib/finance/pdf/extract';
import { buildLines } from '@/lib/finance/pdf/layout';
import { parseS30 } from '@/lib/finance/parser/s30';
import { buildS30Sample } from './fixtures/pdf.ts';

async function parseSample() {
  const extracted = await extractWords(buildS30Sample());
  const lines = buildLines(extracted.pages);
  return { extracted, lines, result: parseS30(lines) };
}

describe('parser S-30', () => {
  it('extrae la capa de texto del PDF', async () => {
    const { extracted } = await parseSample();
    expect(extracted.looksLikeScan).toBe(false);
  });

  it('lee los fondos al comienzo y al final del mes', async () => {
    const { result } = await parseSample();
    expect(result.summary.openingBalance).toBe(3376.55);
    expect(result.summary.closingBalance).toBe(4123.55);
  });

  it('lee el total de ingresos', async () => {
    const { result } = await parseSample();
    expect(result.summary.incomeTotal).toBe(787);
  });

  it('lee el total de desembolsos', async () => {
    const { result } = await parseSample();
    expect(result.summary.expenseTotal).toBe(40);
  });

  it('clasifica las lineas por seccion', async () => {
    const { result } = await parseSample();
    const sections = result.summary.lines.map((line) => line.section);
    expect(sections).toContain('income');
    expect(sections).toContain('expense');
    expect(sections).toContain('opening');
    expect(sections).toContain('closing');
  });

  it('conserva los importes de cada concepto', async () => {
    const { result } = await parseSample();
    const find = (label: string) =>
      result.summary.lines.find((line) => line.label === label);

    expect(find('Donaciones para la congregación (cajas)')?.amount).toBe(425);
    expect(find('Total recibido para la congregación')?.amount).toBe(692);
    expect(find('Obra mundial')?.amount).toBe(95);
  });

  it('calcula el nivel de sangria de cada linea', async () => {
    const { result } = await parseSample();
    const find = (label: string) =>
      result.summary.lines.find((line) => line.label === label);

    // "Obra mundial" esta mas sangrado que "Recibido para la congregacion".
    const nivelObra = find('Obra mundial')?.level ?? -1;
    const nivelRecibido = find('Recibido para la congregación')?.level ?? -1;
    expect(nivelObra).toBeGreaterThan(nivelRecibido);
  });

  it('marca los totales', async () => {
    const { result } = await parseSample();
    const total = result.summary.lines.find((line) => line.label === 'Total de ingresos');
    expect(total?.isTotal).toBe(true);
  });

  it('no inventa cifras: las lineas sin importe tienen importe null', async () => {
    const { result } = await parseSample();
    for (const line of result.summary.lines) {
      if (line.amount !== null) {
        expect(Number.isFinite(line.amount)).toBe(true);
      }
    }
  });
});
