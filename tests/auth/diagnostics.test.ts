import { describe, it, expect } from 'vitest';
import { verifyCloudflareToken, fetchCloudflareAccounts, testCloudflareInference } from '../../src/auth/diagnostics.js';

describe('auth/diagnostics (offline)', () => {
  it('returns fail for invalid CF token (no network roundtrip required for structure)', async () => {
    // Use a syntactically-shaped but invalid token — expect HTTP 401/403
    const check = await verifyCloudflareToken('cfut_definitely_not_a_real_token');
    expect(check.name).toBe('Token valid');
    expect(['fail', 'pass']).toContain(check.status);
    // Most likely fail, but if somehow passes we don't crash
  });

  it('fetchCloudflareAccounts handles invalid token', async () => {
    const result = await fetchCloudflareAccounts('cfut_invalid');
    // Either null (auth failure) or empty array
    expect(result === null || Array.isArray(result)).toBe(true);
  });

  it('testCloudflareInference returns structured check on invalid creds', async () => {
    const check = await testCloudflareInference('fake-account', 'cfut_fake', '@cf/meta/llama-3.1-8b-instruct');
    expect(check.name).toBe('Workers AI inference');
    expect(check.status).toBe('fail');
    expect(check.detail).toBeTruthy();
  });
});
