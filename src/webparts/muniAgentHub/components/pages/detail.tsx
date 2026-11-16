/* 상세 화면 (시안 그대로): Agent · Skill · HTML — 머리말, 요약 지표, 탭(개요 · 상세 정보 · 리뷰 · 업데이트 기록) */
import * as React from 'react';
import { IAgent, IHtmlTool, IPerson, ISkill, IVersion, TargetType } from '../../models/types';
import { extLabel, first, isEmail, isHttpsUrl, mmdd, ymd } from '../../models/rules';
import { IHubApi } from '../api';
import { Clamp, Crumb, DetailTabs, Empty, Go, Pill, RatingSummary, ReviewRow, StarInput } from '../ui';

function teamsChat(p?: IPerson): string {
  return p && isEmail(p.email) ? `https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(p.email)}` : '';
}
/** 정보 상자 아래 'Teams로 묻기' (시안 askbtn): Owner·Sponsor·등록자에게 Teams 채팅 */
function AskBtn(props: { api: IHubApi; who: (IPerson | undefined)[]; tip: string }): JSX.Element {
  const mails = props.who.filter(p => !!p && isEmail(p.email)).map(p => p!.email).filter((m, i, all) => all.indexOf(m) === i);
  return (
    <button type="button" className="btn sm askbtn tipx" data-tip={props.tip}
      onClick={() => { if (mails.length) { window.open(`https://teams.microsoft.com/l/chat/0/0?users=${encodeURIComponent(mails.join(','))}`, '_blank', 'noopener'); } else { props.api.toast('연락할 사람의 메일 주소가 없어요.'); } }}>Teams로 묻기</button>
  );
}
function useTab(init: string, key: number): [string, (k: string) => void] {
  const [tab, setTab] = React.useState(init);
  React.useEffect(() => { setTab(init); }, [key]);
  return [tab, setTab];
}
/** '이름 · 설명' 한 줄 → 이름 굵게 */
function NameLine(props: { text: string }): JSX.Element {
  const i = props.text.indexOf(' · ');
  return i > 0 ? <li><b>{props.text.slice(0, i)}</b><span>{props.text.slice(i + 3)}</span></li> : <li><b>{props.text}</b></li>;
}
function MakerNote(props: { text: string; images?: { url: string }[] }): JSX.Element | null {
  if (!props.text.trim() && !(props.images && props.images.length)) { return null; }
  return (
    <section className="dsec"><h2>제작자는 이렇게 썼어요</h2>
      <article className="mnote">
        {props.text.split(/\r?\n/).filter(x => !!x.trim()).map((p, k) => <p key={k}>{p}</p>)}
        {props.images && props.images.length ? <div className="mimgs">{props.images.map((im, k) => <div key={k} className="shot"><img src={im.url} alt={`결과 이미지 ${k + 1}`} /></div>)}</div> : null}
      </article></section>
  );
}

