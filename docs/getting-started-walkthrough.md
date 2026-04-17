# slaminar 첫 설치 & 실행 상세 워크스루

> **대상**: `npm install -g slaminar` 을 처음 실행하는 사용자
> **범위**: 설치 → `slaminar setup` 전 과정 → 첫 프로젝트 `slaminar init` 까지
> **기준 버전**: slaminar v0.8.0 (2026-04-17 배포)
> **출처**: 이 문서의 모든 질문/선택지/기본값은 `src/setup/wizard.ts`, `src/auth/wizard.ts`, `src/skill/post-install.ts`의 실제 코드에서 추출되었습니다.

---

## 🗺️ 전체 흐름 한눈에 보기

```
┌─────────────────────────────────────────────────────────────────┐
│  Phase 1: 설치                                                   │
│    $ npm install -g slaminar                                    │
│    → postinstall 훅이 자동으로 /slaminar Claude Code 스킬 배포  │
│    → 질문 없음 (완전 자동, 조용한 실패 허용)                    │
├─────────────────────────────────────────────────────────────────┤
│  Phase 2: 전역 세팅 (권장, 최초 1회만)                           │
│    $ slaminar setup                                             │
│    → 6단계 위자드 (~2-3분 소요)                                 │
│    → Step 1: 환경 진단 (자동, 질문 없음)                        │
│    → Step 2: AI 프로바이더 (선택적, 스킵 가능)                  │
│    → Step 3: 카탈로그 (선택적, 기본은 공식 사용)                │
│    → Step 4: 기본값 (AI 모드 등)                                │
│    → Step 5: Claude Code 스킬 (이미 설치된 걸 확인만)           │
│    → Step 6: 프로젝트 발견 (선택적, 건너뛰기 기본)              │
├─────────────────────────────────────────────────────────────────┤
│  Phase 3: 건강 확인 (선택적)                                     │
│    $ slaminar doctor                                            │
│    → 질문 없음 (읽기 전용 진단)                                 │
├─────────────────────────────────────────────────────────────────┤
│  Phase 4: 프로젝트 적용 (매 프로젝트마다 1회)                    │
│    $ cd /path/to/project && slaminar init                      │
│    → 질문 없음 (비대화형, 결과만 출력)                          │
│    → CLAUDE.md + plugin + 보고서 자동 생성                     │
└─────────────────────────────────────────────────────────────────┘
```

**총 사용자 의사결정 수**: Phase 2에서 최대 **8개 질문**. 모두 기본값이 있어 엔터만 쳐도 합리적 설정으로 진행됩니다.

---

## 📦 Phase 1: 설치

### 1.1 설치 명령

```bash
npm install -g slaminar
```

**요구사항**:
- Node.js ≥ 18 (`node --version`으로 확인)
- npm 권한 (global 설치) — macOS에서 권한 에러 발생 시 `sudo npm install -g slaminar` 또는 `nvm` 사용 권장

### 1.2 postinstall 훅이 자동으로 하는 일

설치 시 `src/skill/post-install.ts`가 자동 실행됩니다. 이 훅은 **Claude Code 스킬을 자동 배포**합니다.

**복사되는 내용**:
- `SKILL.md` → `~/.claude/skills/slaminar/SKILL.md`
- 이후 Claude Code에서 `/slaminar`로 호출 가능

**출력 예시**:

✅ 정상 설치 (최초):
```
added 1 package in 3s
✓ slaminar Claude Code skill installed at ~/.claude/skills/slaminar/SKILL.md
  Invoke with `/slaminar` in Claude Code, or run `slaminar skill status`.
```

✅ 재설치 (내용 동일):
```
added 1 package in 3s
(skill은 이미 최신 — 조용히 no-op)
```

✅ 기존 커스텀 SKILL.md 있음 → 업데이트:
```
added 1 package in 3s
✓ slaminar skill updated at ~/.claude/skills/slaminar/SKILL.md
  Previous version backed up to ~/.config/slaminar/skill-backups/SKILL_2026-04-17T05-02-11.md
```

⚠ 실패 (권한 등 — 드묾):
```
added 1 package in 3s
⚠ slaminar skill auto-install skipped: <에러 메시지>
  You can retry with: slaminar skill install
```

### 1.3 postinstall 자동 스킵 조건

아래 조건 중 하나에 해당하면 자동으로 스킵됩니다:

| 조건 | 이유 |
|---|---|
| `SLAMINAR_SKIP_POSTINSTALL=1` 환경변수 설정됨 | 명시적 opt-out |
| `CI=true` 또는 비-`false` CI env 감지 | CI 환경에서는 HOME 디렉터리 오염 방지 |
| local 설치 (전역 아님) | 전이적 의존성 설치 시 오염 방지 |

