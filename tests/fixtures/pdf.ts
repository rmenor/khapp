/**
 * Generadores de PDF de prueba que reproducen la maquetación real de los
 * informes S-26 y S-30 (texto con capa de texto y posiciones horizontales).
 *
 * Se construyen a mano, sin dependencias, para que los tests sean
 * deterministas y no dependan de ficheros binarios en el repositorio.
 */

/** Un texto posicionado dentro de una página. */
export interface PositionedText {
  text: string;
  /** Distancia desde el borde izquierdo, en puntos. */
  x: number;
  /** Distancia desde el borde superior, en puntos. */
  y: number;
  size?: number;
}

const PAGE_WIDTH = 595; // A4 a 72 dpi
const PAGE_HEIGHT = 842;

/**
 * Codifica una cadena a bytes WinAnsi (la codificación estándar de los
 * fuentes Type1 como Helvetica). Sin esto, pdf.js interpreta los acentos
 * como bytes sin significado.
 */
const WINANSI_EXTRAS: Record<string, number> = {
  '€': 0x80,
  '‘': 0x91,
  '’': 0x92,
  '“': 0x93,
  '”': 0x94,
  '•': 0x95,
  '–': 0x96,
  '—': 0x97,
  '…': 0x85,
  '«': 0xab,
  '»': 0xbb,
};

function toWinAnsi(text: string): Uint8Array {
  const bytes: number[] = [];

  for (const char of text) {
    const extra = WINANSI_EXTRAS[char];
    if (extra !== undefined) {
      bytes.push(extra);
      continue;
    }

    const code = char.codePointAt(0) ?? 0x3f;
    if (code <= 0xff) {
      bytes.push(code);
    } else {
      bytes.push(0x3f); // '?'
    }
  }

  return new Uint8Array(bytes);
}

