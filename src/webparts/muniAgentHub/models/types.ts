/* MUNI AI Hub 데이터 모델
   SharePoint 목록 항목을 화면에서 쓰기 좋은 형태로 바꾼 것입니다.
   목록 열 이름(내부 이름)은 README의 'SharePoint 목록'과 같습니다. */

export type AgentTool = 'Copilot Studio' | 'Agent Builder';
/** 좋아요 = Agent·Skill·HTML에서는 즐겨찾기(♡, 이 브라우저에 저장), 아이디어에서는 공감(Idea Board 기본 '좋아요').
    리뷰 = 기본 별 등급(+ Agent는 항목 댓글), 댓글 = Idea Board 항목 댓글, 만들래요 = 정해진 문구의 Idea Board 항목 댓글 */
export type ReactionKind = '좋아요' | '리뷰' | '댓글' | '만들래요' | '시작';
export type TargetType = 'Agent' | 'Skill' | 'Html' | 'Idea';
export type SolutionKind = 'agent' | 'skill' | 'html';

/** 화면: 목록 화면 + 상세 화면(id 필요). agentform 은 id 가 있으면 그 Agent 편집 */
export type HubView =
  | 'home' | 'market' | 'agents' | 'skills' | 'htools' | 'ideas' | 'cases' | 'maker' | 'search' | 'me'
  | 'agent' | 'skill' | 'htool' | 'idea' | 'case' | 'agentform';

export interface IPerson {
  id: number;
  name: string;
  email: string;
}

/** Agent Catalog 목록: Marketplace에 게시된 Agent */
export interface IAgent {
  id: number;
  title: string;
  summary: string;
  tool: string;
  workType: string;
  scopes: string[];
  output: string;
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
  changeNote: string;
  installLink: string;
  /** 결과 이미지 (목록 항목 첨부 파일 result-1.*, result-2.*) */
  images: IImage[];
  /** 목록 카드 썸네일 (첨부 파일 thumb.*) */
  thumb?: IImage;
  owner?: IPerson;
  /** Sponsor (AgentSponsor 사람 열, 운영 담당자가 배포 기록을 보고 채움) */
  sponsor?: IPerson;
  created: string;
  modified: string;
}

export interface IImage {
  /** 1 또는 2 */
  slot: number;
  name: string;
  url: string;
}

export interface INewAgent {
  title: string;
  summary: string;
  tool: AgentTool;
  workType: string;
  scopes: string[];
  output: string;
  outputNote: string;
  does: string[];
  prompts: string[];
  makerNote: string;
  instructions: string;
  knowledge: string[];
  actions: string[];
  linkedAgents: string[];
  linkedSkills: string[];
  version: string;
  changeNote: string;
  installLink: string;
  /** 새로 고른 결과 이미지 (자리 1·2). 고르지 않은 자리는 그대로 둡니다. */
  newImages?: { slot: number; name: string; data: ArrayBuffer }[];
  /** 새로 고른 썸네일 (고르지 않으면 그대로) */
  newThumb?: { name: string; data: ArrayBuffer };
}

/** Idea Board 목록: 한 줄 아이디어(포스트잇) */
export interface IIdea {
  id: number;
  title: string;
  /** Agent / Skill / HTML / 기타 / 빈 값 */
  type: string;
  /** 자세한 내용 (선택) */
  detail: string;
  /** 운영 담당자가 '완성'으로 바꾸면 완성. 그 밖에는 공감·참여로 단계를 계산합니다. */
  status: string;
  linkedAgentId?: number;
  /** 보관 해제한 날. 보관까지 남은 날을 이 날부터 다시 셉니다. */
  revivedOn: string;
  author?: IPerson;
  created: string;
}

export interface INewIdea {
  title: string;
  type: string;
  detail?: string;
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

/** Case Library 목록 (승인 없이 바로 공개) */
export interface ICase {
  id: number;
  title: string;
  industry: string;
  client: string;
  dept: string;
  period: string;
  pain: string;
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
  /** 문의 담당자 */
  contact: string;
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

/** Skill Library 목록: 항목 하나 = Skill 하나, 파일은 첨부 파일 */
export interface ISkill {
  id: number;
  title: string;
  summary: string;
  /** 이럴 때 써요 */
  purpose: string;
  /** 활용 방법 */
  usage: string;
  tools: string[];
  kind: string;
  scope: string;
  area: string;
  version: string;
  changeNote: string;
  /** 첨부 파일로 저장된 이름 (앞에 붙인 숫자 포함) */
  storedName: string;
  /** 내려받을 때 쓰는 원래 파일 이름 */
  fileName: string;
  /** md · txt · docx */
  ext: string;
  /** 서버 기준 경로 (/sites/…/Skill Library/…) */
  fileRef: string;
  /** 브라우저에서 여는 전체 주소 */
  fileUrl: string;
  author?: IPerson;
  created: string;
  modified: string;
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
}

/** HTML Library 목록: 브라우저에서 바로 여는 .html 도구 (파일은 첨부 파일) */
export interface IHtmlTool {
  id: number;
  title: string;
  summary: string;
  /** 이런 일을 해요 (한 줄에 하나) */
  does: string[];
  makerNote: string;
  /** 제작 도구: Claude / ChatGPT / Copilot / 기타 */
  madeWith: string;
  scope: string;
  workType: string;
  output: string;
  version: string;
  changeNote: string;
  storedName: string;
  fileName: string;
  fileRef: string;
  fileUrl: string;
  author?: IPerson;
  created: string;
  modified: string;
}

export interface INewHtml {
  title: string;
  summary: string;
  does: string[];
  makerNote: string;
  madeWith: string;
  scope: string;
  workType: string;
  output: string;
  version: string;
  changeNote: string;
  file?: { name: string; text: string };
}

/** 업데이트 기록 한 줄 (SharePoint 항목 버전 기록에서 읽음) */
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
  skills: string;
  htmls: string;
}

/** 오류 신고 대상 */
export interface IReportTarget {
  type: 'Agent' | 'Skill' | 'HTML';
  title: string;
  owner?: IPerson;
}
