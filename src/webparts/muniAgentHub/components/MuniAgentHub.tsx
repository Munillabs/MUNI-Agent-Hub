/* MUNI AI Hub 최상위 컴포넌트 (화면 구성과 모양은 MUNI AI Hub 메뉴 시안과 같음)
   - SharePoint 목록에서 데이터를 읽어 오고, 등록은 목록에, 별점·공감·댓글은 목록 기본 기능(평점 설정·항목 댓글)에 씁니다.
   - 화면 전환은 주소 끝(#market, #agent-12)으로 하여 링크로 공유하고 브라우저 뒤로 가기도 쓸 수 있습니다. */
import * as React from 'react';
import styles from './MuniAgentHub.module.scss';
import { HubService, HubError, reviewText } from '../services/HubService';
import {
  HubView, IAgent, IAgentEdit, IHtmlTool, IHubData, IIdea, IMe, INewCase, INewHtml, INewSkill, IPerson, IReaction, IReportTarget, ISkill, IVersion, ReactionKind, TargetType
} from '../models/types';
import { first, ideaStage, isHttpsUrl, mmdd, ratingOf } from '../models/rules';
import { INotice, notices } from '../models/activity';
import { IHubApi, IIdeaPreset } from './api';
import { AgentForm, CaseForm, HtmlForm, IdeaEditForm, ReportForm, SkillForm } from './forms';
import { Go, IconAgent, IconBell, IconGrid, IconCases, IconHtml, IconIdeas, IconMaker, IconMarket, IconSearch, IconSkill, Modal, Toast } from './ui';
import { BadgeMedal } from './badge';
import { BadgeArt } from './badgeArt';
import { badgeSeries, profileArt, ratioOf } from '../models/badges';
import { BadgesPage } from './pages/badges';
import { HomeView } from './pages/home';
import { AgentStore, HtmlStore, MarketView, SkillStore } from './pages/market';
import { AgentPage, HtmlPage, SkillPage } from './pages/detail';
import { IdeaBoard, IdeaPage } from './pages/ideas';
import { CaseLibrary, CasePage } from './pages/cases';
import { MakerLab } from './pages/maker';
import { MyWorkspace } from './pages/me';
import { SearchOverlay } from './searchov';
import { SpaceBg, ThemeSwitch, scrollHostOf, scrollTopOf, useReveal, useScrollTick } from './mv';
import { MUNI_LOGO } from '../assets/logo';
import MV_CSS from '../theme/muniverseCss';

/** MUNIVERSE 디자인 CSS를 페이지에 한 번만 넣습니다 (design/*.css → theme/muniverseCss.ts) */
function ensureDesignCss(): void {
  if (document.getElementById('mv-design-css')) { return; }
  const s = document.createElement('style');
  s.id = 'mv-design-css';
  s.textContent = MV_CSS;
  document.head.appendChild(s);
}
const XICON = <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8" /></svg>;
type Theme = 'light' | 'dark';
/** 저장한 선택 → 없으면 라이트 (기기 설정이 다크여도 처음에는 라이트로 엽니다. 시안과 같은 키 muni-theme) */
function initialTheme(): Theme {
  let t: string | null = null;
  try { t = window.localStorage.getItem('muni-theme'); } catch (e) { /* 없음 */ }
  return t === 'dark' ? 'dark' : 'light';
}

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
  | { kind: 'agent'; id: number }
  | { kind: 'skill'; id?: number }
  | { kind: 'html'; id?: number }
  | { kind: 'case'; id?: number }
  | { kind: 'idea'; id: number }
  | { kind: 'report'; target: IReportTarget }
  | undefined;
/** sub: 사례 상세에서 고른 솔루션 번호 (#case-12-1) */
interface IRoute { view: HubView; id?: number; sub?: number }

const LIST_VIEWS: HubView[] = ['home', 'market', 'agents', 'skills', 'htools', 'ideas', 'cases', 'maker', 'search', 'me', 'badges'];
const ITEM_VIEWS: HubView[] = ['agent', 'skill', 'htool', 'idea', 'case'];
/** 상세·하위 화면이 머리글 메뉴의 어디에 속하는지 (시안 NAVMAP) */
const NAV_OF: { [v: string]: string } = { htool: 'market', agents: 'market', skills: 'market', htools: 'market', agent: 'market', skill: 'market', case: 'cases', idea: 'ideas' };
/** Marketplace 아래 종류 탭(전체 m · Agent a · Skill s · HTML h)이 보이는 화면 (시안 MKMAP) */
const MK_OF: { [v: string]: string } = { market: 'm', agents: 'a', agent: 'a', skills: 's', skill: 's', htools: 'h', htool: 'h' };
/** 시안 CSS가 #ideas, #agent 처럼 화면 id로 모양을 정하는 부분은 [data-hub-page="ideas"] 로 바꿔 두었습니다.
    (주소와 같은 id를 붙이면 브라우저가 그 위치로 스크롤하므로 id 대신 data 속성) */
const PAGE_ID: { [v: string]: string } = {
  home: 'home', market: 'market', agents: 'store', skills: 'toolkit', htools: 'htools', agent: 'agent', htool: 'htmlitem', skill: 'skill',
  ideas: 'ideas', idea: 'idea', cases: 'cases', case: 'case', maker: 'maker', search: 'search', me: 'me', badges: 'badges'
};
/** Home 자동 새로 고침 간격 (1분) */
const REFRESH_MS = 60000;
const EMPTY: IHubData ={ agents: [], ideas: [], cases: [], reactions: [], skills: [], htmls: [] };
const TITLES: { [v: string]: string } = { search: '검색', case: '사례', skill: 'Skill', idea: '아이디어', me: '내 작업공간', awards: '랭킹 · 배지', badges: '배지 모음', market: 'Marketplace', htools: 'HTML', agents: 'Agent', skills: 'Skill', ideas: 'Idea Board', cases: 'Case Library', maker: 'Maker Lab' };

