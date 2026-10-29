/* MUNI Agent Hub 최상위 컴포넌트
   - SharePoint 목록에서 데이터를 읽어 오고, 좋아요·후기·신청을 목록에 씁니다.
   - 화면 전환은 웹 파트 안의 탭으로 하고, 주소 끝(#agents, #agent-12)과 맞춰 링크로 공유할 수 있게 합니다. */
import * as React from 'react';
import styles from './MuniAgentHub.module.scss';
import { HubService, HubError } from '../services/HubService';
import { HubView, IHubData, IMe, INewAgentRequest, INewIdea, INewInsight, IReaction, ReactionKind, TargetType } from '../models/types';
import { first } from '../models/rules';
import { IHubApi } from './api';
import { HomeView, AgentsView, IdeasView, InsightsView, GuideView } from './views';
import { AgentDetail, IdeaDetail, InsightDetail } from './details';
import { RegisterForm, IdeaForm, InsightForm } from './forms';
import { IconMoon, IconSun, SidePanel, Toast } from './ui';
import { MUNI_LOGO } from '../assets/logo';

export interface IMuniAgentHubProps {
  service: HubService;
  /** 웹 파트 설정의 '사이트 주소'가 비어 있으면 현재 사이트 */
  siteUrl: string;
  /** 페이지 위쪽에 Hub 머리글(로고·탭)을 보일지 */
  showHeader: boolean;
  /** 머리글 로고 이미지 주소. 비어 있으면 SharePoint 사이트 로고, 그것도 없으면 기본 무늬 마크 */
  logoUrl?: string;
}

type PanelState =
  | { kind: 'agent'; id: number }
  | { kind: 'insight'; id: number }
  | { kind: 'ideaDetail'; id: number }
  | { kind: 'register' }
  | { kind: 'idea' }
  | { kind: 'insightForm' }
  | undefined;

const VIEWS: HubView[] = ['home', 'agents', 'ideas', 'insights', 'guide'];
const TABS: { v: HubView; label: string }[] = [
  { v: 'home', label: '홈' }, { v: 'agents', label: 'Agent 둘러보기' }, { v: 'ideas', label: '아이디어 보드' },
  { v: 'insights', label: '인사이트' }, { v: 'guide', label: '이용 안내' }
];
const HEAD: { [k: string]: { t: string; d: string; b?: string; n?: string; accent: string } } = {
  agents: { t: 'Agent 둘러보기', d: '동료가 만든 Agent를 찾아 내 Copilot에 추가합니다', accent: 'var(--brand)' },
  ideas: { t: '아이디어 보드', d: "'이런 Agent가 있으면 좋겠다'를 올리고 투표합니다", b: '+ 아이디어 올리기', n: '비슷한 아이디어가 있으면 좋아요를 눌러 주세요.', accent: 'var(--hot)' },
  insights: { t: '인사이트', d: '고객사 프로젝트에서 만든 Agent 사례를 모읍니다', b: '+ 사례 올리기', n: '올린 사례는 고객 정보 확인 후 게시됩니다.', accent: 'var(--c-learn)' },
  guide: { t: '이용 안내', d: 'Hub 이용 방법과 Agent 등록 기준을 안내합니다', accent: 'var(--c-hr)' }
};
const EMPTY: IHubData = { agents: [], ideas: [], insights: [], reactions: [], myRequests: [] };

/* ---------- 테마 ----------
   페이지를 열 때마다 라이트 모드로 시작합니다. 버튼으로 바꾼 모드는 그 방문 동안만 유지됩니다. */
type Theme = 'light' | 'dark';

