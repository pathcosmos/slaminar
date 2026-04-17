/**
 * Interactive authentication wizard for `slaminar login`.
 */

import { select, password, confirm } from '@inquirer/prompts';
import open from 'open';
import chalk from 'chalk';
import { CLOUDFLARE_MODELS, ANTHROPIC_MODELS, getDefaultModel, findModel } from './models.js';
import type { ModelInfo } from './models.js';
import { input } from '@inquirer/prompts';

type Provider = 'cloudflare' | 'anthropic';

/**
 * Returns the recommended model id without prompting when the choice is
 * obvious (single option, or exactly one flagged `recommended: true`).
 * Only falls back to an interactive picker when the user has a real choice
 * to make — avoids forcing a decision on a first-time user who can't yet
 * tell Llama 70B from Qwen Coder.
 */
async function selectModel(provider: Provider, models: ModelInfo[]): Promise<string> {
  if (models.length === 1) {
    console.log(chalk.dim(`  Using model: ${chalk.bold(models[0].name)} (only option available)`));
    return models[0].id;
  }
  const defaultId = getDefaultModel(provider);
  const defaultModel = findModel(provider, defaultId);
  if (defaultModel && defaultModel.recommended) {
    console.log(
      chalk.dim(
        `  Using recommended model: ${chalk.bold(defaultModel.name)} ` +
          chalk.dim(`(change later with \`slaminar setup --reconfigure auth\`)`),
      ),
    );
    return defaultModel.id;
  }
  return await select({
    message: 'Model to use:',
    choices: models.map((m) => ({
      name: `${m.name}${m.recommended ? chalk.yellow(' ★ Recommended') : ''} — ${chalk.dim(m.description)}`,
      value: m.id,
      short: m.name,
    })),
    default: defaultId,
  });
}
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
  console.log(chalk.dim('  1. Dashboard → My Profile → API Tokens → Create Token → Custom Token'));
  console.log(chalk.dim('  2. Permissions (add all three — skip the last two and you\'ll be asked'));
  console.log(chalk.dim('     to paste your Account ID manually):'));
  console.log(chalk.dim('       • Account → Workers AI → Read  (required)'));
  console.log(chalk.dim('       • User    → Memberships → Read  (lets us auto-detect your account)'));
  console.log(chalk.dim('       • User    → User Details → Read  (shows your email after login)'));
  console.log(chalk.dim('  3. Account Resources: include your own account'));
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
    console.log(chalk.dim('    Tip: add "User → Memberships → Read" permission next time to skip this step.'));
    console.log(chalk.dim('    Where to find Account ID:'));
    console.log(chalk.dim('      1. Open https://dash.cloudflare.com in your browser'));
    console.log(chalk.dim('      2. Right sidebar → "Account ID" → click to copy'));
    console.log(chalk.dim('      (32-character hexadecimal, looks like: a1b2c3d4e5f6...)\n'));

    accountId = await input({
      message: 'Paste your Cloudflare Account ID:',
      validate: (v: string) =>
        /^[a-f0-9]{32}$/i.test(v.trim()) ||
        'That doesn\'t look right — Account ID is 32 hex characters (no spaces/dashes)',
    });
    accountId = accountId.trim();
    console.log(chalk.dim(`  ✓ Got it (${accountId.slice(0, 8)}...${accountId.slice(-4)})`));
  }

  // Select model — skips the prompt when the recommended choice is clear.
  const model = await selectModel('cloudflare', CLOUDFLARE_MODELS);

  // Final diagnostics — actual inference test (IS5: concise output)
  console.log('\n' + chalk.dim('Verifying connection...'));
  const diagResult = await runCloudflareDiagnostics(apiToken, accountId, model);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\nConnection test failed. Details:\n'));
    printDiagnostics(diagResult.checks);
    console.log(chalk.red('\nConfiguration not saved.\n'));
    return false;
  }
  console.log(`  ${chalk.green('✓')} Connection verified`);

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

  console.log('\n' + chalk.dim('Verifying connection...'));
  const diagResult = await runAnthropicDiagnostics(apiKey);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\nAuthentication failed. Details:\n'));
    printDiagnostics(diagResult.checks);
    console.log(chalk.red('\nPlease check your key.\n'));
    return false;
  }
  console.log(`  ${chalk.green('✓')} Connection verified`);

  const model = await selectModel('anthropic', ANTHROPIC_MODELS);

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
