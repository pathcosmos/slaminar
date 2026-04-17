# slaminar 커스텀 카탈로그 작성 가이드

> slaminar의 기본 카탈로그 대신 또는 함께 사용할 수 있는 **커스텀 카탈로그 JSON**을 작성하는 방법. 회사 내부 도구만 추천받기, 특정 스택(예: presentation 파이프라인)에만 맞는 도구 큐레이션, 개인 북마크 관리 등의 용도. 이 문서를 끝까지 읽으면 최소 카탈로그를 5분 안에 만들고, 운영 환경에서도 부족함 없이 쓸 수 있는 수준까지 각 필드의 의미를 이해하게 됩니다.

## 1. 카탈로그란?

slaminar의 카탈로그는 `recommend`/`init`이 "이 프로젝트에 어떤 Claude Code 도구를 설치하면 좋은지" 판단할 때 후보군으로 삼는 **JSON 문서**입니다. 각 도구의 설치 방법, 필요한 런타임, 매칭 태그, 성숙도 적합성이 적혀 있습니다.

**공식 카탈로그 vs 커스텀 카탈로그**

- **공식 카탈로그** — `pathcosmos/slaminar` 레포의 `catalog/catalog.json`(현재 56개 도구). HTTPS로 실시간 fetch되며, 실패 시 번들된 스냅샷으로 폴백합니다.
- **커스텀 카탈로그** — 사용자가 작성하는 JSON. 공식 카탈로그와 **병합(extend)** 하거나 아예 **대체(replace)** 할 수 있습니다. v0.8부터는 여러 소스를 우선순위로 쌓는 federation 구조입니다.

**커스텀이 필요한 전형적 시나리오**

1. **회사 화이트리스트** — 승인된 도구만 팀원에게 추천되어야 하는 보안 정책.
2. **특수 도메인 큐레이션** — 예: Markdown-to-PPTX 파이프라인 구축용 `python-pptx`/`md2pptx`/`marp`/`slidev` 같은 presentation 스택만 뽑아둔 카탈로그. 공식 카탈로그에는 있지만 우선순위/태그를 다르게 주고 싶을 때.
3. **개인 북마크** — 내가 자주 쓰는 skill/plugin을 한 군데 모아두고 `slaminar init`을 돌릴 때마다 후보에 포함시키기.

## 2. 5분 튜토리얼 — 최소 카탈로그 만들기

동작하는 **가장 작은 카탈로그 JSON**입니다. 이대로 저장하고 등록하면 즉시 `slaminar catalog list`에 잡힙니다.

```json
{
  "version": "1.0.0",
  "minSlaminarVersion": "0.8.5",
  "updatedAt": "2026-04-17",
  "tools": [
    {
      "name": "my-favorite-tool",
      "repo": "me/my-favorite-tool",
      "category": "skill",
      "description": "한 줄 설명",
      "authRequired": false,
      "networkRequired": "none",
      "installMethod": "git-clone",
      "installCommands": ["git clone https://github.com/me/my-favorite-tool"],
      "prerequisites": [],
      "tags": ["personal"],
      "maturityFit": ["greenfield", "early", "growing", "mature"]
    }
  ],
  "suggestions": [],
  "relations": []
}
```

저장 → local file 등록 → 즉시 반영 확인:

```bash
mkdir -p ~/.catalogs/personal
# 위 JSON을 ~/.catalogs/personal/tools.json 으로 저장

slaminar catalog source add file://~/.catalogs/personal/tools.json \
  --scope user --mode extend --name personal

slaminar catalog source list          # personal 소스가 목록에 보이는지
slaminar catalog list | grep my-favorite-tool  # 머지 결과에 포함됐는지
```

v0.8.5 이전에는 로컬 파일이 HTTP fetch만 시도하다 실패했지만, v0.8.5부터는 `fetchLocalCatalog()`가 추가되어 **완전 오프라인으로 로컬 JSON을 읽습니다**. `~/`, `./`, 절대경로 모두 정상 처리됩니다.

## 3. 완전한 JSON 스키마

정답 소스는 `src/types/index.ts`의 `RemoteCatalog` / `CatalogTool` / `CatalogSuggestion` / `ToolConflict` 타입입니다. 아래 표는 거기서 그대로 옮긴 것입니다.

