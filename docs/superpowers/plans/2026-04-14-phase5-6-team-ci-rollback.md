# Phase 5+6: Team, Incremental Updates, CI & Rollback

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development.

**Goal:** Add team config management (shared/personal split), incremental updates, rollback/uninstall, and CI validation — completing all planned slaminar features.

**Tech Stack:** TypeScript, vitest

---

### Task 1: Team Config Management

Create `src/team/config.ts` + test.
- `loadTeamConfig(root)` — read `.slaminar/config.json`
- `loadLocalConfig(root)` — read `.slaminar/config.local.json`
- `saveTeamConfig(root, config)` — write team config
- `saveLocalConfig(root, config)` — write local config
- `ensureGitignore(root)` — create `.slaminar/.gitignore` with local-only entries

### Task 2: Incremental Updater

Create `src/core/updater.ts` + test.
- `update(targetPath)` — re-scan, diff against previous state, update only changed sections via markers
- Uses state tracking to detect what changed

### Task 3: Rollback (uninstall + remove)

Create `src/rollback/uninstaller.ts` + test.
- `uninstall(root)` — restore all backups, remove slaminar-generated files, remove .slaminar/
- `removeTool(root, toolName)` — remove specific tool from config

### Task 4: CI Check

Create `src/ci/check.ts` + test.
- `runCheck(root)` — non-interactive validation, returns exit code
- Reuses verify() + staleness detection

### Task 5: Wire all CLI commands

Add: `slaminar update`, `slaminar uninstall`, `slaminar remove <tool>`, `slaminar check --ci`

### Task 6: Integration + CLAUDE.md
