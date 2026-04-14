# slaminar 설계 명세서

> 날짜: 2026-04-14
> 상태: 초안 — 사용자 검토 대기 중

## 개요

slaminar는 **Claude Code 전용 프로젝트 분석 및 세팅 도구**입니다. 아무 코드베이스에 지정하면:

1. 프로젝트 구조, 의존성, git 히스토리, 기존 AI 컨텍스트 파일을 스캔
2. 언어, 프레임워크, 아키텍처 패턴, 컨벤션을 분석
3. Claude Code 생태계 도구(플러그인, 스킬, 훅)를 추천 — 외부 서버 인증이 필요한 것은 제외
4. 맞춤형 `CLAUDE.md`와 Claude Code 플러그인 패키지를 생성
5. 기존 파일을 백업(난독 파일명)하고 생성된 파일을 배치

## 제품 형태

- **CLI**: `npx slaminar` / `slaminar init [path]`
- **Claude Code 스킬**: 아무 프로젝트에서 `/slaminar` 실행
- **언어**: TypeScript (ESM, Node.js >= 18)
- **패키지**: npm (`slaminar`)

## 아키텍처

### 파이프라인

```
scan → analyze → recommend → plan → generate → place
(스캔)  (분석)    (추천)     (계획)   (생성)    (배치)
```

각 단계는 JSON 직렬화 가능한 중간 표현(IR)을 생성하여 다음 단계에 전달합니다.

### 인터랙션 모델 (스마트 하이브리드)

1. 프로젝트를 자동 분석 (사용자 입력 불필요)
2. 결과 표시: 프로젝트 프로파일 + 추천 도구 + 생성 계획
3. 사용자가 검토, 수정, 승인
4. 파일 생성 및 배치

### 디렉토리 구조

```
src/
├── cli.ts                        # CLI 진입점 (commander)
├── core/
│   ├── pipeline.ts               # 오케스트레이터: scan → analyze → recommend → plan → generate → place
│   ├── scanner.ts                # 1단계: 프로젝트 원시 데이터 수집
│   ├── analyzer.ts               # 2단계: 프로젝트 프로파일 도출
│   ├── recommender.ts            # 3단계: 생태계 도구 매칭
│   ├── planner.ts                # 4단계: 생성 계획 수립 + 사용자 승인
│   ├── generator.ts              # 5단계: 파일 생성 (로컬/AI 모드)
│   └── placer.ts                 # 6단계: 백업 + 머지 + 배치
├── scanner/
│   ├── file-tree.ts              # 디렉토리 구조 스캔 (.gitignore 인식)
│   ├── git-info.ts               # 최근 커밋, 브랜치, 기여자, 커밋 스타일
│   ├── ai-files.ts               # 기존 CLAUDE.md, .claude/ 설정
│   └── package-info.ts           # package.json, Cargo.toml, pyproject.toml, go.mod 등
├── analyzer/
│   ├── language-detector.ts      # 주/보조 언어, 프레임워크, 런타임, 빌드 도구
│   ├── structure-mapper.ts       # 아키텍처 패턴 (모노레포, SPA, CLI, API, 라이브러리 등)
│   ├── convention-extractor.ts   # 네이밍, 테스트 프레임워크, 린터, 포매터, 커밋 스타일, 문서 언어
│   └── dependency-analyzer.ts    # 주요 의존성, 개발 도구
├── recommender/
│   ├── catalog.ts                # 생태계 카탈로그 관리 (docs/claude-code-ecosystem.md)
│   ├── matcher.ts                # ProjectProfile → 도구 추천 (규칙 기반)
│   └── installer.ts              # 도구 설치 (플러그인 레지스트리, git clone, npm)
├── generator/
│   ├── claude-md.ts              # CLAUDE.md 생성/머지
│   ├── claude-plugin.ts          # plugin.json + skills/ + hooks/ + agents/
│   └── ai-provider.ts            # 로컬 규칙 vs Claude API 라우팅
├── placer/
│   ├── backup.ts                 # .slaminar/.bk/ 에 난독 백업
│   ├── merger.ts                 # 구조화된 파일의 섹션 단위 머지
│   └── writer.ts                 # 최종 파일 배치
├── runtime/
│   ├── detector.ts               # Python/Node 탐지 (타임아웃 가드)
│   ├── uv.ts                     # uv 부트스트랩 + Python 설치 + 도구 설치
│   ├── volta.ts                  # volta 부트스트랩 + Node 설치
│   └── prerequisite.ts           # PrerequisiteCheck 오케스트레이터
├── skill/
│   └── SKILL.md                  # Claude Code 스킬 정의
├── types/
│   └── index.ts                  # 공유 타입 정의
└── config/
    └── defaults.ts               # 기본 설정값
```

## 단계별 상세

### 1단계: Scanner (스캐너)

해석 없이 원시 데이터를 수집합니다.

**수집 대상:**

| 카테고리 | 수집 항목 |
|----------|----------|
| 파일 트리 | 디렉토리 구조, 확장자별 파일 수, .gitignore 적용 |
| 패키지 매니저 | package.json, Cargo.toml, pyproject.toml, go.mod, pom.xml, build.gradle |
| Git | 최근 커밋 50개, 브랜치, 주요 기여자, 커밋 메시지 패턴 |
| AI 컨텍스트 | 기존 CLAUDE.md, .claude/ 디렉토리 |
| 설정 파일 | tsconfig.json, .eslintrc, .prettierrc, vite.config.* 등 |
| CI/CD | .github/workflows/, Dockerfile, docker-compose.yml |
| 문서 | README.md, SETUP.md, CONTRIBUTING.md, docs/ |

**출력:** `ProjectSnapshot`

