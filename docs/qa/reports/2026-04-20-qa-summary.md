# QA v0.9.x Final Summary

> 작성일: 2026-04-20 · 릴리스 대상: v0.9.5 (최종) · 시작: v0.9.0 (기준 365 tests)

slaminar v0.9.x 전체 QA 사이클 (Q1–Q5) 의 종합 roll-up. 이 문서는 향후 QA 반복 주기·새 기능 도입 시 참조되는 **기준선 스냅샷**.

## 1. 전체 흐름 한눈에

| Phase | 릴리스 | 핵심 결과 | 신규 tests | 신규 소스 모듈 |
|---|---|---|---|---|
| Q1 | v0.9.1 | 현황 조사 · 4 P0 식별 | 0 | 0 |
| Q2 | v0.9.1 | E2E 인프라 (28 커맨드) · 4 P0 fix | +60 | +1 (`_helpers.ts`) |
| Q3 | v0.9.2 | Fault-injection 매트릭스 (F1–F8) · 5 P0 fix | +47 / 1 skip | +7 test files |
| Q4 | v0.9.3 | Rollback 무결성 + file-lock (P1-1 해소) | +3 (R3/R5/R10) | +1 (`file-lock.ts`) |
| Q5 | v0.9.4 | Performance baseline (regression gate) | +0 (bench 별도 infra) | +2 scripts + 1 bench file |

## 2. 테스트 성장 curve

```
 test count
 475 ┤                                        ●───●  (Q5, Q6)
 472 ┤                            ●               
 425 ┤                ●                           
 365 ┤─────●──●                                  
       v0.8.5 v0.9.0 v0.9.1 v0.9.2 v0.9.3 v0.9.4 v0.9.5
              (+18)   (+60)   (+47)   (+3)    (+0)   (+0)
              tokentier  E2E   fault rollback  bench  docs
```

- v0.8.5 → v0.9.5: **347 → 475 tests (+128, +37%)**
- 레이어별: unit 365 (유지) / E2E 63 / fault-injection 47 / bench 별도
- Skip 1개 (F2.c ENOSPC — 포터블 시뮬 불가, D20.7 로 고정)

## 3. P0 roll-up (10 건 식별 → 10 건 fix)

| # | 이슈 | 발견 Phase | fix 릴리스 | 위치 |
|---|---|---|---|---|
| P0-1 | `writeManifest` 비원자 → truncated JSON, manifest 유실 | Q1 | v0.9.1 | `src/placer/backup.ts:writeManifest` |
| P0-2 | `restoreFile` return 무시 → silent data loss on uninstall | Q1 | v0.9.1 | `src/rollback/uninstaller.ts`, `src/core/pipeline.ts`, `src/cli.ts` |
| P0-3 | `preAction` hook 미보호 → update-check 버그 전파 | Q1 | v0.9.1 | `src/cli.ts:preAction` |
| P0-5 | `skill uninstall` 실패 시 exit=0 | Q1 | v0.9.1 | `src/skill/installer.ts`, `src/cli.ts` |
| P0-6 | `fileCountCap` 음수 허용 (--yes env 경로) | Q3 | v0.9.2 | `src/setup/wizard.ts:318-322` |
| P0-7 | `--catalog-mode` validation 누락 4 곳 | Q3 | v0.9.2 | `src/cli.ts:validateCatalogMode` (init/recommend/discover/catalog update) |
| P0-8 | `minSlaminarVersion` 무시 | Q3 | v0.9.2 | `src/recommender/catalog-remote.ts`, `catalog-resolver.ts` |
| P0-9 | Corrupt manifest silent "complete" uninstall | Q3 | v0.9.2 | `src/placer/backup.ts:readManifestWithStatus`, `src/rollback/uninstaller.ts` |
| P0-10 | `writeTargets` 부분 실패 silent swallow | Q3 | v0.9.2 | `src/placer/writer.ts` |
| (P0-4) | *(reserved — P0-7 이 원래 P0-4 였다가 번호 재편성; catalog-mode 4-site validation 으로 흡수됨)* | — | — | — |

> 숫자 **9 건 실제 fix**. P0-4 는 설계 중 P0-7 에 병합되어 skip.

## 4. P1 roll-up (처리 2 건 · 남은 0 건)

| # | 이슈 | 발견 | 처리 | 위치 |
|---|---|---|---|---|
| P1-1 | F6 concurrency (parallel init/update/uninstall race) | Q3 | v0.9.3 | `src/locking/file-lock.ts`, `proper-lockfile@4.1.2` |
| Obs-Q3-2 | Corrupt `.slaminar/config.json` silent default fallback | Q3 | v0.9.3 | `src/team/config.ts:loadTeamConfigWithStatus`, `src/core/updater.ts`, `src/cli.ts` |

