import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock @inquirer/prompts before the module under test imports it.
// Each test overrides the `select` return value via `mockSelect`.
const mockSelect = vi.fn();
vi.mock('@inquirer/prompts', () => ({
  select: (...args: unknown[]) => mockSelect(...args),
}));

// Mock the login wizard so provider-select tests don't trigger real network calls.
const mockRunLoginWizardForProvider = vi.fn();
vi.mock('../../src/auth/wizard.js', () => ({
  runLoginWizardForProvider: (p: unknown) => mockRunLoginWizardForProvider(p),
}));

// Import AFTER mocks are registered.
import { runInlineAuthPrompt } from '../../src/setup/inline-prompt.js';

describe('setup/inline-prompt', () => {
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    mockSelect.mockReset();
    mockRunLoginWizardForProvider.mockReset();
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('returns { choice: "skip", authSucceeded: false } when user picks Skip', async () => {
    mockSelect.mockResolvedValueOnce('skip');

    const result = await runInlineAuthPrompt();

    expect(result).toEqual({ choice: 'skip', authSucceeded: false });
    expect(mockRunLoginWizardForProvider).not.toHaveBeenCalled();
  });

  it('delegates to runLoginWizardForProvider when Cloudflare is picked', async () => {
    mockSelect.mockResolvedValueOnce('cloudflare');
    mockRunLoginWizardForProvider.mockResolvedValueOnce(true);

    const result = await runInlineAuthPrompt();

    expect(result).toEqual({ choice: 'cloudflare', authSucceeded: true });
    expect(mockRunLoginWizardForProvider).toHaveBeenCalledTimes(1);
    expect(mockRunLoginWizardForProvider).toHaveBeenCalledWith('cloudflare');
  });

  it('delegates to runLoginWizardForProvider when Anthropic is picked', async () => {
    mockSelect.mockResolvedValueOnce('anthropic');
    mockRunLoginWizardForProvider.mockResolvedValueOnce(true);

    const result = await runInlineAuthPrompt();

    expect(result).toEqual({ choice: 'anthropic', authSucceeded: true });
    expect(mockRunLoginWizardForProvider).toHaveBeenCalledWith('anthropic');
  });

  it('reports authSucceeded=false when the wizard returns false', async () => {
    mockSelect.mockResolvedValueOnce('cloudflare');
    mockRunLoginWizardForProvider.mockResolvedValueOnce(false);

    const result = await runInlineAuthPrompt();

    expect(result).toEqual({ choice: 'cloudflare', authSucceeded: false });
  });

  it('prints the welcome banner so the user knows the question is optional', async () => {
    mockSelect.mockResolvedValueOnce('skip');

    await runInlineAuthPrompt();

    const printedLines = consoleLogSpy.mock.calls.map((args) => args.join(' '));
    const combined = printedLines.join('\n');
    expect(combined).toMatch(/Welcome to slaminar/);
    expect(combined).toMatch(/slaminar setup --reconfigure/);
  });
});
