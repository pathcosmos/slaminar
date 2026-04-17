# Global Setup — Design Spec (v0.6 → v0.8)

- **Status**: Approved for implementation (v0.6 in progress)
- **Date**: 2026-04-17
- **Authors**: pathcosmos · Claude (collaborative design)
- **Supersedes**: Scattered setup surface across `login`, `catalog config`, manual file edits
- **Relates to**: [`2026-04-16-custom-catalog-plan.md`](./2026-04-16-custom-catalog-plan.md) (multi-source catalog foundation)

---

## Context

By the end of v0.5, slaminar could:

- Auto-deploy its Claude Code skill on `npm install -g`
- Run `slaminar login` to configure a Cloudflare / Anthropic AI provider
- Set per-project catalog URL/mode via `slaminar catalog config`

However, the first-run experience was still **fragmented**:

| Pain point | v0.5 state |
|---|---|
| There's no single entry point for "just set slaminar up once" | scattered across `login`, `init --dry-run`, manual editing |
| Many fields in `TeamConfig` / `LocalConfig` have no CLI setter | `excludeAuthTools`, `fileCountCap`, `aiMode`, `personalTools` require hand-editing JSON |
| No way to verify "is my install healthy?" after the fact | only `slaminar init` does any checks, and only for a single project |
| `login` / `whoami` / `logout` / `auth` are four separate commands for one concern | UX friction, discoverability drops |
| No user-global defaults — all prefs live in each project's `.slaminar/config.json` | team-work-friendly but poor for solo users maintaining many repos |
| No mechanism to tell users "there's a new version" | users miss catalog updates, bug fixes, new tools |

This spec defines a **three-step plan** (v0.6 → v0.7 → v0.8) to replace the fragmented surface with a single progressive wizard, add a read-only diagnostic, introduce user-level defaults, and lay groundwork for batch multi-project configuration and multi-source catalog federation.

---

## Design Principles

| # | Principle | Rationale |
|---|---|---|
| 1 | **Progressive disclosure** | First-run must finish in ≤ 3 min. Advanced knobs are reachable later (`setup --reconfigure`, `defaults.json` edit). |
| 2 | **Discovery is opt-in** | Scanning `$HOME` for projects only happens after explicit approval — privacy and performance both. |
| 3 | **Batch dry-run default** | Any multi-project action previews first; user approves before writes. |
| 4 | **Local-first, server-free** | All state in `~/.config/slaminar/` or project `.slaminar/`. No telemetry server. No required account. |
| 5 | **Reversible** | Every modification goes through `.slaminar/.bk/` backup or `~/.config/slaminar/skill-backups/`. |
| 6 | **CI-friendly** | Every interactive step has an env / flag override. `--yes` + env vars = non-interactive. |

---

## Scenarios

### A. Fresh machine — first-time user

```text
$ npm install -g slaminar
✓ slaminar Claude Code skill installed at ~/.claude/skills/slaminar/
$ slaminar setup
```

Walks through environment checks → AI provider (if desired) → catalog default (official) → defaults (AI mode, excludeAuthTools, scan caps) → optional discovery scan (v0.7) → summary ASCII table. Saves to `~/.config/slaminar/defaults.json`.

### B. Returning user — reconfigure a section

```text
$ slaminar setup --reconfigure catalog
```

Prompts only for catalog URL/mode. Leaves `auth.json` and other defaults untouched.

### C. Team member joining — project has team config

```text
$ cd team-repo && slaminar setup
ℹ team catalog detected (.slaminar/config.json)
? Use team's catalog as your personal default? (Y/n)
```

(v0.7) auto-detects project-level team config and offers to import into user-global defaults.

### D. CI environment — non-interactive

```bash
SLAMINAR_AI_PROVIDER=cloudflare \
SLAMINAR_CF_TOKEN=xxx \
SLAMINAR_CF_ACCOUNT_ID=xxx \
SLAMINAR_DEFAULT_AI_MODE=local \
  slaminar setup --yes --no-update-check
```

No prompts. Missing required env → explicit failure (no silent fallback).

### E. Discovery-only quick run (v0.7)

```bash
$ slaminar discover ~/work, ~/projects --dry-run
```

Uses `discovery.lastRoots` from defaults if omitted.

### F. Diagnostic when something is off