### 3.1 루트 필드 (`RemoteCatalog`)

| 필드 | 타입 | 필수 | 설명 | 예시 |
|---|---|:-:|---|---|
| `version` | string | Y | 이 카탈로그 자체의 semver | `"1.0.0"` |
| `minSlaminarVersion` | string | Y | 이 카탈로그가 요구하는 최소 slaminar 버전 | `"0.8.5"` |
| `updatedAt` | string | Y | ISO 8601 날짜 또는 날짜시간 | `"2026-04-17"` 또는 `"2026-04-17T18:00:00Z"` |
| `tools` | `CatalogTool[]` | Y | 도구 배열 | `[...]` |
| `suggestions` | `CatalogSuggestion[]` | Y(빈 배열 가능) | 아직 정식 추가 전 후보 | `[]` |
| `relations` | `ToolConflict[]` | Y(빈 배열 가능) | 도구 간 synergy/overlap/conflict | `[]` |

검증기(`validateCatalogSchema()`)가 실제로 체크하는 필수 3종은 `version`/`minSlaminarVersion`/`tools`(배열)입니다. 하지만 downstream에서 `suggestions`/`relations`를 반복 순회하므로 빈 배열이라도 꼭 넣어두는 것이 안전합니다.

### 3.2 `CatalogTool` 필드 (도구 한 개)

| 필드 | 타입 | 필수 | 설명 |
|---|---|:-:|---|
| `name` | string | Y | 고유 식별자. kebab-case 권장. 다른 레이어와 이름이 겹치면 **priority가 높은 쪽이 승리** |
| `repo` | string | Y | `owner/repo` 형식 또는 전체 URL |
| `category` | string | Y | `plugin` \| `skill` \| `hook` \| `agent` \| `workflow` |
| `description` | string | Y | 한 문장 설명. reports/terminal 테이블에서 그대로 노출 |
| `authRequired` | boolean | Y | 외부 인증(API key 등) 필요 여부. `true`이고 `excludeAuthTools` 기본값이 켜져 있으면 자동 제외 |
| `networkRequired` | string | Y | `none` \| `partial` \| `full` |
| `installMethod` | string | Y | `marketplace` \| `npx` \| `git-clone` \| `pip` |
| `installCommands` | `string[]` | Y | 순서대로 실행할 쉘 명령 |
| `prerequisites` | `string[]` | Y | 런타임 요구사항. 예: `["python>=3.10"]`, `["node>=18"]` |
| `tags` | `string[]` | Y | 스코어러가 매칭에 쓰는 태그. 예: `["typescript", "testing"]` |
| `maturityFit` | `ProjectMaturity[]` | Y | `greenfield` \| `early` \| `growing` \| `mature` 중 적용되는 값들 |
| `deprecated` | boolean | N | deprecation 표시 |
| `deprecatedReason` | string | N | 왜 deprecate됐는지 |
| `lastVerified` | string | N | 최근 검증 날짜 (ISO) |
| `replacedBy` | string | N | 후임 도구의 `name` |

### 3.3 `CatalogSuggestion` 필드 (미래 후보)

아직 공식 추가 전이지만 추적 중인 도구를 표시합니다. `recommend`는 이 목록을 후보군으로 직접 쓰지 않지만 report에 나타납니다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|:-:|---|
| `name` | string | Y | 후보 도구 이름 |
| `repo` | string | Y | `owner/repo` |
| `description` | string | Y | 한 문장 설명 |
| `reason` | string | Y | 왜 추적 중인지 |
| `addedAt` | string | Y | 목록에 추가한 날짜 |
| `matchTags` | `string[]` | Y | 매칭 태그 |
| `status` | string | Y | `evaluating` \| `approved` \| `rejected` |

### 3.4 `ToolConflict` 필드 (relations)

도구 쌍 간의 관계를 선언합니다. 공식 카탈로그에도 `["slidev", "marp"]`처럼 같은 카테고리의 중복 도구에 대한 overlap 관계가 등록되어 있습니다.

| 필드 | 타입 | 필수 | 설명 |
|---|---|:-:|---|
| `tools` | `[string, string]` | Y | 정확히 두 개의 도구 이름 |
| `relation` | string | Y | `synergy` \| `overlap` \| `conflict` |
| `resolution` | string | Y | 해석 방법 설명 (report에 노출) |
| `winner` | string | N | `overlap`/`conflict` 시 우선시할 도구 이름 |