```typescript
interface ProjectSnapshot {
  root: string;                        // 프로젝트 루트 경로
  fileTree: FileNode[];                // 파일 트리 노드 배열
  fileStats: Record<string, number>;   // 확장자별 파일 수
  packages: PackageInfo[];             // 감지된 패키지 매니저들
  git: GitInfo | null;                 // Git 정보 (없으면 null)
  existingAiFiles: AiFile[];           // 기존 AI 컨텍스트 파일
  configs: ConfigFile[];               // 설정 파일들
  ci: CiConfig[];                      // CI/CD 설정
  docs: DocFile[];                     // 문서 파일들
  scannedAt: string;                   // 스캔 시각
}
```

**성능 고려:**
- .gitignore + node_modules/, dist/, .git/ 자동 제외
- 파일 수 상한: 10,000개 (설정 가능)
- 설정 파일과 문서만 내용 읽기 (소스 파일은 읽지 않음)

### 2단계: Analyzer (분석기)

원시 스냅샷을 의미 있는 프로파일로 변환합니다.

**출력:** `ProjectProfile`

```typescript
interface ProjectProfile {
  name: string;                        // 프로젝트 이름
  description: string;                 // 설명 (README 첫 문단 또는 package description)
  language: LanguageProfile;           // 언어 프로파일
  structure: StructureProfile;         // 구조 프로파일
  conventions: ConventionProfile;      // 컨벤션 프로파일
  dependencies: DependencyProfile;     // 의존성 프로파일
  existingAiContext: AiContextSummary; // 기존 AI 컨텍스트 요약
}

interface LanguageProfile {
  primary: string;           // 주 언어 (예: "typescript")
  secondary: string[];       // 보조 언어 (예: ["css", "html"])
  framework: string | null;  // 프레임워크 (예: "react", "express")
  runtime: string | null;    // 런타임 (예: "node", "deno", "bun")
  buildTool: string | null;  // 빌드 도구 (예: "vite", "webpack")
}

interface StructureProfile {
  pattern: string;           // "monorepo" | "spa" | "cli" | "library" | "api" | "fullstack"
  entryPoints: string[];     // 진입점 (예: ["src/cli.ts", "src/main.tsx"])
  testPattern: string | null; // 테스트 패턴 (예: "tests/*.test.ts")
  srcLayout: string;          // "flat" | "feature-based" | "layer-based"
}

interface ConventionProfile {
  naming: string;             // 네이밍 (예: "camelCase", "snake_case")
  testFramework: string | null; // 테스트 프레임워크 (예: "vitest", "jest")
  linter: string | null;       // 린터
  formatter: string | null;    // 포매터
  commitStyle: string | null;  // 커밋 스타일 (예: "conventional", "freeform")
  docLanguage: string;         // 문서 언어 (예: "ko", "en")
}

interface DependencyProfile {
  total: number;              // 총 의존성 수
  notable: NotableDep[];      // 주요 의존성 (AI SDK, 프레임워크, DB 등)
  devTools: string[];         // 개발 도구 (빌드/테스트/린트)
}
```

### 3단계: Recommender (추천기)

프로젝트 프로파일을 생태계 카탈로그와 매칭하여 Claude Code 도구를 제안합니다.

**카탈로그 소스:** `docs/claude-code-ecosystem.md` (관리되는 파일)

#### 1단계: 다차원 스코어링

단순 1:1 규칙 매칭이 아니라, 여러 요소를 가중치로 조합하여 점수를 산출합니다:

```typescript
interface ScoringFactors {
  // 프로젝트 특성
  languageMatch: number;        // 언어/프레임워크 일치도
  structureMatch: number;       // 아키텍처 패턴 적합도
  scaleMatch: number;           // 프로젝트 규모 적합도

  // 프로젝트 성숙도
  maturity: number;             // 커밋 수, 기간, 기여자 수
  hasTests: boolean;            // 테스트 존재 여부
  hasCi: boolean;               // CI/CD 존재 여부

  // 도구 간 관계
  synergy: number;              // 다른 추천 도구와의 시너지
  conflict: number;             // 충돌 가능성 (동일 기능 중복)
  dependencyChain: number;      // 사전 도구 필요 여부

  // 실용성
  installComplexity: number;    // 설치 난이도
  tokenCost: number;            // 예상 토큰 소비량
  maintenanceBurden: number;    // 유지보수 부담
}
```

**컨텍스트 인식 판단 예시:**

| 상황 | 판단 |
|------|------|
| React SPA, 커밋 3개, 1인 개발 | impeccable만 추천 (초기 단계, 과도한 도구 부담 방지) |
| React SPA, 커밋 500개, 5인 팀 | impeccable + playwright-skill + claude-mem + Continuous-Claude-v3 |
| React SPA, 테스트 0개 | playwright-skill 우선순위 최상위로 |
| React SPA, CLAUDE.md 이미 2000줄 | ClaudeForge 제외 (이미 충분) |
| TypeScript CLI, UI 없음 | impeccable 제외 (무관) |

#### 2단계: 충돌/중복 감지

```typescript
interface ToolRelation {
  tools: [string, string];
  relation: "synergy" | "overlap" | "conflict";
  resolution: string;
}
```

알려진 관계:
- `everything-claude-code` ↔ `caveman`: 기능 중복 → 하나만 선택
- `planning-with-files` ↔ `get-shit-done`: 시너지 → 함께 추천
- `ClaudeForge` ↔ slaminar 자체: 충돌 → slaminar가 CLAUDE.md 생성하므로 ClaudeForge 불필요
- `cartographer` ↔ `graphify`: 기능 중복 → 코드베이스 규모로 선택 (소규모: cartographer, 대규모: graphify)

#### 3단계: AI 정제 (선택, AI 모드 전용)

로컬 스코어링으로 후보 목록을 산출한 뒤, AI 모드에서는 Claude API가 최종 컨텍스트 판단:

- 입력: ProjectProfile + 점수화된 후보 목록 + 사유
- 출력: 정제된 선택 + 도구별 근거
- 로컬 규칙으로 잡기 어려운 상식적 판단 적용 (예: "CLI 도구 → 브라우저 테스트 무의미")

#### 도구 수 제한

