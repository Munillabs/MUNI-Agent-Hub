/* 공통 화면 요소: 무늬 타일, 아이콘, 배지, 측면 패널, 알림 */
import * as React from 'react';
import { catColor, RISK_CLASS } from '../models/rules';

/* ---------- 무늬 타일: 색 = 카테고리, 모양 = 유형 ---------- */
export function Shape(props: { type: string; color: string }): JSX.Element {
  const st = { fill: props.color };
  if (props.type === '정보 조회형') { return <circle cx="20" cy="20" r="14" style={st} />; }
  if (props.type === '데이터 활용형') {
    return <g><path d="M4 25a16 16 0 0 1 32 0z" style={st} /><rect x="4" y="28" width="32" height="5" rx="1" style={st} opacity=".45" /></g>;
  }
  return <path d="M6 35V6a29 29 0 0 1 29 29z" style={st} />;
}

export function Tile(props: { category: string; type: string; large?: boolean }): JSX.Element {
  const c = catColor(props.category);
  return (
    <span className={'tile' + (props.large ? ' lg' : '')} style={{ ['--c' as string]: c } as React.CSSProperties} aria-hidden="true">
      <svg viewBox="0 0 40 40"><Shape type={props.type} color={c} /></svg>
    </span>
  );
}

export function LogoMark(props: { className?: string }): JSX.Element {
  return (
    <svg className={props.className} viewBox="0 0 40 40" aria-hidden="true">
      <rect width="40" height="40" rx="6" style={{ fill: 'var(--ink)' }} />
      <path d="M6 19V6a13 13 0 0 1 13 13z" style={{ fill: 'var(--brand)' }} />
      <circle cx="27.5" cy="12.5" r="6.5" style={{ fill: 'var(--hot)' }} />
      <path d="M6 34a6.5 6.5 0 0 1 13 0z" style={{ fill: 'var(--c-res)' }} />
      <rect x="21" y="21" width="13" height="13" rx="1.5" style={{ fill: '#fff' }} />
    </svg>
  );
}

/* ---------- 아이콘 ---------- */
export const IconLike = (): JSX.Element => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 7l3-5c1 0 2 1 2 2v2h3.5c.8 0 1.4.8 1.2 1.6l-1.2 5c-.1.6-.7 1.1-1.3 1.1H5zM1 7h3v8H1z" fill="currentColor" /></svg>
);
export const IconComment = (): JSX.Element => (
  <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M2 2h12v9H6l-4 3z" fill="none" stroke="currentColor" strokeWidth="1.6" /></svg>
);
export const IconUp = (): JSX.Element => (
  <svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1l4 5H1z" fill="currentColor" /></svg>
);
export const IconSun = (): JSX.Element => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><circle cx="10" cy="10" r="3.6" stroke="currentColor" strokeWidth="1.7" /><path d="M10 1.8v2M10 16.2v2M1.8 10h2M16.2 10h2M4.2 4.2l1.4 1.4M14.4 14.4l1.4 1.4M4.2 15.8l1.4-1.4M14.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" /></svg>
);
export const IconMoon = (): JSX.Element => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M16.5 12.6A7 7 0 0 1 7.4 3.5a7 7 0 1 0 9.1 9.1z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" /></svg>
);
export const IconSearch = (): JSX.Element => (
  <svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.5" /><path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>
);

/* ---------- 배지 ---------- */
export function LevelBadge(props: { level: string }): JSX.Element {
  return <span className={'badge ' + (props.level === '공식 운영' ? 'b-of' : 'b-sh')}>{props.level}</span>;
}
export function RiskBadge(props: { risk: string }): JSX.Element {
  return <span className={'badge ' + (RISK_CLASS[props.risk] || 'b-low')}>위험도 {props.risk}</span>;
}
const STATUS_CLASS: { [k: string]: string } = { '아이디어': 's-id', '검토 중': 's-rv', '제작 중': 's-mk', '등록 완료': 's-dn', '보완 요청': 's-rv', '승인': 's-dn', '반려': 's-no', '취소': 's-id' };
export function StatusPill(props: { status: string }): JSX.Element {
  return <span className={'st ' + (STATUS_CLASS[props.status] || 's-id')}>{props.status}</span>;
}

/** 검색어를 노란 밑줄로 표시 */
export function Highlight(props: { text: string; q: string }): JSX.Element {
  const q = props.q.trim();
  if (!q) { return <>{props.text}</>; }
  const i = props.text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) { return <>{props.text}</>; }
  return <>{props.text.slice(0, i)}<mark>{props.text.slice(i, i + q.length)}</mark>{props.text.slice(i + q.length)}</>;
}

/* ---------- 측면 패널 (center 이면 화면 가운데 창) ---------- */
export function SidePanel(props: { open: boolean; labelId: string; center?: boolean; onClose: () => void; children: React.ReactNode }): JSX.Element | null {
  const ref = React.useRef<HTMLElement>(null);
  const last = React.useRef<Element | null>(null);
  const [shown, setShown] = React.useState(false);

  React.useEffect(() => {
    if (!props.open) { setShown(false); return undefined; }
    last.current = document.activeElement;
    const t = window.setTimeout(() => {
      setShown(true);
      const x = ref.current && ref.current.querySelector('.x') as HTMLElement | null;
      if (x) { x.focus(); }
    }, 10);
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
    <>
      <div className={'scrim' + (shown ? ' show' : '')} onClick={props.onClose} />
      <aside ref={ref} className={'panel' + (props.center ? ' center' : '') + (shown ? ' show' : '')} role="dialog" aria-modal="true" aria-labelledby={props.labelId}>
        {props.children}
      </aside>
    </>
  );
}

export function PanelHead(props: { id: string; title: string; sub?: React.ReactNode; badges?: React.ReactNode; icon?: React.ReactNode; onClose: () => void }): JSX.Element {
  return (
    <div className="ph">
      <div className="hd">
        {props.icon}
        <div>
          {props.badges ? <div className="bl">{props.badges}</div> : null}
          <h2 id={props.id}>{props.title}</h2>
          {props.sub ? <p className="sub">{props.sub}</p> : null}
        </div>
      </div>
      <button type="button" className="x" aria-label="닫기" onClick={props.onClose}>✕</button>
    </div>
  );
}

/* ---------- 알림 ---------- */
export function Toast(props: { message: string; tone?: 'ok' | 'error' }): JSX.Element {
  return <div className={'toast' + (props.message ? ' show' : '') + (props.tone === 'error' ? ' err-t' : '')} role="status" aria-live="polite">{props.message}</div>;
}

export function Empty(props: { title: string; children?: React.ReactNode }): JSX.Element {
  return <div className="empty"><b>{props.title}</b>{props.children}</div>;
}