**결과**: v0.9.3 시점에 P1 큐 소진. Q4 종료 시 남은 P1 0 건.

## 5. P2 / 관찰 (티켓, 10 건) — 향후 고려

| # | 관찰 | 출처 | 우선순위 근거 |
|---|---|---|---|
| Obs-Q3-1 | update-check 가 corrupt defaults.json 을 silent 하게 "치유" | Q3 | P2 — 기능 문제 없음, 파일이 조용히 덮어쓰임 |
| Obs-Q3-3 | Scanner 가 symlink loop 를 조용히 skip | Q3 | P2 — 관찰성 개선 |
| Obs-Q3-4 | Catalog fetch 실패 메시지에 HTTP status 미포함 | Q3 | P2 — 진단성 |
| Obs-Q3-5 | Catalog fetch timeout 10 초 하드코딩 | Q3 | P2 — env 노출 후보 |
| Obs-Q3-6 | AI provider 429 에 재시도 없음 | Q3 | 의도된 동작 (문서화만) |
| Obs-Q4-1 | `catalog update` 는 project-lock 범위 밖 (HOME-scope cache) | Q4 | P2 — 다중 프로세스 cache 경합 드뭄 |
| Obs-Q4-2 | Lock stale timeout 30s 하드코딩 | Q4 | P2 — long-running init 에서 false positive 가능 낮음 |
| Perf-#1 | Node.js startup ~85% of CLI wall-time | Q5 | P2 — 사용자 체감 100ms 범위, 쾌적 |
| Perf-#2 | `scan` file-tree 선형 3µs/file | Q5 | P2 — 10K+ 파일 프로젝트 유즈 케이스 필요 시 |
| Perf-#3 | `recommend` cold catalog load +500µs | Q5 | P3 — 현재 CLI 모델에 memoize 효과 0 |

모두 **개선 가능하나 긴급하지 않음**. v0.10+ 릴리스 계획에서 개별 티켓화 권장.

## 6. 주요 QA 의사결정 로그 (D19.x–D22.x)

v0.9.x 동안 확정된 **28 개 Design Decision** (README Phase 19–22 섹션 + Cross-Reference Index 의 D19.x–D22.x 행).

원칙 요약:
- **증거가 같은 릴리스에** — 버그 재현 테스트 + fix 를 같은 commit (D19.8 / D20.2)
- **하이브리드 기본값 + 명시 override** — `resolveTokenCost`, `resolveTokenTier`, `resolveCatalogMode`, `readManifestWithStatus` 모두 "휴리스틱/기본값이 있고 override 가능" 패턴
- **Warning + fallback 이 fatal 보다 낫다** — D19.5 / D20.4 / D21.8 모두 "통보는 크게, 작동은 계속"
- **기존 API 를 확장하지 말고 신규 함수** — D20.3, D21.5
- **의존성은 최소로** — Q5 에서 hyperfine 대신 자체 runner (D22.1)

## 7. QA 인프라 최종 상태

### 실행 방법

| 명령 | 목적 | 소요 |
|---|---|---|
| `npm test` | Unit tests (365) | ~1s |
| `npm run test:e2e` | Build + E2E + fault-injection (107 / 1 skip) | ~12s |
| `npm run test:all` | 위 둘 | ~13s |
| `npm run bench:cli` | CLI wall-time × 72 runs | ~3 분 |
| `npm run bench:lib` | Per-phase (scan/analyze/recommend) | ~2s |
| `npm run bench` | 둘 다 | ~3 분 |

### 파일 위치 요약

```
docs/qa/
├── current-state.md             # Q1 스냅샷
├── fault-matrix.md              # Q3 F1–F8 매트릭스 명세
└── reports/
    ├── phase-q2-functional.md   # Q2
    ├── phase-q3-exceptions.md   # Q3
    ├── phase-q4-rollback.md     # Q4
    ├── phase-q5-performance.md  # Q5
    └── 2026-04-20-qa-summary.md # Q6 (이 문서)

docs/benchmarks/
├── 2026-04-20-baseline.md       # 정식 baseline
└── raw/                          # 자동 생성 (날짜별)

tests/
├── e2e/                          # 16 files, 63 tests
├── fault-injection/              # 7 files, 47 tests / 1 skip
└── bench/                        # 1 file (vitest bench scaffold)

scripts/
├── bench-cli.mjs
└── bench-lib.mjs
```

## 8. 향후 QA 반복 주기 (권고)