프로젝트 규모에 따른 과부하 방지:
- 소규모 프로젝트 (< 50 커밋, 1인): 최대 3개
- 중규모 프로젝트 (50-500 커밋, 2-5인): 최대 5개
- 대규모 프로젝트 (500+ 커밋, 5인 이상): 최대 7개

#### 기본 매칭 규칙 (시드)

스코어링에 투입되는 기본 규칙 (단독 판단에 사용하지 않음):

| 프로젝트 특성 | 후보 도구 |
|--------------|----------|
| 모든 프로젝트 | caveman, planning-with-files |
| 프론트엔드 (React, Vue 등) | impeccable, playwright-skill |
| CLI 도구 | get-shit-done |
| 보안 민감 | trailofbits/skills |
| 대형 코드베이스 | graphify, cartographer |
| 게임 (Godot) | godogen |
| 게임 (Unity) | mcp-unity |
| Elixir/Phoenix | claude-elixir-phoenix |
| 장기 프로젝트 | claude-mem, pro-workflow |
| 팀 프로젝트 | Continuous-Claude-v3 |
| 문서 중심 | codebase-to-course |

#### 필터링 (하드 규칙)

1. `authRequired === true` → 자동 제외
2. 외부 서버 필수 → 제외
3. 로컬 전용 동작 가능 → 포함

#### 자동 설치

세 가지 설치 방법, 모두 자동화 가능:

```typescript
interface InstallAction {
  tool: string;
  method: "marketplace" | "npx" | "git-clone";
  commands: string[];          // 실행할 명령어 시퀀스
  prerequisites: PrerequisiteCheck[];  // 사전 조건 검증
}

interface PrerequisiteCheck {
  name: string;              // "python", "node", "bun"
  minVersion: string | null; // ">= 3.10", ">= 18"
  checkCommand: string;      // "python3 --version"
  available: boolean;        // 실행 시 판단
  fallbackTool: string | null; // 사전 조건 미충족 시 대체 도구 (예: graphify → "cartographer")
}
```

| 방법 | 명령어 | 예시 |
|------|--------|------|
| marketplace | `claude plugin marketplace add <owner/repo>` + `claude plugin install <name>` | impeccable, caveman, claude-hud |
| npx | `npx <package>` | get-shit-done, claude-mem |
| git-clone | `git clone <repo>` + `./install.sh` | gstack, everything-claude-code |
| pip | `pip install <package>` + `<cli> install` | graphify (`pip install graphifyy && graphify install`) |

**사전 조건 검증 플로우:**
```
추천된 각 도구에 대해:
  1. 사전 조건 확인 (예: python3 --version)
  2. 충족 → 설치 계획에 추가
  3. 미충족 → fallbackTool 확인
     - 대체 도구 존재 + 그 사전 조건 충족 → 추천 교체
     - 대체 도구 없음 → "사전 조건 미충족" 사유로 제외
  4. 모든 사전 조건 이슈를 계획 승인 단계에서 사용자에게 보고
```

**예시: graphify vs cartographer 폴백:**
- graphify는 Python 3.10+ 필요 → `python3 --version` 확인
- Python 미설치 → cartographer를 대신 추천 (Node.js 기반, marketplace 설치)
- 둘 다 "대형 코드베이스 매핑" 목적, 다른 사전 조건

마켓플레이스 카탈로그(CCPI, superpowers-marketplace, buildwithclaude) 내 개별 플러그인:
- 카탈로그 내 인증 불필요 플러그인만 선별
- 각 하위 플러그인에 authRequired 태깅
- 전체 마켓플레이스가 아닌 개별 플러그인을 설치

**출력:** `RecommendationPlan`

```typescript
interface RecommendedTool {
  name: string;              // 도구 이름
  repo: string;              // GitHub 저장소 URL
  category: "plugin" | "skill" | "hook" | "agent" | "workflow";
  reason: string;            // 추천 사유
  relevanceScore: number;    // 관련도 점수 (0-100)
  authRequired: boolean;     // 인증 필요 여부
  networkRequired: "none" | "partial" | "full";  // graphify: "partial" (코드=로컬, 문서=API)
  installMethod: "marketplace" | "npx" | "git-clone" | "pip";
  installCommands: string[]; // 설치 명령어 시퀀스
  prerequisites: PrerequisiteCheck[];  // 사전 조건 검증 목록
}

interface RecommendationPlan {
  recommended: RecommendedTool[];   // 추천 목록
  excluded: ExcludedTool[];         // 제외 목록 (사유 포함)
  conflicts: ToolRelation[];        // 감지된 충돌/중복
  maxTools: number;                 // 프로젝트 규모 기반 상한
  prerequisiteIssues: string[];     // 미충족 사전 조건 요약
}
```

### 4단계: Planner (계획기)

분석 결과 + 추천 목록을 구체적인 생성 계획으로 결합합니다. 사용자에게 표시하여 승인받습니다.

**사용자 승인 플로우:**
```
slaminar 분석 완료: mdmizer

프로젝트: React SPA (TypeScript + Vite)
패턴: feature-based SPA
테스트: 미감지
문서: 한국어

--- 생성 계획 ---
  [생성] CLAUDE.md
  [생성] .claude/plugins/slaminar-generated/plugin.json
  [생성] .claude/plugins/slaminar-generated/skills/dev.md
  [생성] .claude/plugins/slaminar-generated/skills/architecture.md

--- 추천 도구 ---
  [설치] caveman — 토큰 65% 절약
  [설치] impeccable — React UI 디자인 품질 향상
  [설치] playwright-skill — 브라우저 테스트
  [제외] claude-octopus — 외부 API 키 필요

계속 진행할까요? (Y/n/수정)
```

### 5단계: Generator (생성기)

파일 내용을 생성합니다. 두 가지 모드:

| | 로컬 모드 | AI 모드 |
|--|----------|---------|
| 방식 | 규칙 기반 + 템플릿 | ProjectProfile → Claude API |
| 속도 | 1초 미만 | 5-15초 |
| 품질 | 정형화, 일관적 | 프로젝트에 더 맞춤화 |
| 비용 | 무료 | API 토큰 소비 |
| 오프라인 | 가능 | 불가 |

