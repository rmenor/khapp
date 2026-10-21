import { describe, expect, it } from 'vitest';
import { parseAmount } from '@/lib/finance/normalize/amount';

describe('parseAmount', () => {
  it('interpreta la coma decimal', () => {
    expect(parseAmount('220,00')).toBe(220);
    expect(parseAmount('3376,55')).toBe(3376.55);
    expect(parseAmount('5,00')).toBe(5);
  });

  it('interpreta el punto como millares cuando hay coma decimal', () => {
    expect(parseAmount('1.234,56')).toBe(1234.56);
    expect(parseAmount('12.000,00')).toBe(12000);
  });

  it('acepta importes sin decimales', () => {
    expect(parseAmount('220')).toBe(220);
  });

  it('acepta espacios y signos', () => {
    expect(parseAmount(' 220,00 ')).toBe(220);
    expect(parseAmount('-40,00')).toBe(-40);
  });

  it('devuelve null cuando no es un importe (no inventa cifras)', () => {
    expect(parseAmount('C')).toBeNull();
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('   ')).toBeNull();
    expect(parseAmount('OCTUBRE')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
    expect(parseAmount('12,00 EUR')).toBeNull();
  });

  it('redondea a centimos', () => {
    expect(parseAmount('0,1')).toBe(0.1);
    expect(parseAmount('220,005')).toBe(220.01);
  });
});
