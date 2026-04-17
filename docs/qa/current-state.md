# slaminar v0.9.0 — QA Phase Q1 Current-State Report

> 작성일: 2026-04-17 · 기준 버전: v0.9.0 (365 tests passing) · 작성: Phase Q1 현황 조사 (3 Explore sub-agent 병렬 실행)

이 문서는 v0.9.x QA 사이클의 **진단 스냅샷**이다. Phase Q2 부터 Q4 의 테스트 설계와 v0.9.1+ 에 반영할 P0 fix 목록의 근거가 된다.

---

## 1. Rollback · Backup · Manifest 데이터 흐름

### 1.1 핵심 함수 맵 (`src/placer/backup.ts`)

| 함수 | 라인 | 역할 | 에러 모드 |
|---|---|---|---|
| `backupFile(root, rel)` | 13–33 | 원본 → `.slaminar/.bk/{hex6}_{ts}.dat` 복사, `BackupRecord` 반환 | 원본 없음 throw / 디스크 에러 propagate |
| `restoreFile(root, rec)` | 35–46 | 백업 → 원본 위치 복사 | **백업 없으면 `false` 반환** (조용히 실패) |
| `readManifest(root)` | 48–62 | `.slaminar/.bk/manifest.json` 읽기 | 파일 없음/손상 시 `[]` 반환 (조용히) |
| `writeManifest(root, records)` | 64–68 | 직접 `writeFileSync` | **비원자** — 크래시 시 truncated JSON |

### 1.2 백업 파일 네이밍

```ts
// src/placer/backup.ts:21–23
const hex = randomBytes(3).toString('hex');     // 6 자, 16.7M 경우의 수
const timestamp = Math.floor(Date.now() / 1000); // 1 초 해상도
// → hex_ts.dat
```

**충돌 저항**: 초 단위로 같은 해시 충돌 확률 ≈ 1/2^24 per pair. 동일 초에 다수 백업 발생 시 현실적 위험.

### 1.3 Manifest 스키마 (`src/types/index.ts:238–242`)

```ts
interface BackupRecord {
  originalPath: string;
  backupPath: string;
  timestamp: number; // unix seconds — 체크섬 없음
}
```

- 체크섬 필드 없음 → 백업 무결성 검증 불가
- 스키마 버전 필드 없음 → 포맷 breaking change 시 silent parse
- 단순 배열 → 헤더/메타데이터 없음

### 1.4 `init` 의 Rollback 경로 (`src/core/pipeline.ts:85–183`)

```
1. analyze / AI enhance (non-critical)
2. ensureGitignore
3. loadTeamConfig → approvedTools
4. backup phase (line 129–147):
   for each merge target:
     sessionBackups.push(backupFile())
     existingManifest.push(record)
   if (backups.length > 0) writeManifest()  ← line 146
5. write phase (try/catch, line 152–164):
   writeTargets()
   ON FAIL: for record in sessionBackups: restoreFile(record)
            ← return value 미확인 (A4)
6. verify / report (non-critical)
```

**Crash points**:
- **L146 직후 크래시**: manifest 에 기록됨, 파일은 아직 쓰이지 않음 → manifest 는 consistent
- **L155 writeTargets 중 크래시**: 부분 쓰기 + `sessionBackups` 만 복원 시도 → manifest 는 모든 백업 기록을 유지하지만 일부 파일은 손대지 않음
- **L146 쓰기 중 크래시 (A1)**: manifest.json 자체가 truncated → `readManifest` 가 `[]` 반환 → 모든 백업 기록 손실

### 1.5 `uninstall` 경로 (`src/rollback/uninstaller.ts:12–41`)

```
1. readManifest (L20)
2. for each record IN INSERTION ORDER (not reverse-chronological):
     restoreFile(record)  ← return 값 무시 (A3)
     restoredFiles.push(originalPath)
3. rmSync(.claude/plugins/slaminar-generated, { force: true })
4. rmSync(.slaminar, { recursive: true, force: true })
```

**Edge cases**:
- **백업 파일이 없을 때**: `restoreFile` false 반환 → 사용자에게는 복원 성공 보고 (A3)
- **사용자가 post-init 에 파일 수정**: `copyFileSync` 가 조용히 덮어씀 (충돌 감지 없음)
- **Step 3 중 크래시**: 일부 백업 복원 + `.claude/plugins` 일부 삭제 + `.slaminar` 남음

### 1.6 Markers 와 Rollback 상호작용 (`src/placer/markers.ts`)

- Regex: `/<!-- slaminar:begin:([\w-]+) -->([\s\S]*?)<!-- slaminar:end:\1 -->/g`
- `update()` 가 merge 모드일 때 **전체 파일을 백업**, marker 섹션만 교체
- Marker 가 손상되면 regex 매칭 실패 → 섹션을 **끝에 append** (중복 생성)

### 1.7 Concurrency — **전무**

