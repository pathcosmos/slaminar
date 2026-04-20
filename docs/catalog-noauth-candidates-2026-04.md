# Claude Code — 설치/인증 가벼운 카탈로그 후보

> **기준:** 추가 가입·API 토큰·OAuth 없이, 로컬 설치(npm/npx/pip/uvx/git-clone/skill copy/단일 바이너리)만으로 Claude Code에서 바로 쓸 수 있는 도구.
> **Source:** 2026-04-20 11-sector 리서치. 274 후보 중 "무인증 + 가벼운 설치" 조건 충족분만 추출.
> **참고:** 이 목록에서 **빠진** 도구들(공식 벤더 MCP, 클라우드 계정 필요, 유료 gated)은 별도 "인증 필요 카탈로그"에 해당하며 좋은 도구임에도 이 문서의 범위 밖입니다.

## 범례

- **Install:** `npm` = `npm -g`, `npx` = 일회성, `skill` = `.claude/skills/` 복사 or `/plugin install`, `clone` = git clone reference, `binary` = 단일 실행파일
- **Note 마커:** ⚙️ 추가 시스템 dep 필요(Java/LibreOffice/Chrome/Docker), ⚠️ 로컬 서비스 따로 띄워야 함(DB/k8s), ★ 강추

---

## Sector 1: Frontend & Web UI (21)

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `vercel-labs/agent-skills` | Vercel 공식 React/Next/컴포지션 패턴 스킬 | `npx skills add vercel-labs/agent-skills` | ★ |
| `vercel/next-devtools-mcp` | Next.js 개발 서버 진단용 MCP (로컬 전용) | `npx add-mcp next-devtools-mcp` | — |
| `shadcn-ui/skills` | shadcn/ui 공식 스킬 + 컴포넌트 registry 워크플로 | skill registry | ★ |
| `Jpisnice/shadcn-ui-mcp-server` | shadcn/ui (React/Svelte/Vue/RN) MCP | `npx @jpisnice/shadcn-ui-mcp-server` | — |
| `masonjames/Shadcnblocks-Skill` | 2,500+ shadcn 블록 컨텍스트 | skill marketplace | ⚠️ <50★ |
| `onmax/nuxt-skills` | Vue / Nuxt / NuxtHub 스킬 | `npx skills add onmax/nuxt-skills` | — |
| `spences10/svelte-skills-kit` | Svelte 5 + SvelteKit 10-스킬 팩 | skill marketplace | — |
| `remix-run/agent-skills` | React Router (Remix) 공식 스킬 | `npx skills add remix-run/agent-skills` | ★ |
| `angular/skills` | Angular 팀 공식 스킬 | `npx skills add https://github.com/angular/skills` | ★ |
| `expo/skills` | Expo 공식 스킬 (UI/data/deploy) | `/plugin marketplace add expo/skills` | ★ |
| `callstackincubator/agent-skills` | React Native 성능/업그레이드 스킬 | plugin | — |
| `SpillwaveSolutions/publishing-astro-websites-agentic-skill` | Astro SSG 종합 스킬 | `git clone` → `~/.claude/skills` | — |
| `DeckardGer/tanstack-agent-skills` | TanStack Query/Router/Start 스킬 | `npx skills add DeckardGer/tanstack-agent-skills` | — |
| `secondsky/claude-skills` | 170 스킬 (Nuxt/Tailwind/shadcn/Three.js) | plugin marketplace | ★ |
| `jezweb/claude-skills` | shadcn/Tailwind/RN/TanStack/Motion 60 스킬 | plugin marketplace | — |
| `blencorp/claude-code-kit` | Next/React/shadcn/Tailwind 자동 활성 킷 | `npx github:blencorp/claude-code-kit` | — |
| `freshtechbro/claudedesignskills` | Three.js/R3F/GSAP/Framer/Pixi 스킬 22종 | plugin marketplace | — |
| `bitjaru/styleseed` | 69 룰 + 48 shadcn + Tailwind4 디자인 시스템 | git clone + `/ss-setup` | — |
| `Community-Access/accessibility-agents` | WCAG 2.2 AA 11 a11y 리뷰 에이전트 | curl installer | ★ |
| `airowe/claude-a11y-skill` | axe-core + jsx-a11y 스킬 | `.claude/skills/` copy | ⚠️ 솔로 |
| `priyankark/lighthouse-mcp` | Lighthouse 성능/a11y/SEO MCP | `npx lighthouse-mcp` | ⚙️ Chrome |

