/**
 * Normaliza texto para las búsquedas: minúsculas y sin acentos.
 *
 * SQLite no normaliza acentos en los `LIKE`, así que buscar "electronica"
 * no encontraría "Donación electrónica". Guardando una copia normalizada de
 * la descripción, el filtro de texto libre funciona con o sin tilde.
 */
export function normalizeSearch(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
