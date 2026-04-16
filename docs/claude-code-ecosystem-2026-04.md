# Claude Code Ecosystem — Research Report

> **Researched:** 2026-04-16
> **Purpose:** slaminar 카탈로그 확장 후보 + 생태계 전반 참고 자료
> **Previous:** [`claude-code-ecosystem.md`](./claude-code-ecosystem.md) (2026-04-14, 1차 조사)

이 문서는 slaminar v0.1.0 게시 이후 진행한 **2차 생태계 조사** 결과입니다. 2026년 4월 기준 활발한 Claude Code 플러그인/스킬/도구를 카테고리별로 정리하고, slaminar 카탈로그에 추가할 Top 10 후보를 점수화하여 제시합니다.

---

## 1. 현재 slaminar 카탈로그 (v0.1.0 내장 · 14개)

| # | 이름 | 카테고리 | 설치 | Auth | 기본 추천 대상 |
|---|------|---------|------|------|---------------|
| 1 | **caveman** | skill | marketplace | ❌ | 전체 (토큰 절약) |
| 2 | **planning-with-files** | skill | npx | ❌ | 전체 (계획 수립) |
| 3 | **impeccable** | skill | marketplace | ❌ | 프론트엔드 (UI 디자인) |
| 4 | **playwright-skill** | skill | marketplace | ❌ | 프론트엔드 (브라우저 테스트) |
| 5 | **get-shit-done** | skill | npx | ❌ | CLI (스펙 기반) |
| 6 | **claude-mem** | plugin | npx | ❌ | 장기 프로젝트 (메모리) |
| 7 | **graphify** | skill | pip | partial | 대형 코드베이스 (지식 그래프) |
| 8 | **cartographer** | plugin | marketplace | ❌ | 대형 코드베이스 (매핑) |
| 9 | **trailofbits/skills** | skill | marketplace | ❌ | 보안 민감 |
| 10 | **everything-claude-code** | plugin | git-clone | ❌ | 전체 (성능 최적화) |
| 11 | **claude-hud** | plugin | marketplace | ❌ | 장기/팀 (모니터링) |
| 12 | **homunculus** | plugin | marketplace | ❌ | 장기 (패턴 학습) |
| 13 | ⛔ claude-octopus | plugin | marketplace | ✅ | 자동 제외 (테스트용) |
| 14 | ⛔ call-me | plugin | marketplace | ✅ | 자동 제외 (테스트용) |

---

## 2. 신규 발굴 도구 (30+)

### 🌟 공식 / 메타 마켓플레이스

