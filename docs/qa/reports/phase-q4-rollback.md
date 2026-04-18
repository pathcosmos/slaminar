# QA Phase Q4 — Rollback Integrity Report

> 작성일: 2026-04-18 · 릴리스 대상: v0.9.3 · 기준: v0.9.2 (472 tests)

## 1. Scope & Approach

Phase Q3 에서 F6 concurrency 를 **재현·문서화만** 했으니, Q4 는 그 구조적 결함 — 같은 프로젝트에 두 slaminar 프로세스가 동시에 쓰기를 시도하면 manifest race 로 백업 기록이 유실될 수 있음 — 을 **실제로 제거**한다. 아울러 R1–R10 rollback 매트릭스를 자동화 테스트로 고정하고, Obs-Q3-2 (corrupt team-config silent fallback) 을 fix.

## 2. Deliverables

### 2.1 File lock 도입

`src/locking/file-lock.ts` (신규):
- `acquireProjectLock(root, opts)` → `ProjectLockHandle { release }`
- `withProjectLock(root, fn)` — async wrapper
- `withProjectLockSync(root, fn)` — sync wrapper (uninstall 용)
- `ProjectBusyError` 클래스 — 다른 프로세스가 hold 중일 때 던져짐

**구현**: `proper-lockfile@4.1.2` wrapping. stale=30s 로 정의해 crash 된 프로세스의 orphan lock 이 30 초 이상 된 경우 자동 reclaim. Lock 파일 위치: `<root>/.slaminar/lockfile.lock`.

**적용 커맨드**:
- `init` (dry-run 제외): `src/core/pipeline.ts:init()` 전체를 `withProjectLock` 으로 감쌈
- `update` (dry-run 제외): `src/core/updater.ts:update()` 동일
- `uninstall`: `src/rollback/uninstaller.ts:uninstall()` 을 `withProjectLockSync` 로 감쌈

**비적용 커맨드**: `scan`, `analyze`, `recommend`, `status`, `check`, `doctor`, `discover`, `catalog *`, `skill *` — 모두 read-only 이거나 프로젝트 scope 밖 (HOME 기반).

### 2.2 Obs-Q3-2 fix — corrupt team-config 감지

- `src/team/config.ts` — 신규 `loadTeamConfigWithStatus(root): { config, status: 'ok'|'missing'|'corrupt' }`
- `src/core/updater.ts` — `UpdateResult.teamConfigCorrupt?: boolean` 필드
- `src/cli.ts` — update 커맨드가 `teamConfigCorrupt` 면 노란색 경고 + `setup --reconfigure catalog` 안내

이전 동작: corrupt `.slaminar/config.json` → 조용히 default fallback → 다음 save 에서 approvedTools / catalogUrl / catalogMode 유실. 이제 사용자에게 즉시 알림.

### 2.3 R1–R10 매핑 (자동화 범위)

| Plan R# | 매트릭스 원안 | 자동화 위치 | 상태 |
|---|---|---|---|
| R1 | 정상 init → uninstall | `tests/e2e/rollback.test.ts:R1` | **자동화** (v0.9.1) |
| R2 | writeTargets SIGKILL | `tests/e2e/rollback.test.ts:P0-1` (manifest atomicity) | **자동화** (v0.9.1) |
| R3 | update 중 marker 꼬임 | `tests/e2e/rollback.test.ts:R3` | **자동화 신규** (Q4) |
| R4 | 중첩 init — manifest 누적 | 원안은 "둘 다 성공 후 manifest 에 양쪽 기록" — lock 으로 방향 전환: F6.a 에서 "하나 실패 with ProjectBusyError" | **대체** — `concurrency.test.ts:F6.a` |
| R5 | uninstall 시 대상 파일 이미 삭제 | `tests/e2e/rollback.test.ts:R5` | **자동화 신규** (Q4) |
| R6 | manifest 손상 상태 uninstall | `tests/fault-injection/version.test.ts:F8.c` + `corrupt.test.ts:F3.c` | **자동화** (v0.9.2 P0-9) |
| R7 | `remove <tool>` | `tests/e2e/remove.test.ts` | **자동화** (v0.9.1) |
| R8 | 동시 init race | **대체** — F6.a 와 동일 (lock 으로 자연스럽게 해결) | **커버됨** |
| R9 | `.slaminar/.bk/` 디스크 소진 | `tests/fault-injection/fs.test.ts:F2.c` (it.skip — ENOSPC 시뮬 불가) | **skip** (Q3 에서 동일 결론) |
| R10 | symlink 백업/복원 | `tests/e2e/rollback.test.ts:R10` | **자동화 신규** (Q4) |

