import { getDocumentProxy } from 'unpdf';
import { charWidth } from './font-widths';

/** Una palabra con su posición en el espacio de la página (origen abajo-izquierda). */
export interface Word {
  str: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageText {
  pageNumber: number;
  words: Word[];
}

export interface ExtractedPdf {
  pages: PageText[];
  /** Caracteres totales de la capa de texto. */
  characterCount: number;
  /** El documento no tiene capa de texto utilizable: parece un escaneo. */
  looksLikeScan: boolean;
}

/**
 * Un documento con menos de este número de caracteres se considera escaneado.
 * Un S-26 real tiene cientos de caracteres; un PDF escaneado no expone ninguno.
 */
const MIN_TEXT_CHARACTERS = 20;

/**
 * pdf.js entrega el texto como fragmentos (runs) que pueden contener varias
 * palabras, y puede fusionar operaciones de texto contiguas. Aquí cada run se
 * divide en palabras y a cada una se le calcula su posición horizontal
 * repartiendo el ancho del fragmento según el ancho real de cada carácter.
 *
 * Es lo que permite asignar cada importe a su columna: sin esta separación no
 * se puede distinguir una "entrada en caja" de una "salida en banco" en una
 * fila con dos importes.
 */
export async function extractWords(bytes: Uint8Array): Promise<ExtractedPdf> {
  // pdf.js puede "transferir" el buffer al worker, lo que deja el Uint8Array
  // del llamante inutilizable. Se trabaja sobre una copia para que quien
  // llama pueda volver a usar los mismos bytes (por ejemplo, para calcular
  // el hash después de analizar el documento).
  const document = await getDocumentProxy(bytes.slice());
  const pages: PageText[] = [];

  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
    const page = await document.getPage(pageNumber);
    const content = await page.getTextContent();

    const words: Word[] = [];

    for (const item of content.items) {
      if (!('str' in item)) continue;

      const transform = item.transform as number[];
      const x = transform[4] ?? 0;
      const y = transform[5] ?? 0;
      const itemWidth = item.width ?? 0;
      const height = item.height ?? Math.abs(transform[3] ?? 10);
      const fontFamily = content.styles[item.fontName]?.fontFamily ?? 'Helvetica';

      const text = item.str;
      if (text.trim().length === 0) continue;
      if (itemWidth <= 0) continue;

      // Ancho total del fragmento en milésimas de em, y factor de conversión
      // a unidades de dispositivo (puntos).
      let totalUnits = 0;
      for (const char of text) totalUnits += charWidth(char, fontFamily);
      if (totalUnits === 0) continue;

      const unitToDevice = itemWidth / totalUnits;

      let cursorUnits = 0;
      let wordStart = 0;
      let wordStartUnits = 0;
      let wordUnits = 0;

      const flush = (endIndex: number, startIndex: number, units: number, startUnits: number) => {
        if (endIndex <= startIndex) return;
        const str = text.slice(startIndex, endIndex);
        if (str.trim().length === 0) return;

        words.push({
          str,
          x: x + startUnits * unitToDevice,
          y,
          width: units * unitToDevice,
          height,
        });
      };

      for (let i = 0; i < text.length; i++) {
        const char = text[i];
        const units = charWidth(char, fontFamily);

        if (/\s/.test(char)) {
          flush(i, wordStart, wordUnits, wordStartUnits);
          cursorUnits += units;
          wordStart = i + 1;
          wordStartUnits = cursorUnits;
          wordUnits = 0;
          continue;
        }

        wordUnits += units;
        cursorUnits += units;
      }

      flush(text.length, wordStart, wordUnits, wordStartUnits);
    }

    pages.push({ pageNumber, words });
  }

  const characterCount = pages.reduce(
    (total, page) => total + page.words.reduce((sum, word) => sum + word.str.trim().length, 0),
    0,
  );

  return {
    pages,
    characterCount,
    looksLikeScan: characterCount < MIN_TEXT_CHARACTERS,
  };
}
