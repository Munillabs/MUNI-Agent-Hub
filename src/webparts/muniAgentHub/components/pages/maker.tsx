/* Maker Lab (시안 그대로): 만들기 4단계, 도구별 등록 방법, 가이드 */
import * as React from 'react';
import { IHubApi } from '../api';

export function MakerLab(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const guide = React.useRef<HTMLDivElement>(null);
  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Maker Lab</span><h1>Maker Lab</h1><p>가이드부터 배포까지</p></div></div>
      <ol className="journey" style={{ listStyle: 'none', padding: 0 }}>
        <li className="step"><span className="n">1</span><h3>시작 가이드</h3><p>Agent를 만들기 전에 알아야 할 것. 환경(Dev/Prod), 지켜야 할 규칙, 자주 하는 실수.</p>
          <a className="btn sm" href="#guide" onClick={e => { e.preventDefault(); if (guide.current) { guide.current.scrollIntoView({ behavior: 'smooth' }); } }}>가이드 읽기</a></li>
        <li className="step"><span className="n">2</span><h3>Tool Fit 판단</h3><p>질문 10개에 답하면 Agent Builder, Copilot Studio 중 맞는 도구와 위험도를 알려 줘요.</p>
          <a className="btn sm" href="#" onClick={e => { e.preventDefault(); const t = api.data.htmls.filter(h => /tool\s*fit/i.test(h.title))[0]; if (t) { api.openHtml(t); } else { api.soon('Tool Fit'); } }}>Tool Fit 시작 (HTML)</a></li>
        <li className="step"><span className="n">3</span><h3>Dev에서 만들고 테스트</h3><p>MUNI LABS-Dev 환경에서 만들고 테스트 5문항을 통과해요. Profile Card도 같이 채워요.</p>
          <a className="btn sm" href="#" onClick={e => { e.preventDefault(); api.soon('테스트 기준'); }}>테스트 기준 보기</a></li>
        <li className="step hl"><span className="n">4</span><h3>Launch Desk</h3><p>Teams에서 배포 신청 Agent와 대화하면 신청이 접수돼요. Copilot Studio Agent는 Prod 배포 후, Agent Builder Agent는 배포 없이 Profile Card만으로 Marketplace에 올라가요.</p>
          <button type="button" className="btn sm pri" onClick={() => api.launchDesk()}>배포하러 가기 ↗</button>
          </li>
      </ol>
      <div className="sec" id="guide" ref={guide}>
        <section><div className="sec-h"><h2>가이드</h2><a href="#" onClick={e => { e.preventDefault(); api.soon('가이드 전체'); }}>전체 →</a></div>
          <ul className="rows">
            <li><span className="t"><b>처음 Agent 만들기 (10분)</b><span>Agent Builder로 첫 Agent 만들기</span></span></li>
            <li><span className="t"><b>환경과 배포 규칙 한 장 요약</b><span>Dev에서 만들고, Prod는 배포 관리자가</span></span></li>
            <li><span className="t"><b>써도 되는 커넥터·MCP 목록</b><span>허용 / 승인 필요 / 차단</span></span></li>
            <li><span className="t"><b>Profile Card 작성법</b><span>Store 카드에 보이는 소개 쓰는 요령</span></span></li>
          </ul></section>
      </div>
    </div>
  );
}
