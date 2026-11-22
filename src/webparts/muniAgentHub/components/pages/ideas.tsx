/* Idea Board (시안 그대로): 포스트잇 붙이기(한 줄 + 자세한 내용), 모집 중 · 제작 중 · 완성 · 보관함 / 아이디어 상세 */
import * as React from 'react';
import { IIdea, IPerson, IReaction } from '../../models/types';
import { IDEA_ARCHIVE_DAYS, IDEA_LIKE_GOAL, IDEA_TYPES, contains, daysSince, daysToArchive, first, ideaStart, isEmail, mmdd } from '../../models/rules';
import { IHubApi } from '../api';
import { Avatar, Crumb, Empty, Go, KindTag, ListError } from '../ui';
import { Mag } from '../mv';
import { Person } from '../persona';
import { BadgeMedal } from '../badge';

const HAND = <svg className="ihd" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V5.5a1.5 1.5 0 0 1 3 0V12M17 11.5V9a1.5 1.5 0 0 1 3 0v5c0 4.2-2.8 7-6.6 7-2.6 0-4.3-1.1-5.7-3.1L4.2 14a1.5 1.5 0 0 1 2.4-1.8L8 14" /></svg>;
/** 댓글·리뷰 좋아요 (시안 c37: 엄지 + 숫자, 누르면 남색) */
const THUMB = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zM7 10l4.2-7.2A2 2 0 0 1 15 4v5h4.6a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 18.3 21H7" /></svg>;
const CMT = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>;
const Heart = (props: { on: boolean }): JSX.Element => <svg viewBox="0 0 24 24" width="15" height="15" fill={props.on ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinejoin="round" aria-hidden="true"><path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z" /></svg>;

function tcls(t: string): string { return t === 'Agent' ? 'agent' : t === 'Skill' ? 'skill' : t === 'HTML' ? 'html' : 'etc'; }
/** 사람 동그라미 (ui.tsx 의 Avatar 와 같음) */
const Av = Avatar;
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
      {c ? <span className="pn-rib" aria-hidden="true"><span className="pn-tape">{HAND}{c}명과 함께해요</span></span> : null}
      <div className="pn-row"><KindTag className="pn-ty" k={i.type || '기타'} />{soon ? <span className="pn-old" title="3개월 동안 만들 사람이 없으면 보관함으로 옮겨져요">{left}일 뒤 보관</span> : null}</div>
      <Go go={api.go} view="idea" id={i.id} className="open"><b>{i.title}</b></Go>
      <span className="who">{i.author ? i.author.name : ''}</span>
      {c ? <span className="pn-hl"><Avs people={makers} me={api.me.id} badgeOf={api.avatarOf} /><span className="sr">{c}명이 함께해요</span></span> : null}
      {st === 'done' && result ? <ResultLink api={api} r={result} className="pn-done" prefix={`✓ ${i.type && i.type !== '기타' ? i.type + ' ' : ''}완성 · `} /> : null}
      <div className="acts">
        <button type="button" className={'pn-pill' + (liked ? ' on' : '')} aria-pressed={liked} aria-label={`공감 ${n}`} title="나도 필요해요 (공감)" onClick={() => api.toggleLike('Idea', i.id)}>{liked ? '♥' : '♡'} <span className="n">{n}</span></button>
        {st !== 'done' ? <button type="button" className={'pn-pill' + (joined ? ' on' : '')} aria-pressed={joined} aria-label={`함께해요, 누른 사람 ${c}명`} title="내가 만들어 볼게요. 여러 명이 함께할 수 있어요" onClick={() => api.toggleMake(i.id)}>{HAND}함께해요{c ? <> <span className="n">{c}</span></> : null}</button> : null}
        <span className="pn-cmt" aria-label={`댓글 ${comments}개`} title={`댓글 ${comments}개`}>{CMT}{comments}</span>
      </div>
    </article>
  );
}

