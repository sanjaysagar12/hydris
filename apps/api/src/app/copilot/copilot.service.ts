import { randomUUID } from 'crypto';
import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { executeQuery } from './copilot-query.util';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_TOOL_ITERATIONS = 6;
const MAX_OUTPUT_TOKENS = 1024;

const SYSTEM_PROMPT = `You are the Stewardship Copilot, an assistant with deep knowledge of a textile-supplier water-risk database (PostgreSQL).

DATABASE SCHEMA (use exact double-quoted, case-sensitive identifiers in SQL):
Table "Supplier" — one row per facility:
  id, name, loc, region, basin
  risk ('high'|'med'|'low'), "riskScore" (text, e.g. '4.2'), "riskSrc" — basin-level water risk context
  tier ('Level 1'|'Level 2'|'Level 3'), "tierTrend" ('up'|'down'|'flat'), "tierFrom" — MRSL conformance
  aws ('Uncertified'|'Core'|'Gold'|'Platinum') — Alliance for Water Stewardship certification
  higg, "higgAvg" (integer) — Higg Facility Environmental Module score, and peer average
  "auditDate", auditor (text) — last audit and who performed it
  "withdrawalLpd", "dischargeLpd", "reuseVolumeLpd" (integer, liters/day) — water balance.
    Reuse rate % = "reuseVolumeLpd" / "withdrawalLpd" * 100 — compute this yourself, it is not a stored column.
  "pwiAvail", "pwiConf", "pwiQuality", "pwiQConf", "pwiAccess" (text) — WQBA engine PWI contribution figures
  email — never select or mention "passwordHash"; it does not concern users of this tool and is blocked.

Table "SupplierAlert" — open compliance/audit alerts, many per supplier:
  id, title, meta, "supplierId" (references "Supplier".id)

RELATIONSHIP: "Supplier" (1) --> (many) "SupplierAlert" via "SupplierAlert"."supplierId" = "Supplier".id

INSTRUCTIONS:
1. The user is a portfolio administrator asking about the supplier portfolio as a whole — never about a single supplier's login credentials or account details.
2. If the question is AMBIGUOUS (e.g. "top performers" — by what metric? "off-track" — on what basis?), use ask_clarification BEFORE writing a query. Don't guess. Always include 2-4 concrete "options" — short phrases the user could click instead of typing (e.g. "By Higg FEM score", "By AWS certification"), covering the main reasonable interpretations.
3. If the question is CLEAR, use query_database with a single valid PostgreSQL SELECT statement.
4. You may call query_database more than once (e.g. to check alerts, then compliance status) to fully answer a question.
5. Synthesize results into a clear, natural-language answer that cites specific suppliers, numbers, and figures from the data — do not just describe the query.
6. Format numbers sensibly (percentages, thousands separators) and keep the tone concise and consultative, like a sustainability analyst briefing a colleague.`;

const functionDeclarations = [
  {
    name: 'query_database',
    description:
      'Execute a single read-only PostgreSQL SELECT statement against the Supplier / SupplierAlert tables and return the matching rows.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        sql: {
          type: 'string',
          description: 'A single valid PostgreSQL SELECT statement using double-quoted identifiers.',
        },
      },
      required: ['sql'],
    },
  },
  {
    name: 'ask_clarification',
    description:
      'Ask the user a clarifying question when their request has more than one reasonable interpretation, or is missing information needed to answer well.',
    parametersJsonSchema: {
      type: 'object',
      properties: {
        question: {
          type: 'string',
          description: 'The clarifying question to show the user.',
        },
        options: {
          type: 'array',
          items: { type: 'string' },
          description:
            'Two to four short, concrete suggested answers the user can pick with one click instead of typing, phrased as the user would say them (e.g. "By Higg FEM score"). Provide these whenever the question has a few likely interpretations.',
        },
      },
      required: ['question'],
    },
  },
];

export interface CopilotMessage {
  id: string;
  type: 'user' | 'agent' | 'clarification';
  content: string;
  timestamp: string;
  sql?: string;
  data?: Record<string, unknown>[];
  options?: string[];
}

export type CopilotResponse =
  | { type: 'answer'; content: string; sql?: string; data?: Record<string, unknown>[] }
  | { type: 'clarification_needed'; content: string; clarificationDetails: string; options?: string[] };

interface Conversation {
  contents: unknown[];
  displayMessages: CopilotMessage[];
  pendingClarification: { id?: string; name?: string } | null;
}

@Injectable()
export class CopilotService {
  private client: GoogleGenAI | null = null;
  private readonly conversations = new Map<string, Conversation>();

  constructor(private readonly prisma: PrismaService) {}

