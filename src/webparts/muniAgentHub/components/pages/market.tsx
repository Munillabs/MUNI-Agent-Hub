/* Marketplace (시안 그대로): 첫 화면, Agent 목록, Skill 목록, HTML 목록
   종류 탭(전체 · Agent · Skill · HTML)은 머리글 아래 mksub 에 있습니다. */
import * as React from 'react';
import { IAgent, IHtmlTool, ISkill } from '../../models/types';
import { AGENT_TOOLS, OUTPUTS, SCOPES, SKILL_AREAS, SKILL_EXTS, SKILL_KINDS, SKILL_TOOLS, WORK_TYPES, contains, mmdd, newestFirst } from '../../models/rules';
import { IHubApi } from '../api';
import { Empty, Go, Highlight, IconAgent, IconHtml, IconSkill, ListError, Pill } from '../ui';
import { Applied, BigSearch, FilterState, Filters, IFilterGroup, ListSearch, anyOf, feed, heat, hotList } from './common';

/** 리뷰 글(댓글) 수 */
function commentCount(api: IHubApi, t: 'Agent' | 'Skill' | 'Html', id: number): number {
  return api.reviews(t, id).filter(r => !!r.body.trim()).length;
}

/* ---------- Marketplace 첫 화면 ---------- */
export function MarketView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const d = api.data;
  const hot = hotList(api, 4);
  const news = feed(d, ['Agent', 'Skill', 'HTML'], 3);
  const isNew = (iso: string): boolean => api.now.getTime() - new Date(iso).getTime() < 7 * 86400000;
  const tOf = (k: string): 'Agent' | 'Skill' | 'Html' => k === 'Agent' ? 'Agent' : k === 'Skill' ? 'Skill' : 'Html';
  return (
    <div className="wrap">
      <div className="ptop mp"><div><h1>Marketplace</h1><p>회사에서 쓰는 Agent와 동료가 공유한 Skill · HTML</p></div></div>
      <BigSearch id="hub-mk-q" className="mk-search" label="Marketplace 검색" placeholder="Agent, Skill, HTML을 한 번에 찾아요" onSearch={q => api.search(q)} />
      <div className="fboards sec">
        <section className="fboard" aria-labelledby="hub-fb-hot"><header className="fb-h"><h2 id="hub-fb-hot">지금 인기</h2><span className="fb-sub">최근 30일</span></header>
          <div className="fb-cols" aria-hidden="true"><span>순위</span><span>구분</span><span>이름</span><span>평점</span><span>댓글</span></div>
          <ul className="fb-list">{hot.map((h, k) => (
            <li key={h.kind + h.id}><Go go={api.go} view={h.view} id={h.id}>
              <span className="fb-rk">{(k < 9 ? '0' : '') + (k + 1)}</span><span className="fb-k">{h.kind}</span>
              <b className="fb-n"><span className="fb-t">{h.title}</span>{h.heat ? <span className="fb-up" aria-label="상승">▲</span> : null}</b>
              <span className="fb-c3">{h.n ? `★ ${h.avg.toFixed(1)}` : '—'}</span><span className="fb-c4">{commentCount(api, tOf(h.kind), h.id)}</span>
            </Go></li>))}</ul>
          {!hot.length ? <p className="note" style={{ margin: 16 }}>아직 올라온 것이 없어요.</p> : null}
        </section>
        <section className="fboard fb-new" aria-labelledby="hub-fb-new"><header className="fb-h"><h2 id="hub-fb-new">새로 올라왔어요</h2><span className="fb-sub">등록 순</span></header>
          <div className="fb-cols" aria-hidden="true"><span>게시 날짜</span><span>구분</span><span>이름</span><span>등록자</span></div>
          <ul className="fb-list">{news.map(n => (
            <li key={n.kind + n.id}><Go go={api.go} view={n.view} id={n.id}>
              <span className="fb-rk">{mmdd(n.date)}</span><span className="fb-k">{n.kind}</span>
              <b className="fb-n"><span className="fb-t">{n.title}</span>{isNew(n.date) ? <span className="fb-newtag">NEW</span> : null}</b>
              <span className="fb-c3">{n.who}</span>
            </Go></li>))}</ul>
          {!news.length ? <p className="note" style={{ margin: 16 }}>아직 올라온 것이 없어요.</p> : null}
        </section>
      </div>
    </div>
  );
}

