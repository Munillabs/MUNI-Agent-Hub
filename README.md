# MUNI AI Hub

무늬랩스 직원이 **회사 Agent와 동료가 공유한 Skill을 찾아 쓰고, 아이디어를 모아 함께 만들고, 고객사 프로젝트 사례를 나누는** SharePoint Online 웹 파트입니다.

| 메뉴 | 하는 일 |
|---|---|
| **Home** | Hub 전체 검색, 메뉴 바로가기, 처음 시작하는 법, 지금 부문별 1위, 새로 올라온 것 |
| **Marketplace** | Agent · Skill · HTML을 찾고 별점·리뷰를 남김. 지금 인기, 새로 올라온 것 |
| **Idea Board** (HubIdeas) | 한 줄 아이디어 포스트잇, 공감, '만들래요' 참여, 90일 뒤 자동 보관 |
| **Case Library** (HubCases) | 고객사 프로젝트 사례 (Pain Point · Solution · 업무 변화 · 효과 측정) |
| **Maker Lab** | 시작 가이드 → Tool Fit → Dev 테스트 → Launch Desk 배포 |

화면 구성과 모양은 **MUNI AI Hub 메뉴 시안**과 같습니다(회색 와이어프레임 스타일, Pretendard). 별도 서버나 DB 없이 **SharePoint 목록 5개**에 데이터를 저장합니다. 별점·공감·댓글은 따로 목록을 두지 않고 각 목록의 기본 기능(평점 설정, 항목 댓글)을 씁니다.

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
9. [준비 중인 기능](#준비-중인-기능)
10. [자주 바꾸는 곳](#자주-바꾸는-곳)
11. [알려진 제한](#알려진-제한)

---

## 화면 구성

머리글에 메뉴 5개와 **검색 · 알림 · 내 계정 메뉴**가 있습니다. Marketplace에 마우스를 올리면 Agent · Skill · HTML로 바로 가는 펼침 메뉴가 열립니다.

| 화면 | 주소 | 내용 |
|---|---|---|
| Home | `#home` | 배너 문구(5개 중 무작위), 검색, 메뉴 바로가기, 지금 부문별 1위, 시작 4단계(Agent·Skill·HTML 수, 손 들 사람을 기다리는 아이디어, 최근 고객 사례, 배포까지) |
| Marketplace | `#market` | 지금 인기, 새로 올라온 것. Marketplace 아래 화면에는 머리글 밑에 전체 · Agent · Skill · HTML 탭 |
| Agent 목록 | `#agents` | 필터(만든 도구 · 업무 유형 · 결과물 · 사용 범위 · Skill 사용 · 별점), 정렬(인기 · 최신 · 별점) |
| Agent 상세 | `#agent-12` | Teams에서 열기, 즐겨찾기, 오류 신고 / 탭: 개요 · 상세 정보 · 리뷰 · 업데이트 기록 |
| Skill 목록 | `#skills` | 필터(활용 도구 · 카테고리 · 종류 · 파일 형식 · 사용 범위 · 별점), Skill 올리기 |
| Skill 상세 | `#skill-3` | 파일 받기, 내용 복사, 등록자의 편집·새 버전·삭제 / 탭: 개요 · 리뷰 · 업데이트 기록 |
| HTML 목록 | `#htools` | 브라우저에서 바로 여는 도구, HTML 올리기 |
| HTML 상세 | `#htool-2` | 열기(격리된 창), 오류 신고 / 탭: 개요 · 리뷰 · 업데이트 기록 |
| Idea Board | `#ideas` | 포스트잇 붙이기(한 줄 + 자세한 내용), 공감, 만들래요, 모집 중 · 제작 중 · 완성 · 보관함 |
| 아이디어 상세 | `#idea-5` | 진행 단계 3개, 댓글(내 댓글 수정·삭제), 공감, 함께 만드는 사람, 만들기 시작하기 / 중지, 아이디어 수정 |
| Case Library | `#cases` | 검색 + 필터(활용 방식 · 활용 제품), 업종 칩, 정렬, 사례 표, 사례 올리기 |
| 사례 상세 | `#case-2` | 대표 효과 · 전후 비교, 탭(개선 내용 · 솔루션 · 프롬프트), 업무 프로세스(AI·Use Case 표시), 프로젝트 · AI 활용 정보 |
| Maker Lab | `#maker` | 만들기 4단계, 가이드 |
| 검색 | `#search` | Agent · Skill · 아이디어 · 사례를 한 번에 |
| 나의 작업공간 | `#me` | 확인할 일, 나의 콘텐츠(종류별 수 · 탭 · 검색 · 정렬 · 쪽 넘김 · 수정 · 삭제) |
| 프로필 패널 | 머리글 오른쪽 동그라미 | 내 콘텐츠로 가기, 받은 배지 |

- **점수·랭킹·배지·알림**은 따로 저장하지 않고, 읽어 온 목록 데이터로 화면에서 바로 계산합니다([models/activity.ts](src/webparts/muniAgentHub/models/activity.ts)). 알림의 '읽음' 표시는 브라우저마다 따로 저장됩니다.
- **리뷰**는 별점(목록 평점 설정의 별 등급, 한 사람당 하나)과 글(항목 댓글)로 남습니다. Agent · Skill · HTML 모두 같습니다.
- **아이디어 공감**은 HubIdeas의 평점 설정(좋아요: '좋아요' 개수가 늘어남), **만들래요**는 함께 만드는 사람(`Makers`) 열, **댓글**은 항목 댓글입니다. SharePoint 기본 댓글은 고칠 수 없어 삭제만 됩니다.
- **즐겨찾기(♡)**는 SharePoint에 둘 곳이 없어 브라우저에만 저장합니다(다른 기기와는 따로).
- 좋아요와 댓글 없는 별점은 SharePoint가 날짜를 남기지 않아 '최근 30일' 점수·알림에는 들어가지 않습니다. 배지는 기간 없이 셉니다.
- '지금 부문별 1위' 5개 부문(아이디어 뱅크·인기 Agent·리뷰 마스터·공유 MVP·단골 방문자)은 기간 제한 없이 지금까지의 활동으로 셉니다. (활동 점수·알림은 그대로 최근 30일)
- Home의 '지금 부문별 1위'는 Home을 보고 있는 동안 1분마다 자동으로 다시 계산합니다. (팝업이 열려 있거나 브라우저 탭이 가려져 있으면 쉬고, 탭으로 돌아오면 바로 한 번 읽습니다)
- **HTML 도구**는 파일 내용을 읽어 격리된(sandbox) 창에서 엽니다. 도구 안의 스크립트는 Hub나 SharePoint 정보에 접근할 수 없습니다.

- 주소를 복사해 보내면 같은 화면이 열리고, 브라우저 뒤로 가기도 됩니다.
- 입력 창(Agent 소개, Skill 올리기, 사례 올리기, 오류 신고)은 화면 가운데에 열립니다.
- 로고나 Home을 누르면 목록 데이터를 다시 읽어 옵니다.
- 라이트/다크 모드를 지원하고, 웹 파트가 놓인 섹션 폭에 맞춰 반응형으로 배치됩니다.

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
├─ MuniAgentHubWebPart.ts        웹 파트 진입점, 설정 창
├─ MuniAgentHubWebPart.manifest.json
├─ models/
│  ├─ types.ts                   데이터 타입 (Agent, Skill, 아이디어, 사례, 반응)
│  ├─ rules.ts                   선택지, 아이디어 단계·보관, 별점, 버전, 파일 이름 규칙
│  └─ activity.ts                활동 점수, 부문별 랭킹, 배지, 알림 계산
├─ services/
│  └─ HubService.ts              SharePoint 목록 읽기/쓰기. 목록과 연동되는 코드는 모두 여기 있음
├─ components/
│  ├─ MuniAgentHub.tsx           최상위: 머리글, 화면 전환, 데이터 로드, 등록·반응 처리
│  ├─ api.ts                     화면에 내려 주는 공통 동작(IHubApi)
│  ├─ forms.tsx                  입력 창 4종: Agent 소개, Skill, 사례, 오류 신고
│  ├─ ui.tsx                     아이콘, 위치 표시, 별점, 댓글, 탭, 모달
│  ├─ pages/                     화면별 파일
│  │  ├─ home.tsx                Home
│  │  ├─ market.tsx              Marketplace, Agent 목록, Skill 목록, HTML
│  │  ├─ detail.tsx              Agent 상세, Skill 상세
│  │  ├─ ideas.tsx               Idea Board, 아이디어 상세
│  │  ├─ cases.tsx               Case Library, 사례 상세
│  │  ├─ maker.tsx               Maker Lab
│  │  ├─ me.tsx                  나의 작업공간
│  │  ├─ search.tsx              검색
│  │  └─ common.tsx              필터 사이드바, 인기 계산, 검색창 등
│  └─ MuniAgentHub.module.scss   전체 스타일 (시안 CSS를 옮긴 것 + Hub 전용 규칙)
├─ assets/                       로고
└─ loc/                          설정 창 문구 (ko-kr, en-us)
```

`lib/`, `temp/`, `dist/`, `sharepoint/solution/`, `node_modules/`는 빌드 결과물이라 저장소에 올리지 않습니다(`.gitignore`).

> 코드 안의 파일·클래스 이름(`MuniAgentHub…`)과 웹 파트 ID는 예전 이름 그대로 둡니다. 바꾸면 이미 페이지에 놓인 웹 파트와 연결이 끊기기 때문입니다. 화면과 설치 목록에 보이는 이름은 모두 **MUNI AI Hub**입니다.

---

## SharePoint 목록

웹 파트는 **목록 4개**(AgentList, HubContents, HubIdeas, HubCases)를 사용합니다. 모두 '목록'이며 문서 라이브러리는 쓰지 않습니다. **sppkg를 설치해도 목록은 자동으로 만들어지지 않으므로** 사이트에 미리 만들어야 합니다.

> 💡 **한 번에 만들기:** Hub 사이트를 사이트 소유자 계정으로 열고 F12 → Console에 [scripts/create-hub-lists.js](scripts/create-hub-lists.js)는 예전 Case Library용이라 지금은 쓰지 않습니다. HubContents · HubIdeas · HubCases는 사이트에서 직접 만든 목록을 쓰고(열은 아래 표), AgentList는 `create-agent-list.js` / `add-agent-list-columns.js`로 만듭니다. 이미 있는 목록·열은 건드리지 않고 없는 열만 추가하며, 형식이 다른 열은 표로 알려 줍니다. 여러 번 실행해도 안전합니다. **평점 설정**과 '본인 항목만 편집' 같은 권한 설정은 직접 해야 합니다.

> ⭐ **평점 설정 (직접):** 목록 설정 > 일반 설정 > **평점 설정** > 평가 허용 **예**.
> - AgentList, HubContents: **별 등급** (리뷰 별점)
> - HubIdeas: **좋아요** (공감)
>
> 켜면 SharePoint가 평점 열(평점(0-5), 등급 수, 평가한 사람 / 좋아요 수, 좋아요 표시한 사람)을 자동으로 만듭니다. 지우거나 이름을 바꾸지 마세요. 꺼져 있으면 Hub 위쪽에 안내가 나오고 나머지는 그대로 동작합니다.
>
> 리뷰 글 · 아이디어 댓글은 **항목 댓글**에 저장합니다. 목록 항목을 열었을 때 오른쪽에 댓글 창이 보이면 됩니다(테넌트에서 목록 댓글이 꺼져 있으면 SharePoint 관리자에게 요청). 별점·좋아요·댓글을 남기려면 직원에게 그 목록의 **참가(기여) 권한**이 필요합니다.

> ⚠️ **열의 내부 이름(Internal Name)**이 아래와 정확히 같아야 합니다. 열을 처음 만들 때 **영문 이름으로** 만든 뒤, 필요하면 표시 이름만 한글로 바꾸세요. 처음부터 한글로 만들면 내부 이름이 깨진 문자열이 됩니다.
>
> AgentList를 뺀 4개 목록은 **한 줄 텍스트 / 여러 줄 텍스트 / 숫자 / 날짜 / 사람**만 씁니다. AgentList는 배포 흐름이 정한 선택(Choice)·조회 열을 씁니다.

### 1. AgentList — Marketplace의 Agent (Hub는 읽기만)

배포·심사 흐름이 함께 쓰는 목록입니다. Hub 소개 열은 배포 Agent가 **Profile Card**로 받아 채우고, Hub에서는 Agent를 등록하거나 고치지 않습니다. 목록을 새로 만들 때는 `scripts/create-agent-list.js`, 이미 쓰고 있는 목록에 열만 더할 때는 `scripts/add-agent-list-columns.js`를 씁니다.

**Hub에 보이는 행:** `OpsStatus`가 비어 있지 않고 **중단·폐기가 아닌** 행. 신청 슬롯(`Title`이 `_PENDING`으로 끝나는 행)은 빠집니다.

Hub가 읽는 열 (배포·심사용 나머지 열은 읽지 않습니다):

| 내부 이름 | 형식 | Hub에서 쓰는 곳 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 행 키 (`AgentName`이 비어 있을 때만 이름으로 씀) |
| `AgentName` | 한 줄 텍스트 | Agent 이름 |
| `Summary` | 한 줄 텍스트 | 한 줄 소개 (카드) |
| `BuildTool` | 선택 | 만든 도구 (필터) |
| `Env` | 선택 | 환경 |
| `OpsStatus` | 선택 | 운영 상태 (Hub에 보일지 여부) |
| `TaskArea` | 선택 여러 개 | 카테고리 (필터): 제안과 전략 세우기 / 데이터로 인사이트 찾기 / 고객 업무 이해하고 설계하기 / 산출물 만들고 다듬기 / 교육·확산 프로그램 운영하기 / 프로젝트·사내 업무 하기. 값이 rules.ts의 `CATEGORIES`와 같아야 함. 예전 업무 분야 값은 [scripts/update-category-choices.js](scripts/update-category-choices.js)로 바꿈 |
| `Output` | 선택 여러 개 | 결과물 형태 (필터). 값이 `OUTPUTS`와 같아야 함 |
| `OutputNote` | 한 줄 텍스트 | 결과물 설명 |
| `Scope` | 선택 여러 개 | 사용 범위 (필터) |
| `Does` · `Prompts` · `MakerNote` | 여러 줄 텍스트 | 개요 탭 (한 줄에 하나) |
| `Instructions` | 여러 줄 텍스트 | 상세 정보 탭의 지침 |
| `Config` | 여러 줄 텍스트 (JSON) | `knowledge` → 참조 지식, `tools` → 사용 도구 |
| `Releases` | 여러 줄 텍스트 (JSON) | 업데이트 기록 탭 (`[{"v":"1.0.0.3","d":"2026-11-01","n":"변경 내용"}]`) |
| `Version` | 한 줄 텍스트 | 버전 |
| `OpenUrl` | 하이퍼링크 | Teams에서 열기 |
| `Owner` · `Sponsor` | 사람 | 정보, Teams로 묻기 |
| `FirstDeployedOn` · `DeployedAt` | 날짜 | 처음 배포 · 최근 업데이트 (없으면 만든 날짜 · 수정한 날짜) |
| `LinkedAgents` | 조회 여러 개 (AgentList의 AgentName) | 연결된 Agent |
| `Skills` | 조회 여러 개 (HubContents의 Title) | 연결된 Skill |

**썸네일**(`thumb.*`)과 **결과 이미지**(`result1.*` 또는 `result-1.*`, `result2.*` 또는 `result-2.*`)는 항목의 **첨부 파일**입니다. 목록 설정 > 고급 설정에서 **첨부 파일**을, 평점 설정에서 **별 등급**을 켜 주세요.

### 2. HubContents — Skill과 HTML (한 목록 + 첨부 파일)

Skill과 HTML 도구를 한 목록에 담고 **구분** 열로 나눕니다. 항목 하나가 Skill 하나(또는 도구 하나)이고, 파일은 **첨부 파일**로 저장합니다(Skill .md·.txt·.docx 1MB 이하, HTML .html 2MB 이하). 새 버전을 올리면 첨부 파일을 바꾸고 업데이트 기록에 한 줄을 더합니다. **첨부 파일 사용 · 평점 설정(별 등급)**을 켜 주세요.

| 내부 이름 | 형식 | 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 이름 |
| `Kind` | 선택 | 구분: **Skill / HTML** |
| `Summary` | 한 줄 텍스트 | 한 줄 소개 (40자) |
| `Category` | 선택 | 종류. Skill: 규칙 / 양식 / 참조 자료 / 체크리스트 / 업무 절차, HTML: 계산기 / 대시보드 / 점검표 / 투표 및 설문 / 판단 도우미 |
| `WorkArea` | 선택 여러 개 | 카테고리 (Agent와 같은 6개, `CATEGORIES`) |
| `Tools` | 선택 여러 개 | Skill은 활용 도구(Cowork, Copilot, Copilot Studio, Agent Builder), HTML은 만든 도구(Claude, ChatGPT, Copilot, Cowork) |
| `Scope` | 선택 여러 개 | 사용 범위 |
| `Does` | 여러 줄 텍스트 | Skill은 '이럴 때 써요', HTML은 '이런 일을 해요'(한 줄에 하나) |
| `Usage` | 여러 줄 텍스트 | Skill 활용 방법 |
| `MakerNote` | 여러 줄 텍스트 | HTML 제작자는 이렇게 썼어요 |
| `Output` | 한 줄 텍스트 | HTML 결과물 |
| `Releases` | 여러 줄 텍스트 (JSON) | 업데이트 기록 `[{"v":"1.2","d":"2026-11-17","n":"변경 내용"}]`. 가장 최근 줄의 `v`가 지금 버전 |
| `Hidden` | 예/아니요 | **예**면 Hub에 보이지 않음 |

> 선택 열의 값은 `models/rules.ts`의 `SKILL_KINDS` · `HTML_KINDS` · `SKILL_AREAS` · `SKILL_TOOLS` · `MADE_WITH` · `SCOPES`와 같아야 저장과 필터가 맞습니다. 목록에서 선택 값을 바꾸면 이 상수도 함께 바꿔 주세요.

### 3. HubIdeas — 한 줄 아이디어

공감은 **평점 설정(좋아요)** 으로 `'좋아요' 개수`(LikesCount)와 좋아요 표시한 사람이 바뀝니다. '만들래요'는 **사람 열**에, 진행 단계는 **상태 · 날짜 열**에 저장합니다. 댓글은 항목 댓글을 씁니다. 평점 설정 > 평가 허용 **예**, 형식 **좋아요**로 켜 주세요.

| 내부 이름 | 형식 | 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 아이디어 한 줄 (60자) |
| `Detail` | 여러 줄 텍스트 | 자세한 내용 (선택) |
| `Type` | 선택 | 예전 유형(Agent / Skill / HTML / 기타). **Hub는 읽지도 쓰지도 않음** (있어도 되고 지워도 됨) |
| `Category` | 선택 | 카테고리: 제안과 전략 세우기 / 데이터로 인사이트 찾기 / 고객 업무 이해하고 설계하기 / 산출물 만들고 다듬기 / 교육·확산 프로그램 운영하기 / 프로젝트·사내 업무 하기. 포스트잇 색이 카테고리를 따름 (`IDEA_CATS`) |
| `ScrapSource` | 여러 줄 텍스트 | 외부에서 스크랩한 아이디어의 원문 주소. 주소 없이 스크랩이면 `외부`, 직접 낸 아이디어는 비움. 값이 있으면 줄 공책 종이 + Scrap 도장 |

> 💡 `Category` · `ScrapSource`는 [scripts/add-idea-columns.js](scripts/add-idea-columns.js)를 콘솔에서 실행하면 없는 열만 추가합니다. 열이 없어도 Hub는 동작하고, 카테고리 · 스크랩만 저장되지 않습니다.
| `Status` | 선택 | 모집 중 / 제작 중 / 완성 / 보관. 새 아이디어는 **모집 중**. 만들기 시작하면 Hub가 **제작 중**으로 바꿈 |
| `Likers` | 사람 (여러 명) | Hub는 쓰지 않음 (공감은 평점 설정의 좋아요) |
| `Makers` | 사람 (여러 명) | 함께 만드는 사람. '만들래요'를 누르면 넣고 빼요 |
| `StartedOn` | 날짜 및 시간 | 만들기 시작한 날 (Hub가 입력, 중지하거나 함께하는 사람이 모두 빠지면 비움) |
| `DoneAt` | 날짜 및 시간 | 완성일 ('만들기 완료'를 누르면 Hub가 입력, 운영 담당자가 넣어도 됨) |
| `ResultRef` | 한 줄 텍스트 | 결과물: Hub가 넣을 때는 번호(`skill:12` · `html:7` · `agent:3`)라 이름이 바뀌어도 이어짐. 손으로 넣을 때는 `https://` 주소나 Agent · Skill · HTML 이름도 됨 (비워도 됨) |
| `ArchivedOn` | 날짜 및 시간 | 보관일. 운영 담당자가 넣으면 바로 보관함으로 |
| `RevivedOn` | 날짜 및 시간 | 보관 해제한 날 (Hub가 입력) |
| `Pain` | 여러 줄 텍스트 | 지금 겪는 불편 (선택) |
| `Frequency` | 선택 | 빈도: 매일 / 매주 / 매월 / 가끔 (선택) |
| `MinutesPerRun` | 숫자 | 1회 소요 시간(분) (선택). 빈도와 곱해 '한 달에 아끼는 시간'을 보여 줌 |

**탭(모집 중 · 제작 중 · 완성 · 보관함)** 은 아래 순서로 정해집니다.
1. **완성:** `Status`가 완성이거나 `DoneAt`이 있으면
2. **보관함:** `Status`가 보관이거나 `ArchivedOn`이 있으면 (그 뒤에 보관 해제했으면 아님). '만들래요' 없이 90일이 지나도 보관함
3. **제작 중:** `StartedOn`이 있으면
4. 그 밖에는 **모집 중** (공감 10개 또는 '만들래요' 1명부터 '함께할 사람 찾기' 단계로 표시)

**완성 처리:** 제작 중인 아이디어 상세 화면에서 함께 만드는 사람이 **만들기 완료**를 누르고 결과물(Hub의 Agent · Skill · HTML 또는 링크, 비워도 됨)을 고르면, Hub가 `Status`를 **완성**, `DoneAt`에 오늘, `ResultRef`에 결과물을 넣습니다. 운영 담당자가 목록에서 직접 넣어도 됩니다.
Skill · HTML을 올릴 때 **이 아이디어로 만들었어요**에서 내가 함께 만드는 제작 중 아이디어를 고르면, 올리기가 끝나면서 그 아이디어가 바로 완성되고 올린 Skill · HTML이 결과물로 연결됩니다.

> ⚠️ **권한:** 만들래요는 다른 사람이 올린 항목의 사람 열을 고치므로, 직원에게 HubIdeas **편집(참가) 권한**이 필요하고 고급 설정의 항목 수준 권한은 **모든 항목 편집**이어야 합니다. ('본인 항목만 편집'으로 두면 다른 사람 아이디어에 '만들래요'를 누를 수 없습니다.)
>
> 선택 값은 `models/rules.ts`의 `IDEA_TYPES` · `IDEA_STATUS` · `IDEA_FREQS`와 같아야 합니다.

### 4. HubCases — 고객사 프로젝트 사례

**승인 없이 바로 공개**됩니다. 목록 설정 > 버전 관리 설정에서 **'제출된 항목에 대한 콘텐츠 승인 필요'를 아니요**로 둡니다. (예로 켜 두면 승인 전까지 올린 사람에게만 '공개 검토 중'으로 보입니다.)

'사례 올리기' 창에서 아래 칸을 **올리는 사람이 채웁니다**. 올린 사람은 '나의 작업공간'에서 고치거나 지울 수 있습니다.

| 내부 이름 | 형식 | 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 사례명 (30자) |
| `Industry` | 선택 | 업종 (제조, 금융·보험 … 15개) |
| `Client` | 한 줄 텍스트 | 고객사 (예: B사, 실명 금지) |
| `Dept` | 한 줄 텍스트 | 조직 |
| `Period` | 선택 | 시기 (예: 2026 2분기). 폼에는 지금 분기까지만 보임 |
| `Project` | 한 줄 텍스트 | 프로젝트명 |
| `Area` | 한 줄 텍스트 | 업무 영역 |
| `Pattern` | 선택 | 활용 방식 (초안 작성, 요약 및 분류 …) |
| `Products` | 선택 여러 개 | 활용 제품 → 목록에서 색 점으로 표시 |
| `Contact` | 사람 | 문의 담당자. 폼에 회사 이메일을 적으면 사람으로 저장, 비우면 올린 사람. 'Teams로 묻기'가 이 사람에게 열림 |
| `KeyResult` | 한 줄 텍스트 | 대표 효과 **결과** (크게 보임, 예: `75% 감소`) |
| `KeyDetail` | 여러 줄 텍스트 | 대표 효과 **상세** (작게 보임, 예: `상담 후처리 시간`) |
| `Compare` | 여러 줄 텍스트 | 전후 비교. 한 줄에 `항목\|도입 전\|도입 후` (예: `시간\|주 4시간\|1.5시간`, `품질 수준\|보통\|매우 높음`, `정신적 노력 수준\|높음\|낮음`) |
| `ChangeBefore` / `ChangeAfter` | 여러 줄 텍스트 | 업무 변화 Before / After 설명. After의 첫 문장이 목록의 한 줄 설명 |
| `Process` | 여러 줄 텍스트 | 업무 프로세스. `[Before]` 아래 도입 전 단계, `[After]` 아래 도입 후 단계를 한 줄에 하나. AI가 맡는 After 단계는 끝에 ` [AI]` |
| `Measure` | 여러 줄 텍스트 | 어떻게 측정했나요 |
| `Solutions` | 여러 줄 텍스트 | 솔루션. 이름만 있으면 `agent\|이름` 줄, 상세(지침·도구·본문)가 있으면 Hub가 JSON으로 저장 |
| `CasePrompts` | 여러 줄 텍스트 | 프롬프트 Use Case 여러 개(이름 · 연결한 After 단계 · 프롬프트). Hub가 JSON으로 저장 |
| `ApplyPoints` | 여러 줄 텍스트 | 적용 포인트 (선택, 한 줄에 하나. 관리자가 채우면 상세 오른쪽에 보임) |

> 선택 값은 `models/rules.ts`의 `CASE_INDUSTRIES` · `CASE_PERIODS` · `CASE_PATTERNS` · `CASE_PRODUCTS`와 같아야 합니다. 목록에 새 분기를 더하면 `CASE_PERIODS`에도 더해 주세요.

### 5. 조회수 열 — AgentList · HubContents (선택)

[scripts/add-view-columns.js](scripts/add-view-columns.js)로 두 목록에 같은 열 1개를 추가합니다. 없으면 조회수만 비고 나머지는 그대로 동작합니다.

| 내부 이름 | 형식 | 설명 |
|---|---|---|
| `ViewCount` | 숫자 | 지금까지 조회수 |

- Agent·Skill·HTML 상세를 열면 **보는 사람의 권한으로** 그 항목의 `ViewCount`를 1 올립니다. 지금은 올린 사람이 자기 게시물을 본 것도 셉니다(`MuniAgentHub.tsx`의 `COUNT_OWN_VIEWS`를 `false`로 바꾸면 뺌). 상세에 들어올 때마다 1회씩 셉니다(새로 고침 · 다시 들어오기 포함).
- '수정한 날짜'·'수정한 사람'은 원래 값으로 되돌려 쓰고 새 버전을 만들지 않습니다(`ValidateUpdateListItem`). 그래서 '최근 업데이트'가 바뀌지 않습니다.
- 상세 정보 상자에 "조회수 N회"로 보이고, '인기 Agent' 동점 비교의 첫 기준(평점이 같으면 조회수 → 평가 수 → 리뷰 글 수)으로 씁니다.
- ⚠️ 직원에게 두 목록 항목의 **편집 권한**이 있어야 숫자가 오릅니다. HubContents가 '자기 항목만 편집'이면 남의 Skill·HTML은 오르지 않습니다. 콘텐츠 승인을 켠 목록은 조회만으로 '승인 대기'가 될 수 있습니다.
- 동시에 두 사람이 열면 1회가 빠질 수 있습니다(읽고 → 1 더해 쓰기).

### 6. HubProfiles — 프로필 배지 · 방문 기록 (선택, 단골 방문자에 필요)

[scripts/create-profiles-list.js](scripts/create-profiles-list.js)로 만듭니다(모두 읽기 · 자기 항목만 편집, 버전 기록 끔). 이미 있는 목록에 다시 실행하면 빠진 열만 추가합니다. 사람당 한 줄이고, Hub를 처음 열 때(또는 [프로필로 쓰기]를 처음 누를 때) 생깁니다. 없으면 모두 '최근 받은 배지'가 자동으로 프로필이 되고 단골 방문자는 비어 있습니다.

| 내부 이름 | 형식 | 설명 |
|---|---|---|
| `Title` | 한 줄 텍스트 | 이메일 (표시 이름 '이메일'. 찾아보기용) |
| `AvatarBadge` | 한 줄 텍스트 | 고른 배지 키(예: `first-idea`). `photo` = Microsoft 365 사진, 비우면 최근 배지 자동 |
| `VisitCount` | 숫자 | Hub를 방문한 날 수 (표시 이름 '방문 일수') |
| `LastVisit` | 한 줄 텍스트 | 마지막으로 센 날 `YYYY-MM-DD` (표시 이름 '마지막 방문') |

- Hub를 열 때 **하루에 한 번만** `VisitCount`를 1 올립니다(새로 고침·다시 열기는 같은 날이면 그대로). 날짜는 보는 사람 브라우저의 날짜입니다.
- '단골 방문자' 부문은 `VisitCount` 순입니다. 기록은 열을 추가한 날부터 쌓입니다.
- `VisitCount`·`LastVisit` 열이 없으면 방문 기록만 건너뛰고 배지 등 나머지는 그대로 동작합니다.

- 누구의 줄인지는 **만든 사람**으로 구분합니다.
- 배지 자체는 저장하지 않고 목록 데이터로 계산합니다. 그래서 다른 사람의 배지도 같은 결과로 보입니다(댓글·아이디어 작성자, 함께 만드는 사람 동그라미). 고른 배지의 조건이 없어지면 최근 배지로 돌아갑니다.

## 디자인 (MUNIVERSE 시안)

화면 모양은 디자이너 시안(MUNIVERSE 아티팩트)의 CSS를 그대로 씁니다. 손으로 옮기지 않고 변환 스크립트로 만듭니다.

| 파일 | 내용 |
|---|---|
| `design/muniverse-mockup.css` | 시안의 `<style>` 블록을 그대로 모은 것 (시안이 바뀌면 이 파일만 바꿉니다) |
| `design/hub-overrides.css` | 시안에 없는 Hub 전용 화면 요소(불러오는 중, 오류, 파일 미리보기 등) |
| `scripts/build-muniverse-css.js` | 위 두 파일 → `src/webparts/muniAgentHub/theme/muniverseCss.ts` (자동 생성, 직접 고치지 않음) |

```bash
node scripts/build-muniverse-css.js   # design/*.css 를 고친 뒤 실행
```

- 모든 선택자는 웹 파트 루트(`.mv-root`) 아래로 바뀌어 SharePoint 페이지의 다른 부분에 영향을 주지 않습니다.
- 시안의 `#ideas` 같은 id는 `#mv-ideas` 로 바뀝니다(주소 `#ideas` 로 스크롤이 튀지 않게). 화면 요소에도 같은 `mv-` id를 붙여 두었습니다.
- 화면 폭 `@media` 는 웹 파트 섹션 폭 기준 `@container hub` 로 바뀝니다.
- 다크 모드: 머리글의 스위치로 바꾸고 이 브라우저에 기억합니다(`localStorage` 의 `muni-theme`). 고른 적이 없으면 기기 설정을 따릅니다.
- 움직임(지구본, 등장 모션, 별똥별)은 `components/mv.tsx` 에 있고, 기기의 '동작 줄이기' 설정이면 멈춥니다.

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
- '디버그 스크립트 로드'를 허용한 뒤 **+ > MUNI AI Hub**로 추가합니다.
- 앱을 설치하지 않아도 **실제 사이트의 목록**을 읽고 씁니다. 테스트 데이터도 실제 목록에 남으니 나중에 지우세요.
- 소스를 저장하면 자동으로 다시 빌드됩니다. 브라우저를 새로고침하면 반영됩니다.
- 끝낼 때는 터미널에서 `Ctrl + C`. 서버는 한 번에 하나만 켜야 합니다(포트 4321 충돌 시 `EADDRINUSE`).

---

## 빌드와 배포

### 1. 패키지 만들기
```powershell
npm run build
```
`sharepoint/solution/muni-agent-hub.sppkg`가 만들어집니다. JS 파일이 패키지 안에 들어 있어(`includeClientSideAssets`) 별도 CDN이 필요 없습니다.

### 2. 앱 카탈로그에 업로드
- SharePoint 관리 센터 > 기타 기능 > 앱 > 열기 > **업로드** (테넌트 앱 카탈로그) 또는 사이트 컬렉션 앱 카탈로그에 올립니다.
- 사용 설정 창에서 Hub 사이트에만 쓸 거라면 '모든 사이트에 추가'는 고르지 않습니다.
- API 권한 요청이 없으므로 관리자 API 승인은 필요 없습니다.

### 3. 페이지에 추가
사이트 **새로 만들기 > 앱**으로 추가한 뒤, 페이지 편집 → **+ > 고급 > MUNI AI Hub**. 커뮤니케이션 사이트라면 **전체 폭 섹션**을 권장합니다.

### 업데이트 배포
1. [config/package-solution.json](config/package-solution.json)의 `solution.version`을 올립니다. 예: `1.0.0.0` → `1.1.0.0`
2. `npm run build`
3. 같은 sppkg를 앱 카탈로그에 덮어써서 올립니다. 페이지의 웹 파트는 설정을 유지한 채 새 버전으로 바뀝니다.

---

## 웹 파트 설정

페이지 편집 중 웹 파트의 연필 아이콘으로 엽니다. 값을 바꾼 뒤 **적용**을 눌러야 반영됩니다.

| 항목 | 기본값 | 설명 |
|---|---|---|
| 목록이 있는 사이트 주소 | (비움) | 비우면 웹 파트가 놓인 사이트의 목록 사용 |
| 목록 이름 4개 | AgentList, HubContents, HubIdeas, HubCases | 다른 이름을 쓸 때 변경 |
| Hub 관리자 메일 | (비움) | 오류 신고 메일의 참조. 여러 명이면 `;` |
| Launch Desk 링크 | (비움) | '배포하러 가기'로 여는 Teams 배포 신청 Agent 주소. 비우면 준비 중 안내 |
| Hub 머리글 보이기 | 켬 | 로고·메뉴 |
| 로고 이미지 주소 | (비움) | 비우면 패키지에 든 무늬랩스 로고 |
| Pretendard 글꼴 불러오기 | 켬 | 시안과 같은 글꼴(jsDelivr CDN). 회사 정책상 외부 글꼴을 막아야 하면 끔 |

---

## 운영 방법

운영 작업은 **운영 담당자가 SharePoint 목록에서 직접** 처리합니다.

| 대상 | 할 일 |
|---|---|
| Agent | 승인 없이 바로 게시. 문제가 있으면 `AgentStatus`를 게시 이외의 값(예: 숨김)으로 바꿔 내림 |
| Skill · HTML | 등록·수정·버전 관리는 등록자가 Hub에서. 문제가 있으면 항목 삭제 또는 등록자에게 요청 |
| 리뷰 · 댓글 | 부적절한 리뷰 글·댓글은 목록 항목을 열어 댓글 창에서 삭제 |
| 아이디어 | 만들어지면 `Status`를 **완성**, `DoneAt`에 날짜, `ResultRef`에 Agent 이름 또는 주소 |
| 사례 | 승인 없이 바로 공개. 올라오면 상세용 열(대표 효과, 프로세스 단계 등)을 채우고, 고객사 실명·고객 데이터가 있으면 고치거나 삭제 |
| 오류 신고 | Owner에게 메일로 가고 Hub 관리자가 참조로 받음 (웹 파트 설정에 관리자 메일 필요) |

### 오픈 전 체크리스트
- [ ] 목록 4개(AgentList, HubContents, HubIdeas, HubCases) 만들기, 열 내부 이름 확인
- [ ] `AgentList` · `HubContents` 첨부 파일 사용 확인
- [ ] 평점 설정: AgentList · HubContents **별 등급**, HubIdeas **좋아요**
- [ ] HubIdeas 항목 수준 권한 **모든 항목 편집** (만들래요)
- [ ] 목록 항목에 댓글 창이 보이는지 확인
- [ ] `HubCases` 콘텐츠 승인 **끄기** (사례는 바로 공개)
- [ ] (선택) `add-view-columns.js`로 AgentList · HubContents에 조회수 열 추가, 직원 편집 권한 확인
- [ ] (선택) `create-profiles-list.js`로 HubProfiles 만들기 (프로필 배지 고르기)
- [ ] 직원 권한: 다섯 목록 모두 항목 추가(참가)
- [ ] 웹 파트 설정에 Hub 관리자 메일 넣기
- [ ] 대표 Agent·Skill 몇 개를 미리 등록
- [ ] 테스트 데이터 삭제

---

## 준비 중인 기능

시안에서도 '준비 중'이던 것들입니다. 화면 자리는 있고 누르면 '준비 중'으로 안내합니다.

| 기능 | 필요한 것 |
|---|---|
| 자동화 템플릿 | Power Automate 흐름 공유 방식 결정 |
| Launch Desk | Teams 배포 신청 Agent 링크를 웹 파트 설정에 넣으면 바로 동작 |
| Copilot Studio 지침·토픽 자동 가져오기 | Prod 배포 기록과 연동 (지금은 소개 작성 화면에서 직접 붙여 넣기) |
| Tool Fit | HubContents에 이름에 'Tool Fit'이 들어간 HTML을 올리면 바로 동작 |
| 테스트 기준 · 가이드 문서 · Hub 운영 기준 · 문의 채널 · 개인정보 안내 | 문서 링크 |
| Skill · HTML 결과 이미지 | 저장 위치 결정 (Agent 결과 이미지는 동작) |

---

## 자주 바꾸는 곳

| 바꾸고 싶은 것 | 위치 |
|---|---|
| 업무 유형, 결과물, 활용 도구, 업종, 부서 등 선택지 | [models/rules.ts](src/webparts/muniAgentHub/models/rules.ts) 상단 상수 |
| 아이디어 보관 기간 (90일) | `rules.ts`의 `IDEA_ARCHIVE_DAYS` |
| 색 · 모양 (시안 스타일) | [MuniAgentHub.module.scss](src/webparts/muniAgentHub/components/MuniAgentHub.module.scss) 상단 `--ink`, `--line`, `--fill`, 포스트잇 색 `--c-agent` 등 |
| 점수 · 배지 기준 | [models/activity.ts](src/webparts/muniAgentHub/models/activity.ts)의 `POINTS`, `badges()` |
| 목록 열 이름 매핑 | [services/HubService.ts](src/webparts/muniAgentHub/services/HubService.ts) |
| 머리글 메뉴 | [MuniAgentHub.tsx](src/webparts/muniAgentHub/components/MuniAgentHub.tsx)의 `NAV` |

---

## 알려진 제한

- **평점 설정은 직접**: 목록 만들기 스크립트는 평점 설정을 켜지 못합니다.
- **목록당 5,000건 제한**: 각 목록을 한 번에 최대 5,000건(Agent·아이디어 등은 2,000건)만 읽습니다(페이징 없음).
- **댓글은 항목마다 따로 읽음**: 댓글이 달린 항목만 골라 6개씩 읽습니다. 댓글 달린 항목이 아주 많아지면 첫 화면이 느려질 수 있습니다.
- **별점·좋아요에 날짜 없음**: 최근 30일 점수·알림에 들어가지 않습니다.
- **즐겨찾기는 브라우저별**: 다른 기기·브라우저와 공유되지 않습니다.
- **Skill·HTML 이전 파일 없음**: 새 버전을 올리면 첨부 파일이 바뀌어 이전 파일 내용은 남지 않습니다.
- **실시간 갱신 없음**: 다른 사람이 바꾼 내용은 로고·Home을 누르거나 새로고침해야 보입니다.
- **Agent·Skill 이름으로 연결**: 연결된 Agent·Skill과 사례의 Solution은 이름이 같을 때만 링크됩니다.
- **단위 테스트 없음**: `rules.ts`, `HubService.ts`부터 추가 권장.

---

## 버전 기록

| 버전 | 날짜 | 내용 |
|---|---|---|
| 1.0.0.0 | 2026-11 | MUNI AI Hub 구조로 개편 (Marketplace · Idea Board · Case Library · Maker Lab) |

---

© 무늬랩스. 사내용.
