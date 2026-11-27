/* Case Library (시안 11/26 솔루션 단위): 검색 + 업종 · 솔루션 종류 칩, 솔루션 한 줄씩 목록 /
   솔루션 상세(머리 연한 파란 판 + 아이디어 제안 단추, 개요 · 활용 목적 · 종류별 내용 · 원본 파일, 오른쪽 정보) */
import * as React from 'react';
import { ICase, IIdea, ISolution, SolutionKind } from '../../models/types';
import { CASE_INDUSTRIES, contains, first, newestFirst, runLabel } from '../../models/rules';
import { IHubApi } from '../api';
import { Clamp, Crumb, Empty, Go, ListError } from '../ui';
import { Person } from '../persona';
import { Mag } from '../mv';
import { AskBtn, MpdGroup, MpdValue, NameLine } from './detail';
import { ideaCats, palOf, useCatPicker } from './ideas';

const IND_TOP = 6;
const KIND_LABEL: { [k: string]: string } = { agent: 'Agent', skill: 'Skill', html: 'HTML' };
const KINDS: SolutionKind[] = ['agent', 'skill', 'html'];
const SearchIcon = <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;

/** 목록 한 줄 = 사례(프로젝트) 안의 솔루션 하나 */
interface ISolRow { c: ICase; s: ISolution; k: number }
function solRows(cases: ICase[]): ISolRow[] {
  const out: ISolRow[] = [];
  cases.forEach(c => c.solutions.forEach((s, k) => out.push({ c, s, k })));
  return out;
}
/** 이 솔루션에서 나온 아이디어 */
export function ideasFromSol(ideas: IIdea[], caseId: number, sol: string): IIdea[] {
  return ideas.filter(i => !!i.caseRef && i.caseRef.caseId === caseId && i.caseRef.sol === sol);
}