```text
$ slaminar doctor
✓ Node.js v20.11.0  (required: >= 18)
✓ slaminar v0.6.0 (global)
✓ Claude Code skill → ~/.claude/skills/slaminar/SKILL.md
⚠ Bundled SKILL.md differs from installed — run `slaminar skill install`
✓ cloudflare — account My Personal, model llama-3.3-70b-instruct-fp8-fast
✓ Catalog cache valid (source: remote, fetched 4h ago)
```

Read-only. Exits 0 / 1 / 2 for all-pass / any-warn / any-fail (same convention as `slaminar check`).

---

## Feature Matrix

| # | Feature | Command | Version | Complexity |
|---|---|---|---|---|
| F1 | Global setup wizard | `slaminar setup` | **v0.6** | M |
| F2 | Environment doctor | `slaminar doctor` | **v0.6** | S |
| F8 | Section reconfigure | `slaminar setup --reconfigure <section>` | **v0.6** | S |
| F9 | CI / non-interactive mode | `slaminar setup --yes` + env | **v0.6** | S |
| F7-C | Update notice (npm registry) | background in every command | **v0.6** | S |
| F10 | Skill scope selection | `setup` step | v0.6 (defaults only) | S |
| F3 | Project discovery | `slaminar discover [roots]` | v0.7 | M |
| F4 | Batch apply to discovered | `slaminar setup --apply-to-discovered` | v0.7 | M |
| F6 | Team config auto-import | implicit in `setup` flow | v0.7 | S |
| F5 | Multi-source catalog CLI | `slaminar catalog source add/list/remove/test` | v0.8 | M |

---

## Confirmed Decisions (5)

| # | Question | Decision | Rationale |
|---|---|---|---|
| 1 | `login` vs `setup` | Remove `login` / `whoami` / `logout` / `auth`; replace with `setup` + `doctor` | Single entry point, discoverable, less surface |
| 2 | Discovery roots input | Comma/space-separated paths from user | No hard-coded "common roots" that mis-guess |
| 3 | Batch apply default | User chooses each run (dry-run all / select / apply now / save only) | Safety — never write many files without deliberate yes |
| 4 | Telemetry policy | **B+C**: schema field `telemetry.optedIn: false` pre-seeded (no transmission code yet), plus weekly npm version check (opt-out via flag / defaults) | Keeps door open without current privacy cost |
| 5 | Release shape | Split — v0.6 (setup/doctor) → v0.7 (discover/batch) → v0.8 (catalog sources) | Small PRs, fast feedback, themed releases |

---

## Data Model — `~/.config/slaminar/defaults.json`

```jsonc
{
  "version": 1,
  "savedAt": "2026-04-17T10:45:00Z",
  "defaults": {
    "aiMode": "auto",            // auto | ai | local
    "excludeAuthTools": true,
    "fileCountCap": 10000,
    "verbose": false
  },
  "catalog": {
    "autoRefreshHours": 24,      // 0 disables auto-refresh
    "url": "",                   // empty = official (v0.6 = single source)
    "mode": "replace"            // replace | extend (v0.8 extends to multi-source)
  },
  "discovery": {
    "lastRoots": [],             // populated by v0.7 discover
    "excludePatterns": ["node_modules", ".git", ".venv", "build", "target"],
    "maxDepth": 4
  },
  "skill": {
    "autoInstall": true,         // honored by dist/skill/post-install.js
    "scope": "global"
  },
  "telemetry": {
    "optedIn": false,            // schema only — no transmission code in v0.6
    "versionCheck": true         // weekly npm registry GET; privacy-safe
  },
  "updateCheck": {
    "lastCheckedAt": null,
    "latestKnownVersion": null,
    "skipVersions": []
  }
}
```

**Precedence (read path):** `CLI flag` > env var > `~/.config/slaminar/defaults.json` > hardcoded fallback.
**Write path:** Only `setup` and `setup --reconfigure` mutate this file. Every mutation bumps `savedAt` and runs a schema validation before save.

---

## Storage Layout (after v0.6)

