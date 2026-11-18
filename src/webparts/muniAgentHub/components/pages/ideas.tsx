/* Idea Board (시안 그대로): 포스트잇 붙이기(한 줄 + 자세한 내용), 모집 중 · 제작 중 · 완성 · 보관함 / 아이디어 상세 */
import * as React from 'react';
import { IIdea, IPerson, IReaction } from '../../models/types';
import { IDEA_ARCHIVE_DAYS, IDEA_FREQS, IDEA_LIKE_GOAL, IDEA_TYPES, contains, daysSince, daysToArchive, first, ideaMonthlyMinutes, ideaStart, isEmail, mmdd } from '../../models/rules';
import { IHubApi } from '../api';
import { Crumb, Empty, Go, ListError } from '../ui';
import { Person } from '../persona';
import { BadgeMedal } from '../badge';

const HAND = <svg className="ihd" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V5.5a1.5 1.5 0 0 1 3 0V12M17 11.5V9a1.5 1.5 0 0 1 3 0v5c0 4.2-2.8 7-6.6 7-2.6 0-4.3-1.1-5.7-3.1L4.2 14a1.5 1.5 0 0 1 2.4-1.8L8 14" /></svg>;
const CMT = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
const Heart = (props: { on: boolean }): JSX.Element => <svg viewBox="0 0 24 24" width="15" height="15" fill={props.on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>;

function tcls(t: string): string { return t === 'Agent' ? 'agent' : t === 'Skill' ? 'skill' : t === 'HTML' ? 'html' : 'etc'; }
/** 사람 동그라미: 그 사람의 프로필 배지가 있으면 메달, 없으면 이름 첫 글자 */
function Av(props: { p?: IPerson; me: number; badge?: string }): JSX.Element {
  const n = props.p ? props.p.name : '?';
  if (props.badge) {
    return <span className="cav" aria-hidden="true" style={{ background: 'transparent', overflow: 'visible' }}><BadgeMedal k={props.badge} size={30} ribbon={false} /></span>;
  }
  return <span className={'cav' + (props.p && props.p.id === props.me ? ' me' : '')} aria-hidden="true">{n.trim().charAt(0)}</span>;
}
function Avs(props: { people: IPerson[]; me: number; badgeOf?: (p: IPerson) => string | undefined }): JSX.Element {
  return <span className="avs" aria-hidden="true">{props.people.slice(0, 3).map(p => {
    const b = props.badgeOf ? props.badgeOf(p) : undefined;
    return b
      ? <i key={p.id} style={{ background: 'transparent', border: 0, overflow: 'visible' }}><BadgeMedal k={b} size={22} ribbon={false} /></i>
      : <i key={p.id} className={p.id === props.me ? 'me' : undefined}>{(p.name || '?').trim().charAt(0)}</i>;
  })}</span>;
}
/** 보관된 날: 보관일(운영 담당자가 넣음)이 있으면 그 날, 없으면 계산한 날 */
function archivedOn(i: IIdea): string {
  if (i.archivedOn) { return i.archivedOn; }
  const d = new Date(ideaStart(i));
  d.setDate(d.getDate() + IDEA_ARCHIVE_DAYS);
  return d.toISOString();
}
/** 결과물(ResultRef): 주소면 새 창 링크, Agent·Skill·HTML 이름과 같으면 그 화면, 아니면 글자 그대로 */
type Result = { label: string; href?: string; view?: 'agent' | 'skill' | 'htool'; id?: number };
function resultOf(api: IHubApi, ref: string): Result | undefined {
  const r = (ref || '').trim();
  if (!r) { return undefined; }
  if (/^https:\/\//i.test(r)) { return { label: '결과물', href: r }; }
  const same = (t: string): boolean => t.trim().toLowerCase() === r.toLowerCase();
  const a = first(api.data.agents, x => same(x.title));
  if (a) { return { label: a.title, view: 'agent', id: a.id }; }
  const s = first(api.data.skills, x => same(x.title));
  if (s) { return { label: s.title, view: 'skill', id: s.id }; }
  const h = first(api.data.htmls, x => same(x.title));
  if (h) { return { label: h.title, view: 'htool', id: h.id }; }
  return { label: r };
}
function ResultLink(props: { api: IHubApi; r: Result; className: string; prefix?: string }): JSX.Element {
  const { r } = props;
  const text = (props.prefix || '') + r.label;
  if (r.view && r.id) { return <Go go={props.api.go} view={r.view} id={r.id} className={props.className}>{text}</Go>; }
  if (r.href) { return <a className={props.className} href={r.href} target="_blank" rel="noopener noreferrer">{text}</a>; }
  return <span className={props.className}>{text}</span>;
}

/** 포스트잇 한 장 (시안 article.pn) */
function Note(props: { api: IHubApi; idea: IIdea }): JSX.Element {
  const { api, idea: i } = props;
  const makers = api.makers(i.id);
  const c = makers.length;
  const st = api.stageOf(i);
  const left = daysToArchive(i, api.now);
  const soon = !c && st === 'live' && left <= 14;
  const joined = makers.some(p => p.id === api.me.id);
  const liked = api.liked('Idea', i.id);
  const n = api.likeCount('Idea', i.id);
  const comments = api.comments(i.id).length;
  const result = resultOf(api, i.resultRef);
  return (
    <article className={`pn t-${tcls(i.type)}${c ? ' hand' : ''}${soon ? ' soon' : ''}`}>
      {c ? <span className="pn-rib" aria-hidden="true"><span className="pn-tape">{HAND}{c}명 손 들었어요</span></span> : null}
      <div className="pn-row"><span className="pn-ty">{i.type || '기타'}</span>{soon ? <span className="pn-old">{left}일 뒤 보관</span> : null}</div>
      <Go go={api.go} view="idea" id={i.id} className="open"><b>{i.title}</b></Go>
      <span className="who">{i.author ? i.author.name : ''}</span>
      {c ? <span className="pn-hl"><Avs people={makers} me={api.me.id} badgeOf={api.avatarOf} /><span className="sr">{c}명 손 들었어요</span></span> : null}
      {st === 'done' && result ? <ResultLink api={api} r={result} className="pn-done" prefix={`✓ ${i.type && i.type !== '기타' ? i.type + ' ' : ''}완성 · `} /> : null}
      <div className="acts">
        <button type="button" className={'pn-pill' + (liked ? ' on' : '')} aria-pressed={liked} aria-label={`공감 ${n}`} onClick={() => api.toggleLike('Idea', i.id)}>{liked ? '♥' : '♡'} <span className="n">{n}</span></button>
        {st !== 'done' ? <button type="button" className={'pn-pill' + (joined ? ' on' : '')} aria-pressed={joined} aria-label={`만들래요, 손 든 사람 ${c}명`} onClick={() => api.toggleMake(i.id)}>{HAND}만들래요{c ? <> <span className="n">{c}</span></> : null}</button> : null}
        <span className="pn-cmt" aria-label={`댓글 ${comments}개`}>{CMT}{comments}</span>
      </div>
    </article>
  );
}

type View = 'live' | 'make' | 'done' | 'arch';
export function IdeaBoard(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [text, setText] = React.useState('');
  const [desc, setDesc] = React.useState('');
  const [type, setType] = React.useState('');
  const [pain, setPain] = React.useState('');
  const [freq, setFreq] = React.useState('');
  const [mins, setMins] = React.useState('');
  const [err, setErr] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [view, setView] = React.useState<View>('live');
  const [q, setQ] = React.useState('');
  const by: { [v: string]: IIdea[] } = { live: [], make: [], done: [], arch: [] };
  api.data.ideas.forEach(i => { const st = api.stageOf(i); by[st === 'making' ? 'make' : st === 'archived' ? 'arch' : st].push(i); });
  const match = (i: IIdea): boolean => !q.trim() || contains(i.title + ' ' + i.detail + ' ' + (i.author ? i.author.name : ''), q.trim());
  // 시안 순서: 손 든 사람이 많은 순, 그다음 공감 많은 순
  const order = (x: IIdea, y: IIdea): number => api.makers(y.id).length - api.makers(x.id).length || api.likeCount('Idea', y.id) - api.likeCount('Idea', x.id);
  const rows = (view === 'arch' ? by.arch.slice().sort((x, y) => archivedOn(y).localeCompare(archivedOn(x))) : by[view].slice().sort(order)).filter(match);
  const post = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { setErr(true); (document.getElementById('hub-n-text') as HTMLElement).focus(); return; }
    setBusy(true);
    const ok = await api.addIdea({ title: t, type, detail: desc.trim(), pain: pain.trim(), frequency: freq, minutes: mins ? Number(mins) : undefined });
    setBusy(false);
    if (ok) { setText(''); setDesc(''); setType(''); setPain(''); setFreq(''); setMins(''); setView('live'); }
  };
  const tab = (v: View, label: string, tip: string): JSX.Element => (
    <button type="button" role="tab" aria-selected={view === v} aria-controls="hub-wall" data-tip={tip} onClick={() => setView(v)}>{label} <span>{by[v].length}</span></button>
  );
  const empty = q.trim() ? `'${q.trim()}'에 맞는 ${view === 'arch' ? '보관된 ' : ''}아이디어가 없어요.${view === 'arch' ? '' : ' 위에서 새로 붙여 보세요.'}`
    : view === 'make' ? '아직 만들고 있는 아이디어가 없어요.' : view === 'done' ? '아직 완성된 아이디어가 없어요.' : view === 'arch' ? '보관된 아이디어가 없어요.' : '모으는 중인 아이디어가 없어요. 위에서 새로 붙여 보세요.';
  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Idea Board</span><h1>Idea Board</h1><p>한 줄 아이디어를 붙이고 같이 만들어요</p></div></div>
      <div className="ib"><div className="ib-main">
        <div className="composer">
          <form className={'note-new' + (type ? ' t-' + tcls(type) : '')} aria-label="새 아이디어 포스트잇" noValidate={true} onSubmit={e => { post(e).catch(() => undefined); }}>
            <label className="sr" htmlFor="hub-n-text">아이디어 한 줄</label>
            <textarea id="hub-n-text" className="noteText" maxLength={60} rows={2} placeholder="이런 게 있으면 좋겠다… (한 줄)" aria-describedby="hub-n-err" aria-invalid={err} value={text} onChange={e => { setText(e.target.value); if (e.target.value.trim()) { setErr(false); } }} />
            <p className="nerr" id="hub-n-err" role="alert" hidden={!err}>제목을 한 줄 써 주세요</p>
            <label className="sr" htmlFor="hub-n-desc">자세한 내용 (선택)</label>
            <textarea id="hub-n-desc" className="ndesc" rows={3} placeholder={'자세한 내용 (선택)\n있으면 무엇이 좋아지는지 적어 주세요'} value={desc} onChange={e => setDesc(e.target.value)} />
            <details className="nmore"><summary>불편 · 빈도 · 시간 더 적기 (선택)</summary>
              <label className="sr" htmlFor="hub-n-pain">지금 겪는 불편</label>
              <textarea id="hub-n-pain" className="ndesc" rows={2} placeholder="지금 겪는 불편" value={pain} onChange={e => setPain(e.target.value)} />
              <div className="row"><label className="sr" htmlFor="hub-n-freq">빈도</label>
                <select id="hub-n-freq" value={freq} onChange={e => setFreq(e.target.value)}><option value="">빈도</option>{IDEA_FREQS.map(x => <option key={x}>{x}</option>)}</select>
                <label className="sr" htmlFor="hub-n-min">1회 소요 시간(분)</label>
                <input id="hub-n-min" type="number" min={0} step={1} inputMode="numeric" placeholder="1회 몇 분" style={{ width: 96 }} value={mins} onChange={e => setMins(e.target.value.replace(/[^\d]/g, ''))} /></div>
            </details>
            <div className="row"><label className="sr" htmlFor="hub-n-type">유형</label>
              <select id="hub-n-type" value={type} onChange={e => setType(e.target.value)}><option value="">유형 (선택)</option>{IDEA_TYPES.map(x => <option key={x}>{x}</option>)}</select>
              <button className="btn sm pri" style={{ marginLeft: 'auto' }} type="submit" disabled={busy}>붙이기</button></div>
          </form>
          <ol className="iflow xf" aria-label="아이디어 진행 방법">
            <li><b>공감 모으기</b><span>있으면 좋겠는 걸 한 줄로 붙여요. 공감이 많을수록 앞쪽에 보여요.</span></li>
            <li><b>함께할 사람 찾기 {HAND}</b><span>해 보고 싶으면 &lsquo;만들래요&rsquo;를 눌러요. 여러 명이 함께해도 돼요.</span></li>
            <li><b>만들기</b><span>다 만들어 Marketplace에 올리면 완성이에요.</span></li>
          </ol>
        </div>
        <h2 className="sr">아이디어</h2>
        <div className="sec-h" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="itabs" role="tablist" aria-label="아이디어 보기">
            {tab('live', '모집 중', '공감과 함께 만들 사람을 모으는 아이디어예요')}
            {tab('make', '제작 중', '함께하는 사람들이 만들고 있는 아이디어예요')}
            {tab('done', '완성', '다 만들어 Marketplace에 올린 아이디어예요')}
            {tab('arch', '보관함', `${IDEA_ARCHIVE_DAYS / 30}개월 동안 만들 사람이 없으면 자동으로 보관돼요`)}
          </div>
          <label className="psearch"><span className="sr">아이디어 검색</span><input type="search" id="hub-n-q" placeholder="아이디어 검색" value={q} onChange={e => setQ(e.target.value)} /></label>
        </div>
        {api.data.ideasError ? <ListError what="Idea Board" message={api.data.ideasError} /> : <div className="wall" id="hub-wall" role="tabpanel">
          {rows.length ? rows.map(i => view !== 'arch' ? <Note key={i.id} api={api} idea={i} /> : (
            <article key={i.id} className="pn t-etc archived">
              <div className="pn-row"><span className="pn-ty">보관됨</span><span className="pn-old" style={{ color: 'var(--ink2)' }}>{mmdd(archivedOn(i))}</span></div>
              <Go go={api.go} view="idea" id={i.id} className="open"><b>{i.title}</b></Go>
              <div className="acts">{i.author && i.author.id === api.me.id ? <button type="button" className="pn-pill" onClick={() => { api.reviveIdea(i.id).catch(() => undefined); }}>보관 해제</button> : <span className="who">{i.author ? i.author.name : ''}</span>}</div>
            </article>
          )) : <p className="note">{empty}</p>}
        </div>}
      </div></div>
    </div>
  );
}

