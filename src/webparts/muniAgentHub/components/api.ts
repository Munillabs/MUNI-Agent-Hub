/* 화면 컴포넌트들이 공통으로 쓰는 상태와 동작. MuniAgentHub(최상위)가 만들어 내려 줍니다. */
import { HubView, ICaseRef, IHtmlTool, IHubData, IIdea, IMe, INewIdea, INewShot, IPerson, IReaction, IReportTarget, IVersion, IdeaStage, TargetType } from '../models/types';

/** Idea Board 미리 거르기: 카테고리 하나, 또는 사례 솔루션에서 나온 아이디어 */
export interface IIdeaPreset { cat?: string; caseRef?: ICaseRef }

export interface IHubApi {
  data: IHubData;
  me: IMe;
  now: Date;

  /* 이동 */
  /** sub: 사례 상세의 솔루션 번호 */
  go(view: HubView, id?: number, sub?: number): void;
  /** Idea Board를 열 때 미리 걸러 둘 조건 */
  ideaPreset?: IIdeaPreset;
  openIdeas(p?: IIdeaPreset): void;
  clearIdeaPreset(): void;
  /** 검색 창 열기 (흐린 화면 위). scope 'market' 이면 Agent·Skill·HTML만 */
  search(q: string, scope?: 'all' | 'market'): void;
  searchQuery: string;

  /* 즐겨찾기(Agent·Skill·HTML의 ♡, 이 브라우저에 저장)와 공감(아이디어, HubIdeas 평점 설정의 좋아요) */
  /** 아이디어 공감 수. Agent·Skill·HTML은 0 */
  likeCount(t: TargetType, id: number): number;
  liked(t: TargetType, id: number): boolean;
  toggleLike(t: TargetType, id: number): void;
  /** 내 즐겨찾기 (Agent·Skill·HTML) */
  favorites(): { t: TargetType; id: number }[];

  /* 리뷰 (Agent·Skill·HTML): 별점은 목록 평점(별 등급, 1인 1개), 글은 항목 댓글 */
  reviews(t: TargetType, id: number): IReaction[];
  rating(t: TargetType, id: number): { avg: number; n: number };
  addReview(t: TargetType, id: number, rating: number, body: string): Promise<boolean>;
  /** 내 리뷰의 별점·내용 고치기 */
  editReview(reviewId: string, rating: number, body: string): Promise<boolean>;

  /* 아이디어 */
  makers(ideaId: number): IPerson[];
  toggleMake(ideaId: number): void;
  /** 만들기 시작한 날 (HubIdeas 시작일. 누른 사람은 따로 남지 않음, 없으면 아직 시작 전) */
  started(ideaId: number): { who?: IPerson; date: string } | undefined;
  /** 만들기 시작하기 / 중지 (참여자만) */
  toggleStart(ideaId: number): void;
  /** 만들기 완료 (참여자만): 결과물은 Agent·Skill·HTML 이름 또는 https 주소, 비워도 됨 */
  finishIdea(ideaId: number, resultRef: string): Promise<boolean>;
  /** 모집 중 · 제작 중 · 완성 · 보관됨 */
  stageOf(idea: IIdea): IdeaStage;
  comments(ideaId: number): IReaction[];
  addIdea(idea: INewIdea): Promise<boolean>;
  updateIdea(ideaId: number, idea: INewIdea): Promise<boolean>;
  deleteIdea(ideaId: number): Promise<boolean>;
  addComment(ideaId: number, body: string): Promise<boolean>;
  /** SharePoint 기본 댓글은 고칠 수 없어서, 고친 내용으로 새로 달고 이전 댓글을 지웁니다 */
  editComment(reactionId: string, body: string): Promise<boolean>;
  deleteComment(reactionId: string): Promise<boolean>;
  /** 댓글·리뷰 글 좋아요 누르기 · 취소 (아이디어 댓글, Agent·Skill·HTML 리뷰) */
  toggleCommentLike(reactionId: string): void;

  /* 사례 (내가 올린 것만 고치기·지우기) */
  deleteCase(caseId: number): Promise<boolean>;
  reviveIdea(ideaId: number): Promise<boolean>;

  /* 입력 창 (Agent 새로 올리기는 배포 흐름이 AgentList에 채우고, Hub에서는 Owner가 소개 · 이미지만 고칩니다) */
  /** Agent 소개 · 썸네일 · 결과 이미지 고치기 창 */
  openAgentForm(id: number): void;
  openSkillForm(id?: number): void;
  openHtmlForm(id?: number): void;
  /** id 가 있으면 그 사례 고치기 */
  openCaseForm(id?: number): void;
  /** 아이디어 고치기 창 */
  openIdeaForm(id: number): void;
  openReport(target: IReportTarget): void;
  /** HTML 도구를 격리된 창에서 열기 */
  openHtml(tool: IHtmlTool): void;

  /* 파일 */
  /** Agent를 Hub에서 내리기 (AgentList 운영 상태를 중단으로. 항목과 배포 기록은 남음) */
  deleteAgent(id: number): Promise<boolean>;
  deleteSkill(id: number): Promise<boolean>;
  deleteHtml(id: number): Promise<boolean>;
  loadFileText(fileRef: string): Promise<string>;
  loadVersions(t: 'Agent' | 'Skill' | 'Html', id: number): Promise<IVersion[]>;
  /** '제작자는 이렇게 썼어요' 이미지 넣기 · 바꾸기 · 빼기 (Owner · 등록자만). 성공하면 목록을 다시 읽습니다 */
  saveShots(t: 'Agent' | 'Skill' | 'Html', id: number, add: INewShot[], drop: number[]): Promise<boolean>;

  /* 알림 */
  /** 그 사람의 프로필 배지 키 (고른 배지 → 없으면 최근 배지). 사진을 고른 사람·배지가 없는 사람은 undefined */
  avatarOf(p?: IPerson): string | undefined;
  isRead(noticeId: string, date: string): boolean;
  markRead(ids: string[]): void;
  markAllRead(): void;

  /* 기타 */
  copy(text: string, done: string): void;
  copyLink(view: HubView, id: number): void;
  /** Teams의 Launch Desk(배포 신청 Agent)를 엽니다. 주소가 설정되지 않았으면 준비 중 안내 */
  launchDesk(builder?: boolean): void;
  /** 아직 없는 기능을 눌렀을 때 */
  soon(what: string): void;
  toast(message: string, tone?: 'ok' | 'error'): void;
}