function starOk(sel: string[] | undefined, avg: number): boolean {
  if (!sel || !sel.length) { return true; }
  const min = Math.min.apply(Math, sel.map(s => s.indexOf('4.5') >= 0 ? 4.5 : 4));
  return avg >= min;
}
function Sort(props: { id: string; value: string; onChange: (v: string) => void; options: [string, string][] }): JSX.Element {
  return <label className="sortsel">정렬<select id={props.id} value={props.value} onChange={e => props.onChange(e.target.value)}>{props.options.map(o => <option key={o[0]} value={o[0]}>{o[1]}</option>)}</select></label>;
}
const STAR_GROUP: IFilterGroup = { k: 'star', label: '별점', items: ['★ 4.5 이상', '★ 4.0 이상'] };
/** 검색어·필터로 아무것도 안 나올 때 (시안 .empty) */
function NoMatch(props: { api: IHubApi; lab: string; ga: string; q: string; filtered: boolean; total: number; onClearQ: () => void; onClearF: () => void; add?: React.ReactNode }): JSX.Element {
  if (!props.total) {
    return <Empty title={`아직 등록된 ${props.lab}${props.ga} 없어요`} actions={props.add}>{props.lab === 'Agent' ? 'Prod에 배포된 Agent가 여기에 모여요. Maker Lab에서 첫 Agent를 만들어 보세요.' : props.lab === 'Skill' ? '자주 쓰는 지침이나 양식이 있다면 처음으로 올려 주세요.' : '브라우저에서 바로 여는 도구를 만들었다면 처음으로 올려 주세요.'}</Empty>;
  }
  const q = props.q.trim();
  return (
    <Empty title={q ? `'${q}'에 맞는 ${props.lab}${props.ga} 없어요` : `선택한 조건에 맞는 ${props.lab}${props.ga} 없어요`}
      actions={<>{q ? <button type="button" className="btn sm" onClick={props.onClearQ}>검색어 지우기</button> : null}{props.filtered ? <button type="button" className="btn sm" onClick={props.onClearF}>필터 모두 지우기</button> : null}<Go go={props.api.go} view="ideas" className="btn sm pri">Idea Board에 제안하기</Go></>}>
      {q && props.filtered ? '검색어를 바꾸거나 필터를 하나씩 빼 보세요.' : q ? '철자를 바꾸거나 더 짧은 단어로 찾아 보세요.' : '필터를 하나씩 빼 보세요.'} 그래도 없으면 필요한 걸 제안해 주세요.
    </Empty>
  );
}
const filtered = (fl: FilterState): boolean => Object.keys(fl).some(k => (fl[k] || []).some(x => x !== '전체'));

