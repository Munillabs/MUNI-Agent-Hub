/* MUNIVERSE 시안의 움직임과 장식 (시안 스크립트를 React로 옮긴 것)
   - SharePoint 페이지는 window가 아니라 안쪽 상자가 스크롤되므로, 스크롤은 Hub를 감싼 스크롤 상자를 찾아 씁니다.
   - 모션 줄이기(prefers-reduced-motion) 설정이면 움직임 없이 마지막 모습만 보여 줍니다. */
import * as React from 'react';
import { HubView } from '../models/types';

export const reducedMotion = (): boolean => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/* ---------- 스크롤 상자 ---------- */
/** Hub를 감싼 스크롤 상자 (SharePoint: 페이지 본문 상자, 일반 페이지: window) */
export function scrollHostOf(el: HTMLElement | null): HTMLElement | Window {
  for (let p = el ? el.parentElement : null; p && p !== document.body && p !== document.documentElement; p = p.parentElement) {
    const s = window.getComputedStyle(p);
    if (/(auto|scroll|overlay)/.test(s.overflowY) && p.scrollHeight > p.clientHeight + 1) { return p; }
  }
  return window;
}
export function scrollTopOf(h: HTMLElement | Window): number {
  return h === window ? (window.scrollY || window.pageYOffset || 0) : (h as HTMLElement).scrollTop;
}
/** 스크롤·크기 바뀜마다(한 프레임에 한 번) cb 를 부릅니다. cb(스크롤 위치, 스크롤 상자) */
export function useScrollTick(rootRef: React.RefObject<HTMLElement>, cb: (y: number, host: HTMLElement | Window) => void, deps: React.DependencyList): void {
  const ref = React.useRef(cb);
  ref.current = cb;
  React.useEffect(() => {
    let host = scrollHostOf(rootRef.current);
    let q = 0;
    const run = (): void => { q = 0; ref.current(scrollTopOf(host), host); };
    const on = (): void => { if (!q) { q = window.requestAnimationFrame(run); } };
    const rehost = (): void => {
      const h = scrollHostOf(rootRef.current);
      if (h !== host) { host.removeEventListener('scroll', on); host = h; host.addEventListener('scroll', on, { passive: true } as AddEventListenerOptions); }
      on();
    };
    host.addEventListener('scroll', on, { passive: true } as AddEventListenerOptions);
    window.addEventListener('resize', rehost);
    // 내용이 늦게 차서 스크롤 상자가 나중에 생기는 경우
    const t1 = window.setTimeout(rehost, 400);
    const t2 = window.setTimeout(rehost, 1500);
    run();
    return () => { host.removeEventListener('scroll', on); window.removeEventListener('resize', rehost); window.clearTimeout(t1); window.clearTimeout(t2); if (q) { window.cancelAnimationFrame(q); } };
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- 스크롤 등장 (시안 11/17 v3 + 11/19 rv) ---------- */
const REVEAL = '.card,.mk-card,.fboard,.ct-row,.sticky,.zbox,.zside,.zlead,.znew-h,.znew-r,.zfacts li,.zcase,.znote,.zflow li,.badge,.step,.sec-h,.hw,.rows li,.zig>h2';
/** 처음 화면 아래에 있던 요소를 숨겼다가, 보이면 나타나게 합니다. */
export function useReveal(rootRef: React.RefObject<HTMLElement>, key: string): void {
  const shown = React.useRef<Set<Element>>(new Set());
  React.useLayoutEffect(() => {
    // 다시 그려져 class 가 바뀌어도 이미 나타난 요소는 그대로
    shown.current.forEach(el => { if (!el.isConnected) { shown.current.delete(el); } else if (!el.classList.contains('in')) { el.classList.add('in'); } });
  });
  React.useEffect(() => {
    const root = rootRef.current;
    if (!root || reducedMotion() || !('IntersectionObserver' in window)) { return undefined; }
    // 한 번 나타나면 그대로 둡니다 (SharePoint 스크롤 상자에서 깜빡이지 않게)
    const add = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); shown.current.add(e.target); add.unobserve(e.target); } }), { rootMargin: '0px 0px -10% 0px' });
    const seen = new WeakSet<Element>();
    const scan = (): void => {
      const page = root.querySelector('.page.on');
      if (!page) { return; }
      const vh = window.innerHeight;
      let k = 0;
      let last: Element | null = null;
      page.querySelectorAll(REVEAL).forEach(el => {
        if (seen.has(el) || el.classList.contains('rv')) { return; }
        seen.add(el);
        if (el.getBoundingClientRect().top < vh * 0.95) { return; }
        if (last !== el.parentElement) { k = 0; last = el.parentElement; }
        (el as HTMLElement).style.setProperty('--d', Math.min(k++, 6) * 140 + 'ms');
        el.classList.add('rv');
        add.observe(el);
      });
      page.querySelectorAll('.rv').forEach(el => { if (!seen.has(el)) { seen.add(el); add.observe(el); } });
    };
    const t = window.setTimeout(scan, 80);
    const mo = new MutationObserver(() => { window.clearTimeout((scan as unknown as { t: number }).t); (scan as unknown as { t: number }).t = window.setTimeout(scan, 120); });
    mo.observe(root, { childList: true, subtree: true });
    return () => { window.clearTimeout(t); mo.disconnect(); add.disconnect(); };
  }, [key]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- 숫자가 0부터 올라가기 ---------- */
