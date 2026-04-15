/**
 * AI model catalog — available models per provider with metadata.
 */

export interface ModelInfo {
  id: string;
  name: string;
  context: number;
  recommended: boolean;
  description: string;
}

export const CLOUDFLARE_MODELS: ModelInfo[] = [
  {
    id: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    name: 'Llama 3.3 70B (fp8-fast)',
    context: 24000,
    recommended: true,
    description: '빠르고 품질 좋음 — 기본 추천',
  },
  {
    id: '@cf/meta/llama-3.1-8b-instruct',
    name: 'Llama 3.1 8B',
    context: 8000,
    recommended: false,
    description: '가장 빠름, 저비용',
  },
  {
    id: '@cf/mistralai/mistral-small-3.1-24b-instruct',
    name: 'Mistral Small 3.1 24B',
    context: 128000,
    recommended: false,
    description: '128K 컨텍스트, 긴 문서용',
  },
  {
    id: '@cf/google/gemma-3-12b-it',
    name: 'Gemma 3 12B',
    context: 128000,
    recommended: false,
    description: '다국어 지원, 128K 컨텍스트',
  },
  {
    id: '@cf/qwen/qwen2.5-coder-32b-instruct',
    name: 'Qwen 2.5 Coder 32B',
    context: 32000,
    recommended: false,
    description: '코드 중심 프로젝트에 강함',
  },
];

export const ANTHROPIC_MODELS: ModelInfo[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    context: 200000,
    recommended: true,
    description: '최고 품질, 긴 컨텍스트',
  },
];

export function getDefaultModel(provider: 'cloudflare' | 'anthropic'): string {
  const models = provider === 'cloudflare' ? CLOUDFLARE_MODELS : ANTHROPIC_MODELS;
  return models.find(m => m.recommended)?.id ?? models[0].id;
}

export function findModel(provider: 'cloudflare' | 'anthropic', id: string): ModelInfo | null {
  const models = provider === 'cloudflare' ? CLOUDFLARE_MODELS : ANTHROPIC_MODELS;
  return models.find(m => m.id === id) ?? null;
}