## 3. F6 Concurrency tests — lock 검증

`tests/fault-injection/concurrency.test.ts` 의 3 tests 가 lock 적용 후 새 기대치로 업데이트됨:

- **F6.a**: 두 `init` 병렬 → 정확히 하나 exit 0, 하나 exit 1 + "ProjectBusyError" / "holding the project lock" stderr. `.lock` 파일이 **프로세스 종료 후 해제**됨 (no orphan).
- **F6.b**: `update` + `uninstall` 병렬 → 직렬화. 둘 다 0 일 수도 하나 busy 일 수도 (타이밍 의존); 중요한 것은 crash/stack trace 없음 + orphan lock 없음.
- **F6.d**: 공유 HOME 의 setup × 2 — **lock 비적용** 경로. last-write-wins 로 `defaults.json` 이 두 tier 값 중 하나로 수렴, corruption 없음. 의도된 동작 (setup 은 프로젝트 lock scope 밖).

## 4. P0 이 이번 Phase 에서 surface 됐는가?

**이번 Phase 는 fix 위주** — Q3 에서 발견한 P1-1 (F6 concurrency) + Obs-Q3-2 (corrupt team-config) 를 직접 해결. 신규 P0 surface 는 없음.

쓰기 경로 lock 도입은 다음 계열의 잠재 데이터 손실을 제거:
- parallel init 에서 manifest 덮어쓰기 → 두 세션 중 하나의 백업 기록 유실
- init + uninstall race → uninstall 이 stale manifest 로 일부 파일 복원 skip
- catalog update 병렬 → cache 교차 (향후 catalog update 에도 lock 적용 검토; 현재는 write path 핵심만 커버)

## 5. 남은 관찰 (P2, 미래 티켓)

| # | 관찰 | 메모 |
|---|---|---|
| Obs-Q4-1 | `catalog update` 는 project-scope lock 에 포함 안 됨 (HOME 기반 cache 를 씀) | HOME-scope 별도 lock 필요 시 검토. 현재는 단일 cache 파일 writeFileSync 원자성에 의존 |
| Obs-Q4-2 | Lock timeout 30s 하드코딩 (proper-lockfile `stale` 옵션) | 장기 실행 init (큰 AI 호출) 에서 false positive 가능성 낮지만 유의 |
| Obs-Q4-3 | `.slaminar/lockfile.lock` 은 gitignore 에 없음 | 실수로 commit 될 일 없지만 `.slaminar/.gitignore` 에 한 줄 추가 권장 |

**Obs-Q4-3 은 작은 fix 로 같은 사이클에 포함 가능** — `.slaminar/.gitignore` 에 `lockfile.lock` 추가.

## 6. Test 집계 (v0.9.3 기준)

| 분류 | 파일 | 테스트 | 통과 |
|---|---|---|---|
| Unit | 58 | 365 | 365 |
| E2E | 16 | 63 (+3 from Q4) | 63 |
| Fault-injection | 7 | 47 (+1 skip) | 46 |
| **합계** | **81** | **475** (+3 from v0.9.2) | **474 / 1 skip** |

## 7. 다음 스텝

1. v0.9.3 릴리스 commit
2. **Phase Q5** (v0.9.4): 성능 벤치마크 — hyperfine + vitest bench. fixture × tokenTier 매트릭스 (9 조합), Phase 별 wall-time, Top 3 병목 식별
3. **Phase Q6** (v0.9.5): 최종 QA 보고서 + P0/P1/P2 status roll-up
