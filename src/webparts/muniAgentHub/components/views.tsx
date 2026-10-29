/* 다섯 개 화면: 홈, Agent 둘러보기, 아이디어 보드, 인사이트, 이용 안내 */
import * as React from 'react';
import { IAgent, IIdea, IInsight } from '../models/types';
import {
  AGENT_TYPES, CATEGORIES, IDEA_STATUSES, INDUSTRIES, ROUTE, TOOLS, TYPE_LONG,
  agentCode, catColor, first, mmdd, monthlyHours, requestCode, sameMonth
} from '../models/rules';
import { IHubApi } from './api';
import {
  Empty, Highlight, IconComment, IconLike, IconSearch, IconUp, LevelBadge, RiskBadge, Shape, StatusPill, Tile
} from './ui';

const stop = (e: React.SyntheticEvent): void => { e.stopPropagation(); };
const onEnter = (fn: () => void) => (e: React.KeyboardEvent): void => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fn(); } };
const newestFirst = (a: string, b: string): number => (b || '').localeCompare(a || '');

/* ---------- Agent 카드와 추가 버튼 ---------- */
export function AddButton(props: { agent: IAgent; small?: boolean }): JSX.Element {
  const a = props.agent;
  const cls = 'btn ' + (props.small ? 'ghost sm' : 'pr');
  // 모든 Agent에 '+ 내 Copilot에 추가' 하나만 둡니다. 직원 공유 Agent는 공유받은 사람에게만 설치됩니다.
  if (!a.installLink) {
    return <span className={cls + ' off'} title="설치 링크가 아직 등록되지 않았습니다" aria-disabled="true">+ 내 Copilot에 추가</span>;
  }
  return <a className={cls} href={a.installLink} target="_blank" rel="noopener noreferrer" onClick={stop}>+ 내 Copilot에 추가</a>;
}

function AgentCard(props: { api: IHubApi; agent: IAgent; q?: string }): JSX.Element {
  const { api, agent: a } = props;
  const q = props.q || '';
  const open = (): void => api.openAgent(a.id);
  return (
    <article className="card" tabIndex={0} role="button" aria-label={`${a.title} 상세 보기`} onClick={open} onKeyDown={onEnter(open)}>
      <div className="top"><Tile category={a.category} type={a.type} /><LevelBadge level={a.shareLevel} /></div>
      <h3><Highlight text={a.title} q={q} /></h3>
      <p className="meta"><span className="aid">{agentCode(a.id)}</span> · {a.category} · {a.type}</p>
      <p className="desc"><Highlight text={a.summary} q={q} /></p>
      <div className="foot">
        <span className="stat num">
          <span className={api.liked('Agent', a.id) ? 'liked' : ''}><IconLike />{api.likeCount('Agent', a.id)}</span>
          <span><IconComment />{api.feedbackCount(a.id)}</span>
        </span>
        <AddButton agent={a} small={true} />
      </div>
    </article>
  );
}

function IdeaRow(props: { api: IHubApi; idea: IIdea; q?: string }): JSX.Element {
  const { api, idea: i } = props;
  const agent = i.linkedAgentId ? first(api.data.agents, x => x.id === i.linkedAgentId) : undefined;
  const hrs = monthlyHours(i.frequency, i.minutes);
  const mine = !!(i.author && i.author.id === api.me.id);
  const likes = api.likeCount('Idea', i.id);
  const comments = api.commentCount(i.id);
  const open = (): void => api.openIdeaDetail(i.id);
  return (
    <div className="irow" tabIndex={0} role="button" aria-label={`${i.title} 아이디어 보기`} onClick={open}
      onKeyDown={e => { if (e.target === e.currentTarget) { onEnter(open)(e); } }}>
      <button type="button" className="vote num" aria-pressed={api.liked('Idea', i.id)} aria-label={`${i.title}에 좋아요, 현재 ${likes}`} onClick={e => { stop(e); api.toggleLike('Idea', i.id); }}>
        <IconUp />{likes}
      </button>
      <div className="itx">
        <h3><Highlight text={i.title} q={props.q || ''} /></h3>
        <p><Highlight text={i.summary} q={props.q || ''} /></p>
        <small>{mine ? <><b className="mine">내 아이디어</b> · </> : null}{i.team} · {mmdd(i.created)}{hrs !== undefined ? ` · 월 약 ${hrs}시간 업무` : ''}
          {comments ? <> · <span className="cmt" aria-label={`댓글 ${comments}개`}><IconComment />{comments}</span></> : null}</small>
      </div>
      <div className="iend">
        <StatusPill status={i.status} />
        {agent ? <button type="button" className="lnk" onClick={e => { stop(e); api.openAgent(agent.id); }}>→ {agent.title}</button> : null}
      </div>
    </div>
  );
}