function readHash(): IRoute {
  const h = (window.location.hash || '').replace(/^#/, '');
  const m = /^(agent|skill|htool|idea|case)-(\d+)(?:-(\d+))?$/.exec(h);
  if (m) { return { view: m[1] as HubView, id: Number(m[2]), sub: m[3] ? Number(m[3]) : undefined }; }
  return { view: LIST_VIEWS.indexOf(h as HubView) >= 0 ? h as HubView : 'home' };
}
function hashOf(r: IRoute): string {
  return '#' + r.view + (r.id && ITEM_VIEWS.indexOf(r.view) >= 0 ? '-' + r.id + (r.sub ? '-' + r.sub : '') : '');
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
  ensureDesignCss();
  const [theme, setThemeState] = React.useState<Theme>(initialTheme);
  const setTheme = (t: Theme): void => { setThemeState(t); try { window.localStorage.setItem('muni-theme', t); } catch (e) { /* 저장 못 해도 동작 */ } };
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
  const rootRef = React.useRef<HTMLDivElement>(null);
  /* 프로필 패널이 놓일 자리 = Hub가 실제로 보이는 영역 (웹 파트 상자 ∩ 스크롤 상자 ∩ 창, 위쪽 막대 아래).
     패널이 브라우저 화면 전체가 아니라 서비스 안에 담기게 합니다. */
  const [paneBox, setPaneBox] = React.useState<{ top: number; bottom: number; left: number; right: number } | undefined>(undefined);
  React.useEffect(() => {
    if (menu !== 'account') { setPaneBox(undefined); return undefined; }
    const measure = (): void => {
      let bottom = 0;
      ['#SuiteNavWrapper', '#SuiteNavPlaceHolder', '#O365_NavHeader', '#suiteBarDelta', '[data-automationid="SuiteNav"]'].forEach(sel => {
        const el = document.querySelector(sel);
        if (el) {
          const r = el.getBoundingClientRect();
          if (r.height > 0 && r.top < 10) { bottom = Math.max(bottom, r.bottom); }
        }
      });
      // 화면 맨 위를 덮고 있는 Hub 밖의 막대(SharePoint 위쪽 막대, 워크벤치·브라우저 확장 막대 등)를 모두 찾습니다.
      // 패널이 이미 그 자리를 덮고 있어도 아래에 겹친 요소까지 보도록 elementsFromPoint 를 씁니다.
      const root = rootRef.current;
      const W = window.innerWidth;
      const seen: Element[] = [];
      const scan = (x: number, y: number): void => {
        const list: Element[] = document.elementsFromPoint ? document.elementsFromPoint(x, y)
          : (document.elementFromPoint(x, y) ? [document.elementFromPoint(x, y) as Element] : []);
        list.forEach(start => {
          for (let el: Element | null = start; el && el !== document.body && el !== document.documentElement; el = el.parentElement) {
            if (root && (root.contains(el) || el.contains(root))) { break; }
            if (seen.indexOf(el) >= 0) { continue; }
            seen.push(el);
            const r = el.getBoundingClientRect();
            const pos = window.getComputedStyle(el).position;
            const pinned = pos === 'fixed' || pos === 'sticky' || pos === 'absolute';
            if (r.top <= 1 && r.height > 0 && r.height <= 160 && r.width >= W / 3 && (pinned || r.bottom > bottom)) { bottom = Math.max(bottom, r.bottom); }
          }
        });
      };
      [2, 12, 24].forEach(y => [W - 24, W - 160, W - 320].forEach(x => { if (x > 0) { scan(x, y); } }));
      // Hub가 보이는 영역: 웹 파트 루트와 스크롤 상자(있으면)와 창이 겹치는 부분
      const H = window.innerHeight;
      let top = Math.max(0, bottom), bot = H, left = 0, right = W;
      const clip = (r: { top: number; bottom: number; left: number; right: number }): void => {
        top = Math.max(top, r.top); bot = Math.min(bot, r.bottom); left = Math.max(left, r.left); right = Math.min(right, r.right);
      };
      if (root) { clip(root.getBoundingClientRect()); }
      const host = scrollHostOf(root);
      if (host !== window) { clip((host as HTMLElement).getBoundingClientRect()); }
      // 너무 좁거나 낮으면(예: Hub가 거의 안 보일 때) 창 기준으로
      if (bot - top < 240 || right - left < 320) { top = Math.max(0, bottom); bot = H; left = 0; right = W; }
      const next = { top: Math.round(top), bottom: Math.round(H - bot), left: Math.round(left), right: Math.round(W - right) };
      setPaneBox(p => p && p.top === next.top && p.bottom === next.bottom && p.left === next.left && p.right === next.right ? p : next);
    };
    measure();
    // 막대가 늦게 그려지는 경우가 있어 잠시 뒤 한 번 더
    const t = window.setTimeout(measure, 250);
    window.addEventListener('resize', measure);
    // 페이지(또는 SharePoint 스크롤 상자)를 스크롤하면 보이는 영역이 바뀌므로 다시 맞춥니다
    window.addEventListener('scroll', measure, true);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true); };
  }, [menu]);
  const customLogo = (props.logoUrl || '').trim();
  const [customLogoFailed, setCustomLogoFailed] = React.useState(false);
  React.useEffect(() => { setCustomLogoFailed(false); }, [customLogo]);
  const logoSrc = customLogo && !customLogoFailed ? customLogo : MUNI_LOGO;
  const toastTimer = React.useRef<number>(0);
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
      const m = me || await service.getMe();
      if (!me) { setMe(m); }
      // 방문 기록(하루 1회)은 읽기와 함께 보내고, 실패해도 화면은 그대로 엽니다. 저장된 내 방문 수를 바로 반영합니다.
      const [d, n] = await Promise.all([service.loadAll(), service.recordVisit(m.id, m.email).then(v => v, () => undefined)]);
      setData(n ? { ...d, visits: { ...(d.visits || {}), [m.id]: { name: m.name, count: n } } } : d);
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
  const go = React.useCallback((view: HubView, id?: number, sub?: number): void => {
    const r: IRoute = { view, id, sub };
    setModal(undefined);
    setMenu('');
    setRoute(r);
    try { window.history.pushState(window.history.state, '', hashOf(r)); } catch (e) { /* 무시 */ }
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) { el.scrollIntoView({ block: 'start' }); }
  }, []);
  /** Idea Board를 열 때 미리 걸러 둘 조건 (Marketplace 빈 화면의 카테고리, 사례의 '관련 아이디어 n개 보기') */
  const [ideaPreset, setIdeaPreset] = React.useState<IIdeaPreset | undefined>(undefined);
  const goHome = (): void => { go('home'); load().catch(() => undefined); };
  /* 검색: 흐린 화면 위로 열리는 검색 창 (시안 c11). 옛 주소 #search 로 들어오면 홈에서 검색 창만 엽니다 */
  const [sx, setSx] = React.useState<{ open: boolean; scope: 'all' | 'market'; q: string }>({ open: false, scope: 'all', q: '' });
  const search = (q: string, scope?: 'all' | 'market'): void => { setSearchQuery(q); setMenu(''); setSx({ open: true, scope: scope || 'all', q }); };
  React.useEffect(() => {
    if (route.view !== 'search') { return; }
    setRoute({ view: 'home' });
    try { window.history.replaceState(window.history.state, '', '#home'); } catch (e) { /* 무시 */ }
    setSx({ open: true, scope: 'all', q: searchQuery });
  }, [route.view]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 머리글: 홈 맨 위에서는 바탕 없음(hm-top), 홈에서는 스크롤해도 투명(c19-clear), 스크롤하면 b3-scr */
  const [hdTop, setHdTop] = React.useState(true);
  useScrollTick(rootRef, y => { const t = y <= 4; setHdTop(p => p === t ? p : t); }, [route.view]);
  useReveal(rootRef, route.view + ':' + (route.id || '') + ':' + (loading ? 'l' : 'r'));

  /* 푸터 고정 (시안 c71): 내용이 짧은 화면(예: 상세 > 업데이트 기록)에서도 푸터가 화면 맨 아래에 있게,
     본문 최소 높이 = 보이는 높이 − 본문 위쪽까지 − 푸터 높이. SharePoint 위쪽 막대 높이가 달라도 실제로 재서 맞춥니다 */
  const mainRef = React.useRef<HTMLElement>(null);
  const footRef = React.useRef<HTMLElement>(null);
  React.useLayoutEffect(() => {
    const fit = (): void => {
      const m = mainRef.current, f = footRef.current;
      if (!m || !f) { return; }
      const host = scrollHostOf(rootRef.current);
      const isWin = host === window;
      const hostTop = isWin ? 0 : (host as HTMLElement).getBoundingClientRect().top;
      const viewH = isWin ? window.innerHeight : (host as HTMLElement).clientHeight;
      const top = m.getBoundingClientRect().top - hostTop + scrollTopOf(host);
      const need = Math.floor(viewH - top - f.offsetHeight);
      m.style.minHeight = need > 0 ? need + 'px' : '';
    };
    fit();
    const t = window.setTimeout(fit, 300);
    window.addEventListener('resize', fit);
    return () => { window.clearTimeout(t); window.removeEventListener('resize', fit); };
  }, [route.view, route.id, loading]);

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
  // Skill·HTML 올리기 화면의 '이 아이디어로 만들었어요' 후보: 내가 함께 만드는 제작 중 아이디어
  const myMaking = me ? data.ideas.filter(i => ideaStage(i, now) === 'making' && i.makers.some(p => p.id === me.id)) : [];
  /** 이 게시물과 이미 연결된 아이디어 (아이디어 ResultRef가 agent:3 · skill:12 · html:7, 예전 방식은 같은 이름) */
  const linkedIdeas = (k: 'agent' | 'skill' | 'html', id: number, title: string): IIdea[] => {
    const key = `${k}:${id}`, name = title.trim().toLowerCase();
    return data.ideas.filter(i => { const r = (i.resultRef || '').trim().toLowerCase(); return !!r && (r === key || r === name); });
  };
  /** 올린 Skill·HTML로 아이디어를 완성합니다. 결과물은 번호(skill:12)로 남겨 이름이 바뀌어도 이어집니다. 실패해도 올리기는 성공으로 둡니다 */
  const finishWith = async (ideaId: number | undefined, ref: string): Promise<string> => {
    if (!ideaId) { return ''; }
    try {
      const at = await service.setDone(ideaId, ref);
      patchIdea(ideaId, x => ({ ...x, status: '완성', doneAt: at, resultRef: ref }));
      return ' 아이디어도 완성으로 바꿨어요 🎉';
    } catch (e) { return ' 아이디어를 완성으로 바꾸지 못했어요. 아이디어 화면에서 \'만들기 완료\'를 눌러 주세요.'; }
  };
  const submitSkill = async (s: INewSkill, editId?: number, ideaId?: number): Promise<void> => {
    const cur = editId ? first(data.skills, x => x.id === editId) : undefined;
    const id = cur ? (await service.updateSkill(cur, s), cur.id) : await service.createSkill(s);
    const idea = await finishWith(ideaId, `skill:${id}`);
    // 저장은 끝났으니, 목록 새로 읽기가 실패해도 성공으로 봅니다
    const skills = await service.getSkills().catch(() => undefined);
    if (skills) { setData(d => ({ ...d, skills, skillsError: undefined })); }
    go('skill', id);
    toast((cur ? `저장했어요. 지금 버전은 v${s.version}이에요.` : 'Skill을 올렸어요.') + idea);
  };
  const submitAgent = async (a: IAgent, e: IAgentEdit, ideaId?: number): Promise<void> => {
    await service.updateAgent(a, e);
    const idea = await finishWith(ideaId, `agent:${a.id}`);
    // 저장은 끝났으니, 목록 새로 읽기가 실패해도 성공으로 봅니다
    const agents = await service.getAgents().catch(() => undefined);
    if (agents) { setData(d => ({ ...d, agents, agentsError: undefined })); }
    setModal(undefined);
    go('agent', a.id);
    toast('Agent 소개를 고쳤어요.' + idea);
  };
  const submitHtml = async (h: INewHtml, editId?: number, ideaId?: number): Promise<void> => {
    const cur = editId ? first(data.htmls, x => x.id === editId) : undefined;
    const id = cur ? (await service.updateHtml(cur, h), cur.id) : await service.createHtml(h);
    const idea = await finishWith(ideaId, `html:${id}`);
    const htmls = await service.getHtmls().catch(() => undefined);
    if (htmls) { setData(d => ({ ...d, htmls, htmlsError: undefined })); }
    go('htool', id);
    toast((cur ? `저장했어요. 지금 버전은 v${h.version}이에요.` : 'HTML을 올렸어요.') + idea);
  };
  const submitCase = async (c: INewCase, editId?: number): Promise<boolean> => {
    try {
      // 승인 단계 없이 바로 공개됩니다. 올린(고친) 사례의 상세 화면으로 이동합니다.
      const old = editId ? first(data.cases, x => x.id === editId) : undefined;
      const id = editId ? (await service.updateCase(editId, c, old ? old.files : undefined), editId) : await service.createCase(c);
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
    const pick = (data.avatars || {})[p.id] || '';
    // 'photo' = 사진 · 고른 칸이 있으면 그 칸의 지금 단계 그림 · 아니면 가장 최근에 받은 배지 그림
    const k = pick === 'photo' ? undefined : profileArt(badgeSeries(data, p), pick);
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
    ideaPreset,
    openIdeas: p => { setIdeaPreset(p); go('ideas'); },
    clearIdeaPreset: () => setIdeaPreset(undefined),
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
        toast(on ? '만들기를 시작했어요. 다 만들면 \'만들기 완료\'를 눌러 주세요' : '만들기를 멈췄어요. 다시 시작할 수 있어요');
      }).catch(fail);
    },
    finishIdea: async (id, resultRef) => {
      try {
        const at = await service.setDone(id, resultRef);
        patchIdea(id, x => ({ ...x, status: '완성', doneAt: at, resultRef }));
        toast('완성했어요! 함께 만든 분들 수고 많으셨어요');
        return true;
      } catch (e) { fail(e); return false; }
    },
    stageOf: i => ideaStage(i, now),
    updateIdea: async (id, idea) => {
      try {
        await service.updateIdea(id, idea);
        patchIdea(id, i => ({ ...i, ...idea, detail: idea.detail || '', pain: idea.pain || '', frequency: idea.frequency || '', category: idea.category !== undefined ? idea.category : i.category, source: idea.source !== undefined ? idea.source : i.source, caseRef: idea.source ? undefined : i.caseRef }));
        toast('아이디어를 고쳤어요'); return true;
      } catch (e) { fail(e); return false; }
    },
    deleteIdea: async id => {
      try { await service.deleteIdea(id); setData(d => ({ ...d, ideas: d.ideas.filter(i => i.id !== id) })); toast('삭제되었습니다'); return true; } catch (e) { fail(e); return false; }
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
      try { await service.deleteCase(id); setData(d => ({ ...d, cases: d.cases.filter(c => c.id !== id) })); toast('삭제되었습니다'); return true; } catch (e) { fail(e); return false; }
    },
    toggleMake: id => {
      const i = first(data.ideas, x => x.id === id);
      const others = i ? i.makers.filter(p => !isMe(p)).length : 0;
      togglePeople(id, 'makers').then(on => toast(!on ? '참여를 취소했어요' : others ? '만들래요에 참여했어요. 만드는 사람들과 Teams로 이야기해 보세요' : '손을 들었어요. 같이 할 사람을 기다려요')).catch(fail);
    },
    comments: id => data.reactions.filter(r => r.targetType === 'Idea' && r.targetId === id && r.kind === '댓글').sort((x, y) => (x.created || '').localeCompare(y.created || '')),
    addIdea: async idea => {
      try {
        const id = await service.createIdea(idea); const ideas = await service.getIdeas(); setData(d => withIdeas(d, ideas));
        const saved = ideas.filter(x => x.id === id)[0];
        // HubIdeas 에 Category 열이 아직 없으면 카테고리만 빠지고 저장됩니다
        // 사례 연결은 ScrapSource 열에 들어가므로 그 열이 없으면 사례 연결만 빠지고 저장됩니다
        toast(saved && idea.category && !saved.category ? '포스트잇을 붙였어요. 목록에 Category 열이 없어 카테고리는 저장되지 않았어요'
          : saved && idea.caseRef && !saved.caseRef ? 'Idea Board에 포스트잇을 붙였어요. 목록에 ScrapSource 열이 없어 사례 연결은 저장되지 않았어요'
            : idea.caseRef ? 'Idea Board에 포스트잇을 붙였어요' : '포스트잇을 붙였어요');
        return true;
      } catch (e) { fail(e); return false; }
    },
    addComment: async (id, body) => {
      try { await addIdeaComment(id, body); toast('댓글을 달았어요'); return true; } catch (e) { fail(e); return false; }
    },
    deleteComment: async rid => {
      const r = first(data.reactions, x => x.id === rid);
      if (!r) { return false; }
      try { await removeComment(r); toast('댓글을 지웠어요'); return true; } catch (e) { fail(e); return false; }
    },
    toggleCommentLike: rid => {
      const r = first(data.reactions, x => x.id === rid);
      if (!r || !r.commentId) { return; }
      const on = !r.likedByMe;
      // 먼저 화면에 반영하고, 저장에 실패하면 되돌립니다
      const patch = (liked: boolean, delta: number): void => setData(d => ({ ...d, reactions: d.reactions.map(x => x.id === rid ? { ...x, likedByMe: liked, likes: Math.max(0, (x.likes || 0) + delta) } : x) }));
      patch(on, on ? 1 : -1);
      service.likeComment(r.targetType, r.targetId, r.commentId, on).catch(e => { patch(!on, on ? -1 : 1); fail(e); });
    },
    reviveIdea: async id => {
      try { const at = await service.reviveIdea(id); patchIdea(id, i => ({ ...i, revivedOn: at, archivedOn: '', status: '모집 중' })); toast('보관을 해제했어요'); return true; } catch (e) { fail(e); return false; }
    },
    openAgentForm: id => setModal({ kind: 'agent', id }),
    openSkillForm: id => setModal({ kind: 'skill', id }),
    openHtmlForm: id => setModal({ kind: 'html', id }),
    openCaseForm: id => setModal({ kind: 'case', id }),
    openIdeaForm: id => setModal({ kind: 'idea', id }),
    openReport: target => setModal({ kind: 'report', target }),
    openHtml,
    deleteAgent: async id => {
      try {
        // 삭제 후 안내는 '삭제되었습니다' 한 줄만 (실패하면 오류는 그대로 알려요)
        await service.retireAgent(id);
        setData(d => ({ ...d, agents: d.agents.filter(x => x.id !== id) }));
        go('agents');
        toast('삭제되었습니다');
        return true;
      } catch (e) { fail(e); return false; }
    },
    deleteSkill: async id => {
      try { await service.deleteSkill(id); setData(d => ({ ...d, skills: d.skills.filter(x => x.id !== id) })); go('skills'); toast('삭제되었습니다'); return true; } catch (e) { fail(e); return false; }
    },
    deleteHtml: async id => {
      try { await service.deleteHtml(id); setData(d => ({ ...d, htmls: d.htmls.filter(x => x.id !== id) })); go('htools'); toast('삭제되었습니다'); return true; } catch (e) { fail(e); return false; }
    },
    loadFileText: ref => service.getFileText(ref),
    loadVersions: (t, id): Promise<IVersion[]> => t === 'Agent' ? service.getAgentVersions(id) : t === 'Skill' ? service.getSkillVersions(id) : service.getHtmlVersions(id),
    saveShots: async (t, id, add, drop) => {
      const item = t === 'Agent' ? first(data.agents, x => x.id === id) : t === 'Skill' ? first(data.skills, x => x.id === id) : first(data.htmls, x => x.id === id);
      if (!item) { return false; }
      try {
        await service.saveShots(t, id, item.images, add, drop);
        // 저장은 끝났으니, 목록 새로 읽기가 실패해도 성공으로 봅니다
        if (t === 'Agent') { const agents = await service.getAgents().catch(() => undefined); if (agents) { setData(d => ({ ...d, agents })); } }
        else if (t === 'Skill') { const skills = await service.getSkills().catch(() => undefined); if (skills) { setData(d => ({ ...d, skills })); } }
        else { const htmls = await service.getHtmls().catch(() => undefined); if (htmls) { setData(d => ({ ...d, htmls })); } }
        toast(add.length ? '이미지를 넣었어요' : '이미지를 뺐어요');
        return true;
      } catch (e) { fail(e); return false; }
    },
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
  /* 프로필 패널(시안): 내 배지 · 도전할 배지는 3개씩만, 나머지는 '전체 보기'(배지 모음)에서 */
  /* 배지 (시안 배지 도감): 칸 14개 × 단계. 내 배지 = 받은 칸(지금 단계), 도전할 배지 = 다음 단계 진행률 높은 순 */
  const mySeries = api ? badgeSeries(data, api.me) : [];
  const myPick = me ? ((data.avatars || {})[me.id] || '') : '';
  // 지금 프로필 배지 칸: 고른 칸 → 없으면 가장 최근에 받은 칸
  const latestGot = mySeries.filter(x => !!x.top).sort((a, b) => (b.top!.date || '').localeCompare(a.top!.date || ''))[0];
  const repSid = myPick === 'photo' ? '' : (mySeries.some(x => x.sid === myPick && !!x.top) ? myPick : (latestGot ? latestGot.sid : ''));
  const gotSeries = mySeries.filter(x => !!x.top).sort((a, b) => (a.sid === repSid ? -1 : b.sid === repSid ? 1 : (b.top!.date || '').localeCompare(a.top!.date || '')));
  const todoSeries = mySeries.filter(x => !!x.next && !x.hid).sort((a, b) => ratioOf(b) - ratioOf(a));
  // 프로필 동그라미: 고른 배지 → 없으면 최근 배지. 사진을 골랐거나 배지가 없으면 Microsoft 365 프로필 사진
  const myAvatarKey = me ? avatarOf(me) : undefined;
  const repSeries = first(mySeries, x => x.sid === repSid);
  const avBadge = myAvatarKey ? { k: myAvatarKey, title: repSeries && repSeries.top ? repSeries.top.n : '' } : undefined;
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
      case 'case': body = <CasePage api={api} item={first(data.cases, x => x.id === id)} sol={route.sub || 0} />; break;
      case 'maker': body = <MakerLab api={api} />; break;
      case 'search': body = null; break;
      case 'me': body = <MyWorkspace api={api} />; break;
      case 'badges': body = <BadgesPage api={api} series={mySeries} pick={repSid} rawPick={myPick} repArt={myAvatarKey} onPick={pickAvatar} onOpenProfile={() => setMenu('account')} />; break;
      default: body = <HomeView api={api} dark={theme === 'dark'} rootRef={rootRef} />;
    }
  }

  /* ---------- 모달 ---------- */
  let modalTitle = '';
  let modalSub: React.ReactNode = undefined;
  let modalBody: React.ReactNode = null;
  let modalWidth: number | undefined;
  const closeModal = (): void => setModal(undefined);
  if (api && modal) {
    if (modal.kind === 'agent') {
      const cur = first(data.agents, x => x.id === modal.id);
      modalTitle = 'Agent 소개 고치기';
      modalSub = cur ? cur.title : undefined;
      modalBody = cur ? <AgentForm key={cur.id} agent={cur} libName={service.listName('agents')} ideas={myMaking} linked={linkedIdeas('agent', cur.id, cur.title)} onCancel={closeModal} onSubmit={(e, ideaId) => submitAgent(cur, e, ideaId)} /> : null;
    } else if (modal.kind === 'skill') {
      const cur = modal.id ? first(data.skills, x => x.id === modal.id) : undefined;
      modalTitle = cur ? 'Skill 새 버전 올리기' : 'Skill 올리기';
      modalSub = cur ? `${cur.title} · 지금 v${cur.version}` : undefined;
      modalBody = <SkillForm key={modal.id || 0} skill={cur} existingTitles={data.skills.map(s => s.title)} libName={service.listName('contents')} ideas={myMaking} linked={cur ? linkedIdeas('skill', cur.id, cur.title) : undefined} onCancel={closeModal} onSubmit={(s, ideaId) => submitSkill(s, cur ? cur.id : undefined, ideaId)} />;
    } else if (modal.kind === 'html') {
      const cur = modal.id ? first(data.htmls, x => x.id === modal.id) : undefined;
      modalTitle = cur ? 'HTML 새 버전 올리기' : 'HTML 올리기';
      modalSub = cur ? `${cur.title} · 지금 v${cur.version}` : undefined;
      modalBody = <HtmlForm key={modal.id || 0} tool={cur} existingTitles={data.htmls.map(h => h.title)} libName={service.listName('contents')} ideas={myMaking} linked={cur ? linkedIdeas('html', cur.id, cur.title) : undefined} onCancel={closeModal} onSubmit={(h, ideaId) => submitHtml(h, cur ? cur.id : undefined, ideaId)} />;
    } else if (modal.kind === 'case') {
      const cur = modal.id ? first(data.cases, x => x.id === modal.id) : undefined;
      modalTitle = cur ? '사례 고치기' : '사례 올리기';
      modalBody = <CaseForm key={modal.id || 0} now={now} item={cur} onCancel={closeModal} onSubmit={c => submitCase(c, cur ? cur.id : undefined)} />;
    } else if (modal.kind === 'idea') {
      const cur = first(data.ideas, x => x.id === modal.id);
      modalTitle = '아이디어 고치기';
      modalWidth = 560;
      modalBody = cur ? <IdeaEditForm idea={cur} cats={data.ideaCats} onCancel={closeModal} onSubmit={async idea => { const ok = await api.updateIdea(cur.id, idea); if (ok) { closeModal(); } return ok; }} /> : null;
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
    <div ref={rootRef} className={`${styles.muniHub} mv-root hvs-dot${sx.open ? ' c11-lock' : ''}${modal ? ' mopen' : ''}`} data-theme={theme}>
      <SpaceBg on={theme === 'dark'} home={route.view === 'home'} />
      {props.showHeader ? (
        <header className={'hd' + (route.view === 'home' ? ' c19-clear' : '') + (route.view === 'home' && hdTop ? ' hm-top' : '') + (!hdTop ? ' b3-scr' : '') + (menu === 'market' ? ' b3-open' : '')}
          onMouseLeave={() => { if (menu === 'market') { setMenu(''); } }}>
          <div className="wrap">
            <a className="logo" href="#home" title="홈으로" aria-label="MUNIVERSE 홈" onClick={e => { e.preventDefault(); goHome(); }}>
              {customLogo && !customLogoFailed
                ? <img src={logoSrc} alt="" style={{ height: 24, width: 'auto', display: 'block' }} onError={() => { if (logoSrc !== MUNI_LOGO) { setCustomLogoFailed(true); } }} />
                : <span className="lg-mark"><i /></span>}
              <span className="lg-word" aria-hidden="true">MUNI<b>VERSE</b></span></a>
            <nav className="gnav" aria-label="전역 메뉴">
              <a href="#market" id="mv-mktBtn" data-nav="market" className="menu-host" aria-current={navOn === 'market' ? 'page' : undefined} aria-haspopup="true" aria-expanded={menu === 'market'} aria-controls="hub-mkmenu"
                onMouseEnter={() => setMenu('market')} onFocus={() => setMenu('market')}
                onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setMenu('market'); } }}
                onClick={e => { e.preventDefault(); go('market'); }}><IconMarket />Marketplace<i className="caret" aria-hidden="true" /></a>
              {nav('ideas', <IconIdeas />, 'Idea Board')}
              {nav('cases', <IconCases />, 'Case Library')}
              {nav('maker', <IconMaker />, 'Maker Lab', 'mk')}
            </nav>
            <div className="util">
              <ThemeSwitch dark={theme === 'dark'} onToggle={() => setTheme(theme === 'dark' ? 'light' : 'dark')} />
              <a role="button" tabIndex={0} href="#search" aria-haspopup="dialog" aria-label="Hub 검색" onClick={e => { e.preventDefault(); search(''); }}
                onKeyDown={e => { if (e.key === ' ') { e.preventDefault(); search(''); } }}><IconSearch />검색</a>
              <span className="menu-host" style={{ display: 'contents' }}>
                <a href="#notif" id="mv-notifBtn" className="notifBtn" ref={bellRef} role="button" aria-haspopup="dialog" aria-controls="mv-notifPanel" aria-expanded={menu === 'notif'} aria-label={`알림 ${unread.length}개`}
                  onClick={e => { e.preventDefault(); setMenu(menu === 'notif' ? '' : 'notif'); }}><IconBell /><span className="sr">알림</span>{unread.length ? <span className="nbadge" aria-hidden="true">{unread.length}</span> : null}</a>
              </span>
              <div className="umenu menu-host">
                <button type="button" className="avbtn" aria-haspopup="dialog" aria-expanded={menu === 'account'} aria-controls="mv-meDrawer" onClick={() => setMenu(menu === 'account' ? '' : 'account')}>
                  {avFace('av', 30)}<span className="sr">내 프로필 열기</span></button>
              </div>
            </div>
          </div>
          {/* menu-host: 메뉴 안을 누를 때 '바깥 누르면 닫기'가 먼저 메뉴를 닫아 클릭이 사라지지 않게 */}
          <div className="mktmenu menu-host" id="hub-mkmenu" hidden={menu !== 'market'} onMouseEnter={() => setMenu('market')}>
            <div className="wrap"><div className="mk-grid">
              <Go go={go} view="agents" className="mk-card"><span className="mk-top"><IconAgent /><em>{data.agents.length}</em></span><b>Agent</b><span>반복되는 업무를 도와줄 AI가 필요할 때</span></Go>
              <Go go={go} view="skills" className="mk-card"><span className="mk-top"><IconSkill /><em>{data.skills.length}</em></span><b>Skill</b><span>AI에 지침과 노하우를 더해 맞춤형 결과를 얻고 싶을 때</span></Go>
              <Go go={go} view="htools" className="mk-card"><span className="mk-top"><IconHtml /><em>{data.htmls.length}</em></span><b>HTML</b><span>업무를 더 쉽고 편리하게 해 주는 웹 도구가 필요할 때</span></Go>
              <Go go={go} view="market" className="mk-all"><b>Marketplace 전체 보기 →</b><span>동료들이 만든 다양한 도구와 자료를 살펴보세요</span></Go>
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

      <main ref={mainRef} className="page on" id={'mv-' + PAGE_ID[route.view]} data-hub-page={PAGE_ID[route.view]} aria-label={TITLES[route.view] || 'Home'}>
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

      <footer className="sfoot" ref={footRef}><div className="wrap"><nav aria-label="도움말">
        <a href="#guide" onClick={e => { e.preventDefault(); go('maker'); }}>이용 가이드</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('Hub 운영 기준'); }}>Hub 운영 기준</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('문의 채널'); }}>문의 (Teams 채널)</a>
        <a href="#" onClick={e => { e.preventDefault(); soon('개인정보·보안 안내'); }}>개인정보·보안 안내</a>
      </nav><span>© MUNI LABS · AI Hub</span></div></footer>

      {menu === 'notif' && api ? (
        <>
          <div className="scrim on nScrim" id="mv-nScrim" onClick={() => setMenu('')} />
          <aside className="drawer npanel on menu-host" id="mv-notifPanel" role="dialog" aria-modal="true" aria-labelledby="hub-nT" style={bellPos()}>
            {/* 시안 11/18 알림 패널: 머리 = 알림+개수 원, 모두 읽음·모두 지우기 밑줄 글자, X / 날짜 묶음 / 점 + 굵은 제목 */}
            <div className="dh nx-h"><b id="hub-nT">알림 <span className="nx-cnt">{unread.length}</span></b>
              <button type="button" className="nx-tl" onClick={api.markAllRead}>모두 읽음</button>
              {shownNotices.length ? <button type="button" className="nx-tl" onClick={() => removeNotices(shownNotices.map(n => n.id), '알림을 모두 지웠어요')}>모두 지우기</button> : null}
              <button type="button" className="nx-x" aria-label="알림 닫기" onClick={() => setMenu('')}>{XICON}</button></div>
            <div className="nbody nx-body">
              {groups.map(g => (
                <section key={g} className="nx-g"><h3>{g}</h3>
                  <ul className="nx-list">{shownNotices.filter(n => groupOf(n.date) === g).map(n => (
                    <li key={n.id} className={api.isRead(n.id, n.date) ? '' : 'unread'}><span className="nx-dot" aria-hidden="true" />
                      <Go go={v => { markRead([n.id]); go(v, n.target || undefined); }} view={n.view} id={n.target || undefined} className="nx-go">
                        <b>{n.title}</b><span>{n.sub ? n.sub + ' · ' : ''}{g === '오늘' ? new Date(n.date).toTimeString().slice(0, 5) : mmdd(n.date)}</span></Go>
                      <button type="button" className="nx-del" aria-label="이 알림 지우기" title="알림 지우기" onClick={() => removeNotices([n.id], '알림을 지웠어요')}>{XICON}</button></li>
                  ))}</ul></section>
              ))}
              {!shownNotices.length ? <p className="nx-empty"><b>새 알림이 없어요</b>내 콘텐츠에 리뷰가 달리거나 배지를 받으면 여기에 알려 드려요.</p> : null}
            </div>
            <div className="nfoot nx-foot"><Go go={go} view="me">나의 작업공간에서 모두 보기 →</Go></div>
          </aside>
        </>
      ) : null}

      {/* 프로필 패널: 내 콘텐츠로 가기, 받은 배지 (시안 meDrawer) */}
      {menu === 'account' && api ? (
        <>
          <div className="scrim mescrim on" id="mv-meScrim" onClick={() => setMenu('')}
            style={paneBox ? { top: paneBox.top, bottom: paneBox.bottom, left: paneBox.left, right: paneBox.right } : undefined} />
          <aside className="drawer medrawer on menu-host" id="mv-meDrawer" role="dialog" aria-modal="true" aria-labelledby="hub-meT"
            style={paneBox ? { top: paneBox.top, bottom: paneBox.bottom, right: paneBox.right, height: 'auto', maxHeight: 'none', maxWidth: `calc(100vw - ${paneBox.left + paneBox.right}px)` } : undefined}>
            <div className="mdh">{avFace('av mav', 44)}<b id="hub-meT">{api.me.name}</b>
              <button type="button" aria-label="닫기" onClick={() => setMenu('')}>✕</button></div>
            {/* 시안 11/18 프로필 패널: 나의 작업공간 바로 가기 / 내 배지(누르면 프로필 배지로) / 도전할 배지(진행 막대) */}
            <div className="mdbody">
              <nav className="mnav" aria-label="내 메뉴"><Go go={go} view="me" className="b7p-nav"><span><b>나의 작업공간</b></span><i className="b7p-go">바로 가기<span aria-hidden="true"> →</span></i></Go></nav>
              <section aria-labelledby="hub-mbH" className="b7p">
                <div className="b7p-hr"><h2 id="hub-mbH" className="b7p-h">내 배지 <span className="b7p-n">{gotSeries.length}</span></h2>
                  <Go go={go} view="badges" className="b7p-all">전체 보기<span aria-hidden="true"> →</span></Go></div>
                {gotSeries.length ? <>
                  <p className="b7p-tip">누르면 프로필 배지가 바뀌어요</p>
                  <ul className="b7p-list" role="list">{gotSeries.slice(0, 3).map(x => {
                    const on = x.sid === repSid;
                    const b = x.top!;
                    return (
                      <li key={x.sid}><button type="button" className={'b7p-card b7p-sel' + (on ? ' on' : '')} aria-pressed={on} onClick={() => { if (!on) { pickAvatar(x.sid); } }}>
                        <span className="b7p-em"><BadgeArt art={b.art} on={true} /></span>
                        <span className="b7p-tx"><b>{b.n}</b>{b.date ? <small>{mmdd(b.date)} 획득</small> : null}</span>
                        {on ? <span className="b7p-use"><span aria-hidden="true">✓</span> 프로필로 사용 중</span> : null}</button></li>
                    );
                  })}</ul>
                </> : <p className="b7p-tip">아직 받은 배지가 없어요. 아이디어를 올리거나 Agent를 배포하면 받을 수 있어요.</p>}
                {todoSeries.length ? <>
                  <div className="b7p-hr b7p-h2"><h2 className="b7p-h">도전할 배지 <span className="b7p-n">{todoSeries.length}</span></h2>
                    <Go go={go} view="badges" className="b7p-all">전체 보기<span aria-hidden="true"> →</span></Go></div>
                  <ul className="b7p-list">{todoSeries.slice(0, 3).map(x => {
                    const nx = x.next!;
                    return (
                      <li key={x.sid} className="b7p-card b7p-todo"><span className="b7p-em"><BadgeArt art={nx.art} on={false} /></span>
                        <span className="b7p-tx"><b>{nx.n}</b><small>{nx.c}</small>
                          <span className="b7p-bar" aria-hidden="true"><i style={{ width: Math.max(3, ratioOf(x) * 100).toFixed(0) + '%' }} /></span>
                          <small className="b7p-num">{nx.cur} / {nx.need}</small></span></li>
                    );
                  })}</ul>
                </> : null}
              </section>
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
      {api ? <SearchOverlay api={api} open={sx.open} scope={sx.scope} initial={sx.q} onClose={() => setSx(s => ({ ...s, open: false }))} /> : null}
      <Toast message={toastMsg} />
    </div>
  );
}
