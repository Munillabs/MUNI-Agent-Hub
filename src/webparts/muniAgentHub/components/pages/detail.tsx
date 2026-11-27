/* 상세 화면 (시안 그대로): Agent · Skill · HTML — 머리말, 요약 지표, 탭(개요 · 상세 정보 · 리뷰 · 업데이트 기록) */
import * as React from 'react';
import { IAgent, IHtmlTool, IImage, IPerson, ISkill, IVersion, TargetType } from '../../models/types';
import { extLabel, first, isEmail, isHttpsUrl, mmdd, splitLines, ymd } from '../../models/rules';
import { IHubApi } from '../api';
import { Clamp, Crumb, DetailTabs, Empty, Go, RatingSummary } from '../ui';
import { Person } from '../persona';
import { BadgeMedal } from '../badge';
import { thumbBg } from './market';

/** '이럴 때 써요': 한 줄에 하나씩. 줄 앞에 붙인 -, •, ·, 1. 같은 표시는 뗍니다 */
function whenList(v: string): string[] {
  return splitLines(v).map(x => x.replace(/^([-*•·]|\d+[.)])\s*/, '')).filter(x => !!x);
}

/** 정보 상자 아래 'Teams로 묻기' (시안 askbtn): Owner·Sponsor·등록자에게 Teams 채팅 */
export function AskBtn(props: { api: IHubApi; who: (IPerson | undefined)[]; tip: string; label?: string }): JSX.Element {
  const mails = props.who.filter(p => !!p && isEmail(p.email)).map(p => p!.email).filter((m, i, all) => all.indexOf(m) === i);
  return (
    <button type="button" className="btn sm askbtn tipx" data-tip={props.tip}
      onClick={() => { if (mails.length) { window.open(`https://teams.microsoft.com/l/chat/0/0?users=${mails.map(encodeURIComponent).join(',')}`, '_blank', 'noopener'); } else { props.api.toast('연락할 사람의 메일 주소가 없어요.'); } }}>{props.label || 'Teams로 묻기'}</button>
  );
}
function useTab(init: string, key: number): [string, (k: string) => void] {
  const [tab, setTab] = React.useState(init);
  React.useEffect(() => { setTab(init); }, [key]);
  return [tab, setTab];
}
/** '이름 · 설명' 한 줄 → 이름 굵게 */
export function NameLine(props: { text: string }): JSX.Element {
  const i = props.text.indexOf(' · ');
  return i > 0 ? <li><b>{props.text.slice(0, i)}</b><span>{props.text.slice(i + 3)}</span></li> : <li><b>{props.text}</b></li>;
}
/** 상세 정보 탭의 값 칸 (비면 '없음') */
export function MpdValue(props: { title: string; value: string }): JSX.Element {
  return <section className={'grp' + (props.value ? '' : ' mpd-empty')}><h2>{props.title}</h2>{props.value ? <p className="mpd-v">{props.value}</p> : <p className="mpd-none">없음</p>}</section>;
}
/** 상세 정보 탭의 목록 칸 (제목 + 개수, 비면 '없음') */
export function MpdGroup(props: { title: string; items: JSX.Element[] }): JSX.Element {
  const n = props.items.length;
  return (
    <section className={'grp' + (n ? '' : ' mpd-empty')}><h2>{props.title}{n ? <span className="cnt">{n}</span> : null}</h2>
      {n ? <ul className="plain">{props.items}</ul> : <p className="mpd-none">없음</p>}</section>
  );
}
/** '제작자는 이렇게 썼어요': 글 + 이미지 최대 2장 (첨부 파일 result1.* · result2.*).
    올린 이미지만 칸 크기에 맞춰 보여 줍니다(넣지 않았으면 이미지 칸 없음). 이미지 넣기 · 바꾸기 · 빼기는 '나의 작업공간'의 수정 창에서 합니다. */
