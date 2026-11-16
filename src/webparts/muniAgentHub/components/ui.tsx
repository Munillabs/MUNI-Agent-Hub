/* 공통 화면 요소 (시안 마크업과 같은 클래스): 아이콘, 위치 표시, 배지, 별점, 리뷰, 탭, 모달, 댓글, 알림 */
import * as React from 'react';
import { HubView, IReaction } from '../models/types';
import { mmdd, stars } from '../models/rules';

/* ---------- 아이콘 (선 아이콘, currentColor) ---------- */
function Svg(props: { d: React.ReactNode; size?: number; w?: number }): JSX.Element {
  const s = props.size || 17;
  return (
    <svg className="ni" viewBox="0 0 24 24" width={s} height={s} aria-hidden="true" focusable="false"
      fill="none" stroke="currentColor" strokeWidth={props.w || 1.7} strokeLinecap="round" strokeLinejoin="round">{props.d}</svg>
  );
}
export const IconHome = (): JSX.Element => <Svg d={<path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" />} />;
export const IconMarket = (): JSX.Element => <Svg d={<><path d="M4 9l1.5-5h13L20 9" /><path d="M4 9h16v2a3 3 0 0 1-5.3 1.9A3 3 0 0 1 12 14a3 3 0 0 1-2.7-1.1A3 3 0 0 1 4 11z" /><path d="M5 13v7h14v-7" /></>} />;
export const IconIdeas = (): JSX.Element => <Svg d={<><path d="M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v9l-6 6H5a1 1 0 0 1-1-1z" /><path d="M14 20v-5a1 1 0 0 1 1-1h5M8 9h8M8 12h4" /></>} />;
export const IconCases = (): JSX.Element => <Svg d={<><path d="M12 6.5C10.3 5.2 7.8 4.5 4 4.5v13c3.8 0 6.3.7 8 2 1.7-1.3 4.2-2 8-2v-13c-3.8 0-6.3.7-8 2z" /><path d="M12 6.5v13" /></>} />;
export const IconMaker = (): JSX.Element => <Svg d={<><path d="M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.7 3h10.6a2 2 0 0 0 1.7-3l-5-9V3" /><path d="M7.5 15h9" /></>} />;
export const IconSearch = (): JSX.Element => <Svg d={<><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4.5 4.5" /></>} />;
export const IconBell = (): JSX.Element => <Svg d={<><path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></>} />;
export const IconAgent = (props: { size?: number }): JSX.Element => <Svg size={props.size || 22} w={1.6} d={<><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 4v4M9 13v1M15 13v1M10 17h4" /><circle cx="12" cy="3.5" r="1" /></>} />;
export const IconSkill = (props: { size?: number }): JSX.Element => <Svg size={props.size || 22} w={1.6} d={<path d="M10 4a2 2 0 1 1 4 0v2h4a1 1 0 0 1 1 1v4h-2a2 2 0 1 0 0 4h2v4a1 1 0 0 1-1 1h-4v-2a2 2 0 1 0-4 0v2H6a1 1 0 0 1-1-1v-4h2a2 2 0 1 0 0-4H5V7a1 1 0 0 1 1-1h4z" />} />;
export const IconHtml = (props: { size?: number }): JSX.Element => <Svg size={props.size || 22} w={1.6} d={<><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 9h18M9 13l-2 2 2 2M15 13l2 2-2 2" /></>} />;
export const IconGrid = (): JSX.Element => <Svg d={<><rect x="4" y="4" width="7" height="7" rx="1.5" /><rect x="13" y="4" width="7" height="7" rx="1.5" /><rect x="4" y="13" width="7" height="7" rx="1.5" /><rect x="13" y="13" width="7" height="7" rx="1.5" /></>} />;
export const IconPlus =(props: { size?: number }): JSX.Element => <Svg size={props.size || 22} w={1.6} d={<path d="M12 5v14M5 12h14" />} />;

export function Pill(props: { children: React.ReactNode; strong?: boolean }): JSX.Element {
  return <span className="pill" style={props.strong ? { borderColor: 'var(--ink)', color: 'var(--ink)', fontWeight: 700 } : undefined}>{props.children}</span>;
}
/** 종류 배지: Agent · Skill · HTML · 아이디어 · 사례 */
export function Kind(props: { k: string }): JSX.Element {
  return <span className="kbadge">{props.k}</span>;
}
export function Soon(props: { children?: React.ReactNode }): JSX.Element {
  return <em className="soon-tag">{props.children || '준비 중'}</em>;
}

/** 해시 링크 (화면 이동) */
export function Go(props: { go: (v: HubView, id?: number) => void; view: HubView; id?: number; className?: string; children: React.ReactNode; label?: string; style?: React.CSSProperties; current?: boolean }): JSX.Element {
  return (
    <a href={'#' + props.view + (props.id ? '-' + props.id : '')} className={props.className} aria-label={props.label} style={props.style} aria-current={props.current ? 'page' : undefined}
      onClick={e => { e.preventDefault(); props.go(props.view, props.id); }}>{props.children}</a>
  );
}

/** 현재 위치: Home › Marketplace › Agent */
export function Crumb(props: { items: { label: string; view?: HubView; id?: number }[]; go: (v: HubView, id?: number) => void }): JSX.Element {
  return (
    <nav className="crumb" aria-label="현재 위치">
      {props.items.map((it, k) => k < props.items.length - 1 && it.view
        ? <React.Fragment key={k}><Go go={props.go} view={it.view} id={it.id}>{it.label}</Go>›</React.Fragment>
        : <span key={k} aria-current="page">{it.label}</span>)}
    </nav>
  );
}

/** 검색어 강조 */
export function Highlight(props: { text: string; q: string }): JSX.Element {
  const q = props.q.trim();
  if (!q) { return <>{props.text}</>; }
  const i = props.text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) { return <>{props.text}</>; }
  return <>{props.text.slice(0, i)}<mark>{props.text.slice(i, i + q.length)}</mark>{props.text.slice(i + q.length)}</>;
}

/* ---------- 별점 ---------- */
export function StarInput(props: { value: number; onChange: (n: number) => void; name: string }): JSX.Element {
  return (
    <span className="starin" role="radiogroup" aria-label="별점">
      {[1, 2, 3, 4, 5].map(n => (
        <label key={n} className={n <= props.value ? 'on' : ''} title={`${n}점`}>
          <input type="radio" name={props.name} id={`${props.name}-${n}`} checked={props.value === n} onChange={() => props.onChange(n)} />
          <span aria-hidden="true">★</span><span className="sr">{n}점</span>
        </label>
      ))}
    </span>
  );
}
export function RatingSummary(props: { reviews: IReaction[]; avg: number; n: number }): JSX.Element {
  return (
    <div className="rating">
      <div><div className="big">{props.n ? props.avg.toFixed(1) : '–'}</div><span style={{ fontSize: 13, color: 'var(--ink2)' }}>5점 만점 · 평가 {props.n}개</span></div>
      <div className="bars">
        {[5, 4, 3, 2, 1].map(s => {
          const c = props.reviews.filter(r => Math.round(r.rating || 0) === s).length;
          return <div key={s}>{s}<i><b style={{ width: props.n ? Math.round(c / props.n * 100) + '%' : 0 }} /></i></div>;
        })}
      </div>
    </div>
  );
}
/** 리뷰 한 줄. onEdit 이 있으면(내 리뷰) 오른쪽 끝 연필로 별점·내용을 고칠 수 있습니다. */
export function ReviewRow(props: { r: IReaction; onEdit?: (rating: number, body: string) => Promise<boolean> }): JSX.Element {
  const r = props.r;
  const lines = r.body.split('\n');
  const [editing, setEditing] = React.useState(false);
  const [n, setN] = React.useState(0);
  const [head, setHead] = React.useState('');
  const [body, setBody] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [err, setErr] = React.useState('');
  const open = (): void => { setN(r.rating || 0); setHead(lines[0] || ''); setBody(lines.slice(1).join('\n')); setErr(''); setEditing(true); };
  const save = async (): Promise<void> => {
    if (!props.onEdit) { return; }
    if (!n) { setErr('별점을 골라 주세요.'); return; }
    if (!head.trim()) { setErr('한 줄 평을 적어 주세요.'); return; }
    setBusy(true);
    const ok = await props.onEdit(n, head.trim() + (body.trim() ? '\n' + body.trim() : ''));
    setBusy(false);
    if (ok) { setEditing(false); }
  };
  if (editing) {
    return (
      <li className="rv-editing">
        <div className="rvform">
          <StarInput name={`hub-rve-${r.id}`} value={n} onChange={setN} />
          <input maxLength={40} placeholder="한 줄 평" value={head} onChange={e => setHead(e.target.value)} aria-label="한 줄 평" />
          <textarea maxLength={400} placeholder="어떻게 썼는지 더 적어 주세요 (선택)" value={body} onChange={e => setBody(e.target.value)} aria-label="리뷰 내용" />
          {err ? <p className="note" role="alert" style={{ margin: 0, color: '#b42318' }}>{err}</p> : null}
          <div className="r"><button type="button" className="btn sm" onClick={() => setEditing(false)}>취소</button>
            <button type="button" className="btn sm pri" disabled={busy} onClick={() => { save().catch(() => undefined); }}>{busy ? '저장하는 중…' : '저장'}</button></div>
        </div>
      </li>
    );
  }
  return (
    <li><span className="t"><b>{r.rating ? stars(r.rating) : ''} {lines[0]}</b>
      <span>{lines.length > 1 ? lines.slice(1).join(' ') + ' · ' : ''}{r.author ? r.author.name : '—'}{r.created ? ' · ' + mmdd(r.created) : ''}</span></span>
      {props.onEdit ? (
        <button type="button" className="rv-edit" onClick={open} aria-label="내 리뷰 고치기" title="고치기">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" /></svg>
        </button>
      ) : null}
    </li>
  );
}

/* ---------- 상세 화면 탭 ---------- */
export function DetailTabs(props: { tabs: { k: string; label: string; n?: number }[]; value: string; onChange: (k: string) => void; idBase: string; label: string }): JSX.Element {
  return (
    <div className="dp-tabs" role="tablist" aria-label={props.label}>
      {props.tabs.map(t => (
        <button key={t.k} type="button" role="tab" id={`${props.idBase}-t-${t.k}`} aria-selected={props.value === t.k} aria-controls={`${props.idBase}-p-${t.k}`}
          tabIndex={props.value === t.k ? 0 : -1} onClick={() => props.onChange(t.k)}>
          {t.label}{t.n !== undefined ? <> <span>{t.n}</span></> : null}
        </button>
      ))}
    </div>
  );
}

/** 긴 글: 처음엔 몇 줄만, '전체 보기'로 펼침 */
export function Clamp(props: { text: string; more: string }): JSX.Element {
  const [open, setOpen] = React.useState(false);
  const long = props.text.length > 220 || props.text.split('\n').length > 5;
  return (
    <>
      <div className={'prompt' + (long && !open ? ' clamp' : '')}>{props.text}</div>
      {long ? <button type="button" className="btn sm" aria-expanded={open} style={{ marginTop: 8 }} onClick={() => setOpen(!open)}>{open ? '접기' : props.more}</button> : null}
    </>
  );
}

/* ---------- 아이디어 댓글 한 줄 (시안: <li><b>이름</b>내용 <small>날짜</small></li>)
   본인 댓글이면 고치기·지우기(두 단계)를 붙입니다. */
export function CommentRow(props: { r: IReaction; onEdit?: (body: string) => Promise<boolean>; onDelete?: () => Promise<boolean> }): JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const [confirming, setConfirming] = React.useState(false);
  const [draft, setDraft] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const save = async (): Promise<void> => {
    const t = draft.trim();
    if (!props.onEdit || !t) { return; }
    if (t === props.r.body) { setEditing(false); return; }
    setBusy(true);
    const ok = await props.onEdit(t);
    setBusy(false);
    if (ok) { setEditing(false); }
  };
  const remove = async (): Promise<void> => {
    if (!props.onDelete) { return; }
    setBusy(true);
    const ok = await props.onDelete();
    if (!ok) { setBusy(false); setConfirming(false); }
  };
  return (
    <li>
      <b>{props.r.author ? props.r.author.name : '나'}</b>{editing ? null : props.r.body} <small>{mmdd(props.r.created)}</small>
      {(props.onEdit || props.onDelete) && !editing ? (
        <span className="cact">
          {confirming ? <><span>삭제할까요?</span><button type="button" className="del" disabled={busy} onClick={() => { remove().catch(() => undefined); }}>삭제</button><button type="button" onClick={() => setConfirming(false)}>취소</button></>
            : <>{props.onEdit ? <button type="button" onClick={() => { setDraft(props.r.body); setEditing(true); }}>편집</button> : null}{props.onDelete ? <button type="button" onClick={() => setConfirming(true)}>삭제</button> : null}</>}
        </span>
      ) : null}
      {editing ? (
        <div className="cedit">
          <textarea id={`hub-c-edit-${props.r.id}`} maxLength={500} value={draft} autoFocus={true} onChange={e => setDraft(e.target.value)} aria-label="댓글 편집" />
          <div><button type="button" className="btn sm" disabled={busy} onClick={() => setEditing(false)}>취소</button><button type="button" className="btn sm pri" disabled={busy || !draft.trim()} onClick={() => { save().catch(() => undefined); }}>저장</button></div>
        </div>
      ) : null}
    </li>
  );
}

/* ---------- 모달 (시안: .modal.on > .mbox > .mhead + .mbody) ---------- */
export function Modal(props: { open: boolean; title: string; sub?: React.ReactNode; width?: number; onClose: () => void; children: React.ReactNode }): JSX.Element | null {
  const ref = React.useRef<HTMLDivElement>(null);
  const last = React.useRef<Element | null>(null);
  React.useEffect(() => {
    if (!props.open) { return undefined; }
    last.current = document.activeElement;
    const t = window.setTimeout(() => {
      const f = ref.current && ref.current.querySelector('.mbody input:not([type=file]):not([type=radio]):not([type=checkbox]), .mbody select, .mbody textarea') as HTMLElement | null;
      if (f) { f.focus(); }
    }, 40);
    const onKey = (e: KeyboardEvent): void => { if (e.key === 'Escape') { props.onClose(); } };
    document.addEventListener('keydown', onKey);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener('keydown', onKey);
      const prev = last.current as HTMLElement | null;
      if (prev && prev.focus) { prev.focus(); }
    };
  }, [props.open]);
  if (!props.open) { return null; }
  return (
    <div className="modal on" role="dialog" aria-modal="true" aria-labelledby="hub-m-title" onMouseDown={e => { if (e.target === e.currentTarget) { props.onClose(); } }}>
      <div className="mbox" ref={ref} style={props.width ? { width: `min(${props.width}px,100%)` } : undefined}>
        <div className="mhead"><div><h2 id="hub-m-title">{props.title}</h2>{props.sub ? <p>{props.sub}</p> : null}</div>
          <button type="button" className="mclose" aria-label={`${props.title} 닫기`} onClick={props.onClose}>✕</button></div>
        <div className="mbody">{props.children}</div>
      </div>
    </div>
  );
}

export function Toast(props: { message: string }): JSX.Element {
  return <div className={'toast' + (props.message ? ' on' : '')} role="status">{props.message}</div>;
}

/** 목록 하나를 읽지 못했을 때 그 화면에만 보이는 안내 (다른 화면은 그대로 열림) */
export function ListError(props: { what: string; message: string; library?: boolean }): JSX.Element {
  const kind = props.library ? '문서 라이브러리' : '목록';
  return <div className="state err-state" role="alert"><b>{props.what} {kind}을 불러오지 못했어요</b><p>{props.message}</p>
    <p style={{ fontSize: 13 }}>다른 메뉴는 그대로 쓸 수 있어요.</p></div>;
}

export function Empty(props:{ title: string; children?: React.ReactNode; actions?: React.ReactNode }): JSX.Element {
  return <div className="empty"><b>{props.title}</b>{props.children ? <span>{props.children}</span> : null}{props.actions ? <div>{props.actions}</div> : null}</div>;
}