export function CountUp(props: { to: number; digits?: number; start: boolean; delay?: number; dur?: number }): JSX.Element {
  const dg = props.digits || 0;
  const [v, setV] = React.useState(props.start || reducedMotion() ? props.to : 0);
  React.useEffect(() => {
    if (!props.start || reducedMotion()) { setV(props.start || reducedMotion() ? props.to : 0); return undefined; }
    let raf = 0;
    const t0 = performance.now() + (props.delay || 0);
    const dur = props.dur || 900;
    const f = (now: number): void => { const p = Math.max(0, Math.min(1, (now - t0) / dur)); setV(props.to * (1 - Math.pow(1 - p, 3))); if (p < 1) { raf = window.requestAnimationFrame(f); } };
    raf = window.requestAnimationFrame(f);
    return () => window.cancelAnimationFrame(raf);
  }, [props.to, props.start]); // eslint-disable-line react-hooks/exhaustive-deps
  return <>{v.toFixed(dg)}</>;
}

/* ---------- 라이트/다크 전환 스위치 ---------- */
export function ThemeSwitch(props: { dark: boolean; onToggle: () => void }): JSX.Element {
  const l = props.dark ? '다크 모드 켜짐 · 누르면 라이트 모드' : '다크 모드 꺼짐 · 누르면 다크 모드';
  return (
    <button type="button" className="thm" id="mv-themeBtn" role="switch" aria-checked={props.dark} aria-label={l} title={l} onClick={props.onToggle}>
      <span className="thm-track" aria-hidden="true"><span className="thm-knob">
        <svg className="thm-sun" viewBox="0 0 24 24"><circle cx="12" cy="12" r="3.6" /><path d="M12 3.5v1.8M12 18.7v1.8M3.5 12h1.8M18.7 12h1.8M6 6l1.3 1.3M16.7 16.7L18 18M6 18l1.3-1.3M16.7 7.3L18 6" /></svg>
        <svg className="thm-moon" viewBox="0 0 24 24"><path d="M19 14.5A7.2 7.2 0 0 1 9.5 5a7.2 7.2 0 1 0 9.5 9.5z" /></svg>
      </span></span>
    </button>
  );
}

