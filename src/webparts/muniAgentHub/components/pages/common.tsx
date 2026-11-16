/* 여러 화면이 함께 쓰는 것 (시안 마크업): 필터 사이드바, 적용된 필터, 검색창, Marketplace 종류 탭, 인기 계산, 새로 올라온 것 */
import * as React from 'react';
import { HubView, IHubData, TargetType } from '../../models/types';
import { daysSince, newestFirst } from '../../models/rules';
import { IHubApi } from '../api';
import { IconAgent, IconHtml, IconSkill } from '../ui';

/* ---------- 필터 사이드바 (시안 .filters.drill) ---------- */
export interface IFilterGroup { k: string; label: string; items: string[]; single?: boolean; open?: boolean }
export type FilterState = { [k: string]: string[] };

export function Filters(props: { groups: IFilterGroup[]; value: FilterState; onChange: (v: FilterState) => void; note?: React.ReactNode; idBase: string; label: string }): JSX.Element {
  const set = (k: string, v: string[]): void => { const n = { ...props.value }; n[k] = v; props.onChange(n); };
  return (
    <aside className="filters drill" aria-label={props.label}>
      <div className="fhead"><b>필터</b><button type="button" className="freset" onClick={() => props.onChange({})}>모두 지우기</button></div>
      {props.groups.map(g => {
        const cur = props.value[g.k] || [];
        const n = g.single ? (cur[0] && cur[0] !== '전체' ? 1 : 0) : cur.length;
        return (
          <details key={g.k} className="fd" open={g.open}>
            <summary><span>{g.label}</span>{n ? <em className="fdn">{n}</em> : null}<i className="chev" aria-hidden="true" /></summary>
            <fieldset><legend className="sr">{g.label}</legend>
              {(g.single ? ['전체'].concat(g.items) : g.items).map((x, i) => (
                <label key={x}>
                  {g.single
                    ? <input type="radio" name={`${props.idBase}-${g.k}`} id={`${props.idBase}-${g.k}-${i}`} checked={(cur[0] || '전체') === x} onChange={() => set(g.k, [x])} />
                    : <input type="checkbox" id={`${props.idBase}-${g.k}-${i}`} checked={cur.indexOf(x) >= 0} onChange={() => set(g.k, cur.indexOf(x) >= 0 ? cur.filter(y => y !== x) : cur.concat([x]))} />}
                  {' '}{x}
                </label>
              ))}
            </fieldset>
          </details>
        );
      })}
      {props.note ? <p className="note">{props.note}</p> : null}
    </aside>
  );
}
/** 체크된 값 중 하나라도 맞으면 통과 (아무것도 안 골랐으면 통과) */
export function anyOf(sel: string[] | undefined, values: string[]): boolean {
  if (!sel || !sel.length || (sel.length === 1 && sel[0] === '전체')) { return true; }
  return sel.some(s => values.indexOf(s) >= 0);
}
/** 적용된 필터 (시안 .applied: 누르면 빠짐) */
export function Applied(props: { groups: IFilterGroup[]; value: FilterState; onChange: (v: FilterState) => void }): JSX.Element {
  const chips: { k: string; x: string }[] = [];
  props.groups.forEach(g => (props.value[g.k] || []).forEach(x => { if (x !== '전체') { chips.push({ k: g.k, x }); } }));
  return (
    <div className="applied" aria-label="적용된 필터">
      {chips.map(c => (
        <button key={c.k + c.x} type="button" aria-label={`${c.x} 필터 빼기`} onClick={() => { const n = { ...props.value }; n[c.k] = (n[c.k] || []).filter(y => y !== c.x); props.onChange(n); }}>{c.x}</button>
      ))}
      {chips.length ? <button type="button" className="clr" onClick={() => props.onChange({})}>모두 지우기</button> : null}
    </div>
  );
}

/* ---------- 검색창 ---------- */
/** Home·Marketplace 의 큰 검색창 (시안 form.search) */
export function BigSearch(props: { id: string; placeholder: string; label: string; className?: string; onSearch: (q: string) => void }): JSX.Element {
  const [q, setQ] = React.useState('');
  return (
    <form className={'search' + (props.className ? ' ' + props.className : '')} role="search" onSubmit={e => { e.preventDefault(); props.onSearch(q.trim()); }}>
      <label><span className="sr">{props.label}</span><input id={props.id} type="search" value={q} placeholder={props.placeholder} onChange={e => setQ(e.target.value)} /></label>
      <button className="btn pri" type="submit">검색</button>
    </form>
  );
}
/** 목록 화면 위의 둥근 검색 칸 (시안 인라인 스타일 그대로) */
export function ListSearch(props: { id: string; label: string; placeholder: string; value: string; onChange: (q: string) => void }): JSX.Element {
  return (
    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 18, flexWrap: 'wrap' }}>
      <label style={{ flex: 1, minWidth: 220, height: 50, border: '2px solid var(--ink)', borderRadius: 999, display: 'flex', alignItems: 'center', padding: '0 18px' }}>
        <span className="sr">{props.label}</span>
        <input type="search" id={props.id} placeholder={props.placeholder} value={props.value} onChange={e => props.onChange(e.target.value)} style={{ flex: 1, minWidth: 0, border: 0, outline: 0, background: 'none' }} />
      </label>
    </div>
  );
}

