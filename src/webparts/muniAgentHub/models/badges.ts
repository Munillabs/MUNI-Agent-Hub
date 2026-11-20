/* 배지 (MUNIVERSE 시안 '배지 도감'): 14칸 × 단계 = 46개.
   - 단계형: 한 칸 안에서 이름과 등급이 오릅니다 (예: 배포 첫걸음 → 제작의 기쁨 → 장인의 길 → 제작의 달인 → Agent 20개 달성 …).
   - 숨은 배지 7개: 받기 전에는 '???'로 보입니다.
   - 받는 조건은 모두 SharePoint 목록 데이터로 계산합니다(따로 저장하지 않음). 그래서 누구의 배지든 같은 결과로 보입니다.
   - 이름·설명은 시안 그대로. 문구를 바꾸려면 SERIES 만 고치면 됩니다. */
import { HubView, IHubData, IPerson } from './types';

export type BGroup = 'maker' | 'market' | 'idea' | 'case' | 'hidden';
interface IStepDef { n: string; t: number; c: string; d: string; need: number; num?: number; inc?: number; u?: string }
interface ISeriesDef { id: string; g: BGroup; a: string; na?: string; hid?: boolean; rep?: boolean; again?: string; u?: string; steps: IStepDef[] }

/** 묶음 = Hub 메뉴 (어디서 받는지 바로 알게) */
export const GRP: { [g: string]: { n: string; go?: [HubView, string] } } = {
  maker: { n: 'Marketplace', go: ['maker', 'Maker Lab 가기'] },
  market: { n: 'Marketplace', go: ['market', 'Marketplace 가기'] },
  idea: { n: 'Idea Board', go: ['ideas', 'Idea Board 가기'] },
  case: { n: 'Case Library', go: ['cases', 'Case Library 가기'] },
  hidden: { n: '숨은 배지' }
};
/** 칸 이름과 받는 방법 (배지 모음 화면) */
export const SERIES_NAME: { [id: string]: string } = { s05: '배포', s06: '받은 리뷰', s07: '공유', s09: '리뷰 쓰기', s01: '아이디어', s02: '응원', s04: '함께 만들기', s10: '사례', s11: '인사이트 헌터' };
export const SERIES_HOW: { [id: string]: string } = {
  s05: 'Agent를 Prod에 배포해요', s06: '내 콘텐츠에 리뷰를 받아요', s07: 'Skill이나 HTML을 올려요', s09: '동료 콘텐츠에 리뷰를 남겨요',
  s01: '아이디어를 올리고 공감을 받아요', s02: '동료 아이디어에 공감해요', s04: "'함께해요'로 함께 만들어요", s10: '내가 올린 사례가 쌓여요', s11: '여러 업종의 사례를 올려요'
};
export const CATS: { k: string; n: string; has: (g: BGroup) => boolean }[] = [
  { k: 'market', n: 'Marketplace', has: g => g === 'maker' || g === 'market' },
  { k: 'idea', n: 'Idea Board', has: g => g === 'idea' },
  { k: 'case', n: 'Case Library', has: g => g === 'case' },
  { k: 'hidden', n: '숨은 배지', has: g => g === 'hidden' }
];