/* ---------- 다크 모드 배경: 은은한 별 + 가끔 날아오는 별똥별 (홈에서만) ---------- */
export function SpaceBg(props: { on: boolean; home: boolean }): JSX.Element | null {
  const ref = React.useRef<HTMLCanvasElement>(null);
  const homeRef = React.useRef(props.home);
  homeRef.current = props.home;
  React.useEffect(() => {
    const cv = ref.current;
    if (!cv || !props.on) { return undefined; }
    const x = cv.getContext('2d');
    if (!x) { return undefined; }
    const RM = reducedMotion();
    let W = 0, H = 0, dpr = 1, raf = 0, next = performance.now() + 1500;
    let S: [number, number, number, number, number, string][] = [];
    let M: { x: number; y: number; vx: number; vy: number; t: number; life: number; len: number }[] = [];
    const rs = (): void => {
      dpr = Math.min(2, window.devicePixelRatio || 1); W = window.innerWidth; H = window.innerHeight; cv.width = W * dpr; cv.height = H * dpr; S = [];
      const n = Math.round(W * H / 5200);
      for (let i = 0; i < n; i++) { const q = Math.random(); S.push([Math.random() * W, Math.random() * H, q < 0.9 ? 0.3 + Math.random() * 0.6 : 0.9 + Math.random() * 0.8, Math.random() * 6.28, 0.3 + Math.random() * 1.2, q > 0.95 ? '255,233,184' : q > 0.8 ? '188,217,255' : '255,255,255']); }
    };
    const spawn = (now: number): void => {
      const a = (200 + Math.random() * 25) * Math.PI / 180, sp = 0.9 + Math.random() * 0.6;
      M.push({ x: W * (0.35 + Math.random() * 0.75), y: -20 + Math.random() * H * 0.25, vx: Math.cos(a) * sp, vy: -Math.sin(a) * sp, t: now, life: 1300 + Math.random() * 700, len: 180 + Math.random() * 160 });
    };
    const draw = (now: number): void => {
      raf = window.requestAnimationFrame(draw);
      if (document.hidden) { return; }
      x.setTransform(dpr, 0, 0, dpr, 0, 0); x.clearRect(0, 0, W, H);
      for (const s of S) { const tw = RM ? 0.7 : 0.45 + 0.55 * Math.sin(now / 1000 * s[4] + s[3]); x.fillStyle = `rgba(${s[5]},${tw * (s[2] > 0.9 ? 0.9 : 0.55)})`; x.beginPath(); x.arc(s[0], s[1], s[2], 0, 6.283); x.fill(); }
      if (!homeRef.current) { M = []; next = now + 1200; }
      if (!RM && homeRef.current) {
        if (now > next) { spawn(now); if (Math.random() < 0.25) { spawn(now + 200); } next = now + 3200 + Math.random() * 4200; }
        M = M.filter(m => {
          const k = (now - m.t) / m.life;
          if (k < 0) { return true; } if (k > 1) { return false; }
          const d = now - m.t, hx = m.x + m.vx * d, hy = m.y + m.vy * d, al = Math.sin(Math.min(1, k * 1.15) * Math.PI), dl = Math.hypot(m.vx, m.vy), tx = hx - m.vx / dl * m.len, ty = hy - m.vy / dl * m.len;
          const g = x.createLinearGradient(tx, ty, hx, hy); g.addColorStop(0, 'rgba(140,200,255,0)'); g.addColorStop(0.7, `rgba(170,215,255,${0.35 * al})`); g.addColorStop(1, `rgba(255,255,255,${0.95 * al})`);
          x.strokeStyle = g; x.lineWidth = 1.8; x.lineCap = 'round'; x.beginPath(); x.moveTo(tx, ty); x.lineTo(hx, hy); x.stroke();
          const h = x.createRadialGradient(hx, hy, 0, hx, hy, 9); h.addColorStop(0, `rgba(255,255,255,${al})`); h.addColorStop(0.4, `rgba(180,220,255,${0.45 * al})`); h.addColorStop(1, 'rgba(120,180,255,0)');
          x.fillStyle = h; x.beginPath(); x.arc(hx, hy, 9, 0, 6.283); x.fill();
          return true;
        });
      }
    };
    rs();
    window.addEventListener('resize', rs);
    raf = window.requestAnimationFrame(draw);
    return () => { window.cancelAnimationFrame(raf); window.removeEventListener('resize', rs); x.clearRect(0, 0, cv.width, cv.height); };
  }, [props.on]);
  return props.on ? <canvas id="mv-spaceBg" ref={ref} aria-hidden="true" /> : null;
}

