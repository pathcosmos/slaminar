# v0.8.4 Init-First Design Spec

- **Status**: Approved for implementation (2026-04-17)
- **Target release**: v0.8.4 (patch, per project release policy)
- **Authors**: pathcosmos · Claude (collaborative design via `superpowers:brainstorming`)
- **Relates to**: [`2026-04-17-claude-code-passthrough-design.md`](./2026-04-17-claude-code-passthrough-design.md) · [`2026-04-17-global-setup-plan.md`](./2026-04-17-global-setup-plan.md) (v0.6 setup wizard baseline)

---

## Context

v0.8.3까지 사용자가 slaminar를 처음 쓰려면 다음 순서를 따라야 했습니다.

```
npm install -g slaminar
   ↓
slaminar setup      # 6단계, 15결정 wizard (AI / catalog / defaults / skill / discovery)
   ↓
slaminar init <path>
```

이 흐름은 두 가지 문제가 있습니다.

1. 사용자의 **실제 목적은 프로젝트 세팅**(`slaminar init`)인데, **전역 설정**(`slaminar setup`)을 먼저 거쳐야 한다고 착각합니다. 실제 두 경로 시뮬레이션에서 경로 B(터미널 직접) 결정 수는 **15개**였고, 경로 A(Claude Code `/slaminar`) 결정 수는 **2개**로 격차가 컸습니다.
2. `slaminar init`을 직접 실행하면 현재 "⚠ No AI provider configured. Run `slaminar setup` once"라는 passive nudge만 뜨고 지나갑니다. 사용자가 **지금 이 순간에 AI를 설정할 기회**를 주지 않습니다.

v0.8.4는 `slaminar init`을 hero command로 격상시켜 **첫 실행 시 1개 질문**으로 AI provider를 선택하도록 합니다. 기존 `slaminar setup` 명령은 **그대로** 유지 (하위 호환).

### 목표

- **첫 실행 경로**: `npm install` → `slaminar init <path>` → 1결정 → 완료
- 사용자가 `slaminar setup` 명령의 존재를 몰라도 완전한 프로젝트 세팅이 가능해야 함
- Claude Code 내부 호출 경로(v0.8.2 passthrough)와 터미널 직접 호출 경로 모두 자연스럽게 동작

### 원칙

1. **코어 파이프라인 변경 없음** — scan/analyze/recommend/generate/place/verify 건드리지 않음
2. **기존 login wizard 재사용** — Cloudflare/Anthropic 설정 로직 한 줄도 새로 안 씀
3. **하위 호환 100%** — 기존 사용자의 `defaults.json`, `auth.json`, `slaminar setup` 플로우 전부 보존

---

## User Flow

### 첫 실행 (v0.8.4 after)

```
$ slaminar init ~/work/new-project

Welcome to slaminar. One quick question before we scan your project —
  (what you pick is saved as a default, change anytime via `slaminar setup --reconfigure`)

? AI provider for CLAUDE.md enhancement:
❯ Skip — local rules only (you can add AI later)
  Cloudflare Workers AI  (free 10K/day · paste one token)
  Anthropic Claude API   (paid · paste one key)
```

이후 분기:

- **Skip 선택** → `defaults.json` 저장 → `init` 파이프라인 바로 실행 → local-rules CLAUDE.md 생성
- **Cloudflare 선택** → 기존 `setupCloudflare()` 호출 → 성공 시 `defaults.json` 저장 → `init` 진행 (AI enhancement); 실패 시 init 중단 (아래 "Auth Failure" 참조)
- **Anthropic 선택** → 동일 패턴

### 두 번째 이후 실행

```
$ slaminar init ~/work/another-project

(질문 없음, 바로 init 실행)
```

`defaults.json` 존재를 감지하면 mini-setup 블록을 건너뜀.

### 비대화형 환경 (CI)

```
$ slaminar init ~/work/project
(질문 없음, 기존 env-var 기반 AI 감지 또는 local-rules로 진행)
```

`process.stdin.isTTY === false` 감지 시 mini-setup 스킵. 기존 `SLAMINAR_*` env-var 흐름 그대로.

---

## Detection Logic

Mini-setup은 **세 조건 모두** 만족할 때만 트리거됩니다.

