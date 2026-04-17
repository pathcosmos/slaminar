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
- Korean-first documentation
