/* Hub 전체 검색 (시안 그대로): Agent · Skill · HTML · 아이디어 · 사례 */
import * as React from 'react';
import { HubView } from '../../models/types';
import { contains } from '../../models/rules';
import { IHubApi } from '../api';
import { Crumb, Go, Highlight } from '../ui';

const WORDS = ['회의록', '번역', '상담', '재고', '규정'];
interface IHit { key: string; view: HubView; id: number; title: string; sub: string; mono?: string }

export function SearchView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [input, setInput] = React.useState(api.searchQuery);
  React.useEffect(() => { setInput(api.searchQuery); }, [api.searchQuery]);
  const q = api.searchQuery.trim();
  const d = api.data;
  const groups: { k: string; to: HubView; toLabel: string; hits: IHit[] }[] = q ? [
    { k: 'Agent', to: 'agents', toLabel: 'Marketplace', hits: d.agents.filter(a => contains(a.title, q) || contains(a.summary, q)).map(a => ({ key: 'a' + a.id, view: 'agent' as HubView, id: a.id, title: a.title, sub: `${a.summary}${a.tool ? ' · ' + a.tool : ''}`, mono: a.title.trim().charAt(0) })) },
    { k: '아이디어', to: 'ideas', toLabel: 'Idea Board', hits: d.ideas.filter(i => contains(i.title, q)).map(i => ({ key: 'i' + i.id, view: 'idea' as HubView, id: i.id, title: i.title, sub: `${i.author ? i.author.name : ''} · 공감 ${api.likeCount('Idea', i.id)}` })) },
    { k: 'Skill', to: 'skills', toLabel: 'Marketplace', hits: d.skills.filter(s => contains(s.title, q) || contains(s.summary, q)).map(s => ({ key: 's' + s.id, view: 'skill' as HubView, id: s.id, title: s.title, sub: s.summary, mono: 'S' })) },
    { k: 'HTML', to: 'htools', toLabel: 'Marketplace', hits: d.htmls.filter(h => contains(h.title, q) || contains(h.summary, q)).map(h => ({ key: 'h' + h.id, view: 'htool' as HubView, id: h.id, title: h.title, sub: h.summary, mono: 'H' })) },
    { k: '사례', to: 'cases', toLabel: 'Case Library', hits: d.cases.filter(c => contains(c.title, q) || contains(c.pain, q) || contains(c.industry + ' · ' + c.client, q)).map(c => ({ key: 'c' + c.id, view: 'case' as HubView, id: c.id, title: c.title, sub: `${c.industry} · ${c.client} · ${c.pain}` })) }
  ] : [];
  const total = groups.reduce((a, g) => a + g.hits.length, 0);
  const jump = (k: string): void => { const el = document.getElementById('hub-sg-' + k); if (el) { el.scrollIntoView({ behavior: 'smooth' }); } };
  const words = (center?: boolean): JSX.Element => <div className="sjump" style={center ? { justifyContent: 'center' } : undefined}>{WORDS.map(w => <a key={w} href="#search" onClick={e => { e.preventDefault(); api.search(w); }}>{w}</a>)}</div>;
  return (
    <div className="wrap">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: '검색' }]} />
      <h1 className="sr">Hub 검색</h1>
      <form className="sbar" role="search" onSubmit={e => { e.preventDefault(); api.search(input.trim()); }}>
        <label className="sr" htmlFor="hub-s-in">Hub 전체 검색</label>
        <input id="hub-s-in" type="search" placeholder="Agent, Skill, 아이디어, 사례를 한 번에 찾아요" autoComplete="off" value={input} onChange={e => setInput(e.target.value)} />
        <button className="btn pri" type="submit">검색</button>
      </form>
      <div>
        {!q ? <><p style={{ color: 'var(--ink2)' }}>찾고 싶은 일을 적어 보세요. 예를 들어</p>{words()}</>
          : !total ? (
            <div className="empty"><b style={{ fontSize: 20 }}>'{q}'에 맞는 결과가 없어요</b><span>더 짧은 단어로 찾거나, 아래 단어로 바꿔 보세요. 원하는 Agent가 없다면 아이디어로 제안할 수 있어요.</span>
              {words(true)}<Go go={api.go} view="ideas" className="btn pri" style={{ marginTop: 12 }}>Idea Board에 제안하기</Go></div>
          ) : (
            <>
              <p style={{ margin: '6px 0 0', color: 'var(--ink2)' }} aria-live="polite">'{q}' 검색 결과 {total}개</p>
              <nav className="sjump" aria-label="결과 종류로 이동">{groups.filter(g => g.hits.length).map(g => <a key={g.k} href={'#sg-' + g.k} onClick={e => { e.preventDefault(); jump(g.k); }}>{g.k} <b>{g.hits.length}</b></a>)}</nav>
              {groups.filter(g => g.hits.length).map(g => (
                <section key={g.k} className="sgroup" id={'hub-sg-' + g.k}>
                  <div className="sec-h"><h2>{g.k} <span className="pill">{g.hits.length}</span></h2><Go go={api.go} view={g.to}>{g.toLabel}에서 보기 →</Go></div>
                  {g.hits.slice(0, 4).map(h => (
                    <Go key={h.key} go={api.go} view={h.view} id={h.id} className="srow">
                      {h.mono ? <span className="mono">{h.mono}</span> : null}
                      <span className="t"><b><Highlight text={h.title} q={q} /></b><span><Highlight text={h.sub} q={q} /></span></span>
                      <span className="pill">{g.k}</span>
                    </Go>
                  ))}
                </section>
              ))}
            </>
          )}
      </div>
    </div>
  );
}
