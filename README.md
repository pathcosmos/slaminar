# slaminar

[![Tests](https://img.shields.io/badge/tests-204%20passing-brightgreen)](https://github.com/pathcosmos/slaminar)
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
- [Usage](#usage)
- [Project Analysis](#project-analysis)
- [Generated Output](#generated-output)
- [Dynamic Catalog](#dynamic-catalog)
  - [Creating a Custom Catalog](#creating-a-custom-catalog)
  - [Persistent Catalog Configuration](#persistent-catalog-configuration)
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

### AI Enhancement (Optional)

Run `slaminar login` once and AI-powered CLAUDE.md enhancement is automatically applied across all your projects.

```bash
slaminar login       # Interactive setup (one-time)
slaminar whoami      # Check login status
slaminar auth test   # Run token & API diagnostics
slaminar auth switch cloudflare   # Switch providers
slaminar logout      # Remove stored credentials
```

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
| `~/.config/slaminar/auth.json` (mode 0600) | 3 | Saved via `slaminar login` |
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

### Claude Code Skill

slaminar can be invoked directly from Claude Code as a skill:

```
User: /slaminar
Claude: Analyzing project... (slaminar init --dry-run)
        Shows results and asks for approval
```

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
├── cli.ts                        # CLI entry point (21 commands + global flags)
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
├── auth/                         # AI provider authentication
│   ├── config.ts                 # ~/.config/slaminar/auth.json (0600)
│   ├── models.ts                 # Cloudflare / Anthropic model catalog
│   ├── diagnostics.ts            # Token validation, /user, /memberships, inference test
│   └── wizard.ts                 # Interactive login flow
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
    └── SKILL.md                  # /slaminar skill definition
```

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

### Quality Passes

Three rounds of review covering error handling, code quality, and remaining issues — including `--dry-run`/`--verbose` flags, pipeline and planner tests, prerequisite checker, runtime detector, installer, and Claude Code skill definition.

---

## Roadmap

Features under consideration for future releases:

| Feature | Description | Status |
|---------|-------------|--------|
| **Multi-source catalogs** | Merge multiple catalog sources (official + company + personal) with priority layers | MVP shipped (`catalog config --mode extend`) |
| **`catalog source` CLI** | `catalog source add/remove/list/test` for managing catalog sources | Planned |
| **Personal tools** | `personalTools` field in local config for user-specific tool additions | Stub (type exists) |
| **`slaminar install`** | CLI command to install recommended tools directly | Planned |
| **Catalog trust levels** | `trusted` / `untrusted` / `verified` trust model for external catalogs | Planned |
| **`SLAMINAR_CATALOG_SOURCES` env var** | Multi-catalog configuration via environment variable for CI | Planned |

See [`docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`](./docs/superpowers/specs/2026-04-16-custom-catalog-plan.md) for the full multi-source catalog design.

---

## Project Stats

| Metric | Value |
|--------|-------|
| Source modules | 47 |
| Test files | 42 |
| Test cases | 213 |
| CLI commands | 21 |
| Catalog tools | 46 (online) + 14 (bundled fallback) |
| AI providers | 2 (Cloudflare Workers AI, Anthropic Claude) |

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

For most use cases, **Cloudflare Workers AI** is the better choice: the free tier is generous, and Llama 3.3 70B produces solid CLAUDE.md improvements. If you need the highest quality output or need long context windows (200K+), go with **Anthropic Claude**. You can switch anytime with `slaminar auth switch`.

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