/* ---------- 아이디어 상세 ---------- */
function CommentItem(props: { api: IHubApi; c: IReaction; authorId?: number }): JSX.Element {
  const { api, c } = props;
  const mine = !!(c.author && c.author.id === api.me.id);
  const [edit, setEdit] = React.useState(false);
  const [ask, setAsk] = React.useState(false);
  const [draft, setDraft] = React.useState(c.body);
  const [busy, setBusy] = React.useState(false);
  const save = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!draft.trim() || draft.trim() === c.body) { setEdit(false); return; }
    setBusy(true);
    const ok = await api.editComment(c.id, draft.trim());
    setBusy(false);
    if (ok) { setEdit(false); }
  };
  return (
    <li><Av p={c.author} me={api.me.id} badge={api.avatarOf(c.author)} /><div className="cbody">
      <p className="chead"><b><Person p={c.author} /></b>{c.author && c.author.id === props.authorId ? <span className="cown">작성자</span> : null}<small>{mmdd(c.created)}</small>
        {mine && !edit && !ask ? <span className="cact"><button type="button" onClick={() => { setDraft(c.body); setEdit(true); }}>수정</button><button type="button" onClick={() => setAsk(true)}>삭제</button></span> : null}</p>
      {edit ? (
        <form className="cedit" onSubmit={e => { save(e).catch(() => undefined); }}><label className="sr" htmlFor={`hub-ce-${c.id}`}>댓글 수정</label>
          <input id={`hub-ce-${c.id}`} value={draft} autoComplete="off" onChange={e => setDraft(e.target.value)} /><button className="btn sm pri" disabled={busy}>저장</button><button type="button" className="btn sm" onClick={() => setEdit(false)}>취소</button></form>
      ) : <p className="ctext">{c.body}</p>}
      {ask ? <div className="cconf" role="group" aria-label="댓글 삭제 확인"><span>이 댓글을 지울까요?</span>
        <button type="button" className="btn sm pri" disabled={busy} onClick={() => { setBusy(true); api.deleteComment(c.id).then(ok => { if (!ok) { setBusy(false); setAsk(false); } }, () => setBusy(false)); }}>삭제</button>
        <button type="button" className="btn sm" onClick={() => setAsk(false)}>취소</button></div> : null}
    </div></li>
  );
}