  private getClient(): GoogleGenAI {
    if (!this.client) {
      if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is not set. Add it to apps/api/.env.');
      }
      this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    }
    return this.client;
  }

  private getOrCreateConversation(conversationId: string): Conversation {
    let conversation = this.conversations.get(conversationId);
    if (!conversation) {
      conversation = { contents: [], displayMessages: [], pendingClarification: null };
      this.conversations.set(conversationId, conversation);
    }
    return conversation;
  }

  private pushDisplayMessage(
    conversation: Conversation,
    type: CopilotMessage['type'],
    content: string,
    extra: Partial<CopilotMessage> = {},
  ): CopilotMessage {
    const message: CopilotMessage = {
      id: randomUUID(),
      type,
      content,
      timestamp: new Date().toISOString(),
      ...extra,
    };
    conversation.displayMessages.push(message);
    return message;
  }

  private async runAgentLoop(conversation: Conversation): Promise<CopilotResponse> {
    const genAI = this.getClient();
    let lastQuery: { sql: string; rows?: Record<string, unknown>[] } | null = null;

    for (let iteration = 0; iteration < MAX_TOOL_ITERATIONS; iteration++) {
      const response = await genAI.models.generateContent({
        model: MODEL,
        contents: conversation.contents as never,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: [{ functionDeclarations }],
          maxOutputTokens: MAX_OUTPUT_TOKENS,
        },
      });

      const modelContent = response.candidates?.[0]?.content;
      if (modelContent) conversation.contents.push(modelContent);

      const functionCalls = response.functionCalls ?? [];

      if (functionCalls.length === 0) {
        const text = (response.text ?? '').trim();
        this.pushDisplayMessage(
          conversation,
          'agent',
          text,
          lastQuery ? { sql: lastQuery.sql, data: lastQuery.rows } : {},
        );
        return { type: 'answer', content: text, ...(lastQuery ? { sql: lastQuery.sql, data: lastQuery.rows } : {}) };
      }

      const clarificationCall = functionCalls.find((call) => call.name === 'ask_clarification');
      if (clarificationCall) {
        const question = (clarificationCall.args?.question as string) ?? 'Could you clarify your question?';
        const options = (clarificationCall.args?.options as string[] | undefined)?.filter(Boolean);
        conversation.pendingClarification = { id: clarificationCall.id, name: clarificationCall.name };
        this.pushDisplayMessage(conversation, 'clarification', question, options?.length ? { options } : {});
        return {
          type: 'clarification_needed',
          content: question,
          clarificationDetails: question,
          ...(options?.length ? { options } : {}),
        };
      }

      const responseParts: unknown[] = [];
      for (const call of functionCalls) {
        if (call.name === 'query_database') {
          const result = await executeQuery(this.prisma, call.args?.sql as string);
          if (result.success) lastQuery = { sql: result.sql, rows: result.rows };
          responseParts.push({
            functionResponse: {
              id: call.id,
              name: call.name,
              response: result.success ? { output: result } : { error: result.error },
            },
          });
        } else {
          responseParts.push({
            functionResponse: { id: call.id, name: call.name, response: { error: `Unknown tool: ${call.name}` } },
          });
        }
      }
      conversation.contents.push({ role: 'user', parts: responseParts });
    }

    const fallback =
      "I wasn't able to finish that within my step budget — could you rephrase or narrow your question?";
    this.pushDisplayMessage(conversation, 'agent', fallback);
    return { type: 'answer', content: fallback };
  }

  async ask(conversationId: string, question: string): Promise<CopilotResponse> {
    const conversation = this.getOrCreateConversation(conversationId);
    this.pushDisplayMessage(conversation, 'user', question);
    conversation.contents.push({ role: 'user', parts: [{ text: question }] });
    return this.runAgentLoop(conversation);
  }

  async answerClarification(conversationId: string, answer: string): Promise<CopilotResponse> {
    const conversation = this.getOrCreateConversation(conversationId);
    if (!conversation.pendingClarification) {
      const error = new Error('No pending clarification for this conversation.');
      (error as { status?: number }).status = 400;
      throw error;
    }

    const { id, name } = conversation.pendingClarification;
    conversation.pendingClarification = null;
    this.pushDisplayMessage(conversation, 'user', answer);
    conversation.contents.push({
      role: 'user',
      parts: [{ functionResponse: { id, name, response: { answer } } }],
    });
    return this.runAgentLoop(conversation);
  }

  getConversation(conversationId: string): CopilotMessage[] {
    return this.conversations.get(conversationId)?.displayMessages ?? [];
  }

  reset(conversationId: string): void {
    this.conversations.delete(conversationId);
  }
}