/* ---------- 리뷰 ---------- */
/** 시험 기간에는 내가 올린 Agent·Skill·HTML에도 리뷰(별점·댓글)를 남길 수 있게 둡니다. 오픈 전에 false로 바꾸세요. */
const ALLOW_SELF_REVIEW = true;
function Reviews(props: { api: IHubApi; t: TargetType; id: number; mine: boolean }): JSX.Element {
  const { api } = props;
  const list = api.reviews(props.t, props.id);
  const r = api.rating(props.t, props.id);
  const [open, setOpen] = React.useState(false);
  const [n, setN] = React.useState(0);
  const [head, setHead] = React.useState('');
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  // 리뷰 하나 = 항목 댓글 하나 (별점은 댓글 앞에 함께 저장). 한 사람이 여러 개 남길 수 있습니다.
  const submit = async (): Promise<void> => {
    if (!n) { api.toast('별점을 골라 주세요.'); return; }
    if (!head.trim()) { api.toast('한 줄 평을 적어 주세요.'); return; }
    setBusy(true);
    const ok = await api.addReview(props.t, props.id, n, head.trim() + (body.trim() ? '\n' + body.trim() : ''));
    setBusy(false);
    if (ok) { setOpen(false); setN(0); setHead(''); setBody(''); }
  };
  return (
    <>
      <div className="sec-h" style={{ marginTop: 8 }}><h2>평가 및 리뷰</h2>
        <button type="button" className="btn sm" onClick={() => { if (props.mine && !ALLOW_SELF_REVIEW) { api.toast('내가 올린 것에는 리뷰를 쓸 수 없어요.'); } else { setOpen(!open); } }}>리뷰 쓰기</button></div>
      {open ? (
        <div className="rvform">
          <StarInput name={`hub-rv-${props.t}-${props.id}`} value={n} onChange={setN} />
          <input id={`hub-rv-h-${props.id}`} maxLength={40} placeholder="한 줄 평 (예: 할 일 정리가 정확해요)" value={head} onChange={e => setHead(e.target.value)} aria-label="한 줄 평" />
          <textarea id={`hub-rv-b-${props.id}`} maxLength={400} placeholder="어떻게 썼는지 더 적어 주세요 (선택)" value={body} onChange={e => setBody(e.target.value)} aria-label="리뷰 내용" />
          <div className="r"><button type="button" className="btn sm" onClick={() => setOpen(false)}>취소</button><button type="button" className="btn sm pri" disabled={busy} onClick={() => { submit().catch(() => undefined); }}>{busy ? '남기는 중…' : '리뷰 남기기'}</button></div>
        </div>
      ) : null}
      <RatingSummary reviews={list} avg={r.avg} n={r.n} />
      {list.length ? <ul className="rows">{list.map(x => <ReviewRow key={x.id} r={x}
        onEdit={x.author && x.author.id === api.me.id ? (n2, b) => api.editReview(x.id, n2, b) : undefined} />)}</ul> : <p className="note">아직 리뷰가 없어요. 써 보고 첫 리뷰를 남겨 주세요.</p>}
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
    <ul className="vlist big">
      {rows.map((v, k) => props.t === 'Agent'
        ? <li key={k}><b>{v.version}</b><span>{ymd(v.date)}</span><span>{v.note || '—'}</span></li>
        : props.t === 'Skill'
          ? <li key={k}><b>{mmdd(v.date)}</b><span>{props.fileName} · v{v.version}</span><span>{v.note || '—'}</span></li>
          : <li key={k}><b>{mmdd(v.date)}</b><span>v{v.version}</span><span>{v.note || '—'}</span></li>)}
    </ul>
  );
}