| Path | Scope | Perms | Written by | Purpose |
|---|---|---|---|---|
| `~/.config/slaminar/auth.json` | user-global | 0600 | `setup` (auth step) | AI provider tokens |
| `~/.config/slaminar/defaults.json` | user-global | 0644 | `setup` | **NEW** — user preferences |
| `~/.config/slaminar/catalog-cache.json` | user-global | 0644 | catalog fetch | Remote catalog cache |
| `~/.config/slaminar/catalog-cache.prev.json` | user-global | 0644 | catalog rollback | Previous cache |
| `~/.config/slaminar/skill-backups/SKILL_*.md` | user-global | 0644 | skill install | User's pre-slaminar SKILL.md backups |
| `~/.config/slaminar/setup-logs/setup-YYYY-MM-DD.md` | user-global | 0644 | `setup` | **NEW** — audit log of each setup run |
| `.slaminar/config.json` | project | 0644 | `init`, `catalog config` | Team-committed config |
| `.slaminar/config.local.json` | project | 0644 | manual | Personal per-project override (gitignored) |
| `.slaminar/.bk/*.dat` + `manifest.json` | project | 0600/0644 | `init` / `update` | Project file backups |
| `.slaminar/reports/*.md` | project | 0644 | `init` | Init reports |

---

## CLI Surface Changes

### v0.6 — added

```
slaminar setup [--yes] [--reconfigure <auth|catalog|defaults|skill>] [--no-update-check]
slaminar doctor [--json]
```

### v0.6 — removed (breaking)

```
slaminar login        →  slaminar setup --reconfigure auth
slaminar whoami       →  slaminar doctor   (authentication section)
slaminar logout       →  (removed — rarely needed. Doc: `rm ~/.config/slaminar/auth.json`)
slaminar auth status  →  slaminar doctor
slaminar auth test    →  slaminar doctor   (runs embedded diagnostics)
slaminar auth switch  →  slaminar setup --reconfigure auth
```

### v0.7 — planned

```
slaminar discover [roots...] [--dry-run]
slaminar setup --apply-to-discovered
```

### v0.8 — planned

```
slaminar catalog source add <url|path> [--name <n>] [--mode <m>] [--trust <t>]
slaminar catalog source list
slaminar catalog source remove <name>
slaminar catalog source test <url|path>
```

---

## Migration (Existing v0.5 users)

- **`auth.json` is preserved** — the new `setup` wizard reads existing auth state, asks "Keep it?" before touching.
- **First `slaminar init` after v0.6 upgrade** — the inline "Set up AI provider?" prompt in `init` now nudges users to run `slaminar setup` first (no inline login wizard).
- **README adds a one-line top banner** directing v0.5 users to `slaminar setup`.
- **CHANGELOG "Breaking" table** maps every removed command to its new equivalent.

---

## Release Roadmap

### v0.6 — First-Run Experience (this release)

- `slaminar setup` wizard (Steps 1–5)
- `slaminar doctor` diagnostic
- `~/.config/slaminar/defaults.json` schema + I/O
- Weekly npm version check (opt-out)
- Remove `login`/`whoami`/`logout`/`auth` command group
- Migration banner in README
- ~15 new tests (~238 total)

### v0.7 — Discovery & Batch

- `slaminar discover [roots]` walks user-specified roots, detects Claude Code projects
- ASCII review table (new / configured / existing / unsupported)
- `setup --apply-to-discovered` wires discover → batch `init`
- Team config auto-import scenario (C)
- Incremental discovery cache

### v0.8 — Catalog Federation

- Promote `catalog.url` to `catalog.sources[]` array
- `slaminar catalog source add/list/remove/test`
- Priority layering, trust levels (per multi-source plan)
- `SLAMINAR_CATALOG_SOURCES` env var

---

## Open Questions (to revisit during implementation)

- Env var naming convention — current login wizard has no env path; invent `SLAMINAR_*` names consistent with `.env` conventions
- `setup-logs/` retention policy — keep forever vs prune after N
- How to surface update notice without being annoying — stderr, once per week, dismissible

---

## References

- [`2026-04-14-slaminar-design.md`](./2026-04-14-slaminar-design.md) — original pipeline architecture
- [`2026-04-16-custom-catalog-plan.md`](./2026-04-16-custom-catalog-plan.md) — foundation for v0.8 federation
- `src/auth/wizard.ts:runLoginWizard` — reused in v0.6 setup Step 2
- `src/skill/installer.ts:getSkillStatus` — reused in v0.6 doctor
- `src/recommender/catalog-cache.ts:isCacheValid` — reused in v0.6 doctor
