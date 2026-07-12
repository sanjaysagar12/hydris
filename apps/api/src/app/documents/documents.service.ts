import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { SuppliersService } from '../suppliers/suppliers.service';
import { extractDocxText, extractXlsxText } from './office-document.util';
import { extractImageText, extractPdfText } from './ocr.util';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 2048;

// Kept as a safety net, but every file is now converted to text before
// reaching Gemini (see below) — a network hiccup mid-request should be rare
// now that requests are small, not the multi-megabyte base64 payloads this
// was originally added to guard against.
const GEMINI_TIMEOUT_MS = 90_000;
const RETRYABLE_ERROR_PATTERN = /ECONNRESET|ETIMEDOUT|EPIPE|fetch failed|aborted/i;

function isRetryableNetworkError(err: unknown): boolean {
  const message = err instanceof Error ? `${err.message} ${String((err as { cause?: unknown }).cause ?? '')}` : String(err);
  return RETRYABLE_ERROR_PATTERN.test(message);
}

const PDF_MIME_TYPE = 'application/pdf';
const IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/webp'];

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const DOCX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

// CSV mimetypes are unreliable across browsers/exporters (text/csv,
// application/vnd.ms-excel, or generic octet-stream) — read as raw text
// rather than trusting mimetype detection for it.
const CSV_MIME_TYPES = ['text/csv', 'application/csv', 'application/vnd.ms-excel'];

export const ACCEPTED_MIME_TYPES = [PDF_MIME_TYPE, ...IMAGE_MIME_TYPES, 'text/plain', XLSX_MIME_TYPE, DOCX_MIME_TYPE, 'text/csv'];

type FileKind = 'pdf' | 'image' | 'text' | 'xlsx' | 'docx' | 'csv' | 'unsupported';

/** Some browsers report .xlsx/.docx/.csv with generic or inconsistent mimetypes — fall back to the extension. */
function classifyFile(mimetype: string, originalname: string): FileKind {
  const ext = originalname.split('.').pop()?.toLowerCase();
  if (mimetype === XLSX_MIME_TYPE || ext === 'xlsx') return 'xlsx';
  if (mimetype === DOCX_MIME_TYPE || ext === 'docx') return 'docx';
  if (ext === 'csv' || (CSV_MIME_TYPES.includes(mimetype) && ext !== 'xls')) return 'csv';
  if (mimetype === PDF_MIME_TYPE || ext === 'pdf') return 'pdf';
  if (IMAGE_MIME_TYPES.includes(mimetype)) return 'image';
  if (mimetype === 'text/plain' || ext === 'txt') return 'text';
  return 'unsupported';
}

const SYSTEM_PROMPT = `You are a compliance-data extraction assistant for a textile-supplier water-risk platform. You are given one or more documents (audit reports, ZDHC/AWS certificates, lab test results, permits) for a SPECIFIC supplier facility, and must extract structured data to help an admin update that facility's record.

RULES:
1. Only extract a field if the documents give clear, specific evidence for it. Omit (leave out of the JSON entirely) any field you are not confident about — do not guess or infer from general knowledge.
2. "tier" is the MRSL conformance level ("Level 1" | "Level 2" | "Level 3") — usually stated directly in a ZDHC/MRSL audit summary.
3. "aws" is the Alliance for Water Stewardship certification level ("Uncertified" | "Core" | "Gold" | "Platinum").
4. "higg" is a Higg Facility Environmental Module (FEM) score, 0-100.
5. "withdrawalLpd", "dischargeLpd", "reuseVolumeLpd" are water balance figures in liters/day — convert units if the source document uses m³/day, gallons/day, etc. (1 m³ = 1000 L).
6. "auditDate" should be a human-readable date string as it appears in the source document (e.g. "12 Jun 2026"). "auditor" is the name of the auditing body, or "Self-reported" if the document is not from a third-party auditor.
7. List any open findings, non-conformances, exceedances, or expiring certifications as entries in "alerts" — each with a short "title", a one-line "meta" description (include specific numbers/dates found), a "severity" ("Critical" for serious violations like banned chemicals or enforcement action, "Major" for threshold exceedances or tier downgrades, "Minor" for administrative items like upcoming renewals), and a "type" (use "chemical_exceedance", "data_anomaly", "enforcement_action", or "permit_expiry" when applicable, otherwise a short snake_case label of your choosing).
8. Always include a "notes" field: 1-3 sentences summarizing what you found and which document each key value came from, so the admin can sanity-check before applying anything.
9. Documents marked "(OCR'd from a scan/image)" were transcribed by optical character recognition and may contain misread characters or dropped words — if a value looks garbled or implausible (e.g. a nonsensical unit or an out-of-range score), omit it rather than guessing at the intended value, and mention the uncertainty in "notes".`;

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    tier: { type: 'string', enum: ['Level 1', 'Level 2', 'Level 3'] },
    tierTrend: { type: 'string', enum: ['up', 'down', 'flat'] },
    aws: { type: 'string', enum: ['Uncertified', 'Core', 'Gold', 'Platinum'] },
    higg: { type: 'number' },
    riskScore: { type: 'string' },
    auditDate: { type: 'string' },
    auditor: { type: 'string' },
    withdrawalLpd: { type: 'number' },
    dischargeLpd: { type: 'number' },
    reuseVolumeLpd: { type: 'number' },
    alerts: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          meta: { type: 'string' },
          severity: { type: 'string', enum: ['Critical', 'Major', 'Minor'] },
          type: { type: 'string' },
        },
        required: ['title', 'meta', 'severity', 'type'],
      },
    },
    notes: { type: 'string' },
  },
  required: ['notes'],
};