| 이름 | GitHub | Stars | 설치 | Auth | 비고 |
|------|--------|:-----:|------|:----:|------|
| **wshobson/agents** | [link](https://github.com/wshobson/agents) | ~33K | marketplace | ❌ | 멀티에이전트 오케스트레이션, 75 plugin pack |
| **davila7/claude-code-templates** | [link](https://github.com/davila7/claude-code-templates) | — | npx | ❌ | Claude Code 템플릿 CLI (가장 인기) |
| **rohitg00/awesome-claude-code-toolkit** | [link](https://github.com/rohitg00/awesome-claude-code-toolkit) | 1.2K | git-clone | ❌ | 135 agents + 35 skills + 42 commands + 176 plugins |
| **ComposioHQ/awesome-claude-plugins** | [link](https://github.com/ComposioHQ/awesome-claude-plugins) | — | git-clone | ❌ | 232+ 플러그인 큐레이션 + CCHub 앱 |
| **jeremylongshore/claude-code-plugins-plus-skills** | [link](https://github.com/jeremylongshore/claude-code-plugins-plus-skills) | 1.9K | CCPI pkg mgr | ❌ | 340 plugins + 1367 skills |

### 🛠️ 언어/프레임워크 공식 & 전문

| 이름 | 언어/프레임워크 | 설치 | Auth | 비고 |
|------|--------------|------|:----:|------|
| **laravel/agent-skills** | PHP/Laravel | git-clone | ❌ | Laravel 공식 |
| **laravel/claude-code** | PHP/Laravel | composer | ❌ | Laravel 공식 CC 통합 |
| **obie/claude-on-rails** | Ruby/Rails | git-clone | ❌ | Rails 전용 SuperClaude 스타일 |
| **lucianghinda/superpowers-ruby** | Ruby/Rails | git-clone | ❌ | Ruby core skills |
| **apollographql/skills** | GraphQL | git-clone | ❌ | Apollo 공식 |
| **supabase/agent-skills** | Supabase | git-clone | partial | DB 조작은 로컬, Supabase 계정 별개 |
| **Nice-Wolf-Studio/claude-code-supabase-skills** | Supabase | git-clone | partial | Supabase API 전반 |
| **rafaelkamimura/claude-tools** | Python/FastAPI | git-clone | ❌ | FastAPI + 46 agents |

### 🏗️ DevOps / IaC / 인프라

| 이름 | 도메인 | 설치 | Auth | 비고 |
|------|-------|------|:----:|------|
| **antonbabenko/terraform-skill** | Terraform/OpenTofu | git-clone | ❌ | Terraform 커뮤니티 리더 제작 |
| **ahmedasmar/devops-claude-skills** | DevOps 일반 | git-clone | ❌ | 스킬 마켓플레이스 |
| **akin-ozer/cc-devops-skills** | DevOps | git-clone | ❌ | 실무용 DevOps 팩 |
| **lgbarn/devops-skills** | AWS/Terraform | git-clone | ❌ | safety-first IaC |

### 🔒 보안 / Pentest

| 이름 | 도메인 | 설치 | Auth | 비고 |
|------|-------|------|:----:|------|
| **Eyadkelleh/awesome-claude-skills-security** | Pentest/Bug bounty | git-clone | ❌ | SecLists + payloads + pentest agents |
| **transilienceai/communitytools** | Pentest | git-clone | ❌ | 23 skills + 8 agents, 풀 lifecycle |
| **Stickman230/claude-pentest** | Offensive | git-clone | ❌ | 공격형 pentest |
| **Krait (zealynx)** | Web3/Solidity | git-clone | ❌ | Solidity + Rust/Solana 감사 |

### 📦 멀티언어 / 범용

| 이름 | 특징 | 설치 | Auth | 비고 |
|------|-----|------|:----:|------|
| **Piebald-AI/claude-code-lsps** | 20+ 언어 LSP | marketplace | ❌ | TS/Rust/Go/Java/Ruby 정적 분석 |
| **0xfurai/claude-code-subagents** | 100+ subagents | git-clone | ❌ | 프로덕션급 |
| **github/spec-kit** | Spec-Driven Dev | npx | ❌ | GitHub 공식 `/speckit-plan` 등 |
| **giuseppe-trisciuoglio/developer-kit** | Java/TS/Python/PHP/AWS | marketplace | ❌ | 다국어 백엔드 |
| **Jeffallan/claude-skills** | 다영역 | git-clone | ❌ | DevOps engineer + api-designer 등 |

### 🎯 팀 / 워크플로우

| 이름 | 특징 | 설치 | Auth | 비고 |
|------|-----|------|:----:|------|
| **aj-geddes/claude-code-bmad-skills** | BMAD Method | git-clone | ❌ | 9 전문 에이전트 SDLC |
| **PabloLION/bmad-plugin** | BMAD 30+ skills | marketplace | ❌ | 플러그인화 |
| **levnikolaevich/claude-code-skills** | Full lifecycle | marketplace | ❌ | hex-line/graph/ssh MCP |
| **mhattingpete/claude-skills-marketplace** | Git/테스트/리뷰 | git-clone | ❌ | 경량 |

---

## 3. ⭐ slaminar 카탈로그 Top 10 추천

### 점수 기준 (각 10점 만점)

| 기준 | 가중치 | 설명 |
|------|:------:|------|
| 인기/채택도 | 25% | Stars, 다운로드, 언급 빈도 |
| Auth-Free 순수성 | 20% | 외부 인증 불필요 정도 |
| 도메인 커버리지 | 20% | 새로운 도메인/언어 보강 여부 |
| 유지보수 활성도 | 15% | 최근 커밋, 이슈 응답 |
| 설치 단순성 | 10% | marketplace > npx > git-clone 순 |
| 기존 카탈로그 보완성 | 10% | 중복 없이 빈 곳 채움 |

### Top 10

| 순위 | 도구 | 점수 | 주요 보완 영역 |
|:----:|------|:----:|--------------|
| 1 | **wshobson/agents** | 9.4 | 멀티에이전트 오케스트레이션 (대형 프로젝트) |
| 2 | **Piebald-AI/claude-code-lsps** | 9.2 | 20+ 언어 LSP (정적 분석) |
| 3 | **antonbabenko/terraform-skill** | 9.0 | IaC/DevOps 갭 |
| 4 | **davila7/claude-code-templates** | 8.9 | 프로젝트 부트스트랩 (초심자) |
| 5 | **laravel/agent-skills** | 8.7 | PHP/Laravel 언어 커버리지 |
| 6 | **obie/claude-on-rails** | 8.6 | Ruby/Rails 언어 커버리지 |
| 7 | **apollographql/skills** | 8.5 | GraphQL 도메인 |
| 8 | **github/spec-kit** | 8.5 | Spec 기반 개발 (planning-with-files 시너지) |
| 9 | **0xfurai/claude-code-subagents** | 8.3 | 세밀한 도메인 커버리지 확장 |
| 10 | **Eyadkelleh/awesome-claude-skills-security** | 8.1 | trailofbits 보완 (실전 pentest) |

### 차점 (아쉽게 탈락)

- **BMAD 스킬군** — 훌륭하지만 팀 워크플로우 지향이라 개인 개발자 카탈로그 우선순위 낮음
- **rohitg00 toolkit** — 방대하지만 "메타 카탈로그"라 slaminar와 역할 중복
- **supabase/agent-skills** — 강력하지만 Supabase 프로젝트 특화로 범용성 낮음

### 제외 (auth 필요 또는 범위 밖)

- MongoDB 공식 Agent Skills — Atlas 로그인 필요
- Apollo Router/Cloud 연동 스킬 — 별도 인증
- connect-apps (500+ 서비스) — OAuth 필수

---

## 4. 전략 권장사항

### 4.1 카탈로그 확장 방향

**현재 상태 평가:**
- 도메인 중립적 도구가 중심 (caveman, planning-with-files 등)
- 언어별 전문 도구 부족
- DevOps/인프라 영역 공백

**확장 우선순위:**
1. **언어 축 확장** — Laravel, Rails, Apollo 추가 → PHP/Ruby/GraphQL 생태계 진입
2. **인프라 축 확장** — Terraform, LSP 추가 → DevOps/정적 분석 강화
3. **오케스트레이션 축** — wshobson/agents 추가 → 대형 프로젝트 대응력

### 4.2 카탈로그 섹션 신설 제안

현재 카탈로그는 플랫(flat) 구조. 향후 버전에서 섹션화 고려:

```
catalog/
├── universal/          (caveman, planning-with-files, everything-claude-code)
├── by-language/
│   ├── typescript/     (impeccable, playwright-skill)
│   ├── python/         (rafaelkamimura/claude-tools)
│   ├── php/            (laravel/agent-skills)
│   └── ruby/           (obie/claude-on-rails)
├── by-domain/
│   ├── security/       (trailofbits, Eyadkelleh)
│   ├── devops/         (terraform-skill, devops-skills)
│   └── graphql/        (apollographql/skills)
├── by-scale/
│   ├── small/          (caveman)
│   ├── medium/         (planning-with-files)
│   └── large/          (graphify, cartographer, wshobson/agents)
└── meta/               (Piebald-AI/LSPs, spec-kit)
```

### 4.3 Auth 필요 도구 처리

- **완전 auth-free**: 기본 포함 (14개 중 12개)
- **partial auth** (API 사용 시 선택적): "partial" 태그로 별도 표시 (graphify, supabase 등)
- **full auth** (OAuth/서비스 계정 필수): 카탈로그 제외, 문서에만 언급

### 4.4 메타 마켓플레이스 취급

아래 저장소는 "카탈로그의 카탈로그" 성격이므로 slaminar에 직접 등록하지 않고 문서로만 링크:

- `ComposioHQ/awesome-claude-plugins` (232+ 목록)
- `jeremylongshore/claude-code-plugins-plus-skills` (340+ 목록, CCPI 패키지 매니저)
- `hesreallyhim/awesome-claude-code` (최대 커뮤니티 목록)

---

## 5. 반영 시나리오별 계획

### A. v0.2.0 (minor, 전체 확장)

- Top 10 모두 카탈로그 추가 → 14개 → 24개
- scorer에 언어별/도메인별 매칭 규칙 추가
- 섹션화 구조 도입 (4.2 제안)
- README 카탈로그 섹션 전면 갱신
- 신규 테스트 케이스 10+

**예상 작업량:** 하루 분량

### B. v0.1.1 (patch, 보수적)

- Top 5만 추가 (wshobson, LSPs, terraform, templates, Laravel)
- 플랫 구조 유지
- 언어 매칭 규칙만 소폭 확장

**예상 작업량:** 반나절 분량

### C. 문서만 갱신 (no release)

- 이 문서만 최신화
- 사용자가 직접 설치 명령어 보고 선택
- slaminar 코어는 다음 기능 개발에 집중

---

## 6. 출처

**공식 / 마켓플레이스:**
- [anthropics/claude-plugins-official](https://github.com/anthropics/claude-plugins-official)
- [ComposioHQ/awesome-claude-plugins](https://github.com/ComposioHQ/awesome-claude-plugins)
- [jeremylongshore/claude-code-plugins-plus-skills](https://github.com/jeremylongshore/claude-code-plugins-plus-skills)
- [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code)

**Top 10 리뷰 기사:**
- [Top 10 Claude Code Plugins 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-claude-code-plugins)
- [Top Claude Skills DevOps (Pulumi)](https://www.pulumi.com/blog/top-8-claude-skills-devops-2026/)
- [Top Claude Skills Cybersecurity (Snyk)](https://snyk.io/articles/top-claude-skills-cybersecurity-hacking-vulnerability-scanning/)

**개별 프로젝트:**
- [wshobson/agents](https://github.com/wshobson/agents)
- [davila7/claude-code-templates](https://github.com/davila7/claude-code-templates)
- [Piebald-AI/claude-code-lsps](https://github.com/Piebald-AI/claude-code-lsps)
- [antonbabenko/terraform-skill](https://github.com/antonbabenko/terraform-skill)
- [laravel/agent-skills](https://github.com/laravel/agent-skills)
- [obie/claude-on-rails](https://github.com/obie/claude-on-rails)
- [apollographql skills (blog)](https://www.apollographql.com/blog/apollo-skills-teaching-ai-agents-how-to-use-apollo-and-graphql)
- [github/spec-kit](https://github.com/github/spec-kit)
- [0xfurai/claude-code-subagents](https://github.com/0xfurai/claude-code-subagents)
- [Eyadkelleh/awesome-claude-skills-security](https://github.com/Eyadkelleh/awesome-claude-skills-security)
- [supabase/agent-skills](https://github.com/supabase/agent-skills)
- [aj-geddes/claude-code-bmad-skills](https://github.com/aj-geddes/claude-code-bmad-skills)
- [rohitg00/awesome-claude-code-toolkit](https://github.com/rohitg00/awesome-claude-code-toolkit)

---

_이 문서는 조사 시점(2026-04-16) 스냅샷입니다. 도구별 stars/활성도는 시간이 지나면 변할 수 있으니 추가/제거 결정 시 최신 상태를 재확인해 주세요._