/* ---------- Marketplace 종류 탭 ---------- */
export function CatTabs(props: { api: IHubApi; cur: 'agents' | 'skills' | 'htools' }): JSX.Element {
  const { api } = props;
  const tabs: { v: 'agents' | 'skills' | 'htools'; label: string; n: number; icon: JSX.Element }[] = [
    { v: 'agents', label: 'Agent', n: api.data.agents.length, icon: <IconAgent /> },
    { v: 'skills', label: 'Skill', n: api.data.skills.length, icon: <IconSkill /> },
    { v: 'htools', label: 'HTML', n: api.data.htmls.length, icon: <IconHtml /> }
  ];
  return (
    <nav className="cattabs" aria-label="Marketplace 종류">
      {tabs.map(t => (
        <a key={t.v} href={'#' + t.v} aria-current={props.cur === t.v ? 'page' : undefined} onClick={e => { e.preventDefault(); api.go(t.v); }}>{t.icon}{t.label} <span>{t.n}</span></a>
      ))}
    </nav>
  );
}

/* ---------- 인기 (별점 평가 수 + 최근 30일 리뷰 글, 같으면 평점)
   별점은 SharePoint가 날짜를 남기지 않아 기간 없이 셉니다. ---------- */
export function heat(api: IHubApi, t: TargetType, id: number): number {
  return api.data.reactions.filter(r => r.targetType === t && r.targetId === id && r.kind === '리뷰'
    && (!!r.rating || (!!r.created && daysSince(r.created, api.now) <= 30))).length;
}
export interface IHot { kind: 'Agent' | 'Skill' | 'HTML'; view: HubView; id: number; title: string; heat: number; avg: number; n: number }
export function hotList(api: IHubApi, top: number): IHot[] {
  const list: IHot[] = [];
  const push = (kind: 'Agent' | 'Skill' | 'HTML', t: TargetType, view: HubView, id: number, title: string): void => {
    const r = api.rating(t, id);
    list.push({ kind, view, id, title, heat: heat(api, t, id), avg: r.avg, n: r.n });
  };
  api.data.agents.forEach(a => push('Agent', 'Agent', 'agent', a.id, a.title));
  api.data.skills.forEach(s => push('Skill', 'Skill', 'skill', s.id, s.title));
  api.data.htmls.forEach(h => push('HTML', 'Html', 'htool', h.id, h.title));
  return list.sort((a, b) => b.heat - a.heat || b.avg - a.avg || b.n - a.n).slice(0, top);
}

/* ---------- 새로 올라온 것 ---------- */
export interface IFeedItem { kind: 'Agent' | 'Skill' | 'HTML' | '아이디어' | '사례'; title: string; date: string; who: string; view: HubView; id: number }
export function feed(data: IHubData, kinds: string[], top: number): IFeedItem[] {
  const out: IFeedItem[] = [];
  const has = (k: string): boolean => kinds.indexOf(k) >= 0;
  if (has('Agent')) { data.agents.forEach(a => out.push({ kind: 'Agent', title: a.title, date: a.created, who: a.owner ? a.owner.name : '', view: 'agent', id: a.id })); }
  if (has('Skill')) { data.skills.forEach(s => out.push({ kind: 'Skill', title: s.title, date: s.created, who: s.author ? s.author.name : '', view: 'skill', id: s.id })); }
  if (has('HTML')) { data.htmls.forEach(h => out.push({ kind: 'HTML', title: h.title, date: h.created, who: h.author ? h.author.name : '', view: 'htool', id: h.id })); }
  if (has('아이디어')) { data.ideas.forEach(i => out.push({ kind: '아이디어', title: i.title, date: i.created, who: i.author ? i.author.name : '', view: 'idea', id: i.id })); }
  if (has('사례')) { data.cases.filter(c => !c.pending).forEach(c => out.push({ kind: '사례', title: c.title, date: c.created, who: c.author ? c.author.name : '', view: 'case', id: c.id })); }
  return out.sort((a, b) => newestFirst(a.date, b.date)).slice(0, top);
}