export const SERIES: ISeriesDef[] = [
  { id: 's05', g: 'maker', a: 'maker', na: 'maker', u: 'Agent {n}개만 더 배포하면 돼요', steps: [
    { n: '배포 첫걸음', t: 1, c: '내 Agent를 처음 Prod에 배포해요', d: 'Agent를 처음 Prod에 배포하셨네요', need: 1 },
    { n: '제작의 기쁨', t: 2, c: 'Agent 3개를 Prod에 배포해요', d: 'Agent를 3개나 배포하셨네요', need: 3 },
    { n: '장인의 길', t: 3, c: 'Agent 5개를 Prod에 배포해요', d: 'Agent를 5개나 배포하셨네요', need: 5 },
    { n: '제작의 달인', t: 4, c: 'Agent 10개를 Prod에 배포해요', d: 'Agent를 10개나 배포하셨네요', need: 10 },
    { num: 20, inc: 10, n: 'Agent {n}개 달성', t: 4, c: 'Agent {n}개를 Prod에 배포해요', d: 'Agent를 {n}개나 배포하셨네요', need: 20 }] },
  { id: 's06', g: 'maker', a: 'review', u: '리뷰 {n}개만 더 받으면 돼요', steps: [
    { n: '영광의 첫 리뷰', t: 1, c: '제작한 콘텐츠에 첫 리뷰가 달리면 받아요', d: '제작한 콘텐츠에 첫 리뷰가 달렸어요', need: 1 },
    { n: '단골이 생겼다', t: 2, c: '제작한 콘텐츠에 리뷰 3개가 달리면 받아요', d: '제작한 콘텐츠에 리뷰가 3개 달렸어요', need: 3 },
    { n: '맛집 등극', t: 3, c: '평균 별점 4.5 이상으로 리뷰 5개를 받아요', d: '평균 별점 4.5 이상으로 리뷰 5개를 받았어요', need: 5 },
    { n: '별빛이 내린다', t: 4, c: '평균 별점 4.5 이상으로 리뷰 10개를 받아요', d: '평균 별점 4.5 이상으로 리뷰 10개를 받았어요', need: 10 }] },
  { id: 's07', g: 'market', a: 'market', na: 'market', u: '{n}개만 더 올리면 돼요', steps: [
    { n: '첫 공유!', t: 1, c: 'Skill이나 HTML을 처음 올려요', d: 'Skill이나 HTML을 처음 올리셨네요', need: 1 },
    { n: '친절한 동료', t: 2, c: 'Skill과 HTML을 합쳐 3개 올려요', d: 'Skill과 HTML을 3개나 올리셨네요', need: 3 },
    { n: '나눔은 습관', t: 3, c: 'Skill과 HTML을 합쳐 5개 올려요', d: 'Skill과 HTML을 5개나 올리셨네요', need: 5 },
    { n: '기부 천사', t: 4, c: 'Skill과 HTML을 합쳐 10개 올려요', d: 'Skill과 HTML을 10개나 올리셨네요', need: 10 },
    { num: 20, inc: 10, n: '공유 {n}개 달성', t: 4, c: 'Skill과 HTML을 합쳐 {n}개 올려요', d: 'Skill과 HTML을 {n}개나 올리셨네요', need: 20 }] },
  { id: 's09', g: 'market', a: 'rwrite', u: '리뷰 {n}개만 더 남기면 돼요', steps: [
    { n: '한 줄 평론가', t: 1, c: '별점과 한 줄 리뷰를 처음 남겨요', d: '첫 리뷰를 남기셨네요', need: 1 },
    { n: '댓글의 힘', t: 2, c: 'Agent, Skill, HTML에 리뷰를 하나씩 남겨요(3개)', d: 'Agent, Skill, HTML 모두에 리뷰를 남기셨네요', need: 3, u: '아직 리뷰하지 않은 종류 {n}개에 리뷰를 남기면 돼요' },
    { n: '믿고 보는 리뷰어', t: 3, c: '리뷰를 5개 남겨요', d: '리뷰를 5개나 남기셨네요', need: 5 },
    { n: '리뷰의 신', t: 4, c: '리뷰를 10개 남겨요', d: '리뷰를 10개나 남기셨네요', need: 10 }] },
  { id: 's01', g: 'idea', a: 'idea', na: 'idea', steps: [
    { n: '첫 아이디어!', t: 1, c: 'Idea Board에 아이디어를 처음 게시해요', d: 'Idea Board에 첫 아이디어를 올리셨네요', need: 1, u: '아이디어 {n}개만 올리면 돼요' },
    { n: '누군가 좋아해요', t: 2, c: '내 아이디어가 공감 1개를 받아요', d: '내 아이디어가 첫 공감을 받았어요', need: 1, u: '공감 {n}개만 더 받으면 돼요' },
    { n: '관심 집중', t: 3, c: '내 아이디어가 공감 5개를 받아요', d: '내 아이디어가 공감 5개를 받았어요', need: 5, u: '공감 {n}개만 더 받으면 돼요' },
    { n: '꿈은 이루어진다', t: 4, c: '내 아이디어가 공감 10개를 받아요', d: '내 아이디어가 공감 10개를 받았어요', need: 10, u: '공감 {n}개만 더 받으면 돼요' },
    { num: 10, inc: 10, n: '아이디어 {n}개 달성', t: 3, c: '아이디어를 {n}개 올려요', d: '아이디어를 {n}개나 올리셨네요', need: 10, u: '아이디어 {n}개만 더 올리면 돼요' }] },
  { id: 's02', g: 'idea', a: 'cheer', u: '공감을 {n}번만 더 누르면 돼요', steps: [
    { n: '응원의 힘', t: 1, c: '동료 아이디어에 공감을 10번 눌러요', d: '동료 아이디어에 공감을 10번 누르셨네요', need: 10 },
    { n: '프로 응원러', t: 2, c: '동료 아이디어에 공감을 30번 눌러요', d: '동료 아이디어에 공감을 30번이나 누르셨네요', need: 30 },
    { n: '응원단장', t: 3, c: '동료 아이디어에 공감을 50번 눌러요', d: '동료 아이디어에 공감을 50번이나 누르셨네요', need: 50 },
    { n: '응원의 신', t: 4, c: '동료 아이디어에 공감을 100번 눌러요', d: '동료 아이디어에 공감을 100번이나 누르셨네요', need: 100 }] },
  { id: 's04', g: 'idea', a: 'team', steps: [
    { n: '저요!', t: 1, c: "동료 아이디어에 처음 '함께해요'를 눌러요", d: "동료 아이디어에 처음 '함께해요'를 누르셨네요", need: 1, u: "동료 아이디어에 '함께해요'를 누르면 받아요" },
    { n: '자 이제 시작이야', t: 2, c: "참여한 동료 아이디어가 '만들기' 단계에 들어가요", d: "참여한 아이디어가 '만들기' 단계에 들어갔어요", need: 1, u: "참여한 아이디어가 '만들기' 단계에 들어가면 받아요" },
    { n: '함께라서 가능했어', t: 3, c: '참여한 아이디어가 제작 완료로 바뀌어요', d: '참여한 아이디어가 제작 완료됐어요', need: 1, u: '참여한 아이디어가 제작 완료되면 받아요' },
    { n: '협업의 신', t: 4, c: '참여한 아이디어 3개가 제작 완료돼요', d: '참여한 아이디어 3개가 제작 완료됐어요', need: 3, u: '참여한 아이디어 {n}개가 더 완료되면 받아요' }] },
  { id: 's10', g: 'case', a: 'case', na: 'case', u: '사례 {n}개만 더 올리면 돼요', steps: [
    { n: '첫 사례!', t: 1, c: '고객사 사례를 처음 올려요', d: '고객사 사례를 처음 올리셨네요', need: 1 },
    { n: '프로 수집러', t: 2, c: '사례 3개를 올려요', d: '사례를 3개나 올리셨네요', need: 3 },
    { n: '풍부한 경험', t: 3, c: '사례 5개를 올려요', d: '사례를 5개나 올리셨네요', need: 5 },
    { n: '걸어 다니는 백과사전', t: 4, c: '사례 10개를 올려요', d: '사례를 10개나 올리셨네요', need: 10 },
    { num: 20, inc: 10, n: '사례 {n}개 달성', t: 4, c: '고객 사례를 {n}개 올려요', d: '고객 사례를 {n}개나 올리셨네요', need: 20 }] },
  { id: 's11', g: 'case', a: 'hunt', u: '다른 업종 사례 {n}개를 올리면 돼요', steps: [
    { n: '초보 헌터', t: 2, c: '서로 다른 업종의 사례 2개를 올려요', d: '서로 다른 업종의 사례를 2개 올리셨네요', need: 2 },
    { n: '숙련된 헌터', t: 3, c: '서로 다른 업종의 사례 3개를 올려요', d: '서로 다른 업종의 사례를 3개 올리셨네요', need: 3 },
    { n: '전설의 헌터', t: 4, c: '서로 다른 업종의 사례 5개를 올려요', d: '서로 다른 업종의 사례를 5개 올리셨네요', need: 5 }] },
  { id: 's12', g: 'hidden', a: 'gold-s12', hid: true, steps: [{ n: '원년 멤버', t: 4, c: 'Hub를 연 첫 달에 무엇이든 하나 올려요', d: 'Hub를 연 첫 달부터 함께하셨네요', need: 1 }] },
  { id: 's13', g: 'hidden', a: 'gold-s13', hid: true, rep: true, again: '다른 달에 1위를 하면 한 번 더 받아요', steps: [{ n: '이달의 MVP', t: 4, c: '한 달 동안 아이디어왕, 메이커, 기록왕 중 하나로 1위를 해요', d: '이번 달 1위를 하셨네요', need: 1 }] },
  { id: 's14', g: 'hidden', a: 'gold-s14', hid: true, steps: [{ n: '그랜드슬램', t: 4, c: 'Marketplace, Idea Board, Case Library에서 배지를 하나씩 모아요', d: '세 메뉴에서 배지를 하나씩 모으셨네요', need: 3 }] },
  { id: 's15', g: 'hidden', a: 'gold-s15', hid: true, steps: [{ n: '럭키 세븐', t: 4, c: 'Hub에 7번째, 77번째, 777번째로 올라온 콘텐츠의 주인이 돼요', d: '행운의 번호로 콘텐츠를 올리셨네요', need: 1 }] },
  { id: 's16', g: 'hidden', a: 'gold-s16', hid: true, steps: [{ n: '불사조', t: 4, c: '보관함으로 간 내 아이디어가 다시 만들기 단계에 들어가요', d: '보관함에 있던 아이디어가 다시 살아났어요', need: 1 }] },
  { id: 's17', g: 'hidden', a: 'gold-s17', hid: true, steps: [{ n: '나는야 콜롬버스', t: 4, c: '새로 올라온 Agent, Skill, HTML에 가장 먼저 리뷰를 남겨요', d: '새 콘텐츠에 가장 먼저 리뷰를 남기셨네요', need: 1 }] },
  { id: 's18', g: 'hidden', a: 'gold-s18', hid: true, steps: [{ n: '주거니 받거니', t: 4, c: '내가 리뷰한 콘텐츠의 주인이 내 콘텐츠에도 리뷰를 남겨요', d: '리뷰를 주고받으셨네요', need: 1 }] }
];