## 4. 실전 패턴

### 4.1 Local file 기반 (단독 개발자)

- 경로: `~/.catalogs/...` 또는 `~/projects/my-catalog.json`
- 등록:
  ```bash
  slaminar catalog source add file://~/.catalogs/personal/tools.json \
    --scope user --mode extend --name personal
  ```
- v0.8.5의 `fetchLocalCatalog()` 덕분에 완전 오프라인 동작. `file://` 스킴, `~/` 홈 확장, `./` 상대경로, 절대경로를 모두 정규화합니다.
- 장단점: 빠르고 private하지만 팀 공유는 안 됨.

### 4.2 Team 저장소 기반 (회사 공유)

- GitHub repo에 `catalogs/team.json`을 커밋해 두고 raw URL을 등록:
  ```bash
  slaminar catalog source add \
    https://raw.githubusercontent.com/acme/slaminar-catalog/main/tools.json \
    --scope project --mode extend --name acme-team
  ```
- `--scope project`이면 `.slaminar/config.json`에 기록되어 git에 커밋됩니다. 팀원은 clone 후 `slaminar init`만 하면 자동으로 같은 소스를 쓰게 됩니다.

### 4.3 Security allowlist (`replace` 모드)

승인된 도구만 추천되게 잠그고 싶을 때:

```bash
slaminar catalog source add file:///etc/company/approved-tools.json \
  --scope project --mode replace --priority 300 --name security-allowlist
```

`replace` 모드는 **자기보다 낮은 priority의 모든 레이어를 무효화**합니다. 공식 카탈로그도 포함. 단, bundled 스냅샷(`-1`)은 resolver 폴백용으로 남습니다.

### 4.4 `github:` shorthand (v0.8.0+)

`https://raw.githubusercontent.com/...`을 일일이 치기 귀찮으면 shorthand를 쓸 수 있습니다.

```
github:owner/repo/path/to/catalog.json
```

내부적으로 `https://raw.githubusercontent.com/owner/repo/main/path/to/catalog.json`으로 변환됩니다 (브랜치는 항상 `main`으로 고정).

## 5. Extend vs Replace 모드 선택

- **extend** (기본) — 공식 + 내 것 모두 병합. 같은 `name`이면 priority가 높은 쪽이 이깁니다. **대부분의 경우 이것.**
- **replace** — 공식을 포함해 자신보다 낮은 priority 레이어를 전부 무시. 보안 allowlist, 엄격한 제한 환경 시 사용. bundled fallback은 여전히 동작하므로 "완전히 0에서 시작"은 아닙니다.

**v0.8의 priority 스택** — 같은 이름의 도구가 여러 소스에 있으면 아래 표의 숫자가 큰 쪽이 이깁니다.

| Priority | Scope | 어디에 저장 |
|---:|---|---|
| `-1` | bundled | 바이너리 내부 폴백 |
| `0` | official | 기본 공식 카탈로그 |
| `100` | user | `~/.config/slaminar/defaults.json` |
| `200` | project | `.slaminar/config.json` (git-committed) |
| `500` | env | `SLAMINAR_CATALOG_SOURCES` 환경변수 |
| `999` | cli | `--catalog <url>` flag |

`--priority` 옵션으로 레이어의 기본 priority를 덮어쓸 수 있습니다. 예: 같은 project scope 안에서 security allowlist를 company 카탈로그보다 위에 두려면 `--priority 300`.

## 6. 검증

### 6.1 스키마만 검증 (저장 X)

```bash
slaminar catalog source test file:///tmp/my-catalog.json
slaminar catalog source test https://example.com/catalog.json
slaminar catalog source test github:me/my-catalog/main/catalog.json
```

통과 시 tools 개수 + version이 출력됩니다. 실패 시 어느 필드가 누락됐는지 표시됩니다 (validator는 `version`/`minSlaminarVersion`/`tools` 세 개를 필수로 봅니다).

### 6.2 추가 후 실효 확인

