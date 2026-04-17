/**
 * Interactive authentication wizard for `slaminar login`.
 */

import { select, password, confirm } from '@inquirer/prompts';
import open from 'open';
import chalk from 'chalk';
import { CLOUDFLARE_MODELS, ANTHROPIC_MODELS, getDefaultModel } from './models.js';
import { input } from '@inquirer/prompts';
import {
  runCloudflareDiagnostics,
  runAnthropicDiagnostics,
  fetchCloudflareAccounts,
  fetchCloudflareUser,
  verifyCloudflareToken,
} from './diagnostics.js';
import { loadAuthConfig, saveAuthConfig, getAuthFilePath } from './config.js';
import type { AuthConfig, AuthProvider } from './config.js';

const CF_TOKEN_URL = 'https://dash.cloudflare.com/profile/api-tokens';
const ANTHROPIC_CONSOLE_URL = 'https://console.anthropic.com/settings/keys';

function printDiagnostics(checks: { name: string; status: string; detail: string; elapsedMs?: number }[]): void {
  for (const c of checks) {
    const icon = c.status === 'pass' ? chalk.green('✓') : c.status === 'fail' ? chalk.red('✗') : chalk.yellow('○');
    const elapsed = c.elapsedMs ? chalk.dim(` (${c.elapsedMs}ms)`) : '';
    console.log(`  ${icon} ${c.name}: ${c.detail}${elapsed}`);
  }
}

async function setupCloudflare(): Promise<boolean> {
  console.log(chalk.bold('\n─── Cloudflare Workers AI ────────────────────────────────\n'));
  console.log(chalk.dim('How to create a token:'));
  console.log(chalk.dim('  1. Dashboard → My Profile → API Tokens → Create Token'));
  console.log(chalk.dim('  2. Custom Token → Permissions: Account · Workers AI · Read'));
  console.log(chalk.dim('  3. Account Resources: select your own account'));
  console.log(chalk.dim(`  URL: ${CF_TOKEN_URL}\n`));

  const openBrowser = await confirm({
    message: 'Open the token creation page in your browser now?',
    default: true,
  });
  if (openBrowser) {
    try {
      await open(CF_TOKEN_URL);
    } catch {
      console.log(chalk.yellow(`\nCould not open the browser. Please visit manually: ${CF_TOKEN_URL}\n`));
    }
  }

  const apiToken = await password({
    message: 'Cloudflare API Token:',
    mask: '*',
    validate: (v: string) => v.length > 10 || 'Token looks too short',
  });

  // Verify token + fetch user info
  console.log('\n' + chalk.dim('Verifying token...'));
  const tokenCheck = await verifyCloudflareToken(apiToken);
  printDiagnostics([tokenCheck]);

  if (tokenCheck.status !== 'pass') {
    console.log(chalk.red('\nToken is not valid. Please try again.\n'));
    return false;
  }

  // Fetch user email if User:Read permission present (optional)
  const userInfo = await fetchCloudflareUser(apiToken);
  if (userInfo) {
    console.log(`  ${chalk.green('✓')} Signed in as ${chalk.bold(userInfo.email)}`);
  }

  // Auto-detect accounts
  const accounts = await fetchCloudflareAccounts(apiToken);

  let accountId: string;
  let accountName: string | undefined;

  if (accounts && accounts.length > 0) {
    // Auto-detection succeeded
    if (accounts.length === 1) {
      accountId = accounts[0].id;
      accountName = accounts[0].name;
      console.log(`  ${chalk.green('✓')} Account auto-detected: ${chalk.bold(accountName)}`);
    } else {
      accountId = await select({
        message: 'Cloudflare account to use:',
        choices: accounts.map(a => ({ name: a.name, value: a.id })),
      });
      accountName = accounts.find(a => a.id === accountId)!.name;
    }
  } else {
    // Fallback: manual entry
    console.log(chalk.yellow('\n  ! Could not auto-detect your account.'));
    console.log(chalk.dim('    For auto-detection, add "User → Memberships → Read" permission to your token.'));
    console.log(chalk.dim('    You can find your Account ID in the right sidebar of the Cloudflare dashboard.\n'));

    accountId = await input({
      message: 'Cloudflare Account ID:',
      validate: (v: string) =>
        /^[a-f0-9]{32}$/i.test(v.trim()) || 'Account ID must be a 32-character hex string',
    });
    accountId = accountId.trim();
  }

  // Select model
  const model = await select({
    message: 'Model to use:',
    choices: CLOUDFLARE_MODELS.map(m => ({
      name: `${m.name}${m.recommended ? chalk.yellow(' ★ Recommended') : ''} — ${chalk.dim(m.description)}`,
      value: m.id,
      short: m.name,
    })),
    default: getDefaultModel('cloudflare'),
  });

  // Final diagnostics — actual inference test
  console.log('\n' + chalk.dim('Running a real inference test...'));
  const diagResult = await runCloudflareDiagnostics(apiToken, accountId, model);
  printDiagnostics(diagResult.checks);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\nSome checks failed. Configuration not saved.\n'));
    return false;
  }

  // Save config
  const existing = loadAuthConfig();
  const config: AuthConfig = {
    version: 1,
    active: 'cloudflare',
    providers: {
      ...existing?.providers,
      cloudflare: { accountId, accountName, apiToken, model },
    },
    savedAt: new Date().toISOString(),
  };
  const path = saveAuthConfig(config);
  console.log(chalk.green(`\n✓ Saved to ${path} (mode 0600)\n`));
  console.log('Logged in! You can now run ' + chalk.bold('slaminar init') + ' in any project.\n');
  return true;
}