| 주기 | 작업 | 산출물 |
|---|---|---|
| **매 PR / 매 commit** | `npm run test:all` — 기존 475 tests 유지. CI 게이트. | 성공/실패 (CI log) |
| **매 minor 릴리스 (v0.X.0)** | Q1 현황 재스캔 (60–90 분): `src/cli.ts` try/catch 재열거, `src/rollback/*` 흐름 재매핑, 새 커맨드가 생겼다면 E2E 추가 | `docs/qa/current-state.md` 갱신 diff |
| **매 release candidate** | `npm run bench` → `raw/` 비교, baseline 대비 ±10% 확인. 유의미한 변동 시 원인 기록 | `docs/benchmarks/raw/<date>.{json,md}` commit |
| **분기 (3 개월)** | Q3 fault matrix 재실행: 새로 생긴 실패 모드 (새 커맨드, 새 외부 API 의존) 를 매트릭스에 추가 | `docs/qa/fault-matrix.md` diff + 새 tests |
| **연 1회** | Q4 rollback 전수 재점검: R1–R10 모든 케이스를 새 fixture 에서 실행. Concurrency lock 동작 재검증. | `phase-q4-followup-<year>.md` |

**CI 권장**: `test:all` + `bench:lib` 를 PR-gate 로. `bench:cli` 는 cron 야간 job (길어서 PR 에 부담).

## 9. 향후 기능 도입 가이드

새 CLI 커맨드나 파이프라인 단계를 추가할 때:

1. **E2E 추가 (Q2 패턴)**: `tests/e2e/<command>.test.ts` — 최소 happy path + dry-run + 에러 1 가지
2. **Fault 매트릭스 확장 (Q3 패턴)**: `docs/qa/fault-matrix.md` 에 새 커맨드 열 추가 + 관련 F1–F8 셀 명세
3. **Rollback 고려 (Q4 패턴)**: 쓰기 경로면 `withProjectLock` (async) 또는 `withProjectLockSync` 로 감싸기. Backup 생성하면 `readManifestWithStatus` 로 integrity 체크
4. **Benchmark 확장 (Q5 패턴)**: 중요 phase 면 `scripts/bench-lib.mjs` 에 새 measure 추가 → 다음 baseline 에 반영
5. **문서화**: README Phase 섹션 + CHANGELOG 엔트리 + D-번호 결정 행

## 10. 회고 (무엇이 잘 됐고 무엇을 개선할지)

**잘 된 것:**
- **"버그 + fix + 회귀 테스트" 한 커밋 원칙** (D19.8 / D20.2) — git log 와 CHANGELOG 가 자체 문서화됨. 미래 유지보수자가 "왜" 를 즉시 파악.
- **Sub-agent 병렬 분배** — Q2 (28 커맨드), Q3 (F1–F8) 모두 3개 agent 병렬 실행으로 실질 속도 3×.
- **의존성 최소화** — mock-fs 미도입 (D20.1), hyperfine 미요구 (D22.1). `proper-lockfile` 만 prod dep 추가.
- **매트릭스 주도 QA** — F1–F8 × 커맨드 sparse matrix 가 커버리지 갭을 구조적으로 드러냄.

**개선할 것:**
- **vitest bench integration 미숙** — Q5 에서 `describe.each + bench` 가 summary 에 NaNx 를 만드는 버그. 다음 Q 사이클에서 vitest 4.x 안정판 나오면 재검토.
- **Concurrency 테스트의 비결정성** — F6.a 는 현재 "exactly-one-wins" 를 assert 하지만 CI 머신에 따라 timing 이 다를 수 있음. 반복 실행 (repeat: 10) 으로 안정성 높이는 것 고려.
- **ENOSPC 시뮬레이션 여전히 skip** — OS 레벨 quota mount 를 CI 에 도입하면 커버 가능. 비용 높아 연기.
- **Performance regression 자동 gate 미구현** — 현재는 manual diff. CI 에 `bench:lib` 결과를 `docs/benchmarks/2026-04-20-baseline.md` 와 비교하는 스크립트 추가 필요.

## 11. 마무리

slaminar v0.9.x 는 **기능 추가 (v0.9.0 tokenTier) 한 번 + 5 번의 QA 릴리스 (v0.9.1–5)** 로 구성됨. 이 패턴 — feature 한 번 → QA 집중 사이클 → 다음 feature — 이 v0.10+ 에서도 반복되도록 권장.

다음 major 작업 후보 (이번 사이클 범위 밖):
- Phase 17 의 catalog federation 을 user-facing UI 로 노출 (`slaminar catalog source wizard` 등)
- Node startup 최적화 (esbuild bundle / bun compile) — Perf-#1 해소 시 CLI wall-time 을 ~30ms 로 줄일 수 있음
- `discover` batch apply 를 in-process 로 전환 — Perf-#3 memoize 효과 실현

이 보고서는 v0.9.5 에 commit 되며, 이후 QA 사이클은 **이 baseline 을 출발점으로** 작동.
