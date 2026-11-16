/* Case Library (시안 그대로): 검색 + 필터 패널(활용 방식·활용 제품), 업종 칩, 사례 표 / 사례 상세(개선 내용 · 솔루션 · 프롬프트) */
import * as React from 'react';
import { ICase, ISolution } from '../../models/types';
import { CASE_INDUSTRIES, PRODUCT_CLASS, contains, isEmail, newestFirst, stepSpans } from '../../models/rules';
import { IHubApi } from '../api';
import { Crumb, Empty, Go, ListError } from '../ui';

const IND_TOP = 6;
const KIND_LABEL: { [k: string]: string } = { agent: 'Agent', skill: 'Skill', html: 'HTML' };
const SearchIcon = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
const FilterIcon = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 6h16M7 12h10M10 18h4" /></svg>;
/** CSS 변수(--n 등)를 style 에 넣기 위한 변환 */
const vars = (v: { [k: string]: string | number }): React.CSSProperties => v as unknown as React.CSSProperties;

function ProdCell(props: { list: string[] }): JSX.Element {
  return <span className="pc-list">{props.list.map(p => <span key={p} className={'pc ' + (PRODUCT_CLASS[p] || 'pc-etc')}>{p}</span>)}</span>;
}
function Eff(props: { c: ICase }): JSX.Element {
  return <div className="cb-eff"><b>{props.c.keyValue || '—'}</b><small>{props.c.keyNote}</small></div>;
}

