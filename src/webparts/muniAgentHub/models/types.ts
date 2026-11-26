/* MUNI AI Hub 데이터 모델
   SharePoint 목록 항목을 화면에서 쓰기 좋은 형태로 바꾼 것입니다.
   목록 열 이름(내부 이름)은 README의 'SharePoint 목록'과 같습니다. */

export type AgentTool = 'Copilot Studio' | 'Agent Builder';
/** 좋아요 = Agent·Skill·HTML에서는 즐겨찾기(♡, 이 브라우저에 저장), 아이디어에서는 공감(HubIdeas 평점 설정의 좋아요).
    리뷰 = 기본 별 등급(+ 항목 댓글), 댓글 = HubIdeas 항목 댓글, 만들래요 = HubIdeas 함께 만드는 사람 열, 시작 = HubIdeas 시작일 */
export type ReactionKind = '좋아요' | '리뷰' | '댓글' | '만들래요' | '시작';
export type TargetType = 'Agent' | 'Skill' | 'Html' | 'Idea';
export type SolutionKind = 'agent' | 'skill' | 'html';

/** 화면: 목록 화면 + 상세 화면(id 필요) */
export type HubView =
  | 'home' | 'market' | 'agents' | 'skills' | 'htools' | 'ideas' | 'cases' | 'maker' | 'search' | 'me' | 'badges'
  | 'agent' | 'skill' | 'htool' | 'idea' | 'case';

export interface IPerson {
  id: number;
  name: string;
  email: string;
}

/** AgentList 목록의 대표 행 중 운영 중인 Agent (Hub는 읽기만) */
export interface IAgent {
  id: number;
  title: string;
  summary: string;
  tool: string;
  /** 업무 분야(TaskArea, 여러 개)를 ' · '로 이은 것 (화면 표시용) */
  workType: string;
  workTypes: string[];
  scopes: string[];
  /** 결과물 형태(Output, 여러 개)를 ' · '로 이은 것 (화면 표시용) */
  output: string;
  outputs: string[];
  outputNote: string;
  /** 이런 일을 해요 (한 줄에 하나) */
  does: string[];
  /** 이렇게 말해 보세요 (한 줄에 프롬프트 하나) */
  prompts: string[];
  makerNote: string;
  instructions: string;
  knowledge: string[];
  actions: string[];
  linkedAgents: string[];
  linkedSkills: string[];
  version: string;
  /** 가장 최근 업데이트 기록의 내용 */
  changeNote: string;
  /** 업데이트 기록 (Releases JSON, 최신이 먼저) */
  releases: IVersion[];
  /** Teams 링크 (OpenUrl) */
  installLink: string;
  /** 환경 (Prod / Default) */
  env: string;
  /** 운영 상태 (OpsStatus) */
  opsStatus: string;
  /** Hub 조회수 (ViewCount 열. 열이 없으면 undefined) */
  views?: number;
  /** 최근 사용일 (LastUsedOn) */
  lastUsed: string;
  /** 결과 이미지 (첨부 파일 result1.* / result-1.*, result2.* / result-2.*) */
  images: IImage[];
  /** 목록 카드 썸네일 (첨부 파일 thumb.*) */
  thumb?: IImage;
  owner?: IPerson;
  sponsor?: IPerson;
  /** 처음 배포일 (없으면 배포 일시, 항목 만든 날) */
  created: string;
  /** 배포 일시 (없으면 항목 수정한 날) */
  modified: string;
}

export interface IImage {
  /** 1 또는 2 */
  slot: number;
  name: string;
  url: string;
}