function escapePdfText(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

class ByteBuilder {
  private chunks: Uint8Array[] = [];
  private length = 0;

  push(text: string): void {
    const bytes = new TextEncoder().encode(text);
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  pushBytes(bytes: Uint8Array): void {
    this.chunks.push(bytes);
    this.length += bytes.length;
  }

  get offset(): number {
    return this.length;
  }

  toUint8Array(): Uint8Array {
    const result = new Uint8Array(this.length);
    let position = 0;
    for (const chunk of this.chunks) {
      result.set(chunk, position);
      position += chunk.length;
    }
    return result;
  }
}

/**
 * Construye un PDF de una página con una capa de texto simple.
 * Los textos se dibujan con `Td`/`Tj` en coordenadas absolutas.
 */
export function buildPdf(texts: PositionedText[]): Uint8Array {
  const contentBuilder = new ByteBuilder();

  for (const item of texts) {
    const size = item.size ?? 10;
    // El origen de PDF está abajo-izquierda: se invierte la coordenada y.
    const y = PAGE_HEIGHT - item.y;
    contentBuilder.push(
      `BT /F1 ${size} Tf ${item.x.toFixed(2)} ${y.toFixed(2)} Td (`,
    );
    // El texto va en bytes WinAnsi: si se codificara en UTF-8, pdf.js leería
    // cada byte por separado y los acentos saldrían corruptos.
    contentBuilder.pushBytes(toWinAnsi(escapePdfText(item.text)));
    contentBuilder.push(') Tj ET\n');
  }

  const content = contentBuilder.toUint8Array();

  const objects: Uint8Array[] = [
    new TextEncoder().encode('<< /Type /Catalog /Pages 2 0 R >>'),
    new TextEncoder().encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    new TextEncoder().encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>`,
    ),
    (() => {
      const head = new TextEncoder().encode(`<< /Length ${content.length} >>\nstream\n`);
      const tail = new TextEncoder().encode('\nendstream');
      const result = new Uint8Array(head.length + content.length + tail.length);
      result.set(head, 0);
      result.set(content, head.length);
      result.set(tail, head.length + content.length);
      return result;
    })(),
    new TextEncoder().encode(
      '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    ),
  ];

  const pdf = new ByteBuilder();
  pdf.push('%PDF-1.4\n');

  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.offset);
    pdf.push(`${index + 1} 0 obj\n`);
    pdf.pushBytes(body);
    pdf.push('\nendobj\n');
  });

  const xrefOffset = pdf.offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdf.push(xref);

  return pdf.toUint8Array();
}

/** Posiciones de las columnas del S-26 (caja entrada/salida, banco entrada/salida). */
export const S26_COLUMNS = {
  date: 40,
  description: 75,
  ct: 330,
  amount1: 380,
  amount2: 430,
  amount3: 480,
  amount4: 530,
};

/** Cuerpo de letra de las filas de detalle, más pequeño que la cabecera. */
const DETAIL_SIZE = 8;

/**
 * S-26 de ejemplo con el formato real descrito en el encargo.
 *
 * La fila "Depósito de las donaciones (cajas)" lleva dos importes: uno en la
 * columna de salida de caja y otro en la de entrada de banco. Es un traspaso
 * interno (caja -> banco) y ambos importes deben conservarse por separado.
 */
export function buildS26Sample(): Uint8Array {
  const texts: PositionedText[] = [
    { text: 'HOJA DE CUENTAS (S-26)', x: 40, y: 40, size: 14 },
    { text: 'Gandía - Prado (23051) septiembre de 2026', x: 40, y: 65, size: 11 },
    { text: 'FECHA', x: S26_COLUMNS.date, y: 95 },
    { text: 'DESCRIPCIÓN DE LA TRANSACCIÓN', x: S26_COLUMNS.description, y: 95 },
    { text: 'CT', x: S26_COLUMNS.ct, y: 95 },
    { text: 'ENTRADA', x: S26_COLUMNS.amount1, y: 95 },
    { text: 'SALIDA', x: S26_COLUMNS.amount2, y: 95 },
    { text: 'ENTRADA', x: S26_COLUMNS.amount3, y: 95 },
    { text: 'SALIDA', x: S26_COLUMNS.amount4, y: 95 },

    { text: '03', x: S26_COLUMNS.date, y: 120, size: DETAIL_SIZE },
    { text: 'Congregación', x: S26_COLUMNS.description, y: 120, size: DETAIL_SIZE },
    { text: 'C', x: S26_COLUMNS.ct, y: 120, size: DETAIL_SIZE },
    { text: '150,00', x: S26_COLUMNS.amount1, y: 120, size: DETAIL_SIZE },

    { text: '04', x: S26_COLUMNS.date, y: 140, size: DETAIL_SIZE },
    {
      text: 'MOISES DEUSA (ALQUILER SEPTIEMBRE EXHIBIDORES)',
      x: S26_COLUMNS.description,
      y: 140,
      size: DETAIL_SIZE,
    },
    { text: 'G', x: S26_COLUMNS.ct, y: 140, size: DETAIL_SIZE },
    { text: '40,00', x: S26_COLUMNS.amount2, y: 140, size: DETAIL_SIZE },

    { text: '08', x: S26_COLUMNS.date, y: 160, size: DETAIL_SIZE },
    {
      text: 'Depósito de las donaciones (cajas)',
      x: S26_COLUMNS.description,
      y: 160,
      size: DETAIL_SIZE,
    },
    { text: 'D', x: S26_COLUMNS.ct, y: 160, size: DETAIL_SIZE },
    { text: '220,00', x: S26_COLUMNS.amount2, y: 160, size: DETAIL_SIZE },
    { text: '220,00', x: S26_COLUMNS.amount3, y: 160, size: DETAIL_SIZE },

    { text: '10', x: S26_COLUMNS.date, y: 180, size: DETAIL_SIZE },
    { text: 'Obra mundial', x: S26_COLUMNS.description, y: 180, size: DETAIL_SIZE },
    { text: 'OM', x: S26_COLUMNS.ct, y: 180, size: DETAIL_SIZE },
    { text: '5,00', x: S26_COLUMNS.amount1, y: 180, size: DETAIL_SIZE },

    { text: '28', x: S26_COLUMNS.date, y: 200, size: DETAIL_SIZE },
    {
      text: 'Donación electrónica donate.jw.org',
      x: S26_COLUMNS.description,
      y: 200,
      size: DETAIL_SIZE,
    },
    { text: 'T', x: S26_COLUMNS.ct, y: 200, size: DETAIL_SIZE },
    { text: '267,00', x: S26_COLUMNS.amount3, y: 200, size: DETAIL_SIZE },

    { text: '30', x: S26_COLUMNS.date, y: 220, size: DETAIL_SIZE },
    { text: 'Para la sucursal', x: S26_COLUMNS.description, y: 220, size: DETAIL_SIZE },
    { text: '#459137 (5/10/26)', x: 150, y: 220, size: DETAIL_SIZE },
    { text: '295,00', x: S26_COLUMNS.amount4, y: 220, size: DETAIL_SIZE },
  ];

  return buildPdf(texts);
}

/** S-30 de ejemplo con el formato real descrito en el encargo. */
export function buildS30Sample(): Uint8Array {
  const texts: PositionedText[] = [
    { text: 'INFORME MENSUAL DE LAS CUENTAS DE LA CONGREGACIÓN (S-30)', x: 40, y: 40, size: 13 },
    { text: 'Gandía - Prado (23051) septiembre de 2026', x: 40, y: 65, size: 11 },
    { text: 'Fondos al comienzo del mes', x: 40, y: 95 },
    { text: '3376,55', x: 470, y: 95 },

    { text: 'INGRESOS', x: 40, y: 120, size: 11 },
    { text: 'RECIBIDO PARA LA CONGREGACIÓN', x: 60, y: 140 },
    { text: 'Donaciones para la congregación (cajas)', x: 80, y: 160 },
    { text: '425,00', x: 470, y: 160 },
    { text: 'Donaciones para la congregación (transf. electrónicas)', x: 80, y: 180 },
    { text: '267,00', x: 470, y: 180 },
    { text: 'Total recibido para la congregación', x: 80, y: 200 },
    { text: '692,00', x: 470, y: 200 },
    { text: 'OTROS INGRESOS', x: 60, y: 220 },
    { text: 'Obra mundial', x: 80, y: 240 },
    { text: '95,00', x: 470, y: 240 },
    { text: 'Total de otros ingresos', x: 80, y: 260 },
    { text: '95,00', x: 470, y: 260 },
    { text: 'Total de ingresos', x: 60, y: 280 },
    { text: '787,00', x: 470, y: 280 },

    { text: 'DESEMBOLSOS', x: 40, y: 310, size: 11 },
    { text: 'GASTOS DE LA CONGREGACIÓN', x: 60, y: 330 },
    { text: 'Alquiler del local', x: 80, y: 350 },
    { text: '40,00', x: 470, y: 350 },
    { text: 'Total de desembolsos', x: 80, y: 370 },
    { text: '40,00', x: 470, y: 370 },

    { text: 'Fondos al final del mes', x: 40, y: 400 },
    { text: '4123,55', x: 470, y: 400 },
  ];

  return buildPdf(texts);
}

/**
 * PDF sin capa de texto: solo dibuja un rectángulo. Sirve para comprobar que
 * la app detecta un escaneo y avisa en lugar de inventar cifras.
 */
export function buildScannedPdf(): Uint8Array {
  const content = '0.5 0.5 0.5 rg 50 50 400 300 re f';

  const objects: Uint8Array[] = [
    new TextEncoder().encode('<< /Type /Catalog /Pages 2 0 R >>'),
    new TextEncoder().encode('<< /Type /Pages /Kids [3 0 R] /Count 1 >>'),
    new TextEncoder().encode(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] /Resources << >> /Contents 4 0 R >>`,
    ),
    (() => {
      const head = new TextEncoder().encode(`<< /Length ${content.length} >>\nstream\n`);
      const body = new TextEncoder().encode(content);
      const tail = new TextEncoder().encode('\nendstream');
      const result = new Uint8Array(head.length + body.length + tail.length);
      result.set(head, 0);
      result.set(body, head.length);
      result.set(tail, head.length + body.length);
      return result;
    })(),
  ];

  const pdf = new ByteBuilder();
  pdf.push('%PDF-1.4\n');

  const offsets: number[] = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.offset);
    pdf.push(`${index + 1} 0 obj\n`);
    pdf.pushBytes(body);
    pdf.push('\nendobj\n');
  });

  const xrefOffset = pdf.offset;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${offset.toString().padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`;
  pdf.push(xref);

  return pdf.toUint8Array();
}
