# QA Phase Q2 — Functional E2E Report

> 작성일: 2026-04-17 · 릴리스 대상: v0.9.1 · 기준 fix 사이클: Phase Q1 식별 P0 4 건

## 1. Scope & Approach

Phase Q1 의 현황 조사에서 식별한 **CLI integration 테스트 부재** (G1) 를 해소하기 위해, v0.9.x QA 사이클 동안 반복 실행 가능한 E2E 테스트 인프라를 구축.

**구현 결정**:
- **실제 CLI 호출**: `dist/cli.js` 를 `execFile` 로 실행 (in-process mocking 배제) → 배포된 바이너리와 같은 경로 검증
- **격리**: 모든 테스트는 `os.tmpdir()/slaminar-e2e-<uuid>/` 에서 실행, `afterEach` cleanup
- **HOME 격리**: helper 가 기본적으로 `HOME` 을 테스트 tmp 디렉토리로 세팅 → 사용자의 실제 `~/.config/slaminar/` 에 접근 X
- **AI off**: `SLAMINAR_AI_PROVIDER=local` 강제로 결정적 실행, HTTP 호출 0
- **Fixture 동적 생성**: small (20 files node/TS) · medium (500 files python mono) · large (5000 files polyglot) 를 helper 가 런타임에 생성 — 5000 파일 트리를 git 에 커밋할 필요 없음

**실행 명령**:
```
npm run test:e2e    # build + E2E only
npm run test:all    # unit + E2E
```

`vitest.config.ts` 가 `E2E=1` env 로 분기 — 기본 `npm test` 는 E2E 제외해 속도 유지.

## 2. Deliverables

### 2.1 인프라

| 파일 | 역할 |
|---|---|
| `tests/e2e/_helpers.ts` | `runCli` / `makeTmpDir` / `cleanup` / `createFixture('small'/'medium'/'large')` / `initGit` |
| `vitest.config.ts` | `E2E=1` 기반 include/exclude 분기, testTimeout 30s for E2E |
| `package.json` scripts | `test:e2e`, `test:all` 추가 |

### 2.2 E2E 테스트 파일 (16 개, 60 tests)

| 파일 | 테스트 | 커버 커맨드 |
|---|---|---|
| `init.test.ts` | 4 | `init` (+ `--dry-run`, `--token-tier` 3 tier) |
| `rollback.test.ts` | 4 | `init` + `uninstall` round trip, **P0-1 / P0-2 / P0-3 회귀** |
| `scan.test.ts` | 3 | `scan` (JSON 출력, 존재하지 않는 path, 빈 dir) |
| `analyze.test.ts` | 3 | `analyze` (TS / Python / 빈 dir) |
| `recommend.test.ts` | 3 | `recommend` (JSON 출력, tier 비교, invalid tier) |
| `status.test.ts` | 2 | `status` (init 후 / 미 init) |
| `update.test.ts` | 2 | `update` (init 후 markers 유지 / 빈 dir) |
| `check.test.ts` | 3 | `check` (exit 0/2, `--json` 파싱) |
| `remove.test.ts` | 1 | `remove <tool>` (config.json mutation) |
| `setup.test.ts` | 4 | `setup --yes` (defaults / tokenTier / invalid tier / `--reconfigure`) |
| `doctor.test.ts` | 3 | `doctor` (fresh / post-setup / `--json`) |
| `discover.test.ts` | 3 | `discover` (2 sub-projects / 빈 root / `--json`) |
| `skill.test.ts` | 6 | `skill install/uninstall/status` + 멱등성 + **P0-5 회귀** (rmSync EISDIR) |
| `catalog-read.test.ts` | 7 | `catalog list/search/check/info/status` |
| `catalog-write.test.ts` | 5 | `catalog config/rollback/update` (network-lenient) |
| `catalog-source.test.ts` | 7 | `catalog source add/list/enable/disable/remove/test` + 잘못된 `--mode`/`--scope`/`--trust` |

**총 60 E2E tests / 425 (unit 365 + E2E 60)**

## 3. P0 Fixes (v0.9.1)

Phase Q1 에서 확정한 4 건의 P0 이슈 모두 fix + E2E 회귀 테스트 붙임.

### P0-1 — `writeManifest` 원자성
- **변경**: `src/placer/backup.ts` — tmp-then-rename 패턴. `renameSync` 는 POSIX 에서 같은 디렉토리 내 atomic.
- **회귀 테스트**: `rollback.test.ts:P0-1` — manifest JSON 유효성 + 누수된 `.tmp-*` 파일 없음 확인
- **영향**: 크래시 시 `readManifest` 가 `[]` 반환해 백업 기록 전체 유실되던 risk 제거