**AI 모드 워크플로우:**
1. 로컬 모드로 초안을 기준선으로 생성
2. 초안 + ProjectProfile + 주요 소스 샘플을 Claude API에 전달
3. AI가 개선하여 최종본 반환

**CLAUDE.md 생성 규칙 (로컬 모드):**
1. 헤더 + 프로젝트 설명 (package description / README 첫 문단에서 추출)
2. 빌드/테스트/린트 명령어 (package.json scripts 또는 동등한 것에서 추출)
3. 아키텍처 개요 (구조 패턴 + 진입점에서 추출)
4. 주요 의존성 (notable deps에서 추출)
5. 컨벤션 (네이밍, 테스트 프레임워크, 커밋 스타일)
6. 기존 CLAUDE.md에서 보존할 내용 (머지 시)

**플러그인 생성 구조:**
```
.claude/plugins/slaminar-generated/
├── plugin.json
├── skills/
│   ├── dev.md          # 빌드, 테스트, 린트 워크플로우
│   └── architecture.md # 아키텍처 가이드
├── hooks/
│   └── pre-commit.sh   # 린트/타입체크 (로컬 전용)
└── agents/
    └── reviewer.md     # 코드 리뷰 에이전트 (로컬 도구만 사용: Read, Grep, Glob, Bash)
```

모든 생성된 플러그인은 **로컬 도구만** 사용합니다 (Read, Write, Edit, Grep, Glob, Bash).

### 6단계: Placer (배치기)

**백업:**
```
.slaminar/.bk/{랜덤Hex6}_{유닉스타임스탬프}.dat
.slaminar/.bk/manifest.json  ← 원본 ↔ 백업 매핑
```

- `.dat` 확장자: IDE/AI 도구가 자동 인식하지 않음
- manifest.json: 유일한 매핑 기록
- 모두 `.slaminar/.bk/` 안에 위치 — 프로젝트 루트 오염 없음

**머지 전략:**
- 기존 파일 없음 → 새로 생성
- 기존 파일 있음 → 먼저 백업, 그 다음:
  - 구조화된 파일 (CLAUDE.md): 섹션 단위 머지
  - 규칙 파일: 새 규칙 추가(append)
  - 충돌: 사용자에게 diff 표시

**배치 경로:**

| 생성물 | 경로 |
|--------|------|
| CLAUDE.md | `./CLAUDE.md` |
| Claude Code 플러그인 | `.claude/plugins/slaminar-generated/` |
| 추천 도구 | 각 도구의 설치 방식에 따라 |
| slaminar 메타데이터 | `.slaminar/` |

## 런타임 관리

대상 플랫폼: **macOS** 및 **Linux**.

slaminar는 추천 도구 설치 전에 Python과 Node.js 런타임을 탐지하고, 필요 시 설치합니다. 두 개의 런타임 매니저를 표준으로 사용합니다:

| 런타임 | 매니저 | 이유 |
|--------|--------|------|
| Python | **uv** (Astral, Rust 바이너리) | sudo 불필요, brew/apt 불필요, Python 자체 설치 가능, pip보다 10-100배 빠름 |
| Node.js | **volta** (Rust 바이너리) | shim 기반 (쉘 재시작 불필요), 비대화형, 즉시 사용 가능 |

### 탐지 플로우

```
slaminar init 실행
  ↓
[1] 런타임 탐지
  ├─ Python: python3 -c "..." (5초 타임아웃 가드) → uv python find
  ├─ Node: node --version → volta which node
  └─ uv/volta 자체 존재 여부 확인
  ↓
[2] 설치 판단 (추천 도구가 필요로 하는 경우에만)
  ├─ graphify 추천됨 + Python 없음?
  │   → "Python 3.12 설치가 필요합니다. uv로 설치할까요? (Y/n)"
  │   → curl uv → uv python install 3.12 → uv tool install graphifyy
  ├─ claude-mem 추천됨 + Node 없음?
  │   → "Node 20 설치가 필요합니다. volta로 설치할까요? (Y/n)"
  │   → curl volta → volta install node@20
  └─ 둘 다 있음 → 바로 진행
  ↓
[3] 도구 설치
  ├─ Python 도구: uv tool install <pkg> (도구별 격리 venv)
  ├─ npm 도구: npm install -g <pkg> (또는 volta install)
  ├─ marketplace: claude plugin marketplace add + install
  └─ git-clone: git clone + install script
```

### macOS Python shim 함정

macOS 13 이상에서 `/usr/bin/python3`은 실제 Python이 아닌 Xcode CLT 설치 다이얼로그를 트리거하는 shim으로 존재합니다. 비대화형 스크립트를 무한 블로킹합니다.

**해결책:** 타임아웃 가드로 실제 Python 실행을 검증:

```typescript
interface RuntimeDetection {
  command: string;          // "python3", "node"
  checkMethod: string;      // 경로 확인이 아닌 실제 실행
  timeoutMs: number;        // Python은 5000ms (macOS shim 가드)
  minVersion: string;       // ">= 3.11", ">= 18"
  fallbackManager: string;  // Python은 "uv", Node는 "volta"
}
```

macOS에서 `command -v python3`은 Python이 실제로 설치되지 않아도 true를 반환합니다. 반드시 타임아웃과 함께 실행하여 검증해야 합니다.

### uv — Python 툴체인 매니저

```bash
# uv 부트스트랩 (Python 불필요, 단일 Rust 바이너리)
curl -LsSf https://astral.sh/uv/install.sh | sh

# Python 자체 설치 (독립 빌드, brew/apt 불필요)
uv python install 3.12
# 설치 위치: ~/.local/share/uv/python/cpython-3.12.*/

# CLI 도구를 격리 venv에 설치 (pipx와 유사하지만 더 빠름)
uv tool install graphifyy
# 설치 위치: ~/.local/share/uv/tools/graphifyy/
# 심링크: ~/.local/bin/graphify
```