---

## Sector 2: Design / UI-UX / Assets (14)

Figma/Sketch/Canva MCP는 벤더 API 토큰 필요 → 이 문서에서 제외됨.

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `figma/sds` | Figma Simple Design System 레퍼런스 (템플릿) | git clone | — |
| `style-dictionary/style-dictionary` | 크로스 플랫폼 디자인 토큰 빌드 시스템 | `npm style-dictionary` | ★ |
| `tokens-studio/sd-transforms` | Tokens Studio → Style Dictionary 변환기 | `npm` | — |
| `iconify/iconify` | 200k+ 아이콘, 150+ 세트 (공개 데이터) | `npm` | ★ |
| `iconify/tools` | Iconify SVG 임포트/검증/익스포트 | `npm` | — |
| `svg/svgo` | de-facto SVG 최적화 CLI | `npm -g svgo` | ★ |
| `gregberge/svgr` | SVG → React/Native 컴포넌트 | `npm -g @svgr/cli` | ★ |
| `lovell/sharp` | 가장 빠른 Node 이미지 처리 라이브러리 (libvips) | `npm sharp` | ★ |
| `imagemin/imagemin` | 이미지 미니파이어 (jpeg/png/webp/gif) | `npm imagemin` | — |
| `piephai/mcp-image-optimizer` | sharp 기반 로컬 이미지 최적화 MCP | `npm` | — |
| `color-js/color.js` | CSS Color 4 (gamut/deltaE/contrast) | `npm color.js` | — |
| `yctimlin/mcp_excalidraw` | Excalidraw MCP + CC 스킬, 26개 도구 | git clone + npm | ⚠️ Sector 9 중복 |
| `better-auth/better-icons` | 150+ 아이콘 세트 검색 스킬 + MCP | skill + MCP | — |
| `VoltAgent/awesome-claude-design` | 68개 DESIGN.md 디자인 시스템 스캐폴드 | git clone | — |

---

## Sector 3: Backend & APIs (21)

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `oliver-kriska/claude-elixir-phoenix` | Phoenix 20 agents + Iron Laws + Tidewave MCP | `/plugin marketplace add` | ★ |
| `obie/claude-on-rails` | Rails 멀티 에이전트 swarm | `gem 'claude-on-rails'` | ★ |
| `Jeffallan/claude-skills` | 66 풀스택 스킬 (NestJS/Django/FastAPI/Spring/Rails/.NET) | plugin marketplace | ★ 8.4k |
| `VoltAgent/awesome-claude-code-subagents` | 130+ 서브에이전트 (backend/api/graphql/websocket) | marketplace/copy | ★ 17.8k |
| `Aaronontheweb/dotnet-skills` | .NET/ASP.NET/Akka.NET/Aspire 30 스킬 + 5 agents | `/plugin marketplace add` | ★ |
| `managedcode/dotnet-skills` | 157+ .NET 스킬 + CLI | `dotnet tool install -g dotnet-skills` | — |
| `a-pavithraa/springboot-skills-marketplace` | Spring Boot 4 / Java 25 아키텍처 스킬 | `/plugin install` | — |
| `piomin/claude-ai-spring-boot` | Spring Boot 템플릿 + 8 agents | git clone → `.claude/` | — |
| `samber/cc-skills-golang` | Go 40+ human-reviewed 스킬 | `npx skills add` | ★ |
| `maxim-ist/elixir-architect` | Elixir/Phoenix 아키텍처 + ADR + 가드레일 | `/plugin install` | — |
| `nanlong/rust-architect` | Rust (tokio/axum/sqlx) 아키텍처 스킬 | `/plugin install` | ⚠️ <50★ |
| `leonardomso/rust-skills` | 179 Rust 베스트 프랙티스 룰 | `npx add-skill` | — |
| `MakFly/superpowers-symfony` | Symfony 43 스킬 + 4 agents | `/plugin install` | — |
| `atournayre/claude-marketplace` | PHP/Symfony/PHPStan/API Platform 마켓플레이스 | `/plugin marketplace add` | ⚠️ <50★ |
| `netresearch/php-modernization-skill` | PHP 8.x 모더나이제이션 (PHPStan L9+) | `npx skills add` | — |
| `Mindrally/skills` | Express/NestJS/Fastify/Hono/Koa/FastAPI/Django 등 240+ 스킬 | `.claude/skills/` copy | ★ |
| `kjnez/claude-code-django` | Django CC 설정 예시 (15 스킬 + 훅 + GHA) | git clone + copy | — |
| `saaspegasus/django-skills` | Django 에이전트 스킬 (uv/Vite 인식) | marketplace | — |
| `apollographql/skills` | Apollo GraphQL 스킬 (router/server/ops) | `npx skills add` | ★ |
| `hannesj/mcp-openapi-schema` | OpenAPI 스키마 → LLM 노출 (로컬 파일) | `npx mcp-openapi-schema` | — |
| `baryhuang/mcp-server-any-openapi` | OpenAPI 시맨틱 검색/실행 | pip/Docker | — |

