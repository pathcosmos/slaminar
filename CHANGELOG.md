# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.9.7] — 2026-04-20

### Fixed — recommender clone-detection + dogfood hygiene

Follow-ups surfaced while self-running slaminar against its own source tree after v0.9.6 shipped.

**`recommender/installer-router` — retry-safe git-clone short-circuit:**
- `executePlan`'s git-clone path previously treated any existing destination directory as "already cloned — skipped". A prior failed clone (network error, bad URL, etc.) could leave an empty husk directory that silently masked the failure and blocked every subsequent retry.
- Fix: short-circuit only when `<dest>/.git` exists; pre-create only the parent directory so `git clone` can own creation of `dest` itself.
- +2 regression tests in `tests/recommender/installer-router.test.ts` (populated-repo path is still treated as cloned; empty-husk dir is not).

**`CLAUDE.md` marker sections — real project context:**
- Rewrote the five slaminar-managed marker blocks (overview, commands, architecture, conventions, dependencies) with project context the local rules could not derive on their own — 7-phase pipeline, actual runtime/dev dependencies, `execFileSync` invariant, ownership-marker pattern, v0.9.x system-QA focus.
- Pre-marker human prose and all marker fences preserved byte-for-byte; `slaminar check` reports 9/9.

**`.gitignore` — ignore whole `.claude/` and `.slaminar/` dirs:**
- Dogfooding slaminar on its own repo creates these trees and they are not meant to be committed to the slaminar source (risks a self-referential `.claude/plugins/slaminar-generated`). Existing narrow entries kept as inline documentation of what lives inside each dir.

### Stats

- Tests: 373 → 375 (+2 installer-router regression tests).
- No catalog changes.

[0.9.7]: https://github.com/pathcosmos/slaminar/compare/v0.9.6...v0.9.7

## [0.9.6] — 2026-04-20

### Fixed — catalog integrity audit + validator false positive

Surfaced during a self-run of `/slaminar` against the slaminar source repo itself. Both a CLAUDE.md validator bug and multiple phantom catalog entries were uncovered and fixed.

**`validator/claude-md` — strip code regions before marker scan:**
- `src/validator/claude-md.ts` regex was scanning raw content, so literal marker strings quoted inside inline code (e.g. `` `<!-- slaminar:begin:SECTION -->` ``) tripped the "unmatched begins" check. The fix (`stripCodeRegions`) neutralises fenced and inline code spans before scanning so real markers are the only ones counted.
- +2 regression tests in `tests/validator/claude-md.test.ts` (inline code span case, fenced block case).

