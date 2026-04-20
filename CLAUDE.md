# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

slaminar — Claude Code 전용 프로젝트 분석 및 지능형 세팅 도구. 프로젝트를 스캔/분석하고, Claude Code 생태계 도구를 지능적으로 추천하며, CLAUDE.md와 플러그인을 자동 생성합니다.

## Build & Development Commands

- `npm run build` — TypeScript 컴파일 (tsc)
- `npm run dev` — 개발 모드 (tsx src/cli.ts)
- `npm test` — 테스트 실행 (vitest run)
- `npm run test:watch` — 테스트 워치 모드

## Architecture

Pipeline-based CLI tool with 7-phase processing:

```
scan → analyze → recommend → plan → generate → place → verify
```

Each phase produces a JSON-serializable IR passed to the next.

### Key Directories

- `src/scanner/` — 4 modules: file-tree, git-info, ai-files, package-info
- `src/analyzer/` — 5 modules: language-detector, structure-mapper, convention-extractor, dependency-analyzer, maturity-detector
- `src/recommender/` — 11 modules: catalog, catalog-resolver, catalog-cache (per-source in v0.8), catalog-remote, catalog-diff, catalog-merger (N-way stack merge in v0.8), catalog-sources (v0.8 federation), scorer, conflict-detector, recommender, installer
- `src/generator/` — claude-md (with ownership markers), claude-plugin, ai-provider (Claude API fallback)
- `src/placer/` — backup (obfuscated .dat), markers (section merge), writer
- `src/validator/` — claude-md validator, plugin-schema validator
- `src/reporter/` — terminal (chalk tables), markdown reports, discovery-table (v0.7)
- `src/team/` — config split (team/local)
- `src/rollback/` — uninstaller, removeTool
- `src/ci/` — check with exit codes
- `src/runtime/` — prerequisite checker, runtime detector (Node/Python/uv/volta)
- `src/skill/` — SKILL.md (Claude Code `/slaminar` skill, path-parameterized) + installer.ts + post-install.ts (auto-deploys to `~/.claude/skills/slaminar/`)
- `src/setup/` — 전역 첫 실행 경험: wizard.ts (`slaminar setup`, 6단계 — Step 6는 discovery), defaults.ts (`~/.config/slaminar/defaults.json` I/O), doctor.ts (`slaminar doctor`), update-check.ts (주간 npm 버전 체크)
- `src/discover/` — v0.7 프로젝트 발견/일괄 적용: scanner.ts (루트 워커), detector.ts (분류기), cache.ts (24h TTL), batch.ts (sequential init/update + 감사 로그), team-import.ts (팀 `catalogUrl`을 사용자 defaults로 복사)
- `src/version.ts` — runtime 버전 문자열 단일 소스

### Key Patterns

- All shell execution uses `execFileSync` (never `execSync`) for injection safety
- Ownership markers (`<!-- slaminar:begin:SECTION -->`) track generated sections in CLAUDE.md
- Backup files use obfuscated names: `.slaminar/.bk/{hex6}_{timestamp}.dat`
- Team config (committed) vs local config (gitignored) split

## Conventions

- TypeScript ESM (`"type": "module"`)
- Vitest for testing (TDD pattern)
- Types centralized in `src/types/index.ts`
- Korean-first documentation (narrative). User-facing CLI prompts are English-only (since v0.8.1)

## Release Policy

- **Version bumps are patch-only** (`0.8.1 → 0.8.2 → 0.8.3 …`). Never auto-bump minor/major unless the user explicitly asks. User-level directive recorded 2026-04-17.
- Keep both `package.json:version` and `src/version.ts:SLAMINAR_VERSION` in sync
- CHANGELOG entries stack per patch release; use the same release commit style: `chore(release): vX.Y.Z — <theme>`
- `prepublishOnly` runs build+test automatically on `npm publish` — treat it as the safety gate, not a manual checklist
<!-- slaminar:begin:overview -->
## Overview (slaminar-managed)

slaminar is a Claude Code-focused project analyzer and setup tool, published as the `slaminar` npm binary (`dist/cli.js`). It inspects a target repository, scores community tools from a catalog (46+ entries with federation support in v0.8), and generates a tailored `CLAUDE.md` + Claude Code plugin (`.claude/plugins/slaminar-generated/`) so that Claude Code can work productively in that repo.