/* ---------- 홈 지구본: 점 900개 구 + 기울어진 고리와 위성 + 동료가 만든 것 핀 ---------- */
export interface IGlobePin { k: 'a' | 's' | 'h'; name: string; maker: string; view: HubView; id: number }
const KN: { [k: string]: string } = { a: 'Agent', s: 'Skill', h: 'HTML' };
const KC: { [k: string]: string[] } = { a: ['#f2c94c', '#fbefc6', '#7a5a00'], s: ['#3fae6a', '#d9efdf', '#1f6b3a'], h: ['#2f8fd0', '#e6edf1', '#003f6d'] };
interface IPinState { it: IGlobePin; p: number[]; la: number; ph: number; hot?: number; sx?: number; sy?: number; al?: number; lb?: number[] }
export function Globe(props: { pins: IGlobePin[]; dark: boolean; boxRef: React.RefObject<HTMLElement>; cueRef: React.RefObject<HTMLElement>; rootRef: React.RefObject<HTMLElement>; onPin: (p: IGlobePin) => void }): JSX.Element {
  const cvRef = React.useRef<HTMLCanvasElement>(null);
  const live = React.useRef({ dark: props.dark, pins: props.pins, onPin: props.onPin });
  live.current = { dark: props.dark, pins: props.pins, onPin: props.onPin };
  const pinKey = props.pins.map(p => p.k + p.id).join(',');
  React.useEffect(() => {
    const cv = cvRef.current;
    const box = props.boxRef.current;
    if (!cv || !box) { return undefined; }
    const ctx = cv.getContext('2d');
    if (!ctx) { return undefined; }
    const RM = reducedMotion();
    const TAU = 6.2832;
    const N = 900, P: number[][] = [], S: number[][] = [], DL: number[] = [];
    const ga = Math.PI * (3 - Math.sqrt(5));
    for (let i = 0; i < N; i++) {
      const y = 1 - (i / (N - 1)) * 2, r = Math.sqrt(1 - y * y), th = ga * i;
      P.push([Math.cos(th) * r, y, Math.sin(th) * r]);
      const u = Math.random() * TAU, v = Math.acos(2 * Math.random() - 1), rr = 1.8 + Math.random() * 1.6;
      S.push([Math.sin(v) * Math.cos(u) * rr, Math.cos(v) * rr, Math.sin(v) * Math.sin(u) * rr]); DL.push(Math.random() * 0.45);
    }
    const COLL = ['#dce8f1', '#b8d0e1', '#80a9c6', '#4580a8', '#1d5f8c', '#004772'], COLD = ['#162c3d', '#20435d', '#2f6488', '#4a8bb8', '#78b4dd', '#c4e3f6'];
    const items = live.current.pins.slice(0, 12);
    const PIN: IPinState[] = items.map((it, i) => ({ it, p: P[Math.floor((i + 0.5) / Math.max(1, items.length) * N * 0.86 + N * 0.07)], la: 0, ph: Math.random() * TAU }));
    const RING: number[] = []; for (let i = 0; i < 180; i++) { RING.push(i / 180 * TAU); }
    let W = 0, H = 0, dpr = 1, mx = 0, my = 0, tmx = 0, tmy = 0, sc = 0, a = 0, ra = 0, vis = true;
    const t0 = performance.now(); let last = t0;
    let host = scrollHostOf(props.rootRef.current);
    let FIT: { r: number; cy: number } | null = null;
    const fit = (): void => {
      try {
        const cu = props.cueRef.current;
        if (!cu || !box.clientHeight) { FIT = null; return; }
        const top = 10, bot = cu.offsetTop - 16;
        const r = Math.min((bot - top) / 2, W / 2 / 1.36 - 8);
        FIT = r > 120 ? { r, cy: (top + bot) / 2 } : null;
      } catch (e) { FIT = null; }
    };
    const rs = (): void => { dpr = Math.min(2, window.devicePixelRatio || 1); W = box.clientWidth; H = box.clientHeight; cv.width = W * dpr; cv.height = H * dpr; host = scrollHostOf(props.rootRef.current); if (!scrollTopOf(host)) { fit(); } };
    rs();
    const r1 = window.setTimeout(rs, 300), r2 = window.setTimeout(rs, 1200);
    window.addEventListener('resize', rs);
    const onMove = (e: PointerEvent): void => { const r = box.getBoundingClientRect(); tmx = (e.clientX - r.left) / r.width - 0.5; tmy = (e.clientY - r.top) / r.height - 0.5; };
    box.addEventListener('pointermove', onMove);
    let io: IntersectionObserver | undefined;
    if ('IntersectionObserver' in window) { io = new IntersectionObserver(es => { vis = es[0].isIntersecting; }); io.observe(box); }
    let RIP: { pn: IPinState; t: number; c: string } | null = null, nextArc = t0 + 2600;
    const eo = (t: number): number => 1 - Math.pow(1 - t, 3);
    let raf = 0;
    const draw = (now: number): void => {
      const dt = Math.min(64, now - last); last = now;
      if (vis && box.offsetParent) {
        const DKM = live.current.dark;
        const cols = DKM ? COLD : COLL;
        if (!W || !H) { rs(); }
        mx += (tmx - mx) * 0.05; my += (tmy - my) * 0.05; sc = Math.min(1, scrollTopOf(host) / (H || 1));
        if (!RM) { a += 0.0022 * dt / 16.7; ra += 0.0016 * dt / 16.7; }
        const intro = RM ? 1 : (now - t0) / 1000;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
        const vh = window.innerHeight;
        const R = (FIT && W >= 700 ? FIT.r : Math.min(W >= 700 ? 390 : W * 0.42, vh * 0.36)) * (1 + sc * 0.35), cx = W / 2 + mx * 40, cy = (FIT && W >= 700 ? FIT.cy : H * 0.5 - 28) + my * 30 - sc * 60, fade = 1 - sc * 0.9;
        const ry = a + mx * 0.6, rx = 0.35 + my * 0.4, cy1 = Math.cos(ry), sy1 = Math.sin(ry), cx1 = Math.cos(rx), sx1 = Math.sin(rx);
        const proj = (p: number[]): number[] => { const x = p[0] * cy1 + p[2] * sy1, z = -p[0] * sy1 + p[2] * cy1, y = p[1]; const y2 = y * cx1 - z * sx1, z2 = y * sx1 + z * cx1; return [cx + x * R, cy + y2 * R, (z2 + 1) / 2]; };
        const midOf = (px: number, py: number): number => { const nx = (px - W / 2) / (W * 0.34), ny = (py - H * 0.5) / (H * 0.3); return Math.max(0, 1 - (nx * nx + ny * ny)); };
        const narrow = W < 700;
        const tilt = 0.42, ringR = 1.32;
        const ringPts = RING.map((t, i) => {
          const u = t + ra; const p = [Math.cos(u) * ringR, 0, Math.sin(u) * ringR];
          const y = p[2] * Math.sin(tilt), z = p[2] * Math.cos(tilt); const q = [p[0], y - 0.08, z];
          const x = q[0] * Math.cos(0.25) - q[1] * Math.sin(0.25), yy = q[0] * Math.sin(0.25) + q[1] * Math.cos(0.25);
          return [cx + x * R, cy + yy * R, (q[2] / ringR + 1) / 2, i];
        });
        const ringK = RM ? 1 : eo(Math.max(0, Math.min(1, (intro - 0.9) / 1.2)));
        const ring = (front: boolean): void => {
          ringPts.forEach(r => {
            if ((r[2] > 0.5) !== front) { return; }
            const m = midOf(r[0], r[1]);
            ctx.globalAlpha = fade * ringK * (0.18 + 0.5 * r[2]) * (1 - m * 0.9); ctx.fillStyle = '#4580a8'; ctx.beginPath(); ctx.arc(r[0], r[1], 0.7 + r[2] * 0.9, 0, TAU); ctx.fill();
          });
          [0, 90].forEach(k => {
            const r = ringPts[((Math.floor(k + (RM ? 0 : now / 180)) % 180) + 180) % 180];
            if ((r[2] > 0.5) !== front) { return; }
            const m = midOf(r[0], r[1]);
            ctx.globalAlpha = fade * ringK * (0.4 + 0.6 * r[2]) * (1 - m * 0.85); ctx.fillStyle = DKM ? '#78b4dd' : '#004772'; ctx.beginPath(); ctx.arc(r[0], r[1], 2.4 + r[2] * 1.6, 0, TAU); ctx.fill();
            ctx.globalAlpha *= 0.25; ctx.beginPath(); ctx.arc(r[0], r[1], 7 + r[2] * 4, 0, TAU); ctx.fill();
          });
        };
        ring(false);
        const pinK0 = RM ? 1 : Math.max(0, Math.min(1, (intro - 1.5) / 0.8));
        if (!RM && pinK0 >= 1 && (!RIP || now - RIP.t > 2600) && now > nextArc) {
          const f = PIN.filter(q => { const o = proj(q.p); return o[2] > 0.5 && midOf(o[0], o[1]) < 0.15; });
          if (f.length) { const pn = f[Math.floor(Math.random() * f.length)]; RIP = { pn, t: now, c: KC[pn.it.k][0] }; pn.hot = now; }
          nextArc = now + 4200;
        }
        const ru = RIP ? (now - RIP.t) / 2600 : 2, rang = eo(Math.min(1, ru)) * 0.95, rp = RIP ? RIP.pn.p : [0, 0, 0];
        for (let i = 0; i < N; i++) {
          const k = RM ? 1 : eo(Math.max(0, Math.min(1, (intro - DL[i]) / 1.5)));
          const p = P[i], s0 = S[i];
          const q = k >= 1 ? p : [s0[0] + (p[0] - s0[0]) * k, s0[1] + (p[1] - s0[1]) * k, s0[2] + (p[2] - s0[2]) * k];
          const r = proj(q), d = Math.max(0, Math.min(1, r[2])), m = midOf(r[0], r[1]);
          let hi = 0;
          if (ru < 1) { const g = Math.acos(Math.max(-1, Math.min(1, p[0] * rp[0] + p[1] * rp[1] + p[2] * rp[2]))), df = Math.abs(g - rang); if (df < 0.15) { hi = (1 - df / 0.15) * (1 - ru) * (g < 0.04 ? 0 : 1); } }
          ctx.fillStyle = hi > 0.05 && RIP ? RIP.c : cols[Math.min(5, Math.floor(d * 5.99))];
          ctx.globalAlpha = fade * (0.25 + 0.75 * d) * (1 - m * 0.92) * 0.85 * Math.min(1, k * 1.4) * (hi > 0.05 ? Math.max(0.55, hi) : 1);
          ctx.beginPath(); ctx.arc(r[0], r[1], (0.6 + d * 1.9) * (1 + hi * 1.3), 0, TAU); ctx.fill();
        }
        const pinK = RM ? 1 : eo(Math.max(0, Math.min(1, (intro - 1.5) / 0.8)));
        const shown = PIN.map(p => ({ p, r: proj(p.p) })).filter(o => o.r[2] > 0.4 && midOf(o.r[0], o.r[1]) < 0.01 && o.r[1] > 110 && o.r[1] < H - 90 && !narrow).sort((x, y) => y.r[2] - x.r[2]).slice(0, 3).map(o => o.p);
        PIN.forEach(pn => {
          const r = proj(pn.p), d = r[2], m = midOf(r[0], r[1]), c = KC[pn.it.k];
          const al = fade * pinK * (0.3 + 0.7 * d) * (1 - m * 0.9); pn.sx = r[0]; pn.sy = r[1]; pn.al = al;
          if (al < 0.02) { return; }
          const hot = pn.hot && now - pn.hot < 1400 ? 1 - (now - pn.hot) / 1400 : 0, pul = RM ? 0 : (Math.sin(now / 600 + pn.ph) + 1) / 2;
          ctx.globalAlpha = al * (0.18 + 0.12 * pul + 0.4 * hot); ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(r[0], r[1], (8 + 7 * d) * (1 + 0.25 * pul + 0.8 * hot), 0, TAU); ctx.fill();
          ctx.globalAlpha = al; ctx.fillStyle = c[0]; ctx.beginPath(); ctx.arc(r[0], r[1], 3.5 + 3 * d, 0, TAU); ctx.fill();
          ctx.strokeStyle = DKM ? '#0b141c' : '#fff'; ctx.lineWidth = 1.5; ctx.stroke();
          const tgt = shown.indexOf(pn) >= 0 ? 1 : 0; pn.la += (tgt - pn.la) * (RM ? 1 : 0.08);
          if (pn.la > 0.02) {
            const dx = r[0] - cx, dy = r[1] - cy, dl = Math.hypot(dx, dy) || 1, ux = dx / dl, right = ux >= 0, sg = right ? 1 : -1;
            const kn = KN[pn.it.k], nm = pn.it.name, mk = pn.it.maker;
            const FN = (w: number, s: number): string => `${w} ${s}px "Pretendard Variable",Pretendard,sans-serif`;
            ctx.globalAlpha = pn.la * fade; ctx.textBaseline = 'alphabetic';
            const halo = (t: string, xx: number, yy: number): void => { ctx.lineJoin = 'round'; ctx.strokeStyle = DKM ? 'rgba(11,20,28,.9)' : 'rgba(255,255,255,.9)'; ctx.lineWidth = 3; ctx.strokeText(t, xx, yy); };
            ctx.font = FN(600, 12.5); const nw = ctx.measureText(nm).width;
            const sub = mk ? `${mk}의 ${kn}` : kn;
            ctx.font = FN(400, 11); const mw = ctx.measureText(sub).width;
            const tw = Math.max(nw, mw), len = 34;
            let ex = r[0] + sg * len; const ey = Math.max(96, Math.min(H - 64, r[1]));
            if (right) { ex = Math.min(ex, W - 14 - tw - 6); } else { ex = Math.max(ex, 14 + tw + 6); }
            ctx.fillStyle = '#4580a8';
            const n = Math.max(3, Math.floor(Math.abs(ex - r[0]) / 6));
            for (let i = 1; i <= n; i++) { if (i / n > pn.la) { break; } const t = i / n; ctx.beginPath(); ctx.arc(r[0] + (ex - r[0]) * t, r[1] + (ey - r[1]) * t, 1.1, 0, TAU); ctx.fill(); }
            const tx = ex + sg * 6; ctx.textAlign = right ? 'left' : 'right'; pn.lb = right ? [tx, ey - 14, tx + tw, ey + 16] : [tx - tw, ey - 14, tx, ey + 16];
            ctx.font = FN(600, 12.5); halo(nm, tx, ey - 1); ctx.fillStyle = DKM ? '#e6edf3' : '#2b2b2b'; ctx.fillText(nm, tx, ey - 1);
            ctx.font = FN(400, 11); halo(sub, tx, ey + 13); ctx.fillStyle = DKM ? '#9fb2c1' : '#8c8c8c'; ctx.fillText(sub, tx, ey + 13);
          }
        });
        ring(true);
        ctx.globalAlpha = 1;
      }
      raf = window.requestAnimationFrame(draw);
    };
    raf = window.requestAnimationFrame(draw);
    // 핀(또는 이름표)을 누르면 그 콘텐츠로
    const hit = (e: MouseEvent): IPinState | null => {
      const t = e.target as HTMLElement;
      if (t.closest && t.closest('a,button,input,textarea,select,form,h1,label')) { return null; }
      const r = box.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      let best: IPinState | null = null, bd = 1e9;
      PIN.forEach(p => {
        if (!((p.al || 0) > 0.25)) { return; }
        const d = Math.hypot(x - (p.sx || 0), y - (p.sy || 0));
        const inL = !!p.lb && p.la > 0.5 && x >= p.lb[0] - 4 && x <= p.lb[2] + 4 && y >= p.lb[1] && y <= p.lb[3];
        if ((d < 16 || inL) && d < bd) { bd = inL ? 0 : d; best = p; }
      });
      return best;
    };
    const onHover = (e: PointerEvent): void => { const p = hit(e); box.classList.toggle('c14-hot', !!p); box.title = p ? `${p.it.name} 열기` : ''; };
    const onLeave = (): void => { box.classList.remove('c14-hot'); box.title = ''; };
    const onClick = (e: MouseEvent): void => { const p = hit(e); if (p) { e.preventDefault(); live.current.onPin(p.it); } };
    box.addEventListener('pointermove', onHover);
    box.addEventListener('pointerleave', onLeave);
    box.addEventListener('click', onClick);
    return () => {
      window.cancelAnimationFrame(raf); window.clearTimeout(r1); window.clearTimeout(r2);
      window.removeEventListener('resize', rs); box.removeEventListener('pointermove', onMove);
      box.removeEventListener('pointermove', onHover); box.removeEventListener('pointerleave', onLeave); box.removeEventListener('click', onClick);
      if (io) { io.disconnect(); }
    };
  }, [pinKey]); // eslint-disable-line react-hooks/exhaustive-deps
  return <canvas className="hvx hvx-dx" ref={cvRef} aria-hidden="true" />;
}

