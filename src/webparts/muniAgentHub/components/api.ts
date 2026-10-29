/* 화면 컴포넌트들이 공통으로 쓰는 상태와 동작. MuniAgentHub(최상위)가 만들어 내려 줍니다. */
import { HubView, IHubData, IMe, TargetType } from '../models/types';

export interface IHubApi {
  data: IHubData;
  me: IMe;
  likeCount(t: TargetType, id: number): number;
  liked(t: TargetType, id: number): boolean;
  feedbackCount(agentId: number): number;
  toggleLike(t: TargetType, id: number): void;
  go(view: HubView): void;
  /** Agent 둘러보기로 이동하며 검색어·카테고리를 미리 채웁니다 (홈 검색창, 카테고리 바로가기). */
  browse(filter: { q?: string; cat?: string }): void;
  openAgent(id: number): void;
  openInsight(id: number): void;
  openRegister(): void;
  openIdea(): void;
  openInsightForm(): void;
  cancelRequest(id: number): void;
  copyAgentLink(id: number): void;
  toast(message: string, tone?: 'ok' | 'error'): void;
}