```bash
slaminar catalog source list                    # 내 소스가 목록에 있는지, priority 순서는 맞는지
slaminar catalog list | grep my-favorite-tool   # 실제로 머지돼서 나오는지
slaminar recommend ~/my-project                  # 프로젝트 맥락에서 실제로 추천되는지
```

추천 결과에 안 잡힌다면 보통 `tags`/`maturityFit`이 프로젝트 프로필과 매칭되지 않아서입니다. `slaminar recommend --verbose`로 스코어링 이유를 확인하세요.

## 7. 호스팅 옵션 비교

| 방법 | 장점 | 단점 | 언제 |
|---|---|---|---|
| Local file (`file://`) | 오프라인, private, 외부 의존 0 | 팀 공유 X | 단독 개발자, 실험 |
| GitHub raw URL | 무료, 버전 관리, PR 리뷰 | public repo 필요 (또는 token 설정) | 팀 공유 |
| `github:` shorthand | URL보다 짧음 | `main` 브랜치 고정, v0.8.0+ 필요 | 동일 |
| Static HTTP server | 사내 망 제어 가능 | 인프라 필요, TLS/인증 설정 | 엔터프라이즈 |
| Private npm package | — | 미지원 | (계획 없음) |

## 8. 버전 관리와 deprecation

### 8.1 카탈로그 `version` bump 규칙

- 도구 추가 → **minor** bump (`1.0.0` → `1.1.0`)
- 도구 제거 또는 스키마 breaking change → **major** bump (`1.x` → `2.0.0`)
- description/tags만 수정 → **patch** (`1.0.0` → `1.0.1`)

`minSlaminarVersion`은 쓴 필드/동작이 어느 slaminar 버전부터인지 정확히 기입하세요. 예를 들어 로컬 파일 소스에 의존한다면 `"0.8.5"` 이상.

### 8.2 도구 deprecation 흐름

- 바로 지우지 말고 먼저 `deprecated: true` + `deprecatedReason`을 달아 한 릴리스 공지
- 후임이 있으면 `replacedBy: "new-tool-name"`
- 다음 major에서 실제 제거

이 패턴은 기존 팀원이 이미 설치한 도구가 어느 날 갑자기 사라져 당황하는 일을 막습니다.

## 9. 트러블슈팅

### "Remote catalog does not match expected schema"
- JSON 구조가 틀렸음. 먼저 `slaminar catalog source test <uri>`로 확인
- `version`/`minSlaminarVersion`/`tools` 세 필수 필드 누락 여부 점검

### "fetch failed" / `ENOENT`
- local file 경로 오타: `~` 확장이 안 됐거나, 상대경로 기준이 예상과 다름 (cwd 기준으로 resolve됨)
- `file://` 스킴은 슬래시 3개: `file:///home/user/x.json` — 호스트 자리가 비어 있어야 함. `file://~/x.json`처럼 슬래시 2개 + `~`도 정규화해 줍니다.

### 권한 문제
- local file 읽기: 퍼미션 최소 `0644`
- 홈 디렉토리 밖 경로는 실행 유저 권한 확인

### Cache가 갱신 안 됨
- remote 카탈로그는 기본 24h TTL 캐시. 내용 바꿨는데 안 보이면 `slaminar catalog update --force`.
- local 파일은 캐시하지 않고 매번 읽으므로 해당 없음.

### `replace` 모드인데 공식 도구가 계속 나옴
- `--priority`를 낮게 주지 않았는지 확인. `replace` 레이어보다 높은 priority에 공식 카탈로그가 있는 건 불가능하지만, 더 높은 priority에 다른 extend 레이어가 남아 있을 수 있습니다. `slaminar catalog source list`로 전체 스택 점검.

## 10. 참고

- 공식 카탈로그 (56개 도구, 최신 예시): `catalog/catalog.json`
- 도구별 상세 설명: `docs/catalog-tools-reference.md`
- federation 설계 문서: `docs/superpowers/specs/2026-04-16-custom-catalog-plan.md`
- CLI 명령 레퍼런스: README의 "Catalog Federation (v0.8+)" / "Catalog Management" 섹션
- 스키마 원본: `src/types/index.ts` (`RemoteCatalog`, `CatalogTool`, `CatalogSuggestion`, `ToolConflict`)
- Local fetch 동작: `src/recommender/catalog-remote.ts` → `fetchLocalCatalog()` (v0.8.5)
