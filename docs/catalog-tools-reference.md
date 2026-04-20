# slaminar 카탈로그 — 도구 레퍼런스

> slaminar의 기본 카탈로그(`catalog/catalog.json`)에 등록된 도구들을 "무엇이고 언제 쓰나"의 관점에서 설명하는 큐레이션 인덱스입니다. 카탈로그 JSON에 들어가는 구조적 메타데이터(필드 스키마, 설치 명령)는 `docs/catalog-authoring-guide.md`를 보세요.

## 이 문서의 범위 (v0.8.5)

v0.8.5에서 이 문서는 **presentation 카테고리 10개를 모두 상세 기술**하고, 기존 다른 카테고리는 **대표 도구 1개씩**만 샘플로 채웠습니다. 나머지 도구의 상세 설명은 점진적으로 추가됩니다.

카테고리별 커버리지:

- 완전: Presentation (10/10) ← NEW v0.8.5
- 대표만: Token/Performance, Planning, Frontend, Testing, Memory, Analysis, Security, Quality, Team, Multi-Agent, DevOps, Database, Framework, Onboarding, Monitoring (각 1개씩)

전체 카탈로그 규모는 2026-04-17 기준 56개 도구이며, 이 문서는 그중 25개 전후를 다룹니다. 상세 항목이 없는 도구들도 `catalog.json`에는 완전한 메타데이터가 들어 있어 `slaminar init`의 추천 엔진은 정상 작동합니다.

## 목차

