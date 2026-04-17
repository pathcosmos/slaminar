# slaminar

[![Tests](https://img.shields.io/badge/tests-250%20passing-brightgreen)](https://github.com/pathcosmos/slaminar)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18-green)](https://nodejs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**Intelligent project analyzer and setup tool for Claude Code.**

Run `slaminar init` on any codebase and it will automatically analyze your project, generate a tailored CLAUDE.md, scaffold Claude Code plugins, and recommend the best ecosystem tools for your stack.

[Korean Documentation (한국어)](./README.ko.md)

---

## Table of Contents

- [Demo](#slaminar)
- [Features](#features)
- [Installation](#installation)
  - [Claude Code Skill Auto-Deployment](#claude-code-skill-auto-deployment)
- [Usage](#usage)
  - [First-Run Setup (v0.6+)](#first-run-setup-v06)
  - [Project Discovery & Batch Apply (v0.7+)](#project-discovery--batch-apply-v07)
  - [Environment Diagnostics (`slaminar doctor`)](#environment-diagnostics-slaminar-doctor)
  - [Claude Code Skill Reference](#claude-code-skill-reference)
- [Project Analysis](#project-analysis)
- [Generated Output](#generated-output)
- [Dynamic Catalog](#dynamic-catalog)
  - [Creating a Custom Catalog](#creating-a-custom-catalog)
  - [Persistent Catalog Configuration](#persistent-catalog-configuration)
  - [Catalog Federation (v0.8+)](#catalog-federation-v08)
- [Verification](#verification)
- [Error Handling & Safety](#error-handling--safety)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Development](#development)
- [Implementation History](#implementation-history)
- [Roadmap](#roadmap)
- [Project Stats](#project-stats)
- [FAQ](#faq)
- [Contributing](#contributing)
- [License](#license)

```
$ slaminar init /path/to/your-project

━━━ slaminar init complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Profile:
  ┌──────────┬────────────┐
  │ Name     │ your-app   │
  │ Language │ typescript │
  │ Pattern  │ spa        │
  │ Maturity │ growing    │
  └──────────┴────────────┘

  Generated Files:
  ┌──────────────────────────────────────────────────┬────────┐
  │ File                                             │ Action │
  ├──────────────────────────────────────────────────┼────────┤
  │ CLAUDE.md                                        │ create │
  │ .claude/plugins/slaminar-generated/plugin.json   │ create │
  │ .claude/plugins/slaminar-generated/skills/dev.md │ create │
  └──────────────────────────────────────────────────┴────────┘

  Recommended Tools:
  ┌──────────────────────┬───────┬─────────────┐
  │ Tool                 │ Score │ Install      │
  ├──────────────────────┼───────┼─────────────┤
  │ impeccable           │ 65    │ marketplace  │
  │ everything-claude-code│ 55   │ git-clone    │
  │ planning-with-files  │ 45    │ npx          │
  └──────────────────────┴───────┴─────────────┘

  Verification: ✅ 9/9 checks pass

  Report saved: .slaminar/reports/2026-04-14-init.md
```

---

## Features

### 7-Phase Pipeline

```
scan → analyze → recommend → plan → generate → place → verify
```

| Phase | What It Does |
|-------|-------------|
| **Scan** | Collects project structure, package manifests, Git history, AI context files, CI/CD config, and docs |
| **Analyze** | Detects language/framework, architecture pattern, coding conventions, dependencies, and maturity level |
| **Recommend** | Multi-dimensional scoring + conflict/synergy detection + maturity-based tool limits for smart recommendations |
| **Plan** | Builds a generation plan (which files to create or merge) |
| **Generate** | Produces CLAUDE.md (with ownership markers) + Claude Code plugin (plugin.json + skills) |
| **Place** | Backs up existing files with obfuscated names, then merges via marker-based sections |
| **Verify** | Validates CLAUDE.md commands, plugin.json schema, and generated file integrity |

### Smart Tool Recommendations

The tool catalog contains 46 Claude Code ecosystem tools (with an online catalog that can be updated independently of releases). slaminar automatically selects the right ones for your project.

**How it works:**
- Multi-dimensional scoring (language/framework match, maturity fit, tag overlap)
- Conflict and overlap detection (e.g., caveman vs. everything-claude-code)
- Maturity-based limits (greenfield: 2, early: 3, growing: 5, mature: 7)
- Tools requiring external authentication are automatically excluded
- Custom catalog URL support via `--catalog <url>` for private/enterprise catalogs

### Safe File Management

- **Ownership markers**: `<!-- slaminar:begin:SECTION -->` / `<!-- slaminar:end:SECTION -->` track generated sections. Content you wrote by hand is never touched.
- **Obfuscated backups**: `.slaminar/.bk/{hex6}_{timestamp}.dat` — stored in a format that IDEs and AI tools won't accidentally pick up.
- **Incremental updates**: `slaminar update` only regenerates changed sections.
- **Full rollback**: `slaminar uninstall` restores everything to its original state.

### Claude Code Skill Integration

Since v0.5.0, installing slaminar globally also registers it as a Claude Code skill so it becomes invokable with `/slaminar` or by natural language ("set up this project", "slaminar `../other-repo` 에 돌려줘").

- **Auto-deployment** via an `npm` postinstall hook — drops SKILL.md into `~/.claude/skills/slaminar/` without any manual step. Always graceful: never fails `npm install`, opts out in CI and for transitive installs, and can be disabled with `SLAMINAR_SKIP_POSTINSTALL=1`.
- **Path parameterization** — the skill accepts an optional `<path>`. If the user mentions a folder in their request, Claude forwards it to `slaminar init <path>`; otherwise the current working directory is used.
- **Content-hash idempotence** — reinstalling is a no-op when the bundled SKILL.md matches the installed copy. A modified SKILL.md is backed up to `~/.config/slaminar/skill-backups/` before being replaced, and `slaminar skill uninstall` restores the most recent backup.
- **Explicit commands** — `slaminar skill install/uninstall/status` mirror the auto-install flow when you need manual control.

See [Claude Code Skill Reference](#claude-code-skill-reference) under Usage for the full command surface, and [Claude Code Skill Auto-Deployment](#claude-code-skill-auto-deployment) under Installation for the postinstall contract.

### Team Collaboration

| File | Git Committed | Purpose |
|------|:---:|------|
| `.slaminar/config.json` | Yes | Team settings (approved tools, catalog version) |
| `.slaminar/config.local.json` | No | Personal settings (AI mode, personal tools) |
| `.slaminar/reports/*.md` | Yes | Setup reports (useful for PR reviews) |
| `.slaminar/.bk/` | No | Backup files |

**Config schema and defaults:**

`.slaminar/config.json` (team, committed):
```json
{
  "slaminarVersion": "0.1.0",
  "excludeAuthTools": true,
  "fileCountCap": 10000,
  "approvedTools": [],
  "catalogVersion": "",
  "catalogUrl": "",
  "catalogMode": "replace"
}
```

| Field | Description |
|-------|-------------|
| `slaminarVersion` | Version of slaminar that generated this config |
| `excludeAuthTools` | Auto-exclude tools requiring external authentication |
| `fileCountCap` | Max files scanned in file-tree analysis |
| `approvedTools` | Team-approved tool names (empty = accept all recommendations) |
| `catalogVersion` | Catalog version used at setup time (reserved for future version-pinning) |
| `catalogUrl` | Custom catalog URL (empty = official catalog). Set via `slaminar catalog config --url` |
| `catalogMode` | `replace` (default) or `extend`. Set via `slaminar catalog config --mode` |

`.slaminar/config.local.json` (personal, gitignored):
```json
{
  "aiMode": "auto",
  "personalTools": []
}
```

| Field | Description |
|-------|-------------|
| `aiMode` | `auto` (detect provider), `ai` (require AI), or `local` (no AI) |
| `personalTools` | Reserved for future per-user tool additions (not yet active) |

---

## Installation

```bash
npm install -g slaminar
```

Or run directly with npx:

```bash
npx slaminar init .
```

### Requirements

- Node.js >= 18
- Git (optional — used for history analysis)

### Claude Code Skill Auto-Deployment

When you install slaminar globally, it also registers itself as a Claude Code skill so you can invoke it with `/slaminar` (or by asking naturally: _"set up Claude Code for this project"_). The skill is placed at:

```
~/.claude/skills/slaminar/SKILL.md
```

**Path parameterization** — the skill accepts an optional target path. If you mention a folder in your request ("slaminar `~/work/other-repo` 에 돌려줘"), Claude forwards it to `slaminar init <path>`. Otherwise the current directory is used.

**Managing the skill:**

```bash
slaminar skill status      # Show whether the skill is installed and matches the bundled version
slaminar skill install     # Reinstall (creates a backup if content differs)
slaminar skill install --force
slaminar skill uninstall   # Remove (restores your previous SKILL.md if one was backed up)
```

**Opting out** of the auto-install during `npm install -g`:

```bash
SLAMINAR_SKIP_POSTINSTALL=1 npm install -g slaminar
```

The postinstall hook is also skipped automatically in CI (`CI=true`) and during local/transitive installs, and can never cause `npm install` itself to fail — any error is logged as a warning and exits 0.

---

## Usage

### Basic Setup

```bash
# Preview without writing files
slaminar init --dry-run .

# Run the full pipeline
slaminar init .

# Verbose output with detailed analysis
slaminar init --verbose .

# Disable AI enhancement (use local rules only)
slaminar init --no-ai .

# Use a custom/private tool catalog
slaminar init --catalog https://company.com/catalog.json .
```

### First-Run Setup (v0.6+)

A single command walks you through every global preference slaminar needs. Re-runs on demand to reconfigure just one section.

```bash
slaminar setup                          # Interactive 6-step wizard (first run)
slaminar setup --reconfigure auth       # Re-run just the AI provider step
slaminar setup --reconfigure catalog    # Re-run just the catalog step
slaminar setup --reconfigure defaults   # aiMode / excludeAuthTools / fileCountCap / versionCheck
slaminar setup --reconfigure skill      # Claude Code skill auto-install preference
slaminar setup --yes                    # Non-interactive (CI) — reads SLAMINAR_* env vars
slaminar setup --no-discovery           # Skip the optional Step 6 project scan
slaminar setup --yes --apply-to-discovered   # CI: scan + apply init/update to every find
```

Non-interactive `--yes` mode reads environment variables for every decision:

| Env var | Purpose |
|---|---|
| `SLAMINAR_AI_PROVIDER` | `cloudflare` or `anthropic` — selects provider |
| `SLAMINAR_CF_TOKEN`, `SLAMINAR_CF_ACCOUNT_ID`, `SLAMINAR_CF_MODEL` | Cloudflare credentials |
| `SLAMINAR_ANTHROPIC_KEY`, `SLAMINAR_ANTHROPIC_MODEL` | Anthropic credentials |
| `SLAMINAR_CATALOG_URL`, `SLAMINAR_CATALOG_MODE` | Custom catalog source |
| `SLAMINAR_DEFAULT_AI_MODE` | `auto` / `ai` / `local` |
| `SLAMINAR_EXCLUDE_AUTH_TOOLS` | `true` / `false` |
| `SLAMINAR_FILE_COUNT_CAP` | Integer |
| `SLAMINAR_VERSION_CHECK` | `true` / `false` — weekly npm version check |
| `SLAMINAR_DISCOVER_ROOTS` | Comma/space-separated roots for Step 6 discovery |
| `SLAMINAR_BATCH_APPROVED` | Explicit list of discovered project roots to apply |
| `SLAMINAR_BATCH_DRY_RUN` | `true` to force dry-run during batch apply |
| `SLAMINAR_ONLY_NEW` | `true` to restrict batch apply to `status === 'new'` projects |
| `SLAMINAR_IMPORT_TEAM_CATALOG` | `true` to auto-import team `catalogUrl` into user defaults |

### Project Discovery & Batch Apply (v0.7+)

Scan user-specified roots for Claude Code projects and optionally run `init` / `update` across all of them at once.

```bash
slaminar discover ~/work ~/projects              # One-shot scan with ASCII table
slaminar discover                                # Re-uses the last roots from defaults.json
slaminar discover ~/work --json                  # Machine-readable output
slaminar discover ~/work --apply --dry-run       # Scan + preview every init/update
slaminar discover ~/work --apply --only-new      # Only operate on projects classified "new"
slaminar discover ~/work --no-cache              # Force a fresh scan (ignore 24h cache)
```

**Classification:**

| Status | Meaning | Suggested action |
|---|---|---|
| `new` | Has `.claude/` but no `CLAUDE.md` | `init` |
| `configured` | Has `.slaminar/config.json` | `update` |
| `existing` | Has `CLAUDE.md` but no `.claude/` | `init-merge` (preserves content) |
| `unsupported` | No detectable language or signature | `skip` |

**Safety notes:**

- The walker stops descending as soon as it confirms a project, so `$HOME`-wide scans stay fast.
- `node_modules`, `.git`, `.venv`, `.cache`, `.turbo`, macOS `Library/`, `Applications/`, etc. are excluded by default.
- Symlinks are not followed; cycles are caught via `realpath` inode tracking.
- Every batch run writes a markdown audit log to `~/.config/slaminar/setup-logs/batch-<timestamp>.md`.
- The scan result is cached at `~/.config/slaminar/discovery-cache.json` (24 h TTL) — pass `--no-cache` to force refresh.

### Environment Diagnostics (`slaminar doctor`)

Read-only health check. Exits `0` (all pass), `1` (warnings), or `2` (failures).

```bash
slaminar doctor            # Human-readable report
slaminar doctor --json     # Machine-readable for CI
```

Checks include:

- Node.js and git versions
- slaminar version and skill installation status
- AI provider availability (auth.json + env vars)
- Catalog cache freshness
- Write permissions for `~/.config/slaminar/` and `~/.claude/skills/slaminar/`
- `defaults.json` validity

### AI Enhancement (Optional)

AI-powered CLAUDE.md enhancement is set up during `slaminar setup` and applied across all your projects.

#### Providers

**Cloudflare Workers AI (recommended):**
- Free tier: 10,000 Neurons/day (more than enough for typical usage)
- Minimum permission: `Workers AI: Read`
- Default model: `@cf/meta/llama-3.3-70b-instruct-fp8-fast` (24K context)
- Also supports: Llama 3.1 8B, Mistral Small 3.1, Gemma 3, Qwen 2.5 Coder

**Anthropic Claude:**
- Highest quality, paid
- Model: `claude-sonnet-4`
- Requires: `npm install @anthropic-ai/sdk`

#### Configuration Priority

| Source | Priority | Use Case |
|--------|:---:|------|
| CLI flag (`--no-ai`) | 1 (highest) | One-off disable |
| Environment variables (`CLOUDFLARE_*`, `ANTHROPIC_API_KEY`) | 2 | CI / ephemeral |
| `~/.config/slaminar/auth.json` (mode 0600) | 3 | Saved via `slaminar setup` |
| (none) | 4 | Local rules only |

### Individual Commands

```bash
# Project scan (JSON output)
slaminar scan .

# Project analysis (JSON output)
slaminar analyze .

# Tool recommendation (JSON output)
slaminar recommend .
slaminar recommend --catalog https://example.com/catalog.json .

# Health check
slaminar status .

# Incremental update (changed sections only)
slaminar update .

# Remove a specific tool from team config
slaminar remove caveman

# Full uninstall + restore
slaminar uninstall .

# CI validation (non-interactive, exit codes)
slaminar check .
slaminar check --json .
```

### Catalog Management

The tool catalog can be updated without upgrading slaminar itself:

```bash
slaminar catalog update                    # Fetch latest catalog + show diff
slaminar catalog update --catalog <url>    # Fetch from custom URL
slaminar catalog list                      # Table view of all tools
slaminar catalog search <query>            # Search by name, tags, or description
slaminar catalog check                     # Detect deprecated tools + show replacements
slaminar catalog info <name>               # Detailed tool info
slaminar catalog status                    # Cache status (age, validity, source)
slaminar catalog rollback                  # Restore previous catalog version
slaminar catalog config                    # View/set persistent catalog URL + mode
```

**Deprecation detection:** Tools in the catalog can be marked `deprecated: true` with an optional `deprecatedReason` and `replacedBy` field. Running `slaminar catalog check` scans your recommended tools against the catalog and warns about deprecated ones, showing the reason and suggested replacement.

### Claude Code Skill Reference

After `npm install -g slaminar` (or a manual `slaminar skill install`), the skill file lives at `~/.claude/skills/slaminar/SKILL.md` and Claude Code discovers it automatically.

**Invocation patterns Claude recognizes:**

| User phrasing | Claude runs |
|---|---|
| `/slaminar` | `slaminar init --dry-run .` → asks for approval → `slaminar init .` |
| "set up Claude Code for this project" | same as above, current CWD |
| "slaminar 돌려줘" | same as above, current CWD |
| "slaminar `../legacy-app` 에 돌려줘" | `slaminar init --dry-run ../legacy-app` → approval → `slaminar init ../legacy-app` |
| "analyze `~/work/other-repo` with slaminar" | same, with the resolved absolute path |
| "slaminar update this repo" | `slaminar update <path>` |
| "slaminar status" | `slaminar status <path>` |

The SKILL.md template instructs Claude to extract `<path>` from the user's request (absolute, relative, or `~`-prefixed) and fall back to `.` when no path is mentioned.

**Skill subcommands** (for managing the skill itself):

```bash
slaminar skill status                # Report install state + content match with bundled version
slaminar skill install               # Install / update at ~/.claude/skills/slaminar/SKILL.md
slaminar skill install --force       # Overwrite even when content is identical (still backs up)
slaminar skill uninstall             # Remove and restore the most recent backup (if any)
```

**Example — first-time install on a fresh machine:**

```text
$ slaminar skill status

Claude Code Skill Status
  Path:      /Users/me/.claude/skills/slaminar/SKILL.md
  Installed: no
  Bundled:   available

$ slaminar skill install

✓ Skill installed at /Users/me/.claude/skills/slaminar/SKILL.md
```

**Example — reinstall over a hand-edited SKILL.md:**

```text
$ slaminar skill install

✓ Skill updated at /Users/me/.claude/skills/slaminar/SKILL.md
  Previous version backed up to /Users/me/.config/slaminar/skill-backups/SKILL_a1b2c3_1713412800.md
```

**Example — uninstall with backup restore:**

```text
$ slaminar skill uninstall

✓ Uninstalled and restored previous SKILL.md from /Users/me/.config/slaminar/skill-backups/SKILL_a1b2c3_1713412800.md
```

**Opt-out during `npm install -g`:**

```bash
SLAMINAR_SKIP_POSTINSTALL=1 npm install -g slaminar   # explicit opt-out
CI=true npm install -g slaminar                       # auto-skipped
```

The postinstall hook additionally skips itself for non-global (local/transitive) installs so installing slaminar as a library dependency of another project will not touch your home directory.

**Safety guarantees:**

- postinstall wraps everything in `try/catch` and redirects errors to a warning line, exiting with code `0` — `npm install` is never blocked.
- Content comparison uses SHA-256 so a byte-identical SKILL.md is skipped silently (idempotent re-install).
- Any pre-existing SKILL.md is copied into `~/.config/slaminar/skill-backups/` before being overwritten.
- `slaminar skill uninstall` removes the skill file and, if a backup exists, writes the most recent one back as `SKILL.md` — so the previous custom skill is restored without manual intervention.

### Flags

| Flag | Description | Available On |
|------|-------------|-------------|
| `--dry-run` | Preview only, no files written | init, update |
| `--verbose` | Detailed analysis output | init, recommend, status |
| `--json` | Machine-readable JSON output | check |
| `--no-ai` | Skip AI enhancement | init |
| `--catalog <url>` | Use a custom catalog URL | init, recommend, catalog update |
| `--catalog-mode <mode>` | Catalog mode: `extend` or `replace` | init, recommend, catalog update |

---

## Project Analysis

### Supported Languages & Frameworks

| Language | Framework Detection | Package Manager |
|----------|-------------------|-----------------|
| TypeScript/JavaScript | React, Vue, Svelte, Angular, Next, Nuxt, Express, Fastify, Koa, Hono, NestJS | npm (package.json) |
| Python | Django, Flask, FastAPI | pip (pyproject.toml) |
| Rust | Actix, Axum | cargo (Cargo.toml) |
| Go | Gin, Echo | go (go.mod) |
| Java/Kotlin/Scala | Spring | maven (pom.xml) |
| Elixir | Phoenix | — |

### Architecture Pattern Detection

| Pattern | Detection Criteria |
|---------|-------------------|
| CLI | commander, yargs, meow, or similar CLI framework dependencies |
| SPA | React/Vue/Svelte + Vite/Webpack |
| API | Express/Fastify/Koa or similar server frameworks |
| Fullstack | SPA + API detected simultaneously |
| Library | Package manager present but no framework detected |
| Monorepo | Multiple package manager files |

### Maturity Assessment

| Maturity | Criteria | Max Tools |
|----------|----------|:---------:|
| greenfield | No git, no packages, no source files | 2 |
| early | < 10 commits | 3 |
| growing | 10–200 commits | 5 |
| mature | 200+ commits or 5+ contributors + CI | 7 |

### Convention Detection

- **Naming**: camelCase, kebab-case, snake_case (from source filenames)
- **Test framework**: vitest, jest, pytest, etc.
- **Linter/formatter**: ESLint, Prettier
- **Commit style**: conventional, emoji, freeform
- **Doc language**: ko, en, ja, zh (from filename patterns)

---

## Generated Output

### CLAUDE.md

Sections are managed via ownership markers:

```markdown
# CLAUDE.md

This file provides guidance to Claude Code...

<!-- slaminar:begin:overview -->
## Overview
Project description, language, framework, pattern, maturity
<!-- slaminar:end:overview -->

<!-- slaminar:begin:commands -->
## Build & Development Commands
Auto-extracted from package.json scripts
<!-- slaminar:end:commands -->

## My Custom Section       ← slaminar will never touch this
Custom content...

<!-- slaminar:begin:architecture -->
## Architecture
Architecture pattern, layout, entry points, test patterns
<!-- slaminar:end:architecture -->
```

**When a CLAUDE.md already exists:**
1. The original is backed up with an obfuscated filename (`.slaminar/.bk/a7f3c2_1713081600.dat`)
2. Only sections within markers are updated
3. All user-authored content outside markers is fully preserved

### Claude Code Plugin

```
.claude/plugins/slaminar-generated/
├── plugin.json          # Plugin manifest
└── skills/
    └── dev.md           # Development workflow (build/test/lint commands)
```

### Reports

`.slaminar/reports/YYYY-MM-DD-init.md` — automatically generated Markdown reports containing:
- Project profile
- List of generated files
- Recommended/excluded tools with reasons
- Verification results

These can be included in PRs for team review.

---

## Dynamic Catalog

slaminar's tool catalog is designed to evolve independently of CLI releases:

- **Online catalog**: 46 tools fetched from GitHub (`catalog/catalog.json` in this repo), updated without upgrading slaminar
- **Local cache**: `~/.config/slaminar/catalog-cache.json` with 24-hour TTL and file permission `0600`
- **Fallback chain**: valid cache → remote fetch → stale cache → bundled fallback (always works offline)
- **ETag support**: conditional HTTP requests — if the remote catalog hasn't changed, the server responds `304 Not Modified` and no data is transferred
- **Catalog diff**: `slaminar catalog update` shows added, removed, deprecated, and updated tools in colored terminal output
- **Custom catalog URL**: point to your own catalog with `--catalog <url>` for enterprise or private tool registries
- **Rollback**: `slaminar catalog rollback` restores the previous catalog version from `catalog-cache.prev.json`

**How the fallback chain works:**

```
slaminar catalog update (or init/recommend)
  │
  ├─ 1. Is there a valid cache? (< 24 hours old)
  │     YES → use cached catalog
  │     NO  ↓
  ├─ 2. Fetch from remote URL (with ETag if available)
  │     200 OK    → save to cache, use new catalog
  │     304       → mark cache as fresh, use cached
  │     FAIL      ↓
  ├─ 3. Is there a stale cache? (expired but exists)
  │     YES → use stale cache (with warning)
  │     NO  ↓
  └─ 4. Use bundled catalog (14 tools, always available)
```

### Catalog Tools (46)

| Category | Tools |
|----------|-------|
| **Token/Performance** | caveman, everything-claude-code, moyu |
| **Planning/Spec** | planning-with-files, get-shit-done, spec-kit |
| **Frontend** | impeccable, senior-frontend |
| **Testing/QA** | playwright-skill, tdd-guard, test-kitchen |
| **Memory/Context** | claude-mem, reporecall, knowledge-graph |
| **Code Analysis** | graphify, cartographer |
| **Security** | trailofbits/skills, awesome-claude-skills-security |
| **Quality Gate** | vibeguard, review-squad, obey |
| **Team/Workflow** | oh-my-claudecode, vibe-kanban, ccpm |
| **Multi-Agent** | wshobson/agents, claude-code-subagents |
| **DevOps/IaC** | terraform-skill, hashicorp/agent-skills, devops-claude-skills, container-use |
| **Database** | supabase/agent-skills, pg-aiguide |
| **Framework** | laravel/agent-skills, claude-on-rails, apollographql/skills, developer-kit, rafaelkamimura/claude-tools, claude-elixir-phoenix |
| **Onboarding/Utility** | claude-code-templates, cc-safe-setup, preflight |
| **Monitoring/LSP** | claude-hud, claude-code-lsps, homunculus |

Full list: `slaminar catalog list`

### Creating a Custom Catalog

You can host your own catalog and use it with `--catalog <url>`. The catalog must follow the `RemoteCatalog` JSON schema.

> **Deep dive (v0.8.5+)**: see [`docs/catalog-authoring-guide.md`](./docs/catalog-authoring-guide.md) for a step-by-step authoring guide (5-minute tutorial, full schema tables, local-file examples, extend/replace patterns, and troubleshooting). For a curated "what is this tool and when to use it" index of every entry in the bundled catalog — including the new presentation category — see [`docs/catalog-tools-reference.md`](./docs/catalog-tools-reference.md).

**Minimum format** (only `tools` is required):

```json
{
  "tools": [
    {
      "name": "my-internal-tool",
      "repo": "company/internal-tool",
      "category": "skill",
      "description": "Internal code review tool",
      "authRequired": false,
      "networkRequired": "none",
      "installMethod": "git-clone",
      "installCommands": ["git clone https://git.company.com/tool.git ~/.claude/skills/tool"],
      "prerequisites": [],
      "tags": ["code-review", "internal"],
      "maturityFit": ["growing", "mature"]
    }
  ]
}
```

**Full format** (all optional fields included):

```json
{
  "version": "1.0.0",
  "minSlaminarVersion": "0.2.0",
  "updatedAt": "2026-04-16T00:00:00Z",
  "tools": [],
  "suggestions": [],
  "relations": []
}
```

**CatalogTool fields:**

| Field | Type | Required | Description |
|-------|------|:--------:|-------------|
| `name` | string | Yes | Unique tool name |
| `repo` | string | Yes | GitHub `owner/repo` |
| `category` | string | Yes | `plugin`, `skill`, `hook`, `agent`, or `workflow` |
| `description` | string | Yes | Short description |
| `authRequired` | boolean | Yes | Requires external auth (excluded from recommendations if true) |
| `networkRequired` | string | Yes | `none`, `partial`, or `full` |
| `installMethod` | string | Yes | `marketplace`, `npx`, `git-clone`, or `pip` |
| `installCommands` | string[] | Yes | Shell commands to install |
| `prerequisites` | string[] | Yes | Runtime requirements (e.g., `["python>=3.10"]`) |
| `tags` | string[] | Yes | Scoring tags (e.g., `["typescript", "testing"]`) |
| `maturityFit` | string[] | Yes | `greenfield`, `early`, `growing`, `mature` |
| `deprecated` | boolean | No | Mark as deprecated |
| `deprecatedReason` | string | No | Why deprecated |
| `replacedBy` | string | No | Successor tool name |

**Usage:**

```bash
# One-off via CLI flag
slaminar init --catalog https://company.com/catalog.json .
slaminar recommend --catalog https://company.com/catalog.json .
slaminar catalog update --catalog https://company.com/catalog.json

# Or host it on any static server / internal registry
```

When `version`, `suggestions`, or `relations` are omitted, slaminar uses sensible defaults (empty arrays, version "0.0.0").

### Persistent Catalog Configuration

Instead of passing `--catalog <url>` every time, you can save the custom catalog URL and mode in your project config:

```bash
# Set custom catalog in extend mode (merge with official)
slaminar catalog config --url https://company.com/catalog.json --mode extend

# Set custom catalog in replace mode (custom only)
slaminar catalog config --url https://company.com/catalog.json --mode replace

# View current configuration
slaminar catalog config

# Clear configuration (revert to official catalog)
slaminar catalog config --clear
```

**Extend vs. Replace modes:**

| Mode | Behavior |
|------|----------|
| **extend** | Custom tools are **merged** with the official catalog. If both catalogs have a tool with the same name, the custom version wins. |
| **replace** | **Only** the custom catalog is used. The official catalog is ignored (bundled catalog remains as offline fallback). |

**Precedence** (highest to lowest):

| Source | Priority |
|--------|:--------:|
| CLI flags (`--catalog`, `--catalog-mode`) | 1 (highest) |
| Project config (`.slaminar/config.json`) | 2 |
| Default (official catalog, replace mode) | 3 |

Note: `--catalog <url>` without `--catalog-mode` defaults to replace mode for backward compatibility.

**Team scenarios:**

```bash
# Enterprise: extend official catalog with company tools
slaminar catalog config --url https://tools.company.com/catalog.json --mode extend
# → Team members get official + company tools after git pull

# Security team: only allow approved tools
slaminar catalog config --url https://security.company.com/approved.json --mode replace
# → Only security-approved tools are recommended
```

**Extend mode diagram:**

```
slaminar recommend (with extend mode)
  │
  ├─ 1. Resolve official catalog (fallback chain)
  │     → 46 official tools
  │
  ├─ 2. Fetch custom catalog
  │     → N custom tools
  │     (if fetch fails → use official only + warning)
  │
  └─ 3. Merge: official + custom
        → Same-name tools: custom wins
        → Relations: deduplicated union
        → Suggestions: official only
```

### Catalog Federation (v0.8+)

v0.8 promotes `catalogUrl` to an array of layered sources with explicit priority so teams can mix a company catalog, a personal catalog, and a security-approved allowlist without losing the official one. The legacy single-URL config still works — it's surfaced as a single `*-legacy` source on load.

**Priority layers (ascending, higher wins):**

| Priority | Scope | Where it lives |
|---:|---|---|
| `-1` | `bundled` | Built into the binary — always available |
| `0` | `official` | Default GitHub-hosted catalog |
| `100+` | `user` | `~/.config/slaminar/defaults.json → catalog.sources[]` |
| `200+` | `project` | `.slaminar/config.json → catalogSources[]` (git-committed) |
| `500` | `env` | `SLAMINAR_CATALOG_SOURCES` environment variable |
| `999` | `cli` | `--catalog <url>` CLI flag (adhoc) |

A `replace`-mode layer drops every **lower**-priority layer entirely. Multiple `extend` layers stack; name collisions award the higher layer.

**Manage sources via `slaminar catalog source`:**

```bash
# Add a company catalog at the project scope (git-committed)
slaminar catalog source add https://tools.company.com/catalog.json \
  --scope project --mode extend --name company

# Add a personal catalog at the user scope (gitignored by design)
slaminar catalog source add ~/my-catalog.json --scope user --name personal

# Security team overrides everything below them
slaminar catalog source add https://sec.company.com/approved.json \
  --scope project --mode replace --priority 300 --name security-allowlist

# Inspect every active layer in priority order
slaminar catalog source list

# Validate a URL without persisting it
slaminar catalog source test https://example.com/catalog.json

# Disable (keep in config) or remove
slaminar catalog source disable company
slaminar catalog source remove company
```

**Env-var escape hatch (CI friendly):**

```bash
SLAMINAR_CATALOG_SOURCES="extend:https://a.example/c.json,replace:/etc/slaminar/approved.json" \
  slaminar recommend .
```

**Backward compatibility:**

- v0.7 users upgrade with zero file edits. Any existing `catalogUrl` / `catalogMode` is synthesized into a `*-legacy` source at the matching scope every time the resolver runs.
- `slaminar catalog config` still works but prints a deprecation notice pointing at `catalog source`.
- `--catalog <url>` on `init` / `recommend` still works and becomes a `cli-adhoc` layer at priority 999.

---

## Verification

After `slaminar init` completes, an automatic verification pass runs:

| Check | Description |
|-------|-------------|
| file-exists | CLAUDE.md exists |
| has-headings | Contains `##` headings |
| markers-well-formed | Ownership marker pairs match |
| commands-valid | `npm run` commands exist in package.json |
| plugin.json exists | Plugin file present |
| Valid JSON | plugin.json is parseable |
| Required fields | name, description, version fields exist |
| Skills directory | Skills directory exists |
| Skill files | `.md` skill files present |

```bash
# Use in CI
slaminar check --ci .
# Exit codes: 0 = pass, 1 = warnings, 2 = errors
```

---

## Error Handling & Safety

### Error Handling

- Every CLI command is wrapped in try/catch — user-friendly messages instead of stack traces
- Path validation — detects non-existent paths, files passed where directories are expected
- Defensive JSON parsing — graceful handling of corrupted manifest/config files
- Partial write handling — reports which files succeeded and which failed

### Rollback Strategy

- **On init failure**: previously backed-up files are automatically restored
- **Manifest safety**: recorded in a `finally` block — backup tracking survives partial failures
- **Session isolation**: only the current session's backups are rolled back (previous sessions are untouched)

### Fallback Strategy

- **AI provider chain**: env vars → auth.json → local rules. Nothing ever blocks.
- **AI call failure**: HTTP, network, and token errors all gracefully fall back to the local draft
- **Anthropic SDK not installed**: if only the API key is set but the SDK isn't installed, local mode kicks in automatically
- **Cloudflare account auto-detection failure**: `/accounts` → `/memberships` → manual input — three-stage fallback
- **Python not installed**: recommends cartographer instead of graphify (same purpose, different runtime)
- **All tool scores zero**: returns an empty recommendation (CLAUDE.md + plugin are still generated)
- **Git not installed**: skips git-related analysis, sets maturity to greenfield
- **Catalog remote fetch failure**: falls back to stale cache, then bundled catalog

### Security

- All shell execution uses `execFileSync` (`execSync` / `exec` are forbidden) — prevents command injection
- Arguments are passed as arrays, never concatenated into shell strings
- Git commands have a 10-second timeout to prevent indefinite blocking
- Auth tokens stored with file permission `0600` (owner read/write only)

---

## Tech Stack

| Component | Technology |
|-----------|-----------|
| Language | TypeScript (ESM) |
| Runtime | Node.js >= 18 |
| CLI framework | commander |
| Terminal output | chalk + cli-table3 |
| Testing | vitest (TDD) |
| Build | tsc |
| Development | tsx |

---

## Architecture

```
src/
├── cli.ts                        # CLI entry point (22 commands + global flags)
├── version.ts                    # Single source of truth for runtime version string
├── types/index.ts                # All shared types
│
├── core/                         # Pipeline core
│   ├── scanner.ts                # Scan coordinator (calls all scanners)
│   ├── pipeline.ts               # analyze() + init() (with rollback)
│   ├── verifier.ts               # Verification coordinator
│   └── updater.ts                # Incremental update (change detection)
│
├── scanner/                      # Phase 1: Data collection
│   ├── file-tree.ts              # Directory structure (.gitignore-aware, file count cap)
│   ├── git-info.ts               # Git metadata (timeout, contributor limit)
│   ├── ai-files.ts               # CLAUDE.md, .claude/ detection
│   └── package-info.ts           # npm, cargo, pip, go, maven manifests
│
├── analyzer/                     # Phase 2: Profiling
│   ├── language-detector.ts      # Language / framework / build tool / runtime
│   ├── structure-mapper.ts       # CLI / SPA / API / library / monorepo patterns
│   ├── convention-extractor.ts   # Naming, test, linter, commit style, doc language
│   ├── dependency-analyzer.ts    # Notable dependency classification (AI, DB, server, etc.)
│   └── maturity-detector.ts      # greenfield / early / growing / mature
│
├── recommender/                  # Phase 3: Smart recommendations
│   ├── catalog.ts                # Bundled tool catalog (offline fallback)
│   ├── catalog-resolver.ts       # Resolve catalog (cache → remote → stale → bundled)
│   ├── catalog-cache.ts          # Local cache with 24h TTL + rollback
│   ├── catalog-remote.ts         # Remote fetch with ETag conditional requests
│   ├── catalog-diff.ts           # Diff engine (added/removed/deprecated/updated)
│   ├── catalog-merger.ts         # Merge official + custom catalogs (extend mode)
│   ├── scorer.ts                 # Multi-dimensional scoring (tags, maturity, versatility)
│   ├── conflict-detector.ts      # Conflict / synergy detection
│   ├── recommender.ts            # Coordinator (filter → score → conflicts → limit)
│   └── installer.ts              # Tool installer (marketplace / npx / git-clone / pip)
│
├── planner/                      # Phase 4: Planning
│   └── planner.ts                # GenerationPlan assembly
│
├── generator/                    # Phase 5: Generation
│   ├── claude-md.ts              # CLAUDE.md (with ownership markers)
│   ├── claude-plugin.ts          # plugin.json + skills/dev.md
│   ├── ai-provider.ts            # AI routing (Cloudflare / Anthropic / local)
│   └── cloudflare-ai.ts          # Cloudflare Workers AI adapter (native fetch)
│
├── auth/                         # AI provider authentication (internal; invoked via `setup`)
│   ├── config.ts                 # ~/.config/slaminar/auth.json (0600)
│   ├── models.ts                 # Cloudflare / Anthropic model catalog
│   ├── diagnostics.ts            # Token validation, /user, /memberships, inference test
│   └── wizard.ts                 # Interactive login flow (called from setup Step 2)
│
├── setup/                        # Global first-run experience (v0.6)
│   ├── wizard.ts                 # `slaminar setup` — 5-step progressive wizard
│   ├── defaults.ts               # ~/.config/slaminar/defaults.json I/O
│   ├── doctor.ts                 # `slaminar doctor` — read-only diagnostics
│   └── update-check.ts           # Weekly npm registry version check (privacy-safe)
│
├── placer/                       # Phase 6: Placement
│   ├── backup.ts                 # Obfuscated backup (.dat) + manifest
│   ├── markers.ts                # Ownership marker extraction & merge
│   └── writer.ts                 # File writer (merge / create modes)
│
├── validator/                    # Phase 7: Verification
│   ├── claude-md.ts              # CLAUDE.md validity (commands, markers, structure)
│   └── plugin-schema.ts          # plugin.json schema validation
│
├── reporter/                     # Output
│   ├── terminal.ts               # Color tables (chalk + cli-table3)
│   ├── markdown.ts               # Markdown report generation
│   └── progress.ts               # PhaseTimer (for --verbose)
│
├── team/                         # Team collaboration
│   └── config.ts                 # Team / local config split + .gitignore
│
├── rollback/                     # Rollback
│   └── uninstaller.ts            # Full uninstall + individual tool removal
│
├── ci/                           # CI/CD
│   └── check.ts                  # Non-interactive validation (exit codes)
│
├── runtime/                      # Runtime management
│   ├── prerequisite.ts           # Version checks (Node / Python / Git / uv / volta)
│   └── detector.ts               # Runtime detection (uv / volta manager identification)
│
└── skill/                        # Claude Code integration
    ├── SKILL.md                  # /slaminar skill definition (path-parameterized)
    ├── installer.ts              # install/uninstall/status for ~/.claude/skills/slaminar/
    └── post-install.ts           # npm postinstall entry (fail-safe, opt-out aware)
```

> `scripts/copy-assets.mjs` runs after `tsc` to copy `src/skill/SKILL.md` into `dist/skill/` so the compiled `installer.js` can resolve it as a sibling via `import.meta.url`. The compiled `dist/skill/post-install.js` is the target of the `postinstall` script in `package.json`.

---

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Development mode
npm run dev -- init .

# Tests
npm test              # Run all tests
npm run test:watch    # Watch mode

# Single test file
npx vitest run tests/scanner/file-tree.test.ts
```

---

## Implementation History

### Phase 1: Core Foundation

Project scaffolding, type system, 4 scanners (file-tree, git-info, ai-files, package-info), and 5 analyzers (language, structure, convention, dependency, maturity). `slaminar scan` and `slaminar analyze` became operational.

### Phase 2: Recommendation Engine

14-tool catalog, multi-dimensional scoring, conflict/synergy detection, and the recommendation coordinator. `slaminar recommend` became operational.

### Phase 3: Generation & Placement

CLAUDE.md generator with ownership markers, Claude Code plugin generator, obfuscated backup system, marker-based merge, and file placement. The full `slaminar init` pipeline was completed.

### Phase 4: Verification & Reporting

CLAUDE.md validity checks, plugin.json schema validation, colored terminal table reporter, and Markdown report generation. The 7-phase pipeline was fully operational.

### Phase 5–6: Team, CI, Rollback

Team/local config split, incremental updates, uninstall/remove rollback, CI validation, and the remaining CLI commands.

### Phase 7: Cloudflare Workers AI + Unified Auth

Significant UX improvement: added Cloudflare Workers AI as a free-tier AI provider, and unified all AI configuration under `login`/`whoami`/`logout` commands (modeled after gh, wrangler, and vercel CLIs).

### Phase 8: Dynamic Catalog System (v0.2.0)

Decoupled the tool catalog from the release cycle. Online catalog (24 tools) with local caching (24h TTL), ETag conditional requests, fallback chain, diff on update, and 7 new `slaminar catalog` subcommands.

### Phase 9: Custom Catalog URL Support (v0.3.0)

Added `--catalog <url>` flag to `init`, `recommend`, and `catalog update` commands, enabling enterprise and private catalog hosting. Fixed CLI version mismatch and stabilized catalog resolver tests with deterministic failure URLs.

### Phase 10: Persistent Catalog Config + Catalog Expansion (v0.4.0)

Added `catalog config` command for persisting custom catalog URL and mode (extend/replace) in project settings. Extend mode merges custom tools with official catalog; replace mode uses custom only. Expanded online catalog from 24 to 46 tools covering DevOps, team workflow, quality gates, databases, testing, frontend, and framework-specific domains. Added 14 new relation rules for synergy/overlap detection.

### Phase 11: Claude Code Skill Auto-Deployment + Path Parameterization (v0.5.0)

**Motivation.** Pre-v0.5, users had to manually copy `SKILL.md` into `~/.claude/skills/slaminar/` after `npm install`. The distribution gap made the `/slaminar` skill essentially invisible to new users.

**Shipped.**
- Auto-install via npm postinstall hook — `package.json:postinstall`, `src/skill/post-install.ts`
- `src/skill/installer.ts` — idempotent install with SHA-256 content check
- `slaminar skill {install,uninstall,status}` command group — `src/cli.ts`
- `scripts/copy-assets.mjs` — copies `SKILL.md` into `dist/` at build time
- SKILL.md path parameterization (`<path>` argument) — `src/skill/SKILL.md`

**Decisions.**

- **D11.1 — Triple-safe postinstall guard.** Alternatives: (a) single try/catch, (b) shell `|| true`, (c) defensive `process.exit(0)`. **Chosen:** all three combined plus opt-outs (`SLAMINAR_SKIP_POSTINSTALL=1`, `CI=true`, transitive install detection). Rationale: a postinstall failure must NEVER break `npm install` — losing user trust is worse than a silently-skipped skill install. Evidence: `src/skill/post-install.ts`, `tests/skill/installer.test.ts`.
- **D11.2 — SHA-256 content-hash idempotence.** Alternative: unconditional overwrite. Rationale: users customize SKILL.md; forcing overwrite would erase their work. Hash-equal → no-op; hash-differs → backup first, then replace. Evidence: `src/skill/installer.ts:installSkill`.
- **D11.3 — Assets copied via separate build script.** Alternative: include `.md` in `tsconfig.json`. Rationale: `tsc` doesn't emit non-JS; a tiny `copy-assets.mjs` is transparent and runs at predictable build time. Evidence: `scripts/copy-assets.mjs`, `package.json:build`.
- **D11.4 — Backup only on diverging overwrite.** Alternative: backup every install. Rationale: most reinstalls are hash-equal no-ops; indiscriminate backup would churn `~/.config/slaminar/skill-backups/` with duplicates. Evidence: `src/skill/installer.ts:installSkill` backup branch.
- **D11.5 — Path-parameterized SKILL.md.** Alternative: the skill detects cwd internally. Rationale: Claude Code routing works better when the skill accepts explicit arguments — phrasings like "slaminar `../other-repo`에 돌려줘" now route to `slaminar init ../other-repo` instead of `slaminar init .`. Evidence: `src/skill/SKILL.md` frontmatter description.

**Cross-refs.** [CHANGELOG v0.5.0](./CHANGELOG.md#050--2026-04-17) · no dedicated spec (designed inline) · tests: `tests/skill/`.

### Phase 12: Global Setup Wizard + Doctor + Defaults (v0.6.0)

**Motivation.** Post-v0.5, setup was scattered across four commands (`login`/`whoami`/`logout`/`auth`), and many `TeamConfig`/`LocalConfig` fields had no CLI setter — users edited JSON manually. No diagnostic existed to answer "is my install healthy?". First-run felt fragmented.

**Shipped.**
- `slaminar setup` — 5-step interactive wizard (Environment → AI → Catalog → Defaults → Skill) — `src/setup/wizard.ts`
- `slaminar doctor` — read-only health report, exit codes 0/1/2 — `src/setup/doctor.ts`
- `~/.config/slaminar/defaults.json` — single user-global preferences file — `src/setup/defaults.ts`
- Weekly npm registry version check (privacy-safe) via commander `preAction` hook — `src/setup/update-check.ts`
- Removed `login`/`whoami`/`logout`/`auth` (breaking)
- `--yes` non-interactive mode driven by `SLAMINAR_*` env vars

**Decisions.**

- **D12.1 — Single `setup` entry point, not four separate commands.** Alternative: keep `login`/`whoami`/etc. and add `setup` alongside. Rationale: four surfaces for one concern was the original fragmentation; aggregating preserves discoverability. Breaking change accepted for the simpler mental model. Evidence: `src/setup/wizard.ts:runSetupWizard`, CHANGELOG "Breaking" table.
- **D12.2 — `defaults.json` under `~/.config/slaminar/`, not `~/.slaminar/`.** Alternative: a dotfile in `$HOME`. Rationale: XDG Base Directory compliance; co-locates with `auth.json` so users have a single directory to inspect or delete. Evidence: `src/setup/defaults.ts:getDefaultsPath`, `src/auth/config.ts:getConfigDir`.
- **D12.3 — Weekly version check, not per-command.** Alternative: check every run (fresh data). Rationale: npm registry rate limits; users dislike chatty CLIs. One check per 7 days is balanced; privacy-safe (no identifier). Opt-out via `--no-update-check` or `telemetry.versionCheck=false`. Evidence: `src/setup/update-check.ts`, `tests/setup/update-check.test.ts`.
- **D12.4 — `--yes` + env vars for CI, not a separate config file.** Alternative: `--config-file <path>` flag. Rationale: env vars are idiomatic for CI (GitHub Actions, CircleCI secrets flow natively). Minimal flag surface; CI-specific complexity stays in the env namespace. Evidence: `src/setup/wizard.ts:authFromEnv`, Steps 2–5 all check `SLAMINAR_*` env first in `yes` mode.
- **D12.5 — Doctor is strictly read-only.** Alternative: auto-fix mode (`doctor --fix`). Rationale: mixing diagnosis with action creates ambiguity about what happened; `setup --reconfigure <section>` is the explicit fix path. Exit codes 0/1/2 mirror `slaminar check` for CI consistency. Evidence: `src/setup/doctor.ts`, `tests/setup/doctor.test.ts`.
- **D12.6 — Malformed `defaults.json` falls back, doesn't crash.** Alternative: error out with "fix your config". Rationale: defaults are non-sensitive; losing them to a parse error shouldn't block work. A partial file still merges its valid sections with built-in defaults. Evidence: `src/setup/defaults.ts:loadDefaults`, `mergeWithBuiltIn`.

**Cross-refs.** [CHANGELOG v0.6.0](./CHANGELOG.md#060--2026-04-17) · [spec: `2026-04-17-global-setup-plan.md`](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · tests: `tests/setup/{wizard,doctor,defaults,update-check}.test.ts`.

### Phase 13: Project Discovery & Batch Apply (v0.7.0)

**Motivation.** Solo developers with many repos had no way to bulk-configure slaminar; the wizard only set up one project at a time. Team members joining a project with existing `.slaminar/config.json` had no auto-import path. Setup was still per-directory toil.

**Shipped.**
- `slaminar discover [roots...]` — scan user-specified roots for Claude Code projects — `src/discover/scanner.ts`
- `slaminar setup --apply-to-discovered` — optional Step 6 of the wizard — `src/setup/wizard.ts:stepDiscovery`
- Project classifier (`new`/`configured`/`existing`/`unsupported`) — `src/discover/detector.ts`
- Batch apply with markdown audit log — `src/discover/batch.ts`
- Team catalog auto-import — `src/discover/team-import.ts`
- ASCII table reporter — `src/reporter/discovery-table.ts`

**Decisions.**

- **D13.1 — User-specified roots, no guessed defaults.** Alternative: auto-pick `~/work`, `~/projects`, `~/src`. Rationale: false positives waste time and raise privacy concerns ("who told slaminar to walk my home dir?"). Explicit roots only; remembered in `defaults.json.discovery.lastRoots` for next-run convenience. Evidence: `src/discover/scanner.ts:parseRootsInput`, `tests/discover/scanner.test.ts`.
- **D13.2 — Stop descending once a project signature is found.** Alternative: full depth-4 walk even inside confirmed projects. Rationale: a monorepo's root and every sub-package would both match — noisy and wasteful. First hit wins; nested projects inside a confirmed project are intentionally ignored. Evidence: `src/discover/scanner.ts:walk`, `tests/discover/scanner.test.ts` "does not descend into a confirmed project".
- **D13.3 — Dry-run default, apply is opt-in.** Alternative: immediate apply with `--dry-run` escape. Rationale: writing files across many projects is irreversible without backups. Interactive: menu includes "Dry-run all (recommended)" as default. CI: requires explicit `--apply-to-discovered` or `SLAMINAR_BATCH_APPROVED`. Evidence: `src/setup/wizard.ts:stepDiscovery`, `src/discover/batch.ts`.
- **D13.4 — Batch audit log in `~/.config/slaminar/setup-logs/`.** Alternative: no log (stdout only). Rationale: running `setup --apply-to-discovered` across 20 repos needs proof — which projects init'd, which updated, which failed. Markdown file per batch with succeeded/failed/skipped breakdown. Evidence: `src/discover/batch.ts:writeSummary`.
- **D13.5 — "CLAUDE.md but no `.claude/`" → `existing` + `init-merge`, not skip.** Alternative: treat pre-existing CLAUDE.md as a reason to skip. Rationale: pre-v0.5 users wrote CLAUDE.md by hand; slaminar's ownership-marker system merges cleanly around that content. Auto-skipping would orphan those projects from the ecosystem. Evidence: `src/discover/detector.ts:classifyStatus`, `tests/discover/detector.test.ts`.
- **D13.6 — Realpath inode dedup as secondary symlink guard.** Alternative: just "don't follow symlinks" by default. Rationale: bind mounts and case-insensitive filesystems can produce cycles without symlinks; `realpath` is the belt-and-suspenders guard. Evidence: `src/discover/scanner.ts:walk` (`visitedInodes` + `realKey`).

**Cross-refs.** [CHANGELOG v0.7.0](./CHANGELOG.md#070--2026-04-17) · [spec §v0.7](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · tests: `tests/discover/*.test.ts`, `tests/reporter/discovery-table.test.ts`.

### Phase 14: Catalog Federation (v0.8.0)

**Motivation.** v0.3–v0.7 supported exactly one custom catalog URL. Three-layer scenarios (security allowlist + company catalog + personal tools) forced users to manually merge JSON. Teams wanted enforced allowlists expressed as "replace mode" separately from company extend-mode additions.

**Shipped.**
- 6-layer priority model (`bundled:-1` → `official:0` → `user:100` → `project:200` → `env:500` → `cli:999`) — `src/recommender/catalog-sources.ts`
- `CatalogSource` type with persistent `trust` field — `src/types/index.ts`
- `slaminar catalog source {add,list,remove,enable,disable,test}` CLI — `src/cli.ts`
- Per-source cache at `~/.config/slaminar/cache/<id>.json` — `src/recommender/catalog-cache.ts`
- N-way merge with replace-floor semantics — `src/recommender/catalog-merger.ts:mergeCatalogStack`
- `SLAMINAR_CATALOG_SOURCES` env var (`mode:uri,mode:uri`)
- Auto-migration from v0.7 legacy `catalogUrl`

**Decisions.**

- **D14.1 — Scope Phase 1–3 only; defer Phase 4 (trust/security) to v0.9.** Alternative: full spec in one release (6–7 days). Rationale: shipping smaller gets faster feedback, and enforcement UX has independent complexity (confirm prompts, HTTPS policy, signed catalogs). The `trust` field is persisted now to avoid a later data migration. Evidence: CHANGELOG v0.8.0 "Deferred to v0.9", design spec Phase table.
- **D14.2 — Read-path-only migration (no file rewrite).** Alternative: auto-migrate on first load by rewriting the config file. Rationale: a v0.7 user who pilots v0.8, dislikes it, and downgrades would find their config file mysteriously changed. Read-time migration synthesizes `*-legacy` sources in memory; files are only rewritten when the user edits via `catalog source add` or `setup --reconfigure catalog`. Evidence: `src/recommender/catalog-sources.ts:loadEffectiveSources` legacy-URL branch, `tests/recommender/catalog-sources.test.ts` "synthesizes a user-scope source from legacy catalog.url".
- **D14.3 — Per-source cache files, not a composite file.** Alternative: one `catalog-cache.json` with `sources: { [id]: entry }`. Rationale: (a) rollback of a single source doesn't touch other sources' prev-files; (b) concurrent fetches (future) can write without lock contention; (c) easier to inspect by hand. Official source still writes to the legacy `catalog-cache.json` path (`id='official'`) for v0.7 rollback compat. Evidence: `src/recommender/catalog-cache.ts:getSourceCachePath`, `tests/recommender/catalog-cache.test.ts`.
- **D14.4 — Wizard keeps single-URL prompt; add CLI hint.** Alternative: expand wizard into a multi-source array builder (inquirer loop). Rationale: 80% of users want one custom catalog; a loop is annoying for them. Power users go to `slaminar catalog source add` which is better for iteration. Evidence: `src/setup/wizard.ts:stepCatalog`, "Tip: layer additional sources" print.
- **D14.5 — Bundled is exempt from replace-floor filtering.** Alternative: `replace` drops every lower-priority layer including bundled. Rationale: if the user's custom `replace` source goes offline (stale + unreachable), they'd lose everything. Bundled is the last-resort guaranteed source — a floor, not a participant. Evidence: `src/recommender/catalog-merger.ts:mergeCatalogStack`, `applyReplaceFloor`.
- **D14.6 — `trust` field now, enforcement in v0.9.** Alternative: omit `trust` until enforcement exists. Rationale: adding it later forces a config-file migration. Persisting now with no behavioral effect is a zero-cost forward investment. Default `trust: 'untrusted'` for newly added sources is intentional — v0.9 will flag these at install time. Evidence: `src/types/index.ts:CatalogSource`, CHANGELOG v0.8.0 "persisted but not enforced".
- **D14.7 — CLI `--catalog` becomes a `cli-adhoc` source, not a side channel.** Alternative: keep pre-v0.8 behavior where `--catalog` bypassed stacking. Rationale: uniformity — every source flows through the same priority/fetch pipeline. CLI adhoc at priority 999 naturally wins collisions with lower layers (the expected semantics for a one-shot override). Evidence: `src/recommender/catalog-sources.ts:makeCliAdhocSource`, backward-compat test in `catalog-resolver.test.ts`.
- **D14.8 — Env source IDs hashed from URI; `cli-adhoc` stable.** Alternative: all IDs auto-generated via random. Rationale: env sources can coexist (comma-separated); hashing disambiguates them. CLI adhoc is one-at-a-time, so a stable `cli-adhoc` ID lets its cache file be reused across invocations. Evidence: `src/recommender/catalog-sources.ts:generateSourceId`, `makeCliAdhocSource`.

**Cross-refs.** [CHANGELOG v0.8.0](./CHANGELOG.md#080--2026-04-17) · [spec: `2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) + [spec §v0.8](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) · tests: `tests/recommender/{catalog-sources,catalog-source-persistence,catalog-merger,catalog-resolver}.test.ts`.

### Phase 15: Claude Code Passthrough (v0.8.2)

**Motivation.** Up to v0.8.1, invoking `/slaminar` inside Claude Code forced users to configure a separate AI provider (Cloudflare or Anthropic) even though an outer Claude agent was already running. This duplicated AI calls and demanded an API key that users with a Max/Pro Claude subscription should never have needed.

**Shipped.**
- `src/skill/SKILL.md` — 7-step workflow rewrite that forces `--no-ai` in Steps 2 and 4 and adds Step 5 (outer Claude enhances in place) and Step 6 (verify with `slaminar check`)
- `docs/getting-started-walkthrough.md` — new §1.5 explaining the two execution contexts
- Core TypeScript code unchanged — this release reuses the existing `--no-ai` flag and ownership marker system

**Decisions.**

- **D15.1 — Force `--no-ai` inside Claude Code; slaminar never calls an external provider from the skill path.** Alternative: let the outer agent decide per-invocation. Rationale: an outer Claude is already the best available model and already running; nested AI calls add latency, cost, and configuration friction for zero marginal quality. Evidence: `src/skill/SKILL.md` Steps 2 & 4 both pass `--no-ai`; `src/cli.ts` `--no-ai` flag handling.
- **D15.2 — Enhancement boundary is slaminar's existing ownership markers.** Alternative: introduce a new "agent-editable region" primitive. Rationale: markers are already load-bearing for `slaminar update` incremental merges and already enforce the "slaminar region vs user region" split. Adding another layer would risk contract drift. Evidence: `src/placer/markers.ts`, `src/core/updater.ts`.
- **D15.3 — SKILL.md is the sole "Claude Code context" carrier; no env-var auto-detection.** Alternative: read `SLAMINAR_AGENT_MODE=1` or inspect parent process to force the passthrough mode. Rationale: SKILL.md already defines "this was invoked via Claude Code" precisely — being inside a Claude Code skill call is exactly the signal we need, no extra channel required. Env-var detection would add false-positive risk without new capability. Evidence: `src/skill/SKILL.md` frontmatter + workflow.

**Cross-refs.** [CHANGELOG v0.8.2](./CHANGELOG.md#082--2026-04-17) · [spec: `2026-04-17-claude-code-passthrough-design.md`](./docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md) · no new tests (existing 338 continue to pass).

### Phase 16: Init-First Mini-Setup (v0.8.4)

**Motivation.** Up to v0.8.3, a user running `slaminar init <path>` for the first time saw only a passive nudge — "Run `slaminar setup` once" — then got local rules whether they wanted AI or not. The 15-decision `slaminar setup` wizard felt like a gate before doing the actual thing (init). Simulation data made the gap concrete: path A (Claude Code `/slaminar`) needed 2 decisions, path B (terminal wizard + init) needed 15. We want `init` itself to handle first-run gracefully so most users never need to type `setup`.

**Shipped.**
- `src/setup/inline-prompt.ts` — new `runInlineAuthPrompt()` asks a single select question and branches into Skip / Cloudflare / Anthropic
- `src/auth/wizard.ts` — new `runLoginWizardForProvider()` export that skips provider selection (already chosen) and delegates to the existing `setupCloudflare()` / `setupAnthropic()` flows
- `src/cli.ts` init action — passive nudge replaced with the active mini-setup; auth failure aborts init with three recovery paths; successful Skip or auth persists `defaults.json` so future runs stay silent
- `tests/setup/inline-prompt.test.ts` — 5 new unit tests (338 → 343)

**Decisions.**

- **D16.1 — First-run gate is presence/absence of `~/.config/slaminar/defaults.json`.** Alternative: combine multiple signals (defaults + auth + env vars). Rationale: both `slaminar setup` and the new mini-setup write `defaults.json` when they finish. A single file-exists check is deterministic and false-positive-free. Evidence: `src/setup/defaults.ts:defaultsExist`, `src/cli.ts` init-action gate.
- **D16.2 — Mini-setup asks exactly one question (AI provider).** Alternative: ask 2–3 questions (tool install, catalog, etc.). Rationale: simulation showed 14 of the setup wizard's 15 decisions had reasonable silent defaults. Forcing the first-run user to navigate more than one question re-creates the friction we wanted to remove. Catalog / tool install / weekly version check all stay at their built-in defaults until the user explicitly reconfigures. Evidence: `src/setup/inline-prompt.ts:runInlineAuthPrompt`, `src/setup/defaults.ts:builtInDefaults`.
- **D16.3 — Auth failure aborts init with three recovery paths (no graceful fallback).** Alternative: fall back to local rules silently. Rationale: a user who actively picked Cloudflare or Anthropic is expressing intent to use AI. Silently demoting to local rules would produce an output different from what they asked for, with no obvious way to recover. Aborting with a clear "what to do" list respects the intent and is easier to debug. Skip is its own success path; this decision only covers explicit-provider + auth-fail. Evidence: `src/cli.ts` init-action auth-failure branch.
- **D16.4 — `slaminar setup` is untouched — mini-setup is an independent code path.** Alternative: rework `setup` to delegate to mini-setup, or rename `setup → setup --advanced`. Rationale: backward compatibility is a hard constraint for existing users and CI scripts. The only shared primitive is `runLoginWizardForProvider()`, which both paths call. Evidence: `src/setup/wizard.ts` unchanged, `src/auth/wizard.ts` diff limited to one new exported function.
- **D16.5 — No `claude` CLI detection in v0.8.4 — reserved for v0.9.0.** Alternative: detect `claude` now and offer a 4th "Use Claude Code subscription" option. Rationale: YAGNI. The choices array is structured so a future release can prepend the passthrough option with a single line change. Shipping passthrough separately keeps v0.8.4 reviewable and lets v0.9.0 focus on the detection + subprocess design unknowns. Evidence: structure of `choices` in `inline-prompt.ts`.

**Cross-refs.** [CHANGELOG v0.8.4](./CHANGELOG.md#084--2026-04-17) · [spec: `2026-04-17-v0-8-4-init-first-design.md`](./docs/superpowers/specs/2026-04-17-v0-8-4-init-first-design.md) · test file: `tests/setup/inline-prompt.test.ts`.

### Phase 17: Catalog Ecosystem (v0.8.5)

**Motivation.** v0.8.0 shipped federated catalog sources — the bundled / official / user / project / env / CLI stack — with a `CatalogSource.type: 'file' | 'url' | 'github' | 'official'` schema and the merge/cache plumbing to back it. In practice one branch was declared-only: `source.type === 'file'` went through `fetchRemoteCatalog()`, which delegates to Node's native `fetch()` — and Node's fetch refuses `file:` URIs without an experimental flag. So local-file catalog sources, the escape hatch for teams that wanted a shared catalog over a network drive or inside a monorepo, silently didn't work. Separately, users building presentation-generation workflows had no starting point — the catalog didn't seed that ecosystem at all — and catalog authors writing their own JSON had no reference beyond source code.

**Shipped.**
- `src/recommender/catalog-remote.ts` — new `fetchLocalCatalog(uri)` reads `file://`, `~/`, `./`, and absolute paths via `node:fs`. New `fetchCatalogBySource(source, etag?)` dispatcher routes by `source.type`: `file` → local, `url`/`official` → HTTP, `github:owner/repo/path` → expanded to `raw.githubusercontent.com` URL and routed through HTTP
- `src/recommender/catalog-resolver.ts` — one-line swap: calls the dispatcher instead of `fetchRemoteCatalog` directly
- `tests/recommender/catalog-remote.test.ts` — 4 new tests covering absolute paths, `file://` URIs, `~/` expansion, and schema rejection (343 → 347)
- `catalog/catalog.json` — 10 new presentation tools (`python-pptx`, `md2pptx`, `powerpointer`, `pymupdf`, `pdf2image`, `playwright`, `slidev`, `marp`, `reveal.js`, `presenton`), 6 new relations, catalog version `2.0.0` → `2.1.0` (tools 46 → 56)
- `docs/catalog-tools-reference.md` (new, ~655 lines) — hand-curated "what is this tool / when to use it / how to install" index; presentation category fully covered, one representative per existing category as a starter
- `docs/catalog-authoring-guide.md` (new, ~266 lines) — step-by-step authoring guide: 5-minute tutorial with local-file registration, full schema tables (`CatalogTool` / `CatalogSuggestion` / `ToolConflict`), practical patterns, extend vs replace decision guide, validation, hosting comparison, deprecation flow, troubleshooting

**Decisions.**

- **D17.1 — New `fetchCatalogBySource` dispatcher instead of extending `fetchRemoteCatalog`.** Alternative: teach `fetchRemoteCatalog` to handle all source types and rename it. Rationale: `fetchRemoteCatalog` is called directly by downstream code paths; changing its semantics risks silent behavior shifts. A dispatcher layered above keeps the existing signature intact and makes transport logic per-source-type easy to read. The dispatcher is a single switch on `source.type` — adding a new transport (e.g., S3 in a future release) is a one-branch change. Evidence: `src/recommender/catalog-remote.ts:fetchCatalogBySource`.
- **D17.2 — Local files read via `fs.readFile`, not `fetch('file://...')`.** Alternative: enable Node's experimental-fetch flag for file URIs. Rationale: experimental flags are invisible failure modes across Node versions; slaminar supports Node ≥ 20 and `fetch('file://')` would fail on most of that range without per-user flag hygiene. Reading through `fs.readFile` is boring, explicit, and works everywhere. The cost is ~30 lines of URI-normalization logic (`file://`, `~/`, `./`, absolute) — cheaper than documenting a flag. Evidence: `src/recommender/catalog-remote.ts:fetchLocalCatalog`.
- **D17.3 — Presentation category is OSS-only; commercial AI APIs deliberately excluded.** Alternative: include commercial APIs (Gamma, 2Slides, Beautiful.ai, SlideSpeak, Aspose.Slides) with install instructions pointing to API-key signup. Rationale: slaminar's pipeline runs offline by default, and the bundled catalog ships to every user — including CI boxes and air-gapped environments. A `recommender` output that requires signing up for a paid SaaS contradicts that contract. The authoring guide documents how a user or team can add commercial entries to their own custom catalog, so the information isn't lost — just unbundled. Evidence: `catalog/catalog.json` (no commercial entries), `docs/catalog-authoring-guide.md` "patterns" section.
- **D17.4 — Reference docs ship incrementally, not gated on 100% catalog coverage.** Alternative: delay `docs/catalog-tools-reference.md` until all 56 tools have full write-ups. Rationale: the presentation category is the one users most need a guide for right now (10 tools, many with overlapping roles). One representative per existing category documents the schema-in-action so contributors can continue filling in the rest; gating on full coverage would push the doc to v0.9+ and force users back to reading source code in the meantime. Evidence: TODO markers in `docs/catalog-tools-reference.md` explicitly scope the remaining work to v0.8.6+.

**Cross-refs.** [CHANGELOG v0.8.5](./CHANGELOG.md#085--2026-04-17) · design plan: `0-8-jiggly-ullman.md` (approved) · tests: `tests/recommender/catalog-remote.test.ts` · new docs: [`docs/catalog-tools-reference.md`](./docs/catalog-tools-reference.md), [`docs/catalog-authoring-guide.md`](./docs/catalog-authoring-guide.md).

### Phase 18: Token-Cost Tier for Tool Recommendations (v0.9.0)

**Motivation.** Until v0.8.x the only axis for governing AI/ecosystem cost was binary: `--no-ai` on or off. There was no middle ground for "use AI, but don't bring me tools that bloat every Claude Code session." Many popular ecosystem tools (MCP servers, LSP attachments, persistent knowledge-graph plugins, multi-agent orchestrators) meaningfully change the outer-Claude session's token footprint. Users who wanted a lean setup had to either accept slaminar's full recommendation or manually filter the output themselves. A tier axis — conservative / smart / rich — lets slaminar honor intent while keeping the recommender catalog-driven.

**Shipped.**
- `src/recommender/token-cost.ts` (new) — `inferTokenCost(tool)` heuristic (tag/category rules), `resolveTokenCost(tool) = tool.tokenCost ?? inferTokenCost(tool)` hybrid API. Distribution on the bundled 56-tool catalog: **low 9 / medium 34 / high 13** with zero manual overrides.
- `src/recommender/tier-filter.ts` (new) — `filterByTier(scored, tier)` pure function. Conservative keeps all `low` + `medium` with score ≥ 80; Smart keeps all except `high` below score 70; Rich keeps everything.
- `src/recommender/recommender.ts` — tier filter runs after overlap resolution and before the maturity `maxTools` cap, so tier-excluded slots can be backfilled by the next-best tool.
- `src/types/index.ts` — new `TokenCost` / `TokenTier` types, `CatalogTool.tokenCost` / `tokenCostRationale` optional override fields, `UserDefaults.defaults.tokenTier`, `ExcludedTool` extended with `tier` / `cost` / `score` metadata.
- `src/setup/defaults.ts` / `src/setup/wizard.ts` — `builtInDefaults.defaults.tokenTier = 'smart'`, Step 4 select question, `SLAMINAR_DEFAULT_TOKEN_TIER` env var for `--yes`.
- `src/cli.ts` — `--token-tier <tier>` on both `init` and `recommend`, `resolveTokenTier()` helper that layers CLI over defaults over built-in.
- `src/core/pipeline.ts` / `src/setup/doctor.ts` / `src/reporter/terminal.ts` — pipeline carries `tokenTier` through to the recommender, doctor prints current tier, terminal reporter adds an "Excluded by tier filter" mini-table for transparency.
- `tests/recommender/{token-cost,tier-filter}.test.ts` (new, ~15 cases) + 3 new cases in `recommender.test.ts` covering tier integration. Total: 347 → 365 tests.

**Decisions.**

- **D18.1 — Hybrid cost model: heuristic by default, catalog override optional.** Alternative: require every catalog entry to specify `tokenCost` explicitly. Rationale: catalogs evolve; new tools should be classified safely even if the author never thinks about cost. The heuristic covers the common shape (hook=low, MCP-ish=high), and rare edge cases get a one-line override. Override count itself becomes a proxy for heuristic quality — if you need >10 overrides on 56 tools, fix the heuristic. Evidence: `src/recommender/token-cost.ts:resolveTokenCost`.
- **D18.2 — Heuristic default is `medium`.** Alternative: `low`. Rationale: for an unknown tool, `medium` is the conservative-safe default — Conservative tier only passes it at score ≥ 80, so unclassified tools still get a quality gate. A `low` default would let unknown tools through Conservative filter silently, defeating the purpose. Evidence: fallthrough branch in `inferTokenCost()`.
- **D18.3 — Tier policy is a code constant (no `catalog.json tierPolicy` override in v0.9.0).** Alternative: expose `tierPolicy` in the catalog schema immediately so enterprise hosts can customize thresholds. Rationale: YAGNI until someone asks. Simpler shipping surface. The field is reserved in the schema sketch so a future release can add override without migration. Evidence: `src/recommender/tier-filter.ts` uses hardcoded `MEDIUM_THRESHOLD_CONSERVATIVE = 80` / `HIGH_THRESHOLD_SMART = 70`.
- **D18.4 — Excluded tools are shown, not hidden.** "Excluded by tier filter (N)" table appears in dry-run and init reports. Rationale: transparency — a user who expected to see Playwright in the recommendations should immediately understand why it's gone and how to flip to `rich` if they want it back. Hiding would feel like slaminar is lying.
- **D18.5 — Score-based escape hatches (Conservative medium ≥ 80, Smart high ≥ 70).** Alternative: pure cost filter with no score consideration. Rationale: the scorer already encodes "how well this tool fits the profile." If a tool is a perfect fit (score 95) but happens to be classified `medium`, excluding it under Conservative feels arbitrary. The score threshold protects "cheap-and-useful" signal from being lost. Evidence: `shouldInclude()` in `tier-filter.ts`.
- **D18.6 — Inline mini-setup does NOT ask tokenTier (D16.2 contract preserved).** First-run UX stays one question (AI provider). `builtInDefaults` silently sets `tokenTier: 'smart'`. Users who want a different tier can change it in `slaminar setup` or pass `--token-tier`. Evidence: `src/setup/inline-prompt.ts` unchanged.
- **D18.7 — Tier filter gates recommendations only, not installs.** Alternative: warn or block when a user runs `slaminar install <high-cost-tool>` under Conservative. Rationale: recommendations are slaminar's opinion; installation is the user's decision. A gate would feel paternalistic and fight users who know what they're doing. The transparent exclusion report is enough signal. Evidence: filter lives in `recommender.ts` alone; `src/rollback/uninstaller.ts` is untouched.
- **D18.8 — 56-tool full heuristic audit, minimal overrides.** Target: ≤10 overrides. Actual: 0. The audit found one heuristic gap (`lsp` / `static-analysis` tags), fixed in the heuristic itself (not as overrides) so future LSP-style tools are auto-classified correctly. Evidence: `HEAVY_TAGS` in `token-cost.ts`.
- **D18.9 — Custom catalog tools get the same automatic classification.** `resolveTokenCost()` runs catalog-agnostic: bundled / official / user / project / env / CLI tools all go through the same hybrid pipeline. Users setting up a custom catalog don't need to annotate `tokenCost` — the heuristic handles it, and they can selectively override when they disagree. This is an **intentional** property of layering the tier filter *after* catalog merge, not an accidental side-effect.

**Cross-refs.** [CHANGELOG v0.9.0](./CHANGELOG.md#090--2026-04-17) · design plan: `harmonic-wishing-pumpkin.md` (approved) · tests: `tests/recommender/token-cost.test.ts`, `tests/recommender/tier-filter.test.ts`, `tests/recommender/recommender.test.ts`.

### Cross-Reference Index (v0.5 → v0.9.0)

Every numbered decision above appears in three places — README (here), CHANGELOG (release notes), and design spec (when one exists). Decision IDs are **identical between `README.md` and `README.ko.md`** — use `grep -n "D14\.3" README*.md` to verify parity. File paths can be opened directly to audit claims; test files can be run in isolation with `npm test -- --run <path>`.

| ID | Title | CHANGELOG | Spec | Source | Tests |
|---|---|---|---|---|---|
| D11.1 | Triple-safe postinstall | v0.5.0 | — | `src/skill/post-install.ts` | `tests/skill/installer.test.ts` |
| D11.2 | SHA-256 idempotence | v0.5.0 | — | `src/skill/installer.ts` | `tests/skill/installer.test.ts` |
| D11.3 | Build assets copy script | v0.5.0 | — | `scripts/copy-assets.mjs` | — |
| D11.4 | Backup only on divergent overwrite | v0.5.0 | — | `src/skill/installer.ts` | `tests/skill/installer.test.ts` |
| D11.5 | Path-parameterized SKILL.md | v0.5.0 | — | `src/skill/SKILL.md` | — |
| D12.1 | Single `setup` entry point | v0.6.0 | `2026-04-17-global-setup-plan.md` | `src/setup/wizard.ts` | `tests/setup/wizard.test.ts` |
| D12.2 | XDG config location | v0.6.0 | same | `src/setup/defaults.ts` | `tests/setup/defaults.test.ts` |
| D12.3 | Weekly version check | v0.6.0 | same | `src/setup/update-check.ts` | `tests/setup/update-check.test.ts` |
| D12.4 | `--yes` + env vars for CI | v0.6.0 | same | `src/setup/wizard.ts` | `tests/setup/wizard.test.ts` |
| D12.5 | Doctor read-only | v0.6.0 | same | `src/setup/doctor.ts` | `tests/setup/doctor.test.ts` |
| D12.6 | Malformed-JSON recovery | v0.6.0 | same | `src/setup/defaults.ts` | `tests/setup/defaults.test.ts` |
| D13.1 | User-specified roots | v0.7.0 | spec §v0.7 | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D13.2 | Stop at confirmed project | v0.7.0 | same | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D13.3 | Dry-run default | v0.7.0 | same | `src/discover/batch.ts`, `src/setup/wizard.ts` | `tests/discover/batch.test.ts` |
| D13.4 | Batch audit log | v0.7.0 | same | `src/discover/batch.ts` | `tests/discover/batch.test.ts` |
| D13.5 | `existing` → `init-merge` | v0.7.0 | same | `src/discover/detector.ts` | `tests/discover/detector.test.ts` |
| D13.6 | Realpath inode dedup | v0.7.0 | same | `src/discover/scanner.ts` | `tests/discover/scanner.test.ts` |
| D14.1 | Phase 1–3 only, defer v0.9 | v0.8.0 | `2026-04-16-custom-catalog-plan.md` | — | — |
| D14.2 | Read-path-only migration | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D14.3 | Per-source cache files | v0.8.0 | same | `src/recommender/catalog-cache.ts` | `tests/recommender/catalog-cache.test.ts` |
| D14.4 | Wizard single URL + CLI hint | v0.8.0 | same | `src/setup/wizard.ts:stepCatalog` | `tests/setup/wizard.test.ts` |
| D14.5 | Bundled exempt from replace-floor | v0.8.0 | same | `src/recommender/catalog-merger.ts` | `tests/recommender/catalog-merger.test.ts` |
| D14.6 | trust persisted, not enforced | v0.8.0 | same | `src/types/index.ts` | — |
| D14.7 | CLI `--catalog` as adhoc source | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-resolver.test.ts` |
| D14.8 | Stable `cli-adhoc` ID vs hashed env IDs | v0.8.0 | same | `src/recommender/catalog-sources.ts` | `tests/recommender/catalog-sources.test.ts` |
| D15.1 | Force `--no-ai` in Claude Code context | v0.8.2 | `2026-04-17-claude-code-passthrough-design.md` | `src/skill/SKILL.md` | — |
| D15.2 | Enhancement boundary = ownership markers | v0.8.2 | same | `src/placer/markers.ts`, `src/core/updater.ts` | — |
| D15.3 | SKILL.md carrier, no env-var auto-detection | v0.8.2 | same | `src/skill/SKILL.md` | — |
| D16.1 | `defaults.json` presence is the first-run gate | v0.8.4 | `2026-04-17-v0-8-4-init-first-design.md` | `src/cli.ts`, `src/setup/defaults.ts` | `tests/setup/inline-prompt.test.ts` |
| D16.2 | Mini-setup asks exactly one question | v0.8.4 | same | `src/setup/inline-prompt.ts` | `tests/setup/inline-prompt.test.ts` |
| D16.3 | Auth failure aborts init, no graceful fallback | v0.8.4 | same | `src/cli.ts` | — |
| D16.4 | `slaminar setup` untouched; mini-setup independent | v0.8.4 | same | `src/setup/wizard.ts`, `src/auth/wizard.ts` | — |
| D16.5 | No `claude` CLI detection (YAGNI until v0.9.0) | v0.8.4 | same | `src/setup/inline-prompt.ts` | — |
| D17.1 | Dispatcher pattern for catalog source types | v0.8.5 | `0-8-jiggly-ullman.md` | `src/recommender/catalog-remote.ts` | `tests/recommender/catalog-remote.test.ts` |
| D17.2 | Local files via `fs.readFile`, not `fetch('file://')` | v0.8.5 | same | `src/recommender/catalog-remote.ts:fetchLocalCatalog` | `tests/recommender/catalog-remote.test.ts` |
| D17.3 | Presentation category: OSS-only, commercial APIs excluded | v0.8.5 | same | `catalog/catalog.json` | — |
| D17.4 | Reference docs ship incrementally, not gated on full coverage | v0.8.5 | same | `docs/catalog-tools-reference.md` | — |
| D18.1 | Hybrid cost model: heuristic + optional override | v0.9.0 | `harmonic-wishing-pumpkin.md` | `src/recommender/token-cost.ts` | `tests/recommender/token-cost.test.ts` |
| D18.2 | Heuristic default is `medium` (conservative-safe) | v0.9.0 | same | `src/recommender/token-cost.ts` | `tests/recommender/token-cost.test.ts` |
| D18.3 | Tier policy is a code constant (no override in v0.9.0) | v0.9.0 | same | `src/recommender/tier-filter.ts` | `tests/recommender/tier-filter.test.ts` |
| D18.4 | Excluded tools shown in a dedicated report table | v0.9.0 | same | `src/reporter/terminal.ts` | — |
| D18.5 | Score thresholds (med ≥ 80 / high ≥ 70) protect cheap-and-useful | v0.9.0 | same | `src/recommender/tier-filter.ts` | `tests/recommender/tier-filter.test.ts` |
| D18.6 | Inline mini-setup does NOT ask tokenTier (preserves D16.2) | v0.9.0 | same | `src/setup/inline-prompt.ts` (unchanged) | — |
| D18.7 | Tier filter gates recommendations only, not installs | v0.9.0 | same | `src/recommender/recommender.ts` | `tests/recommender/recommender.test.ts` |
| D18.8 | Heuristic audit over overrides (0 overrides in v0.9.0) | v0.9.0 | same | `src/recommender/token-cost.ts:HEAVY_TAGS` | — |
| D18.9 | Custom catalog tools classified via same hybrid pipeline | v0.9.0 | same | `src/recommender/recommender.ts` | `tests/recommender/tier-filter.test.ts` |

### Quality Passes

Three rounds of review covering error handling, code quality, and remaining issues — including `--dry-run`/`--verbose` flags, pipeline and planner tests, prerequisite checker, runtime detector, installer, and Claude Code skill definition.

---

## Roadmap

Features under consideration for future releases:

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-source catalogs** | Merge multiple catalog sources with priority layers | **Shipped v0.8** ([D14.1–D14.8](#cross-reference-index-v05--v08)) |
| **`catalog source` CLI** | `source add/list/remove/enable/disable/test` commands | **Shipped v0.8** |
| **`SLAMINAR_CATALOG_SOURCES` env var** | Multi-catalog config via environment for CI | **Shipped v0.8** |
| **Personal tools** | `personalTools` field in local config | Stub (type exists) |
| **`slaminar install`** | Install recommended tools directly | Planned |
| **Catalog trust enforcement** | v0.9 — prompt before installing `untrusted` sources, detect risky install commands (`rm`, `sudo`, `curl \| bash`), HTTPS-required policy, signed-catalog `verified` trust | Planned (v0.9) |
| **`npm:@scope/name` source type** | v0.9 — install catalogs via npm for private-registry teams | Planned (v0.9) |
| **Legacy field cleanup** | v0.9 — remove deprecated `catalogUrl`/`catalogMode` single-value fields | Planned (v0.9) |

See [`docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) for the full multi-source catalog design, and [`docs/superpowers/specs/2026-04-17-global-setup-plan.md`](./docs/superpowers/specs/2026-04-17-global-setup-plan.md) for the setup/discovery/federation roadmap.

---

## Project Stats

| Metric | Value |
|--------|-------|
| Source modules | 61 |
| Test files | 55 |
| Test cases | 338 |
| CLI commands | 28 |
| Catalog tools | 46 (online) + 14 (bundled fallback) |
| Catalog source layers | 6 (bundled → official → user → project → env → CLI, since v0.8.0) |
| AI providers | 2 (Cloudflare Workers AI, Anthropic Claude) |
| Claude Code integration | Auto-deployed `/slaminar` skill (since v0.5.0) |
| Global setup | `setup` + `doctor` + `~/.config/slaminar/defaults.json` (since v0.6.0) |
| Project discovery | `slaminar discover` + batch apply (since v0.7.0) |

---

## FAQ

### Will slaminar overwrite my existing CLAUDE.md?

No. Every existing file is backed up first under `.slaminar/.bk/` with an obfuscated filename. slaminar-generated sections are wrapped in `<!-- slaminar:begin/end -->` markers, and any content you wrote by hand is left completely untouched. You can always restore the original with `slaminar uninstall`.

### Does it actually install the recommended tools?

No. `slaminar init` only generates files (CLAUDE.md, plugins, reports). Each recommended tool's install commands are shown in the output and saved in the report, so you can review and run them yourself. Automatic tool installation is planned for a future release.

### Does it require an external server or authentication?

No. slaminar runs entirely locally. Tools in the catalog that require authentication are automatically excluded from recommendations. AI enhancement is optional — without `ANTHROPIC_API_KEY` or Cloudflare credentials, everything works using local rules.

### Can I use it with my team?

Yes. `.slaminar/config.json` is committed to git (shared team settings), while `.slaminar/config.local.json` and `.slaminar/.bk/` are gitignored (personal). Team members can sync settings with `slaminar update`, and `.slaminar/reports/*.md` reports can be included in PRs as review artifacts.

### Can I validate in CI?

Use `slaminar check --ci`. Exit codes: 0 (pass), 1 (warnings), 2 (errors) — ready for CI pipeline integration.

### Which projects are supported?

TypeScript/JavaScript, Python, Rust, Go, Java/Kotlin/Scala, and Elixir. slaminar adjusts its recommendations from brand-new greenfield projects to mature codebases with 200+ commits.

### Is AI enhancement required?

Not at all. Without any AI provider configured, slaminar works fully using local rules. Setting up AI improves the quality and specificity of the generated CLAUDE.md. Cloudflare Workers AI gives you 10,000 free Neurons/day — more than enough for typical usage.

### Are tokens stored securely?

Tokens are saved in `~/.config/slaminar/auth.json` with file permission `0600` (owner read/write only), following the XDG Base Directory specification. They are never stored inside `.slaminar/`, so there is zero risk of accidentally committing tokens to your repository.

### Cloudflare vs. Anthropic — which should I use?

For most use cases, **Cloudflare Workers AI** is the better choice: the free tier is generous, and Llama 3.3 70B produces solid CLAUDE.md improvements. If you need the highest quality output or need long context windows (200K+), go with **Anthropic Claude**. You can switch anytime with `slaminar setup --reconfigure auth`.

### What Cloudflare token permissions do I need?

At minimum, `Workers AI: Read`. The following optional permissions improve the setup experience:
- `User: User Details: Read` — shows your email on login
- `User: Memberships: Read` — auto-detects your Account ID (no manual entry)
- `AI Gateway: Read` — for future caching/analytics features

### How do I use AI in CI?

Set environment variables: `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` (or `ANTHROPIC_API_KEY`) as GitHub Secrets or your CI provider's equivalent. slaminar picks them up automatically — no auth.json needed.

### Can I use a private tool catalog?

Yes. For one-off use, pass `--catalog <url>` with `init`, `recommend`, or `catalog update`. To persist the setting for your project, run `slaminar catalog config --url <url> --mode extend` (merge with official) or `--mode replace` (custom only). See [Persistent Catalog Configuration](#persistent-catalog-configuration) for details.

---

## Versioning

This project follows [Semantic Versioning](https://semver.org/). See [CHANGELOG.md](./CHANGELOG.md) for the full version history.

| Range | Stage | Meaning |
|-------|-------|---------|
| `0.1.x` – `0.x.y` | **Alpha (current)** | API may change, collecting early feedback |
| `0.9.x` | **Beta** | Feature-frozen, stability validation |
| `1.0.0+` | **Stable** | Stable API, breaking changes bump major |

### Releasing (maintainers only)

```bash
npm run release:patch   # 0.2.0 → 0.2.1 (bug fixes)
npm run release:minor   # 0.2.0 → 0.3.0 (new features)
npm run release:major   # 0.x.y → 1.0.0 (breaking changes, from 1.0 onward)
```

These commands automatically:
1. Run tests + build
2. Bump the version in `package.json`
3. Create a git tag (`v0.3.0` format)

Then publish with `git push --follow-tags && npm publish`.

---

## Contributing

Issues and Pull Requests are welcome.

### How to Contribute

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Write tests first (TDD encouraged)
4. Commit your changes (`git commit -m 'feat: add amazing feature'`)
5. Push to the branch (`git push origin feature/amazing-feature`)
6. Open a Pull Request

### Development Principles

- **TDD**: write tests before implementation
- **Small commits**: one concern per commit
- **Conventional Commits**: `feat:`, `fix:`, `docs:`, `test:`, `refactor:`, etc.
- **Security**: all shell execution via `execFileSync` (arguments as arrays)

### Adding a Tool to the Catalog

1. Add a `CatalogTool` entry in `src/recommender/catalog.ts`
2. Required fields: name, repo, category, installMethod, installCommands, tags, maturityFit
3. Set `authRequired` and `networkRequired` accurately
4. Update `tests/recommender/catalog.test.ts`

---

## License

MIT

---

## Author

**pathcosmos** ([@pathcosmos](https://github.com/pathcosmos))

## Related Projects

- [sincenety](https://github.com/pathcosmos/sincenety) — Automatic Claude Code work session logger
- [mdmizer](https://github.com/pathcosmos/mdmizer) — Markdown repository viewer SPA

## Acknowledgments

Thanks to all the Claude Code ecosystem tool creators:
- [caveman](https://github.com/JuliusBrussee/caveman) — Token savings
- [planning-with-files](https://github.com/OthmanAdi/planning-with-files) — Markdown planning
- [impeccable](https://github.com/pbakaus/impeccable) — Frontend design
- [graphify](https://github.com/safishamsi/graphify) — Knowledge graphs
- And all other tools in the catalog
