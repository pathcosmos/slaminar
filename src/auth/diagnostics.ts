/**
 * Token verification and API test diagnostics.
 * Run with `slaminar auth test` or during `slaminar login`.
 */

export interface DiagnosticCheck {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  detail: string;
  elapsedMs?: number;
}

export interface DiagnosticsResult {
  provider: 'cloudflare' | 'anthropic';
  checks: DiagnosticCheck[];
  overallPass: boolean;
}

// ─── Cloudflare diagnostics ────────────────────────────────

export async function verifyCloudflareToken(apiToken: string): Promise<DiagnosticCheck> {
  const start = Date.now();
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/user/tokens/verify', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = (await res.json()) as { success: boolean; result?: { status?: string }; errors?: { message: string }[] };
    const elapsedMs = Date.now() - start;
    if (!data.success) {
      const errMsg = data.errors?.[0]?.message ?? 'Unknown error';
      return { name: 'Token valid', status: 'fail', detail: errMsg, elapsedMs };
    }
    if (data.result?.status !== 'active') {
      return { name: 'Token valid', status: 'fail', detail: `Status: ${data.result?.status}`, elapsedMs };
    }
    return { name: 'Token valid', status: 'pass', detail: 'Active', elapsedMs };
  } catch (err) {
    return { name: 'Token valid', status: 'fail', detail: `Network error: ${(err as Error).message}` };
  }
}

export async function fetchCloudflareAccounts(apiToken: string): Promise<{ id: string; name: string }[] | null> {
  try {
    const res = await fetch('https://api.cloudflare.com/client/v4/accounts', {
      headers: { Authorization: `Bearer ${apiToken}` },
    });
    const data = (await res.json()) as { success: boolean; result: { id: string; name: string }[] };
    if (!data.success) return null;
    return data.result;
  } catch {
    return null;
  }
}

export async function testCloudflareInference(
  accountId: string,
  apiToken: string,
  model: string,
): Promise<DiagnosticCheck> {
  const start = Date.now();
  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'Reply with just "ok"', max_tokens: 10 }),
      },
    );
    const elapsedMs = Date.now() - start;
    const data = (await res.json()) as {
      success: boolean;
      result?: { response?: string; usage?: { total_tokens: number } };
      errors?: { message: string; code: number }[];
    };
    if (!data.success) {
      const err = data.errors?.[0];
      const msg = err ? `[${err.code}] ${err.message}` : 'Unknown error';
      return { name: 'Workers AI inference', status: 'fail', detail: msg, elapsedMs };
    }
    const tokens = data.result?.usage?.total_tokens ?? 0;
    return {
      name: 'Workers AI inference',
      status: 'pass',
      detail: `${tokens} tokens used`,
      elapsedMs,
    };
  } catch (err) {
    return {
      name: 'Workers AI inference',
      status: 'fail',
      detail: `Network error: ${(err as Error).message}`,
    };
  }
}

export async function runCloudflareDiagnostics(
  apiToken: string,
  accountId: string,
  model: string,
): Promise<DiagnosticsResult> {
  const checks: DiagnosticCheck[] = [];

  // 1. Token validity
  const tokenCheck = await verifyCloudflareToken(apiToken);
  checks.push(tokenCheck);
  if (tokenCheck.status !== 'pass') {
    return { provider: 'cloudflare', checks, overallPass: false };
  }

  // 2. Account access — OPTIONAL.
  // A minimal-permission token (Workers AI: Read only) may not be able to list
  // accounts. That's fine — we skip this check if it fails and rely on the
  // actual inference test below to validate access.
  const accounts = await fetchCloudflareAccounts(apiToken);
  if (accounts && accounts.length > 0) {
    const accountMatch = accounts.find(a => a.id === accountId);
    checks.push({
      name: 'Account access',
      status: accountMatch ? 'pass' : 'fail',
      detail: accountMatch ? accountMatch.name : `Account ${accountId} not found in accessible list`,
    });
    if (!accountMatch) return { provider: 'cloudflare', checks, overallPass: false };
  } else {
    checks.push({
      name: 'Account access',
      status: 'skip',
      detail: 'Token lacks account list scope (fine for Workers AI-only tokens)',
    });
  }

  // 3. Workers AI inference test — the definitive check
  const infCheck = await testCloudflareInference(accountId, apiToken, model);
  checks.push(infCheck);

  return {
    provider: 'cloudflare',
    checks,
    overallPass: checks.every(c => c.status === 'pass' || c.status === 'skip'),
  };
}

// ─── Anthropic diagnostics ────────────────────────────────

export async function testAnthropicKey(apiKey: string): Promise<DiagnosticCheck> {
  const start = Date.now();
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ok' }],
      }),
    });
    const elapsedMs = Date.now() - start;
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: { message: string } };
      return {
        name: 'Anthropic API',
        status: 'fail',
        detail: body.error?.message ?? `HTTP ${res.status}`,
        elapsedMs,
      };
    }
    return { name: 'Anthropic API', status: 'pass', detail: 'API key valid', elapsedMs };
  } catch (err) {
    return {
      name: 'Anthropic API',
      status: 'fail',
      detail: `Network error: ${(err as Error).message}`,
    };
  }
}

export async function runAnthropicDiagnostics(apiKey: string): Promise<DiagnosticsResult> {
  const checks: DiagnosticCheck[] = [await testAnthropicKey(apiKey)];
  return {
    provider: 'anthropic',
    checks,
    overallPass: checks.every(c => c.status === 'pass'),
  };
}
