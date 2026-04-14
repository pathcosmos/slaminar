# slaminar Design Spec

> Date: 2026-04-14
> Status: Draft — pending user review

## Overview

slaminar is a **Claude Code-focused project analyzer and setup tool**. Point it at any codebase, and it:

1. Scans the project structure, dependencies, git history, and existing AI context files
2. Analyzes the language, framework, architecture patterns, and conventions
3. Recommends Claude Code ecosystem tools (plugins, skills, hooks) — excluding anything that requires external server authentication
4. Generates a tailored `CLAUDE.md` and Claude Code plugin package
5. Backs up existing files (obfuscated filenames) and places generated files

## Form Factor

- **CLI**: `npx slaminar` / `slaminar init [path]`
- **Claude Code Skill**: `/slaminar` in any project
- **Language**: TypeScript (ESM, Node.js >= 18)
- **Package**: npm (`slaminar`)

## Architecture

### Pipeline

```
scan → analyze → recommend → plan → generate → place
```

Each phase produces a JSON-serializable intermediate representation (IR) passed to the next phase.

### Interaction Model (Smart Hybrid)

1. Auto-analyze the project (no user input needed)
2. Show results: project profile + recommended tools + generation plan
3. User reviews, modifies, approves
4. Generate and place files

### Directory Structure

```
src/
├── cli.ts                        # CLI entry (commander)
├── core/
│   ├── pipeline.ts               # Orchestrator: scan → analyze → recommend → plan → generate → place
│   ├── scanner.ts                # Phase 1: collect raw project data
│   ├── analyzer.ts               # Phase 2: derive project profile
│   ├── recommender.ts            # Phase 3: match ecosystem tools
│   ├── planner.ts                # Phase 4: build generation plan + user approval
│   ├── generator.ts              # Phase 5: produce files (local/AI mode)
│   └── placer.ts                 # Phase 6: backup + merge + write
├── scanner/
│   ├── file-tree.ts              # Directory structure scan (.gitignore aware)
│   ├── git-info.ts               # Recent commits, branches, contributors, commit style
│   ├── ai-files.ts               # Existing CLAUDE.md, .claude/ settings
│   └── package-info.ts           # package.json, Cargo.toml, pyproject.toml, go.mod, etc.
├── analyzer/
│   ├── language-detector.ts      # Primary/secondary language, framework, runtime, build tool
│   ├── structure-mapper.ts       # Architecture pattern (monorepo, SPA, CLI, API, library, etc.)
│   ├── convention-extractor.ts   # Naming, test framework, linter, formatter, commit style, doc language
│   └── dependency-analyzer.ts    # Notable dependencies, dev tools
├── recommender/
│   ├── catalog.ts                # Ecosystem catalog management (docs/claude-code-ecosystem.md)
│   ├── matcher.ts                # ProjectProfile → tool recommendations (rule-based)
│   └── installer.ts              # Tool installation (plugin registry, git clone, npm)
├── generator/
│   ├── claude-md.ts              # CLAUDE.md generation/merge
│   ├── claude-plugin.ts          # plugin.json + skills/ + hooks/ + agents/
│   └── ai-provider.ts            # Local rules vs Claude API routing
├── placer/
│   ├── backup.ts                 # Obfuscated backup to .slaminar/.bk/
│   ├── merger.ts                 # Section-level merge for structured files
│   └── writer.ts                 # Final file placement
├── runtime/
│   ├── detector.ts               # Detect Python/Node with timeout guard
│   ├── uv.ts                     # uv bootstrap + python install + tool install
│   ├── volta.ts                  # volta bootstrap + node install
│   └── prerequisite.ts           # PrerequisiteCheck orchestrator
├── skill/
│   └── SKILL.md                  # Claude Code skill definition
├── types/
│   └── index.ts                  # Shared type definitions
└── config/
    └── defaults.ts               # Default configuration
```

## Phase Details

### Phase 1: Scanner

Collects raw data without interpretation.

**Targets:**

| Category | What |
|----------|------|
| File tree | Directory structure, file extension counts, .gitignore applied |
| Package managers | package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, build.gradle |
| Git | Last 50 commits, branches, top contributors, commit message patterns |
| AI context | Existing CLAUDE.md, .claude/ directory |
| Configs | tsconfig.json, .eslintrc, .prettierrc, vite.config.*, etc. |
| CI/CD | .github/workflows/, Dockerfile, docker-compose.yml |
| Docs | README.md, SETUP.md, CONTRIBUTING.md, docs/ |

**Output:** `ProjectSnapshot`

```typescript
interface ProjectSnapshot {
  root: string;
  fileTree: FileNode[];
  fileStats: Record<string, number>;
  packages: PackageInfo[];
  git: GitInfo | null;
  existingAiFiles: AiFile[];
  configs: ConfigFile[];
  ci: CiConfig[];
  docs: DocFile[];
  scannedAt: string;
}
```

