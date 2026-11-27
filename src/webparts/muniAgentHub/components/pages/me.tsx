/* 나의 작업공간 (시안 그대로): 확인할 일, 나의 콘텐츠(종류별 수 · 탭 · 검색 · 정렬 · 10개씩 쪽 넘김 · 수정 · 삭제)
   받은 배지는 머리글의 프로필 패널에 있습니다. */
import * as React from 'react';
import { notices } from '../../models/activity';
import { HubView } from '../../models/types';
import { contains, mmdd } from '../../models/rules';
import { IHubApi } from '../api';
import { Crumb, Go } from '../ui';
import { Mag } from '../mv';

function relDay(iso: string, now: Date): string {
  const d = new Date(iso);
  const days = Math.floor((new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() - new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()) / 86400000);
  return days <= 0 ? '오늘' : days === 1 ? '어제' : mmdd(iso);
}
const I = (d: React.ReactNode): JSX.Element => <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{d}</svg>;
const ICON: { [k: string]: JSX.Element } = {
  n: I(<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10 21h4" />),
  a: I(<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13v1M15 13v1M10 17h4" /></>),
  s: I(<path d="M10 4a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H5V7a1 1 0 0 1 1-1h4z" />),
  h: I(<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2" /></>),
  c: I(<><path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2z" /><path d="M4 21V5M8 7h6" /></>),
  i: I(<><path d="M5 4h14v11l-5 5H5z" /><path d="M14 20v-5h5" /></>)
};
type K = 'a' | 's' | 'h' | 'c' | 'i';
const KL: { [k: string]: string } = { a: 'Agent', s: 'Skill', h: 'HTML', c: '고객 사례', i: '아이디어' };
interface IRow { k: K; id: number; title: string; date: string; view: HubView }
const PER = 10;

export function MyWorkspace(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const d = api.data;
  const me = api.me;
  const todo = notices(d, me, api.now).filter(n => !!n.btn).slice(0, 5);
  const [tab, setTab] = React.useState<'all' | K>('all');
  const [q, setQ] = React.useState('');
  const [sort, setSort] = React.useState('new');
  const [pg, setPg] = React.useState(1);
  const [del, setDel] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [add, setAdd] = React.useState(false);
  const isMe = (p?: { id: number }): boolean => !!p && p.id === me.id;
  const all: IRow[] = ([] as IRow[]).concat(
    d.agents.filter(a => isMe(a.owner)).map(a => ({ k: 'a' as K, id: a.id, title: a.title, date: a.created, view: 'agent' as HubView })),
    d.skills.filter(s => isMe(s.author)).map(s => ({ k: 's' as K, id: s.id, title: s.title, date: s.created, view: 'skill' as HubView })),
    d.htmls.filter(h => isMe(h.author)).map(h => ({ k: 'h' as K, id: h.id, title: h.title, date: h.created, view: 'htool' as HubView })),
    d.cases.filter(c => isMe(c.author)).map(c => ({ k: 'c' as K, id: c.id, title: c.title, date: c.created, view: 'case' as HubView })),
    d.ideas.filter(i => isMe(i.author)).map(i => ({ k: 'i' as K, id: i.id, title: i.title, date: i.created, view: 'idea' as HubView })));
  const cnt = (k: 'all' | K): number => all.filter(r => k === 'all' || r.k === k).length;
  const list = all.filter(r => (tab === 'all' || r.k === tab) && (!q.trim() || contains(r.title, q.trim())))
    .sort((x, y) => sort === 'name' ? x.title.localeCompare(y.title, 'ko') : sort === 'old' ? x.date.localeCompare(y.date) : y.date.localeCompare(x.date));
  const pages = Math.max(1, Math.ceil(list.length / PER));
  const page = Math.min(pg, pages);
  const shown = list.slice((page - 1) * PER, page * PER);
  const choose = (k: 'all' | K): void => { setTab(k); setPg(1); setDel(''); };
  const edit = (r: IRow): void => {
    if (r.k === 'a') { api.openAgentForm(r.id); } else if (r.k === 's') { api.openSkillForm(r.id); } else if (r.k === 'h') { api.openHtmlForm(r.id); } else if (r.k === 'c') { api.openCaseForm(r.id); } else if (r.k === 'i') { api.openIdeaForm(r.id); }
  };
  const remove = async (r: IRow): Promise<void> => {
    setBusy(true);
    const ok = r.k === 'a' ? await api.deleteAgent(r.id) : r.k === 's' ? await api.deleteSkill(r.id) : r.k === 'h' ? await api.deleteHtml(r.id) : r.k === 'c' ? await api.deleteCase(r.id) : await api.deleteIdea(r.id);
    setBusy(false);
    setDel('');
    // 삭제 후 목록 화면으로 넘어가는 동작이 있어 작업공간으로 돌아옵니다
    if (ok && (r.k === 'a' || r.k === 's' || r.k === 'h')) { api.go('me'); }
  };
  const emptyMsg = (): JSX.Element => {
    if (q.trim()) { return <><b>&lsquo;{q.trim()}&rsquo;에 맞는 콘텐츠가 없어요</b><span>이름의 다른 단어로 찾아 보세요.</span></>; }
    if (!all.length) {
      return <><b>아직 올린 콘텐츠가 없어요</b><span>만든 Agent는 Prod에 배포되면 여기에 모여요. Skill과 HTML은 지금 바로 올릴 수 있어요.</span>
        <span className="mcb"><Go go={api.go} view="maker" className="btn sm pri">Maker Lab 가기</Go><button type="button" className="btn sm" onClick={() => api.openSkillForm()}>＋ Skill 올리기</button></span></>;
    }
    const act = tab === 's' ? <button type="button" className="btn sm pri" onClick={() => api.openSkillForm()}>＋ Skill 올리기</button>
      : tab === 'h' ? <button type="button" className="btn sm pri" onClick={() => api.openHtmlForm()}>＋ HTML 올리기</button>
        : tab === 'c' ? <Go go={api.go} view="cases" className="btn sm pri">Case Library 가기</Go>
          : tab === 'i' ? <Go go={api.go} view="ideas" className="btn sm pri">Idea Board 가기</Go> : <Go go={api.go} view="maker" className="btn sm pri">Maker Lab 가기</Go>;
    return <><b>아직 올린 {tab === 'all' ? '콘텐츠가' : KL[tab] + (tab === 'c' || tab === 'i' ? '가' : tab === 'a' ? '가' : '이')} 없어요</b><span>올리면 여기에서 수정하고 지울 수 있어요.</span><span className="mcb">{act}</span></>;
  };
  return (
    <div className="wrap">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: '나의 작업공간' }]} />
      <div className="dh2"><div><h1>나의 작업공간</h1><p style={{ margin: 0, color: 'var(--ink2)' }}>내가 만든 것과 제안한 것을 한곳에서 봐요.</p></div></div>
      <div className="dgrid"><section className="dcard dtodo" aria-labelledby="hub-todo-h"><header><span className="dic t-n">{ICON.n}</span><h2 id="hub-todo-h">확인할 일 <span className="pill">{todo.length}</span></h2></header>
        {todo.length ? <ul className="mclist">{todo.map(n => (
          <li key={n.id}><span className="dn"><b>{n.title}</b><small>{n.sub} · {relDay(n.date, api.now)}</small></span>
            <span className="mcb"><Go go={api.go} view={n.view} id={n.target || undefined} className="btn sm">자세히</Go></span></li>
        ))}</ul> : <p className="note" style={{ margin: '4px 0 0' }}>지금 확인할 일이 없어요.</p>}
      </section></div>
      <section className="dsec mycon" id="mv-myCon" aria-labelledby="hub-mc-h">
        {/* 시안 c55: '콘텐츠 올리기'는 제목 줄 오른쪽, 검색·정렬은 탭 줄 오른쪽 */}
        <div className="mc-head"><h2 id="hub-mc-h">나의 콘텐츠</h2>
          <div className="mc-add menu-host"><button type="button" className="btn sm pri" aria-expanded={add} aria-controls="hub-my-add" onClick={() => setAdd(!add)}>＋ 콘텐츠 올리기</button>
            <div className="avmenu" id="hub-my-add" hidden={!add}>
              <a href="#skills" onClick={e => { e.preventDefault(); setAdd(false); api.openSkillForm(); }}>Skill</a>
              <a href="#htools" onClick={e => { e.preventDefault(); setAdd(false); api.openHtmlForm(); }}>HTML</a>
              <Go go={api.go} view="ideas">아이디어</Go>
            </div></div></div>
        <div className="dstats" aria-label="나의 콘텐츠 수">
          {(['a', 's', 'h', 'c', 'i'] as K[]).map(k => <button key={k} type="button" className="dstat" aria-pressed={tab === k} onClick={() => choose(k)}><span className={'dic t-' + k}>{ICON[k]}</span><span className="dl">{KL[k]}</span><b>{cnt(k)}</b></button>)}
        </div>
        <div className="c55-row">
          <div className="mc-tabs" role="tablist" aria-label="콘텐츠 종류" id="mv-myTabs">
            {(['all', 'a', 's', 'h', 'c', 'i'] as ('all' | K)[]).map(k => <button key={k} type="button" role="tab" aria-selected={tab === k} onClick={() => choose(k)}>{k === 'all' ? '전체' : KL[k]} <small>{cnt(k)}</small></button>)}
          </div>
          <div className="mc-tools">
            <label className="mc-q"><span className="sr">나의 콘텐츠 검색</span><span className="b4-f" style={{ height: 40 }}>
              <input type="search" id="hub-myQ" placeholder="이름으로 찾기" value={q} onChange={e => { setQ(e.target.value); setPg(1); }} />
              <button type="button" className="b4-btn b6-sbtn" aria-label="검색" onClick={() => { const el = document.getElementById('hub-myQ'); if (el) { el.focus(); } }}><Mag /></button></span></label>
            <label className="sortsel">정렬<select value={sort} onChange={e => setSort(e.target.value)}><option value="new">최근 올린 순</option><option value="old">오래된 순</option><option value="name">이름순</option></select></label>
          </div>
        </div>
        <table className="mctable"><thead><tr><th scope="col" className="c-k">종류</th><th scope="col">이름</th><th scope="col" className="c-d">올린 날짜</th><th scope="col" className="c-b"><span className="sr">동작</span></th></tr></thead>
          <tbody>{shown.map(r => {
            const key = r.k + r.id;
            if (del === key) {
              return <tr key={key} className="mdelrow"><td colSpan={4}><div className="mdconf" role="group" aria-label="삭제 확인"><span>{r.k === 'a'
                ? <>&lsquo;{r.title}&rsquo;을 Hub에서 내릴까요? Marketplace와 검색에서 사라져요. AgentList 항목과 배포 기록은 남고 운영 상태만 &lsquo;중단&rsquo;으로 바뀌어요.</>
                : <>&lsquo;{r.title}&rsquo;을 지울까요? {r.k === 'i' ? 'Idea Board' : r.k === 'c' ? 'Case Library' : 'Marketplace'}와 검색에서도 사라져요.</>}</span>
                <span className="mcb"><button type="button" className="btn sm pri" disabled={busy} onClick={() => { remove(r).catch(() => undefined); }}>삭제</button><button type="button" className="btn sm" onClick={() => setDel('')}>취소</button></span></div></td></tr>;
            }
            return (
              <tr key={key}><td className="c-k"><span className={'kchip t-' + r.k + ' c14-k'} data-c14k={r.k}>{KL[r.k]}</span></td>
                <td className="c-n"><Go go={api.go} view={r.view} id={r.id}>{r.title}</Go></td>
                <td className="c-d">{mmdd(r.date)}</td>
                <td className="c-b"><span className="mcb">
                  <button type="button" className="btn sm" onClick={() => edit(r)}>수정</button>
                  <button type="button" className="btn sm mdel" onClick={() => setDel(key)}>삭제</button>
                  <Go go={api.go} view={r.view} id={r.id} className="btn sm">자세히</Go></span></td></tr>
            );
          })}</tbody></table>
        {!list.length ? <p className="mc-empty">{emptyMsg()}</p> : null}
        {pages > 1 ? <nav className="mc-pg" aria-label="페이지">
          <button type="button" disabled={page < 2} aria-label="이전 페이지" onClick={() => setPg(page - 1)}>‹</button>
          {Array.from({ length: pages }, (_, i) => <button key={i} type="button" aria-current={i + 1 === page ? 'page' : undefined} onClick={() => setPg(i + 1)}>{i + 1}</button>)}
          <button type="button" disabled={page >= pages} aria-label="다음 페이지" onClick={() => setPg(page + 1)}>›</button>
          <span className="pgn">{list.length}개 중 {(page - 1) * PER + 1}–{(page - 1) * PER + shown.length}</span></nav> : null}
      </section>
    </div>
  );
}
