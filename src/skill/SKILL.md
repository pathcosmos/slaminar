---
name: slaminar
description: Analyze project and set up Claude Code with tailored CLAUDE.md, plugins, and ecosystem tool recommendations. Use when user asks to set up Claude Code for a project, wants CLAUDE.md generated, or asks for Claude Code tool recommendations.
---

# slaminar — Claude Code Project Setup

Analyze the current project and automatically configure Claude Code with:
- Tailored CLAUDE.md (with ownership markers for incremental updates)
- Claude Code plugin (plugin.json + dev skill)
- Intelligent tool recommendations from the ecosystem

## Workflow

### Step 1: Check if slaminar CLI is available

Run: `which slaminar || npx slaminar --version`

If not installed: `npm install -g slaminar`

### Step 2: Analyze and recommend (dry-run first)

Run: `slaminar init --dry-run .`

Show the user:
- Project profile (language, framework, pattern, maturity)
- What files would be generated
- Which tools are recommended and why
- Which tools were excluded and why

### Step 3: Ask user to proceed

Present the dry-run results and ask:
> "이 설정으로 진행할까요? 수정할 부분이 있으면 말씀해 주세요."

### Step 4: Execute

If approved, run: `slaminar init .`

Show verification results after completion.

### Step 5: (Optional) Install recommended tools

For each recommended tool, ask if the user wants to install it.
Run the install commands shown in the recommendation.

## Other Commands

- `slaminar update .` — Incremental update (re-analyze, update changed sections only)
- `slaminar status .` — Health check (verify CLAUDE.md, plugin, tools)
- `slaminar recommend .` — Show recommendations without installing
- `slaminar uninstall .` — Remove all slaminar-generated files, restore backups

## Flags

- `--dry-run` — Preview changes without writing
- `--verbose` — Detailed output with analysis breakdown
- `--json` — Machine-readable JSON output (for check command)