/** 배지 한 칸(단계 하나) */
export interface IStepBadge {
  /** s05_0 처럼 칸 id + 단계 번호 */
  id: string; sid: string; g: BGroup; hid: boolean;
  /** 등급 1 루키 · 2 챌린저 · 3 마스터 · 4 레전드 */
  t: number; num: number;
  n: string; c: string; d: string;
  have: boolean; date?: string;
  cur: number; need: number; u: string;
  /** 그림 파일 키 (assets/badges/<art>.svg) */
  art: string;
}
/** 칸 하나의 상태 */
export interface ISeriesState {
  sid: string; g: BGroup; hid: boolean; rep: boolean; cnt: number; again: string;
  /** 받은 단계 수 */
  L: number;
  steps: IStepBadge[];
  /** 지금 대표 단계(마지막으로 받은 것) */
  top?: IStepBadge;
  /** 다음 목표 단계 */
  next?: IStepBadge;
}

const TIER: { [t: number]: string } = { 1: 'rookie', 2: 'challenger', 3: 'master', 4: 'legend' };
function artOf(s: ISeriesDef, t: number, num: number): string {
  if (/^gold-/.test(s.a)) { return s.a; }
  if (num && s.na) { return `num/${s.na}-${Math.min(100, num)}`; }
  return `${s.a}-${TIER[t] || 'rookie'}`;
}
const fill = (x: string, n: number): string => String(x || '').replace(/\{n\}/g, String(n));