**`npm install`은 이 훅이 실패해도 항상 성공합니다.** 실패하면 수동으로 `slaminar skill install` 실행하면 됩니다.

### 1.4 설치 후 즉시 검증

```bash
slaminar --version           # → 0.8.2
slaminar skill status        # 스킬 설치 상태 확인
```

예상 출력:
```
Claude Code Skill Status
  Path:      ~/.claude/skills/slaminar/SKILL.md
  Installed: yes
  Content:   matches bundled version
  Bundled:   available
```

### 1.5 실행 맥락 두 가지 — Claude Code 내부 vs 외부 CLI (v0.8.2+)

slaminar는 **어디서 호출되느냐**에 따라 AI 처리 방식이 달라집니다. 이 차이를 이해하면 API 키가 왜 필요할 수도, 안 필요할 수도 있는지 알 수 있습니다.

| 경로 | 명령 | AI 처리 | API 키 필요 |
|---|---|---|---|
| **(A) Claude Code 내부** | `/slaminar` 스킬 호출 | `--no-ai`로 로컬 규칙 CLAUDE.md 생성 후 **outer Claude(Max/Pro 구독)가 직접 Read/Edit로 enhance** | **없음** ✓ |
| **(B) 외부 CLI 직접** | `$ slaminar init` | 설정된 provider(Cloudflare/Anthropic) 또는 `--no-ai` | provider 설정 시 필요 |

#### 경로 (A) — Claude Code에서

Claude Code에서 `/slaminar`를 입력하면 SKILL.md 워크플로가 실행됩니다. Outer Claude(지금 대화 중인 Claude)가:

1. `slaminar init --dry-run --no-ai <path>` → 분석 미리보기
2. 사용자에게 진행 확인
3. `slaminar init --no-ai <path>` → ownership marker가 박힌 CLAUDE.md 생성 (로컬 규칙)
4. **Read + Edit로 CLAUDE.md 개선** ← 핵심: 실제 코드베이스를 읽고 섹션별로 깊이 있게 보강
5. `slaminar check <path>` → 검증

이 경로는 Anthropic API 키도, Cloudflare 토큰도 필요 없습니다. Claude Code가 이미 실행 중인 자신의 AI 자원을 그대로 재사용합니다.

#### 경로 (B) — 터미널에서 직접

```bash
$ slaminar init ~/my-project
```

이 경로는 Phase 2의 `slaminar setup` 결과(`~/.config/slaminar/auth.json`)를 읽어 설정된 provider로 AI enhancement를 수행합니다. 설정이 없으면 자동 `--no-ai` 모드로 fallback되어 로컬 규칙 CLAUDE.md를 만듭니다.

**둘 다 동일한 CLAUDE.md 포맷**을 생성하며, ownership markers도 양쪽에서 똑같이 작동합니다. 따라서 경로 (A)로 만든 CLAUDE.md를 나중에 터미널에서 `slaminar update`로 갱신해도, 또 그 반대도 완벽히 호환됩니다.

---

## 🧭 Phase 2: `slaminar setup` — 첫 실행 위자드

**실행**:
```bash
slaminar setup
```

6단계 진행. 각 단계에서 사용자는 **0~3개 질문**에 답하면 됩니다.

### Step 1 — Environment checks (자동, 질문 없음)

**하는 일**: 자동 진단 후 결과만 출력 (사용자 입력 불필요).

체크 항목 (실제 코드: `src/setup/doctor.ts`):
- Node.js 버전 ≥ 18
- git 설치 여부 + 버전
- slaminar 버전
- Claude Code 스킬 설치 상태
- AI 프로바이더 설정 상태 (환경변수 + `auth.json`)
- 카탈로그 캐시 신선도
- `~/.config/slaminar/` 쓰기 권한
- `defaults.json` 존재 여부

**출력 예시**:
```
━━━ Step 1 — Environment checks ━━━━━━━━━━━━━━━━━━━━━━━━━━━

slaminar doctor — v0.8.0

  ✓ Node.js v20.11.0 (required: >=18)
  ✓ git 2.43.0
  ✓ slaminar v0.8.0
  ✓ Claude Code skill installed
  ○ AI provider: not configured (optional)
  ○ Catalog cache: no cache yet
  ✓ ~/.config/slaminar/ writable
  ○ defaults.json: not created yet

Summary: 5 passed, 3 warnings, 0 failed
```

**결과 해석**:
- 모두 ✓: 다음 단계로 바로 진행
- ○ (warning): 정상 — 아직 설정 안 된 상태일 뿐 (이 단계에서 채워짐)
- ✗ (fail): **Node.js 미설치나 권한 문제**. 계속 진행은 가능하지만 해당 기능은 비활성