function MakerNote(props: { text: string; images?: IImage[]; stamp?: string }): JSX.Element | null {
  const images = (props.images || []).slice().sort((a, b) => a.slot - b.slot);
  if (!props.text.trim() && !images.length) { return null; }
  // 같은 이름으로 바꾸면 브라우저가 예전 그림을 보여 줘서, 수정한 때를 주소 끝에 붙입니다
  const urlOf = (im: IImage): string => `${im.url}?v=${encodeURIComponent(props.stamp || '')}`;
  return (
    <section className="dsec"><h2>제작자는 이렇게 썼어요</h2>
      <article className="mnote">
        {props.text.split(/\r?\n/).filter(x => !!x.trim()).map((p, k) => <p key={k}>{p}</p>)}
        {images.length ? <div className="mimgs">{images.map(im => (
          <div key={im.slot} className="shot">
            <a href={urlOf(im)} target="_blank" rel="noopener noreferrer" title="원본 크기로 보기"><img src={urlOf(im)} alt={`결과 이미지 ${im.slot}`} /></a>
          </div>
        ))}</div> : null}
      </article></section>
  );
}

/* ---------- 리뷰 ---------- */
/** 시험 기간에는 내가 올린 Agent·Skill·HTML에도 리뷰(별점·댓글)를 남길 수 있게 둡니다. 오픈 전에 false로 바꾸세요. */
const ALLOW_SELF_REVIEW = true;
const STAR_PATH = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.87l-5.5 2.88 1.05-6.12L3.1 9.3l6.15-.9z';
const STAR_LAB = ['', '별로예요', '아쉬워요', '보통이에요', '좋아요', '최고예요'];
const THUMB = <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 10v11H4a1 1 0 0 1-1-1v-9a1 1 0 0 1 1-1h3zM7 10l4.2-7.2A2 2 0 0 1 15 4v5h4.6a2 2 0 0 1 2 2.3l-1.3 8A2 2 0 0 1 18.3 21H7" /></svg>;
/** 리뷰 (MUNIVERSE 시안 c16·c35·c37): 별점 + 한 칸 쓰기 → 별점 · 내용 · 좋아요 · 작성자 · 날짜 */
function Reviews(props: { api: IHubApi; t: TargetType; id: number; mine: boolean }): JSX.Element {
  const { api } = props;
  const list = api.reviews(props.t, props.id);
  const r = api.rating(props.t, props.id);
  const [n, setN] = React.useState(0);
  const [text, setText] = React.useState('');
  const [edit, setEdit] = React.useState<string>('');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const tx = React.useRef<HTMLTextAreaElement>(null);
  const starRef = React.useRef<HTMLDivElement>(null);
  const reset = (): void => { setN(0); setText(''); setEdit(''); setErr(''); };
  const fit = (t: HTMLTextAreaElement): void => { t.style.height = 'auto'; t.style.height = Math.max(44, Math.min(t.scrollHeight + 2, 180)) + 'px'; };
  const iHave = list.some(x => !!x.author && x.author.id === api.me.id);
  // 리뷰 하나 = 항목 댓글 하나 (별점은 댓글 앞에 함께 저장)
  const submit = async (): Promise<void> => {
    if (props.mine && !ALLOW_SELF_REVIEW) { setErr('내가 올린 것에는 리뷰를 쓸 수 없어요.'); return; }
    if (!n) { setErr('별점을 골라 주세요.'); const b = starRef.current && starRef.current.querySelector('button'); if (b) { b.focus(); } return; }
    if (!text.trim()) { setErr('리뷰 내용을 적어 주세요.'); if (tx.current) { tx.current.focus(); } return; }
    setBusy(true);
    const ok = edit ? await api.editReview(edit, n, text.trim()) : await api.addReview(props.t, props.id, n, text.trim());
    setBusy(false);
    if (ok) { reset(); if (tx.current) { tx.current.style.height = ''; } }
  };
  const hideForm = iHave && !edit;
  return (
    <>
      <div className="sec-h c45-rvh" style={{ marginTop: 8 }}><h2>리뷰 {list.length}</h2></div>
      <RatingSummary reviews={list} avg={r.avg} n={r.n} />
      <form className={'c16-form' + (edit ? ' c16-edit' : '')} noValidate hidden={hideForm} onSubmit={e => { e.preventDefault(); submit().catch(() => undefined); }}>
        <h3 className="c16-h" id={`hub-c16L-${props.id}`}>{edit ? '리뷰 고치기' : '리뷰 작성하기'}</h3>
        <div className="c16-box">
          <div className="c16-stars" role="radiogroup" aria-labelledby={`hub-c16L-${props.id}`} ref={starRef}>
            {[1, 2, 3, 4, 5].map(v => (
              <button key={v} type="button" role="radio" aria-checked={n === v} aria-label={`${v}점`} className={v <= n ? 'on' : undefined} onClick={() => { setN(v); setErr(''); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d={STAR_PATH} /></svg></button>
            ))}
            <span className={'c16-sl' + (n ? ' on' : '')}>{n ? `${n}점 · ${STAR_LAB[n]}` : '별점을 선택해 주세요'}</span>
          </div>
          <label className="sr" htmlFor={`hub-c16T-${props.id}`}>리뷰 내용</label>
          <div className="c16-row">
            <textarea id={`hub-c16T-${props.id}`} ref={tx} className="c16-tx" rows={1} maxLength={200} autoComplete="off" placeholder="이 콘텐츠를 사용해 본 경험을 공유해 주세요."
              value={text} onChange={e => { setText(e.target.value); fit(e.target); }} />
            <button type="button" className="c16-cx" hidden={!edit} onClick={reset}>취소</button>
            <button className="btn pri c16-ok" disabled={busy}>{busy ? '저장 중…' : edit ? '수정 저장' : '등록'}</button>
          </div>
          <p className="c16-err" role="alert" hidden={!err}>{err}</p>
        </div>
      </form>
      <ul className="c16-list">
        {list.length ? list.map(x => {
          const my = !!x.author && x.author.id === api.me.id;
          const st = Math.max(0, Math.min(5, x.rating || 0));
          const badge = api.avatarOf(x.author);
          const name = x.author ? x.author.name : '';
          return (
            <li key={x.id} data-c35="1"><div className="cbody">
              <p className="c16-st" aria-label={`별점 ${st}점`}>{'★★★★★'.slice(0, st) + '☆☆☆☆☆'.slice(0, 5 - st)}<em>{st.toFixed(1)}</em></p>
              {x.body ? <p className="ctext">{x.body}</p> : null}
              {x.commentId ? <button type="button" className={'c37-like' + (x.likedByMe ? ' on' : '')} aria-pressed={!!x.likedByMe} aria-label={`좋아요 ${x.likes || 0}개`} onClick={() => api.toggleCommentLike(x.id)}>{THUMB}<span>{x.likes || 0}</span></button> : null}
              <p className="c35-who"><span className="cav b9-av" aria-hidden="true">{badge && badge !== 'photo' ? <BadgeMedal k={badge} size={22} ribbon={false} /> : <span className="c35-ini">{name.trim().charAt(0)}</span>}</span><b>{name}</b>{my ? <span className="cown">내 리뷰</span> : null}</p>
              <p className="chead c35-ft"><small>{x.created ? mmdd(x.created) : ''}</small>
                {my ? <span className="c16-act"><button type="button" onClick={() => { setEdit(x.id); setN(st); setText(x.body); setErr(''); window.setTimeout(() => { if (tx.current) { tx.current.focus(); fit(tx.current); } }, 0); }}>수정</button></span> : null}</p>
            </div></li>
          );
        }) : <li className="cempty">아직 리뷰가 없어요.</li>}
      </ul>
    </>
  );
}

/* ---------- 업데이트 기록 ---------- */
function Updates(props: { api: IHubApi; t: 'Agent' | 'Skill' | 'Html'; id: number; fallback: IVersion; stamp: string; fileName?: string }): JSX.Element {
  const [list, setList] = React.useState<IVersion[] | undefined>(undefined);
  React.useEffect(() => {
    let live = true;
    setList(undefined);
    // 버전 기록은 보조 정보라 못 읽으면 지금 버전만 보여 줍니다
    props.api.loadVersions(props.t, props.id).then(v => { if (live) { setList(v); } }, () => { if (live) { setList([]); } });
    return () => { live = false; };
  }, [props.id, props.stamp]);
  if (!list) { return <p className="note">기록을 불러오는 중이에요</p>; }
  const rows = list.length ? list : (props.fallback.version ? [props.fallback] : []);
  if (!rows.length) { return <p className="note">아직 업데이트 기록이 없어요.</p>; }
  return (
    // 시안 c44: 버전 | 내용 | 날짜(오른쪽 회색). 버전은 1.0.0.n (가장 오래된 기록이 1, 최신이 맨 위)
    <ul className="vlist big">
      {rows.map((v, k) => <li key={k} data-c44="1"><b title={v.version && v.version !== `1.0.0.${rows.length - k}` ? `저장된 버전: ${v.version}` : undefined}>{`1.0.0.${rows.length - k}`}</b><span className="c44-tx">{v.note || '—'}{props.t === 'Skill' && props.fileName && k === 0 ? ` (${props.fileName})` : ''}</span><span className="c44-dt">{mmdd(v.date)}</span></li>)}
    </ul>
  );
}

function NotFound(props: { api: IHubApi; what: string; back: 'agents' | 'skills' | 'htools' }): JSX.Element {
  return <div className="wrap"><Crumb go={props.api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: '찾을 수 없음' }]} />
    <Empty title={`이 ${props.what}을 찾을 수 없어요.`} actions={<Go go={props.api.go} view={props.back} className="btn">목록으로</Go>}>게시가 내려갔거나 삭제됐을 수 있어요.</Empty></div>;
}
/* 상세 머리말의 작은 버튼 줄(링크 복사 · 내용 복사 · 새 버전 · 삭제)은 시안에 맞춰 없앴습니다.
   새 버전 올리기와 삭제는 '나의 작업공간'의 내 콘텐츠 목록에서 합니다. */

