import { describe, expect, it } from 'vitest';
import { extractWords } from '@/lib/finance/pdf/extract';
import { buildScannedPdf } from './fixtures/pdf.ts';
import {
  parseYearMonth,
  parseYearMonthFromFilename,
  quarterOf,
} from '@/lib/finance/normalize/month';

describe('deteccion de escaneo', () => {
  it('detecta un PDF sin capa de texto', async () => {
    const extracted = await extractWords(buildScannedPdf());
    expect(extracted.looksLikeScan).toBe(true);
    expect(extracted.characterCount).toBe(0);
  });

  it('no marca como escaneo un PDF con capa de texto', async () => {
    const { buildS26Sample } = await import('./fixtures/pdf.ts');
    const extracted = await extractWords(buildS26Sample());
    expect(extracted.looksLikeScan).toBe(false);
  });
});

describe('deteccion de mes y año', () => {
  it('lee el mes de la cabecera del PDF', () => {
    expect(parseYearMonth('Gandía - Prado (23051) septiembre de 2026')).toEqual({
      year: 2026,
      month: 9,
    });
  });

  it('lee el mes con distinta capitalización y acentos', () => {
    expect(parseYearMonth('INFORME MENSUAL ... ABRIL DE 2025')).toEqual({
      year: 2025,
      month: 4,
    });
  });

  it('devuelve null si no hay un mes reconocible', () => {
    expect(parseYearMonth('Gandía - Prado (23051)')).toBeNull();
    expect(parseYearMonth('')).toBeNull();
  });

  it('lee el mes del nombre del fichero para poder contrastarlo', () => {
    expect(parseYearMonthFromFilename('25-05-Mayo')).toEqual({ year: 2025, month: 5 });
    expect(parseYearMonthFromFilename('S-26-septiembre2026.pdf')).toEqual({
      year: 2026,
      month: 9,
    });
    expect(parseYearMonthFromFilename('Estado de cuentas - 08-2026.pdf')).toEqual({
      year: 2026,
      month: 8,
    });
  });

  it('devuelve null si el nombre del fichero no indica un mes', () => {
    expect(parseYearMonthFromFilename('documento.pdf')).toBeNull();
  });

  it('calcula el trimestre', () => {
    expect(quarterOf(1)).toBe(1);
    expect(quarterOf(3)).toBe(1);
    expect(quarterOf(4)).toBe(2);
    expect(quarterOf(9)).toBe(3);
    expect(quarterOf(12)).toBe(4);
  });
});