**uv를 pip/pipx/venv 대신 쓰는 이유:**
- `uv python install` — 시스템 패키지 매니저 없이 Python 자체 설치
- `uv tool install` — 도구별 자동 venv 격리
- Python이 없어도 부트스트랩 가능
- pip보다 10-100배 빠름

### volta — Node.js 매니저

```bash
# volta 부트스트랩 (Node 불필요)
curl https://get.volta.sh | bash -s -- --skip-setup
export VOLTA_HOME="$HOME/.volta"
export PATH="$VOLTA_HOME/bin:$PATH"

# Node 설치 (즉시 사용 가능, 쉘 재시작 불필요)
volta install node@20
```

**volta를 nvm/fnm 대신 쓰는 이유:**
- shim 기반: `eval`이나 쉘 source 불필요
- 설치 후 쉘 재시작 불필요
- 설계부터 비대화형

### npx 주의사항

npm 7 이상에서 `npx`는 "Need to install... Ok to proceed? (y)" 프롬프트를 표시합니다. 비대화형 사용 시:

```bash
npx --yes <package>   # 항상 자동 확인
```

### 런타임 매니저 설치 경로

| 매니저 | 설치 위치 | 관리 런타임 위치 |
|--------|----------|-----------------|
| uv | `~/.local/bin/uv` | `~/.local/share/uv/python/` |
| uv tools | `~/.local/bin/<tool>` | `~/.local/share/uv/tools/<tool>/` |
| volta | `~/.volta/bin/volta` | `~/.volta/tools/node/` |

### 디렉토리 구조 추가

```
src/
├── runtime/
│   ├── detector.ts          # Python/Node 탐지 (타임아웃 가드)
│   ├── uv.ts                # uv 부트스트랩 + Python 설치 + 도구 설치
│   ├── volta.ts             # volta 부트스트랩 + Node 설치
│   └── prerequisite.ts      # PrerequisiteCheck 오케스트레이터
```

## 7단계: Verifier (검증기)

배치 후 검증. 사용자가 다음 Claude Code 세션에서 문제를 발견하기 전에 잡습니다.

### 도구 설치 검증

```typescript
interface ToolVerification {
  tool: string;
  command: string;        // "graphify --version", "claude plugin list | grep impeccable"
  expectedPattern: RegExp; // /graphify \d+\.\d+/
  timeoutMs: number;
  status: "pass" | "fail" | "skip";
  error?: string;
}
```

설치된 각 도구에 스모크 테스트 실행. 실패 시 명확한 오류 메시지와 해결 방법 제시.

### CLAUDE.md 유효성 검증

- 마크다운 구문 검증 (제목, 링크)
- 명령어 검증: 모든 쉘 명령어를 추출하여 package.json scripts 또는 시스템 명령어로 존재 확인
- 경로 검증: 참조된 파일 경로가 실제 존재하는지 확인
- 최신성 검사: CLAUDE.md 명령어를 현재 package.json scripts와 비교

### 플러그인 검증

- plugin.json 스키마 체크 (Claude Code 기대 스키마 기준)
- 참조된 skill/hook/agent 파일이 선언된 경로에 존재하는지 확인

### 검증 보고서

```
slaminar 검증 보고서:

  도구:
    ✅ caveman — v2.1.0 설치됨
    ✅ impeccable — 플러그인 로드됨
    ❌ graphify — 명령어 없음 (pip 설치 실패)
       → 실행: uv tool install graphifyy

  생성 파일:
    ✅ CLAUDE.md — 유효, 5개 명령어 확인됨
    ✅ plugin.json — 스키마 유효
    ⚠️  skills/dev.md — "npm run lint" 참조하지만 lint 스크립트 없음

  전체: 2 통과, 1 실패, 1 경고
```

## Reporter — 진행 표시 및 리뷰 보고서

모든 파이프라인 실행 시 실시간 진행 상황을 표시하고, 완료 후 리뷰 보고서를 자동 생성합니다.

### 실시간 터미널 표시

각 단계 완료 시 구조화된 테이블로 결과를 표시합니다:

```
slaminar init .

━━━ Phase 1/7: Scan ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.3s
  Files: 847  |  Extensions: .ts(312) .tsx(89) .css(45)
  Git: 523 커밋, 4 기여자, conventional 스타일
  기존: CLAUDE.md (2,555줄), .claude/settings.json

━━━ Phase 2/7: Analyze ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.5s
  ┌──────────────┬──────────────────────────────────────┐
  │ 프로젝트     │ mdmizer                              │
  │ 언어         │ TypeScript (주), CSS (보조)           │
  │ 프레임워크   │ React 19                             │
  │ 빌드 도구    │ Vite 7                               │
  │ 패턴         │ SPA, feature-based 레이아웃          │
  │ 테스트       │ 미감지                               │
  │ 성숙도       │ early (3 커밋, 1 기여자)             │
  │ 문서 언어    │ 한국어                               │
  └──────────────┴──────────────────────────────────────┘

━━━ Phase 3/7: Recommend ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 1.2s
  ┌───┬──────────────────┬───────┬───────────┬────────────────────────────┐
  │ # │ 도구             │ 점수  │ 방법      │ 사유                       │
  ├───┼──────────────────┼───────┼───────────┼────────────────────────────┤
  │ 1 │ ✅ caveman        │ 92    │ marketplace│ 토큰 65% 절약              │
  │ 2 │ ✅ impeccable     │ 87    │ marketplace│ React UI 디자인 품질       │
  │ 3 │ ✅ planning-files │ 78    │ npx       │ 기능 개발 시 계획 수립     │
  ├───┼──────────────────┼───────┼───────────┼────────────────────────────┤
  │ - │ ⛔ claude-octopus │ 71    │ -         │ 제외: API 키 필요          │
  │ - │ ⛔ graphify       │ 68    │ -         │ 제외: Python 미설치        │
  └───┴──────────────────┴───────┴───────────┴────────────────────────────┘

━━━ Phase 4/7: Plan ━━━━━━━━━━━━━━━━━━━━━━━━━━━ 🔄 승인 대기
  ... (사용자 승인)

━━━ Phase 5/7: Generate ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 2.1s
━━━ Phase 6/7: Place ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 0.1s
━━━ Phase 7/7: Verify ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ ✅ 1.8s

━━━ 완료 ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 총: 6.0s
  보고서: .slaminar/reports/2026-04-14-init.md
```