- Lock file 없음 (`.slaminar/.lock` 같은 게 없음)
- `flock(2)` 호출 없음
- 동시 `slaminar init` 두 번 실행 시 manifest race → 백업 기록 덮어쓰기

---

## 2. CLI 예외 처리 현황

### 2.1 Global (`src/cli.ts`)

- `program.hook('preAction', …)` 가 try/catch **없음** — `maybePrintUpdateNotice()` 가 throw 하면 모든 커맨드 크래시 (완화: `update-check.ts:119–124` 에서 내부 catch)
- `program.exitOverride()` 미사용 → commander 기본 행동
- `process.on('uncaughtException')` / `unhandledRejection` 핸들러 없음

### 2.2 28 커맨드 try/catch 분포 (전수 조사)

**모두** try/catch 보유. 그러나:

| 부분 상태 위험 | 커맨드 |
|---|---|
| **높음** | `init`, `update`, `uninstall`, `setup`, `catalog update` |
| **중간** | `status`, `catalog rollback`, `catalog config`, `catalog source add`, `skill install`, `skill uninstall` |
| **없음 (read-only)** | `scan`, `analyze`, `recommend`, `check`, `doctor`, `catalog list/search/check/info/status`, `catalog source list/test`, `skill status` |

### 2.3 Exit code 계약

- **정식 0/1/2 계약**: `status` (283), `check` (391), `doctor` (450)
- **1 on error**: 대부분
- **항상 0** (에러여도): `catalog source enable/disable` (930, 947), `skill uninstall` (1013–1016) ← 버그
- **0/1**: `discover` (failed.length > 0)

계약 자체가 일관되지 않고 README 에 공식화돼 있지 않음.

---

## 3. 기존 365 테스트의 F1–F8 커버리지 갭

### 3.1 강함 (순위 1–3)

- **F3 corrupt files**: `defaults.json`, `auth.json`, catalog cache, `plugin.json` 모두 손상 → fallback 검증 완료
- **F4 bad input**: 존재 않는 path, empty dir, git 없음 — 모두 커버
- **F8 version**: 부분 커버 (defaults 스키마 merge 는 있음, 하지만 `minSlaminarVersion` 거부 테스트 없음)

### 3.2 약함 (순위 6–8)

- **F7 invalid CLI args**: 잘못된 `--token-tier`/`--catalog-mode`/음수 `fileCountCap` — **모두 미테스트**
- **F1 network**: 타임아웃·404·500·DNS 실패 시뮬 **전무**. 유일한 커버: update-check ECONNREFUSED
- **F6 concurrency**: **완전 부재**. 동시 init·manifest race·catalog cache 동시 쓰기 **모두 미테스트**

### 3.3 "있어야 할 텐데 없는" 테스트

| # | 갭 |
|---|---|
| G1 | **CLI integration test 자체가 부재** — 모든 테스트가 unit level. 인자 파싱·옵션 검증·exit code 조합 미검증 |
| G2 | HTTP timeout 시뮬 없음 (오래 걸리는 fetch) |
| G3 | EACCES / ENOSPC 없음 |
| G4 | 동시 init 없음 |
| G5 | 잘못된 `--token-tier` 값 전달 테스트 없음 |
| G6 | `minSlaminarVersion` 너무 높은 catalog 거부 테스트 없음 |
| G7 | manifest 손상 상태 uninstall 테스트 없음 |
| G8 | `slaminar check` exit code 실제 조건별 테스트 없음 |
| G9 | AI provider 빈 응답 (`null`/`{}`) 테스트 없음 |

---

## 4. Critical P0 후보 (v0.9.1 에 같은 사이클 fix)

세 Agent 가 공통으로 지목한 **심각하고 fix 가 비교적 간단한** 이슈:

| # | 이슈 | 위치 | 증상 | Fix 크기 |
|---|---|---|---|---|
| **P0-1** | `writeManifest` 비원자 | `src/placer/backup.ts:64–68` | 크래시 시 truncated JSON → `readManifest` 가 `[]` 반환, **모든 백업 기록 유실** | 작음 (tmp write + rename) |
| **P0-2** | `restoreFile` return 무시 | `src/rollback/uninstaller.ts:22`, `src/core/pipeline.ts:158–162` | 백업 파일 없어도 복원 성공 보고 → **silent data loss** | 작음 (return 값 체크 + 경고) |
| **P0-3** | `preAction` 무보호 | `src/cli.ts:55–60` | update-check 실패 = 모든 커맨드 크래시 (완화는 내부 catch 에만 의존) | 매우 작음 (try/catch 래핑) |
| **P0-4** | `--catalog-mode` validation 누락 | `src/cli.ts:99, 214, 542` (init/recommend/discover) | 잘못된 값이 type cast 로 통과 → 하류에서 이상 동작 | 작음 (validation 헬퍼 통합) |
| **P0-5** | `skill uninstall` exit=0 on failure | `src/cli.ts:1013–1016` | 실패해도 성공으로 보고 → CI 에서 감지 불가 | 매우 작음 (exitCode=1 한 줄) |

