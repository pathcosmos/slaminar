---
name: slaminar
description: Analyze a project and set up Claude Code with tailored CLAUDE.md, plugins, and ecosystem tool recommendations. Accepts an optional target path — defaults to the current working directory. Use when the user asks to set up Claude Code for a project, wants CLAUDE.md generated, or asks for Claude Code tool recommendations. Phrasings like "set up slaminar", "set up this project", "analyze this repo", or "run slaminar on this folder" should trigger this skill.
---

# slaminar — Claude Code Project Setup

Analyze a project directory and automatically configure Claude Code with:
- Tailored CLAUDE.md (with ownership markers for incremental updates)
- Claude Code plugin (`plugin.json` + dev skill) at `.claude/plugins/slaminar-generated/`
- Intelligent tool recommendations from the ecosystem (46+ catalog)

## Determining the Target Path

**Step 0 — identify `<path>`**:
- If the user explicitly names a folder (e.g., "run slaminar on `../legacy-app`", "set up `~/work/other-repo`"), extract that path and use it as `<path>`.
- Otherwise, use `.` (the current working directory).
- Accept absolute paths, relative paths, and `~`-prefixed paths.

In every command below, substitute `<path>` with the value you determined.

## Workflow

**Important:** Every pipeline step inside Claude Code passes `--no-ai`. The outer Claude (you) handles enhancement in Step 5 using the agent's own project context — no Anthropic API key or Cloudflare token is required.

### Step 1: Check if the slaminar CLI is available

Run: `which slaminar || npx slaminar --version`

If it is missing, advise the user to install globally: `npm install -g slaminar`.

### Step 2: Dry-run analysis with local rules

Run: `slaminar init --dry-run --no-ai <path>`

Report to the user:
- Project profile (language, framework, pattern, maturity)
- Which files would be generated
- Which tools are recommended and why
- Which tools were excluded and why

### Step 3: Ask the user to proceed

Present the dry-run results and ask:
> "Shall I proceed with this configuration? Let me know if anything should change."

### Step 4: Execute the local-rules pipeline

If approved, run: `slaminar init --no-ai <path>`

This generates CLAUDE.md with slaminar ownership markers using local rules only. No external AI provider is called.

### Step 5: Enhance with your own project context

slaminar has written a rule-based CLAUDE.md. Your job is to raise it to Claude-grade quality using the project context you can see:

1. `Read` `<path>/CLAUDE.md` to see what slaminar generated.
2. `Read` key project files to build understanding: `package.json` / `pyproject.toml` / `Cargo.toml`, src/ entry points, existing docs, recent `git log --oneline -20`.
3. For each section delimited by `<!-- slaminar:begin:SECTION -->` and `<!-- slaminar:end:SECTION -->`, use `Edit` to improve the content. Section-specific guidance:
   - **overview** — replace generic framework labels with the actual domain and purpose you infer from the code
   - **architecture** — add real module relationships and data flows the local rules missed
   - **commands** — list the workflows actually used, not just every `npm run` script
   - **conventions** — extract naming, testing, and lint patterns from real code samples
   - **notes** — flag project-specific quirks, legacy areas, or TODOs worth warning future maintainers about

**Invariants — do not break these:**
- NEVER remove or alter the `<!-- slaminar:begin:X -->` / `<!-- slaminar:end:X -->` marker lines themselves. They are load-bearing for `slaminar update` incremental merges — touching them breaks future regeneration.
- NEVER edit content outside the markers. That region belongs to the human user — slaminar and you must both leave it alone.

### Step 6: Verify

Run: `slaminar check <path>`

Exit code 0 means CLAUDE.md, plugin, and markers are all well-formed. If non-zero, inspect the reported issues and fix them (typically a missing marker or a referenced `npm run` command that doesn't exist).

### Step 7: (Optional) Install recommended tools

For each recommended tool, ask if the user wants to install it. Run the install commands printed in the recommendation output.

## Other Commands

All of these accept the same optional path argument:

- `slaminar update <path>` — Incremental update (re-analyze, update changed sections only)
- `slaminar status <path>` — Health check (verify CLAUDE.md, plugin, tools)
- `slaminar recommend <path>` — Show recommendations without installing
- `slaminar uninstall <path>` — Remove all slaminar-generated files and restore backups
- `slaminar check <path>` — CI-friendly validation (exit codes: 0 pass, 1 warn, 2 fail)

## Flags

- `--dry-run` — Preview changes without writing
- `--verbose` — Detailed output with analysis breakdown
- `--no-ai` — Disable AI enhancement (use local rules only)
- `--catalog <url>` — Use a custom catalog source
- `--catalog-mode <extend|replace>` — When using a custom catalog, merge with the official one (extend) or replace it entirely

## Skill Self-Management

If the skill itself needs to be reinstalled or removed:

- `slaminar skill status` — Show whether the skill is installed at `~/.claude/skills/slaminar/` and whether it matches the bundled version
- `slaminar skill install [--force]` — (Re)install the skill
- `slaminar skill uninstall` — Remove the skill and restore any previous version from backup