async function setupAnthropic(): Promise<boolean> {
  console.log(chalk.bold('\n─── Anthropic Claude API ────────────────────────────────\n'));
  console.log(chalk.dim(`Create an API key: ${ANTHROPIC_CONSOLE_URL}\n`));

  const openBrowser = await confirm({ message: 'Open the browser?', default: true });
  if (openBrowser) {
    try { await open(ANTHROPIC_CONSOLE_URL); } catch { /* skip */ }
  }

  const apiKey = await password({
    message: 'Anthropic API Key (sk-ant-...):',
    mask: '*',
    validate: (v: string) => v.startsWith('sk-ant-') || 'Key must start with "sk-ant-"',
  });

  console.log('\n' + chalk.dim('Testing API call...'));
  const diagResult = await runAnthropicDiagnostics(apiKey);
  printDiagnostics(diagResult.checks);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\nAuthentication failed. Please check your key.\n'));
    return false;
  }

  const model = await select({
    message: 'Model to use:',
    choices: ANTHROPIC_MODELS.map(m => ({
      name: `${m.name}${m.recommended ? chalk.yellow(' ★') : ''} — ${chalk.dim(m.description)}`,
      value: m.id,
    })),
    default: getDefaultModel('anthropic'),
  });

  const existing = loadAuthConfig();
  const config: AuthConfig = {
    version: 1,
    active: 'anthropic',
    providers: { ...existing?.providers, anthropic: { apiKey, model } },
    savedAt: new Date().toISOString(),
  };
  const path = saveAuthConfig(config);
  console.log(chalk.green(`\n✓ Saved to ${path}\n`));
  return true;
}

export async function runLoginWizard(): Promise<boolean> {
  console.log(chalk.bold('\n━━━ slaminar Login ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const provider = (await select({
    message: 'Which AI provider would you like to use?',
    choices: [
      { name: 'Cloudflare Workers AI  ' + chalk.dim('(free 10K/day · recommended)'), value: 'cloudflare' as AuthProvider },
      { name: 'Anthropic Claude API   ' + chalk.dim('(paid · top quality)'), value: 'anthropic' as AuthProvider },
    ],
    default: 'cloudflare' as AuthProvider,
  })) as AuthProvider;

  if (provider === 'cloudflare') return setupCloudflare();
  return setupAnthropic();
}
