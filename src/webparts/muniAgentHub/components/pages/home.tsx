/* Home (시안 그대로): 히어로 검색(문구 5개 중 무작위), 메뉴 바로가기, 지금 부문별 1위, 처음 시작하는 법 4단계 */
import * as React from 'react';
import { IAward, IRankRow, awards } from '../../models/activity';
import { newestFirst } from '../../models/rules';
import { IHubApi } from '../api';
import { Go } from '../ui';
import { BigSearch } from './common';

/** 주 기준이 같을 때: 다음 기준에서 앞선 이유를 보여 줍니다. 끝까지 같으면 1위 하나만 보여 주고 '공동'은 쓰지 않습니다 */
function tieNote(a: IAward, top: IRankRow, second: IRankRow): string {
  const labels = a.tieLabels || [];
  const x = top.tie || [];
  const y = second.tie || [];
  for (let i = 0; i < labels.length; i++) {
    if ((x[i] || 0) !== (y[i] || 0)) { return `${a.unit} 같음 · ${labels[i].label} ${labels[i].fmt(x[i] || 0)} > ${labels[i].fmt(y[i] || 0)}`; }
  }
  return '1위';
}

/** 홈 배너 문구: 열 때마다 하나를 무작위로 보여 줍니다. 문구는 이 목록만 고치면 됩니다. */
const HERO_LINES: [string, string][] = [
  ['찾고, 쓰고, 함께 만드는', '우리 회사 AI'],
  ['오늘 덜어 내고 싶은 일,', '무엇인가요?'],
  ['내 시간을 아껴 줄 AI,', '동료가 먼저 만들어 뒀어요'],
  ['일 잘하는 당신 곁에', '동료들이 만든 AI가 있어요'],
  ['우리가 만들고, 우리가 쓰는', '우리만의 AI 공간']
];
const HAND = <svg className="ihd" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 13V6a1.5 1.5 0 0 1 3 0v5M11 10.5V4.5a1.5 1.5 0 0 1 3 0v6M14 10.5V5.5a1.5 1.5 0 0 1 3 0V12M17 11.5V9a1.5 1.5 0 0 1 3 0v5c0 4.2-2.8 7-6.6 7-2.6 0-4.3-1.1-5.7-3.1L4.2 14a1.5 1.5 0 0 1 2.4-1.8L8 14" /></svg>;