function InsightCard(props: { api: IHubApi; s: IInsight; q?: string }): JSX.Element {
  const { api, s } = props;
  const open = (): void => api.openInsight(s.id);
  return (
    <article className="card" tabIndex={0} role="button" aria-label={`${s.title} 사례 보기`} onClick={open} onKeyDown={onEnter(open)}>
      <span className="top"><span className={'ind i-' + s.industry}>{s.industry}</span>{s.pending ? <span className="st s-rv">게시 검토 중</span> : null}</span>
      <h3><Highlight text={s.title} q={props.q || ''} /></h3>
      <p className="meta">고객사 · {s.customerType} · {s.area}</p>
      <p className="desc"><Highlight text={s.summary} q={props.q || ''} /></p>
      <div className="tags">{s.tools.map(t => <span key={t}>{t}</span>)}</div>
      <div className="foot col"><span className="out1"><b>{s.outcome}</b></span><span className="when">{s.team} · {mmdd(s.created)}</span></div>
    </article>
  );
}

/* ---------- 홈 ---------- */
export function HomeView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const { agents, ideas, insights } = api.data;
  const [q, setQ] = React.useState('');
  const now = new Date();
  const recent = agents.slice().sort((a, b) => newestFirst(a.reviewedOn, b.reviewedOn));
  const popular = agents.slice().sort((a, b) => api.likeCount('Agent', b.id) - api.likeCount('Agent', a.id)).slice(0, 4);
  const cloud = recent.slice(0, 9);
  const topIdeas = ideas.filter(i => i.status !== '등록 완료')
    .sort((a, b) => api.likeCount('Idea', b.id) - api.likeCount('Idea', a.id)).slice(0, 3);
  const recentIns = insights.filter(s => !s.pending).sort((a, b) => newestFirst(a.created, b.created)).slice(0, 2);
  const inProgress = ideas.filter(i => i.status === '검토 중' || i.status === '제작 중').length;
  const search = (e: React.FormEvent): void => { e.preventDefault(); api.browse({ q: q.trim() }); };

  return (
    <section aria-label="홈">
      <div className="hero">
        <div className="hero-main">
          <p className="eb">무늬랩스 Agent Hub</p>
          <h1>필요한 Agent,<br /><em>여기서 찾으세요</em></h1>
          <p className="lede">동료가 만든 Agent를 검색해 내 Copilot에 바로 추가하세요. 없으면 아이디어로 제안하면 됩니다.</p>
          <form className="hero-search" role="search" onSubmit={search}>
            <IconSearch />
            <input id="hub-home-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="어떤 일을 도와줄 Agent를 찾나요? 예: 회의록, 제안서" aria-label="Agent 검색" />
            <button type="submit" className="btn pr">검색</button>
          </form>
          <div className="quick" aria-label="카테고리 바로가기">
            {CATEGORIES.map(c => (
              <button key={c} type="button" className="qchip" onClick={() => api.browse({ cat: c })}>
                <i style={{ background: catColor(c) }} />{c}
                <span className="num">{agents.filter(a => a.category === c).length}</span>
              </button>
            ))}
          </div>
          <dl className="kpis num">
            <div><dt>게시된 Agent</dt><dd>{agents.length}</dd></div>
            <div><dt>이번 달 새 Agent</dt><dd>{agents.filter(a => sameMonth(a.reviewedOn, now)).length}</dd></div>
            <div><dt>진행 중 아이디어</dt><dd>{inProgress}</dd></div>
          </dl>
        </div>
        {cloud.length ? (
          <div className="cloud" role="group" aria-label="최근 게시된 Agent">
            {cloud.map((a, k) => (
              <button key={a.id} type="button" className={'cl cl-' + k} style={{ ['--c' as string]: catColor(a.category) } as React.CSSProperties}
                title={`${a.title} · ${a.category} · ${a.type}`} aria-label={`${a.title} 상세 보기`} onClick={() => api.openAgent(a.id)}>
                <svg viewBox="0 0 40 40" aria-hidden="true"><Shape type={a.type} color={catColor(a.category)} /></svg>
                <span>{a.title}</span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      <div className="sec">
        <div className="sec-h"><div><h2>많이 쓰는 Agent</h2><p>좋아요가 많은 순서입니다</p></div><button type="button" className="lnk" onClick={() => api.go('agents')}>전체 보기 →</button></div>
        {popular.length ? <div className="grid four">{popular.map(a => <AgentCard key={a.id} api={api} agent={a} />)}</div>
          : <Empty title="아직 게시된 Agent가 없습니다."><span>직접 만든 Agent가 있다면 첫 번째로 등록해 주세요.</span><button type="button" className="btn pr" onClick={api.openRegister}>+ Agent 등록</button></Empty>}
      </div>

      <div className="sec homecols">
        <div>
          <div className="sec-h"><div><h2>새로 들어온 Agent</h2><p>최근 검토를 통과했습니다</p></div></div>
          <div className="mini">
            {recent.slice(0, 4).map(a => (
              <button key={a.id} type="button" className="newrow" onClick={() => api.openAgent(a.id)}>
                <Tile category={a.category} type={a.type} />
                <span className="nr-t"><b>{a.title}</b><small>{a.summary}</small></span>
                <span className="nr-d">{mmdd(a.reviewedOn)}</span>
              </button>
            ))}
          </div>
        </div>
        <div>
          <div className="sec-h"><div><h2>투표 중인 아이디어</h2><p>필요하면 좋아요를 눌러 주세요</p></div><button type="button" className="lnk" onClick={() => api.go('ideas')}>아이디어 보드 →</button></div>
          {topIdeas.length ? <div className="mini">{topIdeas.map(i => <IdeaRow key={i.id} api={api} idea={i} />)}</div>
            : <Empty title="진행 중인 아이디어가 없습니다." />}
        </div>
      </div>

      <div className="sec">
        <div className="sec-h"><div><h2>고객 프로젝트 인사이트</h2><p>우리가 고객사에서 만든 Agent 사례입니다</p></div><button type="button" className="lnk" onClick={() => api.go('insights')}>사례 전체 보기 →</button></div>
        {recentIns.length ? <div className="grid two">{recentIns.map(s => <InsightCard key={s.id} api={api} s={s} />)}</div>
          : <Empty title="아직 올라온 사례가 없습니다." />}
      </div>

      <div className="sec steps">
        <div className="step"><span className="n">1</span><div><b>찾기</b><span>이름을 몰라도 하는 일로 검색해 Agent를 찾습니다.</span></div></div>
        <div className="step"><span className="n">2</span><div><b>추가</b><span>'내 Copilot에 추가'로 바로 사용합니다.</span></div></div>
        <div className="step"><span className="n">3</span><div><b>나누기</b><span>좋아요와 후기를 남기고, 필요한 Agent는 아이디어로 올립니다.</span></div></div>
      </div>
    </section>
  );
}

/* ---------- Agent 둘러보기 ---------- */
function MyRequests(props: { api: IHubApi }): JSX.Element | null {
  const { api } = props;
  const list = api.data.myRequests.filter(r => r.status !== '취소');
  if (!list.length) { return null; }
  return (
    <div className="myreq">
      <div className="sec-h"><h2>내 등록 신청 <span className="num cnt">{list.length}</span></h2><span className="hint">Hub에는 게시된 Agent만 보입니다</span></div>
      {list.map(r => {
        const published = r.publishedAgentId ? first(api.data.agents, a => a.id === r.publishedAgentId) : undefined;
        return (
          <div key={r.id} className={'rq' + (r.status === '승인' ? ' done' : '')}>
            <Tile category={r.category} type={r.type} />
            <div className="rq-t">
              <h3>{r.title}</h3>
              <p><span className="aid">{requestCode(r.id)}</span> · {r.category} · {r.type} · 신청 {mmdd(r.created)}</p>
              {r.status === '보완 요청' || r.status === '반려'
                ? <p className="route warn-t">{r.reviewerComment || '운영 담당자의 의견을 확인해 주세요.'}</p>
                : <p className="route">{ROUTE[r.risk]}</p>}
            </div>
            <div className="rq-e">
              <RiskBadge risk={r.risk} />
              <StatusPill status={r.status} />
              {published ? <button type="button" className="lnk" onClick={() => api.openAgent(published.id)}>Hub에서 보기 →</button> : null}
              {r.status === '검토 중' || r.status === '보완 요청'
                ? <button type="button" className="lnk" onClick={() => api.cancelRequest(r.id)}>신청 취소</button> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function AgentsView(props: { api: IHubApi; initialQuery?: string; initialCategory?: string }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState(props.initialQuery || '');
  const [cat, setCat] = React.useState(props.initialCategory || '전체');
  const [official, setOfficial] = React.useState(false);
  const [sort, setSort] = React.useState('rev');
  const ql = q.trim().toLowerCase();
  const rows = api.data.agents
    .filter(a => (cat === '전체' || a.category === cat) && (!official || a.shareLevel === '공식 운영')
      && (!ql || [a.title, a.summary, a.description].some(x => x.toLowerCase().indexOf(ql) >= 0)))
    .sort(sort === 'like' ? (a, b) => api.likeCount('Agent', b.id) - api.likeCount('Agent', a.id)
      : sort === 'name' ? (a, b) => a.title.localeCompare(b.title, 'ko') : (a, b) => newestFirst(a.reviewedOn, b.reviewedOn));
  return (
    <section aria-label="Agent 둘러보기">
      <MyRequests api={api} />
      <div className="tools">
        <label className="search"><IconSearch /><input id="hub-a-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="Agent 이름이나 하는 일로 검색" aria-label="Agent 검색" /></label>
        <div className="frow">
          <div className="chips" role="group" aria-label="카테고리">
            {['전체'].concat(CATEGORIES).map(c => (
              <button key={c} type="button" className={'chip' + (cat === c ? ' on' : '')} aria-pressed={cat === c} onClick={() => setCat(c)}>
                {c !== '전체' ? <i className="dot" style={{ background: catColor(c) }} /> : null}{c}
              </button>
            ))}
          </div>
          <button type="button" className="tog" aria-pressed={official} onClick={() => setOfficial(!official)}><span className="sw" aria-hidden="true" />공식 운영만</button>
          <div className="fright">
            <span className="count num">Agent {rows.length}개</span>
            <label>정렬 <select id="hub-a-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="rev">최신 검토순</option><option value="like">좋아요순</option><option value="name">이름순</option></select></label>
          </div>
        </div>
        <div className="legend"><span>모양</span>{AGENT_TYPES.map(t => <span key={t}><svg viewBox="0 0 40 40" aria-hidden="true"><Shape type={t} color="var(--sub)" /></svg>{t}</span>)}</div>
      </div>
      <div className="grid">
        {rows.length ? rows.map(a => <AgentCard key={a.id} api={api} agent={a} q={q} />) : (
          <Empty title="찾는 Agent가 없나요?">
            <span>필요한 Agent를 아이디어로 올리면 월 1회 검토해 제작 담당을 정합니다.</span>
            <span className="row-btns"><button type="button" className="btn pr" onClick={api.openIdea}>아이디어 올리기</button><button type="button" className="btn" onClick={api.openRegister}>직접 만든 Agent 등록</button></span>
          </Empty>
        )}
      </div>
    </section>
  );
}

/* ---------- 아이디어 보드 ---------- */
export function IdeasView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [st, setSt] = React.useState('전체');
  const [sort, setSort] = React.useState('like');
  const ql = q.trim().toLowerCase();
  const all = api.data.ideas;
  const rows = all.filter(i => (st === '전체' || i.status === st) && (!ql || (i.title + ' ' + i.summary).toLowerCase().indexOf(ql) >= 0))
    .sort(sort === 'new' ? (a, b) => newestFirst(a.created, b.created) : (a, b) => api.likeCount('Idea', b.id) - api.likeCount('Idea', a.id));
  return (
    <section aria-label="아이디어 보드">
      <div className="sum num">
        {IDEA_STATUSES.map((s, k) => (
          <button key={s} type="button" className={st === s ? 'on' : ''} aria-pressed={st === s} onClick={() => setSt(st === s ? '전체' : s)}>
            <small><i>{k + 1}/{IDEA_STATUSES.length}</i>{s}</small><b>{all.filter(i => i.status === s).length}</b>
          </button>
        ))}
      </div>
      <div className="tools">
        <label className="search"><IconSearch /><input id="hub-i-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="아이디어 검색" aria-label="아이디어 검색" /></label>
        <div className="frow">
          <div className="chips" role="group" aria-label="상태">
            {['전체'].concat(IDEA_STATUSES).map(s => <button key={s} type="button" className={'chip' + (st === s ? ' on' : '')} aria-pressed={st === s} onClick={() => setSt(s)}>{s}</button>)}
          </div>
          <div className="fright">
            <span className="count num">아이디어 {rows.length}건</span>
            <label>정렬 <select id="hub-i-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="like">좋아요순</option><option value="new">최신순</option></select></label>
          </div>
        </div>
      </div>
      <div className="ilist">
        {rows.length ? rows.map(i => <IdeaRow key={i.id} api={api} idea={i} q={q} />)
          : <Empty title="조건에 맞는 아이디어가 없습니다."><button type="button" className="btn pr" onClick={api.openIdea}>아이디어 올리기</button></Empty>}
      </div>
      <p className="note">좋아요가 많은 아이디어는 월 1회 검토해 제작 담당을 정합니다. 업무 시간이 큰 아이디어도 함께 봅니다.</p>
    </section>
  );
}

/* ---------- 인사이트 ---------- */
export function InsightsView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [ind, setInd] = React.useState('전체');
  const [tools, setTools] = React.useState<string[]>([]);
  const [menu, setMenu] = React.useState(false);
  const [sort, setSort] = React.useState('new');
  const menuRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!menu) { return undefined; }
    const close = (e: MouseEvent): void => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) { setMenu(false); } };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menu]);
  const ql = q.trim().toLowerCase();
  const rows = api.data.insights
    .filter(s => (ind === '전체' || s.industry === ind) && tools.every(t => s.tools.indexOf(t) >= 0)
      && (!ql || [s.title, s.summary, s.problem, s.solution, s.area, s.tools.join(' ')].some(x => x.toLowerCase().indexOf(ql) >= 0)))
    .sort(sort === 'name' ? (a, b) => a.title.localeCompare(b.title, 'ko') : (a, b) => newestFirst(a.created, b.created));
  const toggleTool = (t: string): void => setTools(tools.indexOf(t) >= 0 ? tools.filter(x => x !== t) : tools.concat([t]));
  const reset = (): void => { setQ(''); setInd('전체'); setTools([]); };
  return (
    <section aria-label="인사이트">
      <div className="tools">
        <label className="search"><IconSearch /><input id="hub-s-q" type="search" value={q} onChange={e => setQ(e.target.value)} placeholder="업종, 업무, Agent 이름으로 검색" aria-label="사례 검색" /></label>
        <div className="frow">
          <div className="chips" role="group" aria-label="업종">
            {['전체'].concat(INDUSTRIES).map(c => <button key={c} type="button" className={'chip' + (ind === c ? ' on' : '')} aria-pressed={ind === c} onClick={() => setInd(c)}>{c}</button>)}
          </div>
          <div className="multi" ref={menuRef}>
            <button type="button" aria-expanded={menu} onClick={() => setMenu(!menu)}>{tools.length ? `구성 도구 ${tools.length} ▾` : '구성 도구 ▾'}</button>
            {menu ? <div className="menu">{TOOLS.map((t, k) => <label key={t}><input type="checkbox" id={`hub-tool-${k}`} checked={tools.indexOf(t) >= 0} onChange={() => toggleTool(t)} />{t}</label>)}</div> : null}
          </div>
          <div className="fright">
            <span className="count num">사례 {rows.length}건</span>
            <label>정렬 <select id="hub-s-sort" value={sort} onChange={e => setSort(e.target.value)}><option value="new">최신순</option><option value="name">제목순</option></select></label>
          </div>
        </div>
      </div>
      <div className="grid two">
        {rows.length ? rows.map(s => <InsightCard key={s.id} api={api} s={s} q={q} />)
          : <Empty title="조건에 맞는 사례가 없습니다."><button type="button" className="btn" onClick={reset}>필터 초기화</button></Empty>}
      </div>
    </section>
  );
}

/* ---------- 이용 안내 ---------- */
export function GuideView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  return (
    <section aria-label="이용 안내">
      <div className="guide">
        <div>
          <div className="gbox">
            <h2>Agent 등록 절차</h2>
            <div className="flow"><span className="k">신청</span><i>→</i><span>검토 중</span><i>→</i><span>검토</span><i>→</i><span className="k">게시</span><i>→</i><span>정기 점검</span></div>
            <ul>
              <li><b>신청</b> · '+ Agent 등록'의 신청서에 소개, 유형, 사용 데이터, 외부 연결, 설치 링크, 테스트 결과를 적습니다.</li>
              <li><b>검토</b> · 운영 담당자가 위험도를 판정하고 테스트 결과를 확인합니다. 만든 사람은 자기 Agent를 승인하지 않습니다.</li>
              <li><b>게시</b> · 검토를 통과하면 Hub에 노출됩니다. Hub에는 '게시' 상태만 보입니다.</li>
              <li><b>정기 점검</b> · 위험도에 따라 점검합니다 (저 반기 · 중 분기 · 고 월간). 180일 동안 쓰이지 않으면 정리 대상입니다.</li>
            </ul>
            <button type="button" className="btn pr reg-cta" onClick={api.openRegister}>+ Agent 등록 신청</button>
          </div>
          <div className="gbox">
            <h2>공유 등급</h2>
            <div className="lv"><span className="badge b-sh">직원 공유</span><span>제작자가 운영하며 개발·테스트 환경에서 최대 5명에게 공유합니다. 공유받은 사람만 추가할 수 있습니다.</span></div>
            <div className="lv"><span className="badge b-of">공식 운영</span><span>승인을 거쳐 운영 환경으로 옮긴 Agent입니다. 담당자가 책임지고 정기 점검을 받습니다. Hub에서 바로 추가할 수 있습니다.</span></div>
            <div className="lv"><span className="badge b-me">개인</span><span>본인만 쓰는 Agent는 Hub에 등록하지 않습니다.</span></div>
          </div>
          <div className="gbox">
            <h2>Agent 무늬 읽는 법</h2>
            {AGENT_TYPES.map(t => (
              <div key={t} className="keyrow"><span className="tile" style={{ ['--c' as string]: 'var(--ink)' } as React.CSSProperties}><svg viewBox="0 0 40 40" aria-hidden="true"><Shape type={t} color="var(--ink)" /></svg></span><span><b>{t}</b> · {TYPE_LONG[t]}</span></div>
            ))}
            <div className="keyrow"><span /><span>타일 색은 카테고리입니다. {CATEGORIES.map(c => <span key={c} className="catkey"><i style={{ background: catColor(c) }} />{c}</span>)}</span></div>
          </div>
        </div>
        <div>
          <div className="gbox">
            <h2>자주 묻는 질문</h2>
            <details className="faq" open={true}><summary>Agent를 추가했는데 답변에 문서 내용이 안 나와요</summary><p>Hub 등록과 Agent 접근 권한은 별개입니다. Agent가 참조하는 원본 문서에 내 권한이 없으면 그 내용은 답변에 나오지 않습니다. 필요한 문서 권한은 문서 소유자에게 요청하세요.</p></details>
            <details className="faq"><summary>'내 Copilot에 추가'를 눌렀는데 추가가 안 돼요</summary><p>직원 공유 Agent는 담당자가 공유한 사람만 추가할 수 있습니다. 상세 화면의 담당자에게 공유를 부탁하세요. 설치 링크는 Teams 모바일 앱에서는 열리지 않으니 PC나 웹에서 눌러 주세요.</p></details>
            <details className="faq"><summary>Agent가 이상하게 동작해요</summary><p>상세 화면에서 '개선 요청'으로 남기거나 담당자에게 알려 주세요. 민감한 정보가 노출되는 등 급한 문제는 IT 관리자에게 바로 신고하면 즉시 사용을 막습니다.</p></details>
            <details className="faq"><summary>아이디어를 올리면 누가 만드나요?</summary><p>좋아요가 많은 아이디어와 업무 시간이 큰 아이디어를 월 1회 검토해 제작 담당을 정합니다. 상태는 아이디어 → 검토 중 → 제작 중 → 등록 완료로 바뀝니다.</p></details>
            <details className="faq"><summary>인사이트에 고객사 이름을 써도 되나요?</summary><p>안 됩니다. 고객사는 '공공기관'처럼 업종 유형까지만 쓰고, 고객 데이터는 올리지 않습니다. 올린 사례는 운영 담당자가 확인한 뒤 게시합니다.</p></details>
          </div>
        </div>
      </div>
    </section>
  );
}
