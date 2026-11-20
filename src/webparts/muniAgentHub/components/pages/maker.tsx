/* Maker Lab (MUNIVERSE 시안): 만들기 4단계, 가이드 */
import * as React from 'react';
import { IHubApi } from '../api';

export function MakerLab(props: { api: IHubApi }): JSX.Element {
  const { api } = props;
  const guide = React.useRef<HTMLDivElement>(null);
  return (
    <div className="wrap">
      <div className="ptop"><div><span className="k">Maker Lab</span><h1>Maker Lab</h1><p>Agent 제작부터 테스트, 배포까지 필요한 과정을 안내해 드려요.</p></div></div>
      <ol className="journey" style={{ listStyle: 'none', padding: 0 }}>
        <li className="step"><span className="n">1</span><h3>시작 가이드</h3><p>Agent를 만들기 전에 알아야 할 개발 환경, 운영 규칙, 주의사항을 확인하세요.</p>
          <a className="btn sm" href="#guide" onClick={e => { e.preventDefault(); if (guide.current) { guide.current.scrollIntoView({ behavior: 'smooth' }); } }}>가이드 확인하기 →</a></li>
        <li className="step"><span className="n">2</span><h3>제작 도구 선택하기</h3><p>10가지 질문에 답하고, 내 Agent에 적합한 제작 도구와 주의사항을 확인하세요.</p>
          <a className="btn sm" href="#" onClick={e => { e.preventDefault(); const t = api.data.htmls.filter(h => /tool\s*fit/i.test(h.title))[0]; if (t) { api.openHtml(t); } else { api.soon('Tool Fit'); } }}>Tool Fit 시작하기 →</a></li>
        <li className="step"><span className="n">3</span><h3>만들고 테스트하기</h3><p>개발 환경에서 Agent를 만들고, 5가지 테스트 항목을 확인하세요. Profile Card도 함께 작성해 주세요.</p>
          <a className="btn sm" href="#" onClick={e => { e.preventDefault(); api.soon('테스트 기준'); }}>테스트 기준 확인하기 →</a></li>
        <li className="step hl"><span className="n">4</span><h3>배포하고 공유하기</h3><p>Copilot Studio Agent는 배포를 신청하고, Agent Builder Agent는 Profile Card를 등록해 Marketplace에 공유하세요.</p>
          <button type="button" className="btn sm pri" onClick={() => api.launchDesk()}>배포 신청하기 →</button></li>
      </ol>
      <div className="sec" id="mv-guide" ref={guide}>
        <section><div className="sec-h"><h2>가이드</h2><a href="#" onClick={e => { e.preventDefault(); api.soon('가이드 전체'); }}>전체 보기 →</a></div>
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
