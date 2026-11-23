/*
 * MUNIVERSE 데모 데이터 — 아이디어 · 고객 사례 넣기 · 지우기 (브라우저 콘솔용)
 *
 * 넣는 것
 *   - HubIdeas : 아이디어 12개 (모집 중 6 · 제작 중 2 · 완성 3 · 보관 1). 제작 중 · 완성은 '만들래요'에 실행한 사람을 넣습니다.
 *   - HubCases : 고객 사례 6개 (문의 담당자 = 실행한 사람). '사용한 솔루션'은 seed-demo-data.js 로 넣은 Agent · Skill · HTML 제목과 같아 Hub에서 연결됩니다.
 *   공감 · 댓글은 넣지 않습니다. 같은 제목(또는 예전 제목 Old)이 이미 있으면 새로 넣지 않고 내용을 덮어씁니다.
 *
 * 쓰는 법
 *   1. Hub 사이트를 열고 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter.
 *   2. 지울 때는 Console 에 hubDemoCleanupIdeasCases() 입력 → 이 스크립트가 넣은 제목의 항목만 휴지통으로 보냅니다.
 */
(() => {
  const day = n => new Date(Date.now() - n * 86400000).toISOString();

  /* ---------- 아이디어 ---------- */
  // Old: 예전 아이디어 제목 (이미 들어간 아이디어를 찾아 새 제목 · 내용으로 바꿀 때 씀)
  const IDEAS = [
    { Title: 'Expense Report 자동 작성이 되면 좋겠어요!', Type: 'Agent', Status: '모집 중',
      Detail: '영수증 사진만 올리면 날짜 · 금액 · 사용처를 읽어서 경비 정산 양식을 채워 주면 좋겠어요. 프로젝트 코드까지 알아서 골라 주면 최고!',
      Pain: '출장 다녀오면 영수증 20장을 하나씩 옮겨 적어요 😭', Frequency: '매월', MinutesPerRun: 60 },
    { Title: '고객사 월간 보고 메일, 알아서 써 주면 좋겠어요!', Old: '고객사 Copilot 사용 현황 월간 보고 자동 발송 Agent', Type: 'Agent', Status: '모집 중',
      Detail: '매달 1일에 고객사별 사용량 숫자를 보고 "이번 달은 이랬어요" 메일 초안을 PM한테 슥 보내 주면 좋겠어요.',
      Pain: '고객사 5곳 보고 메일을 매달 복붙하면서 써요.', Frequency: '매월', MinutesPerRun: 120 },
    { Title: '제안서에 RFP 요구사항 빠진 거 없는지 봐 주면 좋겠어요', Old: '제안서가 RFP 요구사항을 다 담았는지 대조하는 Skill', Type: 'Skill', Status: '모집 중',
      Detail: 'RFP랑 제안서를 같이 넣으면 "이 항목 빠졌어요!" 하고 표로 알려 주는 거요.',
      Pain: '마감 전날 밤에 요구사항 표를 한 줄씩 대조하고 있어요…', Frequency: '가끔', MinutesPerRun: 180 },
    { Title: '워크숍 투표, QR 찍고 바로 결과 보고 싶어요!', Old: '워크숍 실시간 투표판 (QR로 참여)', Type: 'HTML', Status: '모집 중',
      Detail: '참석자가 휴대폰으로 QR 찍어서 투표하면 화면에 결과가 바로 올라오는 투표판이요. 분위기도 확 살 것 같아요.',
      Pain: '포스트잇 투표 사진 찍어서 다시 엑셀로 옮겨요.', Frequency: '매주', MinutesPerRun: 40 },
    { Title: '내 프롬프트 첨삭해 주는 봇 있으면 좋겠어요', Old: 'Teams에서 프롬프트를 고쳐 주는 첨삭 봇', Type: 'Agent', Status: '모집 중',
      Detail: '프롬프트를 붙여 넣으면 "이렇게 바꾸면 더 좋아요" 하고 고쳐 주고, 왜 고쳤는지도 알려 주는 Teams 봇이요.',
      Pain: '"이 프롬프트 어때요?" 질문이 하루 10건 넘게 와요.', Frequency: '매일', MinutesPerRun: 10 },
    { Title: '"내 메일 회사가 봐요?" 단골 질문 답변 모음 있으면 좋겠어요', Old: '고객사별 Copilot 도입 FAQ 모음', Type: '기타', Status: '모집 중',
      Detail: '고객사마다 꼭 나오는 질문이랑 답을 한곳에 모아 두면 다 같이 편할 것 같아요.',
      Pain: '프로젝트마다 같은 질문에 답을 새로 쓰고 있어요.', Frequency: '매주', MinutesPerRun: 30 },
    { Title: '회의 끝나면 회의록이랑 할 일 메일까지 한 번에!', Old: 'Teams 회의 녹취 → 고객 회의록 + 할 일 메일', Type: 'Skill', Status: '제작 중', StartedOn: day(5), make: true,
      Detail: '회의 녹취로 회의록 쓰고, 고객이 할 일만 뽑아서 정중한 메일 초안까지 한 번에 만들어 주면 좋겠어요.',
      Pain: '회의 끝나고 회의록이랑 메일 쓰느라 30분씩 걸려요.', Frequency: '매일', MinutesPerRun: 30 },
    { Title: '안 쓰는 Copilot 라이선스, 누구한테 넘길지 골라 주면 좋겠어요', Old: 'Copilot 라이선스 재배정 추천 도구', Type: 'HTML', Status: '제작 중', StartedOn: day(12), make: true,
      Detail: '한 달 동안 안 쓴 사람이랑 기다리는 사람 목록을 넣으면 바꿔 줄 후보랑 아끼는 금액을 보여 주는 거요.',
      Pain: '고객 IT팀이 매달 엑셀로 한 명씩 골라요.', Frequency: '매월', MinutesPerRun: 60 },
    { Title: '설문 결과 정리, 이제 피벗 그만하고 싶어요', Old: '파일럿 설문 결과 자동 집계', Type: 'HTML', Status: '완성', StartedOn: day(24), DoneAt: day(10), ResultRef: '파일럿 효과 측정 대시보드', make: true,
      Detail: 'Forms 설문 결과를 붙여 넣으면 얼마나 시간이 줄었는지, 만족도는 어떤지 바로 보여 주면 좋겠어요.',
      Pain: '파일럿 끝날 때마다 피벗 테이블이랑 하루 종일 씨름해요.', Frequency: '매월', MinutesPerRun: 240 },
    { Title: '미팅 전에 메일함 뒤지는 거 그만하고 싶어요', Old: '고객 미팅 전 준비 자료 자동 정리', Type: 'Agent', Status: '완성', StartedOn: day(50), DoneAt: day(33), ResultRef: '고객 미팅 브리핑', make: true,
      Detail: '다음 미팅 고객이랑 주고받은 메일 · 회의 · 문서를 한 장으로 쓱 정리해 주면 좋겠어요.',
      Pain: '미팅 전에 메일함이랑 Teams를 30분씩 뒤져요.', Frequency: '매일', MinutesPerRun: 30 },
    { Title: '오버셰어링 점검, 눈으로 훑는 거 너무 힘들어요', Old: 'SharePoint 오버셰어링 점검표 자동화', Type: 'Skill', Status: '완성', StartedOn: day(15), DoneAt: day(7), ResultRef: '데이터 과다 공유(오버셰어링) 점검', make: true,
      Detail: '사이트 목록이랑 공유 설정을 넣으면 위험한 곳부터 순서대로 알려 주면 좋겠어요.',
      Pain: '점검 때마다 사이트 수백 개를 눈으로 훑어요.', Frequency: '가끔', MinutesPerRun: 300 },
    { Title: '회의실 예약, 말로 하면 좋겠어요', Old: '사내 회의실 예약 Agent', Type: '기타', Status: '보관', ArchivedOn: day(20),
      Detail: '"내일 2시 4명 회의실 잡아줘" 하면 알아서 잡아 주는 거요.', Pain: '빈 회의실 찾느라 일정표를 몇 번씩 봐요.', Frequency: '매주', MinutesPerRun: 5 }
  ];

  /* ---------- 고객 사례 ---------- */
  const P = (name, text, step) => ({ name, step, text });
  // 솔루션 상세: Agent(지침 · 도구 · 사용 데이터) / Skill(설명 · 본문) / HTML(설명 · 화면 구성)
  const A = (name, ins, tools, data) => ({ kind: 'agent', name, ins, tools, data });
  const S = (name, desc, body) => ({ kind: 'skill', name, desc, body });
  const H = (name, desc, parts) => ({ kind: 'html', name, desc, parts });
  const SOL = a => JSON.stringify(a);
  // Old: 예전 사례 이름 (이미 들어간 사례를 찾아 새 이름 · 내용으로 바꿀 때 씀)
  const CASES = [
    { Title: '공장별 품질 검사 데이터 취합 및 주간 보고 작성', Old: '주간 품질 보고서 작성 시간 68% 단축', Industry: '제조', Client: 'B전자', Dept: '품질경영팀', Period: '2026 2분기',
      Project: 'Microsoft 365 Copilot 전사 도입 · 변화관리 (1,200명)', Area: '품질 관리 · 보고', Pattern: '초안 작성',
      Products: ['Copilot', 'Copilot Studio', 'Excel', 'Word', 'Teams'], KeyResult: '68% 감소', KeyDetail: '주간 품질 보고서 작성 시간',
      Compare: '시간|주 5시간|1.6시간\n품질 수준|보통|높음\n정신적 노력 수준|매우 높음|낮음',
      ChangeBefore: '공장 3곳의 검사 데이터를 엑셀로 모아 보고서 양식에 옮겨 적고, 불량 원인 설명을 매주 새로 썼어요. 금요일 오후가 통째로 보고서 작성에 쓰였어요.',
      ChangeAfter: 'Agent가 검사 데이터를 모아 주간 보고 초안과 불량 원인 요약을 만들고, 담당자는 숫자와 결론만 확인해요. 보고 형식이 공장마다 같아져 경영진 회의 시간도 줄었어요.',
      Process: '[Before]\n공장별 검사 데이터 수신\n엑셀 취합 · 피벗\n보고서 양식에 옮겨 적기\n불량 원인 설명 작성\n팀장 검토 · 수정\n[After]\nAgent가 데이터 취합 · 초안 작성 [AI]\nCopilot이 불량 원인 후보 · 조치 정리\n담당자 숫자 확인 · 팀장 승인\nCopilot이 경영진 요약 메일 작성',
      Measure: '도입 전 4주와 도입 후 4주의 보고서 작성 시간 기록 비교\n보고서 20건을 팀장이 품질 5단계로 평가',
      Solutions: SOL([
        A('주간 품질 보고 작성기',
          '너는 B전자 품질경영팀의 주간 품질 보고 작성자야.\n- 이번 주(월~금) 공장 3곳의 검사 결과 파일만 근거로 써.\n- 순서: ① 요약 3줄 ② 공장별 불량률 표 ③ 목표(0.5%)를 넘은 라인 ④ 불량 원인 후보 ⑤ 다음 주 조치.\n- 불량률은 소수 둘째 자리까지 쓰고, 지난주 대비 증감을 ▲▼로 표시해.\n- 원인은 \'추정\'이라고 밝히고 근거(라인 · 공정 · 불량 유형)를 붙여.\n- 숫자를 지어내지 마. 빠진 데이터는 \'자료 없음\'으로 적어.',
          ['SharePoint 문서 읽기', 'Excel 표 분석', 'Word 문서 만들기', 'Teams 메시지 보내기'],
          ['품질경영팀 SharePoint > 검사 결과 (공장별 주간 엑셀)', '주간 품질 보고 양식 (Word)', '불량 유형 코드표', '지난 12주 품질 보고서']),
        S('사용 현황 → 경영진 보고',
          '공장별 Copilot 사용 현황을 경영진 보고 한 장으로 정리하는 Skill이에요. 확산 기간 동안 매월 품질경영 회의 자료에 함께 붙였어요.',
          '# 사용 현황 → 경영진 보고\n\n## 입력\n- M365 관리 센터 Copilot 사용 현황 CSV (지난달)\n- 조직도 (부서 · 공장)\n\n## 순서\n1. 부서 · 공장별 활성 사용률을 계산한다 (활성 사용자 ÷ 라이선스).\n2. 전사 평균보다 10%p 이상 낮은 곳을 \'관심 필요\'로 표시한다.\n3. 대표 활용 사례 2개를 현업 인터뷰에서 고른다.\n\n## 출력 (한 장)\n- 한 줄 결론\n- 핵심 숫자 3개 (활성률 · 1인당 주간 사용 · 절감 시간 추정)\n- 공장별 표\n- 다음 달 조치 3개 (담당 · 기한)'),
        H('Copilot 사용 현황 대시보드',
          'M365 관리 센터 사용 현황 CSV를 넣으면 부서별 활성 사용률과 미사용 라이선스 비용을 보여 줘요. 공장 3곳의 확산 속도를 비교할 때 썼어요.',
          ['핵심 지표 4개 (활성 사용자 · 활성률 · 1인당 사용 · 미사용 라이선스 비용)', '부서별 활성률 막대 + 전사 평균선', '앱별 사용 막대 (Teams · Outlook · Word · Excel · PowerPoint)', '경영진 요약 문장 자동 작성'])
      ]),
      ApplyPoints: '정기 보고서가 여러 사업장 데이터를 모아 만드는 구조일 때\n보고서 양식이 정해져 있지만 작성자마다 품질이 다를 때',
      CasePrompts: JSON.stringify([P('데이터 취합 · 초안', '지난주 공장 3곳의 품질 검사 결과 파일을 읽고, 주간 품질 보고 양식에 맞춰 초안을 써줘. 불량률이 목표(0.5%)를 넘은 라인은 따로 표시하고 원인 후보를 3개씩 적어줘.', 0),
        P('불량 원인 · 조치', '목표 불량률을 넘은 라인마다 지난 8주 불량 유형 추이를 비교해서, 원인 후보를 공정 · 설비 · 자재 · 작업자 네 가지로 나눠 정리해줘. 후보마다 확인할 데이터와 담당 부서를 붙이고, 다음 주 조치를 우선순위대로 3개 제안해줘.', 1),
        P('경영진 요약 메일', '확정된 주간 품질 보고서로 경영진에게 보낼 메일을 써줘. 첫 줄에 결론, 이어서 핵심 숫자 3개와 조치가 필요한 라인만 글머리표로 쓰고 5줄을 넘기지 마.', 3)]) },
    { Title: '설계사 상품 약관 · 인수 기준 질의응답', Old: '설계사 상품 문의 응답 시간 71% 단축', Industry: '금융·보험', Client: 'C생명', Dept: '영업지원팀', Period: '2026 1분기',
      Project: 'Copilot Studio 상품 Q&A Agent 구축 · 오버셰어링 점검', Area: '영업 지원 · 상품 문의', Pattern: '질의응답',
      Products: ['Copilot Studio', 'Teams', 'Copilot'], KeyResult: '71% 감소', KeyDetail: '설계사 상품 문의 응답 시간',
      Compare: '시간|건당 14분|4분\n품질 수준|보통|높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '설계사가 상품 약관 · 인수 기준을 물으면 영업지원팀이 문서를 찾아 Teams로 답했어요. 하루 150건이 넘는 문의가 몰려 답변이 반나절씩 밀렸어요.',
      ChangeAfter: '설계사가 Teams에서 Agent에게 바로 물어보고, 근거 조항이 붙은 답을 받아요. 영업지원팀은 Agent가 답하지 못한 예외 질문만 처리해요.',
      Process: '[Before]\n설계사 문의 접수\n담당자가 약관 · 지침 검색\n답변 작성\nTeams로 회신\n[After]\nAgent가 근거 조항과 함께 답변 [AI]\n예외 질문은 담당자가 Copilot으로 답변 초안\n주간 문의 분석 · 지식 보강',
      Measure: '도입 전후 2주간 문의 300건의 응답 시간 비교\nAgent 답변 100건을 상품 담당자가 정확도 검수 (정확도 94%)',
      Solutions: SOL([
        A('설계사 상품 Q&A',
          '너는 C생명 영업지원팀의 상품 Q&A 도우미야. 설계사가 Teams에서 물어봐.\n- 연결된 상품 약관 · 인수 지침 · 상품 안내서만 근거로 답해.\n- 답변 끝에 [근거: 문서명 > 조항 번호]를 꼭 붙여.\n- 가입 한도 · 보험료 · 나이 기준은 원문 숫자 그대로 써.\n- 문서에 없거나 해석이 필요한 질문은 \'영업지원팀 확인 필요\'로 답하고 문의 양식을 안내해.\n- 고객 이름 · 주민번호 같은 개인정보가 들어오면 답하지 말고 지워서 다시 물어 달라고 해.',
          ['SharePoint 지식 검색', 'Teams 채팅', 'Microsoft Forms 문의 양식 연결'],
          ['판매 중 상품 약관 PDF 42종', '인수 지침서 (2026년판)', '영업지원팀 답변 이력 300건 (자주 묻는 질문)', '상품 안내서 · 판매 화법 자료']),
        S('데이터 과다 공유(오버셰어링) 점검',
          'Agent에 지식 원본을 연결하기 전에 사이트 권한을 점검하는 Skill이에요. 설계사에게 보이면 안 되는 내부 심사 기준 · 수수료 표 문서 17건을 이 단계에서 걸러냈어요.',
          '# 데이터 과다 공유(오버셰어링) 점검\n\n## 언제\n- Copilot · Agent에 SharePoint 사이트를 지식 원본으로 연결하기 전\n\n## 점검 순서\n1. 연결할 사이트 · 라이브러리 목록을 만든다.\n2. \'모든 사용자\' · \'조직 내 모든 사람\' 공유 링크가 있는 파일을 찾는다.\n3. 민감도 레이블이 없는 문서 중 내부 기준 · 단가 · 개인정보가 담긴 것을 표시한다.\n4. 표시한 문서는 권한을 줄이거나 지식 원본에서 뺀다.\n\n## 출력\n- 사이트별 위험 문서 표 (문서 | 공유 범위 | 위험 이유 | 조치 | 담당)\n- 연결해도 되는 사이트 목록'),
        H('Copilot 도입 준비도 진단',
          '착수 때 영업지원팀 · 설계사 대표 12명이 함께 응답했어요. 데이터 · 거버넌스 점수가 가장 낮게 나와 오버셰어링 점검을 Agent 구축보다 먼저 하기로 정했어요.',
          ['6개 영역 18문항 진단 (전략 · 데이터 · 거버넌스 · 기술 · 사람 · 업무)', '영역별 점수 레이더 차트', '총점과 준비 단계', '낮은 영역별 권장 조치'])
      ]),
      ApplyPoints: '같은 문서에서 답을 찾는 문의가 반복될 때\n답변에 근거 조항을 꼭 보여 줘야 할 때',
      CasePrompts: JSON.stringify([P('상품 문의 답변', '종신보험 A상품의 50세 남성 가입 한도와 인수 기준을 알려줘. 답변 끝에 근거가 된 약관 조항을 붙여줘.', 0),
        P('예외 질문 답변 초안', '설계사가 물은 이 질문에 대해 인수 지침서와 최근 심사 사례 메일을 찾아 답변 초안을 써줘. 확정하기 어려운 부분은 [확인 필요]로 표시하고, 설계사에게 보낼 Teams 답장 말투로 써줘.', 1),
        P('주간 문의 분석', '이번 주 Agent 대화 기록 파일에서 질문을 상품 · 주제별로 묶고, Agent가 답하지 못한 질문 TOP 10을 표로 정리해줘. 질문마다 지식 원본에 추가할 문서나 FAQ 문구를 제안해줘.', 2)]) },
    { Title: 'Teams 회의 기록으로 회의록 및 할 일 정리', Old: '부서 회의록 작성 58% 단축, 결정 사항 누락 0건', Industry: '공공·국제기관', Client: 'D공사', Dept: '기획예산처', Period: '2025 4분기',
      Project: 'Copilot 파일럿 (300명) · ADKAR 기반 변화관리', Area: '회의 · 보고', Pattern: '요약 및 분류',
      Products: ['Copilot', 'Teams', 'Word', 'Outlook'], KeyResult: '58% 감소', KeyDetail: '회의록 작성 시간',
      Compare: '시간|회의당 50분|21분\n품질 수준|보통|매우 높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '막내 직원이 회의 내내 받아 적고, 회의 후 회의록을 정리해 결재를 올렸어요. 결정 사항과 담당자가 빠져 후속 조치가 늦어지는 일이 잦았어요.',
      ChangeAfter: 'Teams 회의 기록으로 회의록 초안과 할 일 목록을 만들고, 담당자에게 메일로 바로 보내요. 직원들은 받아 적는 대신 회의에 참여해요.',
      Process: '[Before]\n회의 중 받아 적기\n회의록 정리\n결정 사항 · 담당자 확인\n결재 · 공유\n[After]\nCopilot이 회의록 · 할 일 초안 작성 [AI]\n작성자 확인 · 결재\nCopilot이 담당자별 할 일 메일 작성\n다음 회의 전 진행 상황 점검',
      Measure: '파일럿 4주간 회의 120건의 회의록 작성 시간 기록\n결정 사항 누락 여부를 부서장이 확인',
      Solutions: SOL([
        S('공문형 회의록 · 할 일 정리',
          'Teams 회의 기록을 D공사 회의록 양식(공문 말투)으로 바꾸고, 할 일을 담당자별 메일로 나누는 Skill이에요.',
          '# 공문형 회의록 · 할 일 정리\n\n## 입력\n- Teams 회의 기록 (녹취 · 대화 내용)\n- 참석자 명단\n\n## 회의록 양식\n1. 회의 개요 (일시 · 장소 · 참석자 · 작성자)\n2. 논의 사항 (안건별 3줄 이내, \'~함\' 체)\n3. 결정 사항 (번호 매김)\n4. 할 일 표 (담당자 | 할 일 | 기한)\n5. 다음 회의 안건\n\n## 규칙\n- 발언자 이름은 결정 · 할 일에만 쓴다.\n- 기한이 말로 나오지 않은 할 일은 \'기한 확인 필요\'로 표시한다.\n- 할 일은 담당자별로 묶어 메일 초안을 따로 만든다.'),
        S('변화관리 커뮤니케이션 플랜 (ADKAR)',
          '파일럿 300명을 대상으로 ADKAR 단계별 메시지 · 채널 · 일정을 짠 Skill이에요. \'AI가 내 일을 대신한다\'는 걱정을 줄이는 메시지를 인식 단계에 넣었어요.',
          '# 변화관리 커뮤니케이션 플랜 (ADKAR)\n\n## 입력\n- 대상 조직 · 인원 · 파일럿 일정\n- 사전 설문 결과 (ADKAR 단계별 점수)\n\n## 단계별 설계\n- 인식(Awareness): 왜 하는지 — 기관장 메시지, 전 직원 메일\n- 욕구(Desire): 나에게 좋은 점 — 부서별 성공 사례 공유\n- 지식(Knowledge): 어떻게 — 직무별 교육 2회, 프롬프트 모음\n- 능력(Ability): 실제로 해 보기 — 챔피언 현장 지원, 주간 오피스아워\n- 강화(Reinforcement): 계속 쓰게 — 우수 사례 시상, 월간 소식지\n\n## 출력\n- 주차별 커뮤니케이션 일정표 (주차 | 메시지 | 채널 | 발신자 | 대상)'),
        H('ADKAR 변화 준비도 진단',
          '파일럿 전후에 같은 설문을 돌려 부서별 장벽 단계를 찾았어요. 기획예산처는 \'능력\' 단계가 낮아 챔피언 현장 지원을 늘렸어요.',
          ['개인 · 그룹 모드 설문 (단계별 5문항)', 'ADKAR 단계별 점수 막대', '가장 낮은 단계 = 장벽 자동 표시', '장벽 단계별 권장 활동']),
        H('파일럿 효과 측정 대시보드',
          '파일럿 4주 동안 모은 사전 · 사후 시간 기록과 만족도 설문을 넣어 효과를 보여 줬어요. 전사 확대 결정 보고에 그대로 썼어요.',
          ['시나리오별 사전 · 사후 시간 막대', '부서별 절감 시간', '추천 의향(NPS) 막대 · 만족도 분포', '전사 확대 시 예상 효과 (보수적 65% 적용)', '참여자 의견 모음과 요약 문장'])
      ]),
      ApplyPoints: '회의가 많고 회의록 결재가 필요한 조직\nAI 도입에 걱정이 커 단계별 변화관리가 필요한 조직',
      CasePrompts: JSON.stringify([P('회의록 · 할 일', '이 회의 기록으로 회의록을 써줘. 결정 사항 / 할 일(담당자 | 할 일 | 기한) / 다음 회의 안건으로 나누고, 공문 말투로 써줘.', 0),
        P('담당자별 할 일 메일', '이 회의록의 할 일 표를 담당자별로 나눠 메일 초안을 각각 써줘. 제목은 \'[회의명] 후속 조치 요청 (기한 MM/DD)\', 본문에는 결정 배경 한 줄과 할 일 · 기한만 공문 말투로 써줘.', 2),
        P('진행 상황 점검', '지난 회의록의 할 일 목록과 그 뒤에 오간 메일 · Teams 대화를 비교해서 완료 / 진행 중 / 소식 없음으로 나눠 표로 정리해줘. 소식 없는 항목은 담당자에게 보낼 확인 메시지도 써줘.', 3)]) },
    { Title: '카테고리별 매출 증감 분석 및 리뷰 자료 작성', Old: '주간 매출 리뷰 자료 준비 80% 단축', Industry: '유통·커머스', Client: 'E리테일', Dept: 'MD기획팀', Period: '2026 3분기',
      Project: 'Copilot 활용 시나리오 발굴 · 부서별 Quick Win 확산', Area: '매출 관리 · 리뷰', Pattern: '데이터 시각화',
      Products: ['Copilot', 'Excel', 'PowerPoint', 'Copilot Cowork'], KeyResult: '80% 감소', KeyDetail: '주간 매출 리뷰 자료 준비 시간',
      Compare: '시간|주 6시간|1.2시간\n품질 수준|보통|높음\n정신적 노력 수준|높음|보통',
      ChangeBefore: '카테고리별 POS 데이터를 내려받아 엑셀로 가공하고, 차트를 PowerPoint에 붙여 리뷰 자료를 만들었어요.',
      ChangeAfter: 'Copilot이 엑셀에서 증감과 이상치를 찾아 요약하고, PowerPoint 리뷰 자료 초안을 만들어요. MD는 원인 해석과 액션에 집중해요.',
      Process: '[Before]\nPOS 데이터 다운로드\n엑셀 가공 · 피벗\n차트 작성\nPowerPoint 정리\n[After]\nCopilot이 증감 · 이상치 분석 [AI]\nCopilot이 리뷰 슬라이드 초안 작성\nMD 해석 · 액션 추가\nCopilot이 리뷰 회의 액션 정리 · 공유',
      Measure: '시나리오 평가표로 고른 Quick Win 3개를 4주간 측정\n준비 시간 자가 기록과 팀장 품질 평가',
      Solutions: SOL([
        S('주간 매출 리뷰 자료 작성',
          'POS 매출 시트에서 증감 · 이상치를 찾고 MD 주간 리뷰 슬라이드 초안까지 만드는 Skill이에요. Excel과 PowerPoint의 Copilot에서 차례로 써요.',
          '# 주간 매출 리뷰 자료 작성\n\n## 입력\n- 카테고리별 주간 POS 매출 시트 (이번 주 · 지난주 · 전년 같은 주)\n\n## 분석 (Excel)\n1. 지난주 대비 ±10% 이상 변한 카테고리를 찾는다.\n2. 전년 같은 주와 비교해 계절 요인인지 확인한다.\n3. 행사 · 결품 · 가격 변경 기록과 맞춰 원인 후보를 붙인다.\n\n## 슬라이드 (PowerPoint, 5장)\n1. 이번 주 한 줄 결론\n2. 전체 매출 추이\n3. 많이 오른 카테고리 TOP 3와 원인\n4. 많이 내린 카테고리 TOP 3와 원인\n5. 다음 주 액션 (담당 MD · 기한)\n\n## 규칙\n- 원인은 후보로만 쓰고 MD가 확정한다.'),
        S('Copilot 활용 시나리오 평가',
          'MD기획팀 업무 23개를 빈도 · 소요 시간 · 데이터 준비도 · 위험도로 점수 매긴 Skill이에요. 여기서 \'주간 매출 리뷰\'가 Quick Win 1순위로 뽑혔어요.',
          '# Copilot 활용 시나리오 평가\n\n## 입력\n- 부서 업무 목록 (인터뷰 · 업무 일지)\n\n## 평가 기준 (각 1~5점)\n- 빈도: 얼마나 자주 하는가\n- 소요 시간: 한 번에 얼마나 걸리는가\n- 데이터 준비도: 필요한 자료가 M365 안에 있는가\n- 위험도: 틀리면 얼마나 문제인가 (낮을수록 좋음)\n\n## 출력\n- 시나리오별 점수표와 효과 · 난이도 위치\n- Quick Win 3개 (효과 높음 · 난이도 낮음)\n- 시나리오별 시작 프롬프트 1개'),
        H('시나리오 우선순위 매트릭스',
          '평가한 시나리오를 효과 · 난이도 2×2 위에 놓고 팀장들과 끌어서 위치를 함께 정했어요. 워크숍 한 번에 Quick Win 3개가 확정됐어요.',
          ['효과 × 난이도 2×2 매트릭스', '시나리오 카드 끌어 놓기', '사분면별 목록 (Quick Win · 전략 과제 · 보류 · 재검토)', '브라우저에 자동 저장']),
        H('Copilot 도입 효과(ROI) 계산기',
          'Quick Win 3개의 절감 시간을 넣어 라이선스 비용 대비 손익분기 시점을 보여 줬어요. 전사 확대 예산 승인에 쓰였어요.',
          ['인원 · 시급 · 절감 시간 · 활용률 슬라이더', '12개월 누적 효과 그래프 + 손익분기 표시', '보수 · 기본 · 낙관 3가지 시나리오 비교'])
      ]),
      ApplyPoints: '매주 같은 형식의 데이터 리뷰 자료를 만드는 팀\n어디부터 Copilot을 써야 할지 정하지 못한 조직',
      CasePrompts: JSON.stringify([P('매출 증감 분석', '이 시트에서 지난주 대비 매출이 10% 이상 변한 카테고리를 찾아 표로 정리해줘. 전년 같은 주와도 비교해서 계절 요인인지 표시하고, 행사 · 결품 시트와 맞춰 원인 후보를 붙여줘.', 0),
        P('리뷰 슬라이드 초안', '이 분석 결과 파일로 주간 매출 리뷰 슬라이드 5장을 만들어줘. 1장 한 줄 결론, 2장 전체 매출 추이, 3장 상승 TOP 3와 원인, 4장 하락 TOP 3와 원인, 5장 다음 주 액션. 숫자 비교는 막대 그래프로 보여줘.', 1),
        P('회의 액션 정리', '오늘 매출 리뷰 회의 기록에서 MD별 액션 아이템을 뽑아 표(담당 MD | 카테고리 | 액션 | 기한)로 정리하고, 팀 채널에 올릴 공지 글로도 써줘.', 3)]) },
    { Title: '고객 상담 기록 요약 및 분류', Old: '상담 후처리 시간 73% 단축', Industry: 'IT·통신·미디어', Client: 'F텔레콤', Dept: '고객센터', Period: '2026 2분기',
      Project: '상담 요약 Agent 구축 · 상담사 교육', Area: '고객 상담', Pattern: '요약 및 분류',
      Products: ['Copilot Studio', 'Teams', 'Outlook'], KeyResult: '73% 감소', KeyDetail: '상담 1건당 후처리 시간',
      Compare: '시간|건당 4.5분|1.2분\n품질 수준|보통|높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '상담이 끝날 때마다 상담사가 메모를 다시 읽고 요약 · 처리 코드를 직접 입력했어요. 후처리 때문에 다음 상담 연결이 늦어졌어요.',
      ChangeAfter: 'Agent가 상담 기록으로 요약과 처리 코드를 추천하고, 상담사는 확인만 해요. 처리 코드 오류도 줄었어요.',
      Process: '[Before]\n상담 종료\n메모 다시 읽기\n요약 작성\n처리 코드 입력\n[After]\nAgent가 요약 · 코드 추천 [AI]\n상담사 확인 후 저장\nCopilot이 2차 처리 부서 전달 메일 작성\n품질팀 주간 오분류 점검',
      Measure: '상담 1,000건의 후처리 시간 비교\n처리 코드 정확도를 품질팀이 표본 검수',
      Solutions: SOL([
        A('상담 요약 · 처리 코드 추천',
          '너는 F텔레콤 고객센터의 상담 후처리 도우미야.\n- 상담 기록을 3줄로 요약해: 고객 문의 / 안내한 내용 / 남은 조치.\n- 처리 코드 표에서 가장 맞는 코드 1개와 다음 후보 1개를 추천하고, 고른 이유를 한 줄로 써.\n- 고객이 다시 연락할 가능성이 있으면 \'재연락 가능\'으로 표시하고 이유를 적어.\n- 요금 · 약정 금액은 상담 기록에 나온 숫자만 써.\n- 전화번호 · 주소 등 개인정보는 요약에 넣지 마.',
          ['Teams 앱 (상담사 화면 옆 패널)', '처리 코드 표 조회', 'Outlook 메일 초안 (2차 처리 부서 전달)'],
          ['처리 코드 표 (대분류 12 · 소분류 148)', '상담 요약 작성 기준서', '잘 쓴 요약 예시 200건 (품질팀 선정)']),
        S('직무별 프롬프트 교육 자료',
          '상담사 · 상담 팀장 · 품질팀 세 직무에 맞춘 교육 자료를 만든 Skill이에요. 교육 후 Agent 첫 사용률이 41%에서 88%로 올랐어요.',
          '# 직무별 프롬프트 교육 자료\n\n## 입력\n- 대상 직무와 대표 업무 3개\n\n## 자료 구성 (직무마다)\n1. 이 직무에서 Copilot이 도와줄 장면 3개\n2. 장면별 프롬프트 (목표 · 맥락 · 자료 · 기대 결과)\n3. 나쁜 예 → 좋은 예 고쳐 보기\n4. 10분 실습 과제와 확인 질문\n\n## 상담사용 예\n- 장면: 어려운 상담이 끝난 직후\n- 프롬프트: \"이 상담 기록을 요약하고 처리 코드를 추천해줘. 고객이 화가 난 이유도 한 줄로.\"'),
        H('교육 · 확산 퍼널 대시보드',
          '센터별로 라이선스 → 교육 이수 → 첫 사용 → 주간 활성까지 단계별 이탈을 보여 줬어요. 2센터의 \'첫 사용\' 병목을 찾아 현장 코칭을 붙였어요.',
          ['센터별 퍼널 (라이선스 · 교육 이수 · 첫 사용 · 주간 활성)', '병목 단계 자동 찾기와 처방', '단계 전환율 히트 표', '주간 활성 추이 그래프'])
      ]),
      ApplyPoints: '같은 형식으로 기록을 남기는 일이 하루 수십 번 반복될 때\n교육 후 실제 사용으로 이어지지 않아 퍼널 관리가 필요할 때',
      CasePrompts: JSON.stringify([P('상담 요약', '이 상담 기록을 3줄로 요약하고, 처리 코드 목록에서 맞는 코드 하나를 추천해줘. 고객이 다시 연락할 가능성이 있으면 표시해줘.', 0),
        P('2차 처리 부서 전달', '이 상담 요약으로 요금제 변경 처리 부서에 보낼 전달 메일을 써줘. 고객 요청, 이미 안내한 내용, 처리 기한을 넣고 개인정보는 고객번호만 남겨줘.', 2),
        P('오분류 점검', '이번 주 상담 요약 표본 100건에서 처리 코드와 요약 내용이 맞지 않는 건을 찾아줘. \'잘못 고른 코드 → 맞는 코드\'로 묶어 많은 순으로 정리하고, 상담사 교육 포인트 3개를 제안해줘.', 3)]) },
    { Title: '표준 계약서 대비 조항 차이 및 위험 검토', Old: '계약서 1차 검토 시간 55% 단축', Industry: '전문·사업서비스', Client: 'G회계법인', Dept: '법무지원팀', Period: '2026 3분기',
      Project: 'Copilot 도입 착수 · 직무별 활용 교육', Area: '계약 검토', Pattern: '검토 및 점검',
      Products: ['Copilot', 'Word', 'Copilot Cowork'], KeyResult: '55% 감소', KeyDetail: '계약서 1차 검토 시간',
      Compare: '시간|건당 90분|40분\n품질 수준|높음|매우 높음\n정신적 노력 수준|매우 높음|보통',
      ChangeBefore: '담당자가 계약서를 처음부터 끝까지 읽으며 표준 조항과 다른 부분을 표시하고 검토 의견을 따로 정리했어요.',
      ChangeAfter: 'Copilot이 표준 계약서와 비교해 다른 조항과 위험 조항을 표로 먼저 보여 주고, 담당자는 판단과 의견 작성에 집중해요.',
      Process: '[Before]\n계약서 전체 정독\n표준 조항과 비교\n위험 조항 표시\n검토 의견 작성\n[After]\nCopilot이 표준 대비 차이 · 위험 조항 정리 [AI]\nCopilot이 위험 조항 수정안 작성 · 담당자 판단\nCopilot이 파트너 보고 요약 작성\n파트너 확인',
      Measure: '계약서 40건의 검토 시간 비교\n놓친 위험 조항 수를 파트너가 재검토로 확인 (0건)',
      Solutions: SOL([
        S('표준 계약 조항 비교 검토',
          '받은 계약서를 표준 용역 계약서와 조항별로 비교해 차이와 위험도를 표로 정리하는 Skill이에요. Word의 Copilot에서 두 문서를 함께 열고 써요.',
          '# 표준 계약 조항 비교 검토\n\n## 입력\n- 검토할 계약서\n- 우리 표준 용역 계약서\n- 위험 조항 기준표 (손해배상 · 지식재산 · 해지 · 비밀유지 · 준거법)\n\n## 순서\n1. 두 문서의 조항을 제목 기준으로 짝짓는다.\n2. 문구가 다른 조항만 뽑는다.\n3. 기준표에 따라 위험도(상 · 중 · 하)를 매긴다.\n4. 표준에 없는 새 조항은 따로 모은다.\n\n## 출력\n- 표: 조항 | 표준 | 이 계약서 | 위험도 | 검토 의견\n- \'상\' 조항 요약 3줄 (파트너 보고용)\n\n## 규칙\n- 최종 판단은 담당자가 한다. 법률 해석을 단정하지 않는다.'),
        S('프로젝트 착수 패키지',
          '도입 착수 때 범위 · 일정 · 역할 · 성공 지표를 정리한 Skill이에요. 법무지원팀을 첫 적용 부서로 정하고 \'놓친 위험 조항 0건\'을 성공 지표로 합의했어요.',
          '# 프로젝트 착수 패키지\n\n## 입력\n- 고객 요청 메일 · 제안서 · 계약 범위\n\n## 출력\n1. 착수 보고 슬라이드 (배경 · 목표 · 범위 · 일정 · 체계)\n2. 역할표 (RACI)\n3. 성공 지표 3개와 측정 방법\n4. 첫 2주 할 일과 필요한 고객 자료 목록\n5. 위험과 대응\n\n## 규칙\n- 성공 지표는 숫자와 측정 방법을 함께 쓴다.\n- 고객이 정할 일은 \'고객 확인 필요\'로 표시한다.'),
        H('Agent 도구 선택 도우미',
          '검토 업무를 Copilot 채팅 · Agent Builder · Copilot Studio 중 무엇으로 만들지 7개 질문으로 정했어요. 문서 2개 비교라 \'Copilot 채팅 + Skill\'로 충분하다는 결론이 나와 구축 비용을 줄였어요.',
          ['7개 질문 (사용자 수 · 데이터 위치 · 외부 연동 · 승인 흐름 등)', '추천 도구와 이유', '도구별 비교표', '다음 단계 안내'])
      ]),
      ApplyPoints: '기준 문서와 비교하는 검토 업무\n최종 판단은 사람이 하되 1차 검토 부담이 큰 업무',
      CasePrompts: JSON.stringify([P('계약서 비교', '이 계약서를 우리 표준 용역 계약서와 비교해서 다른 조항을 표로 정리해줘. 열: 조항 | 표준 | 이 계약서 | 위험도(상·중·하) | 검토 의견.', 0),
        P('위험 조항 수정안', '위험도 \'상\'으로 표시한 조항마다 우리 표준 문구로 바꾼 수정안과 상대방에게 설명할 이유를 써줘. 원문과 수정안을 나란히 보여 줘서 Word 변경 내용 추적으로 옮기기 쉽게 해줘.', 1),
        P('파트너 보고 요약', '이 검토 표를 파트너 보고용으로 요약해줘. 계약 개요 2줄, 위험도 \'상\' 조항과 제안한 수정안, 협상에서 양보해도 되는 조항을 나눠 반 페이지 이내로 써줘.', 2)]) }
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
    const merge = async (url, body) => {
      const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' }, body: JSON.stringify(body) });
      if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
    };
    const multi = a => ({ results: a });
    const log = [];
    const step = async (what, fn) => { try { log.push({ 단계: what, 결과: '✅ ' + (await fn()) }); } catch (e) { log.push({ 단계: what, 결과: '❌ ' + e.message.split('\n')[0] }); console.warn(what, e.message); } };

    // 아이디어 · 사례: 새 제목 또는 예전 제목(Old)으로 찾아 있으면 내용을 새로 덮어쓰고, 없으면 새로 넣음
    for (const [list, rows, fields, update] of [
      ['HubIdeas', IDEAS, i => { const { make, Old, ...f } = i; return { ...f, ...(make ? { MakersId: multi([me]) } : {}) }; }, true],
      ['HubCases', CASES, c => { const { Old, ...f } = c; return { ...f, Products: multi(c.Products), ContactId: me }; }, true]
    ]) {
      const t = (await get(`${L(list)}?$select=ListItemEntityTypeFullName`)).ListItemEntityTypeFullName;
      const have = (await get(`${L(list)}/items?$select=Id,Title&$top=5000`)).results;
      for (const row of rows) {
        await step(`${list === 'HubIdeas' ? '아이디어' : '사례'} · ${row.Title}`, async () => {
          const hit = have.filter(r => r.Title === row.Title || (row.Old && r.Title === row.Old))[0];
          if (hit && !update) { return '이미 있어 건너뜀'; }
          if (hit) { await merge(`${L(list)}/items(${hit.Id})`, { __metadata: { type: t }, ...fields(row) }); return `ID ${hit.Id} 수정${hit.Title !== row.Title ? ' (이름 바꿈)' : ''}`; }
          const it = await post(`${L(list)}/items`, { __metadata: { type: t }, ...fields(row) });
          return `ID ${it.Id} 추가`;
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
      const titles = rows.map(r => r.Title).concat(rows.map(r => r.Old).filter(Boolean));
      const hit = (await (await fetch(`${L}/items?$select=Id,Title&$top=5000`, { headers: J })).json()).d.results.filter(r => titles.indexOf(r.Title) >= 0);
      for (const r of hit) { await fetch(`${L}/items(${r.Id})/recycle()`, { method: 'POST', headers: { ...J, 'X-RequestDigest': D } }); }
      console.log(`${list}: ${hit.length}개 휴지통으로`);
    }
  };
})();
