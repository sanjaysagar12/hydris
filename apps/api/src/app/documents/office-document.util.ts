import ExcelJS from 'exceljs';
import * as mammoth from 'mammoth';

// Gemini can read PDFs and images natively, but not Office Open XML formats —
// these are converted to plain text/CSV client-side (server-side, really) and
// sent as a text part instead of inline binary data.
const MAX_EXTRACTED_TEXT_CHARS = 60_000;

function truncate(text: string): string {
  if (text.length <= MAX_EXTRACTED_TEXT_CHARS) return text;
  return `${text.slice(0, MAX_EXTRACTED_TEXT_CHARS)}\n\n[...document truncated for length...]`;
}

/** Converts every sheet of an .xlsx workbook to a CSV-ish text block. */
export async function extractXlsxText(buffer: Buffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const sections: string[] = [];
  workbook.eachSheet((sheet) => {
    const rows: string[] = [];
    sheet.eachRow((row) => {
      const cells = (row.values as unknown[])
        .slice(1) // exceljs row.values is 1-indexed with a leading empty slot
        .map((v) => (v === null || v === undefined ? '' : String(v)));
      rows.push(cells.join(', '));
    });
    sections.push(`[Sheet: ${sheet.name}]\n${rows.join('\n')}`);
  });

  return truncate(sections.join('\n\n'));
}

/** Extracts plain text from a .docx document (headers/body paragraphs, not styling). */
export async function extractDocxText(buffer: Buffer): Promise<string> {
  const result = await mammoth.extractRawText({ buffer });
  return truncate(result.value);
}