---

## Sector 4: Data / Database (7)

**중요:** DB MCP 대다수는 DB 서버나 클라우드 계정이 필요합니다. 이 목록은 **임베디드/로컬 파일 DB**로 바로 돌아가는 것만 포함.

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `tursodatabase/turso` | SQLite 호환 임베디드 DB + `--mcp` 플래그 | `tursodb --mcp` | ★ 파일 DB |
| `Xexr/mcp-libsql` | libSQL MCP (풀링/트랜잭션), CC 전용 설계 | `pnpm -g mcp-libsql` | — |
| `duckdb/duckdb-skills` | 공식 DuckDB CC 플러그인 (attach/query/docs) | `/plugin install duckdb-skills` | ★ 임베디드 |
| `motherduckdb/mcp-server-motherduck` | DuckDB 로컬 모드 MCP (S3도 가능) | `uvx` | ★ (클라우드 옵션만 토큰) |
| `chroma-core/chroma-mcp` | Chroma 벡터 DB MCP (인메모리 가능) | `uvx chroma-mcp` | — |
| `prisma/mcp` | Prisma 로컬 워크플로 MCP (Postgres 연결 필요) | `npx prisma mcp` | ⚠️ DB 따로 |
| `dbt-labs/dbt-mcp` | dbt Core 로컬 프로젝트 MCP | `.mcpb` / `mcpb CLI` | ⚠️ dbt 프로젝트 필요 |

---

## Sector 5: DevOps / Infra / Cloud (2)

**거의 모든 인프라 MCP가 클라우드 계정이 필요해서 제외됨.**

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `hashicorp/terraform-mcp-server` | Terraform 공식 registry/모듈 조회 (public) | `docker run hashicorp/terraform-mcp-server` | ⚙️ Docker; 공개 레지스트리만 무인증 |
| `manusa/podman-mcp-server` | Podman/Docker 컨테이너 런타임 MCP (로컬) | `npx -y podman-mcp-server` | ⚙️ Podman/Docker |

---

## Sector 6: Testing / QA / Security (11)

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `nizos/tdd-guard` | TDD 강제 훅, 8 프레임워크 (Vitest/Jest/pytest 등) | `/plugin install tdd-guard` | ★ |
| `semgrep/mcp-marketplace` | Semgrep 공식 플러그인 (로컬 CLI) | `/plugin marketplace add semgrep/mcp-marketplace` | ⚙️ semgrep 바이너리 |
| `SocketDev/socket-mcp` | 공급망 보안 스코어링 (호스티드 모드 무인증) | `npx @socketsecurity/mcp@latest` | — |
| `aquasecurity/trivy-mcp` | Trivy 로컬 취약점 스캐너 MCP | `trivy plugin install mcp` | ⚙️ trivy |
| `priyankark/lighthouse-mcp` | Lighthouse 감사 MCP | `npx lighthouse-mcp` | ⚙️ Chrome |
| `dtkmn/mcp-zap-server` | OWASP ZAP DAST MCP | `docker-compose up` | ⚙️ Docker |
| `jams4code/cypress-mcp` | Cypress E2E 실행/디버그 MCP | `npx cypress-mcp` | — |
| `@wdio/mcp` | WebdriverIO 공식 MCP (브라우저 + iOS/Android) | `npx @wdio/mcp` | — |
| `angiejones/mcp-selenium` | Selenium WebDriver MCP | `npx @angiejones/mcp-selenium` | — |
| `agamm/claude-code-owasp` | OWASP Top 10 2025 + ASVS 5.0 스킬 | curl installer | — |
| `LambdaTest/agent-skills` | 46 테스트 자동화 스킬 (Jest/pytest/Cypress 등) | `npx skills add LambdaTest/agent-skills` | — |

