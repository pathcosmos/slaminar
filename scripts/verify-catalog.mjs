#!/usr/bin/env node
// One-off audit: verify every tool entry in catalog/catalog.json actually resolves.
//
// Checks per install method:
//   git-clone    → GitHub API GET /repos/{owner}/{name}
//   npx          → `npm view <pkg>` + rough description-match heuristic
//   pip          → https://pypi.org/pypi/<pkg>/json
//   marketplace  → unverified (no public registry for Claude Code /install-plugin names)
//
// Output: prints summary + failure table, writes full JSON to catalog-audit.json.

import { readFileSync, writeFileSync } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const runFile = promisify(execFile);
const CATALOG_PATH = 'catalog/catalog.json';
const OUT_PATH = 'catalog-audit.json';
const CONCURRENCY = 6;

const catalog = JSON.parse(readFileSync(CATALOG_PATH, 'utf-8'));

function parseGitClone(cmd) {
  const m = cmd.match(/git\s+clone\s+(\S+?)(?:\.git)?(?:\s|$)/);
  if (!m) return null;
  return m[1];
}

function parseGithubUrl(url) {
  const m = url.match(/^https?:\/\/github\.com\/([^\/]+)\/([^\/\s]+?)(?:\.git)?$/);
  return m ? { owner: m[1], name: m[2] } : null;
}

async function checkGitClone(tool) {
  const cmd = tool.installCommands[0] ?? '';
  const url = parseGitClone(cmd);
  if (!url) return { status: 'parse-error', detail: cmd };
  const gh = parseGithubUrl(url);
  if (!gh) return { status: 'non-github', detail: url };
  try {
    const headers = {
      'User-Agent': 'slaminar-catalog-audit',
      Accept: 'application/vnd.github+json',
    };
    // GITHUB_TOKEN bumps the rate limit from 60/hr to 5000/hr — critical when
    // the catalog has >25 git-clone entries.
    if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
    const r = await fetch(`https://api.github.com/repos/${gh.owner}/${gh.name}`, { headers });
    if (r.status === 404) return { status: 'gh-404', detail: `${gh.owner}/${gh.name}` };
    if (r.status === 403) {
      const ra = r.headers.get('x-ratelimit-remaining');
      return { status: 'gh-ratelimit', detail: `remaining=${ra}` };
    }
    if (!r.ok) return { status: `gh-${r.status}`, detail: `${gh.owner}/${gh.name}` };
    const j = await r.json();
    return {
      status: 'ok',
      detail: `${gh.owner}/${gh.name} stars=${j.stargazers_count} archived=${j.archived}`,
    };
  } catch (e) {
    return { status: 'network-error', detail: String(e.message || e) };
  }
}

// Accepts: `npx [-y|-p] <pkg>`, `npm install -g <pkg>`, `npm install -D <pkg>`,
// `npm install <pkg>`, `npm init <template>`. Returns the bare package
// identifier (scoped `@foo/bar` supported). Strips trailing `@version`.
function parseNpmPkg(cmd) {
  const npxMatch = cmd.match(/\bnpx\s+(?:-[yp]\s+)?(@?[\w.-]+(?:\/[\w.-]+)?)/);
  const installMatch = cmd.match(/\bnpm\s+install\s+(?:-[gDS]+\s+)?(@?[\w.-]+(?:\/[\w.-]+)?)/);
  const initMatch = cmd.match(/\bnpm\s+init\s+(@?[\w.-]+(?:\/[\w.-]+)?)/);
  const raw = npxMatch?.[1] ?? installMatch?.[1] ?? initMatch?.[1] ?? null;
  if (!raw) return null;
  // Strip `@version` suffix — `slidev@latest` → `slidev`. Keep scoped @-prefix.
  const atIdx = raw.lastIndexOf('@');
  const base = atIdx > 0 ? raw.slice(0, atIdx) : raw;
  // `npm init foo` invokes the `create-foo` package under the hood; similarly
  // `npm init @scope/foo` resolves to `@scope/create-foo`.
  if (initMatch) {
    if (base.startsWith('@')) {
      const [scope, name] = base.slice(1).split('/');
      return name ? `@${scope}/create-${name}` : base;
    }
    return `create-${base}`;
  }
  return base;
}

function rawDescMatch(catDesc, pkgDesc) {
  if (!pkgDesc) return false;
  const distinctive = (s) =>
    new Set(
      (s.toLowerCase().match(/\b[a-z][a-z0-9-]{5,}\b/g) || []).filter(
        (w) => !['claude', 'plugin', 'skill', 'agent', 'helper', 'manage'].includes(w),
      ),
    );
  const a = distinctive(catDesc);
  const b = distinctive(pkgDesc);
  for (const w of a) if (b.has(w)) return true;
  return false;
}

