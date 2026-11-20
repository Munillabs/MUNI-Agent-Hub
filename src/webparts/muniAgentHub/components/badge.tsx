/* 배지 메달 (SVG): 배지마다 색 · 아이콘이 다른 육각 메달 + 리본.
   받은 배지는 반짝이는 색, 아직 못 받은 배지는 회색 + 자물쇠로 보여 줍니다.
   크기·색은 모두 SVG 안에 있어서 CSS 반영 여부와 상관없이 같은 모양입니다. */
import * as React from 'react';
import { artUrl } from './badgeArt';

interface ITheme { icon: string; a: string; b: string; rim: string; ribbon: string }
/** 배지 키 → 색 · 아이콘. 새 배지를 만들면 여기에 한 줄 더하면 됩니다 */
const THEMES: { [k: string]: ITheme } = {
  'first-idea':   { icon: '💡', a: '#ffe27a', b: '#f5a524', rim: '#c47f10', ribbon: '#e0662f' },
  'first-deploy': { icon: '🚀', a: '#8fd3ff', b: '#3b6cf6', rim: '#2449b8', ribbon: '#7c4dff' },
  'cheer':        { icon: '📣', a: '#ffb3c7', b: '#f04f7f', rim: '#b8285a', ribbon: '#ff8a3d' },
  'steady':       { icon: '🔥', a: '#ffc078', b: '#f0541e', rim: '#b23410', ribbon: '#ffb000' },
  'real':         { icon: '✨', a: '#d7b8ff', b: '#8b5cf6', rim: '#5b34c4', ribbon: '#ec4899' },
  'tried30':      { icon: '⭐', a: '#fff1a8', b: '#e8b100', rim: '#a57800', ribbon: '#3b6cf6' },
  'first-case':   { icon: '📚', a: '#9ef0dc', b: '#14b8a6', rim: '#0b7d72', ribbon: '#3b82f6' },
  'rich':         { icon: '💖', a: '#ffc2ec', b: '#e83e8c', rim: '#a3195d', ribbon: '#a855f7' }
};
const DEFAULT: ITheme = { icon: '🏅', a: '#e5e7eb', b: '#9ca3af', rim: '#6b7280', ribbon: '#4b5563' };
const LOCKED: ITheme = { icon: '', a: '#f1f1ef', b: '#cfcfcb', rim: '#a8a8a3', ribbon: '#bdbdb8' };

let seq = 0;
/** 육각형 꼭짓점 (가운데 cx,cy · 반지름 r · 위가 뾰족) */
function hex(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i++) { const t = Math.PI / 180 * (60 * i - 90); pts.push(`${(cx + r * Math.cos(t)).toFixed(2)},${(cy + r * Math.sin(t)).toFixed(2)}`); }
  return pts.join(' ');
}

/** 반짝이 (4각 별) */
function star(x: number, y: number, s: number): string {
  const q = s * 0.28;
  return `M${x} ${y - s} L${x + q} ${y - q} L${x + s} ${y} L${x + q} ${y + q} L${x} ${y + s} L${x - q} ${y + q} L${x - s} ${y} L${x - q} ${y - q} Z`;
}

/** size: 픽셀. ribbon: 아래 리본 표시(작은 프로필 동그라미에서는 끔). locked: 아직 못 받은 배지
    k 가 배지 도감 그림 키(maker-legend, num/maker-20, gold-s12 …)면 시안 배지 그림을 그대로 보여 줍니다 */
export function BadgeMedal(props: { k: string; size: number; locked?: boolean; ribbon?: boolean; title?: string }): JSX.Element {
  const id = React.useRef('hubm' + (++seq)).current;
  const url = artUrl(props.k);
  if (url) {
    return (
      <svg width={props.size} height={props.size} viewBox="-2 -2 68 68" role="img" aria-label={props.title || ''} className={'b2-G b7-art' + (props.locked ? ' b7-off' : '')} style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
        {props.title ? <title>{props.title}</title> : null}
        <g className="b7-g"><image href={url} x="-2" y="-2" width="68" height="68" /></g>
      </svg>
    );
  }
  const t = props.locked ? LOCKED : (THEMES[props.k] || DEFAULT);
  const icon = props.locked ? '' : (THEMES[props.k] || DEFAULT).icon;
  const ribbon = props.ribbon !== false;
  // 리본이 있으면 메달을 조금 위로
  const cy = ribbon ? 44 : 50;
  const r = ribbon ? 38 : 46;
  return (
    <svg width={props.size} height={props.size} viewBox="0 0 100 100" role="img" aria-label={props.title || ''} style={{ display: 'block', flex: 'none', overflow: 'visible' }}>
      {props.title ? <title>{props.title}</title> : null}
      <defs>
        <linearGradient id={id + 'f'} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={t.a} /><stop offset="1" stopColor={t.b} />
        </linearGradient>
        <linearGradient id={id + 'r'} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={props.locked ? 0.7 : 0.95} /><stop offset="0.45" stopColor={t.rim} /><stop offset="1" stopColor={t.rim} />
        </linearGradient>
        <radialGradient id={id + 'g'} cx="0.35" cy="0.25" r="0.7">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.75" /><stop offset="0.6" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      {ribbon ? (
        <g>
          <polygon points="30,62 22,98 34,90 42,99 47,68" fill={t.ribbon} />
          <polygon points="70,62 78,98 66,90 58,99 53,68" fill={t.ribbon} />
          <polygon points="30,62 22,98 34,90 42,99 47,68" fill="#000" opacity="0.12" />
        </g>
      ) : null}
      {/* 바깥 테두리(금속 느낌) → 안쪽 색 → 윗부분 반짝임 */}
      <polygon points={hex(50, cy, r)} fill={`url(#${id}r)`} stroke="#000" strokeOpacity="0.08" strokeWidth="1" strokeLinejoin="round" />
      <polygon points={hex(50, cy, r - 6)} fill={`url(#${id}f)`} strokeLinejoin="round" />
      <polygon points={hex(50, cy, r - 6)} fill={`url(#${id}g)`} />
      {/* 안쪽 얇은 선 */}
      <polygon points={hex(50, cy, r - 11)} fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="1.2" strokeDasharray="2 3" />
      {props.locked ? (
        // 자물쇠
        <g transform={`translate(50 ${cy})`} fill="none" stroke="#8a8a85" strokeWidth="4" strokeLinecap="round">
          <rect x="-11" y="-3" width="22" height="17" rx="3" fill="#8a8a85" stroke="none" />
          <path d="M-7 -3 v-6 a7 7 0 0 1 14 0 v6" />
        </g>
      ) : (
        <text x="50" y={cy + 1} textAnchor="middle" dominantBaseline="central" fontSize={r * 0.95}
          style={{ fontFamily: '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif' }}>{icon}</text>
      )}
      {!props.locked ? (
        // 반짝이 두 개
        <g fill="#fff">
          <path d={star(50 + r * 0.66, cy - r * 0.58, 7)} opacity="0.95" />
          <path d={star(50 - r * 0.66, cy + r * 0.12, 4.5)} opacity="0.8" />
        </g>
      ) : null}
    </svg>
  );
}