export function IdeaPage(props: { api: IHubApi; idea?: IIdea }): JSX.Element {
  const { api } = props;
  const i = props.idea;
  const [text, setText] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [stopAsk, setStopAsk] = React.useState(false);
  const [delAsk, setDelAsk] = React.useState(false);
  if (!i) {
    return <div className="wrap"><Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Idea Board', view: 'ideas' }, { label: '아이디어' }]} />
      <Empty title="이 아이디어를 찾을 수 없어요." actions={<Go go={api.go} view="ideas" className="btn">Idea Board로</Go>} /></div>;
  }
  const makers = api.makers(i.id);
  const st = api.stageOf(i);
  const started = api.started(i.id);
  const likes = api.likeCount('Idea', i.id);
  const liked = api.liked('Idea', i.id);
  const joined = makers.some(p => p.id === api.me.id);
  const comments = api.comments(i.id);
  const mine = !!(i.author && i.author.id === api.me.id);
  const result = resultOf(api, i.resultRef);
  const monthly = ideaMonthlyMinutes(i);
  const kd = i.type && i.type !== '기타' ? i.type : '';
  const steps = ['공감 모으기', '함께할 사람 찾기', (kd ? kd + ' ' : '') + '만들기'];
  const cur = st === 'done' ? 3 : started ? 2 : (likes >= IDEA_LIKE_GOAL || makers.length) ? 1 : 0;
  const pct = cur === 0 ? Math.round(Math.min(likes / IDEA_LIKE_GOAL, 1) * 45) : cur === 1 ? (makers.length ? 40 : 20) : 100;
  const days = daysSince(i.created, api.now);
  const chat = makers.map(p => p.email).filter(isEmail);
  // 시작한 사람은 따로 남지 않아서, 함께 만드는 사람이면 누구나 멈출 수 있습니다
  const startedByMe = !!started && joined;
  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { return; }
    setBusy(true);
    const ok = await api.addComment(i.id, t);
    setBusy(false);
    if (ok) { setText(''); }
  };
  return (
    <div className="wrap">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Idea Board', view: 'ideas' }, { label: '아이디어' }]} />
      <div className="idw"><div>
        <div className="idboard">
          <div className={`bignote idnote t-${tcls(i.type)}`}>
            {makers.length ? <span className="pn-rib" aria-hidden="true"><span className="pn-tape">{HAND}{makers.length}명 손 들었어요</span></span> : null}
            <div className="idtop"><span className="pn-ty">{i.type || '기타'}</span>
              <span className="idmeta"><Av p={i.author} me={api.me.id} badge={api.avatarOf(i.author)} /><b><Person p={i.author} fallback="" /></b>
                <span>{days}일 전 붙임{makers.length || st === 'done' || st === 'making' ? '' : st === 'archived' ? ' · 보관됨' : ` · ${daysToArchive(i, api.now)}일 뒤 보관`}</span>
                {mine ? <button type="button" className="idedit" onClick={() => api.openIdeaForm(i.id)}>수정</button> : null}
                {mine ? (delAsk ? <span className="cact"><button type="button" onClick={() => { api.deleteIdea(i.id).then(ok => { if (ok) { api.go('ideas'); } else { setDelAsk(false); } }, () => setDelAsk(false)); }}>삭제할까요? 삭제</button><button type="button" onClick={() => setDelAsk(false)}>취소</button></span>
                  : <button type="button" className="idedit" onClick={() => setDelAsk(true)}>삭제</button>) : null}</span></div>
            <h1 className="idtitle">{i.title}</h1>
            {i.detail ? <p className="iddesc">{i.detail}</p> : null}
            {i.pain || i.frequency || i.minutes ? (
              <dl className="idpain">
                {i.pain ? <><dt>지금 겪는 불편</dt><dd>{i.pain}</dd></> : null}
                {i.frequency || i.minutes ? <><dt>얼마나 자주</dt><dd>{[i.frequency, i.minutes ? `한 번에 ${i.minutes}분` : ''].filter(x => !!x).join(' · ')}
                  {monthly ? <> · 만들면 한 달에 약 <b>{monthly >= 60 ? `${Math.round(monthly / 6) / 10}시간` : `${monthly}분`}</b> 아껴요</> : null}</dd></> : null}
              </dl>
            ) : null}
          </div>
          {st === 'archived' ? (
            <p className="archnote">{i.archivedOn || i.status === '보관' ? '보관된 아이디어예요.' : `만드는 사람 없이 ${IDEA_ARCHIVE_DAYS / 30}개월이 지나 보관됐어요.`}{mine ? <> <button type="button" className="btn sm" onClick={() => { api.reviveIdea(i.id).catch(() => undefined); }}>보관 해제</button></> : ' 올린 사람이 보관을 해제할 수 있어요.'}</p>
          ) : (
            <section className="idprog" aria-label="진행 단계"><div className="idbar" aria-hidden="true"><i style={{ ['--p' as string]: pct + '%' } as React.CSSProperties} /></div>
              <ol>{steps.map((x, k) => (
                <li key={k} className={k < cur ? 'done' : k === cur ? 'now' : ''} aria-current={k === cur ? 'step' : undefined}><span className="pdot">{k < cur ? '✓' : k + 1}</span><b>{x}</b>
                  <small>{[cur === 0 ? `공감 ${likes} / ${IDEA_LIKE_GOAL}` : `공감 ${likes}개`,
                    makers.length ? `${makers.length}명 참여` : cur === 1 ? '만들래요로 참여해요' : `공감 ${IDEA_LIKE_GOAL}개부터 시작해요`,
                    st === 'done' ? '완성' : started ? `${mmdd(started.date)} 시작 · ${makers.length}명이 만드는 중` : '참여자가 시작을 누르면 넘어가요'][k]}</small></li>
              ))}</ol></section>
          )}
        </div>
        <section className="dsec idcmt" aria-labelledby="hub-cmt-h"><h2 id="hub-cmt-h">댓글 {comments.length}</h2>
          <form className="cform" onSubmit={e => { submit(e).catch(() => undefined); }}><Av p={api.me} me={api.me.id} badge={api.avatarOf(api.me)} />
            <label className="sr" htmlFor="hub-cmt-in">댓글 쓰기</label><input id="hub-cmt-in" className="cmtIn" maxLength={500} placeholder="댓글을 남겨 주세요" autoComplete="off" value={text} onChange={e => setText(e.target.value)} />
            <button className="btn pri" type="submit" disabled={busy || !text.trim()}>등록</button></form>
          <ul className="cmt2">{comments.length ? comments.slice().reverse().map(c => <CommentItem key={c.id} api={api} c={c} authorId={i.author ? i.author.id : undefined} />)
            : <li className="cempty">아직 댓글이 없어요. 궁금한 점이나 필요한 이유를 처음으로 남겨 보세요.</li>}</ul>
        </section>
      </div>
        <aside className="idside"><div className="box idmini">
          <div className="imrow"><span className="iml">공감 <b>{likes}</b></span>
            <button type="button" className={'impill idlikebtn' + (liked ? ' on' : '')} aria-pressed={liked} onClick={() => api.toggleLike('Idea', i.id)}><Heart on={liked} />{liked ? '공감했어요' : '공감'}</button></div>
          <div className="imrow"><span className="iml">함께 만드는 사람 <b>{makers.length}</b></span>
            {st !== 'done' ? <button type="button" className={'impill' + (joined ? ' pri' : '')} aria-pressed={joined} onClick={() => api.toggleMake(i.id)}>{HAND}만들래요</button> : null}</div>
          {makers.length ? <>
            <ul className="impeople">{makers.map(p => <li key={p.id}><Av p={p} me={api.me.id} badge={api.avatarOf(p)} /><span><Person p={p} />{p.id === api.me.id ? ' (나)' : ''}</span></li>)}</ul>
            {chat.length ? <a className="btn imteams" href={`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(chat.join(','))}`} target="_blank" rel="noopener noreferrer">Teams 채팅으로 함께하기</a> : null}
            {st === 'done' ? <div className="imdone"><p>✓ 완성했어요{i.doneAt ? ` · ${mmdd(i.doneAt)}` : ''}</p>{result ? <ResultLink api={api} r={result.view || result.href ? { ...result, label: result.label + ' 보기' } : result} className="btn imteams" /> : null}</div> : null}
            {joined && !started && st !== 'done' ? <button type="button" className="btn pri imteams tipx" data-tip="만들기 시작했으면 눌러 주세요. 다음 단계로 넘어가요" onClick={() => api.toggleStart(i.id)}>만들기 시작하기</button> : null}
            {started && st !== 'done' ? (startedByMe && stopAsk
              ? <div className="imstop" role="group" aria-label="만들기 중지 확인"><p>만들기를 멈출까요? &lsquo;함께할 사람 찾기&rsquo; 단계로 돌아가요.</p><div><button type="button" className="btn sm pri" onClick={() => { setStopAsk(false); api.toggleStart(i.id); }}>중지</button><button type="button" className="btn sm" onClick={() => setStopAsk(false)}>취소</button></div></div>
              : <><p className="imstarted">{mmdd(started.date)}에 만들기 시작했어요</p>{startedByMe ? <button type="button" className="btn imteams imstopbtn" onClick={() => setStopAsk(true)}>만들기 중지</button> : null}</>) : null}
          </> : null}
        </div></aside>
      </div>
    </div>
  );
}