---

### Step 2 — AI Provider (선택적) ⚠️ 가장 많은 질문이 있는 단계

AI 프로바이더는 **선택사항**입니다. 설정하지 않아도 slaminar는 로컬 규칙 기반으로 완벽히 작동합니다. AI를 켜면 CLAUDE.md의 품질이 더 풍부해집니다.

**첫 번째 질문**:
```
? Configure an AI provider now? (Y/n)
```

- **`Y` (기본값)** → 세부 설정으로 진행
- **`n`** → 로컬 규칙 모드로 스킵 (나중에 `slaminar setup --reconfigure auth`로 재설정 가능)

---

#### Step 2.1 — 프로바이더 선택

`Y` 선택 시:

```
? Which AI provider would you like to use?
❯ Cloudflare Workers AI  (free 10K/day · recommended)
  Anthropic Claude API   (paid · top quality)
```

| 선택 | 비용 | 품질 | 언제 고르면 좋나 |
|---|---|---|---|
| **Cloudflare** (★ 추천) | 무료 10K Neurons/일 | 매우 좋음 | 대부분의 사용자 — 무료 한도로 충분 |
| **Anthropic** | 유료 (사용량 과금) | 최고 | Claude API 키를 이미 보유 / 최고 품질 필요 |

---

#### Step 2.2-A — Cloudflare 선택 시 (권장 경로)

**질문 2.2.1**: 브라우저로 토큰 생성 페이지 열기
```
How to create a token:
  1. Dashboard → My Profile → API Tokens → Create Token
  2. Custom Token → Permissions: Account · Workers AI · Read
  3. Account Resources: select your own account
  URL: https://dash.cloudflare.com/profile/api-tokens

? Open the token creation page in your browser now? (Y/n)
```

- `Y`: 브라우저 자동 열림
- `n`: URL을 보고 수동으로 방문 후 토큰 생성

**Cloudflare 대시보드에서 할 일** (브라우저):
1. **My Profile → API Tokens → Create Token**
2. **Custom Token** 선택
3. Permissions에 추가:
   - `Account` → `Workers AI` → `Read`
   - (선택적·권장) `User` → `User Details` → `Read`
   - (선택적·권장) `User` → `Memberships` → `Read` — 계정 자동 감지용
4. Account Resources: 본인 계정 하나 선택
5. `Create Token` → 토큰 복사

**질문 2.2.2**: 토큰 입력
```
? Cloudflare API Token:
```
- 복사한 토큰을 붙여넣기 (입력 문자는 `*`로 마스킹됨)
- 유효성 검사: 길이 > 10자

**질문 2.2.3**: 계정 선택 (자동 감지 성공 시)

만약 토큰에 `User → Memberships → Read` 권한이 있으면 **자동 감지**됩니다:
- 계정이 1개 → 자동 선택 (질문 없음)
- 계정이 여러 개 → 선택 프롬프트

```
? Cloudflare account to use:
❯ My Personal
  Company Account A
  Company Account B
```

자동 감지 실패 시:
```
  ! Could not auto-detect your account.
    For auto-detection, add "User → Memberships → Read" permission to your token.
    You can find your Account ID in the right sidebar of the Cloudflare dashboard.

? Cloudflare Account ID:
```
- Account ID: 32자리 hex 문자열 (예: `a1b2c3d4e5f6...`) — Cloudflare 대시보드 오른쪽 사이드바에서 복사

**질문 2.2.4**: 모델 선택
```
? Model to use:
❯ Llama 3.3 70B (fp8-fast) ★ Recommended — Fast and high-quality — default recommendation
  Llama 3.1 8B — Fastest, lowest cost
  Mistral Small 3.1 24B — 128K context, good for long documents
  Gemma 3 12B — Multilingual, 128K context
  Qwen 2.5 Coder 32B — Strong for code-focused projects
```

| 선택 | 언제 고르면 좋나 |
|---|---|
| **Llama 3.3 70B** (★) | 대부분의 경우 — 품질/속도 균형 |
| **Llama 3.1 8B** | 빠른 응답 우선 / 간단 프로젝트 |
| **Qwen 2.5 Coder** | 코드 분석 중심 프로젝트 |

선택 후 자동으로 실제 추론 호출 테스트:
```
Running a real inference test...
  ✓ Token valid (120ms)
  ✓ Account access (95ms)
  ✓ Model inference (430ms)

✓ Saved to /Users/you/.config/slaminar/auth.json (mode 0600)

Logged in! You can now run slaminar init in any project.
```

---

#### Step 2.2-B — Anthropic 선택 시

**질문 2.2.5**: 브라우저 열기
```
Create an API key: https://console.anthropic.com/settings/keys

? Open the browser? (Y/n)
```