---

## Sector 7: AI / LLM / Agents (7)

**LLM 제공자 API 키 필요한 SDK/프레임워크는 Claude Code 자체 세션 밖에서는 사용에 인증이 필요하므로 대부분 제외.** 아래는 Claude Code의 기존 인증 스택 내에서 작동하는 인프라/도구만.

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `jlowin/fastmcp` | Pythonic MCP 서버/클라이언트 프레임워크 | `pip fastmcp` | ★ |
| `modelcontextprotocol/python-sdk` | MCP 공식 Python SDK | `pip mcp` | ★ |
| `modelcontextprotocol/registry` | 공식 MCP 레지스트리 (discovery) | Docker / API | ★ |
| `traceloop/openllmetry` | OpenTelemetry 기반 LLM 트레이싱 | `pip / npm` | — |
| `Arize-ai/phoenix` | OSS AI 관측/eval (셀프 호스트) | `pip / Docker` | — |
| `langfuse/langfuse` | OSS LLM 관측 + eval (셀프 호스트) | `Docker / pip / npm` | ⚙️ Docker |
| `promptfoo/promptfoo` | LLM eval + 레드팀 CLI | `npm / CLI` | ★ |

---

## Sector 8: Docs / Technical Writing (25)

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `douinc/mkdocs-mcp-plugin` | MkDocs 저장소 문서 MCP | `uvx mkdocs-mcp-plugin` | — |
| `awslabs/openapi-mcp-server` | OpenAPI → MCP (로컬 스펙 파일) | `uvx` | — |
| `ivo-toby/mcp-openapi-server` | OpenAPI 스펙 → MCP 리소스 | `npx` | — |
| `ckanthony/openapi-mcp` | Swagger/OpenAPI → MCP 도구셋 | `docker` | ⚙️ Docker |
| `Redocly/redoc` | OpenAPI/Swagger 레퍼런스 렌더러 | `npm redoc-cli` | ★ |
| `scalar/scalar` | 모던 API 레퍼런스 + REST 클라이언트 | `npm @scalar/cli` | ★ |
| `TypeStrong/typedoc` | TypeScript 문서 생성기 | `npm typedoc` | ★ |
| `squidfunk/mkdocs-material` | MkDocs Material 테마 (gold standard) | `pip mkdocs-material` | ★ |
| `facebook/docusaurus` | React + Markdown 문서 사이트 | `npm create-docusaurus` | ★ |
| `vuejs/vitepress` | Vite + Vue 정적 문서 | `npm vitepress` | ★ |
| `withastro/starlight` | Astro 기반 문서 스타터 | `npm create-astro starlight` | — |
| `shuding/nextra` | Next.js 기반 정적 문서 | `npm nextra` | — |
| `rust-lang/mdBook` | Rust Markdown 책/문서 생성기 | `cargo / brew` | — |
| `vale-cli/vale` | 마크업 인식 prose 린터 | `brew / choco / go` | ★ |
| `get-alex/alex` | insensitive/inconsiderate writing 캐처 | `npm alex` | — |
| `textlint/textlint` | 플러거블 자연어 린터 | `npm textlint` | — |
| `changesets/changesets` | 버전 + 체인지로그 매니저 | `npm @changesets/cli` | ★ |
| `googleapis/release-please` | 컨벤셔널 커밋 릴리스 PR 자동화 | `npm release-please` | — |
| `conventional-changelog/conventional-changelog` | 컨벤셔널 커밋 → 체인지로그 | `npm` | — |
| `semantic-release/semantic-release` | 자동 버전 관리 + npm 퍼블리시 (dry-run만 무인증) | `npm` | ⚠️ publish는 토큰 필요 |
| `adr/madr` | Markdown ADR 템플릿 | copy template | — |
| `npryce/adr-tools` | ADR CLI (Nygard 포맷) | `brew / git clone` | — |
| `thomvaill/log4brains` | ADR 매니저 + 정적 사이트 퍼블리셔 | `npm log4brains` | — |
| `jeremylongshore/claude-code-plugins-plus-skills` | 25 기술 문서 스킬 번들 | `/plugin marketplace add` | ★ |
| `alirezarezvani/claude-skills` | 235 스킬 마켓플레이스 (엔지니어링/문서/컴플라이언스) | `/plugin marketplace add` | ★ |
| `andronics/claude-plugin-adr` | CC ADR 슬래시 커맨드 + 스킬 | plugin | ⚠️ <50★ |
| `cathy-kim/skill-semver` | Semver + CC 스킬용 체인지로그 자동 | MCP / skill | ⚠️ 솔로 |
| `s2005/markdown-linter-fixer-skill` | markdownlint-cli2 자동 수정 스킬 | skill copy | — |

