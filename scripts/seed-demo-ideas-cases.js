/*
 * MUNIVERSE 데모 데이터 — 아이디어 · 고객 사례 넣기 · 지우기 (브라우저 콘솔용)
 *
 * 넣는 것
 *   - HubIdeas : 아이디어 11개 (모집 중 5 · 제작 중 2 · 완성 3 · 보관 1). 제작 중 · 완성은 '만들래요'에 실행한 사람을 넣습니다.
 *   - HubCases : 고객 사례 6개 (문의 담당자 = 실행한 사람). '사용한 솔루션'은 seed-demo-data.js 로 넣은 Agent · Skill · HTML 제목과 같아 Hub에서 연결됩니다.
 *   공감 · 댓글은 넣지 않습니다. 같은 제목이 이미 있으면 건너뜁니다.
 *
 * 쓰는 법
 *   1. Hub 사이트를 열고 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter.
 *   2. 지울 때는 Console 에 hubDemoCleanupIdeasCases() 입력 → 이 스크립트가 넣은 제목의 항목만 휴지통으로 보냅니다.
 */
(() => {
  const day = n => new Date(Date.now() - n * 86400000).toISOString();

  /* ---------- 아이디어 ---------- */
  const IDEAS = [
    { Title: '고객사 Copilot 사용 현황 월간 보고 자동 발송 Agent', Type: 'Agent', Status: '모집 중',
      Detail: '매달 1일에 고객사별 사용량 보고서를 읽어 경영진 보고 메일 초안을 만들어 PM에게 보내 주면 좋겠어요. "사용 현황 → 경영진 보고" Skill을 지침으로 쓰면 될 것 같아요.',
      Pain: '고객사 5곳의 월간 보고서를 매달 손으로 만들고 있어요.', Frequency: '매월', MinutesPerRun: 120 },
    { Title: '제안서가 RFP 요구사항을 다 담았는지 대조하는 Skill', Type: 'Skill', Status: '모집 중',
      Detail: 'RFP의 요구사항을 뽑아 제안서 목차와 대조해 빠진 항목을 표로 보여 주면 좋겠어요.',
      Pain: '제안 마감 전날 밤에 요구사항 표를 한 줄씩 대조해요.', Frequency: '가끔', MinutesPerRun: 180 },
    { Title: '워크숍 실시간 투표판 (QR로 참여)', Type: 'HTML', Status: '모집 중',
      Detail: '시나리오 워크숍에서 참석자가 휴대폰으로 QR을 찍어 투표하고, 결과가 화면에 바로 보이면 좋겠어요. 결과는 시나리오 우선순위 매트릭스로 넘기고요.',
      Pain: '포스트잇 투표 결과를 사진 찍어 다시 엑셀로 옮겨요.', Frequency: '매주', MinutesPerRun: 40 },
    { Title: 'Teams에서 프롬프트를 고쳐 주는 첨삭 봇', Type: 'Agent', Status: '모집 중',
      Detail: '고객사 직원이 쓴 프롬프트를 붙여 넣으면 목표 · 맥락 · 자료 · 기대 결과 기준으로 고쳐 주고 왜 고쳤는지 알려 주는 봇이요. 교육 후 질문 채널에 두면 좋겠어요.',
      Pain: '교육 후 질문 채널에 "이 프롬프트 어때요?" 질문이 하루 10건 넘게 와요.', Frequency: '매일', MinutesPerRun: 10 },
    { Title: '고객사별 Copilot 도입 FAQ 모음', Type: '기타', Status: '모집 중',
      Detail: '"내 메일을 회사가 보나요?", "외부 공유 파일도 보나요?"처럼 고객사마다 반복되는 질문과 답을 한곳에 모아 두면 좋겠어요.',
      Pain: '프로젝트마다 같은 질문에 답을 새로 써요.', Frequency: '매주', MinutesPerRun: 30 },
    { Title: 'Teams 회의 녹취 → 고객 회의록 + 할 일 메일', Type: 'Skill', Status: '제작 중', StartedOn: day(5), make: true,
      Detail: '고객 회의가 끝나면 녹취로 회의록을 만들고, 고객 측 할 일만 뽑아 정중한 메일 초안까지 만들어요.',
      Pain: '고객 회의 후 회의록과 후속 메일 쓰는 데 30분씩 걸려요.', Frequency: '매일', MinutesPerRun: 30 },
    { Title: 'Copilot 라이선스 재배정 추천 도구', Type: 'HTML', Status: '제작 중', StartedOn: day(12), make: true,
      Detail: '30일 동안 쓰지 않은 사람 목록과 대기자 목록을 넣으면 재배정 후보와 절약 금액을 보여 주는 도구예요.',
      Pain: '고객 IT팀이 매달 미사용 라이선스를 엑셀로 골라요.', Frequency: '매월', MinutesPerRun: 60 },
    { Title: '파일럿 설문 결과 자동 집계', Type: 'HTML', Status: '완성', StartedOn: day(24), DoneAt: day(10), ResultRef: '파일럿 효과 측정 대시보드', make: true,
      Detail: 'Forms 사전 · 사후 설문을 붙이면 절감 시간과 만족도를 바로 보여 주는 화면이요.',
      Pain: '파일럿 끝날 때마다 설문 결과를 피벗 테이블로 하루 종일 정리했어요.', Frequency: '매월', MinutesPerRun: 240 },
    { Title: '고객 미팅 전 준비 자료 자동 정리', Type: 'Agent', Status: '완성', StartedOn: day(50), DoneAt: day(33), ResultRef: '고객 미팅 브리핑', make: true,
      Detail: '다음 미팅 고객과 주고받은 메일 · 회의 · 문서를 모아 한 장으로 정리해 주는 Agent요.',
      Pain: '미팅 전에 메일함과 Teams를 30분씩 뒤져요.', Frequency: '매일', MinutesPerRun: 30 },
    { Title: 'SharePoint 오버셰어링 점검표 자동화', Type: 'Skill', Status: '완성', StartedOn: day(15), DoneAt: day(7), ResultRef: '데이터 과다 공유(오버셰어링) 점검', make: true,
      Detail: '사이트 목록과 공유 설정을 넣으면 위험도와 조치 순서를 정리해 주는 Skill이요.',
      Pain: '보안 점검 때마다 사이트 수백 개를 눈으로 훑어요.', Frequency: '가끔', MinutesPerRun: 300 },
    { Title: '사내 회의실 예약 Agent', Type: '기타', Status: '보관', ArchivedOn: day(20),
      Detail: '말로 회의실을 예약하는 Agent요.', Pain: '빈 회의실 찾기가 번거로워요.', Frequency: '매주', MinutesPerRun: 5 }
  ];

  /* ---------- 고객 사례 ---------- */
  const P = (name, text, step) => ({ name, step, text });
  const CASES = [
    { Title: '주간 품질 보고서 작성 시간 68% 단축', Industry: '제조', Client: 'B전자', Dept: '품질경영팀', Period: '2026 2분기',
      Project: 'Microsoft 365 Copilot 전사 도입 · 변화관리 (1,200명)', Area: '품질 관리 · 보고', Pattern: '초안 작성',
      Products: ['Copilot', 'Copilot Studio', 'Excel', 'Word', 'Teams'], KeyResult: '68% 감소', KeyDetail: '주간 품질 보고서 작성 시간',
      Compare: '시간|주 5시간|1.6시간\n품질 수준|보통|높음\n정신적 노력 수준|매우 높음|낮음',
      ChangeBefore: '공장 3곳의 검사 데이터를 엑셀로 모아 보고서 양식에 옮겨 적고, 불량 원인 설명을 매주 새로 썼어요. 금요일 오후가 통째로 보고서 작성에 쓰였어요.',
      ChangeAfter: 'Agent가 검사 데이터를 모아 주간 보고 초안과 불량 원인 요약을 만들고, 담당자는 숫자와 결론만 확인해요. 보고 형식이 공장마다 같아져 경영진 회의 시간도 줄었어요.',
      Process: '[Before]\n공장별 검사 데이터 수신\n엑셀 취합 · 피벗\n보고서 양식에 옮겨 적기\n불량 원인 설명 작성\n팀장 검토 · 수정\n[After]\nAgent가 데이터 취합 · 초안 작성 [AI]\n담당자 숫자 확인\n팀장 승인',
      Measure: '도입 전 4주와 도입 후 4주의 보고서 작성 시간 기록 비교\n보고서 20건을 팀장이 품질 5단계로 평가',
      Solutions: 'agent|프로젝트 주간 보고 작성기\nskill|사용 현황 → 경영진 보고\nhtml|Copilot 사용 현황 대시보드',
      ApplyPoints: '정기 보고서가 여러 사업장 데이터를 모아 만드는 구조일 때\n보고서 양식이 정해져 있지만 작성자마다 품질이 다를 때',
      CasePrompts: JSON.stringify([P('데이터 취합 · 초안', '지난주 공장 3곳의 품질 검사 결과 파일을 읽고, 주간 품질 보고 양식에 맞춰 초안을 써줘. 불량률이 목표(0.5%)를 넘은 라인은 따로 표시하고 원인 후보를 3개씩 적어줘.', 0)]) },
    { Title: '설계사 상품 문의 응답 시간 71% 단축', Industry: '금융·보험', Client: 'C생명', Dept: '영업지원팀', Period: '2026 1분기',
      Project: 'Copilot Studio 상품 Q&A Agent 구축 · 오버셰어링 점검', Area: '영업 지원 · 상품 문의', Pattern: '질의응답',
      Products: ['Copilot Studio', 'Teams', 'Copilot'], KeyResult: '71% 감소', KeyDetail: '설계사 상품 문의 응답 시간',
      Compare: '시간|건당 14분|4분\n품질 수준|보통|높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '설계사가 상품 약관 · 인수 기준을 물으면 영업지원팀이 문서를 찾아 Teams로 답했어요. 하루 150건이 넘는 문의가 몰려 답변이 반나절씩 밀렸어요.',
      ChangeAfter: '설계사가 Teams에서 Agent에게 바로 물어보고, 근거 조항이 붙은 답을 받아요. 영업지원팀은 Agent가 답하지 못한 예외 질문만 처리해요.',
      Process: '[Before]\n설계사 문의 접수\n담당자가 약관 · 지침 검색\n답변 작성\nTeams로 회신\n[After]\nAgent가 근거 조항과 함께 답변 [AI]\n예외 질문만 담당자 처리',
      Measure: '도입 전후 2주간 문의 300건의 응답 시간 비교\nAgent 답변 100건을 상품 담당자가 정확도 검수 (정확도 94%)',
      Solutions: 'agent|사내 규정 도우미\nskill|데이터 과다 공유(오버셰어링) 점검\nhtml|Copilot 도입 준비도 진단',
      ApplyPoints: '같은 문서에서 답을 찾는 문의가 반복될 때\n답변에 근거 조항을 꼭 보여 줘야 할 때',
      CasePrompts: JSON.stringify([P('상품 문의 답변', '종신보험 A상품의 50세 남성 가입 한도와 인수 기준을 알려줘. 답변 끝에 근거가 된 약관 조항을 붙여줘.', 0)]) },
    { Title: '부서 회의록 작성 58% 단축, 결정 사항 누락 0건', Industry: '공공·국제기관', Client: 'D공사', Dept: '기획예산처', Period: '2025 4분기',
      Project: 'Copilot 파일럿 (300명) · ADKAR 기반 변화관리', Area: '회의 · 보고', Pattern: '요약 및 분류',
      Products: ['Copilot', 'Teams', 'Word', 'Outlook'], KeyResult: '58% 감소', KeyDetail: '회의록 작성 시간',
      Compare: '시간|회의당 50분|21분\n품질 수준|보통|매우 높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '막내 직원이 회의 내내 받아 적고, 회의 후 회의록을 정리해 결재를 올렸어요. 결정 사항과 담당자가 빠져 후속 조치가 늦어지는 일이 잦았어요.',
      ChangeAfter: 'Teams 회의 기록으로 회의록 초안과 할 일 목록을 만들고, 담당자에게 메일로 바로 보내요. 직원들은 받아 적는 대신 회의에 참여해요.',
      Process: '[Before]\n회의 중 받아 적기\n회의록 정리\n결정 사항 · 담당자 확인\n결재 · 공유\n[After]\nCopilot이 회의록 · 할 일 초안 작성 [AI]\n작성자 확인 · 결재\n할 일 메일 자동 공유',
      Measure: '파일럿 4주간 회의 120건의 회의록 작성 시간 기록\n결정 사항 누락 여부를 부서장이 확인',
      Solutions: 'skill|변화관리 커뮤니케이션 플랜 (ADKAR)\nhtml|ADKAR 변화 준비도 진단\nhtml|파일럿 효과 측정 대시보드',
      ApplyPoints: '회의가 많고 회의록 결재가 필요한 조직\nAI 도입에 걱정이 커 단계별 변화관리가 필요한 조직',
      CasePrompts: JSON.stringify([P('회의록 · 할 일', '이 회의 기록으로 회의록을 써줘. 결정 사항 / 할 일(담당자 | 할 일 | 기한) / 다음 회의 안건으로 나누고, 공문 말투로 써줘.', 0)]) },
    { Title: '주간 매출 리뷰 자료 준비 80% 단축', Industry: '유통·커머스', Client: 'E리테일', Dept: 'MD기획팀', Period: '2026 3분기',
      Project: 'Copilot 활용 시나리오 발굴 · 부서별 Quick Win 확산', Area: '매출 관리 · 리뷰', Pattern: '데이터 시각화',
      Products: ['Copilot', 'Excel', 'PowerPoint', 'Copilot Cowork'], KeyResult: '80% 감소', KeyDetail: '주간 매출 리뷰 자료 준비 시간',
      Compare: '시간|주 6시간|1.2시간\n품질 수준|보통|높음\n정신적 노력 수준|높음|보통',
      ChangeBefore: '카테고리별 POS 데이터를 내려받아 엑셀로 가공하고, 차트를 PowerPoint에 붙여 리뷰 자료를 만들었어요.',
      ChangeAfter: 'Copilot이 엑셀에서 증감과 이상치를 찾아 요약하고, PowerPoint 리뷰 자료 초안을 만들어요. MD는 원인 해석과 액션에 집중해요.',
      Process: '[Before]\nPOS 데이터 다운로드\n엑셀 가공 · 피벗\n차트 작성\nPowerPoint 정리\n[After]\nCopilot이 증감 · 이상치 분석 [AI]\n리뷰 자료 초안 자동 생성\nMD 해석 · 액션 추가',
      Measure: '시나리오 평가표로 고른 Quick Win 3개를 4주간 측정\n준비 시간 자가 기록과 팀장 품질 평가',
      Solutions: 'skill|Copilot 활용 시나리오 평가\nhtml|시나리오 우선순위 매트릭스\nhtml|Copilot 도입 효과(ROI) 계산기',
      ApplyPoints: '매주 같은 형식의 데이터 리뷰 자료를 만드는 팀\n어디부터 Copilot을 써야 할지 정하지 못한 조직',
      CasePrompts: JSON.stringify([P('매출 분석', '이 시트에서 지난주 대비 매출이 10% 이상 변한 카테고리를 찾고, 원인 후보와 함께 표로 정리해줘. 그다음 리뷰용 슬라이드 5장 초안을 만들어줘.', 0)]) },
    { Title: '상담 후처리 시간 73% 단축', Industry: 'IT·통신·미디어', Client: 'F텔레콤', Dept: '고객센터', Period: '2026 2분기',
      Project: '상담 요약 Agent 구축 · 상담사 교육', Area: '고객 상담', Pattern: '요약 및 분류',
      Products: ['Copilot Studio', 'Teams', 'Outlook'], KeyResult: '73% 감소', KeyDetail: '상담 1건당 후처리 시간',
      Compare: '시간|건당 4.5분|1.2분\n품질 수준|보통|높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '상담이 끝날 때마다 상담사가 메모를 다시 읽고 요약 · 처리 코드를 직접 입력했어요. 후처리 때문에 다음 상담 연결이 늦어졌어요.',
      ChangeAfter: 'Agent가 상담 기록으로 요약과 처리 코드를 추천하고, 상담사는 확인만 해요. 처리 코드 오류도 줄었어요.',
      Process: '[Before]\n상담 종료\n메모 다시 읽기\n요약 작성\n처리 코드 입력\n[After]\nAgent가 요약 · 코드 추천 [AI]\n상담사 확인 후 저장',
      Measure: '상담 1,000건의 후처리 시간 비교\n처리 코드 정확도를 품질팀이 표본 검수',
      Solutions: 'agent|Copilot 학습 코치\nskill|직무별 프롬프트 교육 자료\nhtml|교육 · 확산 퍼널 대시보드',
      ApplyPoints: '같은 형식으로 기록을 남기는 일이 하루 수십 번 반복될 때\n교육 후 실제 사용으로 이어지지 않아 퍼널 관리가 필요할 때',
      CasePrompts: JSON.stringify([P('상담 요약', '이 상담 기록을 3줄로 요약하고, 처리 코드 목록에서 맞는 코드 하나를 추천해줘. 고객이 다시 연락할 가능성이 있으면 표시해줘.', 0)]) },
    { Title: '계약서 1차 검토 시간 55% 단축', Industry: '전문·사업서비스', Client: 'G회계법인', Dept: '법무지원팀', Period: '2026 3분기',
      Project: 'Copilot 도입 착수 · 직무별 활용 교육', Area: '계약 검토', Pattern: '검토 및 점검',
      Products: ['Copilot', 'Word', 'Copilot Cowork'], KeyResult: '55% 감소', KeyDetail: '계약서 1차 검토 시간',
      Compare: '시간|건당 90분|40분\n품질 수준|높음|매우 높음\n정신적 노력 수준|매우 높음|보통',
      ChangeBefore: '담당자가 계약서를 처음부터 끝까지 읽으며 표준 조항과 다른 부분을 표시하고 검토 의견을 따로 정리했어요.',
      ChangeAfter: 'Copilot이 표준 계약서와 비교해 다른 조항과 위험 조항을 표로 먼저 보여 주고, 담당자는 판단과 의견 작성에 집중해요.',
      Process: '[Before]\n계약서 전체 정독\n표준 조항과 비교\n위험 조항 표시\n검토 의견 작성\n[After]\nCopilot이 표준 대비 차이 · 위험 조항 정리 [AI]\n담당자 판단 · 의견 작성\n파트너 확인',
      Measure: '계약서 40건의 검토 시간 비교\n놓친 위험 조항 수를 파트너가 재검토로 확인 (0건)',
      Solutions: 'skill|프로젝트 착수 패키지\nskill|직무별 프롬프트 교육 자료\nhtml|Agent 도구 선택 도우미',
      ApplyPoints: '기준 문서와 비교하는 검토 업무\n최종 판단은 사람이 하되 1차 검토 부담이 큰 업무',
      CasePrompts: JSON.stringify([P('계약서 비교', '이 계약서를 우리 표준 용역 계약서와 비교해서 다른 조항을 표로 정리해줘. 열: 조항 | 표준 | 이 계약서 | 위험도(상·중·하) | 검토 의견.', 0)]) }
  ];

  (async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const me = _spPageContextInfo.userId;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const L = t => `${web}/_api/web/lists/getbytitle('${encodeURIComponent(t)}')`;
    const get = async url => { const r = await fetch(url, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${url.replace(web, '')}`); } return (await r.json()).d; };
    const post = async (url, body) => {
      const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D }, body: JSON.stringify(body) });
      if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
      return (await r.json()).d;
    };
    const multi = a => ({ results: a });
    const log = [];
    const step = async (what, fn) => { try { log.push({ 단계: what, 결과: '✅ ' + (await fn()) }); } catch (e) { log.push({ 단계: what, 결과: '❌ ' + e.message.split('\n')[0] }); console.warn(what, e.message); } };

    for (const [list, rows, fields] of [
      ['HubIdeas', IDEAS, i => { const { make, ...f } = i; return { ...f, ...(make ? { MakersId: multi([me]) } : {}) }; }],
      ['HubCases', CASES, c => ({ ...c, Products: multi(c.Products), ContactId: me })]
    ]) {
      const t = (await get(`${L(list)}?$select=ListItemEntityTypeFullName`)).ListItemEntityTypeFullName;
      const have = (await get(`${L(list)}/items?$select=Title&$top=5000`)).results.map(r => r.Title);
      for (const row of rows) {
        await step(`${list === 'HubIdeas' ? '아이디어' : '사례'} · ${row.Title}`, async () => {
          if (have.indexOf(row.Title) >= 0) { return '이미 있어 건너뜀'; }
          const it = await post(`${L(list)}/items`, { __metadata: { type: t }, ...fields(row) });
          return `ID ${it.Id}`;
        });
      }
    }
    console.table(log);
    console.log(log.every(x => x.결과.startsWith('✅')) ? '✅ 아이디어 · 사례를 다 넣었어요. Hub를 새로 고쳐 보세요.' : '⚠️ 일부가 실패했어요. 위 표의 ❌ 줄을 보내 주세요.');
    console.log('지울 때는 hubDemoCleanupIdeasCases() 를 입력하세요.');
  })().catch(e => console.error('중간에 멈췄어요:', e.message));

  window.hubDemoCleanupIdeasCases = async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    for (const [list, rows] of [['HubIdeas', IDEAS], ['HubCases', CASES]]) {
      const L = `${web}/_api/web/lists/getbytitle('${list}')`;
      const titles = rows.map(r => r.Title);
      const hit = (await (await fetch(`${L}/items?$select=Id,Title&$top=5000`, { headers: J })).json()).d.results.filter(r => titles.indexOf(r.Title) >= 0);
      for (const r of hit) { await fetch(`${L}/items(${r.Id})/recycle()`, { method: 'POST', headers: { ...J, 'X-RequestDigest': D } }); }
      console.log(`${list}: ${hit.length}개 휴지통으로`);
    }
  };
})();
