/* 배지 그림 (MUNIVERSE 시안 배지 도감 v2). 그림 파일은 assets/badges/*.svg 이고, 빌드가 따로 내보내서 필요할 때만 불러옵니다.
   - 받은 배지: 원래 그림
   - 아직 못 받은 배지: 그림을 회색으로 흐리게 두고 가운데만 회색 판 + 자물쇠 (시안 BA_COVER)
   - 아직 못 받은 숨은 배지: 금테 + '?' (시안 BA_Q) */
import * as React from 'react';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare const require: any;
let ctx: ((k: string) => unknown) & { keys?: () => string[] } | undefined;
try { ctx = require.context('../assets/badges', true, /\.svg$/); } catch (e) { ctx = undefined; }

/** 그림 키(maker-legend, num/maker-20, gold-s12) → 주소 */
export function artUrl(key: string): string {
  if (!ctx || !key) { return ''; }
  try {
    const m = ctx('./' + key + '.svg') as string | { default: string };
    return typeof m === 'string' ? m : (m && m.default) || '';
  } catch (e) { return ''; }
}
export function isArtKey(key?: string): boolean { return !!key && !!artUrl(key); }

let seq = 0;
const COVER_SHIELD = <path className="ba-cv" d="M32 7.2 47.6 12.4v15.4c0 9.6-6.4 16.3-15.6 19.6-9.2-3.3-15.6-10-15.6-19.6V12.4z" fill="#e7ebef" />;
const COVER_PENTA = <path className="ba-cv" d="M32 7.8 49.7 20.7 43 41.5H21.1L14.3 20.7z" fill="#e7ebef" strokeLinejoin="round" />;
const COVER_CIRCLE = <circle className="ba-cv" cx="32" cy="26" r="15" fill="#e7ebef" />;
const LOCK_IN_COVER = <><path d="M28.3 27.6v-2.9a3.7 3.7 0 0 1 7.4 0v2.9" fill="none" stroke="#8c8c8c" strokeWidth={2.1} strokeLinecap="round" /><rect x="26" y="27.2" width="12" height="9.6" rx="2.2" fill="#8c8c8c" /><circle cx="32" cy="31.4" r="1.3" fill="#e7ebef" /></>;

/** 아직 못 받은 숨은 배지: 금테 + ? */
function QBadge(): JSX.Element {
  const id = React.useRef('mvq' + (++seq)).current;
  return (
    <svg viewBox="-2 -2 68 68" aria-hidden="true" focusable="false" className="b2-G b7-art ba-q">
      <g transform="translate(-2 -2) scale(.5667)">
        <defs>
          <linearGradient id={id + 'r'} x1="0" y1="0" x2=".84" y2="1"><stop stopColor="#FFF9D7" /><stop offset=".21" stopColor="#FFC756" /><stop offset=".61" stopColor="#B97814" /><stop offset=".83" stopColor="#FFC756" /><stop offset="1" stopColor="#FFF9D7" /></linearGradient>
          <linearGradient id={id + 'k'} x1="0" y1="0" x2=".8" y2="1"><stop stopColor="#C3CAD3" /><stop offset=".25" stopColor="#A3ADB9" /><stop offset=".75" stopColor="#8E99A6" /><stop offset="1" stopColor="#B5BEC8" /></linearGradient>
          <clipPath id={id + 'c'}><path d="M 17,60 A 43 43 0 1 1 103,60 A 43 43 0 1 1 17,60 Z" /></clipPath>
        </defs>
        <circle cx="60" cy="60" r="50" fill={`url(#${id}r)`} stroke="#B97814" strokeWidth="1.4" />
        <path d="M 17,60 A 43 43 0 1 1 103,60 A 43 43 0 1 1 17,60 Z" fill={`url(#${id}k)`} stroke="#e1eaff" strokeOpacity=".45" strokeWidth="1.2" />
        <g clipPath={`url(#${id}c)`}><ellipse cx="48" cy="22" rx="44" ry="30" fill="#DCE1E7" opacity=".15" /><path d="M6 87L60 102L114 87" stroke="#DCE1E7" strokeWidth="11" strokeOpacity=".35" fill="none" /></g>
        <text x="60" y="78" fontSize="43" fontWeight={900} fill="#f3f6f8" textAnchor="middle" fontFamily="Pretendard Variable,Pretendard,sans-serif">?</text>
        <path d="M45 93L60 100L75 93" fill="none" stroke="#FFF9D7" strokeWidth="2.6" strokeLinecap="round" />
      </g>
    </svg>
  );
}

/** 배지 그림 하나. on=false 면 잠긴 모양, hidden 이면서 on=false 면 '?' */
export function BadgeArt(props: { art: string; on: boolean; hidden?: boolean; title?: string }): JSX.Element {
  if (props.hidden && !props.on) { return <QBadge />; }
  const url = artUrl(props.art);
  const fam = /^(?:num\/)?(case|hunt|idea|cheer|team)-/.exec(props.art);
  const cover = fam ? (fam[1] === 'case' || fam[1] === 'hunt' ? COVER_PENTA : COVER_CIRCLE) : COVER_SHIELD;
  return (
    <svg viewBox="-2 -2 68 68" aria-hidden={props.title ? undefined : true} role={props.title ? 'img' : undefined} aria-label={props.title} focusable="false"
      className={(props.on ? '' : 'ba-lk ') + 'b2-G b7-art' + (props.on ? '' : ' b7-off')}>
      <g className="b7-g"><image href={url} x="-2" y="-2" width="68" height="68" /></g>
      {props.on ? null : <>{cover}{LOCK_IN_COVER}</>}
    </svg>
  );
}