**Anthropic 콘솔에서 할 일**:
1. **Settings → API Keys → Create Key**
2. Key 이름 지정 → Create
3. `sk-ant-...`로 시작하는 키 복사

**질문 2.2.6**: API 키 입력
```
? Anthropic API Key (sk-ant-...):
```
- 유효성 검사: `sk-ant-` 로 시작해야 함
- 자동으로 API 호출 테스트

**질문 2.2.7**: 모델 선택
```
? Model to use:
❯ Claude Sonnet 4 ★ — Top quality, long context
```
(현재 `src/auth/models.ts`에 Anthropic 모델은 Claude Sonnet 4 하나만 등록되어 있음. 다른 모델은 향후 추가 예정.)

---

### Step 3 — Catalog (선택적)

**실행 맥락**: 공식 카탈로그(46개 도구 큐레이션)를 기본 사용할지, 커스텀/회사 카탈로그를 추가할지 결정.

#### Step 3.1 (자동) — 팀 카탈로그 감지

현재 디렉토리에 `.slaminar/config.json`이 있고 거기 `catalogUrl`이 설정되어 있으면 자동 감지됩니다:
```
  Team config detected at ./.slaminar/config.json:
    catalogUrl:   https://tools.company.com/catalog.json
    catalogMode:  extend

? Import this catalog as your personal global default? (Y/n)
```

- `Y` (기본): 팀 카탈로그를 **사용자 전역 기본값으로 복사** (이후 어느 프로젝트에서 slaminar를 써도 같은 카탈로그 사용)
- `n`: 이 프로젝트에서만 사용

#### Step 3.2 — 커스텀 카탈로그 사용 여부

**팀 카탈로그 감지 없을 때**:
```
? Use a custom catalog URL? (N = official)  (y/N)
```
- **`N` (기본)** → 공식 카탈로그 사용 (Step 4로 건너뛰기)
- `Y` → URL 입력 진행

**팀 카탈로그 있을 때**:
```
? Keep custom catalog URL (https://tools.company.com/catalog.json)? (Y/n)
```

#### Step 3.3 — URL 입력 (커스텀 선택 시)
```
? Custom catalog URL (or /absolute/path.json):
  https://
```

허용 형식:
- `https://example.com/catalog.json`
- `http://internal.server/catalog.json`
- `file:///absolute/path/catalog.json`
- `/absolute/path/catalog.json`
- `~/my-catalog.json`

#### Step 3.4 — 모드 선택
```
? Catalog mode:
❯ extend — merge with official
  replace — custom only
```

| 모드 | 동작 | 언제 고르면 좋나 |
|---|---|---|
| **extend** (권장) | 공식 46개 + 커스텀 도구 **병합**. 이름 충돌 시 커스텀 승리 | 대부분 — 공식의 이점 유지하면서 회사 도구 추가 |
| **replace** | 커스텀만 사용, 공식 완전 무시 | 보안팀 allowlist — 승인된 도구만 허용 |

#### Step 3.5 — 자동 갱신 주기
```
? Auto-refresh interval in hours (0 to disable): 24
```
- `24` (기본): 매 24시간마다 원격에서 새 카탈로그 fetch
- `0`: 비활성화 (수동 `slaminar catalog update`로만 갱신)
- 빈도 조절: `1`~`168` (1시간~1주일)

**커스텀 카탈로그 안 쓰기로 하면 출력되는 힌트**:
```
  Tip: add extra sources (company + personal) later via
       `slaminar catalog source add <uri>`
```

v0.8의 multi-source 카탈로그를 나중에 추가하려면 이 명령어 사용하세요.

---

### Step 4 — Defaults for new projects

프로젝트마다 반복되는 기본 동작을 정의합니다.

#### Step 4.1 — AI 모드
```
? AI mode for `slaminar init`:
❯ auto    — use AI if configured, fall back to local rules
  ai      — require AI (fail if not configured)
  local   — local rules only (no AI)
```

| 선택 | 동작 | 언제 고르면 좋나 |
|---|---|---|
| **auto** (기본·권장) | AI 있으면 쓰고, 없으면 로컬로 fallback | 대부분 — 유연함 |
| **ai** | AI 없으면 실패 | AI 품질이 필수 (팀 합의) |
| **local** | AI 절대 안 씀 | 오프라인/프라이버시 민감 |

#### Step 4.2 — 인증 필요 도구 제외
```
? Exclude tools that require external authentication? (Y/n)
```
- **`Y` (기본·권장)**: GitHub/Slack/AWS 등 auth 필요한 도구는 추천 목록에서 제외
- `n`: 모든 도구 표시 (추천 후 수동으로 auth 설정 필요)