**Performance:**
- .gitignore + node_modules/, dist/, .git/ auto-excluded
- File count cap: 10,000 (configurable)
- Only reads content of config files and docs (not source files)

### Phase 2: Analyzer

Transforms raw snapshot into meaningful profile.

**Output:** `ProjectProfile`

```typescript
interface ProjectProfile {
  name: string;
  description: string;
  language: LanguageProfile;
  structure: StructureProfile;
  conventions: ConventionProfile;
  dependencies: DependencyProfile;
  existingAiContext: AiContextSummary;
}

interface LanguageProfile {
  primary: string;
  secondary: string[];
  framework: string | null;
  runtime: string | null;
  buildTool: string | null;
}

interface StructureProfile {
  pattern: string;         // "monorepo" | "spa" | "cli" | "library" | "api" | "fullstack"
  entryPoints: string[];
  testPattern: string | null;
  srcLayout: string;       // "flat" | "feature-based" | "layer-based"
}

interface ConventionProfile {
  naming: string;
  testFramework: string | null;
  linter: string | null;
  formatter: string | null;
  commitStyle: string | null;
  docLanguage: string;
}

interface DependencyProfile {
  total: number;
  notable: NotableDep[];
  devTools: string[];
}
```

### Phase 3: Recommender (Intelligent Selection)

Three-stage intelligent tool selection that considers project context holistically, not just simple rule matching.

**Catalog source:** `docs/claude-code-ecosystem.md` (maintained file)

#### Stage 1: Multi-dimensional Scoring

Each candidate tool is scored across multiple weighted factors:

```typescript
interface ScoringFactors {
  // Project characteristics
  languageMatch: number;        // Language/framework fit
  structureMatch: number;       // Architecture pattern fit
  scaleMatch: number;           // Project scale fit

  // Project maturity
  maturity: number;             // Commit count, age, contributor count
  hasTests: boolean;            // Test existence
  hasCi: boolean;               // CI/CD existence

  // Inter-tool relationships
  synergy: number;              // Synergy with other recommended tools
  conflict: number;             // Conflict potential (duplicate functionality)
  dependencyChain: number;      // Prerequisite tool needed

  // Practicality
  installComplexity: number;    // Installation difficulty
  tokenCost: number;            // Estimated token consumption
  maintenanceBurden: number;    // Maintenance overhead
}
```

**Context-aware scoring examples:**

| Situation | Decision |
|-----------|----------|
| React SPA, 3 commits, solo dev | impeccable only (early stage, avoid tool overload) |
| React SPA, 500 commits, 5-person team | impeccable + playwright-skill + claude-mem + Continuous-Claude-v3 |
| React SPA, 0 tests | playwright-skill priority → highest |
| React SPA, CLAUDE.md already 2000 lines | ClaudeForge excluded (already sufficient) |
| TypeScript CLI, no UI | impeccable excluded (irrelevant) |

#### Stage 2: Conflict/Overlap Detection

```typescript
interface ToolRelation {
  tools: [string, string];
  relation: "synergy" | "overlap" | "conflict";
  resolution: string;
}
```

Known relations:
- `everything-claude-code` ↔ `caveman`: overlap → pick one
- `planning-with-files` ↔ `get-shit-done`: synergy → recommend together
- `ClaudeForge` ↔ slaminar itself: conflict → slaminar generates CLAUDE.md, ClaudeForge unnecessary
- `cartographer` ↔ `graphify`: overlap → pick by codebase size (small: cartographer, large: graphify)

#### Stage 3: AI Refinement (optional, AI mode only)

Local scoring produces a candidate list. In AI mode, Claude API makes the final contextual judgment:

- Input: ProjectProfile + scored candidate list + reasons
- Output: refined selection with per-tool rationale
- Applies common-sense filtering local rules can't capture (e.g., "CLI tool → browser testing irrelevant")

#### Tool Count Limits

Based on project scale to avoid overload:
- Small project (< 50 commits, solo): max 3 tools
- Medium project (50-500 commits, 2-5 people): max 5 tools
- Large project (500+ commits, 5+ people): max 7 tools

#### Seed Matching Rules

Base rules that feed into scoring (not used as sole decision):

| Project Characteristic | Candidate Tools |
|-----------------------|-----------------|
| All projects | caveman, planning-with-files |
| Frontend (React, Vue, etc.) | impeccable, playwright-skill |
| CLI tool | get-shit-done |
| Security sensitive | trailofbits/skills |
| Large codebase | graphify, cartographer |
| Game (Godot) | godogen |
| Game (Unity) | mcp-unity |
| Elixir/Phoenix | claude-elixir-phoenix |
| Long-running project | claude-mem, pro-workflow |
| Team project | Continuous-Claude-v3 |
| Documentation-heavy | codebase-to-course |

