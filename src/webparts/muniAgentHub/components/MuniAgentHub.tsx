/* MUNI AI Hub 최상위 컴포넌트 (화면 구성과 모양은 MUNI AI Hub 메뉴 시안과 같음)
   - SharePoint 목록에서 데이터를 읽어 오고, 등록은 목록에, 별점·공감·댓글은 목록 기본 기능(평점 설정·항목 댓글)에 씁니다.
   - 화면 전환은 주소 끝(#market, #agent-12)으로 하여 링크로 공유하고 브라우저 뒤로 가기도 쓸 수 있습니다. */
import * as React from 'react';
import styles from './MuniAgentHub.module.scss';
import { HubService, HubError, reviewText } from '../services/HubService';
import {
  HubView, IAgent, IHtmlTool, IHubData, IIdea, IMe, INewCase, INewHtml, INewSkill, IPerson, IReaction, IReportTarget, ISkill, IVersion, ReactionKind, TargetType
} from '../models/types';
import { first, ideaStage, isHttpsUrl, mmdd, ratingOf } from '../models/rules';
import { INotice, badges, notices } from '../models/activity';
import { IHubApi } from './api';
import { CaseForm, HtmlForm, IdeaEditForm, ReportForm, SkillForm } from './forms';
import { Go, IconAgent, IconBell, IconGrid, IconCases, IconHome, IconHtml, IconIdeas, IconMaker, IconMarket, IconSearch, IconSkill, Modal, Toast } from './ui';
import { BadgeMedal } from './badge';
import { HomeView } from './pages/home';
import { AgentStore, HtmlStore, MarketView, SkillStore } from './pages/market';
import { AgentPage, HtmlPage, SkillPage } from './pages/detail';
import { IdeaBoard, IdeaPage } from './pages/ideas';
import { CaseLibrary, CasePage } from './pages/cases';
import { MakerLab } from './pages/maker';
import { MyWorkspace } from './pages/me';
import { SearchView } from './pages/search';
import { MUNI_LOGO } from '../assets/logo';

export interface IMuniAgentHubProps {
  service: HubService;
  /** 웹 파트 설정의 '사이트 주소'가 비어 있으면 현재 사이트 */
  siteUrl: string;
  /** 페이지 위쪽에 Hub 머리글(로고·메뉴)을 보일지 */
  showHeader: boolean;
  /** 머리글 로고 이미지 주소. 비어 있으면 패키지에 든 무늬랩스 로고 */
  logoUrl?: string;
  /** 오류 신고 메일의 참조(Hub 관리자). 여러 명이면 ; 로 구분 */
  adminEmail?: string;
  /** Teams의 Launch Desk(배포 신청 Agent) 링크 */
  launchDeskUrl?: string;
}

type ModalState =
  | { kind: 'skill'; id?: number }
  | { kind: 'html'; id?: number }
  | { kind: 'case'; id?: number }
  | { kind: 'idea'; id: number }
  | { kind: 'report'; target: IReportTarget }
  | undefined;
interface IRoute { view: HubView; id?: number }

const LIST_VIEWS: HubView[] = ['home', 'market', 'agents', 'skills', 'htools', 'ideas', 'cases', 'maker', 'search', 'me'];
const ITEM_VIEWS: HubView[] = ['agent', 'skill', 'htool', 'idea', 'case'];
/** 상세·하위 화면이 머리글 메뉴의 어디에 속하는지 (시안 NAVMAP) */
const NAV_OF: { [v: string]: string } = { htool: 'market', agents: 'market', skills: 'market', htools: 'market', agent: 'market', skill: 'market', case: 'cases', idea: 'ideas' };
/** Marketplace 아래 종류 탭(전체 m · Agent a · Skill s · HTML h)이 보이는 화면 (시안 MKMAP) */
const MK_OF: { [v: string]: string } = { market: 'm', agents: 'a', agent: 'a', skills: 's', skill: 's', htools: 'h', htool: 'h' };
/** 시안 CSS가 #ideas, #agent 처럼 화면 id로 모양을 정하는 부분은 [data-hub-page="ideas"] 로 바꿔 두었습니다.
    (주소와 같은 id를 붙이면 브라우저가 그 위치로 스크롤하므로 id 대신 data 속성) */
const PAGE_ID: { [v: string]: string } = {
  home: 'home', market: 'market', agents: 'store', skills: 'toolkit', htools: 'htools', agent: 'agent', htool: 'htmlitem', skill: 'skill',
  ideas: 'ideas', idea: 'idea', cases: 'cases', case: 'case', maker: 'maker', search: 'search', me: 'me'
};
/** Home 자동 새로 고침 간격 (1분) */
const REFRESH_MS = 60000;
const EMPTY: IHubData ={ agents: [], ideas: [], cases: [], reactions: [], skills: [], htmls: [] };
const TITLES: { [v: string]: string } = { search: '검색', case: '사례', skill: 'Skill', idea: '아이디어', me: '내 작업공간', awards: '랭킹 · 배지', market: 'Marketplace', htools: 'HTML', agents: 'Agent', skills: 'Skill', ideas: 'Idea Board', cases: 'Case Library', maker: 'Maker Lab' };