#### Step 4.3 — 스캔 파일 수 상한
```
? Max files scanned per project: 10000
```
- `10000` (기본): 대부분의 프로젝트에 충분
- 모노레포는 `50000` 등으로 늘리기
- 최소값 100 강제

#### Step 4.4 — 주간 버전 체크
```
? Enable weekly version check (reads npm registry only, no telemetry)? (Y/n)
```
- **`Y` (기본·권장)**: 7일마다 1회 npm registry에서 최신 버전 확인 (프라이버시 안전, 식별자 전송 없음)
- `n`: 비활성화 (수동으로 `npm view slaminar version`)

---

### Step 5 — Claude Code Skill

#### Step 5.1 — 자동 설치 선호도
```
? Auto-install the /slaminar Claude Code skill on npm install? (Y/n)
```
- **`Y` (기본)**: `npm install -g slaminar`가 자동으로 스킬 배포 (현재 방식)
- `n`: 자동 설치 끄기 (수동 `slaminar skill install`만)

#### Step 5.2 — 지금 설치?
```
? Install the skill to ~/.claude/skills/slaminar/ now? (Y/n)
```
- **`Y` (기본)**: 즉시 설치 시도
- 이미 설치되어 있으면 `unchanged`로 no-op (Phase 1에서 이미 처리됨)

결과 예시:
```
  = Skill already up to date at ~/.claude/skills/slaminar/SKILL.md
```

---

### Step 6 — Project Discovery (선택적, v0.7+)

#### Step 6.1 — 스캔 여부
```
? Scan specific directories for existing Claude Code projects? (y/N)
```
- **`N` (기본)**: 스킵 (Summary로 진행)
- `Y`: 루트 입력으로 진행

**왜 기본이 `N`?** 파일시스템 스캔은 권한/시간 이슈가 있을 수 있어 명시적 opt-in이 안전. 나중에 언제든 `slaminar discover <roots...>`로 실행 가능.

#### Step 6.2 — 루트 입력
```
? Roots to scan (comma or space separated): ~/work, ~/projects
```
- 기본: 이전 실행 시 저장된 `defaults.json.discovery.lastRoots` 또는 `~/work, ~/projects`
- 여러 경로: 쉼표나 공백으로 구분

#### Step 6.3 — 스캔 결과

ASCII 테이블로 발견된 프로젝트 표시:
```
┌──────────────────────────┬──────────┬────────────┬────────┬──────────┐
│ Project                  │ Language │ Status     │ Suggest│ CLAUDE.md│
├──────────────────────────┼──────────┼────────────┼────────┼──────────┤
│ ~/work/proj-a            │ typescript│ existing   │ init+m │ 42 lines │
│ ~/work/proj-b            │ python    │ new        │ init   │ —        │
│ ~/work/proj-c            │ typescript│ configured │ update │ 120 lines│
└──────────────────────────┴──────────┴────────────┴────────┴──────────┘

3 project(s): 1 new, 1 configured, 1 existing
  scanned 127 dirs, excluded 384, elapsed 82ms
```

#### Step 6.4 — 적용 선택지
```
? How should we proceed?
❯ Dry-run all 3 suggested projects (recommended)
  Select specific projects
  Apply immediately (no dry-run)
  Skip — save defaults only
```

| 선택 | 동작 |
|---|---|
| **Dry-run all** (기본·권장) | 미리보기만 — 아무 파일도 안 씀 |
| **Select specific projects** | 체크박스 UI로 선별 |
| **Apply immediately** | 즉시 `init`/`update` 실행 (비가역!) |
| **Skip** | Step 6만 스킵, 지금까지 저장한 defaults는 유지 |

**Select 선택 시 추가 질문**:
```
? Pick the projects to operate on:
◉ ~/work/proj-a  (existing → init-merge)
◯ ~/work/proj-b  (new → init)
◉ ~/work/proj-c  (configured → update)
```

```
? Run as dry-run first? (Y/n)
```

---

### Step 종료 — Summary

위자드 마지막에 설정 요약 출력:

```
━━━ Setup complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌───────────┬───────────────────────────────────────────────────────────┐
│ Section   │ Result                                                    │
├───────────┼───────────────────────────────────────────────────────────┤
│ auth      │ cloudflare (llama-3.3-70b-instruct-fp8-fast)             │
│ catalog   │ official (refresh 24h)                                    │
│ defaults  │ aiMode=auto, excludeAuthTools=true, fileCountCap=10000   │
│ skill     │ autoInstall=true, scope=global                           │
│ discovery │ (skipped)                                                 │
└───────────┴───────────────────────────────────────────────────────────┘

  Defaults file: /Users/you/.config/slaminar/defaults.json
  Log:           /Users/you/.config/slaminar/setup-logs/setup-2026-04-17T05-45-12.md

  Next steps:
    slaminar init <path>  — configure a project
    slaminar doctor       — verify your install anytime
    slaminar setup --reconfigure <section> — revisit a single step
```