---

## Sector 9: Presentation / Slides / Diagrams (28)

**이 섹터가 무인증 밀도가 가장 높습니다 — 대부분 로컬 CLI.**

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `hakimel/reveal.js` | HTML 프레젠테이션 프레임워크 | `npm / git clone` | ★ |
| `mermaid-js/mermaid-cli` | Mermaid 공식 CLI (SVG/PNG/PDF 렌더) | `npm -g @mermaid-js/mermaid-cli` | ★ |
| `veelenga/claude-mermaid` | Mermaid MCP + 라이브 리로드 + CC 스킬 | `/plugin install` | ★ |
| `hustcc/mcp-mermaid` | AI-driven Mermaid MCP (SVG/PNG/base64) | `npm / docker / npx` | — |
| `terrastruct/d2` | 모던 다이어그램 스크립팅 언어 | `install.sh / go install` | ★ |
| `infobip/plantuml-mcp-server` | PlantUML MCP (URL + encode/decode + save) | `npx plantuml-mcp-server` | ⚙️ Java |
| `yuzutech/kroki` | 통합 다이어그램 API (PlantUML/Mermaid/D2 등 30+) | `Docker` | ⚙️ Docker |
| `graphviz` | 원조 다이어그램 엔진 (dot CLI) | `brew / apt` | ★ |
| `mingrammer/diagrams` | Python 클라우드 아키텍처 다이어그램 DSL | `pip diagrams` | ⚙️ graphviz |
| `excalidraw/excalidraw-mcp` | 공식 Excalidraw MCP (로컬/hosted) | `npx @drawio/mcp` | — |
| `yctimlin/mcp_excalidraw` | 26-도구 Excalidraw MCP + CC 스킬 | git clone + npm | ★ |
| `coleam00/excalidraw-diagram-skill` | Excalidraw 다이어그램 + Playwright 검증 | `.claude/skills/` | ⚙️ Playwright |
| `jgraph/drawio-mcp` | 공식 draw.io MCP + CC 스킬 (10k+ shape) | `npx @drawio/mcp` / skill | ★ |
| `bassimeledath/tldraw-render-mcp` | 헤드리스 tldraw 렌더러 MCP | `npm` | ⚠️ <50★ |
| `likec4/likec4` | DSL + 툴체인 (C4 라이브 아키텍처) | `npx likec4 start` | — |
| `holistics/dbml` | DB 마크업 언어 + ER 다이어그램 CLI | `npm -g @dbml/cli` | — |
| `mfontanini/presenterm` | 터미널 Markdown 슬라이드 (이미지/코드/PDF) | `brew / cargo` | ★ |
| `maaslalani/slides` | 터미널 Markdown 프레젠테이션 도구 | `brew / go install` | — |
| `MartenBE/mkslides` | Markdown → reveal.js 슬라이드 | `pip mkslides` | — |
| `FormidableLabs/spectacle` | React/JSX 프레젠테이션 라이브러리 | `npm spectacle` | — |
| `jgm/pandoc` | 유니버설 마크업 컨버터 (md/rst/latex/docx/pdf) | `brew / pkg` | ★ |
| `quarto-dev/quarto-cli` | 사이언티픽 퍼블리싱 (docs/대시보드/슬라이드/PDF) | installer | ★ |
| `posit-dev/skills` | Posit 공식 CC 스킬 (Quarto / alt-text / brand) | `npx skills add posit-dev/skills` | — |
| `tfriedel/claude-office-skills` | PPTX/DOCX/XLSX/PDF 스킬 | `.claude/skills/` copy | ⚙️ LibreOffice/Pandoc |
| `tristan-mcinnis/pptx-from-layouts-skill` | 실제 슬라이드 마스터로 PPTX 생성 | `.claude/skills/` | — |
| `zarazhangrui/frontend-slides` | 단일 파일 애니메이션 HTML 슬라이드 | `/plugin marketplace add` | — |
| `gitbrent/PptxGenJS` | 프로그래매틱 PPTX 생성 라이브러리 | `npm pptxgenjs` | — |
| `antvis/mcp-server-chart` | AntV 25+ 차트 타입 MCP | `npx @antv/mcp-server-chart` | — |
| `typpo/quickchart` | Chart.js 기반 차트 이미지 API | `Docker / hosted` | ⚙️ Docker (호스티드는 무인증) |
| `observablehq/plot` | JS grammar-of-graphics 라이브러리 | `npm @observablehq/plot` | — |
| `vega/vega` + `vega-lite` | 비주얼라이제이션 grammar + CLI | `npm -g vega-cli vega-lite` | — |
| `charmbracelet/vhs` | 터미널 GIF/MP4/WebM 코드로 녹화 | `brew / go install` | ★ README 데모용 |
| `asciinema/asciinema` | 터미널 세션 녹화/스트리밍/재생 | `cargo / pkg` | — |
| `ManimCommunity/manim` | Python 수학적 애니메이션 엔진 | `pip / docker` | ⚙️ 무거움 |

