# MUNI Agent Hub

무늬랩스 직원이 동료가 만든 Copilot Agent를 **찾고, 내 Copilot에 추가하고, 나누는** SharePoint Online 웹 파트입니다.

- 게시된 Agent를 검색하고 '내 Copilot에 추가' 링크로 바로 설치합니다.
- 직접 만든 Agent를 등록 신청하면 운영 담당자가 검토한 뒤 게시합니다.
- 필요한 Agent를 아이디어로 올리고 좋아요로 투표합니다.
- 고객 프로젝트에서 만든 Agent 사례(인사이트)를 공유합니다.

별도 서버나 DB 없이 **SharePoint 목록 5개**에 데이터를 저장합니다.

![SPFx](https://img.shields.io/badge/SPFx-1.23.2-green.svg) ![Node](https://img.shields.io/badge/Node-22.14%2B-blue.svg) ![React](https://img.shields.io/badge/React-17-61dafb.svg)

---

## 목차

1. [화면 구성](#화면-구성)
2. [기술 스택](#기술-스택)
3. [폴더 구조](#폴더-구조)
4. [SharePoint 목록](#sharepoint-목록)
5. [로컬 개발과 테스트](#로컬-개발과-테스트)
6. [빌드와 배포](#빌드와-배포)
7. [웹 파트 설정](#웹-파트-설정)
8. [운영 방법](#운영-방법)
9. [자주 바꾸는 곳](#자주-바꾸는-곳)
10. [알려진 제한과 할 일](#알려진-제한과-할-일)

---

## 화면 구성

| 탭 | 내용 |
|---|---|
| **홈** | Agent 검색, 카테고리 바로가기, 숫자 요약, 많이 쓰는 Agent, 새로 들어온 Agent, 투표 중인 아이디어, 최근 인사이트 |
| **Agent 둘러보기** | 게시된 Agent 카드 목록(검색·카테고리·공식 운영 필터·정렬), 내 등록 신청 현황 |
| **아이디어 보드** | 아이디어 목록과 상태별 개수, 좋아요 투표, 월 업무시간 표시 |
| **인사이트** | 고객 프로젝트 사례(업종·구성 도구 필터) |
| **이용 안내** | 등록 절차, 공유 등급, 아이콘 읽는 법, FAQ |

- **신청서**(Agent 등록, 아이디어 올리기, 사례 올리기)는 화면 가운데 창으로, **상세 보기**(Agent, 사례)는 오른쪽 패널로 열립니다.
- 로고나 홈 탭을 누르면 홈으로 이동하면서 목록 데이터를 다시 읽어 옵니다.
- 주소 끝 해시로 화면을 공유할 수 있습니다. 예: `#agents`, `#agent-12`(Agent 12 상세)
- 라이트/다크 모드를 지원하고, 웹 파트가 놓인 섹션 폭에 맞춰 반응형으로 배치됩니다.

### Agent 아이콘 읽는 법
- **색 = 카테고리**: 리서치, 학습, 인사·총무, 프로젝트, 자동화
- **모양 = 유형**: 원(정보 조회형), 반원(데이터 활용형), 부채꼴(업무 실행형)

---

## 기술 스택

| 항목 | 내용 |
|---|---|
| 프레임워크 | SharePoint Framework (SPFx) 1.23.2, 빌드 도구 Heft |
| UI | React 17 함수형 컴포넌트와 Hooks, SCSS(CSS Modules) |
| 데이터 | SharePoint REST API와 SPFx 기본 `SPHttpClient` (추가 라이브러리 없음) |
| 언어 | TypeScript 5.8 |
| Node | 22.14 이상, 23 미만 |
| 글꼴 | Pretendard (jsDelivr CDN). 차단되면 Segoe UI·맑은 고딕으로 표시 |

---

## 폴더 구조

```
src/webparts/muniAgentHub/
├─ MuniAgentHubWebPart.ts        웹 파트 진입점, 설정 창(사이트·목록 이름·로고·글꼴)
├─ MuniAgentHubWebPart.manifest.json
├─ models/
│  ├─ types.ts                   데이터 타입 (Agent, 신청, 아이디어, 사례, 반응)
│  └─ rules.ts                   화면과 무관한 규칙: 선택지, 위험도 판정, 업무시간 계산, 유사 항목 찾기
├─ services/
│  └─ HubService.ts              SharePoint 목록 읽기/쓰기. 목록과 연동되는 코드는 모두 여기 있음
├─ components/
│  ├─ MuniAgentHub.tsx           최상위 컴포넌트: 데이터 로드, 화면 전환, 좋아요·신청 처리
│  ├─ api.ts                     하위 화면에 내려 주는 공통 동작(IHubApi)
│  ├─ views.tsx                  다섯 개 탭 화면
│  ├─ forms.tsx                  신청서 3종과 입력 검증
│  ├─ details.tsx                Agent 상세(후기 포함), 사례 상세
│  ├─ ui.tsx                     아이콘, 배지, 패널, 알림 등 공통 요소
│  └─ MuniAgentHub.module.scss   전체 스타일 (색 토큰, 다크 모드, 반응형)
├─ assets/                       로고
└─ loc/                          설정 창 문구 (ko-kr, en-us)

config/                          SPFx 빌드·패키지·로컬 서버 설정
teams/                           앱 아이콘
```

`lib/`, `temp/`, `dist/`, `sharepoint/solution/`, `node_modules/`는 빌드 결과물이라 저장소에 올리지 않습니다(`.gitignore`).

---

## SharePoint 목록

웹 파트는 아래 5개 목록을 사용합니다. **sppkg를 설치해도 목록은 자동으로 만들어지지 않으므로** 사이트에 미리 만들어야 합니다.

> ⚠️ **열의 내부 이름(Internal Name)**이 아래와 정확히 같아야 합니다. SharePoint 화면에서 한글 이름으로 열을 만들면 내부 이름이 깨진 문자열이 되므로, 영문 이름으로 만든 뒤 표시 이름만 한글로 바꾸거나 스크립트로 만드세요.
>
> 선택(Choice) 열의 값은 코드의 한글 값과 글자 하나까지 같아야 합니다.

### 1. Agent Catalog — 게시된 Agent

Hub에는 `AgentStatus`가 **게시**인 항목만 보입니다. 운영 담당자만 편집합니다.

| 내부 이름 | 형식 | 값 / 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | Agent 이름 |
| `AgentSummary` | 한 줄 텍스트 | 카드에 보이는 한 줄 소개 |
| `AgentDescription` | 여러 줄 텍스트 | 상세 설명 |
| `AgentCategory` | 선택 | 리서치 / 학습 / 인사·총무 / 프로젝트 / 자동화 |
| `AgentType` | 선택 | 정보 조회형 / 데이터 활용형 / 업무 실행형 |
| `ShareLevel` | 선택 | 직원 공유 / 공식 운영 |
| `RiskTier` | 선택 | 저 / 중 / 고 |
| `DataSources` | 한 줄 텍스트 | 참조하는 데이터 |
| `DataSensitivity` | 선택 | 공개 / 사내 일반 / 기밀·개인정보 |
| `ExternalConnections` | 한 줄 텍스트 | `; `로 구분. 예: `웹 검색; MCP 서버` |
| `InstallLink` | 한 줄 텍스트 | '내 Copilot에 추가' 링크 (https) |
| `AgentOwner` | 사람 | 담당자 |
| `OwnerTeam` | 한 줄 텍스트 | 담당 팀 |
| `ReviewedOn` | 날짜 | 최종 검토일 |
| `SourceIdeaId` | 숫자 | 시작된 아이디어의 ID (선택) |
| `AgentStatus` | 선택 | **게시** / 그 밖의 값(예: 숨김, 정리) |

### 2. Agent Requests — 등록 신청

직원이 '+ Agent 등록'으로 신청한 내용이 쌓입니다. **본인 항목만 읽기·편집**하도록 고급 설정을 권장합니다(운영 담당자는 전체 권한).

| 내부 이름 | 형식 | 값 / 설명 |
|---|---|---|
| `Title`, `AgentSummary`, `AgentDescription`, `AgentCategory`, `AgentType`, `ShareLevel`, `RiskTier`, `DataSources`, `DataSensitivity`, `ExternalConnections`, `InstallLink`, `OwnerTeam` | | Agent Catalog와 같음 |
| `TestConfirmed` | 예/아니요 | 테스트 완료 확인 |
| `TestNote` | 여러 줄 텍스트 | 테스트 메모 |
| `RequestStatus` | 선택 | 검토 중 / 보완 요청 / 승인 / 반려 / 취소 |
| `ReviewerComment` | 여러 줄 텍스트 | 운영 담당자 의견 (보완 요청·반려 시 신청자에게 표시) |
| `PublishedAgentId` | 숫자 | 게시된 Agent Catalog 항목 ID (있으면 'Hub에서 보기' 링크 표시) |

신청자와 신청일은 SharePoint 기본 열(`Author`, `Created`)을 씁니다.

### 3. Idea Board — 아이디어

| 내부 이름 | 형식 | 값 / 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 아이디어 제목 |
| `IdeaSummary` | 한 줄 텍스트 | Agent가 해 줬으면 하는 일 |
| `IdeaPain` | 여러 줄 텍스트 | 지금 겪는 불편 |
| `Frequency` | 선택 | 매일 / 매주 / 매월 / 가끔 |
| `MinutesPerRun` | 숫자 | 한 번 할 때 걸리는 시간(분) |
| `ProposerTeam` | 한 줄 텍스트 | 제안 팀 |
| `IdeaCategory` | 한 줄 텍스트 | 가까운 카테고리 (선택) |
| `IdeaStatus` | 선택 | 아이디어 / 검토 중 / 제작 중 / 등록 완료 |
| `LinkedAgentId` | 숫자 | 만들어진 Agent의 ID (선택) |

### 4. Agent Insights — 고객 프로젝트 사례

**콘텐츠 승인을 켜야** 합니다. 승인 전에는 작성자 본인에게만 보이고 '게시 검토 중'으로 표시됩니다.

| 내부 이름 | 형식 | 값 / 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 사례 제목 |
| `InsightSummary` | 한 줄 텍스트 | 한 줄 요약 |
| `Industry` | 선택 | 공공 / 제조 / 금융 / 유통 / 서비스 |
| `BusinessArea` | 한 줄 텍스트 | 업무 영역 |
| `CustomerType` | 한 줄 텍스트 | 고객사 유형 (실명 금지) |
| `BuiltWith` | 한 줄 텍스트 | 구성 도구, `; `로 구분 |
| `Problem` | 여러 줄 텍스트 | 고객이 겪던 문제 |
| `Solution` | 여러 줄 텍스트 | 해결 방식 |
| `Outcome` | 한 줄 텍스트 | 성과 |
| `Lessons` | 여러 줄 텍스트 | 배운 점 |
| `AuthorTeam` | 한 줄 텍스트 | 작성 팀 |
| `ProjectName` | 한 줄 텍스트 | 프로젝트 이름 |
| `DetailUrl` | 한 줄 텍스트 | 상세 자료 주소 (https) |

### 5. Hub Reactions — 좋아요·후기

좋아요, 후기, 개선 요청을 한 목록에 저장합니다. **본인 항목만 편집**하도록 고급 설정을 권장합니다(좋아요 취소 = 본인 항목 삭제).

| 내부 이름 | 형식 | 값 / 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 자동 입력 (`Agent:12:좋아요` 형식) |
| `TargetType` | 선택 | Agent / Idea |
| `TargetId` | 숫자 | 대상 항목 ID |
| `ReactionKind` | 선택 | 좋아요 / 후기 / 개선 요청 |
| `ReactionBody` | 여러 줄 텍스트 | 후기 내용 |

---

## 로컬 개발과 테스트

### 준비
```powershell
npm install
npx heft trust-dev-cert     # 최초 1회, 로컬 https 인증서 신뢰
```

### 실행 (호스팅된 워크벤치)
```powershell
npm start
```
- 로컬 서버(`https://localhost:4321`)가 뜨고, [config/serve.json](config/serve.json)에 지정된 사이트의 워크벤치가 열립니다.
  `https://munilabskr.sharepoint.com/sites/MuniAgentHub/_layouts/workbench.aspx?debugManifestsFile=...`
- '디버그 스크립트 로드'를 허용한 뒤 **+ > MUNI Agent Hub**로 추가합니다.
- 앱을 설치하지 않아도 **실제 사이트의 목록**을 읽고 씁니다. 테스트 데이터도 실제 목록에 남으니 제목에 `[테스트]`를 붙이고 나중에 지우세요.
- 소스를 저장하면 자동으로 다시 빌드됩니다. 브라우저를 새로고침하면 반영됩니다.
- 끝낼 때는 터미널에서 `Ctrl + C`. 서버는 한 번에 하나만 켜야 합니다(포트 4321 충돌 시 `EADDRINUSE`).

### 실제 페이지에서 테스트 (전체 폭 섹션 등)
테스트용 `.aspx` 페이지 주소 뒤에 아래를 붙여 열면, 설치 없이 페이지 편집기에서 웹 파트를 추가할 수 있습니다.
```
?debug=true&noredir=true&debugManifestsFile=https://localhost:4321/temp/build/manifests.js
```
앱이 설치되지 않은 상태이므로 이 페이지를 **게시하지 마세요.** 다른 사람에게는 웹 파트를 찾을 수 없다는 오류가 보입니다.

---

## 빌드와 배포

### 1. 패키지 만들기
```powershell
npm run build
```
테스트 실행 → 프로덕션 번들 → `sharepoint/solution/muni-agent-hub.sppkg` 생성. JS 파일이 패키지 안에 포함되므로(`includeClientSideAssets`) 별도 CDN 호스팅이 필요 없습니다.

### 2. 앱 카탈로그에 업로드
- **테넌트 앱 카탈로그**(SharePoint 관리자) 또는 **사이트 컬렉션 앱 카탈로그**에 sppkg를 올립니다.
- `skipFeatureDeployment: true`라서 '모든 사이트에서 사용 가능' 옵션을 고를 수 있습니다. 한 사이트에서만 쓰려면 선택하지 않고 해당 사이트에서 **새로 만들기 > 앱**으로 추가합니다.
- API 권한 요청이 없으므로 관리자 API 승인은 필요 없습니다.

### 3. 페이지에 추가
사이트에서 **새로 만들기 > 페이지**(`.aspx`) → 편집 → **+ > 고급 > MUNI Agent Hub**. 커뮤니케이션 사이트라면 **전체 폭 섹션**을 권장합니다.

> `SitePages`에 올린 `.html` 파일에는 웹 파트를 넣을 수 없습니다. 반드시 SharePoint 페이지(`.aspx`)를 사용하세요.

### 업데이트 배포
1. [config/package-solution.json](config/package-solution.json)의 `solution.version`을 올립니다. 예: `1.0.0.0` → `1.0.1.0`
2. `npm run build`
3. 같은 sppkg를 앱 카탈로그에 덮어써서 올립니다. 페이지에 놓인 웹 파트는 설정값을 유지한 채 새 버전으로 바뀝니다.

---

## 웹 파트 설정

페이지 편집 중 웹 파트의 연필 아이콘으로 엽니다. 값을 바꾼 뒤 **적용**을 눌러야 반영됩니다.

| 항목 | 기본값 | 설명 |
|---|---|---|
| 목록이 있는 사이트 주소 | (비움) | 비우면 웹 파트가 놓인 사이트의 목록 사용 |
| 목록 이름 5개 | Agent Catalog 등 | 테스트용 목록을 따로 쓸 때 변경 |
| Hub 머리글 보이기 | 켬 | 로고·탭·등록 버튼 |
| 로고 이미지 주소 | (비움) | 비우면 패키지에 든 무늬랩스 로고 |
| Pretendard 글꼴 불러오기 | 켬 | 회사 정책상 외부 CDN을 막아야 하면 끔 |

---

## 운영 방법

웹 파트에는 승인 화면이 없습니다. **운영 담당자가 SharePoint 목록에서 직접** 처리합니다.

### Agent 게시
1. `Agent Requests`에서 신청을 검토합니다. 위험도별 승인 경로:
   - 저: 운영 담당자 확인 후 게시
   - 중: 거버넌스 승인 후 게시
   - 고: 거버넌스 승인 → 승인권자 승인 후 게시
2. `Agent Catalog`에 새 항목을 만들어 신청 내용을 옮기고 `AgentStatus` = **게시**, `AgentOwner` = 신청자로 지정합니다.
3. 신청 항목의 `RequestStatus` = **승인**, `PublishedAgentId` = 2번에서 만든 항목 ID.

보완이 필요하면 `RequestStatus` = **보완 요청** 또는 **반려**로 바꾸고 `ReviewerComment`에 의견을 적습니다. 신청자 화면에 그대로 보입니다.

### 아이디어
`Idea Board`의 `IdeaStatus`를 아이디어 → 검토 중 → 제작 중 → 등록 완료로 바꿉니다. Agent가 만들어지면 `LinkedAgentId`를 넣어 연결합니다.

### 인사이트
`Agent Insights`에서 고객사 실명·고객 데이터가 없는지 확인한 뒤 콘텐츠 승인을 **승인됨**으로 바꿉니다.

### 오픈 전 체크리스트
- [ ] 목록 5개 생성, 열 내부 이름 확인
- [ ] `Agent Insights` 콘텐츠 승인 켜기
- [ ] `Agent Requests` / `Hub Reactions` 항목 수준 권한 설정
- [ ] 운영 담당자 지정 및 목록 편집 권한 부여
- [ ] 대표 Agent 몇 개를 `Agent Catalog`에 미리 게시
- [ ] 테스트 데이터 삭제

---

## 자주 바꾸는 곳

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 카테고리, 팀, 업종, 구성 도구 등 선택지 | [models/rules.ts](src/webparts/muniAgentHub/models/rules.ts) 상단 상수 (목록의 선택 열 값도 같이 변경) |
| 위험도 판정 기준 | `rules.ts`의 `riskOf()`, 승인 경로 문구는 `ROUTE` |
| 업무시간 계산 기준 | `rules.ts`의 `PER_MONTH` |
| 브랜드 색, 카테고리 색 | [MuniAgentHub.module.scss](src/webparts/muniAgentHub/components/MuniAgentHub.module.scss) 상단 `--brand`, `--hot`, `--c-*` |
| 목록 열 이름 매핑 | [services/HubService.ts](src/webparts/muniAgentHub/services/HubService.ts) |
| 이용 안내, FAQ 문구 | [components/views.tsx](src/webparts/muniAgentHub/components/views.tsx)의 `GuideView` |

---

## 알려진 제한과 할 일

- [ ] **목록 프로비저닝 스크립트 없음**: 목록을 손으로 만들어야 합니다. PnP PowerShell 스크립트 추가 예정.
- [ ] **승인 자동화 없음**: 신청 → 카탈로그 옮기기가 수작업입니다. Power Automate 흐름 또는 운영자 화면 검토.
- [ ] **좋아요 연타 시 중복 저장 가능**: 저장 중에 다시 누르면 화면과 목록이 어긋날 수 있습니다.
- [ ] **링크 검증**: `InstallLink`, `DetailUrl`은 입력 시에만 https를 검사합니다. 표시할 때도 검사하도록 보완 필요.
- [ ] **반응 5,000건 제한**: `Hub Reactions`를 한 번에 최대 5,000건만 읽습니다(페이징 없음).
- [ ] **목록 하나만 없어도 전체 오류**: 5개 목록을 동시에 읽기 때문입니다.
- [ ] **실시간 갱신 없음**: 다른 사람이 바꾼 내용은 로고·홈을 누르거나 새로고침해야 보입니다.
- [ ] **단위 테스트 없음**: `rules.ts`, `HubService.ts`부터 추가 권장.

---

## 버전 기록

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0.0.0 | 2026-10 | 첫 버전 (배포 전) |

---

© 무늬랩스. 사내용.