type Sel = { pat: string[]; prod: string[] };
export function CaseLibrary(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const all = api.data.cases;
  const [q, setQ] = React.useState('');
  const [ind, setInd] = React.useState('');
  const [sel, setSel] = React.useState<Sel>({ pat: [], prod: [] });
  const [sort, setSort] = React.useState('new');
  const [panel, setPanel] = React.useState(false);
  const [moreInd, setMoreInd] = React.useState(false);
  const wrapRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    if (!panel) { return undefined; }
    const close = (e: MouseEvent): void => { if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) { setPanel(false); } };
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') { setPanel(false); } };
    document.addEventListener('mousedown', close); document.addEventListener('keydown', key);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', key); };
  }, [panel]);

  const text = (c: ICase): string => [c.industry, c.client, c.dept, c.title, c.pattern, c.products.join(' '), c.keyEffect, c.summary, c.area,
    c.beforeText, c.afterText, c.before.join(' '), c.after.join(' '), c.solutions.map(s => s.name).join(' ')].join(' ');
  const rows = all.filter(c => (!ind || c.industry === ind)
    && (!sel.pat.length || sel.pat.indexOf(c.pattern) >= 0) && (!sel.prod.length || c.products.some(p => sel.prod.indexOf(p) >= 0))
    && (!q.trim() || contains(text(c), q.trim())))
    .sort(sort === 'ind' ? (a, b) => a.industry.localeCompare(b.industry, 'ko') : sort === 'cli' ? (a, b) => a.client.localeCompare(b.client, 'ko') : (a, b) => newestFirst(a.created, b.created));

  // 업종 칩: 사례가 많은 6개 먼저, 나머지는 더보기
  const cnt = (v: string): number => all.filter(c => c.industry === v).length;
  const known = CASE_INDUSTRIES.concat(all.map(c => c.industry).filter(v => !!v && CASE_INDUSTRIES.indexOf(v) < 0).filter((v, i, a) => a.indexOf(v) === i));
  const ord = known.map((v, i) => ({ v, n: cnt(v), i })).sort((a, b) => b.n - a.n || a.i - b.i);
  const top = ord.slice(0, IND_TOP).map(x => x.v);
  const rest = known.filter(v => top.indexOf(v) < 0);
  const opts = (f: (c: ICase) => string[]): [string, number][] => {
    const m: { [k: string]: number } = {};
    all.forEach(c => f(c).forEach(v => { if (v) { m[v] = (m[v] || 0) + 1; } }));
    return Object.keys(m).sort((a, b) => a.localeCompare(b, 'ko')).map(k => [k, m[k]] as [string, number]);
  };
  const toggle = (k: keyof Sel, v: string): void => setSel(s => ({ ...s, [k]: s[k].indexOf(v) >= 0 ? s[k].filter(x => x !== v) : s[k].concat([v]) }));
  const nF = sel.pat.length + sel.prod.length;
  const active = !!q || !!ind || nF > 0;
  const clearAll = (): void => { setQ(''); setInd(''); setSel({ pat: [], prod: [] }); };
  const chip = (v: string, label: string, more?: boolean): JSX.Element => (
    <button key={v || 'all'} type="button" className={'ca-chip' + (more ? ' ca-more' : '')} aria-pressed={ind === v} disabled={!!v && !cnt(v)} hidden={more && !moreInd && ind !== v}
      onClick={() => setInd(v)}>{label}<small>{v ? cnt(v) : all.length}</small></button>
  );

  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Case Library</span><h1>Case Library</h1><p>업종과 업무로 찾아보는 고객사 프로젝트 사례</p></div>
        <button type="button" className="btn" onClick={() => api.openCaseForm()}>＋ 사례 올리기</button></div>
      {api.data.casesError ? <ListError what="Case Library" message={api.data.casesError} /> : <div className="ca">
        <div className="ca-srow">
          <label className="cf-search">{SearchIcon}<span className="sr">사례 검색</span>
            <input type="search" id="hub-c-q" placeholder="업종, 조직, 업무 내용으로 검색 (예: 보고서, 상담, 재고)" autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
            {q ? <button type="button" className="cf-clear" aria-label="검색어 지우기" onClick={() => setQ('')}>✕</button> : null}</label>
          <div className="ca-fwrap" ref={wrapRef}>
            <button type="button" className={'ca-fbtn' + (nF ? ' on' : '')} aria-expanded={panel} aria-controls="hub-case-filters" onClick={() => setPanel(!panel)}>{FilterIcon}필터{nF ? <span className="cf-n">{nF}</span> : null}</button>
            <div className="ca-fpanel caseFilters" id="hub-case-filters" role="dialog" aria-label="필터" hidden={!panel}>
              {([['pat', 'Copilot 활용 방식', (c: ICase) => [c.pattern]], ['prod', '활용 제품', (c: ICase) => c.products]] as [keyof Sel, string, (c: ICase) => string[]][]).map(f => (
                <fieldset key={f[0]} className="ca-fg"><legend>{f[1]}</legend><div className="ca-fopts">
                  {opts(f[2]).map(([v, n]) => <label key={v} className="cb-ck"><input type="checkbox" checked={sel[f[0]].indexOf(v) >= 0} onChange={() => toggle(f[0], v)} /><span>{v}</span><small>{n}</small></label>)}
                </div></fieldset>
              ))}
              <div className="ca-ffoot"><button type="button" className="cf-reset" onClick={() => setSel({ pat: [], prod: [] })}>선택 지우기</button>
                <button type="button" className="btn pri sm" onClick={() => setPanel(false)}>사례 {rows.length}개 보기</button></div>
            </div>
          </div>
        </div>
        <div className="ca-chips" role="group" aria-label="업종">
          {chip('', '전체')}{top.map(v => chip(v, v))}{rest.map(v => chip(v, v, true))}
          {rest.length ? <button type="button" className="ca-moreb" aria-expanded={moreInd} onClick={() => setMoreInd(!moreInd)}>{moreInd ? '접기' : <>더보기 <small>+{rest.length}</small></>}</button> : null}
        </div>
        <div className="ca-bar">
          {active ? <button type="button" className="cf-reset" onClick={clearAll}>모두 지우기</button> : null}
          <span className="rcount" aria-live="polite"><b>사례 {rows.length}개</b>{rows.length !== all.length ? <> <span className="cb-tot">/ 전체 {all.length}개</span></> : null}</span>
          <label className="sortsel">정렬<select value={sort} onChange={e => setSort(e.target.value)}><option value="new">최신순</option><option value="ind">업종순</option><option value="cli">고객사순</option></select></label>
        </div>
        <div className="cb-tw"><div className="cb-tb ca-tb" role="table" aria-label="사례 목록">
          <div className="cb-row cb-head" role="row"><span role="columnheader">고객사</span><span role="columnheader">사례</span><span role="columnheader">Copilot 활용 방식</span><span role="columnheader">활용 제품</span><span role="columnheader">대표 효과</span></div>
          <div className="caseGrid">{rows.length ? rows.map(c => {
            const kinds = c.solutions.map(s => s.kind).filter((k, i, a) => a.indexOf(k) === i && (k === 'agent' || k === 'skill'));
            return (
              <Go key={c.id} go={api.go} view="case" id={c.id} className="cb-row">
                <span className="cb-c1" role="cell">{c.industry ? <span className="cc-dept ct-ind">{c.industry}</span> : null}<b>{c.client}</b><small>{c.dept}</small></span>
                <span className="cb-c2" role="cell"><b className="cb-ttl">{c.title}{c.pending ? ' (공개 검토 중)' : ''}{kinds.map(k => <React.Fragment key={k}> <span className={'cb-hash h-' + k}>#{KIND_LABEL[k]}</span></React.Fragment>)}</b>
                  {c.oneLine ? <span className="cb-chg">{c.oneLine}</span> : null}</span>
                <span className="cb-c3" role="cell">{c.pattern}</span>
                <span className="cb-c5" role="cell"><ProdCell list={c.products} /></span>
                <span className="cb-c4" role="cell"><Eff c={c} /></span>
              </Go>
            );
          }) : all.length ? <div className="cf-empty"><p>조건에 맞는 사례가 없어요.</p><button type="button" className="btn sm" onClick={clearAll}>조건 모두 지우기</button></div>
            : <div className="cf-empty"><p>아직 올라온 사례가 없어요. 첫 사례를 올려 주세요.</p><button type="button" className="btn sm pri" onClick={() => api.openCaseForm()}>＋ 사례 올리기</button></div>}</div>
        </div></div>
      </div>}
    </div>
  );
}