---

## Sector 10: Planning / PM / Specs (14)

이슈 트래커(Linear/Jira/GitHub/Notion/Todoist/Trello) MCP는 벤더 계정 필요 → 제외.

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `github/spec-kit` | GitHub 공식 spec-driven dev 툴킷 | `uv tool install specify-cli` | ★ 89.5k★ |
| `Fission-AI/OpenSpec` | Spec-driven dev 경량판 (25+ 도구) | `npm -g @fission-ai/openspec` | ★ 41.4k★ |
| `eyaltoledano/claude-task-master` | PRD를 태스크 그래프로 파싱 | `claude mcp add task-master-ai -- npx -y task-master-ai` | ★ 26.6k★ |
| `mattpocock/skills` | 20+ 개발 워크플로 스킬 (PRD/이슈/triage) | `npx skills@latest add mattpocock/skills/[skill]` | ★ 16.6k★ |
| `phuryn/pm-skills` | 100+ PM 스킬 (discovery→전략→실행→성장) | `claude plugin marketplace add phuryn/pm-skills` | ★ 10.3k★ |
| `bmad-code-org/BMAD-METHOD` | 9-specialized-agent Agile AI 개발 메서드 | `npx bmad-method install --tools claude-code` | ★ 45.2k★ |
| `buildermethods/agent-os` | 코드베이스 표준 + 스펙-워크플로 (Plan Mode 인핸서) | install script | — |
| `gotalab/cc-sdd` | Kiro-style spec (요구→설계→태스크→impl) 17 스킬 | `npx cc-sdd@latest` | — |
| `Pimzino/claude-code-spec-workflow` | 요구→설계→태스크→impl + 버그픽스 워크플로 | `npm -g @pimzino/claude-code-spec-workflow` | — |
| `shinpr/claude-code-workflows` | 프로덕션 개발 워크플로 | `/plugin marketplace add` | — |
| `jamesrochabrun/skills` | PRD 제너레이터 포함 24 스킬 | `/plugin install prd-generator@skills-marketplace` | — |
| `anombyte93/prd-taskmaster` | 엔지니어 포커스 PRD 스킬 (Taskmaster 페어링) | git clone → `~/.claude/skills/` | — |
| `marcusgoll/Spec-Flow` | 품질 게이트 + 토큰 예산이 있는 spec-driven 파이프라인 | `npx spec-flow init` | — |
| `eyalzh/kanban-mcp` | 멀티 세션 AI용 MCP 칸반 메모리 (SQLite + WIP 제한) | MCP config | — |
| `albertnahas/teamclaude` | 자율 스프린트 플러그인 + 회고 + velocity | `claude plugin marketplace add` | ⚠️ <50★ |
| `MadeByTokens/claude-brainstorm` | 훅 강제 브레인스토밍 모드 (SCAMPER, Six Hats) | marketplace | — |

---

## Sector 11: Claude Code Meta / Productivity (22)

