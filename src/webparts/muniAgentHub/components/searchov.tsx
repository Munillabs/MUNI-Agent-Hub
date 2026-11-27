/* Hub 검색 (MUNIVERSE 시안)
   - 상단 '검색'(c11/sx): 흐린 화면 위로 열리고, 결과도 그 안에서 보여요. 닫으면 보던 화면 그대로.
   - 홈·Marketplace 검색창(c74): 검색하면 검색창 바로 아래에 결과 목록이 나와요.
   최근 검색어는 이 브라우저에만 저장합니다. */
import * as React from 'react';
import { HubView } from '../models/types';
import { contains } from '../models/rules';
import { IHubApi } from './api';
import { Mag } from './mv';

const WORDS = ['회의록', '번역', '상담', '재고', '규정'];
const RECENT = 'hubRecent';
interface IRow { key: string; view: HubView; id: number; title: string; sub: string; /** 사례 상세의 솔루션 번호 */ sol?: number }
interface IGroup { k: string; rows: IRow[] }
type Scope = 'all' | 'market';

function getRecent(): string[] { try { const v = JSON.parse(window.localStorage.getItem(RECENT) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
function saveRecent(q: string): void {
  q = q.trim(); if (!q) { return; }
  try { window.localStorage.setItem(RECENT, JSON.stringify([q].concat(getRecent().filter(x => x !== q)).slice(0, 5))); } catch (e) { /* 저장 못 해도 동작 */ }
}
function Mark(props: { t: string; q: string }): JSX.Element {
  const x = String(props.t || '');
  const i = x.toLowerCase().indexOf(props.q.toLowerCase());
  if (i < 0 || !props.q) { return <>{x}</>; }
  return <>{x.slice(0, i)}<mark>{x.slice(i, i + props.q.length)}</mark>{x.slice(i + props.q.length)}</>;
}

/** 검색어에 맞는 것: Agent · Skill · HTML (+ 전체 검색이면 아이디어 · 사례) */
function groupsOf(api: IHubApi, qq: string, scope: Scope): IGroup[] {
  if (!qq) { return []; }
  const d = api.data;
  return ([
    { k: 'Agent', rows: d.agents.filter(a => contains(a.title, qq) || contains(a.summary, qq)).map(a => ({ key: 'a' + a.id, view: 'agent' as HubView, id: a.id, title: a.title, sub: `${a.summary}${a.tool ? ' · ' + a.tool : ''}` })) },
    { k: 'Skill', rows: d.skills.filter(s => contains(s.title, qq) || contains(s.summary, qq)).map(s => ({ key: 's' + s.id, view: 'skill' as HubView, id: s.id, title: s.title, sub: s.summary })) },
    { k: 'HTML', rows: d.htmls.filter(h => contains(h.title, qq) || contains(h.summary, qq)).map(h => ({ key: 'h' + h.id, view: 'htool' as HubView, id: h.id, title: h.title, sub: h.summary })) },
    { k: '아이디어', rows: d.ideas.filter(i => contains(i.title, qq)).map(i => ({ key: 'i' + i.id, view: 'idea' as HubView, id: i.id, title: i.title, sub: `${i.author ? i.author.name : ''} · 공감 ${api.likeCount('Idea', i.id)}` })) },
    // Case Library는 솔루션 단위로 찾습니다
    { k: '사례', rows: d.cases.filter(c => !c.pending).reduce((out, c) => out.concat(c.solutions.map((s, k) => ({ c, s, k }))), [] as { c: typeof d.cases[0]; s: typeof d.cases[0]['solutions'][0]; k: number }[])
      .filter(o => contains(o.s.name + ' ' + (o.s.does || '') + ' ' + (o.s.use || ''), qq) || contains(o.c.industry + ' ' + o.c.client + ' ' + o.c.title, qq))
      .map(o => ({ key: 'c' + o.c.id + ':' + o.k, view: 'case' as HubView, id: o.c.id, sol: o.k || undefined, title: o.s.name, sub: `${o.c.industry} · ${o.c.client}${o.s.does ? ' · ' + o.s.does : ''}` })) }
  ] as IGroup[]).filter(g => g.rows.length && (scope === 'all' || ['Agent', 'Skill', 'HTML'].indexOf(g.k) >= 0));
}

/** 결과 목록 (검색 창 안과 검색창 아래가 함께 씀) */
function Results(props: { api: IHubApi; q: string; scope: Scope; f: string; setF: (f: string) => void; onWord: (w: string) => void; onOpen: (r: IRow) => void; onIdea: () => void; close?: React.ReactNode }): JSX.Element {
  const qq = props.q.trim();
  const groups = groupsOf(props.api, qq, props.scope);
  const total = groups.reduce((a, g) => a + g.rows.length, 0);
  const sxf = props.f !== 'all' && !groups.some(g => g.k === props.f) ? 'all' : props.f;
  if (!total) {
    return (
      <div className="sx-empty"><b>&lsquo;{qq}&rsquo;에 맞는 결과가 없어요</b><p>더 짧은 단어로 찾아보세요. 찾는 것이 없다면 Idea Board에 올려 만들어 줄 사람을 찾을 수 있어요.</p>
        <div className="sx-sug">{WORDS.map(w => <button key={w} type="button" onClick={() => props.onWord(w)}>{w}</button>)}</div>
        <a className="sx-idea" href="#ideas" onClick={e => { e.preventDefault(); props.onIdea(); }}>Idea Board에 올리기<span aria-hidden="true"> →</span></a>{props.close}</div>
    );
  }
  return <>
    <div className="sx-top"><p aria-live="polite">검색 결과 <b>{total}</b>개</p>
      <div className="sx-fs" role="group" aria-label="결과 종류">
        {[{ k: 'all', n: '전체', c: total }].concat(groups.map(g => ({ k: g.k, n: g.k, c: g.rows.length }))).map(x => (
          <button key={x.k} type="button" aria-pressed={sxf === x.k} onClick={() => props.setF(x.k)}>{x.n}<small>{x.c}</small></button>
        ))}
      </div>{props.close}</div>
    {groups.filter(g => sxf === 'all' || g.k === sxf).map(g => (
      <section key={g.k} className="sx-g" aria-label={g.k}><h3>{g.k}<span>{g.rows.length}</span></h3>
        {(sxf === 'all' ? g.rows.slice(0, 4) : g.rows).map(r => (
          <a key={r.key} className="sx-row" href={'#' + r.view + '-' + r.id} onClick={e => { e.preventDefault(); props.onOpen(r); }}>
            <span className="sx-t"><b><Mark t={r.title} q={qq} /></b><span><Mark t={r.sub} q={qq} /></span></span><span className="sx-ty">{g.k}</span></a>
        ))}
        {sxf === 'all' && g.rows.length > 4 ? <button type="button" className="sx-more" onClick={() => props.setF(g.k)}>{g.k} {g.rows.length}개 모두 보기<span aria-hidden="true"> →</span></button> : null}
      </section>
    ))}
  </>;
}

/** 홈·Marketplace 검색창 (시안 c74): 검색하면 바로 아래에 결과 목록. 목록이 열려 있으면 입력할 때마다 바뀌어요 */
export function InlineSearch(props: { api: IHubApi; scope: Scope; formId: string; className: string; label: string; placeholder: string; labelClass?: string; title?: string;
  inputRef?: React.RefObject<HTMLInputElement>; labelRef?: React.RefObject<HTMLLabelElement>; center?: boolean }): JSX.Element {
  const { api } = props;
  const [text, setText] = React.useState('');
  const [q, setQ] = React.useState('');
  const [f, setF] = React.useState('all');
  const own = React.useRef<HTMLInputElement>(null);
  const inp = props.inputRef || own;
  const resId = props.formId + 'Res';
  const titleId = props.formId + '-l';
  const close = (): void => { setQ(''); if (inp.current) { inp.current.focus(); } };
  return (
    <>
      {props.title ? <p className="c25-sl" id={titleId}>{props.title}</p> : null}
      <form className={props.className} role="search" id={props.formId} aria-labelledby={props.title ? titleId : undefined}
        onSubmit={e => { e.preventDefault(); const t = text.trim(); if (!t) { if (inp.current) { inp.current.focus(); } return; } saveRecent(t); setF('all'); setQ(t); }}>
        <label className={'b4-f' + (props.labelClass ? ' ' + props.labelClass : '')} ref={props.labelRef}><span className="sr">{props.label}</span>
          <input ref={inp} type="search" name="q" placeholder={props.placeholder} aria-controls={resId} value={text}
            onChange={e => { setText(e.target.value); if (q) { setQ(e.target.value.trim()); setF('all'); } }}
            onKeyDown={e => { if (e.key === 'Escape' && q) { e.preventDefault(); setQ(''); } }} />
          <button className="b4-btn b6-sbtn" aria-label="검색"><Mag /></button></label>
      </form>
      <div className="sx-res c74-res" id={resId} hidden={!q}>
        {q ? <Results api={api} q={q} scope={props.scope} f={f} setF={setF}
          onWord={w => { setText(w); setQ(w); setF('all'); saveRecent(w); }}
          onOpen={r => { saveRecent(q); api.go(r.view, r.id, r.sol); }}
          onIdea={() => { saveRecent(q); api.go('ideas'); }}
          close={<button type="button" className="c74-x" onClick={close}>결과 닫기</button>} /> : null}
      </div>
    </>
  );
}

export function SearchOverlay(props: { api: IHubApi; open: boolean; scope: Scope; initial: string; onClose: () => void }): JSX.Element {
  const { api } = props;
  const [q, setQ] = React.useState('');
  const [f, setF] = React.useState('all');
  const [recent, setRecent] = React.useState<string[]>(getRecent);
  const inp = React.useRef<HTMLInputElement>(null);
  const box = React.useRef<HTMLDivElement>(null);
  const last = React.useRef<Element | null>(null);
  React.useEffect(() => {
    if (props.open) {
      last.current = document.activeElement;
      setQ(props.initial || ''); setF('all'); setRecent(getRecent());
      if (props.initial) { saveRecent(props.initial); }
      const t = window.setTimeout(() => { if (inp.current) { inp.current.focus(); } }, 40);
      return () => window.clearTimeout(t);
    }
    const l = last.current as HTMLElement | null;
    if (l && l.focus && document.contains(l)) { l.focus(); }
    return undefined;
  }, [props.open]); // eslint-disable-line react-hooks/exhaustive-deps

  const qq = q.trim();
  const pick = (w: string): void => { setQ(w); setF('all'); saveRecent(w); setRecent(getRecent()); if (inp.current) { inp.current.focus(); } };
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); props.onClose(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      const L = box.current ? Array.prototype.slice.call(box.current.querySelectorAll('.sx-row')) as HTMLElement[] : [];
      if (!L.length) { return; }
      const i = L.indexOf(document.activeElement as HTMLElement);
      e.preventDefault();
      if (e.key === 'ArrowDown') { (L[i + 1] || L[0]).focus(); } else if (i <= 0) { if (inp.current) { inp.current.focus(); } } else { L[i - 1].focus(); }
      return;
    }
    if (e.key === 'Tab' && box.current) {
      const F = (Array.prototype.slice.call(box.current.querySelectorAll('input,button:not([hidden]),a[href]')) as HTMLElement[]).filter(x => x.offsetParent !== null);
      if (!F.length) { return; }
      const a = document.activeElement;
      if (e.shiftKey && a === F[0]) { e.preventDefault(); F[F.length - 1].focus(); } else if (!e.shiftKey && a === F[F.length - 1]) { e.preventDefault(); F[0].focus(); }
    }
  };
  const ph = props.scope === 'market' ? '찾고 싶은 Agent, Skill, HTML을 한 번에 검색해 보세요.' : 'Agent, Skill, HTML, 아이디어, 사례를 한 번에 검색해 보세요.';
  return (
    <div className={'c11-sov' + (props.open ? ' on' : '')} role="dialog" aria-modal="true" aria-label={props.scope === 'market' ? 'Marketplace 검색' : 'Hub 검색'} aria-hidden={!props.open}
      onClick={e => { if (e.target === e.currentTarget) { props.onClose(); } }} onKeyDown={onKey}>
      {props.open ? (
        <div className="c11-sbox" ref={box}>
          <p className="sx-foot"><button type="button" className="c11-x" onClick={props.onClose}>닫기</button></p>
          <form className="c11-sf" role="search" onSubmit={e => { e.preventDefault(); if (!qq) { if (inp.current) { inp.current.focus(); } return; } saveRecent(qq); const r = box.current && box.current.querySelector('.sx-row') as HTMLElement; if (r) { r.focus(); } }}>
            <svg className="c11-ic" viewBox="0 0 16 16" width="18" height="18" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="M10.5 10.5L14 14" /></svg>
            <label className="sr" htmlFor="mv-c11Q">{props.scope === 'market' ? 'Marketplace 검색' : 'Hub 검색'}</label>
            <input id="mv-c11Q" ref={inp} type="text" enterKeyHint="search" name="q" autoComplete="off" placeholder={ph} aria-controls="mv-sxRes" value={q} onChange={e => { setQ(e.target.value); setF('all'); }} />
            <button type="button" className="sx-clr" aria-label="검색어 지우기" hidden={!q} onClick={() => { setQ(''); if (inp.current) { inp.current.focus(); } }}>✕</button>
            <button type="submit" aria-label="검색"><Mag size={18} /></button>
          </form>
          <div className="c11-hint" hidden={!!qq}>
            {recent.length ? <><b>최근 검색</b>{recent.slice(0, 5).map(w => <button key={w} type="button" onClick={() => pick(w)}>{w}</button>)}
              <button type="button" className="sx-rm" onClick={() => { try { window.localStorage.removeItem(RECENT); } catch (e) { /* 무시 */ } setRecent([]); if (inp.current) { inp.current.focus(); } }}>기록 지우기</button></>
              : <><b>이런 단어로 찾아보세요</b>{WORDS.map(w => <button key={w} type="button" onClick={() => pick(w)}>{w}</button>)}</>}
          </div>
          <div className="sx-res" id="mv-sxRes" hidden={!qq}>
            {qq ? <Results api={api} q={q} scope={props.scope} f={f} setF={setF} onWord={pick}
              onOpen={r => { saveRecent(q); props.onClose(); api.go(r.view, r.id, r.sol); }}
              onIdea={() => { saveRecent(q); props.onClose(); api.go('ideas'); }} /> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