---

## 🏥 Phase 3: `slaminar doctor` (선택적 확인)

**질문 없음** (읽기 전용). 언제든 실행.

```bash
slaminar doctor            # 사람이 읽기 좋은 출력
slaminar doctor --json     # CI용 기계 판독 JSON
```

종료 코드:
- `0`: 모두 통과
- `1`: 경고 있음
- `2`: 실패 있음

---

## 🚀 Phase 4: `slaminar init` — 프로젝트 적용

**실행** (프로젝트 디렉토리 안에서):
```bash
cd /path/to/your-project
slaminar init
# 또는 경로 지정
slaminar init /path/to/other-project
```

**질문 없음** — 비대화형 파이프라인 실행. (AI 미설정 상태로 처음 실행 시 `slaminar setup` 권장 힌트만 출력.)

### 7단계 파이프라인 자동 실행

```
⚡ scan → analyze → recommend → plan → generate → place → verify
```

각 단계의 자동 동작:

| Phase | 동작 | 출력 |
|---|---|---|
| scan | 파일 트리 / git / 패키지 / 기존 AI 파일 수집 | (내부) |
| analyze | 언어, 패턴, 성숙도, 컨벤션 감지 | (내부) |
| recommend | 카탈로그에서 매칭 도구 추천 (점수 + 충돌 체크) | (내부) |
| plan | 섹션 구조 결정 | (내부) |
| generate | CLAUDE.md + plugin.json + SKILL.md 생성 | (내부) |
| place | 기존 파일 백업 + 마커 기반 머지 + 쓰기 | 파일 작성 |
| verify | 문법/명령/마커 검증 | 체크 결과 |

### 생성되는 파일 (프로젝트 루트)

```
your-project/
├── CLAUDE.md                         # 새 파일 또는 slaminar 섹션만 머지
├── .claude/
│   └── plugins/slaminar-generated/
│       ├── plugin.json               # 플러그인 매니페스트
│       └── skills/dev.md             # 도구 설치 가이드
└── .slaminar/
    ├── config.json                   # 팀 config (git 커밋)
    ├── config.local.json             # 개인 config (.gitignore)
    ├── .gitignore                    # local.json/state.json/.bk/ 제외
    ├── state.json                    # 실행 메타
    ├── reports/init-2026-04-17.md    # 사람이 읽는 보고서
    └── .bk/                          # 기존 파일 백업 (난독 파일명)
```

### 출력 예시
```
━━━ slaminar init complete ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Profile:
  ┌──────────┬────────────┐
  │ Name     │ your-app   │
  │ Language │ typescript │
  │ Pattern  │ spa        │
  │ Maturity │ growing    │
  └──────────┴────────────┘

  Recommended Tools (5):
    ✓ claude-code-lsps          (LSP support)
    ✓ superpowers               (agent primitives)
    ✓ vibeguard                 (code review)
    ✓ spec-kit                  (spec-driven)
    ✓ claude-code-templates     (bootstrap)

  Written:
    CLAUDE.md                (new, 127 lines)
    .claude/plugins/.../plugin.json
    .claude/plugins/.../skills/dev.md
    .slaminar/config.json
    .slaminar/reports/init-2026-04-17T05-50-00.md

  Verification: 9 checks passed

  ✨ AI provider: cloudflare (llama-3.3-70b-instruct-fp8-fast)
```

---

## ⚡ Phase 5: 일상 사용

| 명령어 | 언제 |
|---|---|
| `slaminar init` | 새 프로젝트 세팅 |
| `slaminar update` | 프로젝트 변경 후 CLAUDE.md 증분 갱신 |
| `slaminar status` | 현재 프로젝트 상태 |
| `slaminar check --ci` | CI에서 CLAUDE.md 유효성 확인 (exit code 0/1/2) |
| `slaminar doctor` | 글로벌 설치 건강 확인 |
| `slaminar catalog update` | 최신 카탈로그 fetch (기본 24h 자동) |
| `slaminar catalog source list` | 현재 활성화된 모든 카탈로그 소스 |
| `slaminar discover ~/work` | 여러 프로젝트 일괄 스캔 (v0.7+) |
| `slaminar skill status` | Claude Code 스킬 상태 |
| `slaminar uninstall` | 프로젝트에서 slaminar 생성 파일 제거 + 백업 복원 |

---

## 🤖 CI / 비대화형 모드

대화형 위자드 대신 환경변수로 모든 답을 미리 주고 한 번에 실행:

```bash
SLAMINAR_AI_PROVIDER=cloudflare \
SLAMINAR_CF_TOKEN=xxx \
SLAMINAR_CF_ACCOUNT_ID=xxx \
SLAMINAR_DEFAULT_AI_MODE=local \
SLAMINAR_VERSION_CHECK=false \
  slaminar setup --yes --no-update-check
```

또는 secrets 빼고 부분만:
```bash
SLAMINAR_CATALOG_URL=https://company.com/catalog.json \
SLAMINAR_CATALOG_MODE=extend \
  slaminar setup --yes
```

---

## 부록 A — 환경변수 전체 목록

### 인증 (Step 2)

| 환경변수 | 값 | 용도 |
|---|---|---|
| `SLAMINAR_AI_PROVIDER` | `cloudflare` \| `anthropic` | 프로바이더 선택 |
| `SLAMINAR_CF_TOKEN` | API 토큰 | Cloudflare 인증 |
| `SLAMINAR_CF_ACCOUNT_ID` | 32자 hex | Cloudflare 계정 ID |
| `SLAMINAR_CF_ACCOUNT_NAME` | 문자열 | 표시용 (선택) |
| `SLAMINAR_CF_MODEL` | 모델 ID | 기본 `@cf/meta/llama-3.3-70b-instruct-fp8-fast` |
| `SLAMINAR_ANTHROPIC_KEY` 또는 `ANTHROPIC_API_KEY` | `sk-ant-...` | Anthropic 인증 |
| `SLAMINAR_ANTHROPIC_MODEL` | 모델 ID | 기본 `claude-sonnet-4` |

### 카탈로그 (Step 3)

| 환경변수 | 값 | 용도 |
|---|---|---|
| `SLAMINAR_CATALOG_URL` | URL | 단일 커스텀 카탈로그 |
| `SLAMINAR_CATALOG_MODE` | `extend` \| `replace` | 병합 모드 |
| `SLAMINAR_CATALOG_SOURCES` (v0.8+) | `mode:uri,mode:uri` | 멀티 소스 |
| `SLAMINAR_IMPORT_TEAM_CATALOG` | `true` | --yes 모드에서 팀 카탈로그 자동 임포트 |

### 기본값 (Step 4)

| 환경변수 | 값 | 용도 |
|---|---|---|
| `SLAMINAR_DEFAULT_AI_MODE` | `auto` \| `ai` \| `local` | AI 모드 |
| `SLAMINAR_EXCLUDE_AUTH_TOOLS` | `true` \| `false` | 인증 도구 제외 |
| `SLAMINAR_FILE_COUNT_CAP` | 정수 | 스캔 파일 상한 |
| `SLAMINAR_VERSION_CHECK` | `true` \| `false` | 주간 버전 체크 |

### Discovery (Step 6, v0.7+)

| 환경변수 | 값 | 용도 |
|---|---|---|
| `SLAMINAR_DISCOVER_ROOTS` | `~/work,~/projects` | 스캔 루트 |
| `SLAMINAR_BATCH_APPROVED` | 루트 리스트 | 일괄 적용 대상 |
| `SLAMINAR_BATCH_DRY_RUN` | `true` | dry-run 강제 |
| `SLAMINAR_ONLY_NEW` | `true` | new 상태만 처리 |

### 기타

| 환경변수 | 값 | 용도 |
|---|---|---|
| `SLAMINAR_SKIP_POSTINSTALL` | `1` | npm install 시 스킬 자동 배포 스킵 |
| `CI` | `true` (등) | CI 환경 자동 감지 |

---

## 부록 B — 파일 위치 지도

### 사용자 전역 (`~/.config/slaminar/`)

| 파일 | 권한 | 내용 |
|---|---|---|
| `auth.json` | 0600 | AI 프로바이더 자격증명 (토큰) |
| `defaults.json` | 0644 | 전역 기본값 (Step 3-6 결과) |
| `catalog-cache.json` | 0600 | 공식 카탈로그 캐시 (24h TTL) |
| `catalog-cache.prev.json` | 0600 | 직전 카탈로그 (rollback용) |
| `cache/<source-id>.json` (v0.8+) | 0600 | per-source 카탈로그 캐시 |
| `skill-backups/SKILL_*.md` | 0644 | 사용자 기존 SKILL.md 백업 |
| `setup-logs/setup-*.md` | 0644 | 위자드 실행 로그 (감사용) |
| `setup-logs/batch-*.md` (v0.7+) | 0644 | 일괄 적용 감사 로그 |

### 프로젝트별 (`<project>/.slaminar/`)

| 파일 | git 커밋? | 내용 |
|---|---|---|
| `config.json` | ✅ | 팀 공유 설정 |
| `config.local.json` | ❌ (`.gitignore`) | 개인별 설정 |
| `state.json` | ❌ | 실행 메타 |
| `.bk/*.dat` | ❌ | 기존 파일 백업 (난독 파일명) |
| `reports/*.md` | ❌ | 실행 보고서 |