/** HubIdeas 목록: 한 줄 아이디어(포스트잇) */
export interface IIdea {
  id: number;
  title: string;
  /** Agent / Skill / HTML / 기타 / 빈 값 */
  type: string;
  /** 자세한 내용 (선택) */
  detail: string;
  /** 모집 중 / 제작 중 / 완성 / 보관. '만들기 완료'를 누르면 '완성'. 운영 담당자가 '완성'·'보관'으로 바꿔도 그대로 따릅니다. */
  status: string;
  /** 공감(좋아요)한 사람: 목록 평점 설정의 LikedBy */
  likers: IPerson[];
  /** 함께 만드는 사람 (Makers) */
  makers: IPerson[];
  /** 만들기 시작한 날 (StartedOn) */
  startedOn: string;
  /** 완성일 (DoneAt) */
  doneAt: string;
  /** 결과물: 주소 또는 Agent·Skill·HTML 이름 (ResultRef) */
  resultRef: string;
  /** 보관일 (ArchivedOn). 운영 담당자가 넣으면 바로 보관됨 */
  archivedOn: string;
  /** 보관 해제한 날. 보관까지 남은 날을 이 날부터 다시 셉니다. */
  revivedOn: string;
  /** 지금 겪는 불편 (Pain) */
  pain: string;
  /** 빈도: 매일 / 매주 / 매월 / 가끔 */
  frequency: string;
  /** 1회 소요 시간(분) */
  minutes?: number;
  author?: IPerson;
  created: string;
  modified: string;
}

export interface INewIdea {
  title: string;
  type: string;
  detail?: string;
  pain?: string;
  frequency?: string;
  minutes?: number;
}

/** 아이디어 단계: 공감 모으기 → 만드는 중 → 완성, 또는 보관됨 */
export type IdeaStage = 'live' | 'making' | 'done' | 'archived';

/** 사례의 솔루션. 종류에 따라 상세가 다릅니다 (Agent: 지침·도구·데이터, Skill: 설명·본문, HTML: 설명·화면 구성) */
export interface ISolution {
  kind: SolutionKind;
  name: string;
  ins?: string;
  tools?: string[];
  data?: string[];
  desc?: string;
  body?: string;
  parts?: string[];
}
/** 사례의 재사용 프롬프트 (Use Case). step = 연결한 After 단계 (0부터, 없으면 -1) */
export interface ICasePrompt {
  name: string;
  step: number;
  text: string;
}

/** HubCases 목록 (승인 없이 바로 공개) */
export interface ICase {
  id: number;
  title: string;
  industry: string;
  client: string;
  dept: string;
  period: string;
  solutions: ISolution[];
  progress: string;
  /** 프로젝트명 (ProjectSummary 열) */
  summary: string;
  /** 대표 효과 (예: 보고서 작성 시간 62% 감소) */
  keyEffect: string;
  /** 대표 효과를 큰 숫자(62% 감소)와 아래 작은 설명(보고서 작성 시간)으로 나눈 것 */
  keyValue: string;
  keyNote: string;
  /** 목록의 사례 이름 아래 한 줄 설명 (After 설명의 첫 문장) */
  oneLine: string;
  /** 문의 담당자 이름 (HubCases Contact) */
  contact: string;
  contactPerson?: IPerson;
  /** 어떻게 측정했나요 */
  how: string;
  /** 재사용 프롬프트 (Use Case 여러 개) */
  prompts: ICasePrompt[];
  /** 업무 변화: 도입 전 / 도입 후를 한두 문장으로 */
  beforeText: string;
  afterText: string;
  /** 적용 포인트 (한 줄에 하나) */
  points: string[];
  area: string;
  /** Copilot 활용 방식 */
  pattern: string;
  products: string[];
  /** 업무 프로세스 단계: 도입 전 / 도입 후 */
  before: string[];
  after: string[];
  /** After 단계 중 AI가 맡는 단계 (0부터, 없으면 -1) */
  aiStep: number;
  /** 시간 · 품질 · 정신적 노력: [도입 전, 도입 후] */
  effects: { label: string; before: string; after: string }[];
  verify: string[];
  prompt: string;
  author?: IPerson;
  created: string;
  /** 목록에 콘텐츠 승인이 켜져 있을 때만 쓰임: 아직 승인 전 (작성자 본인에게만 보임) */
  pending: boolean;
}

/** 사례 올리기 · 고치기 폼 */
export interface INewCase {
  title: string;
  industry: string;
  client: string;
  dept: string;
  period: string;
  project: string;
  area: string;
  pattern: string;
  /** 문의 담당자 이메일 (비우면 올린 사람) */
  contact: string;
  products: string[];
  keyValue: string;
  keyNote: string;
  /** [도입 전, 도입 후] */
  time: [string, string];
  quality: [string, string];
  effort: [string, string];
  beforeText: string;
  afterText: string;
  beforeSteps: string[];
  afterSteps: string[];
  how: string;
  solutions: ISolution[];
  prompts: ICasePrompt[];
}