function readHash(): { view: HubView; agentId?: number } {
  const h = (window.location.hash || '').replace(/^#/, '');
  const m = /^agent-(\d+)$/.exec(h);
  if (m) { return { view: 'agents', agentId: Number(m[1]) }; }
  return { view: VIEWS.indexOf(h as HubView) >= 0 ? h as HubView : 'home' };
}
function writeHash(h: string): void {
  try { window.history.replaceState(window.history.state, '', '#' + h); } catch (e) { /* 무시 */ }
}

export default function MuniAgentHub(props: IMuniAgentHubProps): JSX.Element {
  const { service } = props;
  const initial = React.useMemo(readHash, []);
  const [view, setView] = React.useState<HubView>(initial.view);
  const [panel, setPanel] = React.useState<PanelState>(initial.agentId ? { kind: 'agent', id: initial.agentId } : undefined);
  const [me, setMe] = React.useState<IMe | undefined>(undefined);
  const [data, setData] = React.useState<IHubData>(EMPTY);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string>('');
  const [toastMsg, setToastMsg] = React.useState<{ m: string; tone?: 'ok' | 'error' }>({ m: '' });
  const [theme, setTheme] = React.useState<Theme>('light');
  const toggleTheme = (): void => setTheme(theme === 'dark' ? 'light' : 'dark');
  // 로고: 웹 파트 설정에 주소가 있으면 그 이미지, 없거나 못 불러오면 패키지에 든 무늬랩스 로고
  const customLogo = (props.logoUrl || '').trim();
  const [customLogoFailed, setCustomLogoFailed] = React.useState(false);
  React.useEffect(() => { setCustomLogoFailed(false); }, [customLogo]);
  const logoSrc = customLogo && !customLogoFailed ? customLogo : MUNI_LOGO;
  const [browseInit, setBrowseInit] = React.useState<{ q: string; cat: string; key: number }>({ q: '', cat: '전체', key: 0 });
  const toastTimer = React.useRef<number>(0);
  const rootRef = React.useRef<HTMLDivElement>(null);

  const toast = React.useCallback((m: string, tone?: 'ok' | 'error'): void => {
    setToastMsg({ m, tone });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToastMsg({ m: '' }), tone === 'error' ? 5000 : 2800);
  }, []);
  const fail = (e: unknown): void => {
    toast(e instanceof HubError || e instanceof Error ? e.message : '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.', 'error');
  };

  /* ---------- 불러오기 ---------- */
  const load = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError('');
    try {
      const who = me || await service.getMe();
      if (!me) { setMe(who); }
      setData(await service.loadAll(who));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Hub 데이터를 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [service, me]);
  React.useEffect(() => { load().catch(() => undefined); }, [service]);

  /* ---------- 화면 전환 ---------- */
  const go = React.useCallback((v: HubView): void => {
    setPanel(undefined);
    setView(v);
    writeHash(v);
    const el = rootRef.current;
    if (el && el.getBoundingClientRect().top < 0) { el.scrollIntoView({ block: 'start' }); }
  }, []);
  // 로고·홈 탭: 홈으로 가면서 목록을 다시 읽어 옵니다 (페이지 전체를 새로 고치지는 않음)
  const goHome = (): void => {
    go('home');
    load().catch(() => undefined);
  };
  const closePanel = (): void => {
    if (panel && panel.kind === 'agent') { writeHash(view); }
    setPanel(undefined);
  };

  /* ---------- 좋아요·후기 ---------- */
  const mine = (t: TargetType, id: number): IReaction | undefined =>
    me ? first(data.reactions, r => r.targetType === t && r.targetId === id && r.kind === '좋아요' && !!r.author && r.author.id === me.id) : undefined;

  const toggleLike = async (t: TargetType, id: number): Promise<void> => {
    if (!me) { return; }
    const existing = mine(t, id);
    const before = data.reactions;
    if (existing) {
      setData(d => ({ ...d, reactions: d.reactions.filter(r => r.id !== existing.id) }));
      try { if (existing.id > 0) { await service.removeReaction(existing.id); } } catch (e) { setData(d => ({ ...d, reactions: before })); fail(e); }
    } else {
      const temp: IReaction = { id: -Date.now(), targetType: t, targetId: id, kind: '좋아요', body: '', author: { id: me.id, name: me.name, email: me.email }, created: new Date().toISOString() };
      setData(d => ({ ...d, reactions: d.reactions.concat([temp]) }));
      try {
        const saved = await service.addReaction(t, id, '좋아요');
        setData(d => ({ ...d, reactions: d.reactions.map(r => r.id === temp.id ? { ...saved, author: temp.author } : r) }));
      } catch (e) { setData(d => ({ ...d, reactions: before })); fail(e); }
    }
  };

  const addFeedback = async (agentId: number, kind: ReactionKind, body: string): Promise<boolean> => {
    if (!me) { return false; }
    try {
      const saved = await service.addReaction('Agent', agentId, kind, body);
      setData(d => ({ ...d, reactions: d.reactions.concat([{ ...saved, author: { id: me.id, name: me.name, email: me.email } }]) }));
      toast('후기를 남겼습니다.');
      return true;
    } catch (e) { fail(e); return false; }
  };

  /* ---------- 신청 ---------- */
  const submitRequest = async (req: INewAgentRequest): Promise<boolean> => {
    if (!me) { return false; }
    try {
      await service.createRequest(req);
      const myRequests = await service.getMyRequests(me.id);
      setData(d => ({ ...d, myRequests }));
      setPanel(undefined);
      if (view !== 'agents') { setView('agents'); writeHash('agents'); }
      toast('신청했습니다. 검토가 끝나면 Hub에 게시됩니다.');
      return true;
    } catch (e) { fail(e); return false; }
  };
  const cancelRequest = async (id: number): Promise<void> => {
    try {
      await service.cancelRequest(id);
      setData(d => ({ ...d, myRequests: d.myRequests.map(r => r.id === id ? { ...r, status: '취소' } : r) }));
      toast('신청을 취소했습니다.');
    } catch (e) { fail(e); }
  };
  const submitIdea = async (idea: INewIdea): Promise<boolean> => {
    if (!me) { return false; }
    try {
      const id = await service.createIdea(idea);
      // 올린 사람의 좋아요 1개를 함께 남깁니다. 실패해도 아이디어는 올라가 있으므로 넘어갑니다.
      try { await service.addReaction('Idea', id, '좋아요'); } catch (e) { /* 무시 */ }
      const [ideas, reactions] = await Promise.all([service.getIdeas(), service.getReactions()]);
      setData(d => ({ ...d, ideas, reactions }));
      setPanel(undefined);
      if (view !== 'ideas') { setView('ideas'); writeHash('ideas'); }
      toast('아이디어를 올렸습니다. 내 좋아요 1개가 함께 반영됐습니다.');
      return true;
    } catch (e) { fail(e); return false; }
  };
  const submitInsight = async (s: INewInsight): Promise<boolean> => {
    try {
      await service.createInsight(s);
      const insights = await service.getInsights();
      setData(d => ({ ...d, insights }));
      setPanel(undefined);
      if (view !== 'insights') { setView('insights'); writeHash('insights'); }
      toast('사례를 올렸습니다. 운영 담당자가 확인하면 모두에게 보입니다.');
      return true;
    } catch (e) { fail(e); return false; }
  };
  const copyAgentLink = (id: number): void => {
    const url = window.location.href.replace(/#.*$/, '') + '#agent-' + id;
    const done = (): void => toast('Agent 링크를 복사했습니다.');
    const nav = window.navigator as Navigator & { clipboard?: { writeText(t: string): Promise<void> } };
    if (nav.clipboard) { nav.clipboard.writeText(url).then(done, () => toast(url)); } else { toast(url); }
  };

  /* ---------- 하위 화면에 내려 줄 동작 ---------- */
  const api: IHubApi | undefined = me ? {
    data, me,
    likeCount: (t, id) => data.reactions.filter(r => r.targetType === t && r.targetId === id && r.kind === '좋아요').length,
    liked: (t, id) => !!mine(t, id),
    feedbackCount: id => data.reactions.filter(r => r.targetType === 'Agent' && r.targetId === id && r.kind !== '좋아요').length,
    toggleLike: (t, id) => { toggleLike(t, id).catch(fail); },
    go,
    browse: f => { setBrowseInit(b => ({ q: f.q || '', cat: f.cat || '전체', key: b.key + 1 })); go('agents'); },
    openAgent: id => { setPanel({ kind: 'agent', id }); writeHash('agent-' + id); },
    openInsight: id => setPanel({ kind: 'insight', id }),
    openIdeaDetail: id => setPanel({ kind: 'ideaDetail', id }),
    openRegister: () => setPanel({ kind: 'register' }),
    openIdea: () => { if (view !== 'ideas') { setView('ideas'); writeHash('ideas'); } setPanel({ kind: 'idea' }); },
    openInsightForm: () => setPanel({ kind: 'insightForm' }),
    cancelRequest: id => { cancelRequest(id).catch(fail); },
    copyAgentLink,
    toast
  } : undefined;

  const head = HEAD[view];
  const headAction = (): void => {
    if (!api) { return; }
    if (view === 'agents') { api.openRegister(); } else if (view === 'ideas') { api.openIdea(); } else if (view === 'insights') { api.openInsightForm(); }
  };

  /* ---------- 패널 내용 ---------- */
  let panelBody: React.ReactNode = null;
  if (api && panel) {
    if (panel.kind === 'agent') {
      const a = first(data.agents, x => x.id === panel.id);
      panelBody = a ? <AgentDetail api={api} agent={a} onClose={closePanel} onFeedback={addFeedback} />
        : !loading ? <div className="pb"><p className="lead">이 Agent는 게시되지 않았거나 정리됐습니다.</p><button type="button" className="btn" onClick={closePanel}>닫기</button></div> : null;
    } else if (panel.kind === 'insight') {
      const s = first(data.insights, x => x.id === panel.id);
      panelBody = s ? <InsightDetail insight={s} onClose={closePanel} /> : null;
    } else if (panel.kind === 'ideaDetail') {
      const idea = first(data.ideas, x => x.id === panel.id);
      panelBody = idea ? <IdeaDetail api={api} idea={idea} onClose={closePanel} /> : null;
    } else if (panel.kind === 'register') {
      panelBody = <RegisterForm me={api.me} existingTitles={data.agents.map(a => a.title).concat(data.myRequests.filter(r => r.status === '검토 중').map(r => r.title))} onCancel={closePanel} onSubmit={submitRequest} />;
    } else if (panel.kind === 'insightForm') {
      panelBody = <InsightForm onCancel={closePanel} onSubmit={submitInsight} />;
    } else {
      panelBody = <IdeaForm agents={data.agents} ideas={data.ideas} onCancel={closePanel} onOpenAgent={api.openAgent} onSubmit={submitIdea} />;
    }
  }

  return (
    <div ref={rootRef} className={styles.muniHub} data-theme={theme}>
      {props.showHeader ? (
        <header className="hub-head">
          <a href="#home" className="brandmark" title="홈으로 (새로 고침)" onClick={e => { e.preventDefault(); goHome(); }}>
            <span className="brand-logo"><img src={logoSrc} alt="무늬랩스" onError={() => { if (logoSrc !== MUNI_LOGO) { setCustomLogoFailed(true); } }} /></span>
            <span className="brand-sep" aria-hidden="true" />
            <span className="stitle"><b>MUNI Agent Hub</b><small>MUNI LABS</small></span>
          </a>
          <div className="snav-w">
            <nav className="snav" aria-label="Hub 메뉴">
              {TABS.map(t => (
                <a key={t.v} href={'#' + t.v} className={view === t.v ? 'on' : ''} aria-current={view === t.v ? 'page' : undefined}
                  onClick={e => { e.preventDefault(); if (t.v === 'home') { goHome(); } else { go(t.v); } }}>{t.label}</a>
              ))}
            </nav>
          </div>
          <div className="head-tools">
            <button type="button" className="theme-tog" onClick={toggleTheme} aria-pressed={theme === 'dark'}
              aria-label={theme === 'dark' ? '라이트 모드로 바꾸기' : '다크 모드로 바꾸기'} title={theme === 'dark' ? '라이트 모드' : '다크 모드'}>
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
            </button>
            <button type="button" className="btn pr head-cta" onClick={() => { if (api) { api.openRegister(); } }} disabled={!api}>+ Agent 등록</button>
          </div>
        </header>
      ) : null}

      {head ? (
        <div className="phead" style={{ ['--pa' as string]: head.accent } as React.CSSProperties}>
          <div className="wrap">
            <div><p className="crumb">MUNI Agent Hub › {head.t}</p><h1>{head.t}</h1><p className="d">{head.d}</p></div>
            {head.b ? <div className="pact"><button type="button" className="btn pr" onClick={headAction} disabled={!api}>{head.b}</button>{head.n ? <small>{head.n}</small> : null}</div> : null}
          </div>
        </div>
      ) : null}

      <main className="hub-main">
        {error ? (
          <div className="state err-state" role="alert">
            <b>Hub를 불러오지 못했습니다</b>
            <p>{error}</p>
            <button type="button" className="btn" onClick={() => { load().catch(() => undefined); }}>다시 시도</button>
          </div>
        ) : loading && !api ? (
          <div className="state" aria-busy="true"><span className="spin" aria-hidden="true" /><p>Agent Hub를 불러오는 중입니다</p></div>
        ) : api ? (
          view === 'home' ? <HomeView api={api} />
            : view === 'agents' ? <AgentsView key={browseInit.key} api={api} initialQuery={browseInit.q} initialCategory={browseInit.cat} />
              : view === 'ideas' ? <IdeasView api={api} />
                : view === 'insights' ? <InsightsView api={api} />
                  : <GuideView api={api} />
        ) : null}
      </main>

      <SidePanel open={!!panel && !!panelBody} labelId="hub-p-title" onClose={closePanel} center={true}>{panelBody}</SidePanel>
      <Toast message={toastMsg.m} tone={toastMsg.tone} />
    </div>
  );
}
