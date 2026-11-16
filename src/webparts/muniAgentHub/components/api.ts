/* 화면 컴포넌트들이 공통으로 쓰는 상태와 동작. MuniAgentHub(최상위)가 만들어 내려 줍니다. */
import { HubView, IHtmlTool, IHubData, IIdea, IMe, IPerson, IReaction, IReportTarget, IVersion, IdeaStage, TargetType } from '../models/types';

export interface IHubApi {
  data: IHubData;
  me: IMe;
  now: Date;

  /* 이동 */
  go(view: HubView, id?: number): void;
  /** Hub 전체 검색 화면으로 이동 */
  search(q: string): void;
  searchQuery: string;

  /* 즐겨찾기(Agent·Skill·HTML의 ♡, 이 브라우저에 저장)와 공감(아이디어, Idea Board 기본 좋아요) */
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
  /** '만들기 시작하기'를 누른 사람과 날짜 (없으면 아직 시작 전) */
  started(ideaId: number): { who?: IPerson; date: string } | undefined;
  /** 만들기 시작하기 / 중지 (참여자만) */
  toggleStart(ideaId: number): void;
  /** 모집 중 · 제작 중 · 완성 · 보관됨 */
  stageOf(idea: IIdea): IdeaStage;
  comments(ideaId: number): IReaction[];
  addIdea(title: string, type: string, detail?: string): Promise<boolean>;
  updateIdea(ideaId: number, title: string, type: string, detail: string): Promise<boolean>;
  deleteIdea(ideaId: number): Promise<boolean>;
  addComment(ideaId: number, body: string): Promise<boolean>;
  /** SharePoint 기본 댓글은 고칠 수 없어서, 고친 내용으로 새로 달고 이전 댓글을 지웁니다 */
  editComment(reactionId: string, body: string): Promise<boolean>;
  deleteComment(reactionId: string): Promise<boolean>;

  /* 사례 (내가 올린 것만 고치기·지우기) */
  deleteCase(caseId: number): Promise<boolean>;
  reviveIdea(ideaId: number): Promise<boolean>;

  /* 입력 창 (Agent 소개는 go('agentform', id) 로 별도 화면) */
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
  deleteSkill(id: number): Promise<boolean>;
  deleteHtml(id: number): Promise<boolean>;
  loadFileText(fileRef: string): Promise<string>;
  loadVersions(t: 'Agent' | 'Skill' | 'Html', id: number): Promise<IVersion[]>;

  /* 알림 */
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