/** HubContents 목록의 Skill (구분 = Skill): 항목 하나 = Skill 하나, 파일은 첨부 파일 */
export interface ISkill {
  id: number;
  title: string;
  summary: string;
  /** 이럴 때 써요 */
  purpose: string;
  /** 활용 방법 */
  usage: string;
  tools: string[];
  /** 종류 (Category) */
  kind: string;
  /** 사용 범위 (Scope, 여러 개)를 ' · '로 이은 것 */
  scope: string;
  scopes: string[];
  /** 업무 분야 (WorkArea, 여러 개)를 ' · '로 이은 것 */
  area: string;
  areas: string[];
  /** 업데이트 기록(Releases)의 가장 최근 버전 */
  version: string;
  changeNote: string;
  /** 첨부 파일로 저장된 이름 (앞에 붙인 숫자 포함) */
  storedName: string;
  /** 내려받을 때 쓰는 원래 파일 이름 */
  fileName: string;
  /** md · txt · docx */
  ext: string;
  /** 서버 기준 경로 (/sites/…/Lists/HubContents/Attachments/…) */
  fileRef: string;
  /** 브라우저에서 여는 전체 주소 */
  fileUrl: string;
  /** 목록 카드 썸네일 (첨부 파일 thumb.*, 없으면 지침 미리보기) */
  thumb?: IImage;
  /** '제작자는 이렇게 썼어요' 이미지 (첨부 파일 result1.* · result2.*) */
  images: IImage[];
  author?: IPerson;
  created: string;
  modified: string;
  /** Hub 조회수 (ViewCount 열) */
  views?: number;
}

export interface INewSkill {
  title: string;
  summary: string;
  purpose: string;
  usage: string;
  tools: string[];
  kind: string;
  scope: string;
  area: string;
  version: string;
  changeNote: string;
  /** 새로 올리는 파일. 편집할 때 파일을 바꾸지 않으면 비워 둡니다. md·txt는 text, docx는 data */
  file?: { name: string; text?: string; data?: ArrayBuffer };
  /** 새 썸네일 (첨부 파일 thumb.<ext>로 저장) */
  thumb?: INewThumb;
  /** 편집할 때 지금 썸네일을 지움 */
  dropThumb?: boolean;
  /** '제작자는 이렇게 썼어요' 이미지: 새로 넣거나 바꿀 칸 */
  shots?: INewShot[];
  /** 편집할 때 뺄 이미지 칸 (1 · 2) */
  dropShots?: number[];
}

/** Hub에서 고치는 Agent 소개 (AgentList 항목). 이름 · 지침 · 구성 · 버전은 배포 흐름이 관리해서 여기서 고치지 않습니다 */
export interface IAgentEdit {
  summary: string;
  does: string[];
  prompts: string[];
  makerNote: string;
  thumb?: INewThumb;
  dropThumb?: boolean;
  shots?: INewShot[];
  dropShots?: number[];
}

/** 등록 화면에서 고른 썸네일 이미지 */
export interface INewThumb {
  /** png · jpg · jpeg · gif · webp */
  ext: string;
  data: ArrayBuffer;
}
/** '제작자는 이렇게 썼어요'에 넣을 이미지 한 장 (slot 1 · 2 → 첨부 파일 result1.<ext> · result2.<ext>) */
export interface INewShot extends INewThumb {
  slot: number;
}