/** 숫자형 단계(Agent 20개 달성 …)의 현재 숫자 */
function numLevel(cur: number, st: IStepDef): number {
  const inc = st.inc || st.num || 10;
  return cur >= (st.num || 0) ? Math.floor(cur / inc) * inc : 0;
}

/** 단계마다 지금 숫자와 받은 날 (날짜는 모르면 비움) */
interface IProg { cur: number[]; date: (string | undefined)[]; cnt?: number }

function sameP(p?: IPerson, q?: IPerson): boolean { return !!p && !!q && p.id === q.id; }
function sorted<T extends { created: string }>(list: T[]): T[] { return list.slice().sort((a, b) => (a.created || '').localeCompare(b.created || '')); }
/** n 번째(1부터)가 생긴 날 */
function nth<T extends { created: string }>(list: T[], n: number): string | undefined { return list.length >= n && n > 0 ? list[n - 1].created || undefined : undefined; }

function progress(d: IHubData, p: IPerson): { [sid: string]: IProg } {
  const out: { [sid: string]: IProg } = {};
  const myAgents = sorted(d.agents.filter(a => sameP(a.owner, p)));
  const myShares = sorted(([] as { created: string; id: number; k: string }[])
    .concat(d.skills.filter(s => sameP(s.author, p)).map(s => ({ created: s.created, id: s.id, k: 'Skill' })))
    .concat(d.htmls.filter(h => sameP(h.author, p)).map(h => ({ created: h.created, id: h.id, k: 'Html' }))));
  const myIdeas = sorted(d.ideas.filter(i => sameP(i.author, p)));
  const myCases = sorted(d.cases.filter(c => !c.pending && sameP(c.author, p)));
  const ownerOf = (t: string, id: number): IPerson | undefined => {
    if (t === 'Agent') { const a = d.agents.filter(x => x.id === id)[0]; return a && a.owner; }
    if (t === 'Skill') { const s = d.skills.filter(x => x.id === id)[0]; return s && s.author; }
    if (t === 'Html') { const h = d.htmls.filter(x => x.id === id)[0]; return h && h.author; }
    if (t === 'Idea') { const i = d.ideas.filter(x => x.id === id)[0]; return i && i.author; }
    return undefined;
  };
  const reviews = d.reactions.filter(r => r.kind === '리뷰' && (r.targetType === 'Agent' || r.targetType === 'Skill' || r.targetType === 'Html'));

  // 배포: 내 Agent 수
  const nA = myAgents.length;
  out.s05 = { cur: [nA, nA, nA, nA, nA], date: [1, 3, 5, 10, 20].map(n => nth(myAgents, n)) };
  // 받은 리뷰: 내 콘텐츠에 다른 사람이 남긴 리뷰. 3·4단계는 평균 별점 4.5 이상일 때만
  const got = sorted(reviews.filter(r => sameP(ownerOf(r.targetType, r.targetId), p) && !sameP(r.author, p)));
  const rated = got.filter(r => !!r.rating);
  const avg = rated.length ? rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length : 0;
  const nR = got.length;
  const hi = avg >= 4.5;
  out.s06 = { cur: [nR, nR, hi ? nR : Math.min(nR, 4), hi ? nR : Math.min(nR, 9)], date: [nth(got, 1), nth(got, 3), hi ? nth(got, 5) : undefined, hi ? nth(got, 10) : undefined] };
  // 공유: 내 Skill + HTML 수
  const nS = myShares.length;
  out.s07 = { cur: [nS, nS, nS, nS, nS], date: [1, 3, 5, 10, 20].map(n => nth(myShares, n)) };
  // 리뷰 쓰기: 동료 콘텐츠에 남긴 리뷰 (2단계는 Agent·Skill·HTML 종류 수)
  const wrote = sorted(reviews.filter(r => sameP(r.author, p) && !sameP(ownerOf(r.targetType, r.targetId), p)));
  const kinds: string[] = [];
  let kindDate: string | undefined;
  wrote.forEach(r => { if (kinds.indexOf(r.targetType) < 0) { kinds.push(r.targetType); if (kinds.length === 3) { kindDate = r.created || undefined; } } });
  const nW = wrote.length;
  out.s09 = { cur: [nW, kinds.length, nW, nW], date: [nth(wrote, 1), kindDate, nth(wrote, 5), nth(wrote, 10)] };
  // 아이디어: 올린 수, 내 아이디어가 받은 공감
  const myIdeaIds = myIdeas.map(i => i.id);
  const likesGot = d.reactions.filter(r => r.kind === '좋아요' && r.targetType === 'Idea' && myIdeaIds.indexOf(r.targetId) >= 0 && !sameP(r.author, p));
  const nI = myIdeas.length, nL = likesGot.length;
  out.s01 = { cur: [nI, nL, nL, nL, nI], date: [nth(myIdeas, 1), undefined, undefined, undefined, nth(myIdeas, 10)] };
  // 응원: 동료 아이디어에 누른 공감
  const cheers = d.reactions.filter(r => r.kind === '좋아요' && r.targetType === 'Idea' && sameP(r.author, p) && !sameP(ownerOf('Idea', r.targetId), p));
  const nC = cheers.length;
  out.s02 = { cur: [nC, nC, nC, nC], date: [undefined, undefined, undefined, undefined] };
  // 함께 만들기: 동료 아이디어에 '함께해요' → 만들기 단계 → 제작 완료
  const joined = d.ideas.filter(i => !sameP(i.author, p) && i.makers.some(m => m.id === p.id));
  const isDone = (i: { status: string; doneAt: string }): boolean => i.status === '완성' || !!i.doneAt;
  const started = joined.filter(i => !!i.startedOn || isDone(i) || i.status === '제작 중');
  const done = sorted(joined.filter(isDone).map(i => ({ created: i.doneAt || i.modified })));
  out.s04 = { cur: [joined.length, started.length, done.length, done.length], date: [undefined, undefined, nth(done, 1), nth(done, 3)] };
  // 사례: 올린 수, 서로 다른 업종 수
  const nK = myCases.length;
  out.s10 = { cur: [nK, nK, nK, nK, nK], date: [1, 3, 5, 10, 20].map(n => nth(myCases, n)) };
  const inds: string[] = [];
  const indDates: string[] = [];
  myCases.forEach(c => { if (c.industry && inds.indexOf(c.industry) < 0) { inds.push(c.industry); indDates.push(c.created); } });
  out.s11 = { cur: [inds.length, inds.length, inds.length], date: [indDates[1], indDates[2], indDates[4]] };

  // 숨은 배지
  const all = sorted(([] as { created: string; who?: IPerson }[])
    .concat(d.agents.map(a => ({ created: a.created, who: a.owner })))
    .concat(d.skills.map(s => ({ created: s.created, who: s.author })))
    .concat(d.htmls.map(h => ({ created: h.created, who: h.author })))
    .concat(d.ideas.map(i => ({ created: i.created, who: i.author })))
    .concat(d.cases.filter(c => !c.pending).map(c => ({ created: c.created, who: c.author }))))
    .filter(x => !!x.created);
  const mine = all.filter(x => sameP(x.who, p));
  // 원년 멤버: Hub 첫 달에 무엇이든 올림
  const firstMonth = all.length ? all[0].created.slice(0, 7) : '';
  const early = mine.filter(x => x.created.slice(0, 7) === firstMonth);
  out.s12 = { cur: [early.length ? 1 : 0], date: [early.length ? early[0].created : undefined] };
  // 이달의 MVP: 한 달 동안 아이디어 수 · Agent 수 · 사례 수 중 하나로 1위 (공동 1위 포함)
  const months: { [m: string]: { [kind: string]: { [pid: number]: number } } } = {};
  const tally = (kind: string, created: string, who?: IPerson): void => {
    if (!who || !created) { return; }
    const m = created.slice(0, 7);
    months[m] = months[m] || {}; months[m][kind] = months[m][kind] || {};
    months[m][kind][who.id] = (months[m][kind][who.id] || 0) + 1;
  };
  d.ideas.forEach(i => tally('idea', i.created, i.author));
  d.agents.forEach(a => tally('maker', a.created, a.owner));
  d.cases.filter(c => !c.pending).forEach(c => tally('case', c.created, c.author));
  const mvp: string[] = [];
  Object.keys(months).sort().forEach(m => {
    const won = Object.keys(months[m]).some(k => { const v = months[m][k]; const best = Math.max.apply(Math, Object.keys(v).map(x => v[Number(x)])); return (v[p.id] || 0) > 0 && v[p.id] === best; });
    // 받은 날 = 그달 내 마지막 활동 날
    const last = mine.filter(x => x.created.slice(0, 7) === m).map(x => x.created).sort().pop();
    if (won && last) { mvp.push(last); }
  });
  out.s13 = { cur: [mvp.length ? 1 : 0], date: [mvp.length ? mvp[mvp.length - 1] : undefined], cnt: mvp.length };
  // 럭키 세븐: 7 · 77 · 777번째 콘텐츠의 주인
  const lucky = [7, 77, 777].map(n => all[n - 1]).filter(x => !!x && sameP(x.who, p));
  out.s15 = { cur: [lucky.length ? 1 : 0], date: [lucky.length ? lucky[0].created : undefined] };
  // 불사조: 보관됐던 내 아이디어가 다시 만들기 단계로
  const phoenix = myIdeas.filter(i => !!i.revivedOn && (!!i.startedOn || isDone(i)));
  out.s16 = { cur: [phoenix.length ? 1 : 0], date: [phoenix.length ? phoenix[0].revivedOn : undefined] };
  // 나는야 콜롬버스: 동료 콘텐츠에 가장 먼저 리뷰
  const firstBy: { [k: string]: { created: string; who?: IPerson } } = {};
  sorted(reviews.filter(r => !!r.created)).forEach(r => { const k = r.targetType + r.targetId; if (!firstBy[k]) { firstBy[k] = { created: r.created, who: r.author }; } });
  const col = Object.keys(firstBy).filter(k => sameP(firstBy[k].who, p) && !sameP(ownerOf(k.replace(/\d+$/, ''), Number(k.replace(/^\D+/, ''))), p));
  out.s17 = { cur: [col.length ? 1 : 0], date: [col.length ? firstBy[col[0]].created : undefined] };
  // 주거니 받거니: 내가 리뷰한 콘텐츠의 주인이 내 콘텐츠에도 리뷰
  const iReviewed = wrote.map(r => ownerOf(r.targetType, r.targetId)).filter(x => !!x) as IPerson[];
  const back = got.some(r => !!r.author && iReviewed.some(o => o.id === r.author!.id));
  out.s18 = { cur: [back ? 1 : 0], date: [undefined] };
  return out;
}

