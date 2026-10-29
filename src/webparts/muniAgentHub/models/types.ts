/* MUNI Agent Hub 데이터 모델
   SharePoint 목록 항목을 화면에서 쓰기 좋은 형태로 바꾼 것입니다.
   목록 열 이름(내부 이름)은 docs/lists.md 와 scripts/Provision-MuniAgentHub.ps1 을 따릅니다. */

export type ShareLevel = '직원 공유' | '공식 운영';
export type AgentType = '정보 조회형' | '데이터 활용형' | '업무 실행형';
export type RiskTier = '저' | '중' | '고';
export type Sensitivity = '공개' | '사내 일반' | '기밀·개인정보';
export type IdeaStatus = '아이디어' | '검토 중' | '제작 중' | '등록 완료';
export type RequestStatus = '검토 중' | '보완 요청' | '승인' | '반려' | '취소';
export type Frequency = '매일' | '매주' | '매월' | '가끔';
export type ReactionKind = '좋아요' | '후기' | '개선 요청' | '댓글';
export type TargetType = 'Agent' | 'Idea';
export type HubView = 'home' | 'agents' | 'ideas' | 'insights' | 'guide';

export interface IPerson {
  id: number;
  name: string;
  email: string;
}

/** Agent Catalog 목록: 검토를 통과해 게시된 Agent */
export interface IAgent {
  id: number;
  title: string;
  summary: string;
  description: string;
  category: string;
  type: AgentType;
  shareLevel: ShareLevel;
  risk: RiskTier;
  dataSources: string;
  sensitivity: string;
  external: string[];
  installLink: string;
  owner?: IPerson;
  ownerTeam: string;
  reviewedOn: string;
  sourceIdeaId?: number;
}

/** Agent Requests 목록: 등록 신청 (신청자 본인과 운영 담당자만 봄) */
export interface IAgentRequest {
  id: number;
  title: string;
  summary: string;
  category: string;
  type: AgentType;
  shareLevel: ShareLevel;
  risk: RiskTier;
  status: RequestStatus;
  reviewerComment: string;
  publishedAgentId?: number;
  created: string;
}

export interface INewAgentRequest {
  title: string;
  summary: string;
  description: string;
  category: string;
  type: AgentType;
  dataSources: string;
  sensitivity: Sensitivity;
  external: string[];
  shareLevel: ShareLevel;
  installLink: string;
  ownerTeam: string;
  testConfirmed: boolean;
  testNote: string;
  risk: RiskTier;
}

/** Idea Board 목록 */
export interface IIdea {
  id: number;
  title: string;
  summary: string;
  pain: string;
  frequency?: Frequency;
  minutes?: number;
  team: string;
  category: string;
  status: IdeaStatus;
  linkedAgentId?: number;
  author?: IPerson;
  created: string;
}

export interface INewIdea {
  title: string;
  summary: string;
  pain: string;
  frequency: Frequency;
  minutes?: number;
  team: string;
  category: string;
}

/** Agent Insights 목록 (콘텐츠 승인 사용) */
export interface IInsight {
  id: number;
  title: string;
  summary: string;
  industry: string;
  area: string;
  customerType: string;
  tools: string[];
  problem: string;
  solution: string;
  outcome: string;
  lessons: string;
  team: string;
  project: string;
  detailUrl: string;
  created: string;
  pending: boolean;
}

export interface INewInsight {
  title: string;
  summary: string;
  industry: string;
  area: string;
  customerType: string;
  tools: string[];
  problem: string;
  solution: string;
  outcome: string;
  lessons: string;
  team: string;
  project: string;
  detailUrl: string;
}

/** Hub Reactions 목록: 좋아요·투표·후기를 한 목록에 저장 */
export interface IReaction {
  id: number;
  targetType: TargetType;
  targetId: number;
  kind: ReactionKind;
  body: string;
  author?: IPerson;
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
  insights: IInsight[];
  reactions: IReaction[];
  myRequests: IAgentRequest[];
}

export interface IHubLists {
  agents: string;
  requests: string;
  ideas: string;
  insights: string;
  reactions: string;
}