```typescript
const shouldRunMiniSetup =
  options.ai !== false &&         // 1. 사용자가 --no-ai 명시 안 함
  process.stdin.isTTY &&           // 2. 대화형 터미널
  !defaultsExist();                // 3. 한 번도 setup 경험 없음
```

조건별 의도:

| 조건 | 의도 |
|---|---|
| `options.ai !== false` | 사용자가 명시적으로 `--no-ai` 선택 시 의도 존중 |
| `process.stdin.isTTY` | CI / piped stdin에서 prompt 띄우지 않음 |
| `!defaultsExist()` | 기존 setup 경험자에게 재질문 안 함 |

---

## Mini-Setup Component

### 신규 파일: `src/setup/inline-prompt.ts` (~60 라인)

단일 export:

```typescript
export interface MiniSetupResult {
  choice: 'skip' | 'cloudflare' | 'anthropic';
  authSucceeded: boolean;   // skip이면 false, provider 선택+성공 시 true
}

export async function runInlineAuthPrompt(): Promise<MiniSetupResult>;
```

내부 로직:

1. Welcome + 안내 한 줄 출력
2. `select` prompt (기본값 'skip')
3. `'skip'` → 즉시 반환
4. `'cloudflare'` / `'anthropic'` → 신규 헬퍼 `runLoginWizardForProvider(provider)` 호출
5. 결과에 따라 `MiniSetupResult` 반환

### 수정 파일: `src/auth/wizard.ts`

신규 export 추가 (기존 `runLoginWizard()`는 그대로):

```typescript
export async function runLoginWizardForProvider(
  provider: 'cloudflare' | 'anthropic',
): Promise<boolean> {
  console.log(chalk.bold('\n━━━ slaminar Login ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
  return provider === 'cloudflare' ? setupCloudflare() : setupAnthropic();
}
```

`setupCloudflare()` / `setupAnthropic()`은 기존 그대로 (v0.8.3에서 polish 적용된 상태).

### 수정 파일: `src/cli.ts` (init 액션)

기존 passive nudge 블록을 mini-setup 호출로 교체:

```typescript
// BEFORE (v0.8.3):
if (options.ai !== false && process.stdin.isTTY) {
  const aiStatus = detectAiProvider();
  if (!aiStatus.available) {
    console.log(chalk.yellow('\n⚠  No AI provider configured.'));
    console.log(chalk.dim('   Run `slaminar setup` once — ...'));
    console.log(chalk.dim('   Continuing with local rules for this run.\n'));
  }
}

// AFTER (v0.8.4):
if (options.ai !== false && process.stdin.isTTY && !defaultsExist()) {
  const result = await runInlineAuthPrompt();
  if (result.choice !== 'skip' && !result.authSucceeded) {
    // Auth failure — abort init (Section "Auth Failure" 참조)
    console.log(chalk.red('\n  ✗ Auth setup didn\'t complete.\n'));
    console.log('  What to do:');
    console.log(`    • Fix the token issue and re-run: ${chalk.bold(`slaminar init ${path ?? '.'}`)}`);
    console.log(`    • Or proceed with local rules:    ${chalk.bold(`slaminar init --no-ai ${path ?? '.'}`)}`);
    console.log(`    • Or retry auth alone:            ${chalk.bold('slaminar setup --reconfigure auth')}\n`);
    process.exit(1);
  }
  // Persist defaults.json so future runs skip this prompt
  saveDefaults(builtInDefaults());
}
```

---

## Auth Failure Handling

사용자가 Cloudflare/Anthropic을 선택했지만 auth가 실패한 경우.

### 동작

1. `init` 파이프라인 **실행하지 않음**
2. `defaults.json` **저장하지 않음** (다음 실행 시 다시 prompt)
3. `auth.json` 저장 안 됨 (login wizard가 실패 시 저장 안 하는 기존 동작)
4. 세 가지 복구 경로를 명시하는 에러 메시지 출력
5. `process.exit(1)` 종료

### 에러 메시지 표준 형식

```
  ✗ Auth setup didn't complete.

  What to do:
    • Fix the token issue and re-run: slaminar init <path>
    • Or proceed with local rules:    slaminar init --no-ai <path>
    • Or retry auth alone:            slaminar setup --reconfigure auth
```

### 왜 graceful fallback이 아닌 중단인가