- [Presentation (10)](#presentation) ← NEW v0.8.5
- [Token/Performance](#tokenperformance)
- [Planning](#planning)
- [Frontend](#frontend)
- [Testing](#testing)
- [Memory](#memory)
- [Analysis](#analysis)
- [Security](#security)
- [Quality](#quality)
- [Team](#team)
- [Multi-Agent](#multi-agent)
- [DevOps](#devops)
- [Database](#database)
- [Framework](#framework)
- [Onboarding](#onboarding)
- [Monitoring](#monitoring)
- [TODO — 이후 릴리스에서 확장](#todo--이후-릴리스에서-확장)

---

## Presentation

slaminar v0.8.5에서 새로 추가된 presentation 스택입니다. Markdown/PDF/HTML을 `.pptx`로 변환하거나, 반대로 슬라이드를 이미지·PDF로 추출하는 파이프라인을 구성하는 도구들입니다.

### python-pptx

**한 줄 요약**: Python-native OOXML PowerPoint 생성 라이브러리.

**사용 시점**: 프로그래밍적으로 `.pptx`를 직접 만들어야 할 때 — 슬라이드별 이미지 삽입, 표 동적 구성, 엔터프라이즈 리포트 자동화, Python 데이터 파이프라인의 최종 단계로 슬라이드 deliverable을 내보내는 경우.

**설치**: `pip install python-pptx`

**선행조건**: Python ≥ 3.8

**예시 워크플로**: pandas/matplotlib로 데이터 시각화 → python-pptx로 슬라이드 구성 → Playwright 또는 PyMuPDF로 PNG 썸네일 export → 압축 리포트 패키지.

**관련 도구**: md2pptx(Markdown 프런트엔드), pymupdf(슬라이드 썸네일 생성).

**비고**: slaminar 자체 presentation 파이프라인의 **코어 스택**. 오픈소스·경량·Python-native의 세 가지를 동시에 만족해서 채택됨. 셰이프·표·이미지·차트 같은 원시 OOXML 구성요소를 직접 조작하므로 러닝 커브는 있지만, Markdown 컨버터들이 이 라이브러리를 내부적으로 깔고 쓰므로 이해해 두면 디버깅이 쉬워집니다.

### md2pptx

**한 줄 요약**: Markdown을 PowerPoint로 변환, python-pptx 기반.

**사용 시점**: Markdown 원본이 이미 있고 이를 슬라이드로 발행할 때 — 사내 위키 페이지, RFC 문서, 릴리스 노트를 임원 보고용 `.pptx`로 바꿔야 하는 경우. 텍스트·헤딩·리스트 중심의 슬라이드 덱에 적합.

**설치**: `pip install md2pptx`

**선행조건**: Python ≥ 3.11

**예시 워크플로**: `docs/release-notes.md` → `md2pptx release-notes.md release-notes.pptx` → 사내 공유.

**관련 도구**: python-pptx(md2pptx가 내부에서 사용).

**비고**: 성숙하고 안정적. 코드 블록·다이어그램 처리는 단순한 편이라 텍스트-우선 변환기라는 점을 기억. 설치 방식은 v0.9.6 감사에서 `pip` → `git-clone`으로 교정 (PyPI 패키지가 아님).

<!-- powerpointer section removed in v0.9.6: catalog's `krisvdm/powerpointer`
returned 404 on GitHub and no verifiable alternative owner was found. The
catalog description (mistune + python-pptx + 2026-04 release) did not match
the two candidate repos surfaced by search. See CHANGELOG v0.9.6. -->

### pymupdf

**한 줄 요약**: MuPDF의 Python 바인딩. 고성능 PDF 처리 라이브러리.

**사용 시점**: `.pptx` 또는 `.pdf`를 대량의 PNG/JPEG로 변환해야 할 때 — 슬라이드 썸네일 생성, OCR 파이프라인 입력 준비, 미리보기 이미지 서버. pdftoppm 대비 **10-20배 빠름**.

**설치**: `pip install pymupdf`

**선행조건**: Python ≥ 3.9

**예시 워크플로**: python-pptx로 생성한 `deck.pptx` → LibreOffice/headless로 PDF 변환 → pymupdf로 각 페이지를 PNG export → 웹 UI에 썸네일 전송.

**관련 도구**: pdf2image(기능 중복, 더 가볍지만 느림), python-pptx(상류 단계).

**비고**: **AGPL 라이선스**. 상용 폐쇄 소스 프로젝트에서는 Artifex 상용 라이선스를 구매하거나 pdf2image로 대체해야 합니다. 이 라이선스 트레이드오프가 pymupdf vs pdf2image 선택의 핵심입니다.

### pdf2image

**한 줄 요약**: Poppler의 `pdftoppm`을 Python으로 감싼 래퍼.

**사용 시점**: PDF 페이지를 PIL Image로 바꿔야 하고, AGPL 라이선스를 피하고 싶을 때. 의존성이 가볍고 Poppler가 시스템 표준 패키지라 서버 환경에서 안정적.

**설치**: `pip install pdf2image`

**선행조건**: Python ≥ 3.7, `poppler-utils` 시스템 패키지 (`apt install poppler-utils` / `brew install poppler`).

**예시 워크플로**: CI에서 PR이 수정한 슬라이드 PDF를 체크아웃 → pdf2image로 페이지 이미지 dump → Git LFS로 미리보기 스냅샷 업로드.

**관련 도구**: pymupdf(성능 우위 대안, AGPL), python-pptx(PDF 생성 전 단계).

**비고**: 속도는 pymupdf의 5-10% 수준이지만 **라이선스 자유(MIT)**. 작은 PDF·낮은 해상도·상용 코드베이스에 적합.

### playwright

**한 줄 요약**: 크로스브라우저 자동화 + HTML → PDF 렌더링 엔진.

**사용 시점**: HTML/CSS로 작성한 슬라이드(예: reveal.js, Slidev)를 **고품질 PDF로 export**해야 할 때. 2026 벤치마크에서 Chrome Headless와 Puppeteer를 cold/warm 지연, 출력 크기 모두에서 앞지름.

**설치**:

```bash
npm install -D @playwright/test
npx playwright install chromium
```

**선행조건**: Node ≥ 18

**예시 워크플로**: Slidev/reveal.js로 `slides/` 빌드 → `playwright`로 각 슬라이드 HTML → PDF → 최종 병합.

**관련 도구**: slidev·marp·reveal.js(상류 HTML 슬라이드 생성), playwright-skill(카탈로그의 e2e 테스트 스킬, 같은 엔진 재활용).

**비고**: 테스트 러너로 유명하지만 **HTML→PDF 리포트 자동화** 용도가 presentation 카테고리 등록 이유입니다. Chromium 바이너리 약 300MB 다운로드가 초기 비용.

### slidev

**한 줄 요약**: 개발자 친화적 Markdown 기반 프레젠테이션 프레임워크. Vue 3 + Vite.

**사용 시점**: 개발자 컨퍼런스·사내 기술 발표용 슬라이드를 코드처럼 버전관리하고 싶을 때. PPTX/PDF/HTML/동영상 export 모두 지원. Shiki 기반의 구문 강조가 특히 우수.

**설치**: `npm init slidev@latest`

**선행조건**: Node ≥ 18

**예시 워크플로**: `slides.md`에 Vue 컴포넌트 + Markdown 혼용 작성 → `slidev build` → 정적 HTML 배포 또는 `slidev export`로 PDF/PPTX.

**관련 도구**: marp(더 가벼운 CLI 중심 대안), presenton(AI 생성과 조합), playwright(HTML→PDF 단계).

**비고**: 개발자 대상 슬라이드에서 가장 풍부한 표현력. 대신 Vue/Vite를 모르면 커스터마이징 진입 장벽이 있습니다.

### marp

**한 줄 요약**: Markdown 프레젠테이션 생태계 — VS Code 확장 + CLI.

**사용 시점**: VS Code에서 편집 → 실시간 미리보기 → HTML/PDF/PPTX 변환을 한 에디터 안에서 끝내고 싶을 때. 디렉티브 스타일(`<!-- theme: default -->`)의 간결한 설정이 특징.

**설치**: `npm install -g @marp-team/marp-cli`

**선행조건**: Node ≥ 18

**예시 워크플로**: VS Code에서 `slides.md` 작성 → Marp 확장으로 실시간 미리보기 → `marp slides.md --pdf` 또는 `--pptx`.

**관련 도구**: slidev(더 풍부하지만 무거운 대안), reveal.js(HTML 엔진의 원조).

**비고**: Slidev와 자주 비교되지만, slaminar 카탈로그는 **둘 중 하나 고르라고 강제하지 않음**(relations에서 overlap이지만 winner 없음). CLI만으로 충분하면 Marp, Vue 커스터마이즈가 필요하면 Slidev.

### reveal.js

**한 줄 요약**: HTML 프레젠테이션 프레임워크. 가장 성숙한 오픈소스 슬라이드 엔진.

**사용 시점**: 플러그인·테마·커스텀이 극도로 자유로운 HTML 슬라이드가 필요할 때. 장기간 유지되어온 표준이라 온라인 자료와 호환 예제가 가장 많음.

**설치**:

```bash
git clone https://github.com/hakimel/reveal.js.git
cd reveal.js && npm install
```

**선행조건**: Node ≥ 18

**예시 워크플로**: `index.html`에 `<section>` 단위로 슬라이드 작성 → `npm start`로 로컬 서버 → 배포는 정적 사이트(GitHub Pages 등) 또는 playwright로 PDF export.

**관련 도구**: slidev·marp(Markdown 프런트엔드 대안), playwright(PDF export).

**비고**: "raw HTML 슬라이드"의 표준이라 무난하지만, Markdown-first 도구에 비해 작성 속도가 느립니다. 테마·플러그인 생태계가 가장 크다는 점이 채택 이유.

### presenton

**한 줄 요약**: 오픈소스 AI 프레젠테이션 생성기. Gamma·Beautiful.ai의 self-hostable 대안.

**사용 시점**: 프롬프트 또는 업로드 문서에서 **구조화된 슬라이드 초안**을 AI로 생성해야 할 때. 사내 데이터를 외부 SaaS에 올리고 싶지 않은 엔터프라이즈 환경에서 셀프호스팅 가치 큼.

**설치**:

```bash
git clone https://github.com/presenton/presenton
cd presenton && docker compose up
```

**선행조건**: Docker ≥ 20

**예시 워크플로**: 기획 문서 업로드 → presenton이 HTML+Tailwind 템플릿으로 초안 생성 → Slidev로 이관해 세부 다듬기 → playwright로 PDF export.

**관련 도구**: slidev(카탈로그의 synergy — 초안 생성 + polish 파이프라인), python-pptx(PPTX export 내부 의존).

**비고**: 여전히 **early** 성숙도. Docker 운영이 필요해 진입 장벽이 있지만, Gamma류 SaaS의 오픈소스 대체로는 현재 가장 실용적.

---

## Token/Performance

### caveman

**한 줄 요약**: 토큰 사용을 줄이고 장황한 응답을 억제하는 Claude Code 플러그인.

**사용 시점**: 세션 토큰 예산이 빠듯한 팀, Claude Code API 비용이 월 단위로 유의미하게 잡히는 조직, 긴 세션에서 context 포화가 잦은 프로젝트.

**설치**: `/install-plugin caveman`

**선행조건**: 없음 (marketplace 설치)

**예시 워크플로**: 설치 후 즉시 활성 — 모든 `/slaminar init`·일반 Claude Code 질의에서 출력이 자동으로 간결화됨.

**관련 도구**: everything-claude-code(같은 목적의 더 포괄적 베스트 프랙티스 모음, relations에서 overlap으로 기록되고 everything-claude-code가 winner).

**비고**: 가벼운 플러그인이라 설치 비용이 거의 0. 이미 everything-claude-code를 쓰고 있으면 중복이니 둘 중 하나만.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Planning

### spec-kit

**한 줄 요약**: 스펙 주도 개발(spec-driven development)을 위한 구조화된 계획·구현 워크플로 스킬.

**사용 시점**: 기능 착수 전 요구사항·설계를 문서화하고 체크리스트로 관리하며 진행하고 싶을 때. greenfield부터 mature까지 전 성숙도에서 무난하게 쓰임.

**설치**: `npx spec-kit init`

**선행조건**: 없음

**예시 워크플로**: 기능 착수 → `spec-kit`으로 스펙 초안 → 승인 후 구현 → 완료 시 스펙과 diff 재확인.

**관련 도구**: planning-with-files(synergy — 계획과 구현 파일을 같이 관리), get-shit-done(스펙 + 실행 결합).

**비고**: GitHub가 공식 유지. 새 프로젝트의 기본 계획 툴로 안전한 선택.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Frontend

### senior-frontend

**한 줄 요약**: React/Next.js/TypeScript 패턴, 번들 분석, 접근성(a11y) 베스트 프랙티스를 담은 스킬 번들.

**사용 시점**: React·Next.js 중심 프런트엔드에서 컴포넌트 설계 규칙, 번들 사이즈 최적화, WCAG 접근성 체크리스트를 팀 표준으로 강제하고 싶을 때.

**설치**: `/install-plugin senior-frontend`

**선행조건**: 없음

**예시 워크플로**: Next.js 프로젝트에 설치 → Claude Code가 컴포넌트 작성 시 prop 설계·server/client 경계·a11y 속성을 자동 제안.

**관련 도구**: impeccable(synergy — 디자인 시스템 규칙 + React 구현 패턴 조합).

**비고**: growing·mature 성숙도에 가장 효과 큼. greenfield에서는 먼저 컴포넌트 구조가 생긴 뒤 도입 권장.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Testing

### tdd-guard

**한 줄 요약**: TDD 위반 파일 변경을 hook으로 차단해 테스트 우선 개발 워크플로를 강제.

**사용 시점**: 팀이 "테스트 먼저 작성" 규칙을 선언했지만 실제로는 구현 파일만 수정되는 드리프트가 발생할 때. 실패하는 테스트 없이 프로덕션 코드가 바뀌면 hook이 블록.

**설치**: `git clone https://github.com/nizos/tdd-guard.git`

**선행조건**: 없음

**예시 워크플로**: 리팩터 착수 → 대응되는 테스트가 먼저 실패 상태로 존재하는지 hook이 검증 → 없으면 Edit 차단 → 테스트 추가 후 재시도.

**관련 도구**: playwright-skill(synergy — 단위 TDD + e2e 테스트 스펙트럼 보완).

**비고**: early·growing 성숙도에 특히 효과. mature 팀은 이미 CI 레벨에서 동등 규칙이 있을 수 있어 중복 여부 확인.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Memory

### claude-mem

**한 줄 요약**: 장기 세션용 메모리 관리 플러그인. 대화 간 context를 영속화.

**사용 시점**: 여러 날에 걸친 리팩터·마이그레이션처럼 한 세션에서 끝나지 않는 작업을 할 때. Claude가 직전 세션의 의사결정을 기억해야 할 때.

**설치**: `npx claude-mem init`

**선행조건**: Node ≥ 18

**예시 워크플로**: 모놀리스 → 마이크로서비스 마이그레이션 착수 → 매 세션 시작 시 claude-mem이 누적된 결정 로그 주입 → 일관된 방향 유지.

**관련 도구**: everything-claude-code(synergy — 메모리 + 성능 최적화), reporecall(overlap — 세션 메모리 vs 코드베이스 메모리, 대형 프로젝트엔 reporecall이 winner), knowledge-graph(overlap — 가벼운 대안).

**비고**: growing·mature 프로젝트에 적합. greenfield엔 오버헤드가 효용을 넘을 수 있음.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Analysis

### graphify

**한 줄 요약**: 대형 코드베이스용 지식 그래프 빌더. 모듈·심볼 간 관계를 시각화.

**사용 시점**: 100K LOC 이상의 레거시 코드베이스 온보딩, 순환 의존성 탐색, 주요 심볼의 영향 범위 분석. 시각적 그래프가 필요할 때.

**설치**: `pip install graphify`

**선행조건**: Python ≥ 3.10

**예시 워크플로**: 신규 입사 엔지니어가 `graphify scan .` → 모듈 관계 그래프를 브라우저로 탐색 → 핵심 의존성 파악.

**관련 도구**: cartographer(overlap — 작은 코드베이스는 cartographer), reporecall(overlap — 시각화는 graphify, 검색은 reporecall).

**비고**: 네트워크 부분 필요(`networkRequired: "partial"`). 대형 growing·mature 프로젝트에 초점.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Security

### awesome-claude-skills-security

**한 줄 요약**: 보안·침투 테스트용 스킬 모음. 취약점 평가와 안전한 개발.

**사용 시점**: 보안 코드 리뷰, OWASP Top 10 체크, 인증/인가 로직의 설계 검토. 공식 감사(trailofbits/skills)와 조합해 "감사 + pentest" 양면 커버.

**설치**: `git clone https://github.com/Eyadkelleh/awesome-claude-skills-security.git`

**선행조건**: 없음

**예시 워크플로**: 신규 API 엔드포인트 추가 → 스킬이 인증 우회·주입·권한 상승 벡터를 체크리스트로 점검.

**관련 도구**: trailofbits/skills(synergy — 공식 감사 스킬과 pentest 스킬 보완).

**비고**: growing·mature 성숙도. 보안 책임이 명확한 팀에서 효과.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Quality

### vibeguard

**한 줄 요약**: 88개 규칙 + 13개 hook + 14개 에이전트로 구성된 종합 품질 게이트. 실시간 AI 환각(hallucination) 차단.

**사용 시점**: Claude가 존재하지 않는 API·함수를 호출하거나 근거 없는 주장을 코드로 변환할 때 실시간 차단. 전 성숙도에서 사용 가치 있음(early·growing·mature).

**설치**: `git clone https://github.com/majiayu000/vibeguard.git`

**선행조건**: 없음

**예시 워크플로**: Claude가 `someLib.doMagic()` 호출 생성 → hook이 실제 라이브러리에 해당 함수가 없음을 감지 → 변경 차단 + 대안 제안.

**관련 도구**: obey(overlap — 둘 다 hook 기반 품질 강제, vibeguard가 winner), cc-safe-setup(synergy — 간단한 세이프티 hooks + 본격 품질 게이트).

**비고**: 설치 후 초기에는 경고가 많이 뜰 수 있으나 잡음이 아니라 실제 드리프트를 잡는 신호. 룰을 끄기 전에 원인부터 이해 권장.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Team

### oh-my-claudecode

**한 줄 요약**: 팀 우선 오케스트레이션 — 19개 에이전트, 28개 스킬, 소크라틱 질문, N-에이전트 협응.

**사용 시점**: 복수 개발자가 동일 프로젝트에 Claude Code를 사용하며, 역할별(리뷰어/구현자/테스터) 에이전트 분업을 팀 표준으로 쓰고 싶을 때.

**설치**: `git clone https://github.com/Yeachan-Heo/oh-my-claudecode.git`

**선행조건**: 없음

**예시 워크플로**: 팀 리드가 스택 설치 → 각 멤버가 `team-reviewer`·`team-implementer` 등 역할 에이전트 호출 → 소크라틱 질문으로 요구사항 명확화 후 구현.

**관련 도구**: vibe-kanban(overlap — 둘 다 멀티에이전트 팀, 카탈로그는 oh-my-claudecode를 winner로), wshobson/agents(유사 장르).

**비고**: 팀 규모가 3-10명 이상일 때 효용 큼. 솔로 개발자에게는 과함.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Multi-Agent

### wshobson/agents

**한 줄 요약**: 다양한 워크플로용 멀티에이전트 마켓플레이스. 범용 서브에이전트 생태계.

**사용 시점**: 단일 에이전트로는 무거운 작업을 subagent에 분리 위임하고 싶을 때. greenfield부터 mature까지 universal 적용.

**설치**: `/install-plugin wshobson/agents`

**선행조건**: 없음

**예시 워크플로**: 대규모 리팩터 착수 → wshobson의 `refactor-planner` 서브에이전트가 단계별 플랜 → `refactor-executor`가 각 단계 실행 → `verifier`가 회귀 체크.

**관련 도구**: claude-code-subagents(유사 장르), oh-my-claudecode(팀 오케스트레이션).

**비고**: 가장 범용적인 marketplace 에이전트 스택. "일단 하나" 고른다면 안전한 기본값.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## DevOps

### terraform-skill

**한 줄 요약**: Terraform IaC 스킬. 클라우드 리소스 프로비저닝·관리.

**사용 시점**: AWS/GCP/Azure 인프라를 Terraform으로 관리하는 팀. 모듈 작성 규칙·상태 파일 주의사항·plan/apply 흐름을 Claude가 이해하고 생성해야 할 때.

**설치**: `git clone https://github.com/antonbabenko/terraform-skill.git`

**선행조건**: 없음 (Terraform CLI는 별도 설치 전제)

**예시 워크플로**: `infra/` 디렉토리 작업 → Claude가 모듈 분리·변수 노출·backend 설정을 community 베스트 프랙티스로 제안.

**관련 도구**: hashicorp/agent-skills(synergy — 커뮤니티 패턴 + 공식 HashiCorp), devops-claude-skills(synergy — IaC + CI/CD/K8s로 풀 DevOps 라이프사이클).

**비고**: antonbabenko가 유지하는 Terraform 생태계 장기 기여자의 스킬. community 표준과 잘 맞음.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Database

### supabase/agent-skills

**한 줄 요약**: Supabase 공식 스킬. PostgreSQL DB·Auth·Storage·Realtime.

**사용 시점**: Supabase 기반 프로젝트에서 RLS(Row Level Security) 정책, Auth 플로우, Storage 버킷 구성, Realtime 채널을 Claude가 공식 패턴대로 생성해야 할 때.

**설치**: `git clone https://github.com/supabase/agent-skills.git`

**선행조건**: 없음

**예시 워크플로**: 신규 테이블 추가 → 스킬이 RLS 정책 템플릿 + migration SQL + 클라이언트 타입 생성까지 일관된 패턴으로 제안.

**관련 도구**: pg-aiguide(overlap — 둘 다 PostgreSQL, Supabase 사용자는 이 스킬, raw PostgreSQL은 pg-aiguide).

**비고**: 네트워크 부분 필요(`networkRequired: "partial"`). 공식 유지라 Supabase 스펙 변화에 빠르게 대응.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Framework

### developer-kit

**한 줄 요약**: Java/Spring Boot, TypeScript, Python, PHP, AWS를 커버하는 150+ 스킬. CRUD 생성 포함.

**사용 시점**: 다중 언어 백엔드 팀(예: Java 메인 + Python 사이드 서비스 + TypeScript 프런트) 한 곳에서 일관된 스킬을 깔고 쓸 때.

**설치**: `/install-plugin developer-kit`

**선행조건**: 없음

**예시 워크플로**: Spring Boot 엔티티 추가 → 스킬이 Entity → Repository → Service → Controller → 테스트까지 CRUD 전 레이어 생성.

**관련 도구**: laravel/agent-skills(synergy — PHP/Laravel 전용 + 폴리글롯 백엔드 스킬 조합), rafaelkamimura/claude-tools(FastAPI 대안).

**비고**: 이름은 "kit"이지만 실제로는 마켓플레이스 대형 번들. 스킬 수가 많아 초기 추천 노이즈가 있을 수 있음.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Onboarding

### claude-code-templates

**한 줄 요약**: 새 프로젝트를 Claude Code로 빠르게 부트스트랩하는 템플릿 모음.

**사용 시점**: greenfield 프로젝트를 시작할 때 — Claude Code가 즉시 인식하는 `CLAUDE.md`, 적절한 `.gitignore`, 기본 hook을 한 번에 스캐폴드.

**설치**: `npx claude-code-templates init`

**선행조건**: 없음

**예시 워크플로**: `mkdir new-project && cd new-project` → `npx claude-code-templates init` → 언어·프레임워크 선택 → Claude Code ready 프로젝트 생성 → 그 위에 `slaminar init`으로 카탈로그 추천 적용.

**관련 도구**: cc-safe-setup(유사 장르, onboarding 세이프티), slaminar init(slaminar 자체가 템플릿 이후 단계의 분석·추천).

**비고**: greenfield·early 성숙도에서 효용 집중. 이미 설정된 프로젝트엔 불필요.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## Monitoring

### claude-hud

**한 줄 요약**: 토큰 사용량·세션 메트릭·성능을 추적하는 모니터링 대시보드 플러그인.

**사용 시점**: 팀이 Claude Code API 비용을 가시화하고 싶을 때, 개인이 일일 세션에서 어느 컨텍스트에 토큰을 가장 많이 쓰는지 파악하고 최적화하고 싶을 때.

**설치**: `/install-plugin claude-hud`

**선행조건**: Node ≥ 18

**예시 워크플로**: 설치 후 Claude Code 실행 → 상태 창에 실시간 토큰 카운트·세션 길이·모델별 누적 비용 표시 → 주간 리포트로 이상 패턴 발견.

**관련 도구**: caveman(synergy 성격 — 토큰 절감 플러그인과 가시성 결합), everything-claude-code(같은 범주의 베스트 프랙티스 모음).

**비고**: growing·mature 팀에서 비용 통제가 경영 이슈가 될 때 가장 가치 큼.

> _이 카테고리의 나머지 도구들은 후속 릴리스에서 상세 기술 예정 (v0.8.6+)_

---

## TODO — 이후 릴리스에서 확장

아래 도구들에 대한 상세 항목이 누락되어 있습니다. 기여를 환영합니다 — `catalog.json`의 metadata를 베이스로 위 구조(한 줄 요약 / 사용 시점 / 설치 / 선행조건 / 예시 워크플로 / 관련 도구 / 비고)를 채워주시면 됩니다.

### Token/Performance

- everything-claude-code

### Planning

- planning-with-files
- get-shit-done

### Frontend

- impeccable

### Testing

- playwright-skill
- test-kitchen

### Memory

- reporecall
- knowledge-graph

### Analysis

- cartographer

### Security

- trailofbits/skills

### Quality

- obey
- preflight
- moyu
- review-squad

### Team

- vibe-kanban
- ccpm

### Multi-Agent

- claude-code-subagents
- claude-octopus
- homunculus

### DevOps

- hashicorp/agent-skills
- devops-claude-skills
- container-use

### Database

- pg-aiguide

### Framework

- laravel/agent-skills
- claude-on-rails
- apollographql/skills
- rafaelkamimura/claude-tools
- claude-elixir-phoenix

### Onboarding

- cc-safe-setup

### Monitoring

- (추가 도구가 들어올 예정)

### Misc (미분류)

- call-me (notification)
- claude-code-lsps (LSP 통합)

---

## 기여 가이드

이 문서를 확장하고 싶으시면:

1. `catalog/catalog.json`에서 도구의 `description`, `tags`, `prerequisites`, `installCommands`, `relations`를 먼저 확인.
2. 위 구조(7개 필드)를 지켜 해당 카테고리 아래 섹션 추가.
3. 없는 정보를 지어내지 말고 catalog에 있는 것만. 부족하면 "비고"는 생략.
4. 카테고리 끝의 "후속 릴리스에서 상세 기술 예정" 문구 유지.
5. PR 제목에 `docs(catalog-ref): <tool-name>` 규칙 권장.

## 관련 문서

- `catalog/catalog.json` — 구조화된 메타데이터 원본
- `docs/catalog-authoring-guide.md` — 카탈로그 JSON 스키마·필드 규칙
- `docs/getting-started-walkthrough.md` — 사용자 첫 실행 경험
- `README.ko.md` — slaminar 전체 기능 소개 (한국어)