function NotFound(props: { api: IHubApi; what: string; back: 'agents' | 'skills' | 'htools' }): JSX.Element {
  return <div className="wrap"><Crumb go={props.api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: '찾을 수 없음' }]} />
    <Empty title={`이 ${props.what}을 찾을 수 없어요.`} actions={<Go go={props.api.go} view={props.back} className="btn">목록으로</Go>}>게시가 내려갔거나 삭제됐을 수 있어요.</Empty></div>;
}
/** 상세 머리말 오른쪽 아래의 작은 버튼 줄: 즐겨찾기, 링크 복사, (올린 사람) 편집·삭제 */
function OwnBar(props: { api: IHubApi; t: TargetType; id: number; view: 'agent' | 'skill' | 'htool'; children?: React.ReactNode }): JSX.Element {
  const { api } = props;
  const on = api.liked(props.t, props.id);
  return (
    <div className="ownbar">
      <button type="button" className="fav" aria-pressed={on} onClick={() => api.toggleLike(props.t, props.id)} title="즐겨찾기 (이 브라우저에 저장)">{on ? '♥' : '♡'} 즐겨찾기</button>
      <button type="button" className="fav" onClick={() => api.copyLink(props.view, props.id)}>링크 복사</button>
      {props.children}
    </div>
  );
}
function DeleteBtn(props:{ onDelete: () => Promise<boolean> }): JSX.Element {
  const [ask, setAsk] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  return ask ? (
    <span className="delask">삭제할까요?
      <button type="button" className="fav" disabled={busy} onClick={() => { setBusy(true); props.onDelete().then(ok => { if (!ok) { setBusy(false); setAsk(false); } }, () => setBusy(false)); }}>삭제</button>
      <button type="button" className="fav" onClick={() => setAsk(false)}>취소</button></span>
  ) : <button type="button" className="fav" onClick={() => setAsk(true)}>삭제</button>;
}

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
    <div className="wrap">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: 'Agent', view: 'agents' }, { label: a.title }]} />
      <header className="dp-head">
        <span className="ad-icon" aria-hidden="true">{a.title.trim().charAt(0)}</span>
        <div className="dp-title">
          <h1>{a.title}</h1>
          <p className="sub">{a.summary}</p>
          <p className="by">{a.tool ? <Pill>{a.tool}</Pill> : null} {a.owner ? <a href={teamsChat(a.owner) || '#'} target="_blank" rel="noopener noreferrer">{a.owner.name}</a> : null}</p>
        </div>
        <div className="dp-cta">
          {isHttpsUrl(a.installLink)
            ? <a className="btn pri big" href={a.installLink} target="_blank" rel="noopener noreferrer">Teams에서 열기</a>
            : <button type="button" className="btn pri big" disabled={true} title="열기 링크가 아직 없어요">Teams에서 열기</button>}
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'Agent', title: a.title, owner: a.owner }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
          <OwnBar api={api} t="Agent" id={a.id} view="agent">{mine ? <button type="button" className="fav" onClick={() => api.go('agentform', a.id)}>소개 편집</button> : null}</OwnBar>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a></dd><small>평가 {r.n}개</small></div>
        <div><dt>업무 유형</dt><dd>{a.workType || '—'}</dd></div>
        <div><dt>결과물</dt><dd>{a.output || '—'}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(a.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="Agent 상세" value={tab} onChange={setTab}
        tabs={[{ k: 'ov', label: '개요' }, { k: 'dt', label: '상세 정보' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid">
          <div>
            <section><h2 className="dph">이런 일을 해요</h2>{a.does.length ? <ul className="does">{a.does.map((x, k) => <li key={k}>{x}</li>)}</ul> : <p className="note">아직 소개가 없어요.</p>}</section>
            <MakerNote text={a.makerNote} images={a.images} />
            {a.prompts.length ? (
              <section className="dsec"><h2>이렇게 말해 보세요</h2>
                <ul className="pex">{a.prompts.map((p, k) => <li key={k}>{a.workType ? <span className="ptag">{a.workType}</span> : null}<p>{p}</p><button className="btn sm" type="button" onClick={() => api.copy(p, '복사했어요')}>복사</button></li>)}</ul></section>
            ) : null}
          </div>
          <aside className="dp-side"><div className="box"><h3>정보</h3>
            <table className="kv"><tbody>
              <tr><th>사용 범위</th><td>{a.scopes.length ? a.scopes.map(s => s.replace(/(업무용|용)$/, '')).join(' · ') : '—'}</td></tr>
              <tr><th>Owner</th><td>{a.owner ? a.owner.name : '—'}</td></tr>
              {a.sponsor ? <tr><th>Sponsor</th><td>{a.sponsor.name}</td></tr> : null}
              <tr><th>처음 등록</th><td>{ymd(a.created)}</td></tr>
            </tbody></table>
            <AskBtn api={api} who={[a.owner, a.sponsor]} tip={a.sponsor ? 'Owner, Sponsor에게 Teams 채팅을 열어요' : 'Owner에게 Teams 채팅을 열어요'} /></div></aside>
        </div></section>
      ) : null}
      {tab === 'dt' ? (
        <section className="dp-panel" id={`${ib}-p-dt`} role="tabpanel" aria-labelledby={`${ib}-t-dt`}><div className="dstack">
          <section className="grp"><h2>지침</h2>{a.instructions ? <Clamp text={a.instructions} more="지침 전체 보기" /> : <p className="note">공개된 지침이 없어요.</p>}</section>
          <section className="grp"><h2>참조 지식<span className="cnt">{a.knowledge.length}</span></h2><ul className="plain">{a.knowledge.map((x, k) => <NameLine key={k} text={x} />)}</ul></section>
          <section className="grp"><h2>사용 도구<span className="cnt">{a.actions.length}</span></h2><ul className="plain">{a.actions.map((x, k) => <NameLine key={k} text={x} />)}</ul></section>
          <section className="grp"><h2>연결된 Agent<span className="cnt">{a.linkedAgents.length}</span></h2><ul className="plain">{a.linkedAgents.map(n => { const x = agentByName(n); return <li key={n}>{x ? <Go go={api.go} view="agent" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; })}</ul></section>
          <section className="grp"><h2>Skill<span className="cnt">{a.linkedSkills.length}</span></h2><ul className="plain">{a.linkedSkills.map(n => { const x = skillByName(n); return <li key={n}>{x ? <Go go={api.go} view="skill" id={x.id}><b>{n}</b></Go> : <b>{n}</b>}</li>; })}</ul></section>
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
    <div className="wrap skillOut">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Skill Store', view: 'skills' }, { label: k.title }]} />
      <header className="dp-head">
        <span className="ad-icon sk" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"><path d="M10 4a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H5V7a1 1 0 0 1 1-1h4z" /></svg></span>
        <div className="dp-title"><h1>{k.title}</h1><p className="sub">{k.summary}</p><p className="by"><Pill>Skill</Pill> {k.author ? <a href={teamsChat(k.author) || '#'} target="_blank" rel="noopener noreferrer">{k.author.name}</a> : null}</p></div>
        <div className="dp-cta">
          <a className="btn pri big" href={k.fileUrl + '?download=1'} download={k.fileName}>파일 받기</a>
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'Skill', title: k.title, owner: k.author }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
          <OwnBar api={api} t="Skill" id={k.id} view="skill">
            {readable ? <button type="button" className="fav" disabled={text === undefined} onClick={() => api.copy(text || '', 'Skill 내용을 복사했어요')}>내용 복사</button> : null}
            {mine ? <button type="button" className="fav" onClick={() => api.openSkillForm(k.id)}>새 버전</button> : null}
            {mine ? <DeleteBtn onDelete={() => api.deleteSkill(k.id)} /> : null}
          </OwnBar>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a></dd><small>평가 {r.n}개</small></div>
        <div><dt>업무 분야</dt><dd>{k.area || '—'}</dd></div>
        <div><dt>공유 형식</dt><dd>{extLabel(k.ext)}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(k.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="Skill 상세" value={tab} onChange={setTab} tabs={[{ k: 'ov', label: '개요' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid"><div>
          <section><h2 className="dph">이럴 때 써요</h2><ul className="does"><li>{k.purpose}</li><li>{k.summary}</li></ul></section>
          <MakerNote text={k.usage} />
          <section className="dsec"><h2>본문</h2>
            {!readable ? <p className="note">Word 문서는 '파일 받기'로 내려받아 확인해 주세요.</p> : err ? <p className="note">{err}</p> : text === undefined ? <p className="note">파일을 불러오는 중이에요</p> : <Clamp text={text} more="전체 보기" />}
          </section>
        </div>
        <aside className="dp-side"><div className="box"><h3>정보</h3>
          <table className="kv"><tbody>
            <tr><th>사용 범위</th><td>{k.scope || '—'}</td></tr>
            <tr><th>활용 도구</th><td>{k.tools.map((t, i) => <React.Fragment key={t}>{i ? <br /> : null}{t}</React.Fragment>)}</td></tr>
            <tr><th>등록자</th><td>{k.author ? k.author.name : '—'}</td></tr>
            <tr><th>처음 등록</th><td>{ymd(k.created)}</td></tr>
          </tbody></table>
          <AskBtn api={api} who={[k.author]} tip="등록자에게 Teams 채팅을 열어요" /></div></aside>
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
    <div className="wrap">
      <Crumb go={api.go} items={[{ label: 'Home', view: 'home' }, { label: 'Marketplace', view: 'market' }, { label: 'HTML', view: 'htools' }, { label: h.title }]} />
      <header className="dp-head">
        <span className="ad-icon" aria-hidden="true"><svg viewBox="0 0 24 24" width="44" height="44" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2" /></svg></span>
        <div className="dp-title"><h1>{h.title}</h1><p className="sub">{h.summary}</p><p className="by"><Pill>HTML</Pill> {h.author ? <a href={teamsChat(h.author) || '#'} target="_blank" rel="noopener noreferrer">{h.author.name}</a> : null}</p></div>
        <div className="dp-cta">
          <button type="button" className="btn pri big" onClick={() => api.openHtml(h)}>열기 ↗</button>
          <a className="rlink" href="#report" onClick={e => { e.preventDefault(); api.openReport({ type: 'HTML', title: h.title, owner: h.author }); }}><span aria-hidden="true">⚠</span> 오류 신고</a>
          <OwnBar api={api} t="Html" id={h.id} view="htool">
            {mine ? <button type="button" className="fav" onClick={() => api.openHtmlForm(h.id)}>새 버전</button> : null}
            {mine ? <DeleteBtn onDelete={() => api.deleteHtml(h.id)} /> : null}
          </OwnBar>
        </div>
      </header>
      <dl className="dp-meta">
        <div><dt>평점</dt><dd><a href={`#${ib}-p-rv`} className="mlink" onClick={e => { e.preventDefault(); setTab('rv'); }}>{r.n ? `★ ${r.avg.toFixed(1)}` : '★ –'}</a></dd><small>평가 {r.n}개</small></div>
        <div><dt>업무 유형</dt><dd>{h.workType || '—'}</dd></div>
        <div><dt>결과물</dt><dd>{h.output || '—'}</dd></div>
        <div><dt>최근 업데이트</dt><dd>{mmdd(h.modified)}</dd></div>
      </dl>
      <DetailTabs idBase={ib} label="HTML 상세" value={tab} onChange={setTab} tabs={[{ k: 'ov', label: '개요' }, { k: 'rv', label: '리뷰', n: r.n }, { k: 'up', label: '업데이트 기록' }]} />
      {tab === 'ov' ? (
        <section className="dp-panel" id={`${ib}-p-ov`} role="tabpanel" aria-labelledby={`${ib}-t-ov`}><div className="dgrid"><div>
          <section><h2 className="dph">이런 일을 해요</h2><ul className="does">{h.does.map((x, i) => <li key={i}>{x}</li>)}</ul></section>
          <MakerNote text={h.makerNote} />
        </div>
        <aside className="dp-side"><div className="box"><h3>정보</h3>
          <table className="kv"><tbody>
            <tr><th>사용 범위</th><td>{h.scope ? h.scope.replace(/ 업무용$/, '') : '—'}</td></tr>
            <tr><th>제작 도구</th><td>{h.madeWith || '—'}</td></tr>
            <tr><th>등록자</th><td>{h.author ? h.author.name : '—'}</td></tr>
            <tr><th>처음 등록</th><td>{ymd(h.created)}</td></tr>
          </tbody></table>
          <AskBtn api={api} who={[h.author]} tip="등록자에게 Teams 채팅을 열어요" /></div></aside>
        </div></section>
      ) : null}
      {tab === 'rv' ? <section className="dp-panel" id={`${ib}-p-rv`} role="tabpanel" aria-labelledby={`${ib}-t-rv`}><Reviews api={api} t="Html" id={h.id} mine={mine} /></section> : null}
      {tab === 'up' ? <section className="dp-panel" id={`${ib}-p-up`} role="tabpanel" aria-labelledby={`${ib}-t-up`}><Updates api={api} t="Html" id={h.id} stamp={h.modified} fallback={{ version: h.version, note: h.changeNote, date: h.modified }} /></section> : null}
    </div>
  );
}
