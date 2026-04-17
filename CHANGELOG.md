# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.3] — 2026-04-17

### Changed — Login Wizard Polish (Wave 1 of UX Reduction)

Quality-of-life fixes for the `slaminar setup` wizard driven by real observations from a head-to-head simulation of the Cloudflare and Anthropic login flows. No behavioral breaking changes — every improvement removes decisions or clarifies copy.

**Cloudflare token instructions expanded (`src/auth/wizard.ts`):**
- The wizard now lists all three permissions the user should grant when creating a Custom Token:
  - `Account → Workers AI → Read` (required)
  - `User → Memberships → Read` (enables auto-detection of the user's account)
  - `User → User Details → Read` (shows the signed-in email)
- Previously only the first permission was mentioned, so most users ended up on the "Could not auto-detect your account" fallback path by default. With the expanded list, auto-detection succeeds on first try for users who follow the instructions verbatim.

**Account ID fallback prompt rewritten:**
- "Account ID is a 32-character hex string" → concrete, location-based guidance that names the Cloudflare dashboard sidebar and shows a sample format
- Validation error message shifted from technical ("32-character hex string") to descriptive ("doesn't look right — 32 hex characters, no spaces/dashes")
- After a successful paste, the wizard prints a short prefix-suffix preview (`a1b2c3d4...7890`) so users can double-check they pasted the right value

**Model selection auto-skips when the choice is clear (`src/auth/wizard.ts:selectModel`):**
- If only one model is registered for the provider (currently true for Anthropic) → skip prompt entirely
- If there is exactly one `recommended: true` model → pick it automatically with a dim confirmation line
- Interactive picker only appears when the user has a real, meaningful choice
- Users can still change the model later with `slaminar setup --reconfigure auth`

**Diagnostics output trimmed (`src/auth/wizard.ts`):**
- Successful connection → single-line `✓ Connection verified` (was three detailed check lines)
- Failed connection → detailed breakdown preserved, so the user still sees which step broke

**Step 5 skill questions merged (`src/setup/wizard.ts:stepSkill`):**
- Previously two sequential prompts: "Auto-install on future npm install?" + "Install now?"
- Now a single prompt: "Keep the /slaminar skill installed and auto-updated?"
- `installSkill()` is already idempotent (SHA-256 content compare), so the combined flow is strictly simpler

**postinstall next-step nudge (`src/skill/post-install.ts`):**
- After `npm install -g slaminar` the postinstall hook now suggests `slaminar init <path>` directly as the next step, rather than implying `slaminar setup` must come first
- This prepares the ground for the v0.8.4 "init-first" release where `slaminar init` handles first-run inline

### Design context

- Simulation spec: see the two walkthrough sessions documented in `docs/getting-started-walkthrough.md`
- Full UX reduction roadmap (Wave 1–3): v0.8.3 polish → v0.8.4 init-first → v0.9.0 `claude` CLI passthrough

### Not changed (deliberate)

- No TypeScript source under `src/recommender/`, `src/placer/`, `src/scanner/`, `src/core/`, or tests
- 338 tests still pass; no new tests since the changes are in interactive paths not covered by the current suite

### Stats

- 61 source modules, 55 test files, **338 tests passing** (no change from v0.8.2)
- Package size unchanged (string / flow changes only)

[0.8.3]: https://github.com/pathcosmos/slaminar/compare/v0.8.2...v0.8.3

## [0.8.2] — 2026-04-17

### Added — Claude Code Passthrough via SKILL.md

When invoked through Claude Code's `/slaminar` skill, slaminar now produces a local-rules CLAUDE.md and the calling Claude agent enhances it in place. No external AI provider is called from the skill path; users with a Max/Pro Claude subscription can use slaminar without configuring any API key.

**SKILL.md Workflow rewrite (`src/skill/SKILL.md`):**
- Step 2 (dry-run) now passes `--no-ai`
- Step 4 (execute) now passes `--no-ai`
- Step 5 is new: outer Claude uses `Read` to load the generated CLAUDE.md and relevant project files, then uses `Edit` to improve content inside `<!-- slaminar:begin:SECTION -->` ... `<!-- slaminar:end:SECTION -->` blocks
- Step 6 is new: `slaminar check <path>` verifies marker integrity + CLAUDE.md well-formedness
- Step 7 (install recommended tools) is the renumbered original Step 5

**Documentation (`docs/getting-started-walkthrough.md`):**
- New §1.5 "실행 맥락 두 가지 — Claude Code 내부 vs 외부 CLI" explaining the two routing paths and when an API key is (or isn't) required

**Enhancement invariants:**
- Ownership markers are load-bearing for `slaminar update` incremental merges — the outer Claude never modifies the marker lines themselves
- Content outside markers is user-owned — the outer Claude never edits it
- Direct CLI use (`slaminar init` from terminal) is unchanged: provider flow (Cloudflare/Anthropic) or local fallback per the `~/.config/slaminar/auth.json` state produced by `slaminar setup`

### Changed

- `package.json`, `src/version.ts` bumped 0.8.1 → 0.8.2 (patch only per project release policy recorded 2026-04-17)
- `CLAUDE.md` — added "Release Policy" section documenting the patch-only versioning rule

### Not Changed (deliberate)

- No TypeScript source files modified (0 lines of runtime code changed)
- No new tests added (existing 338 tests continue to pass unchanged — this release is content/doc only)
- No breaking changes

### Stats

- 61 source modules, 55 test files, **338 tests passing** (unchanged from v0.8.1)
- Package size unchanged (SKILL.md content change only)
- Design spec: [`docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md`](./docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md)

[0.8.2]: https://github.com/pathcosmos/slaminar/compare/v0.8.1...v0.8.2

## [0.8.1] — 2026-04-17

### Changed — User-Facing Prompt i18n (all prompts now English)

Every user-facing CLI prompt, validation message, and status line that previously mixed Korean with English is now consistently in English. This fixes a v0.7.0 → v0.8.0 gap where the Cloudflare/Anthropic login wizard (`src/auth/wizard.ts`) and model catalog (`src/auth/models.ts`) were originally authored in Korean while the rest of the CLI shipped in English.

**Files updated:**
- `src/auth/wizard.ts` — ~20 strings: provider/browser/token/account/model prompts, validation messages, success banners
- `src/auth/models.ts` — 6 model descriptions (5 Cloudflare + 1 Anthropic)
- `src/cli.ts` — top-level `--help` description and the `init` command's AI-not-configured nudge
- `src/skill/SKILL.md` — Step 3 proceed-confirmation prompt template plus routing phrasing examples
- `docs/getting-started-walkthrough.md` — quoted CLI prompt examples synchronised to the new English strings (narrative prose still Korean for Korean readers)

**Routing impact:** none. Korean-speaking users invoking `/slaminar` in Claude Code continue to route correctly — the skill's English description plus the current-generation LLMs' multilingual matching cover the previous Korean example phrasings.

**Verification:**
- `dist/` has zero Korean characters after rebuild (full i18n coverage at the shipped artifact, not just source)
- 338 tests still pass (i18n changes do not touch test fixtures)

### Stats

- 61 source modules, 55 test files, **338 tests passing** (no change from v0.8.0)
- Package size unchanged (same shape, only string content)

[0.8.1]: https://github.com/pathcosmos/slaminar/compare/v0.8.0...v0.8.1

## [0.8.0] — 2026-04-17

### Added — Catalog Federation (Multi-Source) Phase 1–3

Single `catalogUrl` + `catalogMode` (v0.3+) is now a thin compatibility layer on top of a full multi-source federation model. Up to six layers compose into one resolved catalog with priority-based merging and per-source caches.

**Priority layers (ascending — higher wins collisions):**

```
-1   bundled       always present, ultimate fallback
 0   official      catalog.json on GitHub (implicit unless a replace-mode source shadows it)
100  user          ~/.config/slaminar/defaults.json → catalog.sources[]
200  project       .slaminar/config.json → catalogSources[]
500  env           SLAMINAR_CATALOG_SOURCES (format: mode:uri[,mode:uri])
999  CLI adhoc    `--catalog <url> [--catalog-mode <mode>]`
```

- `extend` layers stack additively on top of lower layers; tool name collisions award the higher layer.
- A single `replace`-mode layer drops every lower-priority layer entirely (security-team whitelist pattern).
- `relations` are collected from every layer and deduplicated; `suggestions` come from the official source only.

**New types (`src/types/index.ts`):**

- `CatalogSourceType = 'official' | 'url' | 'file' | 'github'`
- `CatalogSourceScope = 'bundled' | 'official' | 'user' | 'project' | 'env' | 'cli'`
- `CatalogSourceTrust = 'trusted' | 'untrusted' | 'verified'` (persisted but **not enforced** in v0.8 — hook is ready for v0.9 install-gating)
- `CatalogSource { id, type, uri, priority, mode, enabled, trust, addedAt, scope }`
- `CatalogSourceTrace { id, priority, scope, mode, state, uri }`
- `ResolvedCatalog.source` now includes `'multi'`
- `ResolvedCatalog.sourceTrace?` — which layers contributed and at what state
- `TeamConfig.catalogSources?: CatalogSource[]` (optional — legacy `catalogUrl`/`catalogMode` still honored)
- `UserDefaults.catalog.sources?: CatalogSource[]` (same)

**New CLI subcommand group `slaminar catalog source`:**

```bash
slaminar catalog source add <uri> [--mode extend|replace] [--priority <n>] \
                                  [--scope user|project] [--name <id>] [--trust <level>]
slaminar catalog source list                                    # Every layer in priority order
slaminar catalog source remove <id-or-uri> [--scope user|project]
slaminar catalog source enable <id-or-uri> [--scope user|project]
slaminar catalog source disable <id-or-uri> [--scope user|project]
slaminar catalog source test <uri>                              # One-shot fetch + schema validation (not persisted)
```

- `--scope user` (default) writes to `~/.config/slaminar/defaults.json`
- `--scope project` writes to `.slaminar/config.json` (requires `slaminar init` has already run)
- Priority defaults to `100` (user) / `200` (project); customisable via `--priority`
- Re-adding a source with the same id **or** same uri replaces the earlier entry (idempotent)
- `slaminar catalog config` is kept but now prints a deprecation notice

**New module `src/recommender/catalog-sources.ts`:**

- `loadEffectiveSources({ projectRoot, cliSource, envVar })` composes every active layer
- `migrateSingleUrlToSource({ url, mode, scope })` synthesizes a `CatalogSource` from legacy fields (read-path only — files aren't rewritten until the next explicit save)
- `parseEnvSources(envVar)` parses `SLAMINAR_CATALOG_SOURCES="extend:https://a.json,replace:/b.json"`
- `makeCliAdhocSource(url, mode)` lifts the `--catalog` flag into a layer
- `addSource / removeSource / setSourceEnabled / listAllSources / readTeamSources / writeTeamSources / readUserSources / writeUserSources` — persistence helpers used by CLI and tests

**Per-source catalog cache:**

- `~/.config/slaminar/cache/<source-id>.json` — each layer gets its own TTL-controlled cache file
- `backupSourceCache / rollbackSourceCache` per id; `saveSourceCache('official', ...)` writes to the legacy `catalog-cache.json` path for backward compatibility
- Cache hit / stale / failed states surface in `ResolvedCatalog.sourceTrace`

**Resolver rewrite (`src/recommender/catalog-resolver.ts`):**

- New pipeline: `loadEffectiveSources` → per-source fetch (cache → remote → stale → failed) → `mergeCatalogStack`
- `ResolveCatalogOptions.catalogUrl` / `catalogMode` still accepted — synthesized into a `cli-adhoc` layer at priority 999 (full backward compat for CLI and programmatic callers)
- New `ResolveCatalogOptions.sources?: CatalogSource[]` lets tests and internal helpers bypass discovery

**Wizard (`setup` Step 3):**

- Keeps single-URL prompt for the common case; after save, prints: `Tip: layer additional sources via \`slaminar catalog source add <uri>\``
- Non-interactive `--yes` mode honors `SLAMINAR_CATALOG_SOURCES` (overrides single `SLAMINAR_CATALOG_URL` when present); entries are persisted as user-scope sources

### Changed

- `mergeCatalogs` generalized to N-way via `mergeCatalogStack` — the existing binary helper is still exported and used by the new stack fold
- `catalog-cache.ts` now exposes `getSourceCachePath / loadSourceCache / saveSourceCache / backupSourceCache / rollbackSourceCache`; the legacy `loadCache`/`saveCache` are preserved and delegate to `id='official'`
- Config precedence: CLI flag (999) > env var (500) > project (200+) > user (100+) > official (0) > bundled (-1)

### Migration

- **Zero-action upgrade** from v0.7 — existing `catalogUrl`/`catalogMode` in `.slaminar/config.json` or `~/.config/slaminar/defaults.json` are synthesized into a `*-legacy` source at the appropriate scope on every resolve
- No file is auto-rewritten. The next explicit `catalog source add` or `setup --reconfigure catalog` replaces the legacy fields naturally
- Legacy single fields remain readable and writable until v0.9 (schema cleanup)

### Deferred to v0.9

- `trust` enforcement (untrusted source install-gating prompts)
- Dangerous command detection (`rm`, `sudo`, `curl | bash` warnings)
- HTTPS-required policy for `url` sources
- Signed-catalog `verified` trust state
- `npm:@scope/name` source type
- Schema cleanup that drops legacy `catalogUrl`/`catalogMode` fields

### Stats

- 61 source modules, 55 test files, **338 tests passing** (+46 for sources / persistence / merger stack / resolver multi-source / cache per-source / team config round-trip)
- 28 CLI commands (`catalog source {add,list,remove,enable,disable,test}` added)
- Design spec: `docs/superpowers/specs/2026-04-16-custom-catalog-plan.md` + `docs/superpowers/specs/2026-04-17-global-setup-plan.md` §v0.8

[0.8.0]: https://github.com/pathcosmos/slaminar/compare/v0.7.0...v0.8.0

## [0.7.0] — 2026-04-17

### Added — Project Discovery & Batch Apply

**`slaminar discover [roots...]` — new command:**
- Walks user-specified roots (e.g. `~/work`, `~/projects`) looking for Claude Code projects
- Classifies each hit as `new` / `configured` / `existing` / `unsupported` with a suggested action (`init` / `update` / `init-merge` / `skip`)
- Stops descending as soon as a project signature (`CLAUDE.md`, `.claude/`, `.slaminar/`) is found — `$HOME`-wide scans stay fast even across many nested repos
- Skips `node_modules`, `.git`, `.venv`, `.cache`, `.turbo`, macOS `Library/` / `Applications/`, and other noisy directories by default
- Symlinks are not followed; visited inodes are tracked via `realpath` as a secondary cycle guard
- `--json` for machine-readable output; human output uses the same chalk + `cli-table3` style as the existing init reporter
- `--no-cache` forces a fresh scan; otherwise results are cached at `~/.config/slaminar/discovery-cache.json` (24 h TTL)
- Remembers the last roots in `defaults.json.discovery.lastRoots` — re-running `slaminar discover` with no arguments reuses them

**`slaminar discover --apply` — batch-apply pipeline:**
- Sequentially runs `init()` (for `new` / `existing` projects) or `update()` (for `configured` projects) across every approved project
- `--dry-run` previews without writing files; default is dry-run-off when `--apply` is explicit
- `--only-new` limits the run to `status === 'new'` projects
- `--catalog` / `--catalog-mode` forwarded to each per-project `init`
- Failure-tolerant: per-project errors are captured in `result.failed` but never stop the batch
- Writes a markdown audit trail to `~/.config/slaminar/setup-logs/batch-<timestamp>.md`

**`slaminar setup` integration:**
- New Step 6 — "Project discovery (optional)" — prompts interactively or reads `SLAMINAR_DISCOVER_ROOTS` in `--yes` mode
- After the scan, offers four batch actions: dry-run all / select specific projects (via checkbox) / apply immediately / skip
- `--apply-to-discovered` flag drives the apply path in `--yes` mode (same effect as `SLAMINAR_BATCH_APPROVED` env in CI)
- `--no-discovery` flag cleanly opts out — useful when running `setup --yes` on CI where you only want preferences saved
- Team config auto-import (F6): when the cwd has a committed `.slaminar/config.json` with a different `catalogUrl`, Step 3 offers to copy it into `defaults.json` (`SLAMINAR_IMPORT_TEAM_CATALOG=true` in `--yes` mode)

**New modules:**
- `src/discover/scanner.ts` — filesystem walker (symlink-safe, depth-capped)
- `src/discover/detector.ts` — cheap per-project classifier (reads at most a handful of files per candidate)
- `src/discover/cache.ts` — discovery cache I/O with TTL
- `src/discover/batch.ts` — sequential batch apply with markdown audit log
- `src/discover/team-import.ts` — detect / import team-committed catalog settings into user defaults
- `src/reporter/discovery-table.ts` — chalk + cli-table3 rendering mirroring the init reporter
- Types: `DiscoveredProject`, `DiscoveryResult`, `DiscoveryCacheEntry`, `DiscoverOptions`, `BatchApplyOptions`, `BatchApplyResult`

**New env vars (for `setup --yes` / CI):**
- `SLAMINAR_DISCOVER_ROOTS` — comma/space-separated roots for Step 6
- `SLAMINAR_BATCH_APPROVED` — explicit list of project roots to apply (subset of discovered)
- `SLAMINAR_BATCH_DRY_RUN` — set to `true` to force dry-run in `--yes` mode
- `SLAMINAR_ONLY_NEW` — set to `true` to restrict to `status === 'new'` projects
- `SLAMINAR_IMPORT_TEAM_CATALOG` — set to `true` to auto-import the project's team catalog into user defaults

### Changed

- `runSetupWizard` now runs 6 steps (environment → auth → catalog → defaults → skill → discovery) and can skip the last one via `--no-discovery` or `SetupOptions.noDiscovery`
- Wizard's internal `selectedAction` discriminant narrowed to a named `BatchAction` type to satisfy stricter TS narrowing rules
- `src/version.ts` bumped to `0.7.0`
- `package.json` version jumped from `0.4.0` → `0.7.0`; v0.5 (skill auto-deploy) and v0.6 (setup/doctor) entries already documented below and are shipped in this release

### Stats

- 60 source modules, 53 test files, **292 tests passing** (+42 for discover / batch / discovery-table / team-import)
- 23 CLI commands (`discover` added)
- 46 tools in online catalog, 14 in bundled fallback
- Design spec: `docs/superpowers/specs/2026-04-17-global-setup-plan.md` (v0.7 = "Discovery & Batch" milestone)

[0.7.0]: https://github.com/pathcosmos/slaminar/compare/v0.6.0...v0.7.0

## [0.6.0] — 2026-04-17

### Added — Global Setup Wizard, Doctor Diagnostic, Weekly Version Check

**`slaminar setup` — unified first-run wizard:**
- Single entry point for every global preference: AI provider, catalog URL/mode, project defaults, skill auto-install
- 5-step progressive flow with environment summary up front
- `--reconfigure <auth | catalog | defaults | skill>` revisits one step without touching the others
- `--yes` mode reads `SLAMINAR_*` env vars for non-interactive CI installs
- Writes a dated setup log to `~/.config/slaminar/setup-logs/`

**`slaminar doctor` — read-only diagnostic:**
- Categorized checks: Environment, Installation, Authentication, Catalog, Permissions, Configuration
- Exit codes mirror `slaminar check`: `0` / `1` / `2` for all-pass / warns / fails
- `--json` output for CI pipelines

**`~/.config/slaminar/defaults.json` — user-global preferences (new):**
- `defaults.aiMode` / `excludeAuthTools` / `fileCountCap` / `verbose`
- `catalog.autoRefreshHours` / `url` / `mode`
- `discovery.lastRoots` / `excludePatterns` / `maxDepth` (wired in v0.7)
- `skill.autoInstall` / `scope`
- `telemetry.optedIn` (schema only — no transmission) / `versionCheck`
- `updateCheck.lastCheckedAt` / `latestKnownVersion` / `skipVersions`
- Partial files tolerated — missing sections merged with built-in defaults
- Malformed JSON falls back to defaults instead of crashing

**Weekly npm registry version check (privacy-safe):**
- Queries `registry.npmjs.org/slaminar/latest` once per 7 days (no payload, no user identifier)
- Cached result reused between checks; semver-compared against running version
- Opt-out: `--no-update-check` flag or `telemetry.versionCheck = false` in `defaults.json`
- Runs on every command via Commander `preAction` hook; fail-soft on network errors
- Skipped versions supported (future — user can snooze a version)

**Other:**
- `src/version.ts` — single source of truth for runtime version string
- Catalog TTL now honors `defaults.catalog.autoRefreshHours` (was hardcoded 24h); `0` disables auto-refresh
- 4 new test files, 27 new tests (223 → 250 total)
- Design spec: `docs/superpowers/specs/2026-04-17-global-setup-plan.md` covering the v0.6 → v0.7 → v0.8 roadmap

### Removed — Breaking

The `auth` command group and its members are gone. Their capabilities moved into `setup` and `doctor`:

| Old command | New equivalent |
|---|---|
| `slaminar login` | `slaminar setup --reconfigure auth` |
| `slaminar whoami` | `slaminar doctor` (Authentication section) |
| `slaminar logout` | `rm ~/.config/slaminar/auth.json` (rarely needed) |
| `slaminar auth status` | `slaminar doctor` |
| `slaminar auth test` | `slaminar doctor` (invokes live diagnostics) |
| `slaminar auth switch <p>` | `slaminar setup --reconfigure auth` |

`~/.config/slaminar/auth.json` from v0.5 is **fully compatible** — v0.6 reads it as-is. Existing users can run `slaminar setup` to populate `defaults.json`; the auth step offers to keep the existing credentials.

### Changed

- `src/cli.ts` version now read from `src/version.ts` (no more duplicated literal)
- `init` no longer launches the login wizard inline — it prints a one-line hint directing users to `slaminar setup`
- `catalog-resolver.ts` respects `defaults.catalog.autoRefreshHours`

### Stats

- 54 source modules, 47 test files, 250 tests passing
- 22 CLI commands (3 `setup`/`doctor` replacing 6 `auth` commands)
- 46 tools in online catalog, 14 in bundled fallback

[0.6.0]: https://github.com/pathcosmos/slaminar/compare/v0.5.0...v0.6.0

## [0.5.0] — 2026-04-17

### Added — Claude Code Skill Auto-Deployment + Path Parameterization

**Auto-deployed `/slaminar` skill:**
- `npm install -g slaminar` now writes SKILL.md to `~/.claude/skills/slaminar/` via an npm postinstall hook, so Claude Code discovers the skill without any manual setup
- `scripts/copy-assets.mjs` — copies `src/skill/SKILL.md` into `dist/skill/` at build time so the compiled `installer.js` can resolve it as a sibling via `import.meta.url`
- postinstall hook is **defensively safe**: catches every error, always exits 0, and skips itself when `SLAMINAR_SKIP_POSTINSTALL=1`, `CI=true`, or the install is non-global/transitive

**New CLI command group — `slaminar skill`:**
- `slaminar skill install [--force]` — (re)install the skill, backing up any existing SKILL.md with different content
- `slaminar skill uninstall` — remove the skill and restore the most recent backup if one exists
- `slaminar skill status` — report installed / content-matches / bundled-available

**SKILL.md path parameterization:**
- `src/skill/SKILL.md` now instructs Claude to extract an optional `<path>` from the user's request (falling back to `.`), so phrasings like "slaminar `../other-repo` 에 돌려줘" route correctly to `slaminar init <path>`
- Every workflow step and "Other Commands" entry uses `<path>` consistently
- Frontmatter `description` updated so the skill router recognizes path-bearing phrasings

**New module:** `src/skill/installer.ts`
- `getUserSkillDir()`, `getUserSkillPath()`, `getBundledSkillPath()` — path resolvers
- `installSkill({ force? })` — idempotent install with SHA-256 content comparison; automatic backup of pre-existing SKILL.md to `~/.config/slaminar/skill-backups/`
- `uninstallSkill()` — removes the skill and restores the latest backup if present
- `getSkillStatus()` — read-only probe

### Changed

- `build` script: `tsc` → `tsc && node scripts/copy-assets.mjs`
- `package.json` gains a `postinstall` entry (`node dist/skill/post-install.js 2>/dev/null || true`) and ships `scripts/copy-assets.mjs` so `prepare` works for Git installs
- `files`: added `scripts/copy-assets.mjs`
- `src/cli.ts` registers a new `skill` subcommand group (mirrors the `auth` / `catalog` group pattern)

### Stats

- 48 source modules, 43 test files, 223 tests passing
- 24 CLI commands (3 `skill` commands added)
- 46 tools in online catalog, 14 in bundled fallback

[0.5.0]: https://github.com/pathcosmos/slaminar/compare/v0.4.0...v0.5.0

## [0.4.0] — 2026-04-16

### Added — Persistent Catalog Config + Catalog Expansion (24 → 46 tools)

**Persistent Catalog Configuration (extend/replace modes):**
- `CatalogMode` type (`'extend' | 'replace'`) and `catalogUrl`, `catalogMode` fields in `TeamConfig`
- `slaminar catalog config` CLI subcommand — view/set/clear persistent catalog URL and mode
- `--catalog-mode <extend|replace>` flag on `init`, `recommend`, `catalog update`
- **Extend mode**: merges custom catalog tools with official catalog (custom wins on name collision)
- **Replace mode**: uses only custom catalog (backward-compatible with existing `--catalog` flag)
- `mergeCatalogs()` function (`catalog-merger.ts`) — tool dedup by name, relation dedup by sorted pair
- Config precedence: CLI flag > `.slaminar/config.json` > default
- Graceful degradation: custom fetch failure in extend mode falls back to official-only

**Catalog Expansion (24 → 46 tools, catalog v2.0.0):**
- DevOps/IaC (+3): hashicorp/agent-skills, devops-claude-skills, container-use
- Team/Workflow (+3): oh-my-claudecode, vibe-kanban, ccpm
- Quality/Code Review (+3): vibeguard, review-squad, obey
- Database (+2): supabase/agent-skills, pg-aiguide
- Memory/Codebase (+2): reporecall, knowledge-graph
- Testing/TDD (+2): tdd-guard, test-kitchen
- Frontend (+1): senior-frontend
- Framework-specific (+3): developer-kit (Java/Spring), rafaelkamimura/claude-tools (Python/FastAPI), claude-elixir-phoenix
- Onboarding/Utility (+3): cc-safe-setup, preflight, moyu
- 3 evaluating suggestions promoted to full tools (supabase, rafaelkamimura, bmad-plugin → replaced by oh-my-claudecode)
- Relations expanded: 6 → 20 (14 new synergy/overlap rules for new tools)

**Documentation:**
- README.md/README.ko.md: Persistent Catalog Configuration section with extend/replace explanation, diagrams, team scenarios
- Both READMEs: catalog config command in catalog management section, --catalog-mode in flags table
- Config schema documentation updated with `catalogUrl`, `catalogMode` fields
- FAQ updated for persistent catalog configuration
- Roadmap: multi-source catalogs marked as "MVP shipped"
- Architecture: `catalog-merger.ts` added to module listings
- CLAUDE.md: recommender module count 5 → 10
- Design spec status updated to reflect v0.3.0 MVP delivery

### Changed

- `ResolvedCatalog.source` union now includes `'merged'` for extend-mode results
- `resolveCatalog()` accepts `catalogMode` and `projectRoot` options
- `recommend()` accepts `catalogMode` and `projectRoot` options
- `InitOptions` includes `catalogMode` field
- Online catalog version bumped to 2.0.0 (46 tools)

### Stats

- 47 source modules, 42 test files, 213 tests passing
- 21 CLI commands (catalog config added)
- 46 tools in online catalog, 14 in bundled fallback
- 20 relation rules (synergy/overlap/conflict)

[0.4.0]: https://github.com/pathcosmos/slaminar/compare/v0.3.0...v0.4.0

## [0.1.0] — 2026-04-16

### Added — Initial Release

**Core Pipeline (7-phase):**
- `slaminar init` — scan → analyze → recommend → plan → generate → place → verify
- `slaminar scan` / `slaminar analyze` / `slaminar recommend` — 개별 단계 실행
- `slaminar update` — 증분 업데이트 (변경 섹션만)
- `slaminar status` / `slaminar check` — 헬스 체크 및 CI 검증
- `slaminar uninstall` / `slaminar remove` — 롤백 및 개별 도구 제거
- `--dry-run` / `--verbose` / `--no-ai` 플래그

**Project Analysis:**
- 다국어 지원 (TypeScript/JS, Python, Rust, Go, Java/Kotlin/Scala, Elixir)
- 패턴 감지 (CLI, SPA, API, fullstack, library, monorepo)
- 성숙도 판정 (greenfield / early / growing / mature)
- 컨벤션 감지 (naming, test framework, linter, commit style, doc language)

**Tool Recommendation:**
- 14개 Claude Code 생태계 도구 카탈로그
- 다차원 스코어링 (태그, 성숙도, 범용성)
- 충돌/시너지/중복 감지 (4개 규칙)
- 성숙도별 도구 수 제한 (2~7개)
- 인증 필요 도구 자동 제외

**File Generation & Placement:**
- CLAUDE.md 생성 (소유권 마커로 사용자 콘텐츠 보존)
- Claude Code 플러그인 생성 (plugin.json + skills/dev.md)
- 난독 파일명 백업 (`.slaminar/.bk/{hex6}_{timestamp}.dat`)
- 마커 기반 섹션 머지 (기존 CLAUDE.md 안전 업데이트)

**AI Enhancement (optional):**
- Cloudflare Workers AI provider (native fetch, 무료 10K Neurons/day)
  - Llama 3.3 70B, Mistral Small 3.1, Gemma 3, Qwen 2.5 Coder 지원
- Anthropic Claude API provider (`@anthropic-ai/sdk` 선택적 peer dep)
- 자동 폴백 — AI 실패 시 로컬 규칙 기반

**Unified Auth UX:**
- `slaminar login` — 인터랙티브 위자드 (프로바이더 → 토큰 → 모델 → 검증)
- `slaminar whoami` / `slaminar logout` — 상태 확인 및 자격 증명 제거
- `slaminar auth status` / `auth test` / `auth switch` — 상세 관리
- `/user` + `/memberships` 자동 감지 — 최소 입력
- `~/.config/slaminar/auth.json` (0600 권한, XDG 표준)

**Team Play:**
- 팀 config (`.slaminar/config.json`, 커밋) + 개인 config (`config.local.json`, gitignore) 분리
- 마크다운 보고서 (`.slaminar/reports/*.md`) — PR 리뷰 근거
- 환경변수 우선순위 지원 (CI 호환)

**Verification:**
- CLAUDE.md 유효성 검증 (명령어 존재, 마커 매칭, 구조)
- plugin.json 스키마 검증
- 9개 체크 항목, 종료 코드 0/1/2 (CI용)

**Safety & Error Handling:**
- 모든 CLI 명령어에 try/catch — 스택 트레이스 대신 친화 메시지
- init 실패 시 세션 백업 자동 롤백
- manifest finally 블록 — 부분 실패에도 백업 추적
- JSON 파싱 방어 (손상된 config 파일 graceful 처리)
- 모든 쉘 실행에 `execFileSync` — command injection 방지
- Git 명령어 10초 타임아웃

**Stats:**
- 42 source modules, 37 test files, 179 tests passing
- 13 CLI commands
- TypeScript ESM, Node.js ≥ 18

[0.1.0]: https://github.com/pathcosmos/slaminar/releases/tag/v0.1.0

## [0.2.0] — 2026-04-16

### Added — Dynamic Catalog System

**Dynamic Catalog:**
- Online catalog source (`catalog/catalog.json`, 24 tools) fetched from GitHub raw
- Local cache (`~/.config/slaminar/catalog-cache.json`, 24h TTL)
- Fallback chain: cache → remote → stale cache → bundled
- ETag-based conditional requests (bandwidth savings)
- Catalog diff on update (added/removed/deprecated/updated)
- Catalog rollback support

**New CLI Commands:**
- `slaminar catalog update` — fetch latest catalog + show diff
- `slaminar catalog list` — table view of all tools
- `slaminar catalog search <q>` — search by name/tags/description
- `slaminar catalog check` — detect deprecated tools
- `slaminar catalog info <name>` — tool details
- `slaminar catalog status` — cache status
- `slaminar catalog rollback` — restore previous version

**Catalog Expansion (14 → 24 tools):**
- wshobson/agents (multi-agent orchestration)
- claude-code-lsps (20+ language LSPs)
- terraform-skill (IaC/DevOps)
- claude-code-templates (project bootstrap)
- laravel/agent-skills (PHP/Laravel)
- claude-on-rails (Ruby/Rails)
- apollographql/skills (GraphQL)
- spec-kit (GitHub official, spec-driven)
- claude-code-subagents (100+ subagents)
- awesome-claude-skills-security (pentest)

**CatalogTool Extensions:**
- `deprecated`, `deprecatedReason`, `lastVerified`, `replacedBy` optional fields
- `RemoteCatalog`, `CatalogSuggestion`, `CatalogCacheEntry`, `ResolvedCatalog` types
- Catalog suggestions section (evaluating tools)
- Catalog relations section (conflict/synergy rules moved from hardcode)

### Changed

- `recommend()` is now async (breaking for programmatic users)
- `update()` is now async
- `conflict-detector` accepts external relations parameter
- Bundled catalog serves as ultimate offline fallback only

### Stats

- 47 source modules, 41 test files, 203 tests passing
- 20 CLI commands (7 catalog commands added)
- 24 tools in online catalog, 14 in bundled fallback

[0.2.0]: https://github.com/pathcosmos/slaminar/compare/v0.1.0...v0.2.0

## [0.3.0] — 2026-04-16

### Added — Custom Catalog URL + English Docs

**Custom Catalog URL (`--catalog <url>`):**
- `resolveCatalog()` now accepts a `catalogUrl` option for custom/private catalog sources
- `--catalog <url>` flag added to `init`, `recommend`, and `catalog update` CLI commands
- `recommend()` and `init()` pipeline functions thread `catalogUrl` through the full chain
- Enables enterprise and private catalog hosting without forking the project

**English README:**
- `README.md` is now the primary English documentation
- Korean documentation moved to `README.ko.md`
- Cross-references between both language versions

### Fixed

- CLI version string corrected from `0.1.0` to match `package.json` (`0.2.0` → now `0.3.0`)
- Catalog resolver tests stabilized with `.invalid` TLD URLs for deterministic remote-failure scenarios (previously flaky when network was available)

### Stats

- 47 source modules, 41 test files, 204 tests passing
- 20 CLI commands
- 24 tools in online catalog, 14 in bundled fallback

[0.3.0]: https://github.com/pathcosmos/slaminar/compare/v0.2.0...v0.3.0