function readHash(): IRoute {
  const h = (window.location.hash || '').replace(/^#/, '');
  const m = /^(agent|skill|htool|idea|case)-(\d+)$/.exec(h);
  if (m) { return { view: m[1] as HubView, id: Number(m[2]) }; }
  return { view: LIST_VIEWS.indexOf(h as HubView) >= 0 ? h as HubView : 'home' };
}
function hashOf(r: IRoute): string {
  return '#' + r.view + (r.id && ITEM_VIEWS.indexOf(r.view) >= 0 ? '-' + r.id : '');
}
/** 조회수: 올린 사람이 자기 게시물을 본 것도 셀지 (true = 셈) */
const COUNT_OWN_VIEWS = true;
/* 알림 읽음·삭제 표시는 이 브라우저에만 저장합니다 (다른 기기와는 따로) */
interface IReadState { ids: string[]; all: string; del: string[] }
function loadRead(key: string): IReadState {
  try { const v = JSON.parse(window.localStorage.getItem(key) || ''); if (v && v.ids) { return { ids: v.ids, all: v.all || '', del: v.del || [] }; } } catch (e) { /* 없음 */ }
  return { ids: [], all: '', del: [] };
}
function saveRead(key: string, s: IReadState): void {
  try { window.localStorage.setItem(key, JSON.stringify({ ids: s.ids.slice(-300), all: s.all, del: s.del.slice(-500) })); } catch (e) { /* 저장 못 해도 동작 */ }
}

export default function MuniAgentHub(props: IMuniAgentHubProps): JSX.Element {
  const { service } = props;
  const [route, setRoute] = React.useState<IRoute>(readHash);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [modal, setModal] = React.useState<ModalState>(undefined);
  const [viewer, setViewer] = React.useState<{ tool: IHtmlTool; html?: string; err?: string } | undefined>(undefined);
  const [me, setMe] = React.useState<IMe | undefined>(undefined);
  const [data, setData] = React.useState<IHubData>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [toastMsg, setToastMsg] = React.useState('');
  const [menu, setMenu] = React.useState<'' | 'market' | 'account' | 'notif'>('');
  const [readState, setReadState] = React.useState<IReadState>({ ids: [], all: '', del: [] });
  const customLogo = (props.logoUrl || '').trim();
  const [customLogoFailed, setCustomLogoFailed] = React.useState(false);
  React.useEffect(() => { setCustomLogoFailed(false); }, [customLogo]);
  const logoSrc = customLogo && !customLogoFailed ? customLogo : MUNI_LOGO;
  const toastTimer = React.useRef<number>(0);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const bellRef = React.useRef<HTMLAnchorElement>(null);
  const now = React.useMemo(() => new Date(), [data]);
  const readKey = me ? `muniAiHub.read.${me.id}` : '';
  React.useEffect(() => { if (readKey) { setReadState(loadRead(readKey)); } }, [readKey]);
  /** 프로필 사진을 못 불러오면(사진 없음 등) 이름 첫 글자로 */
  const [photoFailed, setPhotoFailed] = React.useState(false);

  const toast = React.useCallback((m: string): void => {
    setToastMsg(m);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg(''), 2800);
  }, []);
  const fail = (e: unknown): void => {
    toast(e instanceof HubError || e instanceof Error ? e.message : '요청을 처리하지 못했어요. 잠시 후 다시 시도해 주세요.');
  };

  /* ---------- 불러오기 ---------- */
  const load = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      if (!me) { setMe(await service.getMe()); }
      setData(await service.loadAll());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hub 데이터를 불러오지 못했어요.');
    } finally {
      setLoading(false);
    }
  }, [service, me]);
  React.useEffect(() => { load().catch(() => undefined); }, [service]);

  /* ---------- 자동 새로 고침 (Home의 '지금 부문별 1위'를 실시간으로) ----------
     Home을 보고 있고 팝업이 없고 브라우저 탭이 보일 때만 1분마다 조용히 다시 읽습니다.
     다른 탭에 있다 돌아오면 바로 한 번 읽습니다. 불러오는 중 표시나 오류 화면은 띄우지 않습니다. */
  const refreshing = React.useRef(false);
  const lastRefresh = React.useRef(0);
  const liveOn = route.view === 'home' && !modal && !loading && !error && !!me;
  React.useEffect(() => {
    if (!liveOn) { return undefined; }
    const refresh = (): void => {
      if (refreshing.current || document.visibilityState === 'hidden') { return; }
      refreshing.current = true;
      lastRefresh.current = Date.now();
      service.loadAll().then(d => setData(d), () => undefined).then(() => { refreshing.current = false; }, () => { refreshing.current = false; });
    };
    const timer = window.setInterval(refresh, REFRESH_MS);
    const onVisible = (): void => { if (document.visibilityState === 'visible' && Date.now() - lastRefresh.current > 15000) { refresh(); } };
    document.addEventListener('visibilitychange', onVisible);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', onVisible); };
  }, [liveOn, service]);

  /** 지금 보고 있는 상세 중 이미 센 것 ('Agent:7'). 상세를 떠나면 비웁니다 */
  const viewCounted = React.useRef('');
  /* ---------- 조회 기록 ----------
     Agent·Skill·HTML 상세를 열면 그 항목의 ViewCount 를 1 올립니다(AgentList · HubContents).
     들어올 때마다 1회 셉니다. 상세에 머무는 동안 데이터를 다시 읽어도 또 세지 않고, 다른 화면에 갔다가 다시 들어오면 또 셉니다. */
  React.useEffect(() => {
    const t: TargetType | undefined = route.view === 'agent' ? 'Agent' : route.view === 'skill' ? 'Skill' : route.view === 'htool' ? 'Html' : undefined;
    const tag = t && route.id ? `${t}:${route.id}` : '';
    // 상세를 떠나면(또는 다른 게시물로 가면) 다음에 들어올 때 다시 셀 수 있게 비웁니다
    if (viewCounted.current && viewCounted.current !== tag) { viewCounted.current = ''; }
    if (!t || !tag || !me || viewCounted.current === tag) { return; }
    const item = t === 'Agent' ? first(data.agents, a => a.id === route.id) : t === 'Skill' ? first(data.skills, s => s.id === route.id) : first(data.htmls, h => h.id === route.id);
    if (!item) { return; }
    // 지금은 내 게시물을 내가 본 것도 셉니다. 빼려면 위쪽 COUNT_OWN_VIEWS 를 false 로
    const poster = t === 'Agent' ? (item as IAgent).owner : (item as ISkill | IHtmlTool).author;
    if (!COUNT_OWN_VIEWS && poster && poster.id === me.id) { return; }
    viewCounted.current = tag;
    const id = item.id;
    const bump = <T extends { id: number; views?: number }>(x: T): T => x.id === id ? { ...x, views: (x.views || 0) + 1 } : x;
    service.recordView(t, id).then(() => {
      // 다시 읽기 전에도 숫자가 바로 오르게
      setData(d => t === 'Agent' ? { ...d, agents: d.agents.map(bump) } : t === 'Skill' ? { ...d, skills: d.skills.map(bump) } : { ...d, htmls: d.htmls.map(bump) });
    }, e => {
      // 화면에는 띄우지 않고, 원인을 F12 콘솔에 남깁니다
      console.warn(`[MUNI AI Hub] 조회수를 올리지 못했어요 (${tag}):`, e instanceof Error ? e.message : e);
    });
  }, [route.view, route.id, me, data.agents.length, data.skills.length, data.htmls.length]);

  /* ---------- 화면 전환 ---------- */
  React.useEffect(() => {
    const onHash = (): void => { setRoute(readHash()); setModal(undefined); setMenu(''); };
    window.addEventListener('popstate', onHash);
    window.addEventListener('hashchange', onHash);
    return () => { window.removeEventListener('popstate', onHash); window.removeEventListener('hashchange', onHash); };
  }, []);
  const go = React.useCallback((view: HubView, id?: number): void => {
    const r: IRoute = { view, id };
    setModal(undefined);
    setMenu('');
    setRoute(r);
    try { window.history.pushState(window.history.state, '', hashOf(r)); } catch (e) { /* 무시 */ }
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) { el.scrollIntoView({ block: 'start' }); }
  }, []);
  const goHome = (): void => { go('home'); load().catch(() => undefined); };
  const search = (q: string): void => { setSearchQuery(q); go('search'); };

  // 바깥을 누르거나 Esc 면 펼친 메뉴·알림을 닫습니다
  React.useEffect(() => {
    if (!menu) { return undefined; }
    const close = (e: MouseEvent): void => { const t = e.target as Element; if (!t.closest || !t.closest('.menu-host')) { setMenu(''); } };
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') { setMenu(''); } };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [menu]);

  /* ---------- 반응 (SharePoint 기본 평점·좋아요·항목 댓글) ---------- */
  const isMe = (p?: IPerson): boolean => !!me && !!p && (p.id ? p.id === me.id : !!p.email && p.email.toLowerCase() === me.email.toLowerCase());
  const mineOf = (t: TargetType, id: number, kind: ReactionKind): IReaction | undefined =>
    first(data.reactions, r => r.targetType === t && r.targetId === id && r.kind === kind && isMe(r.author));
  const meAsPerson = (): IPerson => ({ id: me!.id, name: me!.name, email: me!.email });
  // 즐겨찾기(♡)는 SharePoint에 둘 곳이 없어 이 브라우저에만 저장합니다
  const favKey = me ? `muniAiHub.fav.${me.id}` : '';
  const [favs, setFavs] = React.useState<string[]>([]);
  React.useEffect(() => {
    if (!favKey) { return; }
    try { const v = JSON.parse(window.localStorage.getItem(favKey) || '[]'); setFavs(Object.prototype.toString.call(v) === '[object Array]' ? v : []); } catch (e) { setFavs([]); }
  }, [favKey]);
  const toggleFav = (t: TargetType, id: number): boolean => {
    const k = `${t}:${id}`;
    const on = favs.indexOf(k) < 0;
    const next = on ? favs.concat([k]) : favs.filter(x => x !== k);
    setFavs(next);
    try { window.localStorage.setItem(favKey, JSON.stringify(next)); } catch (e) { /* 저장 못 해도 이번 화면에서는 동작 */ }
    return on;
  };
  /** 아이디어를 바꾸고, 그 아이디어에서 나온 공감·만들래요·시작 반응도 다시 만듭니다 */
  const withIdeas = (d: IHubData, ideas: IIdea[]): IHubData => ({
    ...d, ideas, reactions: d.reactions.filter(r => !/^(lk|mk|st):Idea:/.test(r.id)).concat(HubService.ideaReactions(ideas))
  });
  const patchIdea = (id: number, change: (i: IIdea) => IIdea): void => setData(d => withIdeas(d, d.ideas.map(i => i.id === id ? change(i) : i)));
  /** 사람 열(공감한 사람·함께 만드는 사람)에 나를 넣거나 빼고, 저장한 뒤의 실제 명단으로 맞춥니다 */
  const togglePeople = async (id: number, field: 'likers' | 'makers'): Promise<boolean> => {
    const cur = first(data.ideas, i => i.id === id);
    if (!cur || !me) { return false; }
    const on = !cur[field].some(p => isMe(p));
    const before = data.ideas;
    patchIdea(id, i => ({ ...i, [field]: on ? i[field].concat([meAsPerson()]) : i[field].filter(p => !isMe(p)) }));
    try {
      if (field === 'likers') { await service.setLike(id, on); return on; }
      const ids = await service.setMaker(id, me.id, on);
      if (!ids.length) { patchIdea(id, i => ({ ...i, startedOn: '', status: '모집 중' })); }
      // 다른 사람이 그사이 눌렀으면 그 사람 이름은 다음 새로 읽기에서 채워집니다
      if (ids.some(x => !cur[field].some(p => p.id === x) && x !== me.id)) { service.getIdeas().then(ideas => setData(d => withIdeas(d, ideas)), () => undefined); }
      return on;
    } catch (e) { setData(d => withIdeas(d, before)); throw e; }
  };
  const toggleIdeaLike = (id: number): Promise<boolean> => togglePeople(id, 'likers');
  const addIdeaComment = async (id: number, text: string): Promise<IReaction> => {
    const saved = await service.addComment('Idea', id, text);
    const r: IReaction = { ...saved, author: saved.author && saved.author.id ? saved.author : meAsPerson(), created: saved.created || new Date().toISOString() };
    setData(d => ({ ...d, reactions: d.reactions.concat([r]) }));
    return r;
  };
  const removeComment = async (r: IReaction): Promise<void> => {
    await service.removeComment(r.targetType, r.targetId, r.commentId || 0);
    setData(d => ({ ...d, reactions: d.reactions.filter(x => x.id !== r.id) }));
  };
  /** 리뷰: 별점은 기본 별 등급(다시 매기면 바뀜), 글은 항목 댓글 */
  const addReview = async (t: TargetType, id: number, rating: number, body: string): Promise<boolean> => {
    if (!me || t === 'Idea') { return false; }
    try {
      // 리뷰는 여러 개 남길 수 있습니다. 각 리뷰의 별점은 댓글 앞('[★4] ')에 남기고,
      // 목록의 평점(별 등급, 1인 1개)은 가장 최근 별점으로 맞춰 SharePoint 화면에서도 보이게 합니다.
      const saved = await service.addComment(t, id, reviewText(rating, body.trim()));
      await service.setRating(t, id, rating).catch(() => undefined);
      setData(d => {
        // 별점만 있던 내 줄(SharePoint 화면에서 누른 별점)은 새 리뷰로 대신합니다
        const rest = d.reactions.filter(r => !(r.targetType === t && r.targetId === id && r.kind === '리뷰' && isMe(r.author) && r.id.indexOf('rt:') === 0));
        const mine: IReaction = { ...saved, rating, author: saved.author && saved.author.id ? saved.author : meAsPerson(), created: saved.created || new Date().toISOString() };
        return { ...d, reactions: rest.concat([mine]) };
      });
      toast('리뷰를 남겼어요');
      return true;
    } catch (e) { fail(e); return false; }
  };
  /** 내 리뷰 고치기. SharePoint 기본 댓글은 고칠 수 없어서, 고친 내용으로 새 댓글을 달고 이전 댓글을 지웁니다(날짜는 고친 날로 바뀜). */
  const editReview = async (rid: string, rating: number, body: string): Promise<boolean> => {
    const old = first(data.reactions, x => x.id === rid);
    if (!me || !old || old.targetType === 'Idea' || !isMe(old.author)) { return false; }
    const t = old.targetType;
    try {
      const saved = await service.addComment(t, old.targetId, reviewText(rating, body.trim()));
      await service.setRating(t, old.targetId, rating).catch(() => undefined);
      let removed = true;
      if (old.commentId) { await service.removeComment(t, old.targetId, old.commentId).catch(() => { removed = false; }); }
      const mine: IReaction = { ...saved, rating, author: saved.author && saved.author.id ? saved.author : meAsPerson(), created: saved.created || new Date().toISOString() };
      setData(d => ({ ...d, reactions: d.reactions.filter(x => !(removed && x.id === rid)).concat([mine]) }));
      toast(removed ? '리뷰를 고쳤어요' : '고친 리뷰를 올렸어요. 이전 리뷰는 지우지 못했어요.');
      return true;
    } catch (e) { fail(e); return false; }
  };

  /* ---------- 등록 (Agent는 배포 흐름이 AgentList에 채우므로 Hub에서 등록하지 않습니다) ---------- */
  // Skill·HTML 올리기는 실패하면 오류를 던집니다. 폼이 받아서 버튼 위에 자세한 안내를 띄웁니다.
  const submitSkill = async (s: INewSkill, editId?: number): Promise<void> => {
    const cur = editId ? first(data.skills, x => x.id === editId) : undefined;
    const id = cur ? (await service.updateSkill(cur, s), cur.id) : await service.createSkill(s);
    // 저장은 끝났으니, 목록 새로 읽기가 실패해도 성공으로 봅니다
    const skills = await service.getSkills().catch(() => undefined);
    if (skills) { setData(d => ({ ...d, skills, skillsError: undefined })); }
    go('skill', id);
    toast(cur ? `저장했어요. 지금 버전은 v${s.version}이에요.` : 'Skill을 올렸어요.');
  };
  const submitHtml = async (h: INewHtml, editId?: number): Promise<void> => {
    const cur = editId ? first(data.htmls, x => x.id === editId) : undefined;
    const id = cur ? (await service.updateHtml(cur, h), cur.id) : await service.createHtml(h);
    const htmls = await service.getHtmls().catch(() => undefined);
    if (htmls) { setData(d => ({ ...d, htmls, htmlsError: undefined })); }
    go('htool', id);
    toast(cur ? `저장했어요. 지금 버전은 v${h.version}이에요.` : 'HTML을 올렸어요.');
  };
  const submitCase = async (c: INewCase, editId?: number): Promise<boolean> => {
    try {
      // 승인 단계 없이 바로 공개됩니다. 올린(고친) 사례의 상세 화면으로 이동합니다.
      const id = editId ? (await service.updateCase(editId, c), editId) : await service.createCase(c);
      const cases = await service.getCases().catch(() => undefined);
      if (cases) { setData(d => ({ ...d, cases, casesError: undefined })); }
      go('case', id);
      toast(editId ? '사례를 고쳤어요.' : '사례를 올렸어요.');
      return true;
    } catch (e) { fail(e); return false; }
  };
  const copy = (text: string, done: string): void => {
    const nav = window.navigator as Navigator & { clipboard?: { writeText(t: string): Promise<void> } };
    if (nav.clipboard) { nav.clipboard.writeText(text).then(() => toast(done), () => toast('복사하지 못했어요.')); } else { toast('복사하지 못했어요.'); }
  };
  const soon = (what: string): void => toast(`${what} · 준비 중이에요`);
  const openHtml = (tool: IHtmlTool): void => {
    setViewer({ tool });
    service.getFileText(tool.fileRef).then(html => setViewer(v => v && v.tool.id === tool.id ? { tool, html } : v),
      e => setViewer(v => v && v.tool.id === tool.id ? { tool, err: e instanceof Error ? e.message : '파일을 읽지 못했어요.' } : v));
  };

  /* ---------- 하위 화면에 내려 줄 동작 ---------- */
  const reviewsOf = (t: TargetType, id: number): IReaction[] => data.reactions
    .filter(r => r.targetType === t && r.targetId === id && r.kind === '리뷰').sort((x, y) => (y.created || '').localeCompare(x.created || ''));
  const markRead = (ids: string[]): void => {
    const n = { ids: readState.ids.concat(ids.filter(i => readState.ids.indexOf(i) < 0)), all: readState.all, del: readState.del };
    setReadState(n); if (readKey) { saveRead(readKey, n); }
  };
  // 지운 알림은 목록과 숫자에서 빠집니다 (원래 리뷰·댓글은 그대로)
  const removeNotices = (ids: string[], msg: string): void => {
    const n = { ids: readState.ids, all: readState.all, del: readState.del.concat(ids.filter(i => readState.del.indexOf(i) < 0)) };
    setReadState(n); if (readKey) { saveRead(readKey, n); }
    toast(msg);
  };
  /* ---------- 프로필 배지 ----------
     배지는 모두가 보는 목록 데이터로 계산하므로 다른 사람 것도 같은 결과가 나옵니다.
     고른 배지는 HubProfiles 목록(사람당 한 줄, AvatarBadge)에 저장합니다. */
  const avatarCache: { [id: number]: string | undefined } = {};
  const avatarOf = (p?: IPerson): string | undefined => {
    if (!p || !p.id) { return undefined; }
    if (p.id in avatarCache) { return avatarCache[p.id]; }
    const got = badges(data, p, now).filter(b => b.got);
    const pick = (data.avatars || {})[p.id] || '';
    const latest = got.slice().sort((x, y) => (y.date || '').localeCompare(x.date || ''))[0];
    // 'photo' = 사진 · 고른 배지가 아직 있으면 그 배지 · 아니면 최근 배지
    const k = pick === 'photo' ? undefined : (got.some(b => b.k === pick) ? pick : (latest ? latest.k : undefined));
    avatarCache[p.id] = k;
    return k;
  };
  const pickAvatar = (key: string): void => {
    if (!me) { return; }
    const before = data.avatars || {};
    setData(d => ({ ...d, avatars: { ...(d.avatars || {}), [me.id]: key } }));
    service.setAvatarBadge(me.id, me.email, key).then(
      () => toast(key === 'photo' ? '프로필을 내 사진으로 바꿨어요' : key ? '프로필을 이 배지로 바꿨어요' : '최근 받은 배지를 프로필로 써요'),
      e => { setData(d => ({ ...d, avatars: before })); fail(e); });
  };

  const api: IHubApi | undefined = me ? {
    data, me, now, searchQuery, go, search,
    // 아이디어는 공감 수, Agent·Skill·HTML은 즐겨찾기(이 브라우저)라 수를 세지 않습니다
    likeCount: (t, id) => t === 'Idea' ? data.reactions.filter(r => r.targetType === 'Idea' && r.targetId === id && r.kind === '좋아요').length : 0,
    liked: (t, id) => t === 'Idea' ? !!mineOf('Idea', id, '좋아요') : favs.indexOf(`${t}:${id}`) >= 0,
    favorites: () => favs.map(k => { const i = k.indexOf(':'); return { t: k.slice(0, i) as TargetType, id: Number(k.slice(i + 1)) }; }),
    toggleLike: (t, id) => {
      if (t !== 'Idea') { toast(toggleFav(t, id) ? '즐겨찾기에 넣었어요' : '즐겨찾기에서 뺐어요'); return; }
      toggleIdeaLike(id).then(on => toast(on ? '공감했어요' : '공감을 취소했어요')).catch(fail);
    },
    reviews: reviewsOf,
    rating: (t, id) => ratingOf(reviewsOf(t, id)),
    addReview,
    editReview,
    makers: id => { const i = first(data.ideas, x => x.id === id); return i ? i.makers : []; },
    started: id => { const i = first(data.ideas, x => x.id === id); return i && i.startedOn ? { date: i.startedOn } : undefined; },
    toggleStart: id => {
      const i = first(data.ideas, x => x.id === id);
      if (!i) { return; }
      const on = !i.startedOn;
      service.setStarted(id, on).then(at => {
        patchIdea(id, x => ({ ...x, startedOn: at, status: on ? '제작 중' : '모집 중' }));
        toast(on ? '만들기를 시작했어요. 제작 중으로 바뀌어요' : "만들기를 멈췄어요. '함께할 사람 찾기' 단계로 돌아가요");
      }).catch(fail);
    },
    stageOf: i => ideaStage(i, now),
    updateIdea: async (id, idea) => {
      try { await service.updateIdea(id, idea); patchIdea(id, i => ({ ...i, ...idea, detail: idea.detail || '', pain: idea.pain || '', frequency: idea.frequency || '' })); toast('아이디어를 고쳤어요'); return true; } catch (e) { fail(e); return false; }
    },
    deleteIdea: async id => {
      try { await service.deleteIdea(id); setData(d => ({ ...d, ideas: d.ideas.filter(i => i.id !== id) })); toast('아이디어를 지웠어요. 사이트 휴지통에서 되살릴 수 있어요'); return true; } catch (e) { fail(e); return false; }
    },
    editComment: async (rid, body) => {
      const old = first(data.reactions, x => x.id === rid);
      if (!old || !isMe(old.author)) { return false; }
      try {
        await addIdeaComment(old.targetId, body.trim());
        let removed = true;
        await removeComment(old).catch(() => { removed = false; });
        toast(removed ? '댓글을 고쳤어요' : '고친 댓글을 올렸어요. 이전 댓글은 지우지 못했어요.');
        return true;
      } catch (e) { fail(e); return false; }
    },
    deleteCase: async id => {
      try { await service.deleteCase(id); setData(d => ({ ...d, cases: d.cases.filter(c => c.id !== id) })); toast('사례를 지웠어요. 사이트 휴지통에서 되살릴 수 있어요'); return true; } catch (e) { fail(e); return false; }
    },
    toggleMake: id => {
      const i = first(data.ideas, x => x.id === id);
      const others = i ? i.makers.filter(p => !isMe(p)).length : 0;
      togglePeople(id, 'makers').then(on => toast(!on ? '참여를 취소했어요' : others ? '만들래요에 참여했어요. 만드는 사람들과 Teams로 이야기해 보세요' : '손을 들었어요. 같이 할 사람을 기다려요')).catch(fail);
    },
    comments: id => data.reactions.filter(r => r.targetType === 'Idea' && r.targetId === id && r.kind === '댓글').sort((x, y) => (x.created || '').localeCompare(y.created || '')),
    addIdea: async idea => {
      try { await service.createIdea(idea); const ideas = await service.getIdeas(); setData(d => withIdeas(d, ideas)); toast('포스트잇을 붙였어요'); return true; } catch (e) { fail(e); return false; }
    },
    addComment: async (id, body) => {
      try { await addIdeaComment(id, body); toast('댓글을 달았어요'); return true; } catch (e) { fail(e); return false; }
    },
    deleteComment: async rid => {
      const r = first(data.reactions, x => x.id === rid);
      if (!r) { return false; }
      try { await removeComment(r); toast('댓글을 지웠어요'); return true; } catch (e) { fail(e); return false; }
    },
    reviveIdea: async id => {
      try { const at = await service.reviveIdea(id); patchIdea(id, i => ({ ...i, revivedOn: at, archivedOn: '', status: '모집 중' })); toast('보관을 해제했어요'); return true; } catch (e) { fail(e); return false; }
    },
    openSkillForm: id => setModal({ kind: 'skill', id }),
    openHtmlForm: id => setModal({ kind: 'html', id }),
    openCaseForm: id => setModal({ kind: 'case', id }),
    openIdeaForm: id => setModal({ kind: 'idea', id }),
    openReport: target => setModal({ kind: 'report', target }),
    openHtml,
    deleteSkill: async id => {
      try { await service.deleteSkill(id); setData(d => ({ ...d, skills: d.skills.filter(x => x.id !== id) })); go('skills'); toast('삭제했어요. 사이트 휴지통에서 되살릴 수 있어요'); return true; } catch (e) { fail(e); return false; }
    },
    deleteHtml: async id => {
      try { await service.deleteHtml(id); setData(d => ({ ...d, htmls: d.htmls.filter(x => x.id !== id) })); go('htools'); toast('삭제했어요. 사이트 휴지통에서 되살릴 수 있어요'); return true; } catch (e) { fail(e); return false; }
    },
    loadFileText: ref => service.getFileText(ref),
    loadVersions: (t, id): Promise<IVersion[]> => t === 'Agent' ? service.getAgentVersions(id) : t === 'Skill' ? service.getSkillVersions(id) : service.getHtmlVersions(id),
    avatarOf,
    isRead: (id, date) => readState.ids.indexOf(id) >= 0 || (!!readState.all && date <= readState.all),
    markRead,
    markAllRead: () => { const n = { ids: [], all: new Date().toISOString(), del: readState.del }; setReadState(n); if (readKey) { saveRead(readKey, n); } toast('모두 읽음으로 표시했어요'); },
    copy,
    copyLink: (v, id) => copy(window.location.href.replace(/#.*$/, '') + hashOf({ view: v, id }), '링크를 복사했어요'),
    launchDesk: () => {
      const u = (props.launchDeskUrl || '').trim();
      if (isHttpsUrl(u)) { window.open(u, '_blank', 'noopener'); toast('Teams에서 Launch Desk가 열려요'); } else { soon('Launch Desk 연결'); }
    },
    soon,
    toast
  } : undefined;

  /* ---------- 알림 ---------- */
  const allNotices: INotice[] = api ? notices(data, api.me, now).filter(n => readState.del.indexOf(n.id) < 0) : [];
  const unread = api ? allNotices.filter(n => !api.isRead(n.id, n.date)) : [];
  const shownNotices = allNotices;
  const allBadges = api ? badges(data, api.me, now) : [];
  const myBadges = allBadges.filter(b => b.got);
  // 아직 못 받은 배지 (진행률 높은 순). Case Library 올리기를 없앨 예정이라 '첫 사례'는 빼요
  const lockedBadges = allBadges.filter(b => !b.got && b.k !== 'first-case')
    .sort((x, y) => ((y.have || 0) / (y.need || 1)) - ((x.have || 0) / (x.need || 1)));
  // 프로필 동그라미: 고른 배지 → 없으면 최근 배지. 사진을 골랐거나 배지가 없으면 Microsoft 365 프로필 사진
  const myAvatarKey = me ? avatarOf(me) : undefined;
  const avBadge = first(myBadges, b => b.k === myAvatarKey);
  const myPick = me ? ((data.avatars || {})[me.id] || '') : '';
  const photoUrl = me && me.email && !photoFailed
    ? `${props.siteUrl.replace(/\/+$/, '')}/_layouts/15/userphoto.aspx?size=M&accountname=${encodeURIComponent(me.email)}` : '';
  // 배지가 있으면 동그라미 전체를 배지로, 없으면 프로필 사진(없으면 이름 첫 글자)
  // 크기·모양은 CSS가 늦게 반영돼도 깨지지 않게 요소에 직접 지정합니다
  const avFace = (cls: string, size: number): JSX.Element => {
    const box: React.CSSProperties = { width: size, height: size, flex: 'none', display: 'grid', placeItems: 'center', borderRadius: '50%', overflow: 'hidden' };
    if (avBadge) {
      // 메달이 동그라미 밖으로 잘리지 않게 배경 없이 그대로
      return (
        <span className={cls} aria-hidden="true" title={avBadge.title} style={{ ...box, background: 'transparent', overflow: 'visible', borderRadius: 0 }}>
          <BadgeMedal k={avBadge.k} size={size + 4} ribbon={false} />
        </span>
      );
    }
    return (
      <span className={cls} aria-hidden="true" style={box}>
        {photoUrl
          ? <img src={photoUrl} alt="" onError={() => setPhotoFailed(true)} style={{ width: size, height: size, maxWidth: size, objectFit: 'cover', display: 'block' }} />
          : (me ? me.name.trim().charAt(0) : '')}
      </span>
    );
  };
  const groupOf = (iso: string): string => { const d = Math.floor((now.getTime() - new Date(iso).getTime()) / 86400000); return d < 1 && new Date(iso).getDate() === now.getDate() ? '오늘' : d < 7 ? '이번 주' : '이전'; };
  const bellPos = (): React.CSSProperties => {
    const b = bellRef.current;
    if (!b) { return {}; }
    const r = b.getBoundingClientRect();
    return { top: r.bottom + 10, right: Math.max(12, window.innerWidth - r.right - 6) };
  };

  /* ---------- 본문 ---------- */
  const navOn = NAV_OF[route.view] || route.view;
  let body: React.ReactNode = null;
  if (api) {
    const id = route.id || 0;
    switch (route.view) {
      case 'market': body = <MarketView api={api} />; break;
      case 'agents': body = <AgentStore api={api} />; break;
      case 'skills': body = <SkillStore api={api} />; break;
      case 'htools': body = <HtmlStore api={api} />; break;
      case 'agent': body = <AgentPage api={api} agent={first(data.agents, x => x.id === id)} />; break;
      case 'skill': body = <SkillPage api={api} skill={first(data.skills, x => x.id === id)} />; break;
      case 'htool': body = <HtmlPage api={api} tool={first(data.htmls, x => x.id === id)} />; break;
      case 'ideas': body = <IdeaBoard api={api} />; break;
      case 'idea': body = <IdeaPage api={api} idea={first(data.ideas, x => x.id === id)} />; break;
      case 'cases': body = <CaseLibrary api={api} />; break;
      case 'case': body = <CasePage api={api} item={first(data.cases, x => x.id === id)} />; break;
      case 'maker': body = <MakerLab api={api} />; break;
      case 'search': body = <SearchView api={api} />; break;
      case 'me': body = <MyWorkspace api={api} />; break;
      default: body = <HomeView api={api} />;
    }
  }

  /* ---------- 모달 ---------- */
  let modalTitle = '';
  let modalSub: React.ReactNode = undefined;
  let modalBody: React.ReactNode = null;
  let modalWidth: number | undefined;
  const closeModal = (): void => setModal(undefined);
  if (api && modal) {
    if (modal.kind === 'skill') {
      const cur = modal.id ? first(data.skills, x => x.id === modal.id) : undefined;
      modalTitle = cur ? 'Skill 새 버전 올리기' : 'Skill 올리기';
      modalSub = cur ? `${cur.title} · 지금 v${cur.version}` : undefined;
      modalBody = <SkillForm key={modal.id || 0} skill={cur} existingTitles={data.skills.map(s => s.title)} libName={service.listName('contents')} onCancel={closeModal} onSubmit={s => submitSkill(s, cur ? cur.id : undefined)} />;
    } else if (modal.kind === 'html') {
      const cur = modal.id ? first(data.htmls, x => x.id === modal.id) : undefined;
      modalTitle = cur ? 'HTML 새 버전 올리기' : 'HTML 올리기';
      modalSub = cur ? `${cur.title} · 지금 v${cur.version}` : undefined;
      modalBody = <HtmlForm key={modal.id || 0} tool={cur} existingTitles={data.htmls.map(h => h.title)} libName={service.listName('contents')} onCancel={closeModal} onSubmit={h => submitHtml(h, cur ? cur.id : undefined)} />;
    } else if (modal.kind === 'case') {
      const cur = modal.id ? first(data.cases, x => x.id === modal.id) : undefined;
      modalTitle = cur ? '사례 고치기' : '사례 올리기';
      modalBody = <CaseForm key={modal.id || 0} now={now} item={cur} onCancel={closeModal} onSubmit={c => submitCase(c, cur ? cur.id : undefined)} />;
    } else if (modal.kind === 'idea') {
      const cur = first(data.ideas, x => x.id === modal.id);
      modalTitle = '아이디어 고치기';
      modalWidth = 560;
      modalBody = cur ? <IdeaEditForm idea={cur} onCancel={closeModal} onSubmit={async idea => { const ok = await api.updateIdea(cur.id, idea); if (ok) { closeModal(); } return ok; }} /> : null;
    } else {
      const t = modal.target;
      modalTitle = '오류 신고';
      modalWidth = 640;
      modalSub = `${t.title} · 받는 사람: ${t.owner ? `Owner ${t.owner.name}` : 'Hub 관리자'}${t.owner && props.adminEmail ? ' · 참조: Hub 관리자' : ''}`;
      modalBody = <ReportForm target={t} adminEmail={props.adminEmail || ''} reporter={api.me.name} onCancel={closeModal} onSent={() => { closeModal(); toast('메일 앱을 열었어요. 화면 캡처를 첨부해 보내 주세요'); }} />;
    }
  }

  const nav = (v: HubView, icon: JSX.Element, label: string, cls?: string): JSX.Element => (
    <a key={v} href={'#' + v} className={cls} aria-current={navOn === v ? 'page' : undefined}
      onClick={e => { e.preventDefault(); if (v === 'home') { goHome(); } else { go(v); } }}>{icon}{label}</a>
  );
  const groups: string[] = [];
  shownNotices.forEach(n => { const g = groupOf(n.date); if (groups.indexOf(g) < 0) { groups.push(g); } });

  return (
    <div ref={rootRef} className={styles.muniHub}>
      {props.showHeader ? (
        <header className="hd" onMouseLeave={() => { if (menu === 'market') { setMenu(''); } }}>
          <div className="wrap">
            <a className="logo" href="#home" title="Home (새로 고침)" onClick={e => { e.preventDefault(); goHome(); }}>
              <img src={logoSrc} alt="" style={{ height: 22, width: 'auto', display: 'block' }} onError={() => { if (logoSrc !== MUNI_LOGO) { setCustomLogoFailed(true); } }} />MUNI AI Hub</a>
            <nav className="gnav" aria-label="전역 메뉴">
              {nav('home', <IconHome />, 'Home')}
              <a href="#market" id="mktBtn" className="menu-host" aria-current={navOn === 'market' ? 'page' : undefined} aria-haspopup="true" aria-expanded={menu === 'market'} aria-controls="hub-mkmenu"
                onMouseEnter={() => setMenu('market')} onFocus={() => setMenu('market')}
                onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setMenu('market'); } }}
                onClick={e => { e.preventDefault(); go('market'); }}><IconMarket />Marketplace<i className="caret" aria-hidden="true" /></a>
              {nav('ideas', <IconIdeas />, 'Idea Board')}
              {nav('cases', <IconCases />, 'Case Library')}
              {nav('maker', <IconMaker />, 'Maker Lab', 'mk')}
            </nav>
            <div className="util">
              <a href="#search" aria-label="Hub 검색" onClick={e => { e.preventDefault(); go('search'); }}><IconSearch />검색</a>
              <span className="menu-host" style={{ display: 'contents' }}>
                <a href="#notif" className="notifBtn" ref={bellRef} role="button" aria-haspopup="dialog" aria-controls="hub-npanel" aria-expanded={menu === 'notif'} aria-label={`알림 ${unread.length}개`}
                  onClick={e => { e.preventDefault(); setMenu(menu === 'notif' ? '' : 'notif'); }}><IconBell /><span className="sr">알림</span>{unread.length ? <span className="nbadge" aria-hidden="true">{unread.length}</span> : null}</a>
              </span>
              <div className="umenu menu-host">
                <button type="button" className="avbtn" aria-haspopup="dialog" aria-expanded={menu === 'account'} aria-controls="hub-medrawer" onClick={() => setMenu(menu === 'account' ? '' : 'account')}>
                  {avFace('av', 30)}<span className="sr">내 프로필 열기</span></button>
              </div>
            </div>
          </div>
          {/* menu-host: 메뉴 안을 누를 때 '바깥 누르면 닫기'가 먼저 메뉴를 닫아 클릭이 사라지지 않게 */}
          <div className="mktmenu menu-host" id="hub-mkmenu" hidden={menu !== 'market'} onMouseEnter={() => setMenu('market')}>
            <div className="wrap"><p className="mk-h">Marketplace</p><div className="mk-grid">
              <Go go={go} view="agents" className="mk-card"><span className="mk-top"><IconAgent /><em>{data.agents.length}</em></span><b>Agent</b><span>회사에서 정식으로 쓰는 Agent. 업무에 바로 열어 써요</span></Go>
              <Go go={go} view="skills" className="mk-card"><span className="mk-top"><IconSkill /><em>{data.skills.length}</em></span><b>Skill</b><span>Agent에 붙여 결과를 맞추는 지침·양식 파일</span></Go>
              <Go go={go} view="htools" className="mk-card"><span className="mk-top"><IconHtml /><em>{data.htmls.length}</em></span><b>HTML</b><span>브라우저에서 바로 여는 계산기·판단 도구</span></Go>
              <Go go={go} view="market" className="mk-all"><b>Marketplace 전체 보기 →</b><span>인기·새로 올라온 것을 한눈에</span></Go>
            </div></div>
          </div>
          {/* Marketplace 아래 화면에서만 보이는 종류 탭 (시안 mkSub) */}
          {MK_OF[route.view] ? (
            <nav className="mksub" aria-label="Marketplace 종류"><div className="wrap">
              <Go go={go} view="market" className="mks-home" current={MK_OF[route.view] === 'm'}><IconGrid />전체</Go>
              <Go go={go} view="agents" current={MK_OF[route.view] === 'a'}><IconAgent />Agent <span>{data.agents.length}</span></Go>
              <Go go={go} view="skills" current={MK_OF[route.view] === 's'}><IconSkill />Skill <span>{data.skills.length}</span></Go>
              <Go go={go} view="htools" current={MK_OF[route.view] === 'h'}><IconHtml />HTML <span>{data.htmls.length}</span></Go>
            </div></nav>
          ) : null}
        </header>
      ) : null}

      <main className="page on" data-hub-page={PAGE_ID[route.view]} aria-label={TITLES[route.view] || 'Home'}>
        {error ? (
          <div className="wrap"><div className="state err-state" role="alert"><b>Hub를 불러오지 못했어요</b><p>{error}</p>
            <button type="button" className="btn" onClick={() => { load().catch(() => undefined); }}>다시 시도</button></div></div>
        ) : loading && !api ? (
          <div className="wrap"><div className="state" aria-busy="true"><span className="spin" aria-hidden="true" /><p>MUNI AI Hub를 불러오는 중이에요</p></div></div>
        ) : <>
          {data.reactionsError ? <div className="wrap"><p className="note" role="status" style={{ margin: '16px 0 0', color: '#b42318' }}>별점 · 공감 · 댓글 일부를 불러오지 못했어요. {data.reactionsError}</p></div> : null}
          {body}
        </>}
      </main>

      <footer className="sfoot"><div className="wrap"><nav aria-label="도움말">
        <a href="#guide" onClick={e => { e.preventDefault(); go('maker'); }}>이용 가이드</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('Hub 운영 기준'); }}>Hub 운영 기준</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('문의 채널'); }}>문의 (Teams 채널)</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('개인정보·보안 안내'); }}>개인정보·보안 안내</a>
      </nav><span>© MUNI LABS · AI Hub</span></div></footer>

      {menu === 'notif' && api ? (
        <>
          <div className="scrim on nScrim" onClick={() => setMenu('')} />
          <aside className="drawer npanel on menu-host" id="hub-npanel" role="dialog" aria-modal="true" aria-labelledby="hub-nT" style={bellPos()}>
            <div className="dh"><b id="hub-nT">알림 <span className="pill">{unread.length}</span></b><button type="button" className="nread" onClick={api.markAllRead}>모두 읽음</button>{shownNotices.length ? <button type="button" className="nread" onClick={() => removeNotices(shownNotices.map(n => n.id), '알림을 모두 지웠어요')}>모두 지우기</button> : null}<button type="button" aria-label="알림 닫기" onClick={() => setMenu('')}>✕</button></div>
            <div className="nbody">
              {groups.map(g => (
                <React.Fragment key={g}><p className="ngrp">{g}</p>
                  <ul className="nlist">{shownNotices.filter(n => groupOf(n.date) === g).map(n => (
                    <li key={n.id} className={api.isRead(n.id, n.date) ? '' : 'unread'}><span className="ndot" aria-hidden="true" /><div><b>{n.title}</b><span>{n.sub} · {g === '오늘' ? new Date(n.date).toTimeString().slice(0, 5) : new Date(n.date).toISOString().slice(5, 10).replace('-', '/')}</span>
                      {n.btn ? <Go go={v => { markRead([n.id]); go(v, n.target || undefined); }} view={n.view} id={n.target || undefined} className="btn sm">{n.btn}</Go> : null}</div>
                      <button type="button" className="ndel" aria-label={`알림 지우기: ${n.title}`} title="알림 지우기" onClick={() => removeNotices([n.id], '알림을 지웠어요')}>✕</button></li>
                  ))}</ul></React.Fragment>
              ))}
              {!shownNotices.length ? <p className="ngrp">새 알림이 없어요</p> : null}
            </div>
            <div className="nfoot"><Go go={go} view="me">나의 작업공간에서 모두 보기 →</Go></div>
          </aside>
        </>
      ) : null}

      {/* 프로필 패널: 내 콘텐츠로 가기, 받은 배지 (시안 meDrawer) */}
      {menu === 'account' && api ? (
        <>
          <div className="scrim mescrim on" onClick={() => setMenu('')} />
          <aside className="drawer medrawer on menu-host" id="hub-medrawer" role="dialog" aria-modal="true" aria-labelledby="hub-meT">
            <div className="mdh">{avFace('av mav', 44)}<b id="hub-meT">{api.me.name}</b>
              <button type="button" aria-label="닫기" onClick={() => setMenu('')}>✕</button></div>
            <div className="mdbody">
              <nav className="mnav" aria-label="내 메뉴"><Go go={go} view="me"><span><b>내 콘텐츠 수정하러 가기</b><small>내가 올린 Agent, Skill, HTML, 아이디어</small></span><i aria-hidden="true">→</i></Go></nav>
              <section aria-labelledby="hub-mbH"><h2 id="hub-mbH">내 배지 <span className="pill">{myBadges.length}</span></h2>
                {myBadges.length ? <ul className="mbadges">{myBadges.map(b => (
                  <li key={b.k}><BadgeMedal k={b.k} size={56} title={b.title} />
                    <span><b>{b.title}</b><small>{b.desc}{b.date ? ' · ' + mmdd(b.date) : ''}</small></span>
                    {avBadge && avBadge.k === b.k ? <span className="bpick on">프로필 사용 중</span>
                      : <button type="button" className="bpick" onClick={() => pickAvatar(b.k)}>프로필로 쓰기</button>}</li>
                ))}</ul> : <p className="note" style={{ margin: 0 }}>아직 받은 배지가 없어요. 아이디어를 붙이거나 Agent를 올리면 받을 수 있어요.</p>}
                {myBadges.length ? (
                  <p className="bpicks">
                    {myPick !== 'photo' ? <button type="button" className="bpick reset" onClick={() => pickAvatar('photo')}>배지 대신 내 사진 쓰기</button> : null}
                    {myPick ? <button type="button" className="bpick reset" onClick={() => pickAvatar('')}>최근 받은 배지로 자동 바꾸기</button> : null}
                  </p>
                ) : null}
                <p className="note" style={{ margin: '8px 0 0', fontSize: 12 }}>고른 프로필은 다른 사람의 Hub 화면(댓글·아이디어 작성자)에도 보여요.</p>
              </section>
              {lockedBadges.length ? (
                <section aria-labelledby="hub-mlH"><h2 id="hub-mlH">도전할 배지 <span className="pill">{lockedBadges.length}</span></h2>
                  <ul className="mbadges locked">{lockedBadges.map(b => {
                    const pct = Math.round(Math.min((b.have || 0) / (b.need || 1), 1) * 100);
                    return (
                      <li key={b.k}><BadgeMedal k={b.k} size={56} locked={true} title={b.title} />
                        <span><b>{b.title}</b><small>{b.desc}</small>
                          <span className="bprog" aria-label={`${b.have || 0} / ${b.need}`}
                            style={{ display: 'block', height: 6, borderRadius: 999, background: '#ececea', marginTop: 8, overflow: 'hidden' }}>
                            <i style={{ display: 'block', height: '100%', width: pct + '%', borderRadius: 999, background: 'linear-gradient(90deg,#f5a524,#f04f7f)' }} />
                          </span>
                          <small style={{ display: 'block', marginTop: 4 }}>{b.have || 0} / {b.need}{pct >= 50 ? ' · 거의 다 왔어요!' : ''}</small>
                        </span></li>
                    );
                  })}</ul>
                </section>
              ) : null}
            </div>
            <div className="mfoot"><a href="#" onClick={e => { e.preventDefault(); setMenu(''); soon('로그아웃은 Microsoft 365 계정에서'); }}>로그아웃</a></div>
          </aside>
        </>
      ) : null}

      <Modal open={!!modal && !!modalBody} title={modalTitle} sub={modalSub} width={modalWidth} onClose={closeModal}>{modalBody}</Modal>

      {viewer ? (
        <div className="viewer" role="dialog" aria-modal="true" aria-label={viewer.tool.title}>
          <div className="vbar"><b>{viewer.tool.title}</b><span style={{ fontSize: 13, color: 'var(--ink2)' }}>격리된 창에서 열려요</span>
            <button type="button" className="btn sm" onClick={() => setViewer(undefined)}>닫기 ✕</button></div>
          {viewer.html !== undefined
            ? <iframe title={viewer.tool.title} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" srcDoc={viewer.html} />
            : <div className="state" style={{ margin: 0, background: '#fff', flex: 1, borderRadius: '0 0 14px 14px' }}>{viewer.err ? <p>{viewer.err}</p> : <><span className="spin" /><p>여는 중이에요</p></>}</div>}
        </div>
      ) : null}
      <Toast message={toastMsg} />
    </div>
  );
}