**v0.9.1 포함 권장**: P0-1, P0-2, P0-3, P0-5 (**가장 작고 위험 큰 4개**). P0-4 는 validation 헬퍼를 설계 후 v0.9.2 에 분리 검토.

---

## 5. P1 후보 (v0.9.2+ 티켓화)

| # | 이슈 | 권장 타이밍 |
|---|---|---|
| P1-1 | Concurrency (lock 파일 + manifest race 방지) | v0.9.3 (Phase Q4 설계와 함께) |
| P1-2 | Backup 멱등성 (동일 파일 중복 백업 방지) | v0.9.3 |
| P1-3 | Marker 손상 복구 로직 | v0.9.3 |
| P1-4 | HTTP timeout 시뮬 + AbortController 지원 | v0.9.2 (Phase Q3) |
| P1-5 | `catalog minSlaminarVersion` 거부 + 경고 UX | v0.9.2 |
| P1-6 | `skill uninstall` 예외 메시지 일관화 | v0.9.1 가능 |

---

## 6. Phase Q2 설계 입력

E2E 시나리오 작성 시 우선순위:

1. **CLI integration 기반** (G1 갭 해소) — 28 커맨드 각각 실제 `runCli` 호출
2. **Fixture 3 종**: small (20 files, node) · medium (500, python mono) · large (5000, polyglot)
3. **결정적 실행**: `SLAMINAR_AI_PROVIDER=local` 로 AI off
4. **Smoke assertions**: exit code · stdout/stderr 패턴 · 부작용 파일 존재
5. **부분 상태 위험 커맨드** (init, update, uninstall, setup, catalog update) 는 시나리오 수 +1 (성공·dry-run·부분 실패)

---

## 7. Phase Q3 (fault matrix) 설계 입력

**매트릭스 열** (sparse): 28 커맨드 중 I/O · 네트워크 접근이 있는 것만 (약 15 개)

**행 우선순위** (커버리지 약한 순):
1. F6 concurrency — **전수 미테스트**
2. F1 network timeout · HTTP error codes — **미테스트**
3. F2 EACCES · ENOSPC — **미테스트**
4. F7 invalid CLI args — **미테스트**
5. F5 AI provider rate limit · empty response · timeout — 부분만
6. F8 version mismatch — 부분만

**도구 확정**: 순수 `os.tmpdir()` + `chmod`/corrupt-file 배치 + MSW (네트워크) + `child_process.spawn` 병렬 (concurrency). `mock-fs` 미도입.

---

## 8. Phase Q4 (rollback R1–R10) 설계 입력

Agent A 가 제안한 10 케이스를 원래 플랜 R1–R10 과 매핑 (중복·새로 얻은 케이스 통합):

| Plan R# | 의미 | Agent A 발견 이슈 연계 | 우선순위 |
|---|---|---|---|
| R1 | 정상 init → uninstall | — (smoke) | MEDIUM |
| R2 | writeTargets SIGKILL → 복원 | A2 (partial write) | **CRITICAL** |
| R3 | update 중 marker 꼬임 | — (새 케이스 추가) | MEDIUM |
| R4 | 중첩 init — manifest 누적 | A2 + concurrency | **CRITICAL** |
| R5 | uninstall 시 대상 파일 이미 삭제 | — | MEDIUM |
| R6 | manifest 손상 상태 uninstall | A1 · A3 | **CRITICAL** |
| R7 | `remove <tool>` | — | MEDIUM |
| R8 | 백업 체크섬 불일치 | **추가 필요**: 현재 체크섬 필드 자체가 없음 → P1 아이템으로 승격 | LOW (의미 없음) |
| R9 | `.slaminar/.bk/` 디스크 소진 | A1 (manifest write 실패) | HIGH |
| R10 | symlink 백업/복원 | — | LOW |

**Agent A 추가 제안**:
- R-new-1: **동시 init 두 번 (concurrency)** — 현재 Plan 에 없지만 CRITICAL. Phase Q4 에 편입.
- R-new-2: `backupFile` 충돌 시뮬 (hex6 collision — 1/2^24, 이론상) — LOW.

**결정**: R8 (체크섬 불일치) 을 "동시 init 레이스" 로 대체.

---

## 9. 다음 스텝

1. **Phase Q2 시작** — `tests/e2e/` 디렉토리, `runCli` helper, 3 fixture 트리 생성
2. **v0.9.1 에 P0-1, P0-2, P0-3, P0-5 fix 커밋** 준비 — Q2 E2E 테스트로 회귀 방지 검증
3. **Phase Q3/Q4 는 v0.9.2/v0.9.3 분리** — 설계 입력은 본 문서로 확정