**`catalog/catalog.json` — 7 entries with wrong metadata, corrected via cross-reference with `README*.md` and `docs/claude-code-*` (audit = 12.5% of 56):**
- `everything-claude-code` — phantom `anthropics/*`; retargeted to `affaan-m/everything-claude-code` (161k⭐).
- `md2pptx` — `pip install md2pptx` was not on PyPI; switched to `installMethod: git-clone` with `MartinPacker/md2pptx`.
- `spec-kit` — `npx spec-kit init` was not on npm; switched to `npx @spec-kit/cli init`.
- `planning-with-files` — phantom `anthropics/*`; retargeted to `OthmanAdi/planning-with-files` (19k⭐). Reclassified `npx → git-clone` (it's a Claude Code skill, not an npm package).
- `graphify` — phantom `anthropics/*`; retargeted to `safishamsi/graphify` (30k⭐). Reclassified `pip → git-clone`.
- `get-shit-done` — phantom `anthropics/*`; retargeted to `gsd-build/get-shit-done` (55k⭐). Reclassified `npx → git-clone` — the npm package name collides with an unrelated Pomodoro timer, which is why the prior metadata silently did the wrong thing.
- `powerpointer` — **removed entirely**: the catalog's `krisvdm` user does not exist on GitHub, and neither README nor docs surface any alternative owner (candidate `CyberTimon/Powerpointer` is a GPT-based generator, not the mistune+python-pptx stack the catalog described). 2 relations referencing it were pruned.
- Catalog bumped `version: 2.1.0 → 2.2.0`.

**Note on the initial audit error:** v0.9.6's first pass deleted `planning-with-files`, `graphify`, and `get-shit-done` as unfindable phantoms. A follow-up cross-check against `README.md` found that the *catalog* owners were wrong but the *README* owners (`OthmanAdi/…`, `safishamsi/…`, `gsd-build/…`) pointed to real, high-star repositories. All three were restored with the correct metadata before this release was finalised. The CHANGELOG reflects the corrected end state, not the intermediate deletion.

**Schema — `installMethod` enum extended:**
- `src/types/index.ts` now accepts `npm-global | npm-dev | npm-init` in addition to the existing values. Three entries reclassified to match reality: `marp → npm-global`, `playwright → npm-dev`, `slidev → npm-init`. The `installCommands` strings were already correct; only the metadata field was wrong.

**`BUNDLED_CATALOG` emptied:**
- All 14 entries in `src/recommender/catalog.ts` were shadowed by same-name entries in the official catalog (official wins on priority) AND were themselves phantom sources. Replaced with `[]` + explanatory comment. Offline first-run still works via the disk cache layer. Tests in `catalog.test.ts` and `catalog-resolver.test.ts` updated to the new empty-bundled contract.

**`scripts/verify-catalog.mjs` — new audit tool:**
- Walks every tool in `catalog/catalog.json`; verifies git-clone entries against the GitHub API, npm/pip entries against the registry, and (heuristically) checks that npm package descriptions line up with the catalog description so that name-collisions like `get-shit-done` surface as warnings.
- Handles `npm install -g`, `npm install -D`, `npm init` (resolves to `create-*`), and scoped packages.
- Non-zero exit on hard failures (`gh-404`, `npm-404`, `pypi-404`, `parse-error`); allows `unverified` (marketplace), `npm-desc-mismatch` (heuristic), `gh-ratelimit` (transient).
- `GITHUB_TOKEN` env lifts the 60/hr unauth cap to 5000/hr.
- Registered as `npm run verify:catalog`.

### Stats

- Catalog: 56 → 55 tools (1 removed: `powerpointer`; 3 retargeted: `planning-with-files`, `graphify`, `get-shit-done`), 26 → 24 relations (2 powerpointer relations dropped).
- Tests: 367 → 373 (6 content-dependent bundled tests replaced with 3 contract tests, +2 validator regression tests, +9 installer-router tests).
- Lines: `src/recommender/catalog.ts` −176 (dead bundled entries gone).

[0.9.6]: https://github.com/pathcosmos/slaminar/compare/v0.9.5...v0.9.6

## [0.9.5] — 2026-04-20

### Added — QA Phase Q6 Final Summary + v0.9.x Closure

Phase Q6 는 v0.9.1–0.9.4 로 이어진 QA 사이클 (Q1–Q5) 의 종합 roll-up 을 고정한다. 이번 릴리스는 마찰 없는 문서-only 릴리스 — 코드 변경 0, 475 tests 그대로 유지. v0.10+ 작업은 이 보고서를 baseline 으로 출발한다.

**산출물:**
- `docs/qa/reports/2026-04-20-qa-summary.md` (신규) — Q1–Q5 전체 요약:
  - 테스트 성장 curve (347 → 475, +37%)
  - **P0 9 건 모두 fix** (P0-1/2/3/5 @ v0.9.1, P0-6/7/8/9/10 @ v0.9.2)
  - **P1 2 건 모두 처리** (P1-1 concurrency lock, Obs-Q3-2 corrupt team-config @ v0.9.3)
  - P2 관찰 10 건 티켓화 (v0.10+ 로 연기)
  - 28 개 design decisions (D19.1–D22.6)
  - QA 인프라 최종 상태 — `npm test`, `test:e2e`, `bench` 실행 방법표
  - **향후 QA 반복 주기 권고** — 매 PR (test:all), 매 minor (Q1 rescan), 매 RC (bench compare), 분기 (fault matrix), 연 (rollback 전수 재점검)
  - 새 기능 도입 시 QA 체크리스트 (Q2–Q5 패턴 5 단계)
  - 회고 — 잘 된 것 4 가지, 개선할 것 4 가지

### Stats

- **Zero source changes** — 67 source modules (유지), 475 tests / 1 skipped (유지)
- v0.9.x 사이클 총 6 릴리스 (v0.9.0 feature + v0.9.1–5 QA): +128 tests / +18 source modules (net, including bench infra)
- v0.9.x 도입 변경: tokenTier 필터, E2E 인프라, fault-injection 매트릭스, project file-lock, performance baseline

### Next (v0.10 후보, 이번 사이클 범위 밖)

- Node startup 최적화 (esbuild bundle / bun compile) — Perf-#1 해소
- Catalog federation UI (`slaminar catalog source wizard`)
- `discover` batch apply in-process 전환 — Perf-#3 memoize 효과 실현
- CI 기반 performance regression auto-gate

[0.9.5]: https://github.com/pathcosmos/slaminar/compare/v0.9.4...v0.9.5

## [0.9.4] — 2026-04-20

### Added — QA Phase Q5 (Performance Baseline) — measurement-only release

Phase Q5 establishes a numerical performance baseline for regression detection. No code paths change; this release is infrastructure + documentation.

**Dependency-free benchmark runners (hyperfine not required):**
- `scripts/bench-cli.mjs` — CLI wall-time. Spawns `node dist/cli.js init --dry-run <fixture>` via `spawnSync`, times with `performance.now()`. 3 fixtures × 3 tiers × n=8 = 72 runs + warmup. Emits JSON + Markdown to `docs/benchmarks/raw/cli-wall-time-<date>.{json,md}`.
- `scripts/bench-lib.mjs` — per-phase breakdown. Imports `dist/core/scanner.js`, `dist/core/pipeline.js`, `dist/recommender/recommender.js` and measures `scan` / `analyze` / `recommend` in-process (Node-startup cost excluded). Emits JSON + MD to `docs/benchmarks/raw/lib-phases-<date>.{json,md}`.
- `tests/bench/pipeline-phases.bench.ts` — vitest bench equivalent kept for future use. vitest 3.x bench summary is unstable with `describe.each` + `bench`; primary measurement goes through `scripts/` for now.
- `package.json` scripts: `bench:cli`, `bench:lib`, `bench`.

**Baseline established (v0.9.4):**

CLI wall-time (subprocess, incl. Node startup):
- small (20 files): 102–104ms
- medium (500 files): 105–107ms
- large (5000 files): 121–124ms
- Tier choice affects wall-time by < 2ms (post-recommend filter, no I/O impact)

Per-phase library breakdown (pipeline only):
- scan: ~3µs per file — 287µs (small) / 2.1ms (medium) / 13.6ms (large)
- analyze ≈ scan (5 analyzers measured as near-zero additional cost)
- recommend: 685µs cold (first catalog read), 176–197µs warm

**Top 3 bottlenecks identified:**
1. **Node.js startup + module load** — ~85% of CLI wall-time (~90ms out of ~100ms). P2. Candidates: esbuild single-bundle, bun compile, Node compile-cache.
2. **scan file-tree walk** — linear 3µs/file. P2 for large monorepos. Candidates: `fs.readdir({ recursive, withFileTypes })` + promise-batch.
3. **recommend cold catalog load** — +500µs one-shot. P3 (no effect in current per-invocation CLI model; memoize would matter only if batch apply moves in-process).

**Regression contract:**
- Each release runs `npm run bench` and compares raw/ output against `docs/benchmarks/2026-04-20-baseline.md`
- > 10% regression flags the release commit with a rationale
- Baseline file is dated; intentional architecture changes add a new dated baseline rather than overwriting

### Documentation

- `docs/benchmarks/2026-04-20-baseline.md` (new) — method, full tables, Top 3, regression contract, macOS-local caveat
- `docs/qa/reports/phase-q5-performance.md` (new) — Phase Q5 deliverables, key numbers, bottleneck analysis
- `docs/benchmarks/raw/` (new dir) — auto-generated raw results by date

### Not Changed (deliberate)

- **Zero source code changes** — no P0s surfaced in Q5. Current wall-time (100–130ms) is well within user-comfortable range.
- **No catalog update optimization** — HOME-scope cache contention is a P2 item from Q4 (Obs-Q4-1), not touched here.
- **vitest bench integration** — `tests/bench/` exists and can be run manually with `npx vitest bench` but is not in default scripts due to vitest 3.x output instability for our fixture-based test shape.

### Stats

- 66 source modules (unchanged), 81 test files + 1 bench file, **475 tests / 1 skipped** (no test changes)
- 3 new scripts (`scripts/bench-{cli,lib}.mjs`, `tests/bench/pipeline-phases.bench.ts`)
- Wall-time unchanged: `npm test` ~1.0s, `npm run test:e2e` ~12s. Add `npm run bench` ~3min (CLI × 72 runs is the bulk).

[0.9.4]: https://github.com/pathcosmos/slaminar/compare/v0.9.3...v0.9.4

## [0.9.3] — 2026-04-18

### Added — QA Phase Q4 (Rollback Integrity) + File Lock for Concurrency

Phase Q3 (v0.9.2) 가 F6 concurrency 를 재현·문서화 했으니, Q4 는 그 구조적 결함 — 같은 프로젝트에 두 slaminar 프로세스가 동시에 쓰면 manifest race 로 백업 기록 유실 — 을 실제로 제거. 아울러 R1–R10 rollback 매트릭스를 자동화 테스트로 고정하고 Q3 에서 이관된 Obs-Q3-2 (corrupt team-config silent fallback) 을 fix.

**File-based project lock (`src/locking/file-lock.ts`, 신규):**
- `proper-lockfile@4.1.2` 런타임 의존성 추가
- `acquireProjectLock(root)`, `withProjectLock(root, fn)` (async), `withProjectLockSync(root, fn)` (sync for uninstall), `ProjectBusyError`
- Lock 파일: `<root>/.slaminar/lockfile.lock`. stale=30s 로 crash 된 프로세스의 orphan lock 을 자동 reclaim
- 적용 커맨드: `init` (dry-run 제외), `update` (dry-run 제외), `uninstall`. Dry-run / read-only 커맨드는 lock 비적용

**Obs-Q3-2 fix — corrupt team-config 감지 (`src/team/config.ts`, `src/core/updater.ts`, `src/cli.ts`):**
- `loadTeamConfigWithStatus()` 신규 — `{ config, status: 'ok'|'missing'|'corrupt' }` 반환
- `UpdateResult.teamConfigCorrupt` 필드
- CLI update 출력에 노란색 경고 + `setup --reconfigure catalog` 안내
- 이전 동작: 조용히 default fallback → 다음 save 에서 `approvedTools`, `catalogUrl`, `catalogMode` 유실. 이제 사용자에게 즉시 알림

**Obs-Q4-3 — `.slaminar/.gitignore` 에 `lockfile.lock` 추가:**
- `ensureGitignore()` 가 `lockfile.lock` 엔트리를 포함 — 실수로 commit 되는 것 방지

**R1–R10 매핑 (rollback 매트릭스 자동화):**

| R# | 상태 | 위치 |
|---|---|---|
| R1 정상 round trip | 자동화 | `tests/e2e/rollback.test.ts:R1` |
| R2 writeTargets 부분 실패 | 자동화 (v0.9.1 P0-1) | `rollback.test.ts:P0-1` |
| R3 marker 꼬임 | **신규 자동화** | `rollback.test.ts:R3` |
| R4 / R8 중첩 init race | lock 으로 대체 | `concurrency.test.ts:F6.a` |
| R5 대상 파일 이미 삭제 | **신규 자동화** | `rollback.test.ts:R5` |
| R6 manifest 손상 uninstall | 자동화 (v0.9.2 P0-9) | `fault-injection/corrupt.test.ts:F3.c` |
| R7 `remove <tool>` | 자동화 (v0.9.1) | `tests/e2e/remove.test.ts` |
| R9 디스크 소진 | skip (ENOSPC 포터블 시뮬 불가, Q3 D20.7 과 동일) | `fs.test.ts:F2.c` |
| R10 symlink | **신규 자동화** | `rollback.test.ts:R10` |

**F6 concurrency tests (lock 적용 후 업데이트):**
- F6.a — 두 `init` 병렬: 정확히 하나 성공 (exit 0), 하나 `ProjectBusyError` 로 거부 (exit 1). Lock 파일이 프로세스 종료 후 해제됨 (no orphan)
- F6.b — `update` + `uninstall` 병렬: 직렬화, crash/stack trace 없음, orphan lock 없음
- F6.d — setup × 2 (shared HOME): setup 은 프로젝트 scope 밖이라 lock 비적용, last-write-wins 의도된 동작 유지

**문서:**
- `docs/qa/reports/phase-q4-rollback.md` — Phase Q4 산출물 + lock 설계 설명 + R1–R10 매핑 + 남은 P2 관찰

### Changed

- `src/locking/file-lock.ts` (new)
- `src/core/pipeline.ts:init` — `runInit` 로 분리 + `withProjectLock` 래핑
- `src/core/updater.ts:update` — `runUpdate` 로 분리 + `withProjectLock` 래핑; `UpdateResult.teamConfigCorrupt` 필드; `loadTeamConfigWithStatus` 호출
- `src/rollback/uninstaller.ts:uninstall` — `doUninstall` 로 분리 + `withProjectLockSync` 래핑
- `src/team/config.ts` — `loadTeamConfigWithStatus` + `TeamConfigStatus` export; `ensureGitignore` 에 `lockfile.lock`
- `src/cli.ts` — update action 이 `teamConfigCorrupt` 표면화
- `tests/e2e/rollback.test.ts` — +3 tests (R3, R5, R10)
- `tests/fault-injection/concurrency.test.ts` — F6.a/b 를 lock 기대치로 update
- `package.json` — `proper-lockfile@^4.1.2` (deps), `@types/proper-lockfile` (devDeps)

### Not Changed (deliberate)

- `catalog update` 는 project-scope lock 밖 (HOME-scope cache 사용). HOME-scope 별도 lock 은 Phase Q5/Q6 에서 필요 시 검토. 현재는 단일 cache 파일 writeFileSync 원자성에 의존.
- Lock stale timeout 30 초 하드코딩 — env 노출은 P2 로 기록, 현재 변경 없음.
- setup / doctor / scan / analyze / recommend / status / check / discover / catalog* / skill* — 모두 read-only 또는 비-프로젝트 범위이므로 lock 비적용.
- P0 없음 — 이번 Phase 는 기존 P1 fix + 인프라.

### Stats

- 66 source modules (+ `src/locking/file-lock.ts`), 81 test files, **475 tests** (365 unit + 63 E2E + 47 fault-injection, 1 skip)
- Phase Q4 에서 신규 P0: 0. 티켓 해소: P1-1 (F6 lock), Obs-Q3-2 (corrupt team-config). 남은 P2: 3 (Obs-Q4-1/2, plus Q3 carry-over)
- Wall-time: `npm test` ~1.0s, `npm run test:e2e` ~12s

[0.9.3]: https://github.com/pathcosmos/slaminar/compare/v0.9.2...v0.9.3

## [0.9.2] — 2026-04-18

### Added — QA Phase Q3 (Fault-Injection Matrix) + 5 P0 Fixes

Phase Q3 injects faults from all 8 categories in `docs/qa/fault-matrix.md` — network timeouts, filesystem errors (EACCES, symlink loop, read-only HOME), corrupt config files (defaults.json / auth.json / manifest / catalog cache / plugin.json / team config), AI provider failures (401 / 429 / empty body / timeout), concurrency races, invalid CLI input, and version mismatches. Tests use local `node:http` stub servers and `vi.stubGlobal('fetch', …)` instead of mock-fs (per user decision).

**New fault-injection suite:**
- `tests/fault-injection/` — **47 tests / 1 skipped**, 7 files (network, ai-provider, fs, corrupt, input, version, concurrency)
- `vitest.config.ts` E2E branch already included this dir; no config churn
- MSW 2.13.4 added as devDependency (not currently used at runtime; stubs use `node:http` directly, but MSW is in place for future network-heavy scenarios)

**P0 fixes (5, all with regression tests):**

- **P0-6 (F7.f) — `fileCountCap` negative allowed in `--yes` mode** (`src/setup/wizard.ts:318-322`). `SLAMINAR_FILE_COUNT_CAP=-5 slaminar setup --yes` was persisting `-5` to `defaults.json`. The interactive wizard path already clamped via `Math.max(100, …)`; the env path now matches. 1-line fix.
- **P0-7 (F7.c) — `--catalog-mode` validation missing in 4 places** (`src/cli.ts:123, 240, 571, 611` — init / recommend / discover / catalog update). The `catalog config` and `catalog source add` commands already validated this; others silently `as CatalogMode` cast any string. New `validateCatalogMode()` helper rejects anything outside `extend | replace` with exit 1 and an allowlist message.
- **P0-8 (F8.a) — `minSlaminarVersion` was not honored** (`src/recommender/catalog-remote.ts`, `src/recommender/catalog-resolver.ts`). A catalog declaring `minSlaminarVersion: "99.0.0"` was silently consumed. New `meetsMinSlaminarVersion(min, installed?)` function performs a pragmatic semver-like compare (numeric segments, pre-release suffixes stripped). New `IncompatibleCatalogVersionError` class for future fatal paths. The resolver now warns and falls through to cache/bundled when the gate fails.
- **P0-9 (F3.c) — corrupt manifest.json silently treated as "no backups"** (`src/placer/backup.ts`, `src/rollback/uninstaller.ts`, `src/cli.ts`). `readManifest()` returned `[]` on parse failure, indistinguishable from a fresh project with no backups — `slaminar uninstall` would report "complete" even though the user's original files might have been mid-overwrite. New `readManifestWithStatus()` returns `{ records, status: 'ok' | 'missing' | 'corrupt' }`; `UninstallResult.manifestCorrupt` surfaces this; CLI prints a red warning and exits 1 when corruption is detected.
- **P0-10 (F2.a) — partial write failure in `writeTargets` silently swallowed** (`src/placer/writer.ts:29-35`). If one file in the plan failed EACCES but others succeeded, the CLI exited 0. Now any write failure triggers `throw` so the pipeline's rollback catch (P0-2 in v0.9.1) restores every session backup.

### Changed

- `src/setup/wizard.ts` — env-path `fileCountCap` now clamps via `Math.max(100, …)` matching interactive path
- `src/cli.ts` — new `VALID_CATALOG_MODES` constant + `validateCatalogMode()` helper; 4 call sites updated (init / recommend / discover action / catalog update action)
- `src/recommender/catalog-remote.ts` — imports `SLAMINAR_VERSION`; exports `meetsMinSlaminarVersion` and `IncompatibleCatalogVersionError`
- `src/recommender/catalog-resolver.ts` — version check inserted between fetch and cache write; miss → warn + fall through to cache/bundled
- `src/placer/backup.ts` — new `readManifestWithStatus()` + `ManifestStatus` type; original `readManifest` preserved for callers that don't need status
- `src/rollback/uninstaller.ts` — `UninstallResult.manifestCorrupt` field; uses `readManifestWithStatus()`
- `src/cli.ts` uninstall action — red warning + `process.exitCode = 1` when `manifestCorrupt`
- `src/placer/writer.ts` — any error triggers `throw` (was: only thrown if all failed)
- `docs/qa/fault-matrix.md` (new) — F1–F8 × commands sparse matrix with expected behavior per cell
- `docs/qa/reports/phase-q3-exceptions.md` (new) — Phase Q3 report including P0 fix proofs, P1/P2 ticket list, F6 concurrency observations

### Not Changed (deliberate)

- F6 concurrency lock implementation is **not** in this release. Tests reproduce the race; the fix (file-based lock covering init / update / uninstall / catalog update) is P1-1, scheduled for v0.9.3 (Phase Q4).
- Obs-Q3-2 (corrupt `.slaminar/config.json` → update falls back silently) is P1 and tracked for v0.9.3 alongside rollback atomicity work.
- AI provider rate-limit retry / backoff remains out of scope — matrix F5.b is documented as intentional graceful fallback.
- No changes to existing unit tests — P0 fixes are all additive on the behavior side; 365 unit tests still pass unchanged.

### Stats

- 65 source modules, 81 test files (+7 fault-injection, +1 concurrency), **472 tests** (365 unit + 60 E2E + 47 fault-injection) / 1 skipped (F2.c ENOSPC not portably simulable)
- P0 issues surfaced: 5, all fixed here. P1 tickets: 2. P2 observations: 4.
- Wall-time: `npm test` ~1.0s, `npm run test:e2e` ~12s (includes 10s F1.a timeout scenario), `test:all` ~13s on local macOS

[0.9.2]: https://github.com/pathcosmos/slaminar/compare/v0.9.1...v0.9.2

## [0.9.1] — 2026-04-17

### Added — System-Level QA Foundations (Phase Q1+Q2) + 4 Critical Fixes

v0.9.x QA 사이클의 첫 두 단계. Phase Q1 (현황 조사) 로 전체 CLI 의 예외 처리·rollback·backup·테스트 커버리지를 전수 매핑했고, Phase Q2 (기능 E2E) 로 28 CLI 커맨드를 아우르는 재실행 가능한 E2E 테스트 인프라를 구축. Q1 에서 식별된 P0 4 건은 이번 릴리스에 같이 fix + E2E 회귀 테스트 포함.

**E2E 인프라 신규:**
- `tests/e2e/_helpers.ts` — `runCli(args, opts)` 가 compiled `dist/cli.js` 를 `execFile` 로 실행해 stdout/stderr/exitCode 캡처. Fixture 3 종 (small 20 files / medium 500 python mono / large 5000 polyglot) 을 런타임 생성 — git 에 5000 파일 커밋 불필요.
- `vitest.config.ts` 가 `E2E=1` env 로 include/exclude 분기: 기본 `npm test` 는 E2E 제외, `npm run test:e2e` 만 E2E 실행. HOME 자동 격리로 사용자 `~/.config/slaminar/` 무영향.
- **E2E 테스트 16 파일 / 60 tests**: init, rollback, scan, analyze, recommend, status, update, check, remove, setup, doctor, discover, skill, catalog-read, catalog-write, catalog-source.

**P0 Fixes (4 건):**

- **P0-1 — `writeManifest` 원자성** (`src/placer/backup.ts`): tmp-then-rename 패턴 적용. 크래시 시 truncated JSON 대신 stale-but-valid manifest 유지. 이전 구현에서는 `readManifest` 가 `[]` 반환해 **모든 백업 기록 유실** risk.
- **P0-2 — `restoreFile` return 존중** (`src/types/index.ts`, `src/rollback/uninstaller.ts`, `src/core/pipeline.ts`, `src/cli.ts`):
  - `UninstallResult.missingBackups: string[]` 필드 신규
  - uninstall 은 백업 blob 없으면 `missingBackups` 에 기록하고 CLI 는 "Warning: backup blob missing — these files were NOT restored" 출력
  - init 의 rollback 경로는 복원 실패한 파일명을 throw 메시지에 포함 ("Backed-up files restored except: X, Y. Manual recovery required.")
  - 이전 구현은 silent data loss — 백업 blob 이 없어도 복원 성공으로 보고
- **P0-3 — `preAction` hook 예외 보호** (`src/cli.ts`): `maybePrintUpdateNotice` 호출을 try/catch 로 래핑. 미래에 update-check 에서 발생할 수 있는 fetch/parse 에러가 모든 커맨드를 크래시시키는 fragility 제거.
- **P0-5 — `skill uninstall` 실패 시 exit=1** (`src/types/index.ts`, `src/skill/installer.ts`, `src/cli.ts`):
  - `SkillUninstallResult.status: 'removed' | 'not-installed' | 'failed'` 신규
  - 이전에는 `removed: false` 가 "정상 skip" 과 "filesystem 에러" 양쪽을 동시에 의미 → CI 에서 실패 감지 불가. 이제 `failed` 만 exit=1.
  - E2E 회귀 테스트가 rmSync EISDIR 경로를 실제로 재현

**문서:**
- `docs/qa/current-state.md` — Phase Q1 현황 스냅샷 (rollback 흐름도, CLI try/catch 분포, F1–F8 테스트 커버리지 매트릭스, P0/P1 이슈 목록)
- `docs/qa/reports/phase-q2-functional.md` — Phase Q2 산출물 · fix 회귀 증명 · baseline 수치 · Phase Q3+ 인풋

### Changed

- `src/types/index.ts` — `UninstallResult.missingBackups`, `SkillUninstallResult.status` 추가
- `src/placer/backup.ts` — `writeManifest` atomic write (renameSync + tmp file), `unlinkSync`/`renameSync` 를 imports 에 추가
- `src/rollback/uninstaller.ts` — `restoreFile` return 값 분기
- `src/core/pipeline.ts` — init rollback 경로에서 복원 실패 파일 트래킹
- `src/skill/installer.ts` — `uninstallSkill` 의 세 종결 경로에 `status` 세팅
- `src/cli.ts` — uninstall 출력에 missingBackups 섹션, skill uninstall 분기 (status), preAction hook try/catch
- `vitest.config.ts` — E2E 분기
- `package.json` — `test:e2e`, `test:all` scripts; `version` 0.9.0 → 0.9.1
- `src/version.ts` — `SLAMINAR_VERSION` 0.9.0 → 0.9.1

### Not Changed (deliberate)

- 기존 365 unit tests 전부 그대로 통과 (P0 fix 가 기존 계약을 깨지 않음)
- `--no-ai` / `aiMode` / `tokenTier` 의미 불변
- Concurrency lock (flock, pid file) — P1-1 로 Phase Q4 (v0.9.3) 이관. 이번 릴리스는 atomicity + return-value 검증에 집중.
- Catalog schema 불변 — tier-filter 도 건들지 않음.

### Stats

- 64 source modules, **74 test files (+16 E2E)**, **425 tests passing** (365 unit + 60 E2E)
- Phase Q1: P0 4 건 식별 → 모두 fix. P1 6 건 티켓화 (v0.9.2+ 로 연기)
- wall-time: `npm test` ~1.2s, `npm run test:e2e` ~3s, `test:all` ~6.5s (로컬 macOS)
- 설계 문서: `/Users/lanco/.claude/plans/harmonic-wishing-pumpkin.md` (승인 플랜)

[0.9.1]: https://github.com/pathcosmos/slaminar/compare/v0.9.0...v0.9.1

## [0.9.0] — 2026-04-17

### Added — Token-Cost Tier for Tool Recommendations

slaminar 의 추천 파이프라인에 **토큰 소비 정도**를 기준으로 한 필터 축을 도입합니다. 사용자는 `defaults.tokenTier` (또는 `--token-tier`) 로 **conservative / smart / rich** 세 단계 중 하나를 고르고, 이에 따라 카탈로그의 각 도구가 outer Claude 세션에서 소비할 것으로 예상되는 토큰 양(low/medium/high)을 기반으로 추천이 필터링됩니다. v0.8.x 까지는 `--no-ai` on/off 만 있었고 "AI 를 쓰되 가볍게" 중간 지점이 없었습니다.

**휴리스틱 기반 자동 분류 + 선택적 override (`src/recommender/token-cost.ts`, 신규):**
- `inferTokenCost(tool)` — 타입·태그 기반 휴리스틱. 규칙:
  - `browser` / `e2e` / `playwright` / `lsp` / `static-analysis` / `knowledge-graph` / `large-codebase` / `codebase-mapping` / `orchestration` / `multi-agent` / `multi-model` / `dashboard` / `monitoring` / `metrics` / `long-running` / `html-to-pdf` 태그 — 무조건 `high`
  - `token-saving` / `lightweight` / `notification` / `alerts` / `safety` / `onboarding` / `simplicity` / `optimization` 태그 — `low` (hook 은 무조건 low)
  - 나머지는 카테고리 기본값: `hook` → low, `skill`/`agent`/`plugin`/`workflow` → medium
- `resolveTokenCost(tool)` = `tool.tokenCost ?? inferTokenCost(tool)`. 카탈로그의 명시적 `tokenCost` 필드가 우선, 없으면 휴리스틱.
- 이 설계 덕분에 **custom catalog** 도구도 bundle 카탈로그와 동일 파이프라인으로 자동 분류됩니다 (D18.9).
- 번들 카탈로그 56 개 분포: **low 9, medium 34, high 13** — override 0 건으로 합리적 분류.

**Tier 필터 매트릭스 (`src/recommender/tier-filter.ts`, 신규):**

| tier | low | medium | high |
|---|---|---|---|
| conservative | ✅ 전부 | score ≥ 80 만 | ❌ 전부 제외 |
| smart (기본) | ✅ 전부 | ✅ 전부 | score ≥ 70 만 |
| rich | ✅ 전부 | ✅ 전부 | ✅ 전부 |

Score threshold 는 "cheap-and-useful" 도구를 보호하기 위한 안전장치 (D18.5). 필터는 overlap 해결 뒤·maxTools 제한 앞에서 작동하므로, tier 로 제외된 슬롯에 다른 도구가 채워집니다.

**설정·CLI·UX:**
- `UserDefaults.defaults.tokenTier?` — `~/.config/slaminar/defaults.json` 에 저장. 기본값 `'smart'`
- `slaminar setup` → Step 4 (Defaults for new projects) 에 새 select 질문 추가
- `--yes` 모드 env var `SLAMINAR_DEFAULT_TOKEN_TIER=conservative|smart|rich`
- `slaminar init --token-tier <tier>` / `slaminar recommend --token-tier <tier>` — CLI 플래그가 저장된 기본값을 일시 override
- Inline mini-setup (v0.8.4) 에는 질문 **추가하지 않음** — D16.2 "1 질문만" 계약 유지 (D18.6)
- `slaminar doctor` defaults.json 체크 detail 에 현재 tokenTier 표시
- dry-run / init 리포트에 **"Excluded by tier filter"** 미니 표 추가 — 어떤 도구가 어떤 이유로 제외됐는지 투명 공개

**의도적 범위 제한:**
- **설치 경로는 게이트하지 않음** (D18.7) — tier 필터는 *추천* 목록에만 작용. 사용자가 수동으로 `slaminar install <tool>` 하는 것은 tier 무관. 추천은 slaminar 의견이고 설치는 사용자 결정이라는 분리.
- **Tier policy 는 코드 상수 (override 미노출)** (D18.3) — `catalog.json tierPolicy` 필드는 설계만 해두고 노출은 v0.9.1+ 로 연기. 초기 릴리스는 단순 고정 정책.
- **설치된 high-cost 도구 자동 uninstall 제안 없음** — 사용자가 Conservative 로 바꿔도 기존 설치는 유지. D18.7 원칙의 연장.

### Changed

- `src/types/index.ts` — `TokenCost` / `TokenTier` 타입 신규, `CatalogTool.tokenCost?` / `CatalogTool.tokenCostRationale?` 선택 필드, `UserDefaults.defaults.tokenTier?` 선택 필드, `ExcludedTool` 인터페이스 분리 + `tier` / `cost` / `score` 필드 추가
- `src/recommender/recommender.ts` — `RecommendOptions.tokenTier` 추가, tier 필터를 overlap 해결 뒤·maxTools 앞에서 적용
- `src/setup/defaults.ts:builtInDefaults` — `tokenTier: 'smart'` 기본값 추가
- `src/setup/wizard.ts:stepDefaults` — select 질문 추가 + `SLAMINAR_DEFAULT_TOKEN_TIER` env var 처리
- `src/cli.ts` — `init` / `recommend` 커맨드에 `--token-tier` 옵션, `resolveTokenTier(cliValue)` 헬퍼
- `src/core/pipeline.ts:InitOptions` — `tokenTier?: TokenTier`
- `src/setup/doctor.ts:checkDefaults` — defaults.json detail 에 `tokenTier` 표기
- `src/reporter/terminal.ts:formatInitReport` — "Excluded by tier filter" 미니 표 추가

### Not Changed (deliberate)

- 기존 `--no-ai` 플래그·`aiMode` 필드 의미 그대로. Tier 와 직교 축.
- Claude Code passthrough (SKILL.md) 변경 없음 — tier 는 direct-CLI 경로의 추천 필터에만 영향.
- 카탈로그 `tokenCost` override 0 건 — 휴리스틱만으로 모든 56 개 도구가 합리적으로 분류됨 (스키마는 준비됐고, 실제 필요 시 후속 릴리스에서 추가).

### Stats

- 64 source modules (+2 신규: `token-cost.ts`, `tier-filter.ts`), 58 test files (+2 신규), **365 tests passing** (+18 for tier/cost coverage)
- Catalog 분포: low 9, medium 34, high 13 (override 0 건)
- CLI 28 commands + `--token-tier` 2 커맨드에 추가
- 설계 문서: `/Users/lanco/.claude/plans/harmonic-wishing-pumpkin.md` (승인된 플랜)

[0.9.0]: https://github.com/pathcosmos/slaminar/compare/v0.8.5...v0.9.0

## [0.8.5] — 2026-04-17

### Added — Catalog Ecosystem Expansion (local sources + presentation category + reference docs)

Four related improvements to slaminar's catalog subsystem, delivered as a single release. The unifying theme: slaminar's catalog was already federated (v0.8.0), but three concrete gaps limited how far users could go with it. This release closes all three, plus seeds a presentation-tools category on top of the official catalog.

**Local file catalog sources now actually work (`src/recommender/catalog-remote.ts`):**
- New `fetchLocalCatalog(uri)` reads a catalog from `file://` URIs, `~/` home-relative paths, `./` cwd-relative paths, and absolute paths. Same return shape as `fetchRemoteCatalog()` so callers stay transport-agnostic.
- New `fetchCatalogBySource(source, etag?)` dispatcher routes a `CatalogSource` to the right fetcher based on `source.type`: `file` → local, `url`/`official` → HTTP, `github` → shorthand expanded to `raw.githubusercontent.com` URL.
- `src/recommender/catalog-resolver.ts` now calls the dispatcher instead of `fetchRemoteCatalog` directly. Before this release, v0.8.0's `source.type === 'file'` branch was declared-only — actual `fetch('file://...')` hits failed since Node's native fetch requires experimental flags for the `file:` scheme.
- 4 new unit tests cover absolute paths, `file://` URIs, `~/` expansion, and schema-rejection (347 → 347 tests; the new tests replace nothing, the baseline expanded).

**Presentation category seeded in the bundled catalog (`catalog/catalog.json`):**
- 10 new tools added, all open-source and offline-reproducible (commercial AI APIs like Gamma/2Slides are intentionally excluded per slaminar's offline principle):
  - `python-pptx` — native Python OOXML generation (the core of the recommended stack)
  - `md2pptx`, `powerpointer` — Markdown → PPTX converters on top of python-pptx
  - `pymupdf`, `pdf2image` — PDF → image alternatives to pdftoppm
  - `playwright` — 2026-benchmark-winning Chrome Headless successor for HTML → PDF
  - `slidev`, `marp`, `reveal.js` — Markdown/HTML slide frameworks
  - `presenton` — self-hostable open-source AI deck generator (Gamma alternative)
- 6 new relations added to describe synergy (python-pptx ↔ md2pptx ↔ powerpointer), overlap (pymupdf ↔ pdf2image, slidev ↔ marp), and recommended winners where applicable (pymupdf over pdf2image for speed; powerpointer over md2pptx for richer content)
- Catalog version bumped `2.0.0` → `2.1.0`. Tools 46 → 56, relations 20 → 26.

**Tool reference documentation (`docs/catalog-tools-reference.md`, new):**
- Human-authored "what is this tool and when should I use it?" index covering every catalog category
- Presentation (10/10) fully detailed — each tool gets summary, usage scenarios, install command, prerequisites, example workflow, related tools, and notes on license/performance/adoption
- One representative tool per existing category as a starter (15 tools); remaining entries marked as TODO for v0.8.6+
- ~655 lines, Korean narrative to match the project's primary documentation language

**Custom catalog authoring guide (`docs/catalog-authoring-guide.md`, new):**
- Step-by-step reference for someone writing their first custom catalog JSON
- 10 sections: what catalogs are, 5-minute tutorial (minimal working catalog + local file registration), complete schema reference (root / `CatalogTool` / `CatalogSuggestion` / `ToolConflict` field tables), practical patterns (local file, team repo, security allowlist, `github:` shorthand), extend vs replace mode decision guide, validation commands, hosting option comparison, versioning and deprecation, troubleshooting, and references
- ~266 lines, fully grounded in `src/types/index.ts` (no invented fields), demonstrates v0.8.5's local file support in the tutorial

### Changed

- `src/recommender/catalog-remote.ts` — imports expanded to include `node:fs`, `node:os`, `node:path`; `CatalogSource` added to type imports for the dispatcher signature
- `src/recommender/catalog-resolver.ts` — one-line import + one-line call-site change to route through `fetchCatalogBySource`
- `package.json`, `src/version.ts` — `0.8.4` → `0.8.5`
- `catalog/catalog.json` — version `2.0.0` → `2.1.0`, `updatedAt` bumped, 10 new tools and 6 new relations appended

### Not Changed (deliberate)

- Existing `fetchRemoteCatalog()` signature unchanged — downstream code that calls it directly still works
- `CatalogSource` schema unchanged (v0.8.0 already modeled `type: 'file' | 'url' | 'github' | 'official'`)
- Core pipeline (`scan → analyze → recommend → generate → place → verify`): zero line changes
- Commercial AI presentation APIs (Gamma / 2Slides / Alai / Beautiful.ai / SlideSpeak / Indico Labs / Aspose.Slides) deliberately omitted from the bundled catalog — authoring guide documents how to add them to a user-maintained custom catalog instead

### Stats

- 62 source modules, 56 test files, **347 tests passing** (+4 for local fetch; baseline replaced, not expanded)
- Catalog: 56 tools (+10), 26 relations (+6), version 2.1.0
- 28 CLI commands (no change — `catalog source add` picks up local URIs automatically through the new dispatcher)
- Design spec: `/Users/lanco/.claude/plans/0-8-jiggly-ullman.md` (approved plan)

[0.8.5]: https://github.com/pathcosmos/slaminar/compare/v0.8.4...v0.8.5

## [0.8.4] — 2026-04-17

### Changed — Init-First Mini-Setup (Wave 2 of UX Reduction)

`slaminar init <path>` now handles first-run gracefully on its own. The passive nudge shipped in v0.8.3 ("Run `slaminar setup` once — continuing with local rules") is replaced by an **active one-question prompt** that lets the user pick an AI provider (or Skip) right there and then proceed with the same init they were already running. After this single question, `~/.config/slaminar/defaults.json` is written and every subsequent `slaminar init` stays silent.

**New behavior:**
- On first run (TTY + no `--no-ai` + no `defaults.json`), `init` prints one welcome line and one `select` prompt:
  - `Skip — local rules only (you can add AI later)` ← default
  - `Cloudflare Workers AI (free 10K/day · paste one token)`
  - `Anthropic Claude API (paid · paste one key)`
- Skip → init proceeds with local rules + `defaults.json` written → future runs silent.
- Cloudflare / Anthropic → the existing login wizard runs (browser open, token paste, account auto-detect, model auto-pick, connection verify, `auth.json` saved) → init proceeds with AI → `defaults.json` written.
- Cloudflare / Anthropic + auth failure → init **aborts with exit 1** and prints three concrete recovery paths: fix-and-retry, `--no-ai` fallback, or `setup --reconfigure auth`. Neither `defaults.json` nor `auth.json` is written, so the next attempt starts clean.

**New files:**
- `src/setup/inline-prompt.ts` — single export `runInlineAuthPrompt()` returning `{ choice, authSucceeded }`
- `tests/setup/inline-prompt.test.ts` — 5 unit tests covering Skip / Cloudflare / Anthropic / auth-failure / banner

**Modified files:**
- `src/auth/wizard.ts` — new export `runLoginWizardForProvider(provider)` that skips the provider-selection question (the mini-setup already asked). Reuses `setupCloudflare()` / `setupAnthropic()` unchanged.
- `src/cli.ts` — init action now routes through the mini-setup; the v0.8.3 passive nudge is removed.

**Backward compatibility — 100%:**
- `slaminar setup` (6-step wizard) untouched
- `slaminar setup --reconfigure <section>` untouched
- `slaminar init --no-ai <path>` → never triggers the prompt (flag already signals intent)
- Users with an existing `defaults.json` never see the new prompt
- CI and piped-stdin contexts (`process.stdin.isTTY === false`) skip the prompt
- Core pipeline (`scan → analyze → recommend → generate → place → verify`) has **zero line changes**

**Design context:**
- Spec: [`docs/superpowers/specs/2026-04-17-v0-8-4-init-first-design.md`](./docs/superpowers/specs/2026-04-17-v0-8-4-init-first-design.md)
- Decision IDs D16.1–D16.5 added to README Implementation History and Cross-Reference Index
- Forward compatibility: v0.9.0 `claude` CLI passthrough will slot in as a new top choice without touching this plumbing

### Stats

- 61 source modules, 56 test files, **343 tests passing** (+5 for inline-prompt)
- 28 CLI commands (no change — `init` just got smarter on first run)

[0.8.4]: https://github.com/pathcosmos/slaminar/compare/v0.8.3...v0.8.4

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