/* ---------- 사례 상세 ---------- */
function Pre(props: { api: IHubApi; label: string; text: string }): JSX.Element {
  return <div className="cd-pre"><div className="cd-preh"><span>{props.label}</span><button className="btn sm" type="button" onClick={() => props.api.copy(props.text, '본문을 복사했어요')}>복사</button></div><pre>{props.text}</pre></div>;
}
function SolCard(props: { api: IHubApi; s: ISolution }): JSX.Element {
  const { s } = props;
  return (
    <details className="cd-sol"><summary><span className={'cd-pill t-' + s.kind}>{KIND_LABEL[s.kind]}</span><b>{s.name}</b><span className="cd-chev" aria-hidden="true" /></summary>
      <div className="cd-solb">
        {s.kind === 'agent' ? <>
          {s.ins ? <><h4>지침</h4><Pre api={props.api} label="Instructions" text={s.ins} /></> : null}
          {s.tools && s.tools.length ? <><h4>도구</h4><ul className="cd-chips">{s.tools.map(v => <li key={v}>{v}</li>)}</ul></> : null}
          {s.data && s.data.length ? <><h4>사용 데이터</h4><ul className="cd-list">{s.data.map(v => <li key={v}>{v}</li>)}</ul></> : null}
        </> : s.kind === 'skill' ? <>
          {s.desc ? <><h4>설명</h4><p>{s.desc}</p></> : null}
          {s.body ? <><h4>본문</h4><Pre api={props.api} label={s.name} text={s.body} /></> : null}
        </> : <>
          {s.desc ? <><h4>설명</h4><p>{s.desc}</p></> : null}
          {s.parts && s.parts.length ? <><h4>화면 구성</h4><ul className="cd-list">{s.parts.map(v => <li key={v}>{v}</li>)}</ul></> : null}
        </>}
        {!(s.ins || s.desc || s.body || (s.tools && s.tools.length) || (s.parts && s.parts.length)) ? <p className="note">자세한 내용이 아직 없어요.</p> : null}
      </div>
    </details>
  );
}

