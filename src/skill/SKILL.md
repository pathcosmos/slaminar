---
name: slaminar
description: Analyze a project and set up Claude Code with tailored CLAUDE.md, plugins, and ecosystem tool recommendations. Accepts an optional target path — defaults to the current working directory. Use when the user asks to set up Claude Code for a project, wants CLAUDE.md generated, or asks for Claude Code tool recommendations. Phrasings like "slaminar 돌려줘", "set up this project", "analyze this repo" should trigger this skill.
---

# slaminar — Claude Code Project Setup

Analyze a project directory and automatically configure Claude Code with:
- Tailored CLAUDE.md (with ownership markers for incremental updates)
- Claude Code plugin (`plugin.json` + dev skill) at `.claude/plugins/slaminar-generated/`
- Intelligent tool recommendations from the ecosystem (46+ catalog)

## Determining the Target Path

**Step 0 — identify `<path>`**:
- If the user explicitly names a folder (e.g., "slaminar `../legacy-app` 에 돌려줘", "set up `~/work/other-repo`"), extract that path and use it as `<path>`.
- Otherwise, use `.` (the current working directory).
- Accept absolute paths, relative paths, and `~`-prefixed paths.

In every command below, substitute `<path>` with the value you determined.

## Workflow

### Step 1: Check if the slaminar CLI is available

Run: `which slaminar || npx slaminar --version`

If it is missing, advise the user to install globally: `npm install -g slaminar`.

### Step 2: Dry-run analysis

Run: `slaminar init --dry-run <path>`

Report to the user:
- Project profile (language, framework, pattern, maturity)
- Which files would be generated
- Which tools are recommended and why
- Which tools were excluded and why

### Step 3: Ask the user to proceed

Present the dry-run results and ask:
> "이 설정으로 진행할까요? 수정할 부분이 있으면 말씀해 주세요."

### Step 4: Execute

If approved, run: `slaminar init <path>`

Show the verification output after completion.

### Step 5: (Optional) Install recommended tools

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
