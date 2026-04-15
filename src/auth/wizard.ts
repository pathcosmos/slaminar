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
  console.log(chalk.dim('토큰 생성 방법:'));
  console.log(chalk.dim('  1. Dashboard → My Profile → API Tokens → Create Token'));
  console.log(chalk.dim('  2. Custom Token → Permissions: Account · Workers AI · Read'));
  console.log(chalk.dim('  3. Account Resources: 본인 계정 선택'));
  console.log(chalk.dim(`  URL: ${CF_TOKEN_URL}\n`));

  const openBrowser = await confirm({
    message: '지금 브라우저에서 토큰 생성 페이지를 열까요?',
    default: true,
  });
  if (openBrowser) {
    try {
      await open(CF_TOKEN_URL);
    } catch {
      console.log(chalk.yellow(`\n브라우저를 열 수 없습니다. 수동으로 접속하세요: ${CF_TOKEN_URL}\n`));
    }
  }

  const apiToken = await password({
    message: 'Cloudflare API Token:',
    mask: '*',
    validate: (v: string) => v.length > 10 || '토큰이 너무 짧습니다',
  });

  // Verify token + fetch user info
  console.log('\n' + chalk.dim('인증 확인 중...'));
  const tokenCheck = await verifyCloudflareToken(apiToken);
  printDiagnostics([tokenCheck]);

  if (tokenCheck.status !== 'pass') {
    console.log(chalk.red('\n토큰이 유효하지 않습니다. 다시 시도해 주세요.\n'));
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
      console.log(`  ${chalk.green('✓')} 계정 자동 감지: ${chalk.bold(accountName)}`);
    } else {
      accountId = await select({
        message: '사용할 Cloudflare 계정:',
        choices: accounts.map(a => ({ name: a.name, value: a.id })),
      });
      accountName = accounts.find(a => a.id === accountId)!.name;
    }
  } else {
    // Fallback: manual entry
    console.log(chalk.yellow('\n  ! 계정을 자동 감지할 수 없습니다.'));
    console.log(chalk.dim('    자동 감지를 원하면 토큰에 "User → Memberships → Read" 권한을 추가하세요.'));
    console.log(chalk.dim('    Account ID는 Cloudflare 대시보드 오른쪽 사이드바에서 확인할 수 있습니다.\n'));

    accountId = await input({
      message: 'Cloudflare Account ID:',
      validate: (v: string) =>
        /^[a-f0-9]{32}$/i.test(v.trim()) || 'Account ID는 32자리 hex 문자열입니다',
    });
    accountId = accountId.trim();
  }

  // Select model
  const model = await select({
    message: '사용할 모델:',
    choices: CLOUDFLARE_MODELS.map(m => ({
      name: `${m.name}${m.recommended ? chalk.yellow(' ★ 추천') : ''} — ${chalk.dim(m.description)}`,
      value: m.id,
      short: m.name,
    })),
    default: getDefaultModel('cloudflare'),
  });

  // Final diagnostics — actual inference test
  console.log('\n' + chalk.dim('실제 추론 호출 테스트...'));
  const diagResult = await runCloudflareDiagnostics(apiToken, accountId, model);
  printDiagnostics(diagResult.checks);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\n일부 체크 실패. 설정을 저장하지 않습니다.\n'));
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
  console.log(chalk.green(`\n✓ ${path} 저장 완료 (권한 0600)\n`));
  console.log('로그인 완료! 이제 어느 프로젝트에서든 ' + chalk.bold('slaminar init') + ' 을 실행하세요.\n');
  return true;
}

async function setupAnthropic(): Promise<boolean> {
  console.log(chalk.bold('\n─── Anthropic Claude API ────────────────────────────────\n'));
  console.log(chalk.dim(`API 키 발급: ${ANTHROPIC_CONSOLE_URL}\n`));

  const openBrowser = await confirm({ message: '브라우저를 열까요?', default: true });
  if (openBrowser) {
    try { await open(ANTHROPIC_CONSOLE_URL); } catch { /* skip */ }
  }

  const apiKey = await password({
    message: 'Anthropic API Key (sk-ant-...):',
    mask: '*',
    validate: (v: string) => v.startsWith('sk-ant-') || 'sk-ant- 으로 시작해야 합니다',
  });

  console.log('\n' + chalk.dim('API 호출 테스트...'));
  const diagResult = await runAnthropicDiagnostics(apiKey);
  printDiagnostics(diagResult.checks);
  if (!diagResult.overallPass) {
    console.log(chalk.red('\n인증 실패. 키를 확인해 주세요.\n'));
    return false;
  }

  const model = await select({
    message: '사용할 모델:',
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
  console.log(chalk.green(`\n✓ ${path} 저장 완료\n`));
  return true;
}

export async function runLoginWizard(): Promise<boolean> {
  console.log(chalk.bold('\n━━━ slaminar Login ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));

  const provider = (await select({
    message: '어떤 AI 프로바이더를 사용하시겠어요?',
    choices: [
      { name: 'Cloudflare Workers AI  ' + chalk.dim('(무료 10K/일 · 추천)'), value: 'cloudflare' as AuthProvider },
      { name: 'Anthropic Claude API   ' + chalk.dim('(유료 · 최고 품질)'), value: 'anthropic' as AuthProvider },
    ],
    default: 'cloudflare' as AuthProvider,
  })) as AuthProvider;

  if (provider === 'cloudflare') return setupCloudflare();
  return setupAnthropic();
}