/* ================= Agent ================= */
export function AgentPage(props: { api: IHubApi; agent?: IAgent }): JSX.Element {
  const { api } = props;
  const a = props.agent;
  const [tab, setTab] = useTab('ov', a ? a.id : 0);
  if (!a) { return <NotFound api={api} what="Agent" back="agents" />; }
  const r = api.rating('Agent', a.id);
  const mine = !!(a.owner && a.owner.id === api.me.id);
  const agentByName = (n: string): IAgent | undefined => first(api.data.agents, x => x.title === n);
  const skillByName = (n: string): ISkill | undefined => first(api.data.skills, x => x.title === n);
  const ib = `hub-a${a.id}`;
  return (
    <div className="wrap mh">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: 'Agent', view: 'agents' }, { label: a.title }]} />
      <header className="dp-head">
        {/* 썸네일: AgentList 항목 첨부 파일 thumb.png (없으면 이름 첫 글자) */}
        {a.icon ? <span className="ad-icon dthumb hth icn" aria-hidden="true" style={thumbBg(a.icon.url, a.modified)} />
          : a.thumb ? <span className="ad-icon dthumb hth acap" aria-hidden="true" style={thumbBg(a.thumb.url, a.modified)} />
          : <span className="ad-icon" aria-hidden="true">{a.title.trim().charAt(0)}</span>}
        <div className="dp-title">
          <h1>{a.title}</h1>
          <p className="sub">{a.summary}</p>
        </div>
        <div className="dp-cta">
          {isHttpsUrl(a.installLink)
            ? <a className="btn pri big" href={a.installLink} target="_blank" rel="noopener noreferrer">Teams에서 열기</a>
            : <button type="button" className="btn pri big" disabled={true} title="열기 링크가 아직 없어요">Teams에서 열기</button>}
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'Agent', title: a.title, owner: a.owner, id: a.id }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a><span className="mh-cnt">(평가 {r.n}개)</span></dd></div>
        <div><dt>카테고리</dt><dd className="mh-cat">{a.workType || '—'}</dd></div>
        <div><dt>결과물</dt><dd>{a.output || '—'}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(a.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="Agent 상세" value={tab} onChange={setTab}
        tabs={[{ k: 'ov', label: '개요' }, { k: 'dt', label: '상세 정보' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid">
          <div>
            <section><h2 className="dph">이런 일을 해요</h2>{a.does.length ? <ul className="does">{a.does.map((x, k) => <li key={k}>{x}</li>)}</ul> : <p className="note">아직 소개가 없어요.</p>}</section>
            {/* 결과 이미지: AgentList 항목 첨부 파일 result1.* · result2.* (Owner는 여기서 넣기 · 바꾸기 · 빼기) */}
            <MakerNote text={a.makerNote} images={a.images} stamp={a.modified} />
            {a.prompts.length ? (
              <section className="dsec"><h2>이렇게 말해 보세요</h2>
                <ul className="pex">{a.prompts.map((p, k) => <li key={k}>{a.workTypes[0] ? <span className="ptag">{a.workTypes[0]}</span> : null}<p>{p}</p><button className="btn sm" type="button" onClick={() => api.copy(p, '복사했어요')}>복사</button></li>)}</ul></section>
            ) : null}
          </div>
          <aside className="dp-side"><div className="box"><h3>정보</h3>
            <table className="kv"><tbody>
              <tr><th>사용 범위</th><td>{a.scopes.length ? a.scopes.map(s => s.replace(/\s*(업무용|용)$/, '')).join(' · ') : '—'}</td></tr>
              <tr><th>Owner</th><td><Person p={a.owner} /></td></tr>
              <tr><th>Sponsor</th><td>{a.sponsor ? <Person p={a.sponsor} /> : '—'}</td></tr>
              <tr><th>처음 등록</th><td>{ymd(a.created)}</td></tr>
            </tbody></table>
            <AskBtn api={api} who={[a.owner, a.sponsor]} label="담당자에게 Teams로 문의하기" tip={a.sponsor ? 'Owner, Sponsor에게 Teams 채팅을 열어요' : 'Owner에게 Teams 채팅을 열어요'} /></div></aside>
        </div></section>
      ) : null}
      {tab === 'dt' ? (
        <section className="dp-panel" id={`${ib}-p-dt`} role="tabpanel" aria-labelledby={`${ib}-t-dt`}><div className="mpd">
          {/* Agent 구성 정보: 사용 대상 · 사용 모델 · 실행 방식(비어 있어도 3칸, 빈 칸은 '없음') + 지침(한 줄 전체) */}
          <h3 className="mpd-h">Agent 구성 정보</h3>
          <div className="dstack mpd-grid mpd-g3">
            <MpdValue title="사용 대상" value={a.audience.join(', ')} />
            <MpdValue title="사용 모델" value={a.model.join(', ')} />
            <MpdValue title="실행 방식" value={a.runMode} />
            <section className="grp mpd-full"><h2>지침</h2>{a.instructions ? <Clamp text={a.instructions} more="지침 전체 보기" /> : <p className="mpd-none">공개된 지침이 없어요.</p>}</section>
          </div>
          {/* 연결된 자료와 도구: 비어 있어도 4칸 모두, 빈 칸은 '없음' */}
          <h3 className="mpd-h">연결된 자료와 도구</h3>
          <div className="dstack mpd-grid">
            <MpdGroup title="지식 원본" items={a.knowledge.map((x, k) => <NameLine key={k} text={x} />)} />
            <MpdGroup title="연결 도구 및 커넥터" items={a.actions.map((x, k) => <NameLine key={k} text={x} />)} />
            <MpdGroup title="연결 에이전트" items={a.linkedAgents.map(n => { const x = agentByName(n); return <li key={n}>{x ? <Go go={api.go} view="agent" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; })} />
            <MpdGroup title="Skill" items={a.linkedSkills.map(n => { const x = skillByName(n); return <li key={n}>{x ? <Go go={api.go} view="skill" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; })} />
          </div>
        </div></section>
      ) : null}
      {tab === 'rv' ? <section className="dp-panel" id={`${ib}-p-rv`} role="tabpanel" aria-labelledby={`${ib}-t-rv`}><Reviews api={api} t="Agent" id={a.id} mine={mine} /></section> : null}
      {tab === 'up' ? <section className="dp-panel" id={`${ib}-p-up`} role="tabpanel" aria-labelledby={`${ib}-t-up`}><Updates api={api} t="Agent" id={a.id} stamp={a.modified} fallback={{ version: a.version, note: a.changeNote, date: a.modified }} /></section> : null}
    </div>
  );
}

/* ================= Skill ================= */
export function SkillPage(props: { api: IHubApi; skill?: ISkill }): JSX.Element {
  const { api } = props;
  const k = props.skill;
  const [tab, setTab] = useTab('ov', k ? k.id : 0);
  const [text, setText] = React.useState<string | undefined>(undefined);
  const [err, setErr] = React.useState('');
  const readable = !!k && (k.ext === 'md' || k.ext === 'txt');
  React.useEffect(() => {
    let live = true;
    setText(undefined); setErr('');
    if (k && readable) { api.loadFileText(k.fileRef).then(t => { if (live) { setText(t); } }, e => { if (live) { setErr(e instanceof Error ? e.message : '파일을 읽지 못했어요.'); } }); }
    return () => { live = false; };
  }, [k ? k.id : 0, k ? k.modified : '']);
  if (!k) { return <NotFound api={api} what="Skill" back="skills" />; }
  const r = api.rating('Skill', k.id);
  const mine = !!(k.author && k.author.id === api.me.id);
  const ib = `hub-s${k.id}`;
  return (
    <div id="mv-skillOut" className="wrap mh skillOut">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Skill Store', view: 'skills' }, { label: k.title }]} />
      <header className="dp-head">
        {/* Skill 머리는 썸네일 대신 늘 Skill 아이콘 */}
        <span className="ad-icon sk" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M10 4a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H5V7a1 1 0 0 1 1-1h4z" /></svg></span>
        <div className="dp-title"><h1>{k.title}</h1><p className="sub">{k.summary}</p></div>
        <div className="dp-cta">
          <a className="btn pri big" href={k.fileUrl + '?download=1'} download={k.fileName}>파일 받기</a>
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'Skill', title: k.title, owner: k.author, id: k.id }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a><span className="mh-cnt">(평가 {r.n}개)</span></dd></div>
        <div><dt>카테고리</dt><dd className="mh-cat">{k.area || '—'}</dd></div>
        <div><dt>공유 형식</dt><dd>{extLabel(k.ext)}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(k.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="Skill 상세" value={tab} onChange={setTab} tabs={[{ k: 'ov', label: '개요' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid"><div>
          <section><h2 className="dph">이럴 때 써요</h2><ul className="does">{whenList(k.purpose).map((w, n) => <li key={n}>{w}</li>)}</ul></section>
          <MakerNote text={k.usage} images={k.images} stamp={k.modified} />
          <section className="dsec"><h2>본문</h2>
            {!readable ? <p className="note">Word 문서는 '파일 받기'로 내려받아 확인해 주세요.</p> : err ? <p className="note">{err}</p> : text === undefined ? <p className="note">파일을 불러오는 중이에요</p> : <Clamp text={text} more="전체 보기" />}
          </section>
        </div>
        <aside className="dp-side"><div className="box"><h3>정보</h3>
          <table className="kv"><tbody>
            <tr><th>사용 범위</th><td>{k.scope || '—'}</td></tr>
            <tr><th>활용 도구</th><td>{k.tools.map((t, i) => <React.Fragment key={t}>{i ? <br /> : null}{t}</React.Fragment>)}</td></tr>
            <tr><th>등록자</th><td><Person p={k.author} /></td></tr>
            <tr><th>처음 등록</th><td>{ymd(k.created)}</td></tr>
          </tbody></table>
          <AskBtn api={api} who={[k.author]} label="담당자에게 Teams로 문의하기" tip="등록자에게 Teams 채팅을 열어요" /></div></aside>
        </div></section>
      ) : null}
      {tab === 'rv' ? <section className="dp-panel" id={`${ib}-p-rv`} role="tabpanel" aria-labelledby={`${ib}-t-rv`}><Reviews api={api} t="Skill" id={k.id} mine={mine} /></section> : null}
      {tab === 'up' ? <section className="dp-panel" id={`${ib}-p-up`} role="tabpanel" aria-labelledby={`${ib}-t-up`}><Updates api={api} t="Skill" id={k.id} stamp={k.modified} fileName={k.fileName} fallback={{ version: k.version, note: k.changeNote, date: k.modified }} /></section> : null}
    </div>
  );
}

/* ================= HTML ================= */
export function HtmlPage(props: { api: IHubApi; tool?: IHtmlTool }): JSX.Element {
  const { api } = props;
  const h = props.tool;
  const [tab, setTab] = useTab('ov', h ? h.id : 0);
  if (!h) { return <NotFound api={api} what="HTML" back="htools" />; }
  const r = api.rating('Html', h.id);
  const mine = !!(h.author && h.author.id === api.me.id);
  const ib = `hub-h${h.id}`;
  return (
    <div className="wrap mh">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: 'HTML', view: 'htools' }, { label: h.title }]} />
      <header className="dp-head">
        {h.icon ? <span className="ad-icon dthumb hth icn" aria-hidden="true" style={thumbBg(h.icon.url, h.modified)} />
          : h.thumb ? <span className="ad-icon dthumb hth hcap" aria-hidden="true" style={thumbBg(h.thumb.url, h.modified)} />
          : <span className="ad-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2" /></svg></span>}
        <div className="dp-title"><h1>{h.title}</h1><p className="sub">{h.summary}</p></div>
        <div className="dp-cta">
          <a className="btn pri big" href={h.fileUrl + '?download=1'} download={h.fileName}>파일 받기</a>
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'HTML', title: h.title, owner: h.author, id: h.id }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a><span className="mh-cnt">(평가 {r.n}개)</span></dd></div>
        <div><dt>카테고리</dt><dd className="mh-cat">{h.area || '—'}</dd></div>
        <div><dt>결과물</dt><dd>{h.output || '—'}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(h.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="HTML 상세" value={tab} onChange={setTab} tabs={[{ k: 'ov', label: '개요' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid"><div>
          <section><h2 className="dph">이런 일을 해요</h2><ul className="does">{h.does.map((x, i) => <li key={i}>{x}</li>)}</ul></section>
          <MakerNote text={h.makerNote} images={h.images} stamp={h.modified} />
        </div>
        <aside className="dp-side"><div className="box"><h3>정보</h3>
          <table className="kv"><tbody>
            <tr><th>사용 범위</th><td>{h.scopes.length ? h.scopes.map(s => s.replace(/\s*(업무용|용)$/, '')).join(' · ') : '—'}</td></tr>
            <tr><th>제작 도구</th><td>{h.madeWith || '—'}</td></tr>
            <tr><th>등록자</th><td><Person p={h.author} /></td></tr>
            <tr><th>처음 등록</th><td>{ymd(h.created)}</td></tr>
          </tbody></table>
          <AskBtn api={api} who={[h.author]} label="담당자에게 Teams로 문의하기" tip="등록자에게 Teams 채팅을 열어요" /></div></aside>
        </div></section>
      ) : null}
      {tab === 'rv' ? <section className="dp-panel" id={`${ib}-p-rv`} role="tabpanel" aria-labelledby={`${ib}-t-rv`}><Reviews api={api} t="Html" id={h.id} mine={mine} /></section> : null}
      {tab === 'up' ? <section className="dp-panel" id={`${ib}-p-up`} role="tabpanel" aria-labelledby={`${ib}-t-up`}><Updates api={api} t="Html" id={h.id} stamp={h.modified} fallback={{ version: h.version, note: h.changeNote, date: h.modified }} /></section> : null}
    </div>
  );
}