### 마크다운 보고서 (팀 공유용)

`.slaminar/reports/YYYY-MM-DD-<action>.md`에 자동 생성. 커밋 가능, PR에서 리뷰 가능:

```markdown
# slaminar 세팅 보고서 — mdmizer
> 생성: 2026-04-14 15:30 | slaminar v0.1.0 | by: lanco

## 프로젝트 프로파일
| 항목 | 값 |
|------|---|
| 언어 | TypeScript (React 19 + Vite 7) |
| 패턴 | SPA, feature-based |
| 성숙도 | early (3 커밋, 1 기여자) |

## 설치된 도구
| 도구 | 버전 | 점수 | 방법 | 사유 |
|------|------|------|------|------|
| caveman | 2.1.0 | 92 | marketplace | 토큰 절약 |
| impeccable | 2.1.1 | 87 | marketplace | React UI 디자인 |

## 제외된 도구
| 도구 | 점수 | 사유 |
|------|------|------|
| claude-octopus | 71 | API 키 필요 |
| graphify | 68 | Python 미설치 |

## 생성 파일
| 파일 | 줄 수 | 동작 |
|------|-------|------|
| CLAUDE.md | 87 | 생성 |
| plugin.json | 12 | 생성 |

## 검증
| 항목 | 결과 |
|------|------|
| 모든 도구 | ✅ 통과 |
| CLAUDE.md | ✅ 유효 |
| plugin.json | ✅ 스키마 유효 |
```

### 상태 명령어 (`slaminar status`)

현재 상태를 상세 테이블로 표시:

```
slaminar status

  프로파일:
  ┌──────────────┬─────────────────────────────┐
  │ 언어         │ TypeScript + React 19       │
  │ 성숙도       │ early (3 커밋)              │
  │ 마지막 스캔  │ 2026-04-14 15:30            │
  └──────────────┴─────────────────────────────┘

  생성 파일:
  ┌──────────────────────────┬───────────┬──────────────────────┐
  │ 파일                     │ 상태      │ 상세                 │
  ├──────────────────────────┼───────────┼──────────────────────┤
  │ CLAUDE.md                │ ✅ 최신    │ 2026-04-14           │
  │ skills/dev.md            │ ⚠️ 오래됨  │ package.json 변경됨  │
  └──────────────────────────┴───────────┴──────────────────────┘

  설치된 도구:
  ┌──────────────────────┬─────────┬───────────┬──────────┐
  │ 도구                 │ 버전    │ 상태      │ 범위     │
  ├──────────────────────┼─────────┼───────────┼──────────┤
  │ caveman              │ 2.1.0   │ ✅ 활성    │ 팀       │
  │ impeccable           │ 2.1.1   │ ✅ 활성    │ 팀       │
  │ claude-mem           │ 0.9.2   │ ✅ 활성    │ 개인     │
  └──────────────────────┴─────────┴───────────┴──────────┘
```

### 팀 상태 (`slaminar team-status`)

```
slaminar team-status

  팀 도구 (config.json):
  ┌──────────────────────┬─────────┬────────────────────┐
  │ 도구                 │ 버전    │ 승인               │
  ├──────────────────────┼─────────┼────────────────────┤
  │ caveman              │ 2.1.0   │ 2026-04-14 (lanco) │
  │ impeccable           │ 2.1.1   │ 2026-04-14 (lanco) │
  └──────────────────────┴─────────┴────────────────────┘

  Lock 상태: ✅ 최신
  온보딩: slaminar setup
```

### Reporter 디렉토리 구조

```
src/
├── reporter/
│   ├── terminal.ts       # 실시간 터미널 테이블 (chalk + cli-table3)
│   ├── markdown.ts       # .slaminar/reports/*.md 생성
│   └── progress.ts       # 단계별 프로그레스 바 + 요약 라인
```

### 보고서 저장

```
.slaminar/reports/           # 커밋 가능한 마크다운 보고서
  ├── 2026-04-14-init.md     # 초기 세팅
  ├── 2026-04-15-update.md   # 증분 업데이트
  └── latest.md              # 최근 보고서 심링크
```

### CLI 명령어

```bash
slaminar status              # 현재 프로젝트 상태 테이블
slaminar team-status         # 팀 전체 세팅 상태
slaminar report              # 최근 보고서 재표시
slaminar report --history    # 모든 보고서 목록
```

### --json 플래그

모든 표시 명령어는 `--json`으로 머신 가독 출력 지원:

```bash
slaminar status --json       # 스크립트/CI용 JSON 출력
slaminar health --json       # JSON 헬스 보고서
```

## 신규 프로젝트 (Greenfield) 처리

프로젝트에 신호가 없을 때 (0 커밋, package.json 없음, README 없음):

### 프로젝트 성숙도 감지

```typescript
type ProjectMaturity = "greenfield" | "early" | "growing" | "mature";
```

| 성숙도 | 기준 | 파이프라인 동작 |
|--------|------|----------------|
| greenfield | git 없음, 패키지 파일 없음, 소스 없음 | 인터랙티브 모드: 사용자에게 질문 |
| early | < 10 커밋, 기본 구조 | 최소 추천 (최대 2개) |
| growing | 10-200 커밋, 테스트 등장 | 표준 추천 |
| mature | 200+ 커밋, CI, 팀 | 팀 기능 포함 전체 추천 |

### Greenfield 플로우

1. 신호 없음 감지 → 질문: "어떤 언어/프레임워크를 사용할 예정인가요?"
2. `.git/` 없으면 `git init` 제안
3. 추천기 생략 또는 범용 도구 1개만 (caveman)
4. 플레이스홀더 섹션이 있는 최소 CLAUDE.md 생성
5. 프로파일에 `userDeclared: true` 저장하여 나중에 재평가