/** 한 사람의 배지 14칸 */
export function badgeSeries(d: IHubData, p: IPerson): ISeriesState[] {
  const pr = progress(d, p);
  const res: ISeriesState[] = [];
  SERIES.forEach(s => {
    if (s.id === 's14') { return; } // 그랜드슬램은 다른 칸을 본 뒤 계산
    res.push(build(s, pr[s.id] || { cur: [], date: [] }));
  });
  // 그랜드슬램: Marketplace · Idea Board · Case Library 에서 배지를 하나씩
  const has = (f: (g: BGroup) => boolean): boolean => res.some(x => f(x.g) && x.L > 0);
  const slam = [has(g => g === 'maker' || g === 'market'), has(g => g === 'idea'), has(g => g === 'case')].filter(Boolean).length;
  const def14 = SERIES.filter(s => s.id === 's14')[0];
  const at = res.findIndex(x => x.sid === 's15');
  res.splice(at < 0 ? res.length : at, 0, build(def14, { cur: [slam], date: [undefined] }));
  return res;
}

function build(s: ISeriesDef, pr: IProg): ISeriesState {
  const N = s.steps.length;
  const cur = (i: number): number => pr.cur[i] !== undefined ? pr.cur[i] : (pr.cur[pr.cur.length - 1] || 0);
  let L = 0;
  while (L < N && cur(L) >= s.steps[L].need) { L++; }
  const steps: IStepBadge[] = s.steps.map((st, k) => {
    const got = k < L;
    // 숫자형 단계: 받았으면 지금 달성한 숫자, 아니면 다음 목표 숫자
    const num = st.num ? (got ? numLevel(cur(k), st) : Math.max(st.num, numLevel(cur(k), st) + (st.inc || st.num))) : 0;
    const need = st.num ? (got ? num : num) : st.need;
    const t = st.num ? (num >= 20 ? 4 : 3) : st.t;
    return {
      id: s.id + '_' + k, sid: s.id, g: s.g, hid: !!s.hid, t, num,
      n: fill(st.n, num), c: fill(st.c, num), d: fill(st.d, num),
      have: got, date: got ? (pr.date[k] || undefined) : undefined,
      cur: Math.min(cur(k), need), need, u: fill(st.u || s.u || '{n}개 남았어요', Math.max(0, need - cur(k))),
      art: artOf(s, t, num)
    };
  });
  return { sid: s.id, g: s.g, hid: !!s.hid, rep: !!s.rep, cnt: pr.cnt || 0, again: s.again || '', L, steps, top: L ? steps[L - 1] : undefined, next: L < N ? steps[L] : undefined };
}