export function CasePage(props: { api: IHubApi; item?: ICase }): JSX.Element {
  const { api } = props;
  const c = props.item;
  const [tab, setTab] = React.useState(0);
  React.useEffect(() => { setTab(0); }, [c ? c.id : 0]);
  if (!c) {
    return <div className="wrap"><Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Case Library', view: 'cases' }, { label: '사례' }]} />
      <Empty title="이 사례를 찾을 수 없어요." actions={<Go go={api.go} view="cases" className="btn">Case Library로</Go>}>삭제됐거나 아직 공개 전일 수 있어요.</Empty></div>;
  }
  // Use Case: 저장된 프롬프트, 없으면 예전 AI 단계 번호를 Use Case 1로
  const ucs = c.prompts.length ? c.prompts : (c.aiStep >= 0 && c.after[c.aiStep] ? [{ name: c.after[c.aiStep], step: c.aiStep, text: c.prompt }] : []);
  const ucAt = (i: number): number => { for (let k = 0; k < ucs.length; k++) { if (ucs[k].step === i) { return k; } } return -1; };
  const tabs: [string, number][] = [['개선 내용', 0]];
  if (c.solutions.length) { tabs.push(['솔루션', c.solutions.length]); }
  tabs.push(['프롬프트', ucs.length]);
  const cur = Math.min(tab, tabs.length - 1);
  const map = stepSpans(Math.max(1, c.before.length), c.after.length);
  const owner = c.author;
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') { return; }
    setTab((cur + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length);
  };
  return (
    <div className="wrap caseOut">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Case Library', view: 'cases' }, { label: c.title }]} />
      <div className="cd-head"><div className="cd-meta">{c.industry ? <span className="cc-dept ct-ind">{c.industry}</span> : null}<span>{c.client}</span><i>|</i><span>{c.dept}</span><i>|</i><span>{c.period}</span></div><h1>{c.title}</h1></div>
      <div className="cd-sum">
        <div className="cd-k"><small>대표 효과</small><b>{c.keyValue || '—'}</b><span>{c.keyNote}</span></div>
        {c.effects.map(f => <div key={f.label} className="cd-m"><small>{f.label}</small><span>{f.before} <i aria-label="에서">→</i> <b>{f.after}</b></span></div>)}
      </div>
      <div className="cd-grid"><div className="cd-main">
        <div className="cd-tabs" role="tablist" aria-label="사례 상세" onKeyDown={onKey}>
          {tabs.map(([l, n], i) => <button key={l} type="button" role="tab" id={`hub-cdt${i}`} aria-controls={`hub-cdp${i}`} aria-selected={i === cur} tabIndex={i === cur ? 0 : -1} onClick={() => setTab(i)}>{l}{i ? <> <span className="cnt">{n}</span></> : null}</button>)}
        </div>
        {tabs[cur][0] === '개선 내용' ? (
          <section className="cd-panel" role="tabpanel" id={`hub-cdp${cur}`} aria-labelledby={`hub-cdt${cur}`}>
            <h3 className="cd-h">업무 변화</h3>
            <div className="cd-chg"><div className="bf"><small>Before</small><p>{c.beforeText || c.before.join(', ') || '—'}</p></div>
              <span className="cd-arr" aria-hidden="true"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>
              <div className="af"><small>After</small><p>{c.afterText || c.after.join(', ') || '—'}</p></div></div>
            {c.before.length || c.after.length ? <>
              <h3 className="cd-h">업무 프로세스</h3>
              <div className="pf" style={vars({ '--n': Math.max(1, c.before.length) })}><span className="pf-l lb">Before</span><span className="pf-l la">After</span>
                {c.before.map((t, i) => <div key={'b' + i} className="pf-b" style={vars({ '--c': i + 2, '--e': i + 3 })}><i>{i + 1}</i>{t}</div>)}
                {c.after.map((t, i) => {
                  const [s, e] = map[i];
                  const u = ucAt(i);
                  const sp = e - s + 1;
                  return <React.Fragment key={'a' + i}>
                    <span className={'pf-k' + (sp > 1 ? '' : ' one')} hidden={sp <= 1} style={vars({ '--c': s + 2, '--e': e + 3 })} aria-hidden="true" />
                    <div className={'pf-a' + (u > -1 ? ' ai' : '')} style={vars({ '--c': s + 2, '--e': e + 3 })}><i>{i + 1}</i><span>{t}</span>
                      {u > -1 ? <em><span className="cd-ai">AI</span><span className="cd-uc">UC{u + 1}</span></em> : null}</div>
                  </React.Fragment>;
                })}
              </div>
            </> : null}
            {c.how || c.verify.length ? <details className="cs-more"><summary>어떻게 측정했나요</summary><p className="cd-how">{c.how || c.verify.join(', ')}</p></details> : null}
          </section>
        ) : tabs[cur][0] === '솔루션' ? (
          <section className="cd-panel" role="tabpanel" id={`hub-cdp${cur}`} aria-labelledby={`hub-cdt${cur}`}>{c.solutions.map((s, i) => <SolCard key={i} api={api} s={s} />)}</section>
        ) : (
          <section className="cd-panel" role="tabpanel" id={`hub-cdp${cur}`} aria-labelledby={`hub-cdt${cur}`}>
            {ucs.length ? <>
              <p className="cs-sub">{c.products.indexOf('Copilot Cowork') >= 0 ? 'Copilot Cowork' : 'Copilot Chat'}에 붙여 넣어 바로 쓸 수 있어요.</p>
              {ucs.map((u, k) => (
                <div key={k} className="cd-card"><div className="cd-uch"><span className="cd-ucn">USE CASE {k + 1}</span><b>{u.name || (u.step >= 0 && c.after[u.step]) || `Use Case ${k + 1}`}</b></div>
                  <div className="cd-prm"><p>“{u.text}”</p><button className="btn sm" type="button" onClick={() => api.copy(u.text, '복사했어요')}>복사</button></div></div>
              ))}
            </> : <p className="note">아직 올린 프롬프트가 없어요.</p>}
          </section>
        )}
      </div>
        <aside className="dp-side cd-info"><div className="box">
          <h3>프로젝트</h3><table className="kv"><tbody>
            <tr><th>프로젝트명</th><td>{c.summary || '—'}</td></tr>
            <tr><th>업무 영역</th><td>{c.area || '—'}</td></tr>
            {c.points.length ? <tr><th>적용 포인트</th><td>{c.points.map((p, i) => <React.Fragment key={i}>{i ? <br /> : null}{p}</React.Fragment>)}</td></tr> : null}
          </tbody></table>
          <h3>AI 활용</h3><table className="kv"><tbody>
            <tr><th>활용 방식</th><td>{c.pattern || '—'}</td></tr>
            <tr><th>활용 제품</th><td>{c.products.length ? c.products.map((p, i) => <React.Fragment key={p}>{i ? <br /> : null}{p}</React.Fragment>) : '—'}</td></tr>
            <tr><th>솔루션</th><td>{c.solutions.length ? c.solutions.map((s, i) => <React.Fragment key={i}>{i ? <br /> : null}{s.name}</React.Fragment>) : '별도 산출물 없음'}</td></tr>
            <tr><th>문의</th><td>{c.contact || (owner ? owner.name : '—')}</td></tr>
          </tbody></table>
          <button type="button" className="btn sm askbtn tipx" data-tip="문의 담당자에게 Teams 채팅을 열어요"
            onClick={() => { if (owner && isEmail(owner.email)) { window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(owner.email)}`, '_blank', 'noopener'); } else { api.toast('연락할 사람의 메일 주소가 없어요.'); } }}>Teams로 묻기</button>
        </div></aside>
      </div>
    </div>
  );
}
