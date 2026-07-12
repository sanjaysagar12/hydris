import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Injectable, NotFoundException } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { SuppliersService } from '../suppliers/suppliers.service';

const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const MAX_OUTPUT_TOKENS = 2048;
// gemini-2.5-flash spends part of maxOutputTokens on hidden "thinking" by
// default, which can truncate the visible answer before it finishes (see the
// same fix in documents.service.ts). Disabled here for the same reason.
const THINKING_CONFIG = { thinkingBudget: 0 };

// Domain knowledge for this feature lives in a Claude-Skills-style SKILL.md
// (frontmatter + markdown body) instead of an inline prompt string, so the
// PWI methodology and coaching guidance can be read/edited independently of
// the code that drives the chat loop. Lives under src/assets so the webpack
// build (apps/api/webpack.config.js -> assets: ['./src/assets']) copies it
// next to dist/main.js — __dirname inside the bundled output is `dist/`.
const SKILL_PATH = join(__dirname, 'assets', 'skills', 'pwi-advisor', 'SKILL.md');

function loadSkill(): string {
  const raw = readFileSync(SKILL_PATH, 'utf-8');
  // Strip the YAML frontmatter block — it's metadata for humans/tooling, not
  // instructions for the model.
  return raw.replace(/^---\n[\s\S]*?\n---\n/, '').trim();
}

let skillContentCache: string | null = null;
function getSkillContent(): string {
  if (!skillContentCache) skillContentCache = loadSkill();
  return skillContentCache;
}

function daysAgo(date: Date, asOf: Date): number {
  return Math.max(0, Math.floor((asOf.getTime() - date.getTime()) / (24 * 60 * 60 * 1000)));
}

type PresentedSupplier = Awaited<ReturnType<SuppliersService['findOne']>>;

/** Renders the current supplier snapshot as plain text, injected alongside the skill content so the model's advice is grounded in real, current numbers. */
function formatSupplierContext(s: PresentedSupplier): string {
  const asOf = new Date();
  const b = s.pwi.breakdown;

  const alertLines = s.alerts.length
    ? s.alerts
        .map(
          (a) =>
            `  - [${a.severity}] ${a.title} — ${a.meta} (type: ${a.type}, opened ${daysAgo(new Date(a.createdAt), asOf)} days ago)`,
        )
        .join('\n')
    : '  - No open alerts.';

  return `SUPPLIER CONTEXT (live data — treat as ground truth)
Name: ${s.name}
Location: ${s.loc}, ${s.region} (basin: ${s.basin})
MRSL Tier: ${s.tier}, trend ${s.tierTrend}
AWS certification: ${s.aws}
Last audit: ${s.auditDate} by ${s.auditor}
Water quality index (WQBA): ${s.pwiQuality} (confidence ${s.pwiQConf})
Water balance: withdrawal ${s.withdrawal}, discharge ${s.discharge}, reuse rate ${s.reuse}%
Plant Health: ${s.health.score} / 100 (${s.health.band})

PWI SCORE: ${s.pwi.score} / 100 (${s.pwi.band})
  Tier Score:               ${b.tierScore.value.toFixed(1)} x ${b.tierScore.weight} = ${b.tierScore.contribution.toFixed(1)}
  Permit Score:             ${b.permitScore.value.toFixed(1)} x ${b.permitScore.weight} = ${b.permitScore.contribution.toFixed(1)}
  Water Quality Score:      ${b.waterQualityScore.value.toFixed(1)} x ${b.waterQualityScore.weight} = ${b.waterQualityScore.contribution.toFixed(1)}
  Corrective Action Score:  ${b.correctiveActionScore.value.toFixed(1)} x ${b.correctiveActionScore.weight} = ${b.correctiveActionScore.contribution.toFixed(1)}

OPEN ALERTS (${s.alerts.length}):
${alertLines}`;
}

export interface AdvisorMessage {
  id: string;
  role: 'user' | 'agent';
  content: string;
  timestamp: string;
}

interface Conversation {
  supplierId: string;
  contents: unknown[];
  messages: AdvisorMessage[];
}

@Injectable()
export class PwiAdvisorService {
  private client: GoogleGenAI | null = null;
  private readonly conversations = new Map<string, Conversation>();

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

  private pushMessage(conversation: Conversation, role: AdvisorMessage['role'], content: string): AdvisorMessage {
    const message: AdvisorMessage = { id: randomUUID(), role, content, timestamp: new Date().toISOString() };
    conversation.messages.push(message);
    return message;
  }

  private async getOrCreateConversation(supplierId: string, conversationId: string): Promise<Conversation> {
    const existing = this.conversations.get(conversationId);
    if (existing) {
      if (existing.supplierId !== supplierId) {
        throw new NotFoundException('Conversation does not belong to this supplier');
      }
      return existing;
    }

    const supplier = await this.suppliersService.findOne(supplierId);
    const conversation: Conversation = { supplierId, contents: [], messages: [] };
    this.conversations.set(conversationId, conversation);

    // Seed the conversation with a system turn carrying the skill + the
    // supplier's current snapshot, so every subsequent turn stays grounded
    // even as the chat continues.
    conversation.contents.push({
      role: 'user',
      parts: [
        {
          text: `${getSkillContent()}\n\n${formatSupplierContext(supplier)}\n\nAcknowledge you've reviewed this supplier's PWI data and are ready to help improve it, in one short sentence.`,
        },
      ],
    });

    const genAI = this.getClient();
    const ack = await genAI.models.generateContent({
      model: MODEL,
      contents: conversation.contents as never,
      config: { maxOutputTokens: 256, thinkingConfig: THINKING_CONFIG },
    });
    const ackContent = ack.candidates?.[0]?.content;
    if (ackContent) conversation.contents.push(ackContent);

    return conversation;
  }

  async ask(supplierId: string, conversationId: string, question: string): Promise<{ content: string }> {
    const conversation = await this.getOrCreateConversation(supplierId, conversationId);
    this.pushMessage(conversation, 'user', question);
    conversation.contents.push({ role: 'user', parts: [{ text: question }] });

    const genAI = this.getClient();
    const response = await genAI.models.generateContent({
      model: MODEL,
      contents: conversation.contents as never,
      config: { maxOutputTokens: MAX_OUTPUT_TOKENS, thinkingConfig: THINKING_CONFIG },
    });

    const modelContent = response.candidates?.[0]?.content;
    if (modelContent) conversation.contents.push(modelContent);

    const text = (response.text ?? '').trim() || "I wasn't able to generate a response — try rephrasing your question.";
    this.pushMessage(conversation, 'agent', text);
    return { content: text };
  }

  getConversation(conversationId: string): AdvisorMessage[] {
    return this.conversations.get(conversationId)?.messages ?? [];
  }

  reset(conversationId: string): void {
    this.conversations.delete(conversationId);
  }
}