/** HubContents 목록의 HTML (구분 = HTML): 브라우저에서 바로 여는 .html 도구 (파일은 첨부 파일) */
export interface IHtmlTool {
  id: number;
  title: string;
  summary: string;
  /** 이런 일을 해요 (한 줄에 하나) */
  does: string[];
  makerNote: string;
  /** 만든 도구 (Tools, 여러 개)를 ' · '로 이은 것 */
  madeWith: string;
  tools: string[];
  scope: string;
  scopes: string[];
  /** 종류 (Category: 계산기 · 대시보드 · 점검표 …) */
  workType: string;
  /** 업무 분야 (WorkArea, 여러 개) */
  area: string;
  areas: string[];
  output: string;
  version: string;
  changeNote: string;
  storedName: string;
  fileName: string;
  fileRef: string;
  fileUrl: string;
  /** 목록 카드 썸네일 (첨부 파일 thumb.*, 없으면 기본 그림) */
  thumb?: IImage;
  /** '제작자는 이렇게 썼어요' 이미지 (첨부 파일 result1.* · result2.*) */
  images: IImage[];
  author?: IPerson;
  created: string;
  modified: string;
  /** Hub 조회수 (ViewCount 열) */
  views?: number;
}

export interface INewHtml {
  title: string;
  summary: string;
  does: string[];
  makerNote: string;
  madeWith: string;
  scope: string;
  /** 종류 (Category) */
  workType: string;
  /** 업무 분야 (선택) */
  area: string;
  output: string;
  version: string;
  changeNote: string;
  file?: { name: string; text: string };
  thumb?: INewThumb;
  dropThumb?: boolean;
  shots?: INewShot[];
  dropShots?: number[];
}

/** 업데이트 기록 한 줄 (AgentList · HubContents 의 업데이트 기록(Releases) JSON: {"v","d","n"}) */
export interface IVersion {
  version: string;
  note: string;
  date: string;
}

/** 반응 한 건. 별도 목록 없이 각 목록의 기본 기능(평점 설정의 별 등급·좋아요, 항목 댓글)에서 읽어 이 모양으로 바꿉니다. */
export interface IReaction {
  /** 화면용 고유 키 (예: cm:Idea:12:3, rt:Agent:5:7) */
  id: string;
  targetType: TargetType;
  targetId: number;
  kind: ReactionKind;
  body: string;
  /** 리뷰 별점 1~5 */
  rating?: number;
  /** 항목 댓글이면 그 댓글 번호 (지울 때 씀) */
  commentId?: number;
  /** 항목 댓글의 좋아요 수 (SharePoint 댓글 좋아요) */
  likes?: number;
  /** 내가 이 댓글에 좋아요를 눌렀는지 */
  likedByMe?: boolean;
  author?: IPerson;
  /** 별점·좋아요는 SharePoint가 날짜를 남기지 않아 빈 값입니다. 최근 30일 계산에서는 빠집니다. */
  created: string;
}

export interface IMe {
  id: number;
  name: string;
  email: string;
}

export interface IHubData {
  agents: IAgent[];
  ideas: IIdea[];
  cases: ICase[];
  reactions: IReaction[];
  skills: ISkill[];
  htmls: IHtmlTool[];
  /** 사람별 프로필 배지 선택 (사람 Id → 배지 키 · 'photo'(사진) · ''(자동: 최근 배지)). HubProfiles 목록 */
  avatars?: { [personId: number]: string };
  /** 사람별 Hub 방문한 날 수 (사람 Id → 이름·횟수). HubProfiles 목록의 VisitCount 열. 열이 없으면 비어 있음 */
  visits?: { [personId: number]: { name: string; count: number } };
  /** 목록을 읽지 못했을 때의 안내. 그 목록을 쓰는 화면에만 보이고 다른 화면은 그대로 씁니다. */
  agentsError?: string;
  ideasError?: string;
  casesError?: string;
  reactionsError?: string;
  skillsError?: string;
  htmlsError?: string;
}

export interface IHubLists {
  agents: string;
  ideas: string;
  cases: string;
  /** Skill과 HTML을 함께 담는 목록 (구분 열로 나눔) */
  contents: string;
  /** 사람별 프로필 배지 선택 (사람당 한 줄). 없으면 모두 최근 배지 자동 */
  profiles?: string;
}

/** 오류 신고 대상 */
export interface IReportTarget {
  type: 'Agent' | 'Skill' | 'HTML';
  title: string;
  owner?: IPerson;
  /** 신고 메일의 '바로 가기' 링크용 */
  id?: number;
}