type View = 'live' | 'make' | 'done' | 'arch';
export function IdeaBoard(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const [text, setText] = React.useState('');
  const [type, setType] = React.useState('');
  const [err, setErr] = React.useState('');
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
    if (!t) { setErr('만들고 싶은 것을 한 줄 써 주세요'); (document.getElementById('mv-noteText') as HTMLElement).focus(); return; }
    // 시안 c13: Agent · Skill · HTML · 기타 중 하나는 꼭 골라요
    if (!type) { setErr('Agent, Skill, HTML 중 하나를 골라 주세요'); (document.getElementById('mv-noteCat') as HTMLElement).focus(); return; }
    setBusy(true);
    const ok = await api.addIdea({ title: t, type, detail: '', pain: '', frequency: '', minutes: undefined });
    setBusy(false);
    if (ok) { setText(''); setType(''); setView('live'); }
  };
  const tab = (v: View, label: string, tip: string): JSX.Element => (
    <button type="button" role="tab" aria-selected={view === v} aria-controls="mv-wall" data-tip={tip} onClick={() => setView(v)}>{label} <span>{by[v].length}</span></button>
  );
  // 시안 문구 그대로
  const empty = q.trim() ? `'${q.trim()}'에 맞는 ${view === 'arch' ? '보관된 ' : ''}아이디어가 없어요.${view === 'arch' ? '' : ' 위에서 새로 올려 보세요.'}`
    : view === 'make' ? '아직 만들고 있는 아이디어가 없어요.' : view === 'done' ? '아직 완성된 아이디어가 없어요.' : view === 'arch' ? '보관된 아이디어가 없어요.' : '모으는 중인 아이디어가 없어요. 위에서 새로 올려 보세요.';
  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Idea Board</span><h1>Idea Board</h1><p>필요한 AI 도구 아이디어를 자유롭게 나누고, 관심 있는 동료들과 함께 만들어 보세요.</p></div></div>
      <div className="ib"><div className="ib-main">
        <div className="composer">
          <form className={'note-new' + (type ? ' t-' + tcls(type) : '')} id="mv-noteForm" aria-label="새 아이디어 포스트잇" noValidate={true} onSubmit={e => { post(e).catch(() => undefined); }}>
            <label className="sr" htmlFor="mv-noteText">아이디어 한 줄</label>
            <textarea id="mv-noteText" className="noteText" maxLength={60} rows={2} placeholder={'이런 AI 도구가 있으면 좋겠다!\n자유롭게 아이디어를 적어 보세요.'} aria-describedby="mv-noteErr" aria-invalid={!!err && !text.trim()} value={text}
              onChange={e => { setText(e.target.value.replace(/[\r\n]+/g, ' ')); if (e.target.value.trim() && !type) { setErr(''); } }}
              onKeyDown={e => { if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) { e.preventDefault(); post(e).catch(() => undefined); } }} />
            <p className="nerr" id="mv-noteErr" role="alert" hidden={!err}>{err}</p>
            <div className="row"><label className="sr" htmlFor="mv-noteCat">도구 선택</label>
              <select id="mv-noteCat" aria-required="true" aria-invalid={!!err && !type && !!text.trim()} value={type} onChange={e => { setType(e.target.value); if (e.target.value) { setErr(''); } }}><option value="">도구 선택</option>{IDEA_TYPES.map(x => <option key={x} value={x}>{x === '기타' ? x : x.toUpperCase()}</option>)}</select>
              <button className="btn sm pri" type="submit" disabled={busy}>게시</button><span className="ib2-cnt" id="mv-noteCnt" aria-hidden="true">{text.length} / 60</span></div>
          </form>
          <div className="c20-fw"><p className="c20-ft" id="hub-c20ft">아이디어가 실현될 때까지</p>
            <ol className="iflow xf" aria-labelledby="hub-c20ft">
              <li><b>아이디어 올리기</b><span>직접 만들기 어려운 AI 도구 아이디어를 자유롭게 작성해요.</span></li>
              <li><b><i className="lkq">♡공감</i> 모으기</b><span>필요한 아이디어에 ♡를 눌러<br />공감을 표현해요.</span></li>
              <li><b>{HAND}함께 만들기</b><span>&lsquo;함께해요&rsquo;를 눌러 제작에 참여해요.<br />여러 명이 함께 만들어도 돼요.</span></li>
              <li><b>완성하고 공유하기</b><span>실제 AI 도구를 제작하고<br />완성된 결과물을 동료들과 공유해요.</span></li>
            </ol></div>
        </div>
        <h2 className="sr">아이디어</h2>
        <div className="sec-h" style={{ marginBottom: 14, flexWrap: 'wrap', gap: 10 }}>
          <div className="itabs" role="tablist" aria-label="아이디어 보기">
            {tab('live', '참여 모으는 중', '공감과 같이 만들 사람을 모으고 있어요')}
            {tab('make', '제작 중', '동료들이 함께 만들고 있어요')}
            {tab('done', '제작 완료', '동료들이 제작까지 끝낸 아이디어예요')}
            {tab('arch', '보관됨', `게시된 지 ${IDEA_ARCHIVE_DAYS / 30}개월이 지나 보관된 아이디어예요`)}
          </div>
          <label className="psearch b4-f"><span className="sr">아이디어 검색</span><input type="search" id="hub-n-q" placeholder="아이디어 검색" value={q} onChange={e => setQ(e.target.value)} /><button type="button" className="b4-btn b6-sbtn" aria-label="검색" onClick={() => { const el = document.getElementById('hub-n-q'); if (el) { el.focus(); } }}><Mag /></button></label>
        </div>
        {api.data.ideasError ? <ListError what="Idea Board" message={api.data.ideasError} /> : <div className="wall" id="mv-wall" role="tabpanel">
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
      ) : <><p className="ctext">{c.body}</p>
        {c.commentId ? <button type="button" className={'c37-like' + (c.likedByMe ? ' on' : '')} aria-pressed={!!c.likedByMe} aria-label={`좋아요 ${c.likes || 0}개`} onClick={() => api.toggleCommentLike(c.id)}>{THUMB}<span>{c.likes || 0}</span></button> : null}</>}
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
  const [editing, setEditing] = React.useState(false);
  const [eTitle, setETitle] = React.useState('');
  const [eType, setEType] = React.useState('');
  const [eBusy, setEBusy] = React.useState(false);
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
  // 시안 단계: 아이디어 게시 → 공감 모으기 → 제작자 모으기 → 만들기
  const steps = ['아이디어 게시', '공감 모으기', '제작자 모으기', '만들기'];
  const days = daysSince(i.created, api.now);
  const cur = st === 'done' ? 4 : started ? 3 : (likes >= IDEA_LIKE_GOAL || makers.length) ? 2 : 1;
  const pct = [0, 38, 72, 100, 100][cur];
  const stepNotes: React.ReactNode[] = [
    days ? `${days}일 전 올림` : '오늘 올림',
    cur <= 1 ? `공감 ${likes} / ${IDEA_LIKE_GOAL}` : `공감 ${likes}개`,
    makers.length ? `${makers.length}명이 함께해요` : <>같이 만들 사람을<br />기다려요.</>,
    st === 'done' ? `완성${i.doneAt ? ' · ' + mmdd(i.doneAt) : ''}` : started ? `${mmdd(started.date)} 시작` : <>&lsquo;만들기 시작하기&rsquo;<br />버튼을 눌러 주세요.</>
  ];
  const saveEdit = async (): Promise<void> => {
    const t = eTitle.replace(/\s+/g, ' ').trim();
    if (!t) { api.toast('아이디어를 한 줄 적어 주세요'); return; }
    setEBusy(true);
    const ok = await api.updateIdea(i.id, { title: t, type: eType, detail: i.detail, pain: i.pain, frequency: i.frequency, minutes: i.minutes });
    setEBusy(false);
    if (ok) { setEditing(false); }
  };
  // Teams 채팅 대상: 올린 사람 + 함께해요 누른 사람 (나는 빼고, 메일이 있는 사람만, 중복 없이)
  const chat = ([i.author] as (IPerson | undefined)[]).concat(makers)
    .filter(p => !!p && p.id !== api.me.id && isEmail(p.email)).map(p => p!.email.toLowerCase())
    .filter((m, k, all) => all.indexOf(m) === k);
  // Teams 딥 링크: 메일은 쉼표로 이어 붙이고(쉼표는 인코딩하지 않음), 여러 명이면 아이디어 제목을 채팅방 이름으로
  const chatUrl = chat.length ? `https://teams.microsoft.com/l/chat/0/0?users=${chat.map(encodeURIComponent).join(',')}${chat.length > 1 ? '&topicName=' + encodeURIComponent(i.title.slice(0, 60)) : ''}` : '';
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
          {/* 시안 c31: 보드 포스트잇과 같은 모양. 수정은 포스트잇에서 바로 (c42) */}
          <article className={`pn t-${tcls(editing ? eType : i.type)} c31-pn${editing ? ' c42-on' : ''}${makers.length ? ' hand' : ''}`}>
            {makers.length ? <span className="pn-rib" aria-hidden="true"><span className="pn-tape">{HAND}{makers.length}명과 함께해요</span></span> : null}
            <div className="pn-row">
              {editing ? <select className="c42-ty" aria-label="무엇인가요?" value={eType} onChange={e => setEType(e.target.value)}>{IDEA_TYPES.map(x => <option key={x} value={x}>{x === '기타' ? x : x.toUpperCase()}</option>)}</select>
                : <KindTag className="pn-ty" k={i.type || '기타'} />}
              {st === 'live' && !makers.length ? <span className="pn-old" title="3개월 동안 만들 사람이 없으면 보관함으로 옮겨져요">{daysToArchive(i, api.now)}일 뒤 보관</span> : null}
              {mine && !editing ? <>
                <button type="button" className="idedit" onClick={() => { setETitle(i.title); setEType(i.type || '기타'); setEditing(true); }}>수정</button>
                {delAsk ? <span className="cact"><button type="button" onClick={() => { api.deleteIdea(i.id).then(ok => { if (ok) { api.go('ideas'); } else { setDelAsk(false); } }, () => setDelAsk(false)); }}>삭제할까요? 삭제</button><button type="button" onClick={() => setDelAsk(false)}>취소</button></span>
                  : <button type="button" className="idedit" onClick={() => setDelAsk(true)}>삭제</button>}
              </> : null}
            </div>
            {editing ? (
              <textarea className="c42-in" maxLength={60} rows={3} aria-label="아이디어" autoFocus value={eTitle} onChange={e => setETitle(e.target.value.replace(/[\r\n]+/g, ' '))}
                onKeyDown={e => { if (e.key === 'Enter' && !(e.nativeEvent as KeyboardEvent).isComposing) { e.preventDefault(); saveEdit().catch(() => undefined); } else if (e.key === 'Escape') { setEditing(false); } }} />
            ) : <h1 className="c31-t"><b>{i.title}</b></h1>}
            {!editing ? <span className="who"><Av p={i.author} me={api.me.id} badge={api.avatarOf(i.author)} /><b><Person p={i.author} fallback="" /></b><span>{days ? `${days}일 전 올림` : '오늘 올림'}</span></span> : null}
            {editing ? (
              <div className="c42-bar"><button type="button" className="c42-x" onClick={() => setEditing(false)}>취소</button><button type="button" className="c42-ok" disabled={eBusy} onClick={() => { saveEdit().catch(() => undefined); }}>{eBusy ? '저장 중…' : '저장'}</button></div>
            ) : (
              <div className="acts">
                <button type="button" className={'pn-pill' + (liked ? ' on' : '')} aria-pressed={liked} aria-label={`공감 ${likes}`} title="나도 필요해요 (공감)" onClick={() => api.toggleLike('Idea', i.id)}>{liked ? '♥' : '♡'} <span className="n">{likes}</span></button>
                {st !== 'done' ? <button type="button" className={'pn-pill' + (joined ? ' on' : '')} aria-pressed={joined} aria-label={`함께해요, 누른 사람 ${makers.length}명`} title="내가 만들어 볼게요. 여러 명이 함께할 수 있어요" onClick={() => api.toggleMake(i.id)}>{HAND}함께해요{makers.length ? <> <span className="n">{makers.length}</span></> : null}</button> : null}
                <span className="pn-cmt" aria-label={`댓글 ${comments.length}개`} title={`댓글 ${comments.length}개`}>{CMT}{comments.length}</span>
              </div>
            )}
          </article>
          {st === 'archived' ? (
            <p className="archnote">{i.archivedOn || i.status === '보관' ? '보관된 아이디어예요.' : `만드는 사람 없이 ${IDEA_ARCHIVE_DAYS / 30}개월이 지나 보관됐어요.`}{mine ? <> <button type="button" className="btn sm" onClick={() => { api.reviveIdea(i.id).catch(() => undefined); }}>보관 해제</button></> : ' 올린 사람이 보관을 해제할 수 있어요.'}</p>
          ) : (
            <section className="idprog" aria-label="진행 단계"><div className="idbar" aria-hidden="true"><i style={{ ['--p' as string]: pct + '%' } as React.CSSProperties} /></div>
              <ol>{steps.map((x, k) => (
                <li key={k} className={k < cur ? 'done' : k === cur ? 'now' : ''} aria-current={k === cur ? 'step' : undefined}><span className="pdot">{k < cur ? '✓' : k + 1}</span><b>{x}</b>
                  <small>{stepNotes[k]}</small></li>
              ))}</ol></section>
          )}
        </div>
        <section className="dsec idcmt" aria-labelledby="hub-cmt-h"><h2 id="hub-cmt-h">댓글 {comments.length}</h2>
          <form className="cform" id="mv-cmtForm" onSubmit={e => { submit(e).catch(() => undefined); }}><Av p={api.me} me={api.me.id} badge={api.avatarOf(api.me)} />
            <label className="sr" htmlFor="mv-cmtIn">댓글 쓰기</label>
            <textarea id="mv-cmtIn" className="cmtIn" rows={1} maxLength={500} placeholder="댓글을 남겨 주세요" autoComplete="off" value={text}
              onChange={e => { setText(e.target.value); const t = e.target; t.style.height = 'auto'; t.style.height = Math.max(44, Math.min(t.scrollHeight + 2, 180)) + 'px'; }} />
            <button className="btn pri" id="mv-cmtBtn" type="submit" disabled={busy || !text.trim()}>등록</button></form>
          <ul className="cmt2" id="mv-cmtList">{comments.length ? comments.slice().reverse().map(c => <CommentItem key={c.id} api={api} c={c} authorId={i.author ? i.author.id : undefined} />)
            : <li className="cempty">아직 댓글이 없어요. 궁금한 점이나 필요한 이유를 처음으로 남겨 보세요.</li>}</ul>
        </section>
      </div>
        <aside className="idside"><div className="box idmini">
          <div className="imrow"><span className="iml">공감 <b>{likes}</b><small className="ib2-h">나도 필요하면 눌러요</small></span>
            <button type="button" className={'impill idlikebtn' + (liked ? ' on' : '')} aria-pressed={liked} onClick={() => api.toggleLike('Idea', i.id)}><Heart on={liked} />{liked ? '공감했어요' : '공감'}</button></div>
          <div className="imrow"><span className="iml">함께 만드는 사람 <b>{makers.length}</b><small className="ib2-h">{makers.length ? '같이 만들 수 있으면 눌러요' : <>만들 수 있으면 먼저 &lsquo;함께해요&rsquo;를 눌러요</>}</small></span>
            {st !== 'done' ? <button type="button" className={'impill' + (joined ? ' pri' : '')} aria-pressed={joined} onClick={() => api.toggleMake(i.id)}>{HAND}함께해요</button> : null}</div>
          {makers.length ? <>
            <ul className="impeople">{makers.map(p => <li key={p.id}><Av p={p} me={api.me.id} badge={api.avatarOf(p)} /><span><Person p={p} />{p.id === api.me.id ? ' (나)' : ''}</span></li>)}</ul>
            {chatUrl ? <button type="button" className="btn imteams" onClick={() => { window.open(chatUrl, '_blank', 'noopener'); }}>Teams 채팅으로 함께하기</button> : null}
            {st === 'done' ? <div className="imdone"><p>✓ 완성했어요{i.doneAt ? ` · ${mmdd(i.doneAt)}` : ''}</p>{result ? <ResultLink api={api} r={result.view || result.href ? { ...result, label: result.label + ' 보기' } : result} className="btn imteams" /> : null}</div> : null}
            {joined && !started && st !== 'done' ? <button type="button" className="btn pri imteams tipx" data-tip="만들기 시작했으면 눌러 주세요. 다음 단계로 넘어가요" onClick={() => api.toggleStart(i.id)}>만들기 시작하기</button> : null}
            {started && st !== 'done' ? (startedByMe && stopAsk
              ? <div className="imstop" role="group" aria-label="만들기 중지 확인"><p>만들기를 멈출까요?<br />&lsquo;제작자 모으기&rsquo; 단계로 돌아가요.</p><div><button type="button" className="btn sm pri" onClick={() => { setStopAsk(false); api.toggleStart(i.id); }}>중지</button><button type="button" className="btn sm" onClick={() => setStopAsk(false)}>취소</button></div></div>
              : <><p className="imstarted">{mmdd(started.date)}에 만들기 시작했어요</p>{startedByMe ? <button type="button" className="btn imteams imstopbtn" onClick={() => setStopAsk(true)}>만들기 중지</button> : null}</>) : null}
          </> : null}
        </div></aside>
      </div>
    </div>
  );
}
