/**
 * AI provider routing — select between local (rule-based), Anthropic Claude API,
 * and Cloudflare Workers AI based on environment variables.
 *
 * Selection priority (when mode='auto'):
 *   1. Cloudflare if CLOUDFLARE_ACCOUNT_ID + CLOUDFLARE_API_TOKEN are set
 *   2. Anthropic if ANTHROPIC_API_KEY is set
 *   3. Local fallback otherwise
 *
 * Explicit selection via SLAMINAR_AI_PROVIDER env var:
 *   - "cloudflare" | "anthropic" | "local"
 */

import type { ProjectProfile } from '../types/index.js';
import { detectCloudflareProvider, enhanceWithCloudflare } from './cloudflare-ai.js';

export type AiMode = 'ai' | 'local';
export type AiProvider = 'anthropic' | 'cloudflare' | 'local';

export interface AiProviderStatus {
  available: boolean;
  mode: AiMode;
  provider: AiProvider;
  reason: string;
  model?: string;
}

export function detectAiProvider(): AiProviderStatus {
  const explicit = process.env.SLAMINAR_AI_PROVIDER as AiProvider | undefined;

  const cf = detectCloudflareProvider();
  const hasAnthropic = !!process.env.ANTHROPIC_API_KEY;

  // Explicit selection
  if (explicit === 'cloudflare') {
    return cf.available
      ? { available: true, mode: 'ai', provider: 'cloudflare', reason: cf.reason, model: cf.model }
      : { available: false, mode: 'local', provider: 'local', reason: `Cloudflare selected but ${cf.reason}` };
  }
  if (explicit === 'anthropic') {
    return hasAnthropic
      ? { available: true, mode: 'ai', provider: 'anthropic', reason: 'Anthropic API key configured' }
      : { available: false, mode: 'local', provider: 'local', reason: 'Anthropic selected but ANTHROPIC_API_KEY not set' };
  }
  if (explicit === 'local') {
    return { available: false, mode: 'local', provider: 'local', reason: 'Local mode explicitly selected' };
  }

  // Auto selection — prefer Cloudflare (has free tier), then Anthropic
  if (cf.available) {
    return { available: true, mode: 'ai', provider: 'cloudflare', reason: cf.reason, model: cf.model };
  }
  if (hasAnthropic) {
    return { available: true, mode: 'ai', provider: 'anthropic', reason: 'Anthropic API key configured' };
  }

  return {
    available: false,
    mode: 'local',
    provider: 'local',
    reason: 'No AI provider configured (set CLOUDFLARE_API_TOKEN or ANTHROPIC_API_KEY)',
  };
}

async function enhanceWithAnthropic(
  localDraft: string,
  profile: ProjectProfile,
  context: string,
): Promise<string> {
  try {
    const sdkName = '@anthropic-ai/sdk';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkModule: any = await import(/* @vite-ignore */ sdkName);
    const Anthropic = sdkModule.default ?? sdkModule;
    const client = new Anthropic();

    const message = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content:
            `You are improving a CLAUDE.md file for a project. Here is the current draft:\n\n` +
            `---\n${localDraft}\n---\n\n` +
            `Project profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
            (context ? `Additional context:\n${context}\n\n` : '') +
            `Improve this CLAUDE.md to be more specific and helpful. ` +
            `Keep the slaminar ownership markers (<!-- slaminar:begin/end -->). ` +
            `Keep it concise. Output only the improved markdown, nothing else.`,
        },
      ],
    });

    const textBlock = message.content.find((b: { type: string }) => b.type === 'text');
    return textBlock?.text ?? localDraft;
  } catch {
    return localDraft;
  }
}

/**
 * Enhance a CLAUDE.md draft using the best available AI provider.
 * Returns the local draft unchanged if no AI is available or on any error.
 */
export async function enhanceWithAI(
  localDraft: string,
  profile: ProjectProfile,
  context: string = '',
): Promise<string> {
  const status = detectAiProvider();

  if (!status.available) return localDraft;

  if (status.provider === 'cloudflare') {
    return enhanceWithCloudflare(localDraft, profile, context);
  }
  if (status.provider === 'anthropic') {
    return enhanceWithAnthropic(localDraft, profile, context);
  }

  return localDraft;
}