#### Filtering (hard rules)

1. `authRequired === true` → auto-exclude
2. External server mandatory → exclude
3. Local-only operation possible → include

#### Auto-Installation

Three installation methods, all automatable:

```typescript
interface InstallAction {
  tool: string;
  method: "marketplace" | "npx" | "git-clone" | "pip";
  commands: string[];          // Command sequence to execute
  prerequisites: PrerequisiteCheck[];
}

interface PrerequisiteCheck {
  name: string;              // "python", "node", "bun"
  minVersion: string | null; // ">= 3.10", ">= 18"
  checkCommand: string;      // "python3 --version"
  available: boolean;        // Determined at runtime
  fallbackTool: string | null; // Alternative if prereq not met (e.g., "cartographer" for "graphify")
}
```

| Method | Commands | Example |
|--------|----------|---------|
| marketplace | `claude plugin marketplace add <owner/repo>` + `claude plugin install <name>` | impeccable, caveman, claude-hud |
| npx | `npx <package>` | get-shit-done, claude-mem |
| git-clone | `git clone <repo>` + `./install.sh` | gstack, everything-claude-code |
| pip | `pip install <package>` + `<cli> install` | graphify (`pip install graphifyy && graphify install`) |

**Prerequisite verification flow:**
```
For each recommended tool:
  1. Check prerequisites (e.g., python3 --version)
  2. If met → add to install plan
  3. If NOT met → check fallbackTool
     - If fallback exists and its prereqs are met → swap recommendation
     - If no fallback → exclude with reason "prerequisite not available"
  4. Report all prerequisite issues to user in plan approval step
```

**Example: graphify vs cartographer fallback:**
- graphify requires Python 3.10+ → check `python3 --version`
- If Python unavailable → recommend cartographer instead (Node.js based, marketplace install)
- Both serve "large codebase mapping" purpose, different prereqs

For marketplace catalogs (CCPI, superpowers-marketplace, buildwithclaude):
- Only select auth-free plugins from within the catalog
- Tag each sub-plugin with authRequired status
- Install individual plugins, not the entire marketplace

**Output:** `RecommendationPlan`

```typescript
interface RecommendedTool {
  name: string;
  repo: string;
  category: "plugin" | "skill" | "hook" | "agent" | "workflow";
  reason: string;
  relevanceScore: number;
  authRequired: boolean;
  networkRequired: "none" | "partial" | "full";  // graphify: "partial" (code=local, docs=API)
  installMethod: "marketplace" | "npx" | "git-clone" | "pip";
  installCommands: string[];
  prerequisites: PrerequisiteCheck[];
}

interface RecommendationPlan {
  recommended: RecommendedTool[];
  excluded: ExcludedTool[];     // With exclusion reason
  conflicts: ToolRelation[];    // Detected conflicts/overlaps
  maxTools: number;             // Limit based on project scale
  prerequisiteIssues: string[]; // Unmet prerequisites summary
}
```

### Phase 4: Planner

Combines analyzer output + recommendations into a concrete generation plan. Presents to user for approval.

**User approval flow:**
```
slaminar analysis complete for: mdmizer

Project: React SPA (TypeScript + Vite)
Pattern: feature-based SPA
Test: none detected
Docs: Korean

--- Generation Plan ---
  [create] CLAUDE.md
  [create] .claude/plugins/slaminar-generated/plugin.json
  [create] .claude/plugins/slaminar-generated/skills/dev.md
  [create] .claude/plugins/slaminar-generated/skills/architecture.md

--- Recommended Tools ---
  [install] caveman — token 65% savings
  [install] impeccable — React UI design quality
  [install] playwright-skill — browser testing
  [skip] claude-octopus — requires external API keys

Proceed? (Y/n/edit)
```

### Phase 5: Generator

Produces file contents. Two modes:

| | Local Mode | AI Mode |
|--|-----------|---------|
| How | Rule-based + templates | ProjectProfile → Claude API |
| Speed | < 1 second | 5-15 seconds |
| Quality | Structured, consistent | More tailored |
| Cost | Free | API tokens |
| Offline | Yes | No |

**AI mode workflow:**
1. Generate local-mode draft as baseline
2. Send draft + ProjectProfile + key source samples to Claude API
3. AI refines and returns improved version

**CLAUDE.md generation rules (local mode):**
1. Header + project description (from package description / README first paragraph)
2. Build/test/lint commands (from package.json scripts or equivalent)
3. Architecture overview (from structure pattern + entry points)
4. Key dependencies (from notable deps)
5. Conventions (naming, test framework, commit style)
6. Preserved content from existing CLAUDE.md (on merge)