export function HomeView(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const d = api.data;
  const line = React.useMemo(() => HERO_LINES[Math.floor(Math.random() * HERO_LINES.length)], []);
  const market = d.agents.length + d.skills.length + d.htmls.length;
  const gathering = d.ideas.filter(i => api.stageOf(i) === 'live').length;
  const cases = d.cases.filter(c => !c.pending);
  const aw = awards(d, api.me, api.now);
  // 손 들 사람을 기다리는 아이디어: 공감 모으는 중이고 아직 만드는 사람이 없는 것, 공감 많은 순 3개
  const waiting = d.ideas.filter(i => api.stageOf(i) === 'live' && !api.makers(i.id).length)
    .sort((a, b) => api.likeCount('Idea', b.id) - api.likeCount('Idea', a.id)).slice(0, 3);
  const recentCases = cases.slice().sort((a, b) => newestFirst(a.created, b.created)).slice(0, 3);

  return (
    <>
      <section className="hero">
        <span className="blob" style={{ width: 110, height: 110, left: '8%', top: '22%', transform: 'rotate(-10deg)' }} />
        <span className="blob" style={{ width: 80, height: 80, right: '10%', top: '20%', borderRadius: '50%' }} />
        <span className="blob" style={{ width: 120, height: 120, right: '14%', bottom: -30, transform: 'rotate(12deg)' }} />
        <div className="wrap" style={{ position: 'relative' }}>
          <h1>{line[0]}<br />{line[1]}</h1>
          <BigSearch id="hub-home-q" className="homeSearch" label="Hub 전체 검색" placeholder="무엇이든 검색 (예: 회의록, 용어집 Skill, 제조 사례)" onSearch={q => api.search(q)} />
          <nav className="hero-links" aria-label="Hub 메뉴">
            <Go go={api.go} view="market"><b>Marketplace</b><span>{market}개</span></Go>
            <Go go={api.go} view="ideas"><b>Idea Board</b><span>공감 모으는 중 {gathering}개</span></Go>
            <Go go={api.go} view="cases"><b>Case Library</b><span>사례 {cases.length}개</span></Go>
            <Go go={api.go} view="maker"><b>Maker Lab</b><span>만들러 가기</span></Go>
          </nav>
        </div>
      </section>
      <div className="wrap">
        <section className="sec bwall" aria-labelledby="hub-aw-h">
          <div className="sec-h" style={{ marginBottom: 4 }}><h2 id="hub-aw-h">지금 부문별 1위</h2></div>
          <p className="bsub"><span className="live" aria-hidden="true" />실시간 · 1분마다 새로 고침</p>
          <ul>
            {aw.map(a => {
              const top = a.rows[0];
              const second = a.rows[1];
              const fmt = (n: number): string => a.fmt ? a.fmt(n) : String(n);
              // 막대 = 1위 ÷ (1위 + 2위). 혼자면 꽉 차고, 2위와 비슷할수록 절반에 가깝습니다
              const width = top ? Math.round(top.value / (top.value + (second ? second.value : 0) || 1) * 100) : 0;
              const inner = <>
                <span className="hex" aria-hidden="true"><span>{a.icon}</span><small>{a.title}</small></span>
                <span className="sr">{a.title} 1위</span>
                <b>{top ? top.name : '아직 없어요'}</b>
                <em>{top ? `${top.by ? top.by + ' · ' : ''}${a.unit} ${fmt(top.value)}` : '첫 1위가 되어 보세요'}</em>
                <span className="gauge" aria-hidden="true"><i style={{ width: width + '%' }} /></span>
                <small className="gapt">{top ? (!second ? '단독 1위' : top.value !== second.value ? `2위와 ${fmt(Math.round((top.value - second.value) * 10) / 10)} 차이` : tieNote(a, top, second)) : ''}</small>
              </>;
              return <li key={a.k}>{top && top.view && top.id ? <Go go={api.go} view={top.view} id={top.id}>{inner}</Go> : <a>{inner}</a>}</li>;
            })}
          </ul>
        </section>
        <section className="zig" aria-labelledby="hub-st-h"><h2 id="hub-st-h">처음이라면 이렇게 시작해요</h2>
          <div className="zrow">
            <div className="zbox"><span className="zn">1</span><h3>써 보기</h3><p>동료가 만든 Agent, Skill, HTML을 찾아 바로 써요.</p><Go go={api.go} view="market" className="btn pri">Marketplace 가기</Go></div>
            <div className="zside"><p className="zlead">업무 분야로 찾고, 마음에 들면 바로 열어요</p>
              <ul className="zfacts">
                <li><span className="kchip t-a">Agent</span><b>{d.agents.length}</b><span>Teams와 Copilot에서 열어요</span></li>
                <li><span className="kchip t-s">Skill</span><b>{d.skills.length}</b><span>파일을 받아 Agent에 붙여요</span></li>
                <li><span className="kchip t-h">HTML</span><b>{d.htmls.length}</b><span>브라우저에서 바로 열어요</span></li>
              </ul></div>
          </div>
          <div className="zrow rev">
            <div className="zbox"><span className="zn">2</span><h3>아이디어 붙이기</h3><p>있으면 좋겠는 걸 한 줄로 남기거나, 남이 붙인 아이디어에 손을 들어요.</p><Go go={api.go} view="ideas" className="btn pri">Idea Board 가기</Go></div>
            <div className="zside"><p className="zlead">손 들 사람을 기다리는 아이디어</p>
              {waiting.length ? <div className="znotes">{waiting.map((i, k) => (
                <article key={i.id} className={'znote n' + (k + 1)}>
                  <Go go={api.go} view="idea" id={i.id} className="stretch"><b>{i.title}</b></Go>
                  <span>{i.author ? i.author.name : ''} · 공감 {api.likeCount('Idea', i.id)}</span>
                  <button type="button" className="zhand" onClick={() => api.toggleMake(i.id)}>{HAND}만들래요</button>
                </article>
              ))}</div> : <p className="note">지금은 기다리는 아이디어가 없어요. 첫 아이디어를 붙여 보세요.</p>}
            </div>
          </div>
          <div className="zrow">
            <div className="zbox"><span className="zn">3</span><h3>고객 사례 찾기</h3><p>지금 프로젝트와 같은 업종에서 어떤 개선이 있었는지 찾아봐요.</p><Go go={api.go} view="cases" className="btn pri">Case Library 가기</Go></div>
            <div className="zside"><p className="zlead">최근 고객 사례</p>
              {recentCases.length ? <div className="zcases">{recentCases.map(c => (
                <Go key={c.id} go={api.go} view="case" id={c.id} className="zcase">
                  <span className="zci">{c.industry ? <span className="kchip">{c.industry}</span> : null}{c.client}</span><b>{c.title}</b>{c.keyValue ? <em>{c.keyNote ? c.keyNote + ' ' : ''}{c.keyValue}</em> : null}
                </Go>
              ))}</div> : <p className="note">아직 올라온 사례가 없어요.</p>}
            </div>
          </div>
          <div className="zrow rev">
            <div className="zbox"><span className="zn">4</span><h3>직접 만들고 배포하기</h3><p>가이드를 따라 Dev 환경에서 만들고, 테스트를 마치면 배포를 신청해요.</p>
              <span className="zbtns"><Go go={api.go} view="maker" className="btn">Maker Lab 가기</Go><button type="button" className="btn pri" onClick={() => api.launchDesk()}>배포하러 가기 ↗</button></span></div>
            <div className="zside"><p className="zlead">만들기부터 배포까지</p>
              <ol className="zflow"><li><b>Dev에서 만들기</b><span>Copilot Studio 또는 Agent Builder</span></li><li><b>테스트</b><span>질문 5개로 결과 확인</span></li><li><b>배포 신청</b><span>승인되면 Prod에 올라가요</span></li></ol></div>
          </div>
        </section>
      </div>
    </>
  );
}