사용자가 "Cloudflare"/"Anthropic"을 명시적으로 선택했다는 것은 AI enhancement를 원한다는 의사 표시입니다. auth가 실패했는데 조용히 local-rules로 내려가면 사용자는 **자신이 원한 결과물이 아닌 것**을 받게 되고, 어디서 뭐가 잘못됐는지 알기 어려워집니다. 중단 + 명시적 복구 경로 안내가 더 안전합니다.

"Skip"은 의도적 local-rules 경로이므로 성공 경로이며 이 경우에 해당하지 않습니다.

---

## Backward Compatibility

### 유지되는 것

| 대상 | 상태 |
|---|---|
| `slaminar setup` (인자 없음) | 기존 6단계 위자드 그대로 |
| `slaminar setup --reconfigure <section>` | 그대로 |
| `slaminar init --no-ai` | 그대로 (prompt 안 뜸, local-rules로 진행) |
| `slaminar init <path>` with existing `defaults.json` | prompt 안 뜸 (기존 사용자 영향 없음) |
| `~/.config/slaminar/auth.json` | 그대로 |
| `~/.config/slaminar/defaults.json` | 그대로 |
| CI / 비-TTY 환경 | prompt 안 뜸, 기존 env-var 기반 동작 유지 |
| core 파이프라인 (scan/analyze/recommend/generate/place/verify) | 변경 0 |
| 338 테스트 전수 통과 | 유지 |

### 마이그레이션

없음. 기존 사용자는 이미 `defaults.json`을 가지고 있어 mini-setup이 트리거되지 않습니다. 신규 사용자만 이 흐름을 경험합니다.

---

## Forward Compatibility — v0.9.0 Claude CLI Passthrough

v0.9.0에서는 `claude` CLI 감지 시 "Use Claude Code subscription" 옵션을 추가할 예정 (별도 brainstorm 필요). 이번 v0.8.4 설계는 **이 확장을 구조적으로 막지 않음**:

```typescript
// v0.8.4 현재:
const choices = [
  { name: 'Skip — local rules only ...', value: 'skip' },
  { name: 'Cloudflare Workers AI ...', value: 'cloudflare' },
  { name: 'Anthropic Claude API ...', value: 'anthropic' },
];

// v0.9.0 예상 확장 (단순히 한 줄 추가):
if (await detectClaudeCli()) {
  choices.unshift({
    name: 'Use Claude Code subscription (detected) ★',
    value: 'claude-code',
  });
}
```

v0.8.4에서는 detection 로직 추가하지 않습니다 (YAGNI).

---

## Files Changed

| 파일 | 상태 | 크기 |
|---|---|---|
| `src/setup/inline-prompt.ts` | **신규** | ~60 라인 |
| `src/auth/wizard.ts` | 수정 (`runLoginWizardForProvider` export 추가) | +10 라인 |
| `src/cli.ts` | 수정 (init 액션 nudge → mini-setup 호출) | +15 / -10 라인 |
| `tests/setup/inline-prompt.test.ts` | **신규** (unit test) | ~40 라인 |
| `CHANGELOG.md` | 수정 | +40 라인 |
| `README.md` | 수정 ("first run" 섹션 업데이트) | +10 라인 |
| `README.ko.md` | 수정 (mirror) | +10 라인 |
| `package.json` | 수정 (0.8.3 → 0.8.4) | 1 라인 |
| `src/version.ts` | 수정 (0.8.3 → 0.8.4) | 1 라인 |

총 9개 파일 변경, 신규 코드 약 100 라인.

---

## Release & Versioning

- **v0.8.3 → v0.8.4** (patch bump, 프로젝트 릴리스 정책 준수)
- 커밋 스타일: `chore(release): v0.8.4 — init-first (Wave 2 UX)`
- 단일 commit 권장 (9 files)

---

## Verification

### 자동 검증

- `npx tsc --noEmit` → 0 errors
- `npm run build` → 성공
- `npm test -- --run` → 338 + 신규 테스트 통과
- `npm publish --dry-run` → `slaminar@0.8.4` 생성 확인

### 수동 E2E smoke

사전 조건: `~/.config/slaminar/defaults.json` 제거 (첫 실행 시뮬레이션).