- **Project type:** TypeScript ESM CLI (`commander`-based), Node ≥18
- **Self-installing skill:** `postinstall` auto-deploys a `/slaminar` skill to `~/.claude/skills/slaminar/`
- **Current focus (v0.9.x):** system QA — fault injection, rollback integrity, file locking, performance baselines
- **Stage:** `growing` per analyzer (active, versioned, test-covered, but pre-1.0)
<!-- slaminar:end:overview -->
<!-- slaminar:begin:commands -->
## Build & Development Commands (slaminar-managed)

Everyday workflows:

- `npm run build` — `tsc` + copy assets (via `scripts/copy-assets.mjs`)
- `npm run dev` — run the CLI from source with `tsx` (e.g. `npm run dev -- init --dry-run .`)
- `npm test` — unit tests (`vitest run`)
- `npm run test:watch` — watch mode for TDD
- `npm run test:e2e` — builds then runs vitest with `E2E=1`
- `npm run test:all` — unit + e2e in sequence

Benchmarks & release:

- `npm run bench` — CLI + library benchmarks (`scripts/bench-*.mjs`)
- `npm run release:patch` — `npm version patch` with tag + commit (per repo policy, patch-only is the default)
- `prepublishOnly` auto-runs `build && test` on `npm publish`
<!-- slaminar:end:commands -->
<!-- slaminar:begin:architecture -->
## Architecture (slaminar-managed)

Entry point: `src/cli.ts` (registered as the `slaminar` bin). The CLI dispatches to a 7-phase pipeline, each phase producing a JSON-serialisable IR passed to the next:

```
scan → analyze → recommend → plan → generate → place → verify
```

Notable top-level directories beyond the seven phases (see pre-marker "Key Directories" for the full breakdown):

- `src/core/` — shared pipeline plumbing and IR types
- `src/planner/` — per-phase plan/IR assembly
- `src/locking/` — `proper-lockfile`-based mutual exclusion for concurrent `slaminar init`/`update` (added in v0.9.3)
- `src/auth/` — credential/config helpers for catalog federation
- `src/runtime/` — prerequisite + runtime detector (Node / Python / uv / volta)
- `src/skill/` — `/slaminar` Claude Code skill installer, auto-deployed via `postinstall`
- `src/setup/` & `src/discover/` — first-run wizard and bulk project discovery

Tests live next to code under each module as `*.test.ts` and run under `vitest`. E2E suites are gated by the `E2E=1` env var.
<!-- slaminar:end:architecture -->
<!-- slaminar:begin:conventions -->
## Conventions (slaminar-managed)

- **TypeScript ESM** — `"type": "module"` in `package.json`; import paths use `.js` extensions even for `.ts` sources
- **Shell safety** — all external processes go through `execFileSync` with argv arrays; `execSync` with string commands is banned for injection safety
- **Ownership markers** — every section slaminar writes is wrapped in paired `begin:`/`end:` HTML comments so `slaminar update` can merge only its own regions (everything outside the markers is user-owned)
- **Obfuscated backups** — mutations to user files go through `src/placer/backup` which writes `.slaminar/.bk/{hex6}_{timestamp}.dat` to avoid accidental `git add .` of user content
- **Config split** — team-level catalog config is committed, per-user local config is `.gitignore`d
- **Testing** — `vitest` with co-located `*.test.ts`; prefer TDD for new rules in the scanner/analyzer/recommender layers
- **Commits** — conventional commits; release commits are `chore(release): vX.Y.Z — <theme>`
- **Docs** — narrative docs are Korean-first; user-facing CLI prompts are English-only (since v0.8.1)
<!-- slaminar:end:conventions -->
<!-- slaminar:begin:dependencies -->
## Key Dependencies (slaminar-managed)

Runtime:

- **commander** — CLI argument parsing and subcommand routing (`init`, `update`, `check`, `doctor`, `skill`, `discover`, …)
- **@inquirer/prompts** — interactive prompts for `slaminar setup` wizard and `slaminar init` approval flows
- **chalk** + **cli-table3** — terminal colour + tabular output for the reporter
- **proper-lockfile** — advisory file locks guarding concurrent mutations (v0.9.3 rollback-integrity work)
- **open** — launches the browser for OAuth / external catalog auth flows

Development:

- **vitest** — unit + e2e test runner; E2E gated behind `E2E=1`
- **tsx** — ad-hoc TypeScript execution for `npm run dev`
- **msw** — HTTP mocking for catalog federation tests
- **@types/node**, **@types/proper-lockfile** — type shims for Node APIs and the lock library
<!-- slaminar:end:dependencies -->
