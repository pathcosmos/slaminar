/**
 * AI provider routing — unified source of truth.
 *
 * Resolution order (first match wins):
 *   1. CLI flag (--provider) — passed via SLAMINAR_AI_PROVIDER env (runtime)
 *   2. Environment variables (CLOUDFLARE_*, ANTHROPIC_API_KEY) — CI/ad-hoc override
 *   3. User auth config (~/.config/slaminar/auth.json) — set by `slaminar login`
 *   4. Local fallback (no AI)
 */

import type { ProjectProfile } from '../types/index.js';
import { generateWithCloudflare } from './cloudflare-ai.js';
import { loadAuthConfig } from '../auth/config.js';
import type { CloudflareAuth, AnthropicAuth } from '../auth/config.js';

export type AiMode = 'ai' | 'local';
export type AiProvider = 'anthropic' | 'cloudflare' | 'local';

export interface AiProviderStatus {
  available: boolean;
  mode: AiMode;
  provider: AiProvider;
  reason: string;
  model?: string;
  source?: 'env' | 'config' | 'cli';
}

interface ResolvedProvider {
  provider: AiProvider;
  source: 'env' | 'config';
  cloudflare?: CloudflareAuth;
  anthropic?: AnthropicAuth;
}

function resolveProvider(): ResolvedProvider | null {
  // 1. Explicit env override (SLAMINAR_AI_PROVIDER=local disables AI)
  const explicit = process.env.SLAMINAR_AI_PROVIDER as AiProvider | undefined;
  if (explicit === 'local') return null;

  // 2. Env vars — highest priority among ai providers
  const envCfAccount = process.env.CLOUDFLARE_ACCOUNT_ID;
  const envCfToken = process.env.CLOUDFLARE_API_TOKEN;
  const envAnthropic = process.env.ANTHROPIC_API_KEY;
  const envModel = process.env.SLAMINAR_CF_MODEL;

  // 3. Auth config from `slaminar login`
  const authConfig = loadAuthConfig();

  // Apply explicit provider selection first
  if (explicit === 'cloudflare') {
    if (envCfAccount && envCfToken) {
      return {
        provider: 'cloudflare',
        source: 'env',
        cloudflare: {
          accountId: envCfAccount,
          apiToken: envCfToken,
          model: envModel ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        },
      };
    }
    if (authConfig?.providers.cloudflare) {
      return { provider: 'cloudflare', source: 'config', cloudflare: authConfig.providers.cloudflare };
    }
    return null;
  }
  if (explicit === 'anthropic') {
    if (envAnthropic) {
      return {
        provider: 'anthropic',
        source: 'env',
        anthropic: { apiKey: envAnthropic, model: 'claude-sonnet-4-20250514' },
      };
    }
    if (authConfig?.providers.anthropic) {
      return { provider: 'anthropic', source: 'config', anthropic: authConfig.providers.anthropic };
    }
    return null;
  }

  // Auto mode — try env first, then config
  if (envCfAccount && envCfToken) {
    return {
      provider: 'cloudflare',
      source: 'env',
      cloudflare: {
        accountId: envCfAccount,
        apiToken: envCfToken,
        model: envModel ?? '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      },
    };
  }
  if (envAnthropic) {
    return {
      provider: 'anthropic',
      source: 'env',
      anthropic: { apiKey: envAnthropic, model: 'claude-sonnet-4-20250514' },
    };
  }
  if (authConfig?.active === 'cloudflare' && authConfig.providers.cloudflare) {
    return { provider: 'cloudflare', source: 'config', cloudflare: authConfig.providers.cloudflare };
  }
  if (authConfig?.active === 'anthropic' && authConfig.providers.anthropic) {
    return { provider: 'anthropic', source: 'config', anthropic: authConfig.providers.anthropic };
  }
  return null;
}

export function detectAiProvider(): AiProviderStatus {
  const resolved = resolveProvider();
  if (!resolved) {
    const explicit = process.env.SLAMINAR_AI_PROVIDER;
    return {
      available: false,
      mode: 'local',
      provider: 'local',
      reason: explicit === 'local'
        ? 'Local mode explicitly selected'
        : 'No AI configured (run `slaminar login` or set CLOUDFLARE_API_TOKEN/ANTHROPIC_API_KEY)',
    };
  }
  if (resolved.provider === 'cloudflare') {
    return {
      available: true,
      mode: 'ai',
      provider: 'cloudflare',
      reason: `Cloudflare Workers AI (${resolved.source})`,
      model: resolved.cloudflare!.model,
      source: resolved.source,
    };
  }
  if (resolved.provider === 'anthropic') {
    return {
      available: true,
      mode: 'ai',
      provider: 'anthropic',
      reason: `Anthropic API (${resolved.source})`,
      model: resolved.anthropic!.model,
      source: resolved.source,
    };
  }
  return { available: false, mode: 'local', provider: 'local', reason: 'Unknown state' };
}

const ENHANCE_SYSTEM_PROMPT =
  'You improve CLAUDE.md files for Claude Code. ' +
  'Preserve all <!-- slaminar:begin:X --> ... <!-- slaminar:end:X --> ownership markers exactly. ' +
  'Improve clarity and specificity but keep the structure. ' +
  'Output only the improved markdown — no preamble, no explanation, no code fences around the whole output.';

function buildUserPrompt(draft: string, profile: ProjectProfile, context: string): string {
  return (
    `Project profile:\n${JSON.stringify(profile, null, 2)}\n\n` +
    (context ? `Additional context:\n${context}\n\n` : '') +
    `Current draft:\n---\n${draft}\n---`
  );
}

async function enhanceWithAnthropicAuth(
  auth: AnthropicAuth,
  draft: string,
  profile: ProjectProfile,
  context: string,
): Promise<string> {
  try {
    const sdkName = '@anthropic-ai/sdk';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sdkModule: any = await import(/* @vite-ignore */ sdkName);
    const Anthropic = sdkModule.default ?? sdkModule;
    const client = new Anthropic({ apiKey: auth.apiKey });
    const message = await client.messages.create({
      model: auth.model,
      max_tokens: 4096,
      system: ENHANCE_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: buildUserPrompt(draft, profile, context) }],
    });
    const textBlock = message.content.find((b: { type: string }) => b.type === 'text');
    return textBlock?.text ?? draft;
  } catch {
    return draft;
  }
}

/**
 * Enhance a CLAUDE.md draft using the resolved AI provider.
 * Returns the draft unchanged if no AI is available or on any error.
 */
export async function enhanceWithAI(
  localDraft: string,
  profile: ProjectProfile,
  context: string = '',
): Promise<string> {
  const resolved = resolveProvider();
  if (!resolved) return localDraft;

  try {
    if (resolved.provider === 'cloudflare' && resolved.cloudflare) {
      return await generateWithCloudflare(
        ENHANCE_SYSTEM_PROMPT,
        buildUserPrompt(localDraft, profile, context),
        {
          accountId: resolved.cloudflare.accountId,
          apiToken: resolved.cloudflare.apiToken,
          model: resolved.cloudflare.model,
        },
      );
    }
    if (resolved.provider === 'anthropic' && resolved.anthropic) {
      return await enhanceWithAnthropicAuth(resolved.anthropic, localDraft, profile, context);
    }
  } catch {
    // fall through
  }
  return localDraft;
}
