/* 배지 모음 (MUNIVERSE 시안 #badges A안): 모은 수 · 프로필 배지 / 곧 받을 배지 3개 / 묶음 탭 / 칸마다 단계 줄 / 배지 상세 창 */
import * as React from 'react';
import { CATS, GRP, ISeriesState, IStepBadge, SERIES_HOW, SERIES_NAME, holders, peopleOf, ratioOf } from '../../models/badges';
import { mmdd } from '../../models/rules';
import { IHubApi } from '../api';
import { BadgeArt } from '../badgeArt';

const dateOf = (iso?: string): string => iso ? mmdd(iso) : '';

/** 배지 상세 창 (시안 bdgDlg): 획득 방법 · 진행 · 획득 인원 · 프로필 배지로 쓰기 */
export function BadgeDialog(props: { api: IHubApi; series: ISeriesState[]; stepId: string; pick: string; onPick: (sid: string) => void; onClose: () => void }): JSX.Element | null {
  const { api } = props;
  const sid = props.stepId.split('_')[0];
  const x = props.series.filter(s => s.sid === sid)[0];
  const b = x ? x.steps[Number(props.stepId.split('_')[1] || 0)] : undefined;
  const closeRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    const last = document.activeElement as HTMLElement | null;
    const t = window.setTimeout(() => { if (closeRef.current) { closeRef.current.focus(); } }, 40);
    const key = (e: KeyboardEvent): void => { if (e.key === 'Escape') { e.stopPropagation(); props.onClose(); } };
    document.addEventListener('keydown', key, true);
    return () => { window.clearTimeout(t); document.removeEventListener('keydown', key, true); if (last && last.focus && document.contains(last)) { last.focus(); } };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const own = React.useMemo(() => b ? holders(api.data, peopleOf(api.data), b.id) : 0, [b ? b.id : '', api.data]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!x || !b) { return null; }
  const on = b.have;
  const q = b.hid && !on;
  const isTop = !!x.top && x.top.id === b.id;
  const G = GRP[b.g];
  const bar = (s: IStepBadge): JSX.Element => <div className="b3-prog"><span className="b3-bar" aria-hidden="true"><i style={{ width: Math.max(4, Math.min(1, s.cur / (s.need || 1)) * 100).toFixed(0) + '%' }} /></span><span>{s.cur} / {s.need}</span></div>;
  const meta: string[] = [];
  if (x.steps.length > 1 && !q) { meta.push(`${Math.min(x.L, x.steps.length)} / ${x.steps.length}단계`); }
  if (x.rep && x.cnt) { meta.push(`${x.cnt}번 획득했어요`); }
  const nextAfter = on && isTop ? x.next : undefined;
  return (
    <>
      <div className="bdg-scrim on" id="mv-bdgScrim" onClick={props.onClose} />
      <div className="bdg-dlg on" id="mv-bdgDlg" role="dialog" aria-modal="true" aria-labelledby="hub-bdgDlgT">
        <button type="button" className="bdg-x" aria-label="닫기" ref={closeRef} onClick={props.onClose}>✕</button>
        <div id="mv-bdgDlgIn">
          <div className="b3-k"><span className="bdg-em"><BadgeArt art={b.art} on={on} hidden={b.hid} /></span><h2 id="hub-bdgDlgT">{q ? '???' : b.n}</h2>
            {meta.length ? <p className="b3-meta2">{meta.join(' · ')}</p> : null}
            {q ? <p className="b3-guide">어떻게 받는지는 비밀이에요.<br />Hub를 쓰다 보면 우연히 받아요.</p>
              : on ? <>
                <p className="b3-guide">{b.d}.{b.date ? <small>{dateOf(b.date)}에 획득했어요</small> : null}</p>
                {nextAfter ? <><p className="b3-guide b3-nextg"><span className="b3-how">다음 단계: {nextAfter.n}</span>{nextAfter.c}.</p>{bar(nextAfter)}</> : x.again ? <p className="b3-guide b3-nextg"><small>{x.again}</small></p> : null}
              </> : <><p className="b3-guide"><span className="b3-how">획득 방법</span>{b.c}.</p>{bar(b)}</>}
            <p className="b3-cnt">{own ? `${own}명이 획득했어요` : '아직 획득한 사람이 없어요'}</p>
          </div>
          <div className="bdg-dact">
            {on ? (props.pick === sid
              ? <button type="button" className="btn sm" disabled>지금 프로필 배지예요</button>
              : <button type="button" className="btn sm pri" onClick={() => props.onPick(sid)}>프로필 배지로 쓰기</button>)
              : G.go && !q ? <a className="btn sm pri" href={'#' + G.go[0]} onClick={e => { e.preventDefault(); props.onClose(); api.go(G.go![0]); }}>{G.go[1]} →</a> : null}
          </div>
        </div>
      </div>
    </>
  );
}

