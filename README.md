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
- [Verification](#verification)
- [Error Handling & Safety](#error-handling--safety)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Development](#development)
- [Implementation History](#implementation-history)
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

The tool catalog contains 24 Claude Code ecosystem tools (with an online catalog that can be updated independently of releases). slaminar automatically selects the right ones for your project.

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
slaminar catalog check                     # Detect deprecated tools
slaminar catalog info <name>               # Detailed tool info
slaminar catalog status                    # Cache status (age, validity, source)
slaminar catalog rollback                  # Restore previous catalog version
```

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

- **Online catalog**: 24 tools fetched from GitHub, updated without upgrading slaminar
- **Local cache**: `~/.config/slaminar/catalog-cache.json` with 24-hour TTL
- **Fallback chain**: valid cache → remote fetch → stale cache → bundled fallback
- **ETag support**: conditional HTTP requests to minimize bandwidth
- **Catalog diff**: shows added, removed, deprecated, and updated tools on each update
- **Custom catalog URL**: point to your own catalog with `--catalog <url>` for enterprise or private tool registries
- **Rollback**: instantly restore the previous catalog version

### Catalog Tools (24)

| Tool | Purpose | Install |
|------|---------|---------|
| caveman | 65% token savings | marketplace |
| planning-with-files | Markdown-based planning | npx |
| impeccable | Frontend design quality | marketplace |
| playwright-skill | Browser automation testing | marketplace |
| get-shit-done | Spec-driven development | npx |
| claude-mem | Session memory | npx |
| graphify | Code → knowledge graph | pip |
| cartographer | Codebase mapping | marketplace |
| trailofbits/skills | Security review | marketplace |
| everything-claude-code | Performance optimization | git-clone |
| claude-hud | Real-time monitoring | marketplace |
| homunculus | Pattern learning | marketplace |
| wshobson/agents | Multi-agent orchestration | npx |
| claude-code-lsps | 20+ language LSPs | marketplace |
| terraform-skill | IaC / DevOps | marketplace |
| claude-code-templates | Project bootstrap | npx |
| laravel/agent-skills | PHP / Laravel | marketplace |
| claude-on-rails | Ruby / Rails | marketplace |
| apollographql/skills | GraphQL | marketplace |
| spec-kit | Spec-driven (GitHub official) | marketplace |
| claude-code-subagents | 100+ subagents | marketplace |
| awesome-claude-skills-security | Pentest skills | marketplace |
| *+ 2 more* | *See `slaminar catalog list`* | — |

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
├── cli.ts                        # CLI entry point (20 commands + global flags)
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

### Quality Passes

Three rounds of review covering error handling, code quality, and remaining issues — including `--dry-run`/`--verbose` flags, pipeline and planner tests, prerequisite checker, runtime detector, installer, and Claude Code skill definition.

---

## Project Stats

| Metric | Value |
|--------|-------|
| Source modules | 47 |
| Test files | 41 |
| Test cases | 204 |
| CLI commands | 20 |
| Catalog tools | 24 (online) + 14 (bundled fallback) |
| AI providers | 2 (Cloudflare Workers AI, Anthropic Claude) |

---

## FAQ

### Will slaminar overwrite my existing CLAUDE.md?

No. Every existing file is backed up first under `.slaminar/.bk/` with an obfuscated filename. slaminar-generated sections are wrapped in `<!-- slaminar:begin/end -->` markers, and any content you wrote by hand is left completely untouched. You can always restore the original with `slaminar uninstall`.

### Does it actually install the recommended tools?

`slaminar init` only generates files. Tool installation is supported separately via the `installer` module. Each tool's install commands are included in the recommendation output so you can review them before running anything.

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

Yes. Use the `--catalog <url>` flag with `init`, `recommend`, or `catalog update` to point to your own catalog hosted on a private server or internal registry.

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