| Tool | 1-line | Install | Note |
|------|--------|---------|------|
| `hesreallyhim/awesome-claude-code` | 캐노니컬 CC 스킬/훅/커맨드/플러그인 리스트 | git clone reference | ★ 39.8k★ |
| `VoltAgent/awesome-claude-code-subagents` | 130+ 개발 라이프사이클 서브에이전트 | git clone → `.claude/agents/` | ★ 17.8k★ |
| `blader/humanizer` | AI 글쓰기 특유의 톤 제거 스킬 | skill | ★ 14.6k★ |
| `ryoppippi/ccusage` | 로컬 JSONL 기반 CC/Codex 사용량 + 비용 CLI | `npm ccusage` | ★ 13.1k★ |
| `alirezarezvani/claude-skills` | 232+ 스킬 + 에이전트 플러그인 | git clone → `.claude/skills/` | ★ 12.0k★ |
| `travisvn/awesome-claude-skills` | 큐레이티드 스킬 레지스트리 | git clone reference | — |
| `parcadei/Continuous-Claude-v3` | 컨텍스트 관리 훅 + ledger + 격리 서브에이전트 컨텍스트 | git clone + hooks | — |
| `disler/claude-code-hooks-mastery` | PreToolUse/PostToolUse/etc. 훅 마스터 레퍼런스 | git clone reference | ★ |
| `Haleclipse/CCometixLine` | Rust CC 상태라인 (git/model/cost/context) | `cargo / binary` | — |
| `disler/claude-code-hooks-multi-agent-observability` | 멀티 에이전트 훅 이벤트 실시간 대시보드 | git clone + hooks | — |
| `rohitg00/awesome-claude-code-toolkit` | 메가 카탈로그 (135 agents / 35 skills / 176+ plugins / 20 hooks) | git clone reference | ★ |
| `yohey-w/multi-agent-shogun` | 사무라이 테마 tmux 기반 멀티 CC 오케스트레이션 | git clone + shell | ⚙️ tmux |
| `kamranahmedse/claude-statusline` | 미니멀 상태라인 | `npm / script` | — |
| `wesm/agentsview` | 로컬 퍼스트 세션 인텔리전스 (ccusage 100배 빠른 대체) | `npm / binary` | — |
| `daymade/claude-code-skills` | 프로덕션 레디 스킬 마켓플레이스 | git clone → `.claude/skills/` | — |
| `obra/superpowers-marketplace` | 큐레이티드 CC 플러그인 마켓플레이스 | plugin marketplace | ★ |
| `0xfurai/claude-code-subagents` | 100+ 프로덕션 레디 개발 서브에이전트 | git clone → `.claude/agents/` | — |
| `ccplugins/awesome-claude-code-plugins` | 큐레이티드 플러그인/커맨드/서브에이전트/훅 리스트 | git clone reference | — |
| `JuliusBrussee/cavekit` | Blueprint → 병렬 빌드 플랜 → 멀티 모델 peer-review | plugin | — |
| `rz1989s/claude-code-statusline` | 비용 추적 + MCP 인식 상태라인 + 테마 | `npm / script` | — |
| `starbaser/ccproxy` | CC 요청 인터셉트/훅 + 커스텀 모델 라우팅 | `binary + hooks` | — |
| `karanb192/claude-code-hooks` | 유용한 CC 훅 copy-paste 라이브러리 | git clone snippets | — |
| `viveknair/ccoutputstyles` | CC output-style 커스터마이징 CLI + 갤러리 | `npm ccoutputstyles` | — |

---

## 통계

- **무인증 + 가벼운 설치 후보:** 172 / 274 (전체의 63%)
- **섹터별 편차가 큰 이유:**
  - 무인증 높음: Sector 9 (슬라이드/다이어그램, 대부분 로컬 CLI), Sector 8 (문서, 대부분 npm/pip), Sector 11 (CC 메타, 대부분 skill/git-clone)
  - 무인증 낮음: Sector 4 (DB, 대부분 DB 서버 필요), Sector 5 (인프라, 클라우드 계정 필요), Sector 7 (AI, LLM 키 필요)
- **제외된 대표 분류:**
  - 벤더 공식 MCP (GitHub/Atlassian/Notion/Linear/Cloudflare/AWS/Azure/GCP 등) → 별도 "인증 카탈로그" 문서 필요
  - 보안 SaaS (Snyk/GitGuardian/Sentry/Datadog) → 가치는 높지만 계정 필요
  - LLM 제공자 SDK (Anthropic/OpenAI/Vertex/Bedrock) → API 키 필요

## 다음 단계 제안

1. 이 목록에서 **가장 자주 쓸 Top 20**을 뽑아 slaminar 카탈로그에 먼저 편입
2. "인증 필요" 카탈로그는 별도 문서로 분리 (동일 274 세트 중 나머지 102개)
3. `⚙️` (시스템 dep) 마커 붙은 것들은 프로젝트의 런타임 감지 결과(Node/Python/Rust/Docker 유무)에 따라 조건부 추천
