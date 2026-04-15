/**
 * Cloudflare Workers AI provider — free tier (10K Neurons/day).
 *
 * Uses native fetch (Node.js >= 18). No npm package required.
 * Supports any Workers AI text-generation model.
 *
 * Env vars:
 *   CLOUDFLARE_ACCOUNT_ID     — required
 *   CLOUDFLARE_API_TOKEN      — required (Workers AI: Read permission)
 *   SLAMINAR_CF_MODEL         — optional, default: @cf/meta/llama-3.3-70b-instruct-fp8-fast
 */

import type { ProjectProfile } from '../types/index.js';

export const DEFAULT_CF_MODEL = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';
export const FALLBACK_CF_MODEL = '@cf/meta/llama-3.1-8b-instruct';

export interface CloudflareConfig {
  accountId: string;
  apiToken: string;
  model?: string;
}

export interface CloudflareStatus {
  available: boolean;
  reason: string;
  accountId?: string;
  model?: string;
}

export function detectCloudflareProvider(): CloudflareStatus {
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const apiToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!accountId) {
    return { available: false, reason: 'CLOUDFLARE_ACCOUNT_ID not set' };
  }
  if (!apiToken) {
    return { available: false, reason: 'CLOUDFLARE_API_TOKEN not set' };
  }

  return {
    available: true,
    reason: 'Cloudflare Workers AI configured',
    accountId,
    model: process.env.SLAMINAR_CF_MODEL ?? DEFAULT_CF_MODEL,
  };
}

interface CfResponse {
  success: boolean;
  result: { response: string; usage?: { total_tokens: number } } | null;
  errors: { code: number; message: string }[];
}

/**
 * Call Cloudflare Workers AI for text generation.
 * Returns generated text on success, throws Error on failure.
 */
export async function generateWithCloudflare(
  systemPrompt: string,
  userPrompt: string,
  config: CloudflareConfig,
  maxTokens: number = 4096,
): Promise<string> {
  const model = config.model ?? DEFAULT_CF_MODEL;
  const url = `https://api.cloudflare.com/client/v4/accounts/${config.accountId}/ai/run/${model}`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    throw new Error(`Cloudflare API HTTP ${response.status}: ${response.statusText}`);
  }

  const data = (await response.json()) as CfResponse;

  if (!data.success) {
    const errors = data.errors.map(e => `[${e.code}] ${e.message}`).join('; ');
    throw new Error(`Cloudflare API error: ${errors}`);
  }

  if (!data.result?.response) {
    throw new Error('Cloudflare API returned empty response');
  }

  return data.result.response;
}

/**
 * Enhance a CLAUDE.md draft using Cloudflare Workers AI.
 * Falls back to returning the original draft on any failure.
 */
export async function enhanceWithCloudflare(
  localDraft: string,
  profile: ProjectProfile,
  context: string = '',
): Promise<string> {
  const status = detectCloudflareProvider();
  if (!status.available) return localDraft;

  const systemPrompt =
    'You improve CLAUDE.md files for Claude Code. ' +
    'Preserve all <!-- slaminar:begin:X --> ... <!-- slaminar:end:X --> ownership markers exactly. ' +
    'Improve clarity and specificity but keep the structure. ' +
    'Output only the improved markdown — no preamble, no explanation, no code fences around the whole output.';

  const userPrompt =
    `Project profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
    (context ? `Additional context:\n${context}\n\n` : '') +
    `Current draft:\n---\n${localDraft}\n---`;

  try {
    return await generateWithCloudflare(
      systemPrompt,
      userPrompt,
      { accountId: status.accountId!, apiToken: process.env.CLOUDFLARE_API_TOKEN!, model: status.model },
    );
  } catch {
    // Graceful fallback: return local draft unchanged
    return localDraft;
  }
}