**시나리오 1 — Skip 경로**:
```bash
rm -f ~/.config/slaminar/defaults.json
mkdir -p /tmp/v084-test && cd /tmp/v084-test && echo '{}' > package.json
slaminar init .
# → prompt 등장, 화살표로 Skip 선택, Enter
# → init 진행, local-rules CLAUDE.md 생성 확인
# → ~/.config/slaminar/defaults.json 존재 확인
```

**시나리오 2 — 두 번째 실행 (prompt 없음)**:
```bash
cd /tmp && mkdir -p v084-test-2 && cd v084-test-2 && echo '{}' > package.json
slaminar init .
# → prompt 없음, 바로 init 실행
```

**시나리오 3 — `--no-ai` 명시 (prompt 스킵)**:
```bash
rm -f ~/.config/slaminar/defaults.json
cd /tmp/v084-test-3 && echo '{}' > package.json
slaminar init --no-ai .
# → prompt 없음, local-rules CLAUDE.md 생성
# → defaults.json 저장 안 됨 (다음에 다시 prompt 가능)
```

**시나리오 4 — Auth 실패**:
```bash
rm -f ~/.config/slaminar/defaults.json ~/.config/slaminar/auth.json
cd /tmp/v084-test-4 && echo '{}' > package.json
slaminar init .
# → prompt에서 Cloudflare 선택
# → 토큰 입력에서 일부러 invalid 값 넣기
# → 에러 메시지 + 3가지 복구 경로 출력
# → exit code 1
# → defaults.json 저장 안 됨
```

**시나리오 5 — CI/비-TTY**:
```bash
rm -f ~/.config/slaminar/defaults.json
cd /tmp/v084-test-5 && echo '{}' > package.json
echo '' | slaminar init .
# → prompt 없음 (isTTY=false)
# → 기존 env-var 기반 AI 감지로 진행 또는 local fallback
```

### Regression 검증

- `slaminar setup` 단독 실행 → 기존 6단계 위자드 동일 동작
- `slaminar setup --reconfigure auth` → 동일 동작
- `slaminar init <path>` with existing `defaults.json` → prompt 없이 기존 동작

---

## Decision Records (D16.x — Implementation History에 반영 예정)

| ID | 제목 | Rationale |
|---|---|---|
| **D16.1** | `defaults.json` 유무가 "첫 실행" 단일 판단 기준 | 단순하고 확정적. `slaminar setup`이든 inline mini-setup이든 어느 쪽이든 지나가면 `defaults.json` 생성 → 이후 질문 없음. 여러 시그널 조합 대비 오탐 없음. |
| **D16.2** | Mini-setup은 질문 1개 (AI provider) | 시뮬레이션 결과 경로 B의 15결정 중 14개가 silent default로 충분함을 확인. 1개 질문으로 "AI를 쓸지"만 결정하면 나머지는 합리적 기본값으로 진행 가능. Catalog/tool install/defaults 등은 `setup --reconfigure`로 미래에 조정. |
| **D16.3** | Auth 실패 시 init 중단 (graceful fallback 아님) | 사용자가 Cloudflare/Anthropic 선택 = AI 원한다는 의사 표시. 조용히 local-rules로 내리면 기대와 다른 결과를 받음. 중단 + 3갈래 복구 경로가 명확. Skip 선택은 별개 (의도적 local 경로). |
| **D16.4** | `slaminar setup`은 변경 없음 — mini-setup과 독립 경로 | 하위 호환 100% 보장. 로직 중복(provider 선택 + login wizard 호출)이 있지만 `runLoginWizardForProvider` 공유로 핵심 로직은 하나. |
| **D16.5** | v0.9.0 Claude CLI passthrough 관련 변경 없음 | YAGNI. v0.8.4는 mini-setup 도입만. v0.9.0에서 choices 배열 한 줄 추가로 확장 가능하도록 구조만 남김. |

---

## References

- 시뮬레이션 기록: 이 세션의 Cloudflare / Anthropic 두 경로 walkthrough
- v0.8.3 변경사항: `CHANGELOG.md` 최상단 섹션
- v0.8.2 Claude Code passthrough: `docs/superpowers/specs/2026-04-17-claude-code-passthrough-design.md`
- 기존 setup wizard: `src/setup/wizard.ts:runSetupWizard` (변경 없음)
- 기존 login wizard: `src/auth/wizard.ts:runLoginWizard` (변경 없음, `runLoginWizardForProvider` 신규 추가)