async function checkNpm(tool) {
  const cmd = tool.installCommands[0] ?? '';
  const pkg = parseNpmPkg(cmd);
  if (!pkg) return { status: 'parse-error', detail: cmd };
  try {
    const { stdout } = await runFile(
      'npm',
      ['view', pkg, 'name', 'description', '--json'],
      { timeout: 30000 },
    );
    const j = JSON.parse(stdout || '{}');
    const desc = j.description ?? '';
    const match = rawDescMatch(tool.description, desc);
    return {
      status: match ? 'ok' : 'npm-desc-mismatch',
      detail: `"${desc}"`,
      pkg,
    };
  } catch (e) {
    const msg = (e.stderr?.toString() || e.message || '').split('\n')[0];
    if (/E404|code E404|not found/i.test(msg)) return { status: 'npm-404', detail: pkg };
    return { status: 'npm-error', detail: msg };
  }
}

function parsePipPkg(cmd) {
  const m = cmd.match(/pip\s+install\s+(-[a-zA-Z]+\s+)?([A-Za-z0-9][\w.-]*)/);
  return m ? m[2] : null;
}

async function checkPip(tool) {
  const cmd = tool.installCommands[0] ?? '';
  const pkg = parsePipPkg(cmd);
  if (!pkg) return { status: 'parse-error', detail: cmd };
  try {
    const r = await fetch(`https://pypi.org/pypi/${pkg}/json`, {
      headers: { 'User-Agent': 'slaminar-catalog-audit' },
    });
    if (r.status === 404) return { status: 'pypi-404', detail: pkg };
    if (!r.ok) return { status: `pypi-${r.status}`, detail: pkg };
    const j = await r.json();
    return { status: 'ok', detail: `${pkg} — "${j.info?.summary ?? ''}"` };
  } catch (e) {
    return { status: 'network-error', detail: String(e.message || e) };
  }
}

function checkMarketplace(tool) {
  const m = (tool.installCommands[0] || '').match(/install-plugin\s+(\S+)/);
  return { status: 'unverified', detail: m ? m[1] : tool.installCommands[0] };
}

async function verifyTool(tool) {
  if (tool.installMethod === 'git-clone') return checkGitClone(tool);
  if (['npx', 'npm-global', 'npm-dev', 'npm-init'].includes(tool.installMethod))
    return checkNpm(tool);
  if (tool.installMethod === 'pip') return checkPip(tool);
  if (tool.installMethod === 'marketplace') return checkMarketplace(tool);
  return { status: 'unknown-method', detail: tool.installMethod };
}

async function runPool(items, worker, limit) {
  const results = [];
  let idx = 0;
  const active = new Set();
  async function launch() {
    if (idx >= items.length) return;
    const i = idx++;
    const p = (async () => {
      results[i] = await worker(items[i]);
    })().finally(() => {
      active.delete(p);
    });
    active.add(p);
  }
  while (idx < items.length || active.size) {
    while (active.size < limit && idx < items.length) await launch();
    if (active.size) await Promise.race(active);
  }
  return results;
}

const results = await runPool(
  catalog.tools,
  async (t) => ({ name: t.name, method: t.installMethod, repo: t.repo, ...(await verifyTool(t)) }),
  CONCURRENCY,
);

results.sort((a, b) => {
  const bad = (r) => !['ok', 'unverified'].includes(r.status);
  if (bad(a) !== bad(b)) return bad(a) ? -1 : 1;
  return a.name.localeCompare(b.name);
});

const byStatus = {};
for (const r of results) byStatus[r.status] = (byStatus[r.status] || 0) + 1;

console.log(`Catalog version ${catalog.version}  updatedAt=${catalog.updatedAt}  tools=${results.length}`);
console.log('\n=== Status counts ===');
console.table(byStatus);

console.log('\n=== Entries needing attention ===');
const needAttention = results.filter((r) => !['ok', 'unverified'].includes(r.status));
if (needAttention.length === 0) console.log('(none)');
else {
  for (const r of needAttention) {
    console.log(`[${r.status}] ${r.name} (${r.method}) — ${r.detail}${r.pkg ? `  pkg=${r.pkg}` : ''}`);
  }
}

writeFileSync(OUT_PATH, JSON.stringify({ generatedAt: new Date().toISOString(), summary: byStatus, results }, null, 2));
console.log(`\nFull audit written to ${OUT_PATH}`);

// Non-zero exit if any real failure surfaces, so CI and local pre-commit
// hooks can gate on this. Allowed (non-failing) statuses:
//   ok              — verified
//   unverified      — marketplace entries with no public registry
//   npm-desc-mismatch — heuristic, not reliable enough to fail on
//   gh-ratelimit    — transient (GitHub API 60/hr unauth limit). CI should set
//                     GITHUB_TOKEN to lift this to 5000/hr.
const allowedStatuses = new Set(['ok', 'unverified', 'npm-desc-mismatch', 'gh-ratelimit']);
const hardFail = results.filter((r) => !allowedStatuses.has(r.status));
if (hardFail.length > 0) {
  console.error(`\n${hardFail.length} hard failure(s) — exiting 1`);
  process.exit(1);
}
