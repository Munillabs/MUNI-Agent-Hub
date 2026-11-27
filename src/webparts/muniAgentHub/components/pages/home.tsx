/* Home (MUNIVERSE 시안): 점 지구본 배너 + 검색, 지금 우리 MUNIVERSE를 빛내는 사람들, 처음이라면 이렇게 시작해요(01~04 지그재그) */
import * as React from 'react';
import { IAward, IRankRow, awards } from '../../models/activity';
import { daysSince, newestFirst } from '../../models/rules';
import { HubView, IPerson } from '../../models/types';
import { IHubApi } from '../api';
import { Go } from '../ui';
import { BadgeMedal } from '../badge';
import { catLabel, catVars, ideaCats } from './ideas';
import { ArrowMore, CountUp, Globe, IGlobePin, reducedMotion, useScrollTick, useTypingPlaceholder } from '../mv';
import { InlineSearch } from '../searchov';

/** 배너 문구: 열 때마다 5개 중 하나를 무작위로. 색은 첫째 줄·둘째 줄로 나뉩니다(design/hub-overrides.css).
    특정 말만 강조하려면 [ ] 로 감싸세요 */
const HERO_LINES: [string, string][] = [
  ['우리의 AI 경험이 모여', '함께 빛나는 곳, MUNIVERSE'],
  ['매번 반복하는 업무,', '동료의 Agent가 도와줄지도 몰라요.'],
  ['혼자 떠올린 아이디어도,', '나누면 함께 만들 수 있어요.'],
  ['새 프로젝트를 시작하기 전,', '비슷한 고객 사례부터 살펴볼까요?'],
  ['내가 만든 Agent,', '누군가가 찾던 도구일지도 몰라요.']
];
/** '[강조]' → <span class="c45-k"> */
function Hl(props: { t: string }): JSX.Element {
  const parts = props.t.split(/(\[[^\]]+\])/);
  return <>{parts.map((p, i) => /^\[.*\]$/.test(p) ? <span key={i} className="c45-k">{p.slice(1, -1)}</span> : p)}</>;
}
const SEARCH_EX = ['회의록 정리', '용어집', '제조 사례', '견적 계산기', '주간 보고 작성기'];
const ymd = (iso: string): string => (iso || '').slice(0, 10).replace(/-/g, '/');

/** 부문별 1위 카드 순서와 문구 (시안 c15) */
const HOF: { k: string; u: string; sx: string }[] = [
  { k: 'idea', u: '게시한 아이디어', sx: '개' },
  { k: 'share', u: '공유한 도구', sx: '개' },
  { k: 'pop', u: '별점', sx: '' },
  { k: 'review', u: '등록한 리뷰', sx: '개' },
  { k: 'visit', u: '방문한 횟수', sx: '회' }
];