function Cell(props: { b: IStepBadge; next: boolean; onOpen: (id: string) => void }): JSX.Element {
  const { b } = props;
  const on = b.have;
  const q = b.hid && !on;
  const sub = q ? '' : on ? (b.date ? dateOf(b.date) : '받음') : props.next ? <span className="ba-pn">{b.cur} / {b.need}</span> : '';
  return (
    <li className={'bdg-rv bdg-in ba-c' + (on ? ' is-got' : props.next ? ' is-next' : ' is-lock')}>
      <button type="button" className={'bdg-cell b3-cell' + (on ? '' : ' off')} aria-label={`${q ? '숨은 배지' : b.n}, ${on ? '받음' : props.next ? `다음 목표, ${b.cur} / ${b.need}` : '아직 받지 않음'}`} onClick={() => props.onOpen(b.id)}>
        <span className="bdg-em"><BadgeArt art={b.art} on={on} hidden={b.hid} /></span><b>{q ? '???' : b.n}</b><span className="bdg-c2 ba-sub">{sub}</span>
      </button>
    </li>
  );
}

export function BadgesPage(props: { api: IHubApi; series: ISeriesState[]; pick: string; rawPick?: string; repArt?: string; onPick: (sid: string) => void; onOpenProfile: () => void }): JSX.Element {
  const { api, series } = props;
  const [tab, setTab] = React.useState('all');
  const [open, setOpen] = React.useState('');
  const all = series.reduce((a, s) => a.concat(s.steps), [] as IStepBadge[]);
  const got = all.filter(b => b.have).length;
  const rep = series.filter(s => s.sid === props.pick && !!s.top)[0] || series.filter(s => !!s.top && s.top.art === props.repArt)[0];
  const next = series.filter(s => !!s.next && !s.hid && ratioOf(s) < 1).sort((a, b) => ratioOf(b) - ratioOf(a)).slice(0, 3);
  const cnt = (f: (s: ISeriesState) => boolean): [number, number] => { const L = series.filter(f).reduce((a, s) => a.concat(s.steps), [] as IStepBadge[]); return [L.filter(b => b.have).length, L.length]; };
  const tabs = ([{ k: 'all', n: '전체', f: (s: ISeriesState) => !!s }] as { k: string; n: string; f: (s: ISeriesState) => boolean }[]).concat(CATS.map(c => ({ k: c.k, n: c.n, f: (s: ISeriesState) => c.has(s.g) })));
  const tabRef = React.useRef<HTMLDivElement>(null);
  return (
    <div className="wrap">
      <div className="ptop"><div><h1>배지 모음</h1><p>Hub에서 한 일이 배지로 남아요. 받은 배지 하나를 골라 프로필 배지로 쓸 수 있어요.</p></div>
        <div className="bdg-sum"><div><span className="bdg-big" id="mv-bdgCnt">{got}<span>/ {all.length}</span></span><small>전체의 {all.length ? Math.round(got / all.length * 100) : 0}%를 모았어요</small></div>
          <div className="bdg-rep"><span className="bdg-em" style={{ width: 52, height: 52 }}>{rep && rep.top ? <BadgeArt art={rep.top.art} on={true} /> : null}</span>
            <span><small>프로필 배지</small><b>{rep && rep.top ? rep.top.n : '아직 없어요'}</b><button type="button" onClick={props.onOpenProfile}>바꾸기</button></span></div></div>
      </div>
      {/* 프로필을 배지 대신 내 사진으로 / 다시 자동(최근 받은 배지)으로 */}
      {got ? <p className="bpicks" style={{ justifyContent: 'flex-end', margin: '-12px 0 0' }}>
        {props.rawPick !== 'photo' ? <button type="button" className="bpick reset" onClick={() => props.onPick('photo')}>배지 대신 내 사진 쓰기</button> : null}
        {props.rawPick ? <button type="button" className="bpick reset" onClick={() => props.onPick('')}>최근 받은 배지로 자동 바꾸기</button> : null}
      </p> : null}

      <section className="bdg-sec b3-next" aria-labelledby="hub-bdgNextH"><header><h2 id="hub-bdgNextH">곧 받을 배지</h2><small>조금만 더 하면 받아요</small></header>
        <div id="mv-bdgNext">{next.length ? <ul className="ba-next">{next.map((s, i) => {
          const nx = s.next!;
          const G = GRP[s.g];
          const u = nx.u.replace(/(\d+)/, '\u0000$1\u0000').split('\u0000');
          return (
            <li key={s.sid} className="bdg-rv bdg-in" style={{ '--d': i * 50 + 'ms' } as React.CSSProperties}>
              <button type="button" aria-label={`${nx.n}, ${nx.u}`} onClick={() => setOpen(nx.id)}><span className="bdg-em"><BadgeArt art={nx.art} on={false} /></span>
                <span className="ba-nt"><small className="ba-ng">{G.n}{SERIES_NAME[s.sid] ? ' · ' + SERIES_NAME[s.sid] : ''}</small><b>{nx.n}</b>
                  <span className="ba-nd">{u.length === 3 ? <>{u[0]}<em>{u[1]}</em>{u[2]}</> : nx.u}</span>
                  <span className="ba-nb" aria-hidden="true"><i style={{ width: Math.max(4, ratioOf(s) * 100).toFixed(0) + '%' }} /></span></span></button>
              {G.go ? <a className="ba-go" href={'#' + G.go[0]} onClick={e => { e.preventDefault(); api.go(G.go![0]); }}>{G.go[1]}<span aria-hidden="true"> →</span></a> : null}
            </li>
          );
        })}</ul> : <p className="ba-none">지금 진행 중인 배지를 모두 받았어요.</p>}</div>
      </section>

      <section className="bdg-sec ba-all" aria-labelledby="hub-bdgAllH"><header><h2 id="hub-bdgAllH">전체 배지</h2><small>배지를 누르면 받는 방법이 보여요</small></header>
        <div className="ba-tabs" id="mv-baTabs" role="tablist" aria-label="배지 묶음" ref={tabRef}
          onKeyDown={e => {
            if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') { return; }
            const i = tabs.findIndex(t => t.k === tab); const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
            e.preventDefault(); setTab(n.k); window.setTimeout(() => { const el = tabRef.current && tabRef.current.querySelector('[aria-selected="true"]') as HTMLElement; if (el) { el.focus(); } }, 0);
          }}>
          {tabs.map(t => { const [g, n] = cnt(t.f); return <button key={t.k} type="button" role="tab" aria-selected={tab === t.k} tabIndex={tab === t.k ? 0 : -1} onClick={() => setTab(t.k)}>{t.n}<span>{g} / {n}</span></button>; })}
        </div>
        <div id="mv-bdgGroups" role="tabpanel">
          {CATS.filter(c => tab === 'all' || tab === c.k).map(c => {
            const S = series.filter(s => c.has(s.g));
            const L = S.reduce((a, s) => a.concat(s.steps), [] as IStepBadge[]);
            return (
              <div key={c.k} className="b4-k ba-k"><h3>{c.n}<span>{L.filter(b => b.have).length} / {L.length}</span></h3>
                {c.k === 'hidden' ? <>
                  <p className="ba-hhow">조건은 비밀이에요. Hub를 여러 방법으로 쓰다 보면 뜻밖에 받아요.</p>
                  <ul className="bdg-cells ba-hid">{L.map(b => <Cell key={b.id} b={b} next={false} onOpen={setOpen} />)}</ul>
                </> : S.map(s => {
                  const ni = s.steps.findIndex(b => !b.have);
                  return (
                    <div key={s.sid} className="ba-row"><h4>{SERIES_NAME[s.sid] || ''}<span>{s.L} / {s.steps.length}</span>{SERIES_HOW[s.sid] ? <small className="ba-how">{SERIES_HOW[s.sid]}</small> : null}</h4>
                      <ul className="bdg-cells ba-track">{s.steps.map((b, i) => <Cell key={b.id} b={b} next={i === ni} onOpen={setOpen} />)}</ul></div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </section>
      <div className="bdg-end" aria-hidden="true" />
      {open ? <BadgeDialog api={api} series={series} stepId={open} pick={props.pick} onPick={sid => { props.onPick(sid); }} onClose={() => setOpen('')} /> : null}
    </div>
  );
}