## 팀 협업

### 설정 분리

| 파일 | 커밋 대상 | 내용 |
|------|----------|------|
| `.slaminar/config.json` | YES | 팀 설정: excludeAuthTools, fileCountCap, 승인된 도구 |
| `.slaminar/config.local.json` | NO | 개인: aiMode, API 키, 로컬 오버라이드 |
| `.slaminar/lock.json` | YES | 재현성을 위한 정확한 도구 버전 |
| `.slaminar/state.json` | NO | 로컬 생성 상태, 해시 |
| `.slaminar/.bk/` | NO | 백업 파일 |
| `.slaminar/catalog-pin.json` | YES | 고정된 카탈로그 버전 |

### 자동 생성 `.slaminar/.gitignore`

```
config.local.json
state.json
.bk/
```

### 팀 명령어

```bash
slaminar setup              # 온보딩: 팀 설정 읽기 → 누락 도구 설치
slaminar recommend --propose # 팀 리뷰용 제안 생성 (PR 기반)
slaminar add <tool>          # 팀 설정에 도구 추가
slaminar add <tool> --personal  # 본인만 설치, 팀 설정에 미반영
```

### 재현성을 위한 Lock 파일

```typescript
interface SlaminarLock {
  lockVersion: 1;
  generatedBy: string;           // slaminar 버전
  catalogHash: string;
  tools: {
    name: string;
    version: string;
    installMethod: string;
    installCommands: string[];
  }[];
  generatedFiles: {
    path: string;
    contentHash: string;
  }[];
}
```

`slaminar setup`은 lock.json을 읽어 정확한 버전을 설치합니다. `slaminar update`는 lock 파일을 갱신합니다.

## 증분 업데이트

### 소유권 마커

생성된 CLAUDE.md 섹션은 마커로 slaminar 소유 콘텐츠를 추적합니다:

```markdown
<!-- slaminar:begin:build-commands -->
## 빌드 및 테스트 명령어
npm run build
npm test
<!-- slaminar:end:build-commands -->

## 내 커스텀 섹션     ← 사용자 작성, slaminar가 절대 건드리지 않음
...
```

재실행 시, slaminar는 자체 마커 내 콘텐츠만 업데이트합니다. 마커 밖 사용자 콘텐츠는 보존됩니다.

### 상태 추적

```typescript
interface SlaminarState {
  version: string;
  generatedAt: string;
  profileHash: string;           // 생성 시점 ProjectProfile 해시
  generatedFiles: {
    path: string;
    contentHash: string;         // 생성된 콘텐츠 해시
    currentHash: string;         // 디스크의 현재 파일 해시
    userModified: boolean;       // contentHash !== currentHash
  }[];
  installedTools: InstallRecord[];
}

interface InstallRecord {
  tool: string;
  version: string;
  method: string;
  installedPaths: string[];      // 생성된 모든 파일/디렉토리
  uninstallCommands: string[];   // 정리용 역방향 명령어
  installedAt: string;
}
```

### 업데이트 플로우

`slaminar update`:
1. 스캐너 재실행
2. 새 ProjectSnapshot을 저장된 profileHash와 비교
3. 변경 사항 식별 (새 의존성, 새 테스트 프레임워크)
4. 영향받는 섹션만 업데이트 (마커 내)
5. 사용자가 마커 섹션을 편집했다면 → diff 표시, 덮어쓰기 전 확인
6. lock.json 갱신

`slaminar update --full`은 완전 재생성을 강제합니다.

## 롤백 / 정리

```bash
slaminar remove <tool>      # 특정 도구 제거 + config/lock 갱신
slaminar uninstall           # 모든 것 제거, slaminar 이전 상태로 복원
slaminar retry               # 실패한 설치 재시도
```

### 제거 플로우

1. state.json 읽기 → 모든 생성 파일과 설치 기록 확인
2. 제거/복원될 내용 표시
3. 확인 후:
   - `.slaminar/.bk/`에서 백업 파일 복원
   - 백업 없는 slaminar 생성 파일 삭제
   - 도구 제거 (`uv tool uninstall`, `claude plugin remove` 등)
   - `.slaminar/` 디렉토리 제거
4. 프로젝트가 slaminar 이전 상태로 복원

## CI/CD 통합

### 검증 명령어

```bash
slaminar check --ci          # 비대화형, 머신 가독 출력
```

종료 코드:
- 0: 모두 유효하고 최신
- 1: 경고 (CLAUDE.md 약간 오래됨)
- 2: 오류 (깨진 참조, 잘못된 plugin.json)

### Pre-commit 훅 (선택)

```bash
slaminar hook install        # git pre-commit 훅 설치
```

의존성 파일 변경 시 (package.json, pyproject.toml, Cargo.toml) CLAUDE.md가 갱신되지 않으면 경고. 안내 수준 (블로킹 아님, `--strict` 사용 시 블로킹).

### GitHub Actions 템플릿

```bash
slaminar ci-setup            # .github/workflows/slaminar-check.yml 생성
```

## CLI 인터페이스 (전체)

