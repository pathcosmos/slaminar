/**
 * Mini-setup prompt used by `slaminar init` when `~/.config/slaminar/defaults.json`
 * is absent. Asks a single question (AI provider: Skip / Cloudflare / Anthropic)
 * and delegates provider-specific work to the existing login wizard via the
 * `runLoginWizardForProvider` entry point.
 *
 * Return value tells the caller whether auth actually succeeded. Skip is its
 * own success path — we still save defaults.json so future runs stay silent.
 * A provider picked + auth failed is a hard error: the caller should abort
 * init and surface recovery options.
 */

import { select } from '@inquirer/prompts';
import chalk from 'chalk';
import { runLoginWizardForProvider } from '../auth/wizard.js';

export type MiniSetupChoice = 'skip' | 'cloudflare' | 'anthropic';

export interface MiniSetupResult {
  choice: MiniSetupChoice;
  authSucceeded: boolean;
}

export async function runInlineAuthPrompt(): Promise<MiniSetupResult> {
  console.log(chalk.bold('\nWelcome to slaminar.') + chalk.dim(' One quick question before we scan your project.'));
  console.log(
    chalk.dim(
      '  (What you pick is saved as a default. You can change it anytime with `slaminar setup --reconfigure`.)\n',
    ),
  );

  const choice = (await select({
    message: 'AI provider for CLAUDE.md enhancement:',
    choices: [
      { name: 'Skip — local rules only ' + chalk.dim('(you can add AI later)'), value: 'skip' },
      { name: 'Cloudflare Workers AI  ' + chalk.dim('(free 10K/day · paste one token)'), value: 'cloudflare' },
      { name: 'Anthropic Claude API   ' + chalk.dim('(paid · paste one key)'), value: 'anthropic' },
    ],
    default: 'skip',
  })) as MiniSetupChoice;

  if (choice === 'skip') {
    return { choice, authSucceeded: false };
  }

  const authSucceeded = await runLoginWizardForProvider(choice);
  return { choice, authSucceeded };
}