**Plugin generation:**
```
.claude/plugins/slaminar-generated/
├── plugin.json
├── skills/
│   ├── dev.md          # Build, test, lint workflow
│   └── architecture.md # Architecture guide
├── hooks/
│   └── pre-commit.sh   # Lint/typecheck (local only)
└── agents/
    └── reviewer.md     # Code review (local tools only: Read, Grep, Glob, Bash)
```

All generated plugins use **local tools only** (Read, Write, Edit, Grep, Glob, Bash).

### Phase 6: Placer

**Backup:**
```
.slaminar/.bk/{randomHex6}_{unixTimestamp}.dat
.slaminar/.bk/manifest.json  ← maps original ↔ backup
```

- `.dat` extension: IDEs/AI tools don't auto-recognize
- manifest.json: only mapping record
- All inside `.slaminar/.bk/` — no project root pollution

**Merge strategy:**
- No existing file → create new
- Existing file → backup first, then:
  - Structured files (CLAUDE.md): section-level merge
  - Rule files: append new rules
  - Conflict: show diff to user

**Placement paths:**

| Output | Path |
|--------|------|
| CLAUDE.md | `./CLAUDE.md` |
| Claude Code plugin | `.claude/plugins/slaminar-generated/` |
| Recommended tools | Per tool's install method |
| slaminar metadata | `.slaminar/` |

## Runtime Management

Target platforms: **macOS** and **Linux**.

slaminar must detect, and optionally install, Python and Node.js runtimes before installing recommended tools. Two runtime managers are standardized:

| Runtime | Manager | Why |
|---------|---------|-----|
| Python | **uv** (Astral, Rust binary) | No sudo, no brew/apt, installs Python itself, 10-100x faster than pip |
| Node.js | **volta** (Rust binary) | Shim-based (no shell restart), non-interactive, immediate availability |

### Detection Flow

```
slaminar init
  ↓
[1] Runtime Detection
  ├─ Python: python3 -c "..." (5s timeout guard) → uv python find
  ├─ Node: node --version → volta which node
  └─ uv/volta existence check
  ↓
[2] Install Decision (only if a recommended tool needs it)
  ├─ graphify recommended + Python missing?
  │   → "Python 3.12 required. Install via uv? (Y/n)"
  │   → curl uv → uv python install 3.12 → uv tool install graphifyy
  ├─ claude-mem recommended + Node missing?
  │   → "Node 20 required. Install via volta? (Y/n)"
  │   → curl volta → volta install node@20
  └─ Both present → proceed directly
  ↓
[3] Tool Installation
  ├─ Python tools: uv tool install <pkg> (isolated venv per tool)
  ├─ npm tools: npm install -g <pkg> (or volta install)
  ├─ marketplace: claude plugin marketplace add + install
  └─ git-clone: git clone + install script
```

### macOS Python Shim Trap

On macOS 13+, `/usr/bin/python3` exists as a shim that triggers an Xcode CLT install dialog (GUI popup) when executed. This blocks non-interactive scripts indefinitely.

**Solution:** Timeout-guarded detection with actual Python execution:

```typescript
interface RuntimeDetection {
  command: string;          // "python3", "node"
  checkMethod: string;      // Actual execution, not just path check
  timeoutMs: number;        // 5000ms for Python (macOS shim guard)
  minVersion: string;       // ">= 3.11", ">= 18"
  fallbackManager: string;  // "uv" for Python, "volta" for Node
}
```

`command -v python3` returns true even when Python is not really installed on macOS. Always verify by executing with a timeout.

### uv — Python Toolchain Manager

```bash
# Bootstrap uv (no Python needed, single Rust binary)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install Python itself (standalone build, no brew/apt)
uv python install 3.12
# Installs to: ~/.local/share/uv/python/cpython-3.12.*/

# Install a CLI tool in isolated venv (like pipx but faster)
uv tool install graphifyy
# Installs to: ~/.local/share/uv/tools/graphifyy/
# Symlinks to: ~/.local/bin/graphify
```

**Why uv over pip/pipx/venv:**
- `uv python install` — installs Python itself without system package manager
- `uv tool install` — automatic per-tool venv isolation
- No pre-existing Python required to bootstrap
- 10-100x faster than pip

### volta — Node.js Manager

```bash
# Bootstrap volta (no Node needed)
curl https://get.volta.sh | bash -s -- --skip-setup
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

# Install Node (immediately available, no shell restart)
volta install node@20
```

**Why volta over nvm/fnm:**
- Shim-based: no `eval` or shell source needed
- No shell restart after install
- Non-interactive by design

### npx Caveats

Since npm 7+, `npx` prompts "Need to install... Ok to proceed? (y)". For non-interactive use:

```bash
npx --yes <package>   # Always auto-confirm
```

### Runtime Manager Installation Paths