```bash
# 핵심 파이프라인
slaminar                       # = slaminar init (현재 디렉토리)
slaminar init [path]           # 전체: scan → analyze → recommend → plan → generate → place → verify
slaminar setup                 # 온보딩: 기존 팀 설정으로 세팅 (analyze/recommend 생략)
slaminar update [path]         # 증분 업데이트 (변경 섹션만)

# 개별 단계
slaminar scan [path]           # 스캔만 (ProjectSnapshot JSON)
slaminar analyze [path]        # 스캔 + 분석 (ProjectProfile JSON)
slaminar recommend [path]      # 추천 도구 표시
slaminar recommend --propose   # 팀 리뷰용 제안 생성

# 도구 관리
slaminar add <tool>            # 팀 설정에 도구 추가 + 설치
slaminar add <tool> --personal # 본인만 설치
slaminar remove <tool>         # 특정 도구 제거
slaminar retry                 # 실패한 설치 재시도

# 카탈로그
slaminar catalog update        # 생태계 카탈로그 최신화
slaminar catalog list          # 카탈로그 조회
slaminar catalog search <q>    # 도구 검색

# 검증 및 헬스 체크
slaminar validate              # 생성 파일 유효성 검증
slaminar health                # 전체 헬스 체크
slaminar check --ci            # CI 검증 (비대화형, 종료 코드)

# 롤백
slaminar restore [file]        # 특정 파일 백업에서 복원
slaminar uninstall             # 모든 것 제거, slaminar 이전 상태 복원

# CI/CD
slaminar hook install          # pre-commit 훅 설치
slaminar ci-setup              # CI 설정 생성

# 유틸리티
slaminar status                # 현재 프로젝트 상태 테이블
slaminar team-status           # 팀 전체 세팅 상태
slaminar report                # 최근 보고서 재표시
slaminar report --history      # 모든 보고서 목록
slaminar diff [file]           # 현재 vs 생성본 비교

# 글로벌 플래그
--dry-run                      # 미리보기만, 쓰기 없음
--verbose                      # 상세 출력
--json                         # 머신 가독 JSON 출력
```

## Claude Code 스킬

트리거: `/slaminar` 또는 "이 프로젝트에 Claude Code 세팅해 줘"

워크플로우:
1. 현재 프로젝트 디렉토리 감지
2. CLI를 통해 `slaminar init` 실행 (팀 설정 존재 시 `slaminar setup`)
3. 대화형으로 결과 표시
4. 사용자 승인 → 적용
5. 검증 보고서 표시

## 설정

### 팀 설정 (`.slaminar/config.json` — 커밋 대상)

```typescript
interface TeamConfig {
  slaminarVersion: string;           // 최소 호환 버전
  excludeAuthTools: boolean;         // 기본: true
  fileCountCap: number;              // 기본: 10000
  approvedTools: string[];           // 팀 합의 도구 목록
  catalogVersion: string;            // 고정된 카탈로그 해시
}
```

### 로컬 설정 (`.slaminar/config.local.json` — gitignore 대상)

```typescript
interface LocalConfig {
  aiMode: "local" | "ai" | "auto";  // 기본: "auto"
  personalTools: string[];           // 본인만 설치한 도구
  apiKey?: string;                   // AI 모드용
}
```

## 확장된 디렉토리 구조

```
src/
├── cli.ts
├── core/
│   ├── pipeline.ts
│   ├── scanner.ts
│   ├── analyzer.ts
│   ├── recommender.ts
│   ├── planner.ts
│   ├── generator.ts
│   ├── placer.ts
│   ├── verifier.ts              # NEW: 7단계 — 배치 후 검증
│   └── updater.ts               # NEW: 증분 업데이트 로직
├── scanner/
│   ├── file-tree.ts
│   ├── git-info.ts
│   ├── ai-files.ts
│   └── package-info.ts
├── analyzer/
│   ├── language-detector.ts
│   ├── structure-mapper.ts
│   ├── convention-extractor.ts
│   ├── dependency-analyzer.ts
│   └── maturity-detector.ts     # NEW: Greenfield 감지
├── recommender/
│   ├── catalog.ts
│   ├── matcher.ts
│   └── installer.ts
├── generator/
│   ├── claude-md.ts
│   ├── claude-plugin.ts
│   └── ai-provider.ts
├── placer/
│   ├── backup.ts
│   ├── merger.ts
│   ├── writer.ts
│   └── markers.ts               # NEW: 소유권 마커 관리
├── runtime/
│   ├── detector.ts
│   ├── uv.ts
│   ├── volta.ts
│   └── prerequisite.ts
├── validator/
│   ├── claude-md.ts             # NEW: CLAUDE.md 콘텐츠 검증
│   ├── plugin-schema.ts         # NEW: plugin.json 스키마 검증
│   └── health.ts                # NEW: 헬스 체크 오케스트레이터
├── team/
│   ├── config.ts                # NEW: 팀/로컬 설정 관리
│   ├── lock.ts                  # NEW: Lock 파일 관리
│   ├── setup.ts                 # NEW: 팀 온보딩
│   └── propose.ts               # NEW: 추천 제안
├── ci/
│   ├── check.ts                 # NEW: CI 검증 모드
│   ├── hook-generator.ts        # NEW: Pre-commit 훅 생성
│   └── action-template.ts       # NEW: GitHub Actions 템플릿
├── reporter/
│   ├── terminal.ts              # NEW: 실시간 터미널 테이블 (chalk + cli-table3)
│   ├── markdown.ts              # NEW: .slaminar/reports/*.md 생성
│   └── progress.ts              # NEW: 단계별 프로그레스 바 + 요약 라인
├── rollback/
│   ├── uninstaller.ts           # NEW: 전체 제거
│   └── remover.ts               # NEW: 개별 도구 제거
├── skill/
│   └── SKILL.md
├── types/
│   └── index.ts
└── config/
    └── defaults.ts
```

## 기술 스택

- TypeScript (ESM)
- Node.js >= 18
- commander (CLI 프레임워크)
- @anthropic-ai/sdk (AI 모드, 선택적)
- vitest (테스트)

## 참고 프로젝트 의존성

- **sincenety 패턴**: CLI + Skill 하이브리드, AI 프로바이더 라우팅, commander CLI 구조
- **mdmizer를 테스트 대상으로**: 2,555줄 CLAUDE.md, .serena/, React SPA — 분석기의 좋은 테스트 케이스

## 제약 조건

- 생성되는 모든 결과물에 외부 서버 인증 불필요
- 생성된 모든 플러그인/스킬은 로컬 도구만 사용
- 로컬 모드에서 오프라인 동작 가능
- 모든 파일 수정 전 백업 필수
- 모든 파일 배치 전 사용자 승인 필수
- 부분 실패 격리: 한 도구 실패가 다른 도구를 블로킹하지 않음
- 모든 파괴적 작업은 --dry-run 지원
