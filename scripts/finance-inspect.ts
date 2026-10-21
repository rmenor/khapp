/**
 * Diagnóstico de un informe PDF.
 *
 * Vuelca las palabras con su posición, las líneas detectadas, el mapa de
 * columnas y los movimientos parseados. Es la herramienta para calibrar el
 * parser contra los PDF reales sin tener que adivinar.
 *
 *   npm run finance:inspect -- <ruta.pdf> [más rutas...]
 */
import { readFile } from 'node:fs/promises';
import { extractWords } from '../src/lib/finance/pdf/extract.ts';
import { buildLines } from '../src/lib/finance/pdf/layout.ts';
import { findHeader } from '../src/lib/finance/pdf/columns.ts';
import { detectDocType, parseCongregation } from '../src/lib/finance/parser/detect.ts';
import { parseS26 } from '../src/lib/finance/parser/s26.ts';
import { parseS30 } from '../src/lib/finance/parser/s30.ts';
import { parseYearMonth, parseYearMonthFromFilename } from '../src/lib/finance/normalize/month.ts';

async function main() {
  const paths = process.argv.slice(2);

  if (paths.length === 0) {
    console.error('Uso: npm run finance:inspect -- <ruta.pdf> [más rutas...]');
    process.exit(1);
  }

  for (const path of paths) {
    await inspect(path);
  }
}

main();

async function inspect(path: string) {
  console.log(`\n${'='.repeat(78)}\n${path}\n${'='.repeat(78)}`);

  const bytes = new Uint8Array(await readFile(path));
  const extracted = await extractWords(bytes);

  console.log(`Caracteres de la capa de texto: ${extracted.characterCount}`);
  if (extracted.looksLikeScan) {
    console.log('>>> PARECE UN ESCANEO: el PDF no tiene capa de texto. No puedo leerlo.');
    return;
  }

  const lines = buildLines(extracted.pages);

  console.log('\n--- LINEAS DETECTADAS ---');
  for (const [index, line] of lines.entries()) {
    const cells = line.cells
      .map((cell) => `[${cell.x0.toFixed(0)}-${cell.x1.toFixed(0)}]${JSON.stringify(cell.text)}`)
      .join(' ');
    console.log(`${String(index).padStart(3)} y=${line.y.toFixed(1).padStart(6)} ${cells}`);
  }

  const fullText = lines.map((line) => line.text).join('\n');
  const detected = detectDocType(fullText);
  const period = parseYearMonth(fullText);
  const fromName = parseYearMonthFromFilename(path.split('/').pop() ?? path);

  console.log('\n--- DETECCION ---');
  console.log(`Tipo de documento: ${detected.type} (${detected.reason})`);
  console.log(`Congregación: ${parseCongregation(fullText) ?? 'no detectada'}`);
  console.log(`Mes de la cabecera: ${period ? `${period.month}/${period.year}` : 'no detectado'}`);
  console.log(`Mes del nombre del fichero: ${fromName ? `${fromName.month}/${fromName.year}` : 'no detectado'}`);

  if (detected.type === 'S-26') {
    const header = findHeader(lines);
    console.log('\n--- COLUMNAS ---');
    if (!header) {
      console.log('No se ha encontrado la cabecera de la tabla.');
    } else {
      console.log(`Línea de cabecera: ${header.headerLineIndex}`);
      console.log(
        `Cuentas asignadas por convención de pares: ${header.accountFromPairConvention ? 'SÍ (revisar)' : 'no'}`,
      );
      for (const column of header.columns) {
        console.log(
          `  col ${column.index}: ${column.label.padEnd(8)} x=${column.x0.toFixed(0)}-${column.x1.toFixed(0)} -> ${column.account}/${column.direction}`,
        );
      }
    }

    const result = parseS26(lines);
    console.log(`\n--- MOVIMIENTOS (${result.transactions.length}) ---`);
    for (const transaction of result.transactions) {
      console.log(
        `  dia=${String(transaction.day).padStart(2)} ct=${(transaction.ctCode ?? '--').padEnd(2)} ` +
          `in=${String(transaction.inflow).padStart(8)} out=${String(transaction.outflow).padStart(8)} ` +
          `traspaso=${transaction.isTransfer ? 'S' : 'N'} ` +
          `${transaction.accountFrom ?? '-'}->${transaction.accountTo ?? '-'} | ${transaction.description}`,
      );
    }
    if (result.warnings.length > 0) {
      console.log('\n--- AVISOS ---');
      for (const warning of result.warnings) {
        console.log(`  [${warning.level}] ${warning.message}`);
      }
    }
  } else if (detected.type === 'S-30') {
    const result = parseS30(lines);
    console.log('\n--- RESUMEN ---');
    console.log(
      `Fondos al comienzo: ${result.summary.openingBalance} | Total ingresos: ${result.summary.incomeTotal} | ` +
        `Total desembolsos: ${result.summary.expenseTotal} | Fondos al final: ${result.summary.closingBalance}`,
    );
    console.log('\n--- LINEAS DEL RESUMEN ---');
    for (const line of result.summary.lines) {
      console.log(
        `  ${line.section.padEnd(8)} lvl=${line.level} ${line.isTotal ? 'TOTAL' : '     '} ` +
          `${String(line.amount ?? '').padStart(10)} | ${line.label}`,
      );
    }
    if (result.warnings.length > 0) {
      console.log('\n--- AVISOS ---');
      for (const warning of result.warnings) {
        console.log(`  [${warning.level}] ${warning.message}`);
      }
    }
  }
}