| Manager | Install Location | Managed Runtimes Location |
|---------|-----------------|---------------------------|
| uv | `~/.local/bin/uv` | `~/.local/share/uv/python/` |
| uv tools | `~/.local/bin/<tool>` | `~/.local/share/uv/tools/<tool>/` |
| volta | `~/.volta/bin/volta` | `~/.volta/tools/node/` |

### Directory Structure Addition

```
src/
├── runtime/
│   ├── detector.ts          # Detect Python/Node with timeout guard
│   ├── uv.ts                # uv bootstrap + python install + tool install
│   ├── volta.ts             # volta bootstrap + node install
│   └── prerequisite.ts      # PrerequisiteCheck orchestrator
```

## Phase 7: Verifier

Post-placement verification. Catches issues before the user discovers them in their next Claude Code session.

### Tool Installation Verification

```typescript
interface ToolVerification {
  tool: string;
  command: string;        // "graphify --version", "claude plugin list | grep impeccable"
  expectedPattern: RegExp; // /graphify \d+\.\d+/
  timeoutMs: number;
  status: "pass" | "fail" | "skip";
  error?: string;
}
```

Each installed tool gets a smoke test. Failed tools are reported with clear error messages and remediation hints.

### CLAUDE.md Validation

- Markdown syntax validation (headings, links)
- Command validation: extract all shell commands, verify they exist in package.json scripts or as system commands
- Path validation: referenced file paths actually exist on disk
- Freshness check: compare CLAUDE.md commands against current package.json scripts

### Plugin Validation