/* ---------- 검색창 예시가 한 글자씩 써졌다 지워짐. 입력을 시작하면 멈춤 ---------- */
export function useTypingPlaceholder(inputRef: React.RefObject<HTMLInputElement>, base: string, examples: string[]): void {
  React.useEffect(() => {
    const i = inputRef.current;
    if (!i || reducedMotion()) { return undefined; }
    let k = 0, n = 0, del = false, tm = 0;
    const step = (): void => {
      if (document.activeElement === i || i.value) { i.setAttribute('placeholder', base); tm = window.setTimeout(step, 1200); return; }
      const w = examples[k]; n += del ? -1 : 1;
      i.setAttribute('placeholder', w.slice(0, n) + (n < w.length || del ? '|' : ''));
      let wait = del ? 45 : 95;
      if (!del && n === w.length) { del = true; wait = 1500; } else if (del && n === 0) { del = false; k = (k + 1) % examples.length; wait = 350; }
      tm = window.setTimeout(step, wait);
    };
    tm = window.setTimeout(step, 600);
    return () => { window.clearTimeout(tm); i.setAttribute('placeholder', base); };
  }, [base]); // eslint-disable-line react-hooks/exhaustive-deps
}

/* ---------- 버튼 화살표 (시안 11/18 버튼 B안) ---------- */
export const ArrowPk = (): JSX.Element => <span className="b6-pk" aria-hidden="true"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" /></svg></span>;
export const ArrowMore = (): JSX.Element => <span className="b6-ar" aria-hidden="true">→</span>;
export const Mag = (props: { size?: number }): JSX.Element => <svg viewBox="0 0 16 16" width={props.size} height={props.size} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" aria-hidden="true"><circle cx="7" cy="7" r="4.6" /><path d="M10.5 10.5L14 14" /></svg>;