export function CaseLibrary(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const all = api.data.cases;
  const allRows = solRows(all);
  const [q, setQ] = React.useState('');
  const [ind, setInd] = React.useState('');
  const [kind, setKind] = React.useState('');
  const [sort, setSort] = React.useState('new');
  const [moreInd, setMoreInd] = React.useState(false);

  const text = (r: ISolRow): string => [r.c.industry, r.c.client, r.c.dept, r.c.title, r.c.summary, r.s.name, r.s.does || '', r.s.use || '', r.s.desc || '', r.s.before || '', r.s.after || ''].join(' ');
  const rows = allRows.filter(r => (!ind || r.c.industry === ind) && (!kind || r.s.kind === kind) && (!q.trim() || contains(text(r), q.trim())))
    .sort(sort === 'ind' ? (a, b) => a.c.industry.localeCompare(b.c.industry, 'ko') : sort === 'cli' ? (a, b) => a.c.client.localeCompare(b.c.client, 'ko')
      : (a, b) => newestFirst(a.c.created, b.c.created) || a.k - b.k);

  // 업종 칩: 솔루션이 많은 6개 먼저, 나머지는 더보기
  const cnt = (v: string): number => allRows.filter(r => r.c.industry === v).length;
  const known = CASE_INDUSTRIES.concat(all.map(c => c.industry).filter(v => !!v && CASE_INDUSTRIES.indexOf(v) < 0).filter((v, i, a) => a.indexOf(v) === i));
  const ord = known.map((v, i) => ({ v, n: cnt(v), i })).sort((a, b) => b.n - a.n || a.i - b.i);
  const top = ord.slice(0, IND_TOP).map(x => x.v);
  const rest = known.filter(v => top.indexOf(v) < 0);
  const kcnt = (k: string): number => allRows.filter(r => r.s.kind === k).length;
  const active = !!q || !!ind || !!kind;
  const clearAll = (): void => { setQ(''); setInd(''); setKind(''); };
  const chip = (v: string, label: string, more?: boolean): JSX.Element => (
    <button key={v || 'all'} type="button" className={'ca-chip' + (more ? ' ca-more' : '')} aria-pressed={ind === v} disabled={!!v && !cnt(v)} hidden={more && !moreInd && ind !== v}
      onClick={() => setInd(v)}>{label}<small>{v ? cnt(v) : allRows.length}</small></button>
  );

  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Case Library</span><h1>Case Library</h1><p>고객사 프로젝트에서 만든 솔루션을 찾아보세요</p></div></div>
      {api.data.casesError ? <ListError what="Case Library" message={api.data.casesError} /> : <div className="ca">
        <div className="ca-srow">
          <label className="cf-search b4-f">{SearchIcon}<span className="sr">솔루션 검색</span>
            <input type="search" id="mv-caseQ" placeholder="솔루션 이름이나 업무 키워드로 검색해 보세요." autoComplete="off" value={q} onChange={e => setQ(e.target.value)} />
            {q ? <button type="button" className="cf-clear" aria-label="검색어 지우기" onClick={() => setQ('')}>✕</button> : null}
            <button type="button" className="b4-btn b6-sbtn" aria-label="검색" onClick={() => { const el = document.getElementById('mv-caseQ'); if (el) { el.focus(); } }}><Mag /></button></label>
        </div>
        <div className="cz-f"><span className="cz-l" id="hub-czL1">업종</span>
          <div className="ca-chips end" role="group" aria-labelledby="hub-czL1" id="mv-caseInd">
            {chip('', '전체')}{top.map(v => chip(v, v))}{rest.map(v => chip(v, v, true))}
            {rest.length ? <button type="button" className="ca-moreb" aria-expanded={moreInd} onClick={() => setMoreInd(!moreInd)}>{moreInd ? '접기' : <>더보기 <small>+{rest.length}</small></>}</button> : null}
          </div></div>
        <div className="cz-f"><span className="cz-l" id="hub-czL0">솔루션</span>
          <div className="ca-chips" role="group" aria-labelledby="hub-czL0" id="mv-solType">
            <button type="button" className="ca-chip" aria-pressed={!kind} onClick={() => setKind('')}>전체<small>{allRows.length}</small></button>
            {KINDS.map(k => <button key={k} type="button" className="ca-chip" aria-pressed={kind === k} disabled={!kcnt(k)} onClick={() => setKind(k)}>{KIND_LABEL[k]}<small>{kcnt(k)}</small></button>)}
          </div></div>
        <div className="ca-bar">
          {active ? <button type="button" className="cf-reset" onClick={clearAll}>필터 초기화</button> : null}
          <span className="rcount" aria-live="polite"><b>솔루션 {rows.length}개</b>{rows.length !== allRows.length ? <> <span className="cb-tot">/ 전체 {allRows.length}개</span></> : null}</span>
          <label className="sortsel">정렬<select value={sort} onChange={e => setSort(e.target.value)}><option value="new">최신순</option><option value="ind">업종순</option><option value="cli">고객사순</option></select></label>
        </div>
        <div className="cb-tw"><div className="cb-tb ca-tb" role="table" aria-label="솔루션 목록">
          <div className="cb-row cb-head sc-h" role="row"><span role="columnheader">업종</span><span role="columnheader">고객사</span><span role="columnheader">종류</span><span role="columnheader">솔루션</span><span role="columnheader">활용 방식</span><span role="columnheader">시기</span></div>
          <div id="mv-caseGrid" className="caseGrid">{rows.length ? rows.map(r => (
            <Go key={r.c.id + ':' + r.k} go={api.go} view="case" id={r.c.id} sub={r.k || undefined} className="sc-row">
              <span className="sc-ind" role="cell">{r.c.industry ? <span className="cc-dept ct-ind">{r.c.industry}</span> : null}</span>
              <span className="sc-cli" role="cell">{r.c.client}<small>{r.c.dept}</small></span>
              <span className="sc-ty" role="cell"><span className={'cb-hash h-' + r.s.kind}>#{KIND_LABEL[r.s.kind]}</span></span>
              <span className="sc-nm" role="cell"><b>{r.s.name}{r.c.pending ? ' (공개 검토 중)' : ''}</b>{r.s.does ? <small>{r.s.does}</small> : null}</span>
              <span className="sc-area" role="cell">{r.s.use || ''}</span>
              <span className="sc-when" role="cell">{r.c.period}</span>
            </Go>
          )) : allRows.length ? <div className="cf-empty"><p>조건에 맞는 솔루션이 없어요.</p><button type="button" className="btn sm" onClick={clearAll}>조건 모두 지우기</button></div>
            : <div className="cf-empty"><p>아직 올라온 솔루션이 없어요.</p></div>}</div>
        </div></div>
      </div>}
    </div>
  );
}

