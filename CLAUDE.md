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
## Overview

slaminar — Claude Code 생태계 전용 프로젝트 분석/세팅 CLI (`npm` bin: `slaminar` → `dist/cli.js`, Node ≥18). 대상 리포를 `scan → analyze → recommend → plan → generate → place → verify` 7단계 파이프라인으로 처리해 테일러드 `CLAUDE.md`와 `.claude/plugins/slaminar-generated/` 플러그인을 자동 생성하고, 페더레이션 가능한 카탈로그에서 커뮤니티 도구를 점수 매겨 추천합니다. `postinstall` 훅이 `/slaminar` 스킬을 `~/.claude/skills/slaminar/`에 자동 배포합니다.

- **Language:** TypeScript (ESM, `"type": "module"`)
- **Pattern:** CLI (commander-based, 7-phase pipeline)
- **Maturity:** growing — active, versioned, test-covered, pre-1.0
- **Current line:** v0.9.x system-QA series (fault injection, rollback integrity, file locking, performance baselines)
<!-- slaminar:end:overview -->
<!-- slaminar:begin:commands -->
## Build & Development Commands

Everyday:

- `npm run build` — `tsc` + `scripts/copy-assets.mjs` (copies non-TS assets into `dist/`)
- `npm run dev` — run CLI from source via `tsx` (e.g. `npm run dev -- init --dry-run .`)
- `npm test` — unit tests (`vitest run`)
- `npm run test:watch` — watch mode (TDD loop)
- `npm run test:e2e` — build, then `E2E=1 vitest run` (gates the e2e suites)
- `npm run test:all` — unit + e2e in sequence

Release & benchmarks:

- `npm run bench` — `bench:cli` + `bench:lib` (`scripts/bench-*.mjs`)
- `npm run verify:catalog` — catalog integrity audit (v0.9.6 addition)
- `npm run release:patch` — `npm version patch` with tag + commit (**patch-only is repo policy**; `release:minor`/`release:major` exist but require explicit user approval)
- `prepublishOnly` (auto) — runs `build && test` on `npm publish` as the safety gate
- `postinstall` (auto) — installs `/slaminar` skill to `~/.claude/skills/slaminar/` (silent on failure)
<!-- slaminar:end:commands -->
<!-- slaminar:begin:architecture -->
## Architecture

Entry point: `src/cli.ts` → `dist/cli.js` (registered as the `slaminar` bin). Commander dispatches to a 7-phase pipeline, each phase producing a JSON-serialisable IR passed to the next:

```
scan → analyze → recommend → plan → generate → place → verify
```

Top-level modules under `src/` (20 directories):

- **Pipeline phases** — `scanner/`, `analyzer/`, `recommender/`, `planner/`, `generator/`, `placer/`, `validator/`
- **Reporting & CI** — `reporter/` (chalk tables, markdown reports), `ci/` (exit-code-driven checks for `slaminar check`)
- **Runtime & setup** — `runtime/` (prereq + runtime detector), `setup/` (`slaminar setup` wizard), `discover/` (bulk project discovery)
- **Catalog ecosystem** — all in `recommender/` (catalog, catalog-resolver, catalog-cache, catalog-remote, catalog-diff, catalog-merger, catalog-sources federation, scorer, conflict-detector, installer)
- **Skill self-install** — `skill/` (SKILL.md + installer.ts + post-install.ts auto-deploying `/slaminar` to `~/.claude/skills/slaminar/`)
- **Safety & state** — `locking/` (`proper-lockfile` mutual exclusion, v0.9.3), `rollback/` (uninstaller, removeTool), `placer/backup` (obfuscated `.slaminar/.bk/{hex6}_{timestamp}.dat`)
- **Config** — `team/` (team/local split), `auth/` (catalog federation credentials), `core/` (shared IR types)
- **Meta** — `cli.ts`, `version.ts` (single source for `SLAMINAR_VERSION`), `types/index.ts` (centralised types)

Tests live next to code as co-located `*.test.ts` under `vitest`. E2E suites are gated by the `E2E=1` env var (see `npm run test:e2e`).
<!-- slaminar:end:architecture -->
<!-- slaminar:begin:conventions -->
## Conventions

- **TypeScript ESM** — `"type": "module"`; import paths use `.js` extensions even for `.ts` sources (ESM resolution requirement)
- **Shell safety invariant** — all external processes go through `execFileSync` with argv arrays; `execSync` with string commands is banned (injection safety)
- **Ownership markers** — every section slaminar writes is wrapped in paired `<!-- slaminar:begin:X -->` / `<!-- slaminar:end:X -->` HTML comments; everything outside them is user-owned and `slaminar update` won't touch it
- **Obfuscated backups** — user-file mutations write `.slaminar/.bk/{hex6}_{timestamp}.dat` to avoid accidental `git add .` of user content
- **Config split** — team-level catalog config is committed; per-user local config is `.gitignore`d
- **Testing** — `vitest` with co-located `*.test.ts`; TDD preferred for new rules in scanner/analyzer/recommender
- **Commits** — conventional commits; release commits are `chore(release): vX.Y.Z — <theme>`
- **Docs language** — Korean-first for narrative docs; user-facing CLI prompts are English-only (since v0.8.1)
- **Release policy** — patch-only bumps unless the user explicitly asks for minor/major; keep `package.json:version` and `src/version.ts:SLAMINAR_VERSION` in sync
- **Types** — centralised in `src/types/index.ts`; version string single-sourced from `src/version.ts`
<!-- slaminar:end:conventions -->
<!-- slaminar:begin:dependencies -->
## Key Dependencies

Runtime (`dependencies`):

- **commander** — CLI argv parsing and subcommand routing (`init`, `update`, `check`, `doctor`, `skill`, `discover`, `recommend`, `uninstall`, `status`, `setup`)
- **@inquirer/prompts** — interactive prompts for the `setup` wizard and `init` approval flows
- **chalk** + **cli-table3** — terminal colour + tabular output in the reporter
- **proper-lockfile** — advisory file locks guarding concurrent `init`/`update` mutations (v0.9.3 rollback-integrity work)
- **open** — launches the browser for OAuth / external catalog auth flows

Development (`devDependencies`):

- **vitest** — unit + e2e test runner (E2E gated by `E2E=1`)
- **tsx** — ad-hoc TypeScript execution for `npm run dev`
- **msw** — HTTP mocking for catalog federation tests
- **typescript**, **@types/node**, **@types/proper-lockfile** — type shims
<!-- slaminar:end:dependencies -->