/* ---------- Agent 카드 썸네일 (첨부 썸네일이 없을 때: 시안 c14 그림) ---------- */
const BG = [['#e9f2f9', '#cfe1ee'], ['#fdf5dc', '#f3e2a6'], ['#ecf6ef', '#cfe8d6'], ['#eef0fb', '#d6dbf3'], ['#e8f4f6', '#c9e4ea'], ['#f6eff7', '#e6d5ea']];
const esc = (t: string): string => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' } as { [k: string]: string })[c]);
const L = (x: number, y: number, w: number, c?: string, h?: number): string => `<rect x="${x}" y="${y}" width="${w}" height="${h || 5}" rx="${(h || 5) / 2}" fill="${c || '#e6edf1'}"/>`;
const T = (x: number, y: number, t: string | number, s?: number, c?: string, w?: number, a?: string): string => `<text x="${x}" y="${y}" font-size="${s || 10}" font-weight="${w || 600}" fill="${c || '#2b2b2b'}"${a ? ` text-anchor="${a}"` : ''} font-family="Pretendard Variable,Pretendard,sans-serif">${t}</text>`;
function win(name: string, inner: string, i: number, uid: string): string {
  const g = BG[i % BG.length];
  return `<svg viewBox="0 0 320 168" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="c14g${uid}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${g[0]}"/><stop offset="1" stop-color="${g[1]}"/></linearGradient></defs><rect width="320" height="168" fill="url(#c14g${uid})"/><circle cx="292" cy="22" r="46" fill="#fff" opacity=".35"/><circle cx="24" cy="160" r="38" fill="#fff" opacity=".28"/><rect x="52" y="30" width="216" height="128" rx="10" fill="#004772" opacity=".07" transform="translate(3 5)"/><rect x="52" y="30" width="216" height="128" rx="10" fill="#fff"/><circle cx="66" cy="44" r="3" fill="#f0b3a8"/><circle cx="76" cy="44" r="3" fill="#f2d48f"/><circle cx="86" cy="44" r="3" fill="#a9d8b5"/>${T(160, 47, esc(name.length > 22 ? name.slice(0, 21) + '…' : name), 9.5, '#5b5b5b', 600, 'middle')}<line x1="52" y1="56" x2="268" y2="56" stroke="#f3f6f8"/>${inner}</svg>`;
}
const TH: ((n: string, uid: string) => string)[] = [
  (n, u) => win(n, [['결정', '#e6edf1', '#003f6d'], ['할 일', '#fbefc6', '#7a5a00'], ['미결', '#f6dcd8', '#9c3b2e']].map((r, k) => `<rect x="66" y="${66 + k * 28}" width="34" height="16" rx="8" fill="${r[1]}"/>${T(83, 77 + k * 28, r[0], 9, r[2], 700, 'middle')}${L(108, 68 + k * 28, 120)}${L(108, 78 + k * 28, 84, '#f3f6f8')}`).join(''), 0, u),
  (n, u) => win(n, [0, 1, 2].map(k => `<rect x="66" y="${66 + k * 28}" width="13" height="13" rx="3" fill="${k ? '#fff' : '#004772'}" stroke="${k ? '#b9c7d2' : '#004772'}"/>${k ? '' : '<path d="M69 73l3 3 5-6" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'}${L(88, 70 + k * 28, 90, k ? '#e6edf1' : '#d1d1d1')}<circle cx="206" cy="${72 + k * 28}" r="8" fill="${['#cfe2ef', '#fbefc6', '#d9efdf'][k]}"/><rect x="220" y="${65 + k * 28}" width="34" height="14" rx="7" fill="#f3f6f8"/>`).join(''), 1, u),
  (n, u) => win(n, [1, 2, 3].map((v, k) => `<circle cx="74" cy="${73 + k * 27}" r="9" fill="#e6edf1"/>${T(74, 76.5 + k * 27, v, 10, '#004772', 800, 'middle')}${L(90, 68 + k * 27, 110)}${L(90, 78 + k * 27, 70, '#f3f6f8')}`).join('') + `<circle cx="238" cy="80" r="16" fill="none" stroke="#b9cfde" stroke-width="2"/><path d="M238 70v10l7 5" stroke="#004772" stroke-width="2" fill="none" stroke-linecap="round"/>`, 2, u),
  (n, u) => win(n, [34, 52, 40, 66, 58].map((h, k) => `<rect x="${72 + k * 22}" y="${144 - h}" width="13" height="${h}" rx="3" fill="${k === 3 ? '#004772' : '#cfe1ee'}"/>`).join('') + `<line x1="66" y1="145" x2="186" y2="145" stroke="#e6edf1"/>${L(200, 76, 40)}${L(200, 90, 52, '#cfe1ee', 10)}${L(200, 108, 52)}${L(200, 118, 40, '#f3f6f8')}${L(200, 128, 48, '#f3f6f8')}`, 3, u),
  (n, u) => win(n, `<rect x="68" y="66" width="70" height="78" rx="6" fill="#f3f6f8" stroke="#e3e3e3"/>${L(78, 80, 30, '#d1d1d1')}${L(78, 94, 48)}${L(78, 104, 40, '#e6edf1')}${L(78, 114, 50, '#e6edf1')}${L(78, 124, 30, '#e6edf1')}<path d="M146 105h22m-6-6 6 6-6 6" stroke="#004772" stroke-width="2.2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="176" y="66" width="76" height="78" rx="6" fill="#f3f6f8" stroke="#cfe1ee"/>${L(186, 80, 34, '#9fc0d8')}${L(186, 94, 52, '#c9dbe8')}${L(186, 104, 44, '#e6edf1')}${L(186, 114, 56, '#e6edf1')}${L(186, 124, 34, '#e6edf1')}`, 4, u),
  (n, u) => win(n, `<rect x="80" y="74" width="62" height="72" rx="4" fill="#f3f6f8" stroke="#e3e3e3"/><rect x="74" y="70" width="62" height="72" rx="4" fill="#f3f6f8" stroke="#e3e3e3"/><rect x="68" y="66" width="62" height="72" rx="4" fill="#fff" stroke="#e6edf1"/>${[0, 1, 2, 3, 4, 5].map(k => L(76, 76 + k * 9, 46 - (k % 3) * 8, '#e6edf1', 4)).join('')}<path d="M144 102h16m-5-5 5 5-5 5" stroke="#004772" stroke-width="2" fill="none" stroke-linecap="round"/>${[0, 1, 2].map(k => `<rect x="168" y="${82 + k * 16}" width="${[86, 74, 80][k]}" height="10" rx="3" fill="#fbefc6"/>${L(172, 84.5 + k * 16, [74, 62, 68][k], '#e0c66f')}`).join('')}`, 5, u)
];
/** Agent 카드 위쪽 그림: 이름에 따라 같은 그림이 나옵니다 */
export function AgentThumbSvg(props: { name: string; seed: number }): JSX.Element {
  const html = TH[Math.abs(props.seed) % TH.length](props.name, 'a' + props.seed);
  return <span className="mv-th" style={{ display: 'contents' }} dangerouslySetInnerHTML={{ __html: html }} />;
}
