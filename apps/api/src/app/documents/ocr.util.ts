import { createWorker, type Worker } from 'tesseract.js';
import { PDFParse } from 'pdf-parse';

// A digitally-generated PDF (exported from Word/Excel/a compliance platform)
// usually has thousands of characters of embedded text; a scanned/photographed
// PDF has none. This threshold distinguishes the two so we only pay the OCR
// cost when there's actually no text layer to read.
const MIN_TEXT_LENGTH_FOR_DIGITAL_PDF = 40;

// Bounds OCR time/cost on a very long scanned document — audit reports are
// rarely more than a handful of pages, and this is a fallback path, not the
// common case.
const MAX_OCR_PAGES = 5;

let workerPromise: Promise<Worker> | null = null;

/** Lazily-created, process-lifetime-cached OCR worker — avoids re-initializing the engine per request. */
function getOcrWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker('eng');
  }
  return workerPromise;
}

export async function extractImageText(buffer: Buffer): Promise<string> {
  const worker = await getOcrWorker();
  const {
    data: { text },
  } = await worker.recognize(buffer);
  return text.trim();
}

export interface PdfExtractionResult {
  text: string;
  /** True if the text came from OCR-ing rendered pages rather than a native text layer. */
  wasScanned: boolean;
}

/**
 * Extracts text from a PDF: reads the embedded text layer if there is one
 * (the common case for reports exported from a document/compliance system),
 * otherwise renders the first few pages to PNG and runs OCR on them (the
 * case for a scanned or photographed paper document).
 */
export async function extractPdfText(buffer: Buffer): Promise<PdfExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const textResult = await parser.getText();
    const digitalText = (textResult.text ?? '').trim();

    if (digitalText.length >= MIN_TEXT_LENGTH_FOR_DIGITAL_PDF) {
      return { text: digitalText, wasScanned: false };
    }

    const screenshot = await parser.getScreenshot({ first: MAX_OCR_PAGES });
    const worker = await getOcrWorker();
    const pageTexts = await Promise.all(
      screenshot.pages.map(async (page) => {
        const {
          data: { text },
        } = await worker.recognize(page.data as Buffer);
        return text.trim();
      }),
    );

    return { text: pageTexts.filter(Boolean).join('\n\n'), wasScanned: true };
  } finally {
    await parser.destroy();
  }
}