function HallOfFame(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const aw = awards(api.data, api.me, api.now);
  const sec = React.useRef<HTMLElement>(null);
  const [on, setOn] = React.useState(reducedMotion());
  React.useEffect(() => {
    const el = sec.current;
    if (!el || reducedMotion() || !('IntersectionObserver' in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver(es => {
      const v = es[0].isIntersecting;
      if (v) { setOn(true); } else if (es[0].boundingClientRect.top > 0) { setOn(false); }
    }, { threshold: 0.25 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  // 스크롤에 따라 칸마다 육각형이 다른 속도로 떠오름(홀짝 반대 방향)
  const [par, setPar] = React.useState(0);
  useScrollTick(sec, () => {
    const el = sec.current;
    if (!el || reducedMotion()) { return; }
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    if (r.bottom < 0 || r.top > vh) { return; }
    setPar(Math.max(-1, Math.min(1, ((r.top + r.height / 2) - vh / 2) / (vh / 2))));
  }, []);
  const K = [1, -0.6, 1.2, -0.6, 1];
  return (
    <section className={'sec c15-hof' + (on ? ' c15-in' : '')} aria-labelledby="hub-awH" ref={sec}>
      <div className="c15-h"><h2 id="hub-awH">지금 우리 MUNIVERSE를 빛내는 사람들</h2><p className="bsub"><span className="live" aria-hidden="true" />실시간 · 지금까지의 활동 기준</p></div>
      <ul>
        {HOF.map((h, i) => {
          const a = aw.filter(x => x.k === h.k)[0] as IAward | undefined;
          if (!a) { return null; }
          const top: IRankRow | undefined = a.rows[0];
          const isAgent = h.k === 'pop';
          const dg = isAgent ? 1 : 0;
          const person: IPerson | undefined = top && !isAgent ? { id: Number(top.key), name: top.name, email: '' } : undefined;
          const badge = person ? api.avatarOf(person) : undefined;
          const mine = a.mine;
          const pct = top && mine ? Math.max(6, Math.min(100, Math.round(mine.value / (top.value || 1) * 100))) : 0;
          const left = top && mine ? Math.max(0, Math.round((top.value - mine.value) * 10) / 10) : 0;
          const card = (
            <>
              <div className="c15-icon"><span className="hex" aria-hidden="true"><span>{a.icon}</span><small>{a.title}</small></span></div>
              <p className="c15-who">{!top ? <b>아직 없어요</b> : isAgent ? <span className="c15-agent">{top.name}</span>
                : <><span className="c15-pb" aria-hidden="true">{badge && badge !== 'photo' ? <BadgeMedal k={badge} size={28} /> : null}</span><b>{top.name}</b></>}</p>
              <p className="c15-num"><span>{h.u}</span><b><CountUp to={top ? top.value : 0} digits={dg} start={on} delay={i * 160} /></b><span className="c15-sx">{h.sx}</span></p>
              {!isAgent && top && mine ? (
                <div className="c15-me"><p className="c15-gl"><span className="c15-mr">나 <b>{mine.value ? `${mine.rank}위` : '-'}</b></span><span className="c15-left">{mine.rank === 1 && mine.value ? '지금 1위' : <>1위까지 <b>{left}</b></>}</span></p>
                  <span className="c15-bar" role="img" aria-label={`1위의 ${pct}%, 1위까지 ${left} 남음`}><i style={{ '--w': pct + '%' } as React.CSSProperties} /></span></div>
              ) : null}
              <span className="sr">{a.title} 1위 {top ? top.name : '없음'}, {h.u} {top ? top.value : 0}</span>
            </>
          );
          const style = { '--i': i, '--c15p': (par * 10 * (K[i] || 1)).toFixed(1) + 'px' } as React.CSSProperties;
          return <li key={h.k} style={style} className={isAgent ? 'c15-ag' : undefined}>
            {isAgent && top && top.view && top.id ? <Go go={api.go} view={top.view} id={top.id} className="stretch" label={`${top.name} 보기`}>{null}</Go> : null}{card}</li>;
        })}
      </ul>
    </section>
  );
}

export function HomeView(props: { api: IHubApi; dark?: boolean; rootRef?: React.RefObject<HTMLElement> }): JSX.Element {
  const { api } = props;
  const d = api.data;
  const line = React.useMemo(() => HERO_LINES[Math.floor(Math.random() * HERO_LINES.length)], []);
  const market = d.agents.length + d.skills.length + d.htmls.length;
  const gathering = d.ideas.filter(i => api.stageOf(i) === 'live').length;
  const cases = d.cases.filter(c => !c.pending);
  // Case Library는 솔루션 단위: 최근 사례의 솔루션 3개
  const recentSols: { c: typeof cases[0]; k: number }[] = [];
  cases.slice().sort((a, b) => newestFirst(a.created, b.created)).forEach(c => c.solutions.forEach((_, k) => { if (recentSols.length < 3) { recentSols.push({ c, k }); } }));
  const SOL_LABEL: { [k: string]: string } = { agent: 'Agent', skill: 'Skill', html: 'HTML' };
  const fresh = ([] as { k: 'a' | 's' | 'h'; view: HubView; id: number; title: string; created: string }[])
    .concat(d.agents.map(a => ({ k: 'a' as const, view: 'agent' as HubView, id: a.id, title: a.title, created: a.created })))
    .concat(d.skills.map(s => ({ k: 's' as const, view: 'skill' as HubView, id: s.id, title: s.title, created: s.created })))
    .concat(d.htmls.map(h => ({ k: 'h' as const, view: 'htool' as HubView, id: h.id, title: h.title, created: h.created })))
    .sort((a, b) => newestFirst(a.created, b.created)).slice(0, 3);
  const recentIdeas = d.ideas.filter(i => api.stageOf(i) !== 'archived').sort((a, b) => newestFirst(a.created, b.created)).slice(0, 4);
  const pins: IGlobePin[] = React.useMemo(() => {
    const A = d.agents.map(a => ({ k: 'a' as const, name: a.title, maker: a.owner ? a.owner.name : '', view: 'agent' as HubView, id: a.id }));
    const S = d.skills.map(s => ({ k: 's' as const, name: s.title, maker: s.author ? s.author.name : '', view: 'skill' as HubView, id: s.id }));
    const H = d.htmls.map(h => ({ k: 'h' as const, name: h.title, maker: h.author ? h.author.name : '', view: 'htool' as HubView, id: h.id }));
    // 종류가 고루 섞이게 번갈아 12개
    const out: IGlobePin[] = [];
    for (let i = 0; out.length < 12 && (i < A.length || i < S.length || i < H.length); i++) { [A[i], S[i], H[i]].forEach(x => { if (x && out.length < 12) { out.push(x); } }); }
    return out;
  }, [d.agents.length, d.skills.length, d.htmls.length]); // eslint-disable-line react-hooks/exhaustive-deps

  /* 배너 */
  const hero = React.useRef<HTMLElement>(null);
  const cue = React.useRef<HTMLAnchorElement>(null);
  const qIn = React.useRef<HTMLInputElement>(null);
  useTypingPlaceholder(qIn, 'Hub 전체 검색', SEARCH_EX);
  // 검색창 펼침 모션: 보일 때마다 다시
  const sf = React.useRef<HTMLLabelElement>(null);
  const [sIn, setSIn] = React.useState(reducedMotion() ? 'b6-in b6-done' : '');
  React.useEffect(() => {
    const f = sf.current;
    if (!f || reducedMotion() || !('IntersectionObserver' in window)) { return undefined; }
    let t = 0;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { window.requestAnimationFrame(() => window.requestAnimationFrame(() => setSIn('b6-in'))); window.clearTimeout(t); t = window.setTimeout(() => setSIn('b6-in b6-done'), 1700); }
      else if (!f.contains(document.activeElement)) { window.clearTimeout(t); setSIn(''); }
    }), { threshold: 0, rootMargin: '0px 0px -12% 0px' });
    io.observe(f);
    return () => { io.disconnect(); window.clearTimeout(t); };
  }, []);
  // 아래로 스크롤 안내: 스크롤하면 사라짐
  const [cueGone, setCueGone] = React.useState(false);
  useScrollTick(hero, y => { const g = y > 40; setCueGone(p => p === g ? p : g); }, []);

  /* 지그재그: 가운데 선이 스크롤만큼 차오르고, 지나간 단계 점이 켜짐 */
  const zig = React.useRef<HTMLElement>(null);
  const [zp, setZp] = React.useState(0);
  const [zon, setZon] = React.useState<boolean[]>([false, false, false, false]);
  useScrollTick(zig, () => {
    const z = zig.current;
    if (!z || !z.offsetParent) { return; }
    const r = z.getBoundingClientRect(), mid = window.innerHeight * 0.55;
    setZp(Math.round(Math.max(0, Math.min(r.height, mid - r.top - 90))));
    const rows = z.querySelectorAll('.zrow');
    const next: boolean[] = [];
    rows.forEach(w => { const b = w.getBoundingClientRect(); next.push(b.top + b.height / 2 < mid); });
    setZon(p => p.join() === next.join() ? p : next);
  }, []);
  const zr = (i: number, rev: boolean): string => 'zrow' + (rev ? ' rev' : '') + (zon[i] ? ' on' : '');
  const KIND = { a: ['t-a', 'Agent'], s: ['t-s', 'Skill'], h: ['t-h', 'HTML'] };

  return (
    <>
      <section className="hero" ref={hero}>
        <Globe pins={pins} dark={!!props.dark} boxRef={hero} cueRef={cue} rootRef={props.rootRef || hero} onPin={p => api.go(p.view, p.id)} />
        <span className="blob" style={{ width: 110, height: 110, left: '8%', top: '22%', transform: 'rotate(-10deg)' }} />
        <span className="blob" style={{ width: 80, height: 80, right: '10%', top: '20%', borderRadius: '50%' }} />
        <span className="blob" style={{ width: 120, height: 120, right: '14%', bottom: -30, transform: 'rotate(12deg)' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <h1><Hl t={line[0]} /><br /><span className="hl"><Hl t={line[1]} /></span></h1>
          <InlineSearch api={api} scope="all" formId="mv-homeSearch" className="search" label="Hub 전체 검색" placeholder="Hub 전체 검색"
            labelClass={'b6-sx ' + sIn} labelRef={sf} inputRef={qIn} />
          <nav className="hero-links" aria-label="Hub 메뉴">
            <Go go={api.go} view="market"><b>Marketplace</b><span>{market}개</span></Go>
            <Go go={api.go} view="ideas"><b>Idea Board</b><span>공감 모으는 중 {gathering}개</span></Go>
            <Go go={api.go} view="cases"><b>Case Library</b><span>솔루션 {cases.reduce((n, c) => n + c.solutions.length, 0)}개</span></Go>
            <Go go={api.go} view="maker"><b>Maker Lab</b><span>만들러 가기</span></Go>
          </nav>
        </div>
        <a className={'b5-cue' + (cueGone ? ' b10-gone' : '')} href="#home" aria-label="아래로 스크롤" ref={cue}
          onClick={e => { e.preventDefault(); const n = hero.current && hero.current.nextElementSibling; if (n) { n.scrollIntoView({ behavior: reducedMotion() ? 'auto' : 'smooth' }); } }}>
          <span className="c14-t" aria-hidden="true">SCROLL</span><i aria-hidden="true" /></a>
      </section>
      <div className="wrap">
        <HallOfFame api={api} />
        <section className="zig" aria-labelledby="hub-stH" ref={zig} style={{ '--zp': zp + 'px' } as React.CSSProperties}>
          <h2 id="hub-stH" className="rv">처음이라면 이렇게 시작해요</h2>
          <div className={zr(0, false)}>
            <div className="zbox rv"><span className="zn">01</span><h3>써 보기</h3><p>필요한 도구와 자료를 찾고, 바로 사용해 보세요.</p>
              <Go go={api.go} view="market" className="btn pri b6-more b6-home">Marketplace 가기<ArrowMore /></Go></div>
            <div className="zside rv" style={{ '--d': '140ms' } as React.CSSProperties}>
              <ul className="zfacts">
                <li className="rv"><span className="kchip t-a">Agent</span><span>반복되는 업무를<br />빠르게 해결해 보세요</span></li>
                <li className="rv" style={{ '--d': '140ms' } as React.CSSProperties}><span className="kchip t-s">Skill</span><span>원하는 결과를 쉽고 정확하게 받아 보세요</span></li>
                <li className="rv" style={{ '--d': '280ms' } as React.CSSProperties}><span className="kchip t-h">HTML</span><span>복잡한 정보를 한눈에 확인하세요</span></li>
              </ul>
              {fresh.length ? <div className="znew"><p className="znew-h rv">새로 올라왔어요</p>
                {fresh.map((x, k) => (
                  <Go key={x.k + x.id} go={api.go} view={x.view} id={x.id} className="znew-r rv" style={{ '--d': (k + 1) * 140 + 'ms' } as React.CSSProperties}>
                    <span className={'zk ' + KIND[x.k][0]}>{KIND[x.k][1]}</span><b>{x.title}</b><em>{ymd(x.created)}</em></Go>
                ))}</div> : null}
            </div>
          </div>
          <div className={zr(1, true)}>
            <div className="zbox rv"><span className="zn">02</span><h3>아이디어 나누기</h3><p>작은 아이디어를 공유하고, 동료와 함께 실제로 만들어 보세요.</p>
              <Go go={api.go} view="ideas" className="btn pri b6-more b6-home">Idea Board 가기<ArrowMore /></Go></div>
            <div className="zside rv" style={{ '--d': '140ms' } as React.CSSProperties}><p className="zlead rv">최근 올라온 아이디어</p>
              {recentIdeas.length ? <div className="c14-notes">{recentIdeas.map(i => {
                const days = daysSince(i.created, api.now);
                const mk = api.makers(i.id).length;
                // 시안 11/25 ib3: SharePoint 카테고리 열 색 종이, 스크랩이면 줄 공책 종이
                return (
                  <Go key={i.id} go={api.go} view="idea" id={i.id} className={'c14-pn t-etc ib3c' + (i.source ? ' ib3-paper' : '')} style={catVars(i.category, ideaCats(api))}>
                    <span className="c14-top"><span className="c14-kd ib3-k">{catLabel(i)}</span><span>{days > 0 ? days + '일 전' : '오늘'}</span></span>
                    <b>{i.title}</b><span className="c14-meta"><span>♡ {api.likeCount('Idea', i.id)}</span>{mk ? <span>{mk}명이 함께해요</span> : null}</span></Go>
                );
              })}</div> : <p className="note">아직 올라온 아이디어가 없어요. 첫 아이디어를 올려 보세요.</p>}
            </div>
          </div>
          <div className={zr(2, false)}>
            <div className="zbox rv"><span className="zn">03</span><h3>고객 사례 살펴보기</h3><p>과거 프로젝트 사례를 살펴보고,<br />업무에 참고할 만한 내용을 찾아보세요.</p>
              <Go go={api.go} view="cases" className="btn pri b6-more b6-home">Case Library 가기<ArrowMore /></Go></div>
            <div className="zside rv" style={{ '--d': '140ms' } as React.CSSProperties}><p className="zlead rv">최근 고객 사례</p>
              {recentSols.length ? (
                <div className="zcases c18-cases" role="table" aria-label="최근 고객 사례">
                  <div className="cb-row cb-head" role="row"><span role="columnheader">업종</span><span role="columnheader">종류</span><span role="columnheader">솔루션</span></div>
                  {recentSols.map(({ c, k }) => { const s = c.solutions[k]; return (
                    <Go key={c.id + ':' + k} go={api.go} view="case" id={c.id} sub={k || undefined} className="cb-row">
                      <span className="cb-c1" role="cell"><span className="cc-dept ct-ind">{c.industry || '기타'}</span></span>
                      {/* 순서: 업종 · 종류 · 솔루션 */}
                      <span className="cb-c4" role="cell"><span className={'cb-hash h-' + s.kind}>#{SOL_LABEL[s.kind]}</span></span>
                      <span className="cb-c2" role="cell"><b className="cb-ttl">{s.name}</b>{s.does ? <small className="cb-chg">{s.does}</small> : null}</span>
                    </Go>
                  ); })}
                </div>
              ) : <p className="note">아직 올라온 사례가 없어요.</p>}
            </div>
          </div>
          <div className={zr(3, true)}>
            <div className="zbox rv"><span className="zn">04</span><h3>직접 만들고 배포하기</h3><p>Agent를 올바르고 안전하게 만들어 동료들과 공유하세요.</p>
              <span className="zbtns"><Go go={api.go} view="maker" className="btn b6-more">Maker Lab 가기<ArrowMore /></Go>
                <button type="button" className="btn pri b6-home" onClick={() => api.launchDesk()}>배포하러 가기 ↗</button></span></div>
            <div className="zside rv" style={{ '--d': '140ms' } as React.CSSProperties}>
              <ol className="zflow">
                <li className="rv"><b>만들기</b><span>Copilot Studio 또는 Agent Builder에서 제작</span></li>
                <li className="rv" style={{ '--d': '140ms' } as React.CSSProperties}><b>평가</b><span>총 5가지 영역에서 테스트</span></li>
                <li className="rv" style={{ '--d': '280ms' } as React.CSSProperties}><b>배포</b><span>배포 전용 Agent에게 신청</span></li>
              </ol></div>
          </div>
        </section>
      </div>
    </>
  );
}