/* ---------- Agent 목록 ---------- */
export function AgentCard(props: { api: IHubApi; agent: IAgent; q?: string }): JSX.Element {
  const { api, agent: a } = props;
  const r = api.rating('Agent', a.id);
  const thumb = a.thumb;
  return (
    <article className="card bc bc-a cl">
      <div className="bcov"><span className="btag"><IconAgent size={14} />Agent</span>
        {thumb ? <div className="bthumb" aria-hidden="true" style={{ backgroundImage: `url("${thumb.url}")`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
          : <div className="bthumb ph" aria-hidden="true"><span>{a.title.trim().charAt(0)}</span></div>}</div>
      <div className="bbd">
        <h3><Go go={api.go} view="agent" id={a.id} className="stretch" style={{ textDecoration: 'none' }}><Highlight text={a.title} q={props.q || ''} /></Go></h3>
        <p><Highlight text={a.summary} q={props.q || ''} /></p>
        <div className="bpills">{a.tool ? <Pill>{a.tool}</Pill> : null}</div>
        <div className="ft"><span>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</span><span>리뷰 {commentCount(api, 'Agent', a.id)}</span></div>
      </div>
    </article>
  );
}
const AGENT_FILTERS: IFilterGroup[] = [
  { k: 'tool', label: '만든 도구', items: AGENT_TOOLS, single: true, open: true },
  { k: 'work', label: '업무 유형', items: WORK_TYPES, open: true },
  { k: 'out', label: '결과물 형태', items: OUTPUTS },
  { k: 'scope', label: '사용 범위', items: SCOPES },
  { k: 'skill', label: 'Skill 사용 여부', items: ['사용함', '사용 안 함'], single: true },
  STAR_GROUP
];
export function AgentStore(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [fl, setFl] = React.useState<FilterState>({});
  const [sort, setSort] = React.useState('hot');
  const [more, setMore] = React.useState(6);
  const rows = api.data.agents.filter(a => {
    const sk = fl.skill && fl.skill[0];
    return anyOf(fl.tool, [a.tool]) && anyOf(fl.work, [a.workType]) && anyOf(fl.out, [a.output]) && anyOf(fl.scope, a.scopes)
      && (!sk || sk === '전체' || (sk === '사용함') === (a.linkedSkills.length > 0)) && starOk(fl.star, api.rating('Agent', a.id).avg)
      && (!q.trim() || [a.title, a.summary, a.workType, a.does.join(' ')].some(x => contains(x, q.trim())));
  }).sort(sort === 'new' ? (a, b) => newestFirst(a.created, b.created)
    : sort === 'star' ? (a, b) => api.rating('Agent', b.id).avg - api.rating('Agent', a.id).avg
      : (a, b) => heat(api, 'Agent', b.id) - heat(api, 'Agent', a.id) || api.rating('Agent', b.id).avg - api.rating('Agent', a.id).avg);
  return (
    <div className="wrap">
      <div className="ptop mp"><div><h1>Agent</h1><p>회사에서 정식으로 쓰는 모든 Agent</p></div></div>
      {api.data.agentsError ? <ListError what="Agent" message={api.data.agentsError} /> : <div className="store">
        <Filters idBase="hub-af" label="필터" groups={AGENT_FILTERS} value={fl} onChange={setFl} note={<>필요한 Agent가 없으면 <Go go={api.go} view="ideas">Idea Board</Go>에 제안</>} />
        <div>
          <ListSearch id="hub-ag-q" label="Agent 검색" placeholder="Agent 이름이나 하려는 일" value={q} onChange={setQ} />
          <div className="rbar"><span className="rcount" aria-live="polite"><b>{q.trim() ? `'${q.trim()}' ` : ''}Agent {rows.length}개</b></span><Applied groups={AGENT_FILTERS} value={fl} onChange={setFl} />
            <Sort id="hub-ag-sort" value={sort} onChange={setSort} options={[['hot', '인기순'], ['new', '최신순'], ['star', '별점순']]} /></div>
          {rows.length ? <div className="g3">{rows.slice(0, more).map(a => <AgentCard key={a.id} api={api} agent={a} q={q} />)}</div>
            : <NoMatch api={api} lab="Agent" ga="가" q={q} filtered={filtered(fl)} total={api.data.agents.length} onClearQ={() => setQ('')} onClearF={() => setFl({})}
              add={<Go go={api.go} view="agentform" className="btn sm pri">＋ Agent 올리기</Go>} />}
          {rows.length > more ? <div style={{ textAlign: 'center', margin: '28px 0 72px' }}><button type="button" className="btn" onClick={() => setMore(more + 6)}>더 보기 ({more} / {rows.length})</button></div> : <div style={{ height: 72 }} />}
        </div>
      </div>}
    </div>
  );
}

/* ---------- Skill 목록 ---------- */
/** Skill 카드의 '지침 미리보기': md·txt 파일 앞부분 (한 번 읽으면 기억) */
const previewCache: { [ref: string]: string } = {};
function useSkillPreview(api: IHubApi, k: ISkill): string {
  const can = (k.ext === 'md' || k.ext === 'txt') && !!k.fileRef;
  const [text, setText] = React.useState<string>(can ? (previewCache[k.fileRef] || '') : '');
  React.useEffect(() => {
    if (!can || previewCache[k.fileRef]) { return undefined; }
    let live = true;
    api.loadFileText(k.fileRef).then(t => {
      // 앞머리(--- name: … ---)는 빼고 본문만
      const body = t.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '').replace(/\s+/g, ' ').trim().slice(0, 240);
      previewCache[k.fileRef] = body;
      if (live) { setText(body); }
    }, () => undefined);
    return () => { live = false; };
  }, [k.fileRef]);
  return text || k.purpose || k.usage;
}
export function SkillCard(props: { api: IHubApi; skill: ISkill; q?: string }): JSX.Element {
  const { api, skill: k } = props;
  const r = api.rating('Skill', k.id);
  const preview = useSkillPreview(api, k);
  return (
    <article className="card bc bc-s skcard cl">
      <div className="bcov"><span className="btag"><IconSkill size={14} />Skill</span><span className="bdate">{mmdd(k.modified)} 업데이트</span>
        <div className="bpaper"><span className="skql">지침 미리보기</span><p>{preview}</p></div></div>
      <div className="bbd">
        <h3><Go go={api.go} view="skill" id={k.id} className="stretch" style={{ textDecoration: 'none' }}><Highlight text={k.title} q={props.q || ''} /></Go></h3>
        <p><Highlight text={k.summary} q={props.q || ''} /></p>
        <div className="bpills">{k.tools.map(t => <Pill key={t}>{t}</Pill>)}</div>
        <div className="ft"><span>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</span><span className="skfile">{k.fileName}</span></div>
      </div>
    </article>
  );
}
const SKILL_FILTERS: IFilterGroup[] = [
  { k: 'tool', label: '활용 도구', items: SKILL_TOOLS, open: true },
  { k: 'area', label: '업무 분야', items: SKILL_AREAS, open: true },
  { k: 'kind', label: 'Skill 종류', items: SKILL_KINDS },
  { k: 'ext', label: '파일 형식', items: SKILL_EXTS.map(x => '.' + x) },
  { k: 'scope', label: '사용 범위', items: SCOPES },
  STAR_GROUP
];
export function SkillStore(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [fl, setFl] = React.useState<FilterState>({});
  const [sort, setSort] = React.useState('hot');
  const rows = api.data.skills.filter(s => anyOf(fl.tool, s.tools) && anyOf(fl.area, [s.area]) && anyOf(fl.kind, [s.kind]) && anyOf(fl.ext, ['.' + s.ext])
    && anyOf(fl.scope, [s.scope]) && starOk(fl.star, api.rating('Skill', s.id).avg)
    && (!q.trim() || [s.title, s.summary, s.purpose, s.usage, s.fileName].some(x => contains(x, q.trim()))))
    .sort(sort === 'new' ? (a, b) => newestFirst(a.modified, b.modified)
      : sort === 'star' ? (a, b) => api.rating('Skill', b.id).avg - api.rating('Skill', a.id).avg
        : (a, b) => heat(api, 'Skill', b.id) - heat(api, 'Skill', a.id) || api.rating('Skill', b.id).avg - api.rating('Skill', a.id).avg);
  return (
    <div className="wrap">
      <div className="ptop mp"><div><h1>Skill</h1><p>동료가 공유한, Agent에 붙여 쓰는 Skill</p></div><button type="button" className="btn" onClick={() => api.openSkillForm()}>＋ Skill 올리기</button></div>
      {api.data.skillsError ? <ListError what="Skill" message={api.data.skillsError} /> : (
        <div className="store">
          <Filters idBase="hub-sf" label="Skill 필터" groups={SKILL_FILTERS} value={fl} onChange={setFl} note={<>필요한 Skill이 없으면 <Go go={api.go} view="ideas">Idea Board</Go>에 제안</>} />
          <div>
            <ListSearch id="hub-sk-q" label="Skill 검색" placeholder="Skill 이름이나 하려는 일 (예: 용어 통일, 회의록 양식)" value={q} onChange={setQ} />
            <div className="rbar"><span className="rcount" aria-live="polite"><b>{q.trim() ? `'${q.trim()}' ` : ''}Skill {rows.length}개</b></span><Applied groups={SKILL_FILTERS} value={fl} onChange={setFl} />
              <Sort id="hub-sk-sort" value={sort} onChange={setSort} options={[['hot', '많이 쓰는 순'], ['new', '최신순'], ['star', '별점순']]} /></div>
            {rows.length ? <div className="g3" style={{ marginBottom: 72 }}>{rows.map(s => <SkillCard key={s.id} api={api} skill={s} q={q} />)}</div>
              : <NoMatch api={api} lab="Skill" ga="이" q={q} filtered={filtered(fl)} total={api.data.skills.length} onClearQ={() => setQ('')} onClearF={() => setFl({})}
                add={<button type="button" className="btn sm pri" onClick={() => api.openSkillForm()}>＋ Skill 올리기</button>} />}
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- HTML 목록 ---------- */
export function HtmlCard(props: { api: IHubApi; tool: IHtmlTool; q?: string }): JSX.Element {
  const { api, tool: h } = props;
  const r = api.rating('Html', h.id);
  return (
    <article className="card bc bc-h cl">
      <div className="bcov"><span className="btag"><IconHtml size={14} />HTML</span><span className="bdate">{mmdd(h.modified)} 업데이트</span>
        <div className="bshot" aria-hidden="true"><div className="bsbar"><i /><i /><i /><span>{h.title}</span></div><div className="aprev"><i /><i /><i /></div></div></div>
      <div className="bbd">
        <h3><Go go={api.go} view="htool" id={h.id} className="stretch" style={{ textDecoration: 'none' }}><Highlight text={h.title} q={props.q || ''} /></Go></h3>
        <p><Highlight text={h.summary} q={props.q || ''} /></p>
        <div className="bpills">{h.madeWith ? <Pill>{h.madeWith}로 제작</Pill> : null}<Pill>사내 실행</Pill></div>
        <div className="ft"><span>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</span><span className="aown">{h.author ? h.author.name : ''}</span></div>
      </div>
    </article>
  );
}
const HTML_FILTERS: IFilterGroup[] = [
  { k: 'made', label: '제작 도구', items: ['Claude', 'ChatGPT', 'Copilot', 'Cowork'], open: true },
  { k: 'area', label: '업무 분야', items: SKILL_AREAS, open: true },
  { k: 'kind', label: 'HTML 종류', items: ['계산기', '대시보드', '점검표', '투표·설문', '판단 도우미'] },
  { k: 'scope', label: '사용 범위', items: SCOPES },
  STAR_GROUP
];
/** 업무 분야·종류는 따로 저장하는 열이 없어 업무 유형·결과물·소개 글에서 찾습니다 */
function textHas(sel: string[] | undefined, text: string): boolean {
  return !sel || !sel.length || sel.some(s => contains(text, s.replace(/·.*$/, '')));
}
export function HtmlStore(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [fl, setFl] = React.useState<FilterState>({});
  const [sort, setSort] = React.useState('hot');
  const rows = api.data.htmls.filter(h => {
    const text = [h.title, h.summary, h.workType, h.output, h.does.join(' ')].join(' ');
    return anyOf(fl.made, [h.madeWith]) && textHas(fl.area, text) && textHas(fl.kind, text) && anyOf(fl.scope, [h.scope])
      && starOk(fl.star, api.rating('Html', h.id).avg) && (!q.trim() || contains(text, q.trim()));
  }).sort(sort === 'new' ? (a, b) => newestFirst(a.modified, b.modified)
    : sort === 'star' ? (a, b) => api.rating('Html', b.id).avg - api.rating('Html', a.id).avg
      : (a, b) => heat(api, 'Html', b.id) - heat(api, 'Html', a.id));
  return (
    <div className="wrap">
      <div className="ptop mp"><div><h1>HTML</h1><p>동료가 만든, 브라우저에서 바로 여는 도구</p></div><button type="button" className="btn" onClick={() => api.openHtmlForm()}>＋ HTML 올리기</button></div>
      {api.data.htmlsError ? <ListError what="HTML" message={api.data.htmlsError} /> : (
        <div className="store">
          <Filters idBase="hub-hf" label="HTML 필터" groups={HTML_FILTERS} value={fl} onChange={setFl} note={<>필요한 HTML이 없으면 <Go go={api.go} view="ideas">Idea Board</Go>에 제안</>} />
          <div>
            <ListSearch id="hub-ht-q" label="HTML 검색" placeholder="HTML 이름이나 하려는 일" value={q} onChange={setQ} />
            <div className="rbar"><span className="rcount" aria-live="polite"><b>{q.trim() ? `'${q.trim()}' ` : ''}HTML {rows.length}개</b></span><Applied groups={HTML_FILTERS} value={fl} onChange={setFl} />
              <Sort id="hub-ht-sort" value={sort} onChange={setSort} options={[['hot', '많이 쓰는 순'], ['new', '최신순'], ['star', '별점순']]} /></div>
            {rows.length ? <div className="g3" style={{ marginBottom: 72 }}>{rows.map(h => <HtmlCard key={h.id} api={api} tool={h} q={q} />)}</div>
              : <NoMatch api={api} lab="HTML" ga="이" q={q} filtered={filtered(fl)} total={api.data.htmls.length} onClearQ={() => setQ('')} onClearF={() => setFl({})}
                add={<button type="button" className="btn sm pri" onClick={() => api.openHtmlForm()}>＋ HTML 올리기</button>} />}
          </div>
        </div>
      )}
    </div>
  );
}