- plugin.json schema check (against Claude Code's expected schema)
- Referenced skill/hook/agent files exist at declared paths
- No orphaned files in plugin directory

### Verification Report

```
slaminar verification report:

  Tools:
    ✅ caveman — v2.1.0 installed
    ✅ impeccable — plugin loaded
    ❌ graphify — command not found (pip install failed)
       → Run: uv tool install graphifyy

  Generated Files:
    ✅ CLAUDE.md — valid, 5 commands verified
    ✅ plugin.json — schema valid
    ⚠️  skills/dev.md — references "npm run lint" but no lint script found

  Overall: 2 pass, 1 fail, 1 warning
```

## Reporter — Progress Display & Review Reports

Every pipeline execution provides real-time progress and generates a review report.

### Real-time Terminal Display

Each phase shows a structured table with results as it completes:

```
slaminar init .

━━━ Phase 1/7: Scan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.3s
  Files: 847  |  Extensions: .ts(312) .tsx(89) .css(45)
  Git: 523 commits, 4 contributors, conventional style
  Existing: CLAUDE.md (2,555 lines), .claude/settings.json

━━━ Phase 2/7: Analyze ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.5s
  ┌──────────────┬──────────────────────────────────────┐
  │ Project      │ mdmizer                              │
  │ Language     │ TypeScript (primary), CSS (secondary) │
  │ Framework    │ React 19                             │
  │ Build Tool   │ Vite 7                               │
  │ Pattern      │ SPA, feature-based layout            │
  │ Test         │ none detected                        │
  │ Maturity     │ early (3 commits, 1 contributor)     │
  │ Doc Language │ Korean                               │
  └──────────────┴──────────────────────────────────────┘

━━━ Phase 3/7: Recommend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 1.2s
  ┌───┬──────────────────┬───────┬───────────┬────────────────────────┐
  │ # │ Tool             │ Score │ Method    │ Reason                 │
  ├───┼──────────────────┼───────┼───────────┼────────────────────────┤
  │ 1 │ ✅ caveman        │ 92    │ marketplace│ Token 65% savings     │
  │ 2 │ ✅ impeccable     │ 87    │ marketplace│ React UI design       │
  │ 3 │ ✅ planning-files │ 78    │ npx       │ Feature planning      │
  ├───┼──────────────────┼───────┼───────────┼────────────────────────┤
  │ - │ ⛔ claude-octopus │ 71    │ -         │ Excluded: API keys    │
  │ - │ ⛔ graphify       │ 68    │ -         │ Excluded: No Python   │
  └───┴──────────────────┴───────┴───────────┴────────────────────────┘

━━━ Phase 4/7: Plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔄 awaiting
  ... (user approval)

━━━ Phase 5/7: Generate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 2.1s
━━━ Phase 6/7: Place ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.1s
━━━ Phase 7/7: Verify ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 1.8s

━━━ Complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ Total: 6.0s
  Report: .slaminar/reports/2026-04-14-init.md
```

### Markdown Report (Team-shareable)

Auto-generated at `.slaminar/reports/YYYY-MM-DD-<action>.md`. Committable, reviewable in PRs.

```markdown
# slaminar Setup Report — mdmizer
> Generated: 2026-04-14 15:30 | slaminar v0.1.0 | by: lanco

## Project Profile
| Field | Value |
|-------|-------|
| Language | TypeScript (React 19 + Vite 7) |
| Pattern | SPA, feature-based |
| Maturity | early (3 commits, 1 contributor) |

## Installed Tools
| Tool | Version | Score | Method | Reason |
|------|---------|-------|--------|--------|
| caveman | 2.1.0 | 92 | marketplace | Token savings |
| impeccable | 2.1.1 | 87 | marketplace | React UI design |

## Excluded Tools
| Tool | Score | Reason |
|------|-------|--------|
| claude-octopus | 71 | API keys required |
| graphify | 68 | Python not installed |

## Generated Files
| File | Lines | Action |
|------|-------|--------|
| CLAUDE.md | 87 | created |
| plugin.json | 12 | created |

## Verification
| Check | Result |
|-------|--------|
| All tools | ✅ pass |
| CLAUDE.md | ✅ valid |
| plugin.json | ✅ schema valid |
```

### Status Command (`slaminar status`)

Shows current state with detailed tables:

```
slaminar status

  Profile:
  ┌──────────────┬─────────────────────────────┐
  │ Language     │ TypeScript + React 19       │
  │ Maturity     │ early (3 commits)           │
  │ Last scan    │ 2026-04-14 15:30            │
  └──────────────┴─────────────────────────────┘

  Generated Files:
  ┌──────────────────────────┬───────────┬──────────────────────┐
  │ File                     │ Status    │ Detail               │
  ├──────────────────────────┼───────────┼──────────────────────┤
  │ CLAUDE.md                │ ✅ current │ 2026-04-14           │
  │ skills/dev.md            │ ⚠️ stale   │ package.json changed │
  └──────────────────────────┴───────────┴──────────────────────┘

  Installed Tools:
  ┌──────────────────────┬─────────┬───────────┬──────────┐
  │ Tool                 │ Version │ Status    │ Scope    │
  ├──────────────────────┼─────────┼───────────┼──────────┤
  │ caveman              │ 2.1.0   │ ✅ active  │ team     │
  │ impeccable           │ 2.1.1   │ ✅ active  │ team     │
  │ claude-mem           │ 0.9.2   │ ✅ active  │ personal │
  └──────────────────────┴─────────┴───────────┴──────────┘
```

### Team Status (`slaminar team-status`)

```
slaminar team-status

  Team Tools (config.json):
  ┌──────────────────────┬─────────┬────────────────────┐
  │ Tool                 │ Version │ Approved           │
  ├──────────────────────┼─────────┼────────────────────┤
  │ caveman              │ 2.1.0   │ 2026-04-14 (lanco) │
  │ impeccable           │ 2.1.1   │ 2026-04-14 (lanco) │
  └──────────────────────┴─────────┴────────────────────┘

  Lock Status: ✅ up to date
  To onboard: slaminar setup
```

### Reporter Directory Structure

```
src/
├── reporter/
│   ├── terminal.ts       # Real-time terminal tables (chalk + cli-table3)
│   ├── markdown.ts       # .slaminar/reports/*.md generation
│   └── progress.ts       # Phase progress bar + summary line
```

### Report Storage

```
.slaminar/reports/           # Committable markdown reports
  ├── 2026-04-14-init.md     # Initial setup
  ├── 2026-04-15-update.md   # Incremental update
  └── latest.md              # Symlink to most recent
```

### CLI Commands

```bash
slaminar status              # Current project state tables
slaminar team-status         # Team-wide setup status
slaminar report              # Re-display latest report
slaminar report --history    # List all reports
```

### --json Flag

All display commands support `--json` for machine-readable output:

```bash
slaminar status --json       # JSON output for scripts/CI
slaminar health --json       # JSON health report
```

## Greenfield Project Handling

When the project has no signals (0 commits, no package.json, no README):

### Project Maturity Detection

```typescript
type ProjectMaturity = "greenfield" | "early" | "growing" | "mature";
```

| Maturity | Criteria | Pipeline Behavior |
|----------|----------|-------------------|
| greenfield | No git, no package files, no source | Interactive mode: ask user what they're building |
| early | < 10 commits, basic structure | Minimal recommendations (max 2 tools) |
| growing | 10-200 commits, tests emerging | Standard recommendations |
| mature | 200+ commits, CI, team | Full recommendations with team features |

### Greenfield Flow

1. Detect no signals → ask: "What language/framework will you use?"
2. Offer `git init` if no `.git/`
3. Skip recommender or limit to 1 universal tool (caveman)
4. Generate minimal CLAUDE.md with placeholder sections
5. Store `userDeclared: true` in profile for re-evaluation later

## Team Collaboration

### Config Split

| File | Committed | Contains |
|------|-----------|---------|
| `.slaminar/config.json` | YES | Team settings: excludeAuthTools, fileCountCap, approved tools |
| `.slaminar/config.local.json` | NO | Personal: aiMode, API keys, local overrides |
| `.slaminar/lock.json` | YES | Exact tool versions for reproducibility |
| `.slaminar/state.json` | NO | Local generation state, hashes |
| `.slaminar/.bk/` | NO | Backup files |
| `.slaminar/catalog-pin.json` | YES | Pinned catalog version |

### Auto-generated `.slaminar/.gitignore`

```
config.local.json
state.json
.bk/
```

### Team Commands

```bash
slaminar setup              # Onboard: read team config → install missing tools
slaminar recommend --propose # Create proposal for team review (PR-based)
slaminar add <tool>          # Add tool to team config
slaminar add <tool> --personal  # Install for self only, not in team config
```

### Lock File for Reproducibility

```typescript
interface SlaminarLock {
  lockVersion: 1;
  generatedBy: string;           // slaminar version
  catalogHash: string;
  tools: {
    name: string;
    version: string;
    installMethod: string;
    installCommands: string[];
  }[];
  generatedFiles: {
    path: string;
    contentHash: string;
  }[];
}
```

`slaminar setup` reads lock.json and installs exact versions. `slaminar update` refreshes the lock.

## Incremental Updates

### Ownership Markers

Generated CLAUDE.md sections use markers to track slaminar-owned content:

```markdown
<!-- slaminar:begin:build-commands -->
## Build & Test Commands
npm run build
npm test
<!-- slaminar:end:build-commands -->

## My Custom Section     ← user-written, slaminar never touches this
...
```

On re-run, slaminar only updates content within its own markers. User content outside markers is preserved.

### State Tracking

```typescript
interface SlaminarState {
  version: string;
  generatedAt: string;
  profileHash: string;           // Hash of ProjectProfile at generation time
  generatedFiles: {
    path: string;
    contentHash: string;         // Hash of generated content
    currentHash: string;         // Hash of current file on disk
    userModified: boolean;       // contentHash !== currentHash
  }[];
  installedTools: InstallRecord[];
}

interface InstallRecord {
  tool: string;
  version: string;
  method: string;
  installedPaths: string[];      // All files/dirs created
  uninstallCommands: string[];   // Reverse commands for cleanup
  installedAt: string;
}
```

### Update Flow

`slaminar update`:
1. Re-run scanner
2. Diff new ProjectSnapshot against stored profileHash
3. Identify what changed (new dependency, new test framework)
4. Update only affected sections (within markers)
5. If user edited marked sections → show diff, ask before overwriting
6. Update lock.json

`slaminar update --full` forces complete regeneration.

## Rollback / Cleanup

```bash
slaminar remove <tool>      # Remove specific tool + update config/lock
slaminar uninstall           # Remove everything, restore pre-slaminar state
slaminar retry               # Retry failed installations
```

### Uninstall Flow

1. Read state.json → find all generated files and install records
2. Show what will be removed/restored
3. On confirmation:
   - Restore backed-up files from `.slaminar/.bk/`
   - Delete slaminar-generated files (that had no backup)
   - Uninstall tools (`uv tool uninstall`, `claude plugin remove`, etc.)
   - Remove `.slaminar/` directory
4. Project returns to pre-slaminar state

## CI/CD Integration

### Validation Command

```bash
slaminar check --ci          # Non-interactive, machine-readable output
```

Exit codes:
- 0: everything valid and current
- 1: warnings (CLAUDE.md slightly stale)
- 2: errors (broken references, malformed plugin.json)

### Pre-commit Hook (optional)

```bash
slaminar hook install        # Install git pre-commit hook
```

Detects when dependency files change (package.json, pyproject.toml, Cargo.toml) but CLAUDE.md wasn't updated. Advisory warning, not blocking (unless `--strict`).

### GitHub Actions Template

```bash
slaminar ci-setup            # Generate .github/workflows/slaminar-check.yml
```

## CLI Interface (Complete)

```bash
# Core pipeline
slaminar                       # = slaminar init (current directory)
slaminar init [path]           # Full pipeline: scan → analyze → recommend → plan → generate → place → verify
slaminar setup                 # Onboard from existing team config (skip analyze/recommend)
slaminar update [path]         # Incremental update (changed sections only)

# Individual phases
slaminar scan [path]           # Scan only (ProjectSnapshot JSON)
slaminar analyze [path]        # Scan + analyze (ProjectProfile JSON)
slaminar recommend [path]      # Show recommended tools
slaminar recommend --propose   # Create proposal for team review

# Tool management
slaminar add <tool>            # Add tool to team config + install
slaminar add <tool> --personal # Install for self only
slaminar remove <tool>         # Remove specific tool
slaminar retry                 # Retry failed installations

# Catalog
slaminar catalog update        # Update ecosystem catalog
slaminar catalog list          # List catalog
slaminar catalog search <q>    # Search tools

# Validation & Health
slaminar validate              # Validate generated files
slaminar health                # Full health check
slaminar check --ci            # CI validation (non-interactive, exit codes)

# Rollback
slaminar restore [file]        # Restore specific file from backup
slaminar uninstall             # Remove everything, restore pre-slaminar state

# CI/CD
slaminar hook install          # Install pre-commit hook
slaminar ci-setup              # Generate CI config

# Utilities
slaminar status                # Current project state tables
slaminar team-status           # Team-wide setup status
slaminar report                # Re-display latest report
slaminar report --history      # List all reports
slaminar diff [file]           # Compare current vs generated

# Global flags
--dry-run                      # Preview only, no writes
--verbose                      # Detailed output
--json                         # Machine-readable JSON output
```

## Claude Code Skill

Trigger: `/slaminar` or "set up Claude Code for this project"

Workflow:
1. Detect current project directory
2. Run `slaminar init` via CLI (or `slaminar setup` if team config exists)
3. Display results interactively in conversation
4. User approves → apply
5. Show verification report

## Configuration

### Team Config (`.slaminar/config.json` — committed)

```typescript
interface TeamConfig {
  slaminarVersion: string;           // Minimum compatible version
  excludeAuthTools: boolean;         // default: true
  fileCountCap: number;              // default: 10000
  approvedTools: string[];           // Team-agreed tool list
  catalogVersion: string;            // Pinned catalog hash
}
```

### Local Config (`.slaminar/config.local.json` — gitignored)

```typescript
interface LocalConfig {
  aiMode: "local" | "ai" | "auto";  // default: "auto"
  personalTools: string[];           // Tools installed for self only
  apiKey?: string;                   // For AI mode
}
```

## Expanded Directory Structure

```
src/
├── cli.ts
├── core/
│   ├── pipeline.ts
│   ├── scanner.ts
│   ├── analyzer.ts
│   ├── recommender.ts
│   ├── planner.ts
│   ├── generator.ts
│   ├── placer.ts
│   ├── verifier.ts              # NEW: Phase 7 — post-placement verification
│   └── updater.ts               # NEW: Incremental update logic
├── scanner/
│   ├── file-tree.ts
│   ├── git-info.ts
│   ├── ai-files.ts
│   └── package-info.ts
├── analyzer/
│   ├── language-detector.ts
│   ├── structure-mapper.ts
│   ├── convention-extractor.ts
│   ├── dependency-analyzer.ts
│   └── maturity-detector.ts     # NEW: Greenfield detection
├── recommender/
│   ├── catalog.ts
│   ├── matcher.ts
│   └── installer.ts
├── generator/
│   ├── claude-md.ts
│   ├── claude-plugin.ts
│   └── ai-provider.ts
├── placer/
│   ├── backup.ts
│   ├── merger.ts
│   ├── writer.ts
│   └── markers.ts               # NEW: Ownership marker management
├── runtime/
│   ├── detector.ts
│   ├── uv.ts
│   ├── volta.ts
│   └── prerequisite.ts
├── validator/
│   ├── claude-md.ts             # NEW: CLAUDE.md content validation
│   ├── plugin-schema.ts         # NEW: plugin.json schema validation
│   └── health.ts                # NEW: Health check orchestrator
├── team/
│   ├── config.ts                # NEW: Team/local config management
│   ├── lock.ts                  # NEW: Lock file management
│   ├── setup.ts                 # NEW: Team onboarding
│   └── propose.ts               # NEW: Recommendation proposals
├── ci/
│   ├── check.ts                 # NEW: CI validation mode
│   ├── hook-generator.ts        # NEW: Pre-commit hook generation
│   └── action-template.ts       # NEW: GitHub Actions template
├── reporter/
│   ├── terminal.ts              # NEW: Real-time terminal tables (chalk + cli-table3)
│   ├── markdown.ts              # NEW: .slaminar/reports/*.md generation
│   └── progress.ts              # NEW: Phase progress bar + summary line
├── rollback/
│   ├── uninstaller.ts           # NEW: Full uninstall
│   └── remover.ts               # NEW: Individual tool removal
├── skill/
│   └── SKILL.md
├── types/
│   └── index.ts
└── config/
    └── defaults.ts
```

## Tech Stack

- TypeScript (ESM)
- Node.js >= 18
- commander (CLI framework)
- @anthropic-ai/sdk (AI mode, optional)
- vitest (testing)

## Dependencies on Reference Projects

- **sincenety pattern**: CLI + Skill hybrid, AI provider routing, commander CLI structure
- **mdmizer as test target**: 2,555-line CLAUDE.md, .serena/, React SPA — good test case for analyzer

## Constraints

- No external server authentication required for any generated output
- All generated plugins/skills use local tools only
- Offline-capable in local mode
- Backup before any file modification
- User approval before any file placement
- Partial failure isolation: one tool failing doesn't block others
- All destructive operations support --dry-run