### P0-2 — `restoreFile` return 값 존중
- **변경**:
  - `src/types/index.ts` — `UninstallResult.missingBackups: string[]` 필드 추가
  - `src/rollback/uninstaller.ts` — return `false` 시 `missingBackups` 기록, `restoredFiles` 에는 넣지 않음
  - `src/core/pipeline.ts` — init rollback 경로에서 복원 실패한 파일명을 error 메시지에 포함
  - `src/cli.ts` — uninstall 출력에 "Warning: backup blob missing" 섹션 추가
- **회귀 테스트**: `rollback.test.ts:P0-2` — 백업 blob 수동 삭제 후 uninstall 실행 → 경고 출력 확인
- **영향**: silent data loss 제거, 사용자에게 수동 복구 필요성 알림

### P0-3 — `preAction` hook 예외 보호
- **변경**: `src/cli.ts` — `maybePrintUpdateNotice` 호출을 try/catch 로 래핑
- **회귀 테스트**: `rollback.test.ts:P0-3` — `SLAMINAR_VERSION_CHECK=true` 강제 상태에서도 `--version` 정상 동작
- **영향**: update-check 의 미래 버그 (bad fetch/parse) 가 모든 커맨드를 크래시시키는 risk 제거

### P0-5 — `skill uninstall` 실패 시 exit=1
- **변경**:
  - `src/types/index.ts` — `SkillUninstallResult.status: 'removed' | 'not-installed' | 'failed'`
  - `src/skill/installer.ts` — 세 경로 각각 `status` 세팅
  - `src/cli.ts` — `failed` 시 `process.exitCode = 1`
- **회귀 테스트**: `skill.test.ts` — SKILL.md 경로에 non-empty 디렉토리 배치 → `rmSync` EISDIR → exit 1 확인
- **영향**: CI 에서 skill 제거 실패를 감지 가능 (이전엔 exit 0 으로 위장됨)

## 4. 발견된 P1+ 이슈 (티켓화, v0.9.2+)

Phase Q2 실행 중 추가 확인된 관찰. 모두 이번 릴리스 범위 밖:

| # | 관찰 | 권장 타이밍 |
|---|---|---|
| Obs-1 | `catalog source test <uri>` 가 `fetchRemoteCatalog` 직접 호출 (file://·github: 미지원) — v0.8.5 dispatcher 와 불일치 | v0.9.2 — Phase Q3 일환 |
| Obs-2 | discover 테이블이 `$HOME` 기준 `~/...` 축약을 비타협적으로 수행 → tmp path 매칭에 혼란 | v0.9.2 — 디스플레이 일관화 |
| Obs-3 | `catalog update` 실제 네트워크 라운드 트립 테스트 없음 (MSW 미도입) | v0.9.2 — F1 매트릭스와 함께 |
| Obs-4 | `catalog rollback` 에 이전 백업이 없을 때의 exit code 가 lenient (구현에 따라 0/1 둘 다 가능) | v0.9.2 — 계약 문서화 필요 |
| Obs-5 | `status` 의 0/1/2 exit code 계약이 README 에 미 문서화 | v0.9.1 문서화 가능 |

## 5. 회귀 방지 계약

v0.9.1 이후, 다음 4 항목이 CI 게이트:
1. `npm test` (365 unit tests) — 기존 계약
2. `npm run test:e2e` (60 E2E tests) — 신규 계약
3. `prepublishOnly` = `npm run build && npm test` — unit only (E2E 는 publish 블로커로는 무겁다고 판단, 개발자 재량)
4. README 에 공개된 테스트 수치 (365 → 425) 동기화

## 6. Baseline 수치 (참고)

현재 사양으로 측정한 wall-time (로컬 macOS):

| 작업 | 시간 |
|---|---|
| Unit 전체 | ~1.2s |
| E2E 전체 | ~3.0s |
| Build (`tsc`) | ~2.0s |
| `test:all` 총합 | ~6.5s |

정식 baseline 은 Phase Q5 에서 fixture × tier 매트릭스로 재측정 예정.

## 7. 다음 스텝

1. **v0.9.1 릴리스**: 버전 bump, CHANGELOG, README Phase 19 섹션, D19.x cross-refs
2. **Phase Q3 시작** (v0.9.2): fault-injection 매트릭스 — Obs-3, Obs-4 는 여기서 커버
3. **Phase Q4** (v0.9.3): rollback R1–R10 + concurrency (P1-1)