/* ---------- 솔루션 상세 ---------- */
function Pre(props: { api: IHubApi; label: string; text: string }): JSX.Element {
  return <div className="cd-pre"><div className="cd-preh"><span>{props.label}</span><button className="btn sm" type="button" onClick={() => props.api.copy(props.text, '본문을 복사했어요')}>복사</button></div><pre>{props.text}</pre></div>;
}
const FileIc = <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>;

/** Agent 솔루션 = Marketplace Agent '상세 정보'와 같은 구성 */
function AgentSol(props: { api: IHubApi; s: ISolution }): JSX.Element {
  const { api, s } = props;
  const agentLink = (n: string): JSX.Element => { const x = first(api.data.agents, a => a.title === n); return <li key={n}>{x ? <Go go={api.go} view="agent" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; };
  const skillLink = (n: string): JSX.Element => { const x = first(api.data.skills, a => a.title === n); return <li key={n}>{x ? <Go go={api.go} view="skill" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; };
  const ex = s.ex || [];
  return <>
    <h3 className="mpd-h">Agent 구성 정보</h3>
    <div className="dstack mpd-grid mpd-g3">
      <MpdValue title="사용 대상" value={(s.who || []).join(', ')} />
      <MpdValue title="사용 모델" value={(s.model || []).join(', ')} />
      <MpdValue title="실행 방식" value={runLabel(s.run)} />
      <section className="grp mpd-full"><h2>지침</h2>{s.ins ? <Clamp text={s.ins} more="지침 전체 보기" /> : <p className="mpd-none">공개된 지침이 없어요.</p>}</section>
    </div>
    <h3 className="mpd-h">연결된 자료와 도구</h3>
    <div className="dstack mpd-grid">
      <MpdGroup title="지식 원본" items={(s.data || []).map((x, k) => <NameLine key={k} text={x} />)} />
      <MpdGroup title="연결 도구 및 커넥터" items={(s.tools || []).map((x, k) => <NameLine key={k} text={x} />)} />
      <MpdGroup title="연결 에이전트" items={(s.agents || []).map(agentLink)} />
      <MpdGroup title="Skill" items={(s.skills || []).map(skillLink)} />
    </div>
    {ex.length ? <>
      <h3 className="mpd-h">예시 프롬프트</h3>
      <ul className="pex">{ex.map((p, k) => <li key={k}>{p.t ? <span className="ptag">{p.t}</span> : null}<p>{p.q}</p><button className="btn sm" type="button" onClick={() => api.copy(p.q, '복사했어요')}>복사</button></li>)}</ul>
    </> : null}
  </>;
}

/** 원본 파일 (Skill · HTML): 없으면 회색 안내 */
function OrigFile(props: { c: ICase; s: ISolution }): JSX.Element {
  const f = props.s.file ? first(props.c.files, x => x.name === props.s.file) : undefined;
  return <>
    <h3 className="mpd-h">원본 파일</h3>
    {f ? <div className="cfx-row"><span className="cfx-ic">{FileIc}</span><span className="cfx-nm"><b>{f.name}</b><small>{props.s.kind === 'skill' ? 'Skill 파일' : 'HTML 파일'}</small></span>
      <a className="cfx-dl" href={f.url + '?download=1'} download={f.name}>내려받기 →</a></div>
      : <p className="cfx-none">이 솔루션은 등록된 원본 파일이 없어요. 파일이 필요하면 담당자에게 문의해 주세요.</p>}
  </>;
}

export function CasePage(props: { api: IHubApi; item?: ICase; sol?: number }): JSX.Element {
  const { api } = props;
  const c = props.item;
  const [dlg, setDlg] = React.useState(false);
  if (!c || !c.solutions.length) {
    return <div className="wrap"><Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Case Library', view: 'cases' }, { label: '솔루션' }]} />
      <Empty title="이 솔루션을 찾을 수 없어요." actions={<Go go={api.go} view="cases" className="btn">Case Library로</Go>}>삭제됐거나 아직 공개 전일 수 있어요.</Empty></div>;
  }
  const k = props.sol && props.sol < c.solutions.length ? props.sol : 0;
  const s = c.solutions[k];
  const owner = c.contactPerson || c.author;
  const related = ideasFromSol(api.data.ideas, c.id, s.name);
  // 예전 사례(솔루션별 활용 목적이 없음)는 사례의 업무 변화 Before/After를 씁니다
  const before = s.before || c.beforeText;
  const after = s.after || c.afterText;
  return (
    <div id="mv-caseOut" className="wrap caseOut sc-out">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Case Library', view: 'cases' }, { label: s.name }]} />
      {/* 머리: 연한 파란 판. 오른쪽 '이 사례로 아이디어 제안하기 →' + 이미 올린 아이디어가 있으면 '관련 아이디어 n개 보기' */}
      <div className={'cd-head sc-head' + (related.length ? ' ci-has' : '')}>
        <div className="sc-htx">
          <h1 className="sc-h1"><span>{s.name}{c.pending ? ' (공개 검토 중)' : ''}</span><span className={'cd-pill t-' + s.kind + ' sc-hpill'}>{KIND_LABEL[s.kind]}</span></h1>
          {s.does ? <p className="sc-does">{s.does}</p> : null}
        </div>
        <div className="ci-hact">
          <button type="button" className="ci-go ci-hgo" onClick={() => setDlg(true)}>이 사례로 아이디어 제안하기 <span aria-hidden="true">→</span></button>
          {related.length ? <a href="#ideas" className="ci-hcnt" onClick={e => { e.preventDefault(); api.openIdeas({ caseRef: { caseId: c.id, sol: s.name } }); }}>관련 아이디어 {related.length}개 보기</a> : null}
        </div>
      </div>
      <div className="cd-grid"><div className="cd-main">
        <div className="mpd sc-body">
          <h3 className="mpd-h">개요</h3>
          <p className="sc-p">{s.desc || s.does || '아직 설명이 없어요.'}</p>
          {before || after ? <>
            <h3 className="mpd-h">활용 목적</h3>
            <div className="ci-ovba">
              <div className="ci-ob"><small>이런 상황에서</small><p>{before || '—'}</p></div>
              <div className="ci-oa"><small>이런 결과로</small><p>{after || '—'}</p></div>
            </div>
          </> : null}
          {s.kind === 'agent' ? <AgentSol api={api} s={s} />
            : s.kind === 'skill' ? <>
              {s.body ? <><h3 className="mpd-h">본문</h3><Pre api={api} label={s.file || s.name} text={s.body} /></> : null}
              <OrigFile c={c} s={s} />
            </> : <>
              {s.parts && s.parts.length ? <><h3 className="mpd-h">화면 구성</h3><ul className="cd-list">{s.parts.map(v => <li key={v}>{v}</li>)}</ul></> : null}
              <OrigFile c={c} s={s} />
            </>}
        </div>
      </div>
        <aside className="dp-side cd-info"><div className="box"><h3>정보</h3>
          <table className="kv"><tbody>
            <tr><th>솔루션 종류</th><td>{KIND_LABEL[s.kind]}</td></tr>
            <tr><th>활용 방식</th><td>{s.use || '—'}</td></tr>
            <tr><th>업종</th><td>{c.industry || '—'}</td></tr>
            <tr><th>고객사·부서</th><td>{[c.client, c.dept].filter(x => !!x).join(' ') || '—'}</td></tr>
            <tr><th>프로젝트 시기</th><td>{c.period || '—'}</td></tr>
            <tr><th>담당자</th><td>{c.contactPerson ? <Person p={c.contactPerson} /> : c.contact || <Person p={c.author} />}</td></tr>
          </tbody></table>
          <AskBtn api={api} who={[owner]} label="담당자에게 Teams로 문의하기" tip="담당자에게 Teams 채팅을 열어요" />
        </div></aside>
      </div>
      {dlg ? <CaseIdeaDialog api={api} c={c} s={s} related={related} onClose={() => setDlg(false)} /> : null}
    </div>
  );
}

/* ---------- 이 사례로 아이디어 제안하기 (Idea Board에 올리기 창) ----------
   비슷한 아이디어가 이미 있으면 공감 먼저, 아래 포스트잇 쓰기(고정 문구 + 카테고리 직접 고르기) */
function CaseIdeaDialog(props: { api: IHubApi; c: ICase; s: ISolution; related: IIdea[]; onClose: () => void }): JSX.Element {
  const { api, c, s } = props;
  const cats = ideaCats(api);
  const [text, setText] = React.useState(`고객사 솔루션 '${s.name}' 같은 게 우리 업무에도 있으면 좋겠어요`.slice(0, 60));
  const [cat, setCat] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [tried, setTried] = React.useState(false);
  const picker = useCatPicker(cats, cat, setCat);
  const txRef = React.useRef<HTMLTextAreaElement>(null);
  const last = React.useRef<Element | null>(null);
  React.useEffect(() => {
    last.current = document.activeElement;
    if (txRef.current) { const t = txRef.current; t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
    const esc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') { return; }
      const lb = document.querySelector('.ci3 .ib3-lb') as HTMLElement | null;
      if (lb && !lb.hidden) { return; }
      close();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const close = (): void => { props.onClose(); const l = last.current as HTMLElement | null; if (l && l.focus) { l.focus(); } };
  const ok = !!cat && !!text.trim();
  const need = !cat ? '카테고리를 고르면 게시할 수 있어요' : '아이디어를 한 줄 써 주세요';
  const post = async (e?: React.FormEvent): Promise<void> => {
    if (e) { e.preventDefault(); }
    if (!ok) { setTried(true); return; }
    setBusy(true);
    const done = await api.addIdea({ title: text.trim(), category: cat, source: '', detail: '', pain: '', frequency: '', minutes: undefined, caseRef: { caseId: c.id, sol: s.name } });
    setBusy(false);
    if (done) { close(); }
  };
  const tint = palOf(cat, cats);
  return (
    <div className="ci-ov" onClick={e => { if (e.target === e.currentTarget) { close(); } }}>
      <div className="ci-dlg ci3" role="dialog" aria-modal="true" aria-labelledby="hub-ciT">
        <div className="ci3-h"><h2 id="hub-ciT">Idea Board에 올리기</h2>
          <button type="button" className="ci-x" aria-label="닫기" onClick={close}><svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="#5b5b5b" strokeWidth="2.4" strokeLinecap="round" /></svg></button></div>
        <div className="ci3-b">
          {props.related.length ? <section className="ci3-dup" aria-labelledby="hub-ciDupT">
            <h3 id="hub-ciDupT"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#004772" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16.5v.01" /></svg>비슷한 아이디어가 이미 있어요</h3>
            <p>같은 생각이라면 새로 올리지 말고 공감을 눌러 주세요.</p>
            <ul>{props.related.map(i => {
              const on = api.liked('Idea', i.id);
              const n = api.likeCount('Idea', i.id);
              return <li key={i.id}><Go go={api.go} view="idea" id={i.id} className="ci3-dt">{i.title}</Go>
                <button type="button" className="pn-pill ci3-like" aria-pressed={on} aria-label={'공감 ' + n} onClick={() => api.toggleLike('Idea', i.id)}>{on ? '♥' : '♡'} <span className="n">{n}</span></button></li>;
            })}</ul>
          </section> : null}
          <div className="ci3-row">
            <form className="ci-post" id="hub-ciForm" noValidate={true} onSubmit={e => { post(e).catch(() => undefined); }}>
              <div className="ci-note" style={tint ? { background: tint[0] } : undefined}>
                {picker.button(tried && !cat)}
                <label className="sr" htmlFor="hub-ciTx">아이디어 한 줄</label>
                <textarea ref={txRef} id="hub-ciTx" maxLength={60} rows={3} value={text} onChange={e => setText(e.target.value.replace(/[\r\n]+/g, ' '))}
                  onKeyDown={e => { if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) { e.preventDefault(); post().catch(() => undefined); } }} />
                <span className="ci-cnt" aria-live="polite">{text.length} / 60</span>
              </div>
              {picker.list}
            </form>
            <div className="ci3-side"><p className="ci3-lab">함께 연결되는 솔루션</p>
              <div className="ci3-card"><span className={'cb-hash h-' + s.kind}>#{KIND_LABEL[s.kind]}</span><b>{s.name}</b>{s.does ? <small>{s.does}</small> : null}<em>📚 Case Library</em></div>
              <ol className="ci3-steps"><li><b>①</b>알맞은 업무 카테고리를 선택해요</li><li><b>②</b>아이디어를 더해 본문을 수정해도 좋아요</li><li><b>③</b>작성이 끝나면 게시 버튼을 눌러 주세요</li></ol></div>
          </div>
        </div>
        <div className="ci3-f"><p className={'ci3-need' + (tried && !ok ? ' bad' : '')} hidden={ok}>{need}</p>
          <button type="button" className="ci3-cancel" onClick={close}>취소</button>
          <button type="submit" form="hub-ciForm" className="btn pri ci3-go" disabled={!ok || busy}>{busy ? '올리는 중…' : '게시'}</button></div>
      </div>
    </div>
  );
}