export interface ExtractedAlert {
  title: string;
  meta: string;
  severity: 'Critical' | 'Major' | 'Minor';
  type: string;
}

export interface ExtractedFields {
  tier?: string;
  tierTrend?: string;
  aws?: string;
  higg?: number;
  riskScore?: string;
  auditDate?: string;
  auditor?: string;
  withdrawalLpd?: number;
  dischargeLpd?: number;
  reuseVolumeLpd?: number;
  alerts?: ExtractedAlert[];
  notes: string;
}

export interface UploadedDocument {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class DocumentsService {
  private client: GoogleGenAI | null = null;

  constructor(private readonly suppliersService: SuppliersService) {}

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set. Add it to apps/api/.env.');
      }
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  async extract(supplierId: string, files: UploadedDocument[]): Promise<ExtractedFields> {
    if (files.length === 0) {
      throw new BadRequestException('At least one document is required.');
    }

    const kinds = files.map((f) => classifyFile(f.mimetype, f.originalname));
    const unsupportedIndex = kinds.indexOf('unsupported');
    if (unsupportedIndex !== -1) {
      const bad = files[unsupportedIndex];
      throw new BadRequestException(
        `Unsupported file type "${bad.mimetype}" (${bad.originalname}). Accepted: PDF, PNG, JPEG, WEBP, plain text, CSV, XLSX, DOCX.`,
      );
    }

    const supplier = await this.suppliersService.findOne(supplierId);

    // Every file becomes a text part before it ever reaches Gemini — no binary
    // upload to the model, however large the source file. This is what fixed
    // the ECONNRESET-on-large-upload issue: the outbound request is now a few
    // KB of text instead of tens of megabytes of base64.
    const fileParts = await Promise.all(
      files.map(async (f, i) => {
        const kind = kinds[i];
        if (kind === 'xlsx') {
          const csv = await extractXlsxText(f.buffer);
          return { text: `--- ${f.originalname} (spreadsheet) ---\n${csv}` };
        }
        if (kind === 'docx') {
          const doc = await extractDocxText(f.buffer);
          return { text: `--- ${f.originalname} (Word document) ---\n${doc}` };
        }
        if (kind === 'csv') {
          return { text: `--- ${f.originalname} (CSV) ---\n${f.buffer.toString('utf-8')}` };
        }
        if (kind === 'text') {
          return { text: `--- ${f.originalname} ---\n${f.buffer.toString('utf-8')}` };
        }
        if (kind === 'image') {
          const ocrText = await extractImageText(f.buffer);
          return { text: `--- ${f.originalname} (OCR'd from a scan/image) ---\n${ocrText}` };
        }
        // pdf
        const { text: pdfText, wasScanned } = await extractPdfText(f.buffer);
        const label = wasScanned ? `${f.originalname} (OCR'd from a scan/image)` : f.originalname;
        return { text: `--- ${label} ---\n${pdfText}` };
      }),
    );

    const genAI = this.getClient();
    const request = {
      model: MODEL,
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: `Facility: ${supplier.name} (${supplier.loc}, ${supplier.region}). Extract compliance data for this facility from the ${files.length} attached document(s).`,
            },
            ...fileParts,
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM_PROMPT,
        responseMimeType: 'application/json',
        responseJsonSchema: RESPONSE_SCHEMA,
        maxOutputTokens: MAX_OUTPUT_TOKENS,
        httpOptions: { timeout: GEMINI_TIMEOUT_MS },
      },
    };

    let response;
    try {
      response = await genAI.models.generateContent(request);
    } catch (err) {
      if (!isRetryableNetworkError(err)) throw err;
      // One retry for a transient network blip (e.g. connection reset mid-upload)
      // before giving up — most such failures don't repeat immediately.
      try {
        response = await genAI.models.generateContent(request);
      } catch (retryErr) {
        if (isRetryableNetworkError(retryErr)) {
          throw new ServiceUnavailableException(
            'The connection to the extraction service was interrupted while uploading — this is usually a transient network issue. Please try again, or with fewer/smaller files.',
          );
        }
        throw retryErr;
      }
    }

    const text = response.text;
    if (!text) {
      throw new BadRequestException('The model returned no extractable data — try clearer scans or a different document.');
    }

    try {
      return JSON.parse(text) as ExtractedFields;
    } catch {
      throw new BadRequestException('Could not parse the extracted data — please try again.');
    }
  }
}