/** 다음 목표까지의 비율 (0~1) */
export function ratioOf(x: ISeriesState): number { return x.next ? Math.min(1, x.next.cur / (x.next.need || 1)) : 1; }

/** 배지 하나(칸 + 단계)를 가진 사람 수 */
export function holders(d: IHubData, people: IPerson[], stepId: string): number {
  const sid = stepId.split('_')[0];
  const k = Number(stepId.split('_')[1] || 0);
  return people.filter(p => { const x = badgeSeries(d, p).filter(s => s.sid === sid)[0]; return !!x && x.L > k; }).length;
}

/** Hub에 등장하는 사람들 (배지 획득 인원 세기용) */
export function peopleOf(d: IHubData): IPerson[] {
  const m: { [id: number]: IPerson } = {};
  const add = (p?: IPerson): void => { if (p && p.id && !m[p.id]) { m[p.id] = p; } };
  d.agents.forEach(a => add(a.owner)); d.skills.forEach(s => add(s.author)); d.htmls.forEach(h => add(h.author));
  d.ideas.forEach(i => { add(i.author); i.makers.forEach(add); i.likers.forEach(add); }); d.cases.forEach(c => add(c.author));
  d.reactions.forEach(r => add(r.author));
  return Object.keys(m).map(k => m[Number(k)]);
}

/** 프로필 배지 그림: 고른 칸(sid)의 지금 단계 그림. 안 골랐거나 그 칸을 아직 못 받았으면 가장 최근에 받은 배지 */
export function profileArt(series: ISeriesState[], pick: string): string | undefined {
  const chosen = series.filter(x => x.sid === pick && !!x.top)[0];
  if (chosen && chosen.top) { return chosen.top.art; }
  const got = series.filter(x => !!x.top).sort((a, b) => (b.top!.date || '').localeCompare(a.top!.date || ''));
  return got.length ? got[0].top!.art : undefined;
}