### Claude Code 통합 (`~/.claude/`)

| 파일 | 내용 |
|---|---|
| `skills/slaminar/SKILL.md` | `/slaminar` 스킬 (path 파라미터 지원) |

---

## 부록 C — 문제해결 / 롤백

### npm install 시 권한 에러
```bash
# macOS/Linux에서 sudo 없이 전역 설치하려면 nvm 사용 권장
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install 20
npm install -g slaminar
```

### Cloudflare 토큰 검증 실패
1. 토큰에 `Account:Workers AI:Read` 권한 있는지 확인
2. Account Resources에 본인 계정 선택했는지 확인
3. 토큰 재생성 후 재시도

### 스킬 자동 설치 실패
```bash
slaminar skill install        # 수동 재시도
slaminar skill status         # 상태 확인
slaminar skill uninstall      # 제거 + 백업 복원
```

### 설정 초기화
```bash
# 단일 섹션만
slaminar setup --reconfigure auth       # AI 프로바이더만
slaminar setup --reconfigure catalog    # 카탈로그만
slaminar setup --reconfigure defaults   # 기본값만
slaminar setup --reconfigure skill      # 스킬만

# 전체 초기화 (수동)
rm -rf ~/.config/slaminar/
slaminar setup
```

### 프로젝트 롤백
```bash
cd /path/to/project
slaminar uninstall     # slaminar 생성 파일 제거 + .bk/에서 원본 복원
```

### 캐시/카탈로그 문제
```bash
slaminar catalog status                       # 캐시 상태
slaminar catalog update                       # 강제 갱신
slaminar catalog rollback                     # 직전 버전으로 되돌리기
slaminar catalog source list                  # 모든 소스 표시 (v0.8+)
slaminar catalog source test <uri>            # URL 유효성만 확인 (저장 X)
```

---

## 부록 D — 의사결정 치트시트

**초심자 기본 경로** (엔터만 눌러도 OK):
1. AI 프로바이더: **Cloudflare** (무료)
2. 모델: **Llama 3.3 70B** (추천)
3. 카탈로그: **공식** (커스텀 안 씀)
4. AI 모드: **auto**
5. 인증 도구 제외: **Yes**
6. 파일 상한: **10000**
7. 버전 체크: **Yes**
8. 스킬 자동 설치: **Yes**
9. Discovery: **스킵**

**필수 입력이 필요한 지점 (3곳)**:
- Cloudflare API Token (토큰 입력)
- Cloudflare Account ID (자동 감지 안 될 때만)
- 모델 선택 (기본값 엔터로 OK)

**나중에 할 수 있는 것들**:
- 멀티 소스 카탈로그: `slaminar catalog source add <uri>` (v0.8+)
- 여러 프로젝트 일괄 세팅: `slaminar discover ~/work ~/projects` (v0.7+)
- AI 프로바이더 변경: `slaminar setup --reconfigure auth`

---

## 🔗 연관 문서

- [`README.md`](../README.md) — 전체 기능 소개 (영어)
- [`README.ko.md`](../README.ko.md) — 전체 기능 소개 (한국어) · Implementation History에 v0.5–v0.8 의사결정 25개(D11.1–D14.8) 상세 기록
- [`CHANGELOG.md`](../CHANGELOG.md) — 버전별 변경 이력
- [`docs/superpowers/specs/2026-04-17-global-setup-plan.md`](./superpowers/specs/2026-04-17-global-setup-plan.md) — v0.6–v0.8 설계 문서
- [`docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`](./superpowers/specs/2026-04-16-custom-catalog-plan.md) — multi-source 카탈로그 설계

---

**문서 검증**: 이 문서의 질문 문구/기본값/옵션은 아래 코드에서 직접 추출되었습니다. 의심스러우면 실제 코드를 확인하세요.

| 섹션 | 소스 코드 |
|---|---|
| Phase 1 postinstall | `src/skill/post-install.ts` |
| Step 1 Environment | `src/setup/doctor.ts` |
| Step 2 AI Provider | `src/setup/wizard.ts:stepAuth` + `src/auth/wizard.ts:runLoginWizard` |
| Step 3 Catalog | `src/setup/wizard.ts:stepCatalog` |
| Step 4 Defaults | `src/setup/wizard.ts:stepDefaults` |
| Step 5 Skill | `src/setup/wizard.ts:stepSkill` |
| Step 6 Discovery | `src/setup/wizard.ts:stepDiscovery` |
| Phase 4 init | `src/core/pipeline.ts:init` (비대화형) |
