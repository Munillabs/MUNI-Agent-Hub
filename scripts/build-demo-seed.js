/*
 * 데모 데이터 콘솔 스크립트 만들기
 *   node scripts/build-demo-seed.js  →  scripts/seed-demo-data.js
 *
 * samples/demo/skills/*.md, samples/demo/html/*.html 파일 내용과 아래 목록 정보를 합쳐
 * 브라우저 콘솔에 붙여 넣는 스크립트 하나로 만듭니다. 파일을 고치면 이 명령을 다시 실행하세요.
 */
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..', 'samples', 'demo');
const read = (dir, f) => fs.readFileSync(path.join(root, dir, f), 'utf8');

/* ---------- Skill 9개 ---------- */
const skills = [
  { file: 'copilot-scenario-assessment.md', Title: 'Copilot 활용 시나리오 평가', Summary: '업무 목록만 주면 Copilot 시나리오와 우선순위 점수표를 만들어요',
    Category: '업무 절차', WorkArea: ['제안과 전략 세우기'], Tools: ['Copilot', 'Cowork', 'Copilot Studio'], Scope: ['고객 프로젝트용'],
    Does: '고객 부서의 업무 목록을 받아 Copilot을 어디에 먼저 쓸지 정해야 할 때\n효과 · 난이도 · 데이터 준비도로 점수를 매겨 Quick Win을 골라야 할 때',
    Usage: 'Copilot 대화에 파일을 첨부하고 "이 업무 목록으로 시나리오 평가해줘"라고 말해요. Copilot Studio에서는 Skill로 추가해요.',
    rel: [['1.0', '처음 공유', 41], ['1.1', '총점 공식에 효과 가중치(×2) 추가', 18], ['1.2', '예시 프롬프트 열 추가', 4]], stars: 5, review: '고객 워크숍 끝나고 바로 돌렸더니 Quick Win 3개가 표로 나왔어요. 제안서에 그대로 넣었습니다' },
  { file: 'copilot-business-case.md', Title: 'Copilot 도입 비즈니스 케이스', Summary: '절감 시간 · 비용 · 회수 기간을 경영진 보고 형식으로 정리해요',
    Category: '양식', WorkArea: ['제안과 전략 세우기'], Tools: ['Copilot', 'Cowork'], Scope: ['고객 프로젝트용'],
    Does: '고객 경영진에게 Copilot 도입 효과를 숫자로 설득해야 할 때\n보수 · 기준 · 낙관 세 경우를 한 번에 계산해야 할 때',
    Usage: '인원 · 절감 시간 · 인건비 · 라이선스 비용을 같이 주고 "비즈니스 케이스 만들어줘"라고 말해요. HTML의 ROI 계산기와 같이 쓰면 좋아요.',
    rel: [['1.0', '처음 공유', 35], ['1.1', '손익분기 활용률 계산 추가', 9]], stars: 5, review: '계산 근거가 같이 나와서 고객 재무팀 질문에 바로 답할 수 있었어요' },
  { file: 'engagement-kickoff-pack.md', Title: '프로젝트 착수 패키지', Summary: '킥오프 아젠다 · RACI · 주차별 일정 · 첫 2주 할 일을 한 번에',
    Category: '업무 절차', WorkArea: ['프로젝트·사내 업무 하기'], Tools: ['Copilot', 'Cowork'], Scope: ['고객 프로젝트용'],
    Does: '새 Copilot 도입 프로젝트를 시작해 킥오프 자료를 만들어야 할 때\n고객과 역할 · 책임을 처음 맞춰야 할 때',
    Usage: '고객 업종 · 범위 · 기간 · 시작일을 알려 주고 "착수 패키지 만들어줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 28], ['1.1', 'RACI에 보안 · 레이블 활동 추가', 6]], stars: 4, review: '킥오프 준비가 반나절에서 30분으로 줄었어요. RACI 표가 특히 좋아요' },
  { file: 'interview-to-diagnosis.md', Title: '고객 인터뷰 → 현황 진단', Summary: '인터뷰 녹취를 As-Is · Pain · 요구사항 표로 정리해요',
    Category: '업무 절차', WorkArea: ['고객 업무 이해하고 설계하기'], Tools: ['Copilot', 'Copilot Studio', 'Cowork'], Scope: ['고객 프로젝트용'],
    Does: 'Teams 회의 녹취나 인터뷰 메모를 현황 진단 자료로 바꿔야 할 때\n요구사항 ID를 붙여 추적해야 할 때',
    Usage: 'Teams 회의 기록을 붙여 넣고 "현황 진단표로 정리해줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 22]], stars: 5, review: '인터뷰 8건을 한 번에 넣었더니 요구사항 목록이 나왔어요. 변화관리 관찰이 같이 나오는 게 좋아요' },
  { file: 'change-comms-plan.md', Title: '변화관리 커뮤니케이션 플랜 (ADKAR)', Summary: 'ADKAR 단계별 일정표와 공지 메일 · Teams 게시글 초안까지',
    Category: '양식', WorkArea: ['교육·확산 프로그램 운영하기'], Tools: ['Copilot', 'Cowork', 'Agent Builder'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: 'Copilot 확산 공지 · 리더 메시지를 단계에 맞춰 준비해야 할 때\n직원 걱정(일자리, 감시)에 답하는 FAQ가 필요할 때',
    Usage: '조직 규모 · 일정 · 채널을 알려 주고 "변화관리 커뮤니케이션 플랜 짜줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 30], ['1.1', '팀장용 메시지 키트 추가', 12]], stars: 4 },
  { file: 'role-prompt-training.md', Title: '직무별 프롬프트 교육 자료', Summary: '아쉬운 프롬프트 vs 좋은 프롬프트 비교와 실습 과제를 직무별로',
    Category: '참조 자료', WorkArea: ['교육·확산 프로그램 운영하기'], Tools: ['Copilot', 'Cowork'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: '고객사 직무별 Copilot 교육을 준비해야 할 때\n교육 후 1주일 미션까지 함께 주고 싶을 때',
    Usage: '직무와 자주 하는 일 3~5개를 알려 주고 "1시간 교육 자료 만들어줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 19], ['1.1', '자주 하는 실수 5가지 추가', 2]], stars: 5, review: '영업팀 교육에 썼는데 "아쉬운 프롬프트" 예시에서 다들 웃으면서 공감했어요' },
  { file: 'champion-program.md', Title: '챔피언 프로그램 운영 가이드', Summary: '챔피언 선발 · 역할 · 월별 활동 · 사례 수집 양식',
    Category: '업무 절차', WorkArea: ['교육·확산 프로그램 운영하기'], Tools: ['Copilot', 'Agent Builder'], Scope: ['고객 프로젝트용'],
    Does: '고객사에 Copilot 챔피언(앰배서더) 프로그램을 설계해야 할 때\n성공 사례를 꾸준히 모으는 구조가 필요할 때',
    Usage: '조직 규모 · 확산 일정 · 챔피언 가용 시간을 알려 주고 "챔피언 프로그램 만들어줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 14]], stars: 4 },
  { file: 'adoption-exec-report.md', Title: '사용 현황 → 경영진 보고', Summary: '사용량 보고서를 30초 안에 읽히는 월간 보고로 바꿔요',
    Category: '양식', WorkArea: ['데이터로 인사이트 찾기'], Tools: ['Copilot', 'Cowork', 'Copilot Studio'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: '매달 Copilot 사용 현황을 고객 경영진에게 보고해야 할 때\n부서별 "관심 필요" 부서를 골라야 할 때',
    Usage: '관리 센터에서 내보낸 사용량 표를 붙여 넣고 "이번 달 경영진 보고 만들어줘"라고 말해요. HTML의 사용 현황 대시보드와 같이 쓰면 좋아요.',
    rel: [['1.0', '처음 공유', 11], ['1.1', '개인별 사용량 보고 금지 규칙 추가', 3]], stars: 5, review: '월간 보고 만드는 데 2시간 걸리던 게 15분이 됐어요' },
  { file: 'oversharing-check.md', Title: '데이터 과다 공유(오버셰어링) 점검', Summary: 'Copilot 도입 전 SharePoint 공유 위험을 점검하고 조치 순서를 정해요',
    Category: '체크리스트', WorkArea: ['고객 업무 이해하고 설계하기'], Tools: ['Copilot', 'Copilot Studio'], Scope: ['고객 프로젝트용'],
    Does: 'Copilot 도입 전에 고객 IT · 보안팀과 데이터 거버넌스를 점검해야 할 때\n"Copilot이 인사 자료를 보여 주면 어떡하죠?" 질문에 답해야 할 때',
    Usage: 'SharePoint 사이트 목록과 공유 설정 표를 붙여 넣고 "오버셰어링 점검해줘"라고 말해요.',
    rel: [['1.0', '처음 공유', 7]], stars: 5, review: '보안팀 미팅 전에 돌려 갔더니 고객이 먼저 위험 사이트 정리를 시작했어요' }
];

/* ---------- HTML 6개 ---------- */
const htmls = [
  { file: 'copilot-usage-dashboard.html', Title: 'Copilot 사용 현황 대시보드', Summary: 'CSV만 붙여 넣으면 부서별 활성 사용률과 경영진 요약이 바로',
    Category: '대시보드', WorkArea: ['데이터로 인사이트 찾기'], Tools: ['Claude'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: '관리 센터에서 내보낸 사용량을 붙여 넣으면 부서별 활성 사용률 그래프를 그려요\n평균보다 15%p 낮은 부서에 "관심 필요" 표시를 해요\n쓰지 않는 라이선스와 그 비용을 계산해요\n경영진 보고용 요약 5줄을 만들어 복사할 수 있어요',
    MakerNote: '고객사 월간 보고 때마다 엑셀로 그래프를 다시 그리는 게 아까워서 만들었어요. 데이터는 브라우저 밖으로 나가지 않아요.', Output: '부서별 활성 사용률 그래프 · 경영진 요약',
    rel: [['0.9', '처음 공유', 26], ['1.0', '미사용 라이선스 비용 계산 추가', 5]], stars: 5, review: '고객 앞에서 CSV 붙여 넣자마자 그래프가 올라오니까 반응이 좋았어요' },
  { file: 'copilot-readiness-check.html', Title: 'Copilot 도입 준비도 진단', Summary: '18문항으로 6개 영역 준비도를 레이더 차트로',
    Category: '점검표', WorkArea: ['고객 업무 이해하고 설계하기'], Tools: ['Claude', 'Copilot'], Scope: ['고객 프로젝트용'],
    Does: '전략 · 데이터 보안 · 기술 · 시나리오 · 사람 · 측정 6개 영역을 18문항으로 진단해요\n답하는 대로 레이더 차트와 종합 점수가 바뀌어요\n가장 약한 영역 3개와 먼저 할 일을 추천해요',
    MakerNote: '첫 미팅에서 고객과 같이 눌러 보면 대화가 자연스럽게 다음 단계로 이어져요.', Output: '준비도 점수 · 레이더 차트 · 먼저 할 일 3개',
    rel: [['1.0', '처음 공유', 20]], stars: 5, review: '첫 미팅 아이스브레이킹으로 최고예요. 고객이 점수를 보고 먼저 지원을 요청했어요' },
  { file: 'copilot-roi-calculator.html', Title: 'Copilot 도입 효과(ROI) 계산기', Summary: '슬라이더를 움직이면 순효과 · 회수 기간 · 손익분기점이 바로',
    Category: '계산기', WorkArea: ['제안과 전략 세우기'], Tools: ['Claude'], Scope: ['고객 프로젝트용'],
    Does: '인원 · 절감 시간 · 활용률 · 인건비 · 라이선스 비용으로 연간 순효과를 계산해요\n12개월 누적 그래프에 손익분기 시점을 표시해요\n보수 · 기준 · 낙관 세 경우를 비교하고 계산 근거를 복사할 수 있어요',
    MakerNote: '"그래서 얼마 아껴요?" 질문에 고객 숫자로 그 자리에서 답하려고 만들었어요.', Output: '연간 순효과 · 투자 회수 기간 · 계산 근거',
    rel: [['1.0', '처음 공유', 16], ['1.1', '손익분기 활용률 추가', 1]], stars: 4, review: '경영진 미팅에서 활용률 슬라이더를 같이 움직여 보니 설득이 쉬웠어요' },
  { file: 'agent-tool-picker.html', Title: 'Agent 도구 선택 도우미', Summary: '질문 7개로 Copilot · Agent Builder · Copilot Studio 중 추천',
    Category: '판단 도우미', WorkArea: ['고객 업무 이해하고 설계하기'], Tools: ['Claude', 'ChatGPT'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: '사용자 · 지식 · 실행 · 배포 · 라이선스 · 일정 · 관리자 7개 질문에 답하면 도구를 추천해요\n추천 이유와 다음에 할 일 3단계를 보여 줘요\n세 도구를 한눈에 비교하는 표가 같이 나와요',
    MakerNote: '고객이 "이건 Copilot Studio로 해야 해요?"라고 물을 때마다 같은 설명을 반복해서 만들었어요.', Output: '추천 도구 · 판단 이유 · 비교표',
    rel: [['1.0', '처음 공유', 12]], stars: 4 },
  { file: 'scenario-priority-matrix.html', Title: '시나리오 우선순위 매트릭스', Summary: '시나리오를 끌어다 놓으면 Quick Win부터 실행 순서가 정리돼요',
    Category: '판단 도우미', WorkArea: ['제안과 전략 세우기'], Tools: ['Claude'], Scope: ['고객 프로젝트용'],
    Does: '워크숍에서 나온 시나리오를 효과 × 난이도 2×2 판에 끌어다 놓아요\n빠른 성과 · 전략 과제 · 작은 개선 · 보류로 자동 분류하고 점수를 매겨요\n결과를 표로 복사해 Excel · Teams에 붙여 넣을 수 있어요',
    MakerNote: '워크숍 화이트보드 사진을 정리하는 시간이 아까워서 화면에서 바로 하도록 만들었어요.', Output: '시나리오 실행 순서표',
    rel: [['1.0', '처음 공유', 9]], stars: 5, review: '고객 워크숍에서 화면 공유하고 같이 옮겼더니 결정이 10분 만에 끝났어요' },
  { file: 'adkar-change-survey.html', Title: 'ADKAR 변화 준비도 진단', Summary: '직원이 어느 단계에서 막혔는지 찾고 바로 할 일을 추천해요',
    Category: '투표 및 설문', WorkArea: ['교육·확산 프로그램 운영하기'], Tools: ['Claude', 'Copilot'], Scope: ['고객 프로젝트용'],
    Does: 'ADKAR 5단계 10문항으로 개인의 변화 준비도를 진단해요\n그룹별 평균을 넣어 부서끼리 비교할 수 있어요\n3점 미만인 첫 단계를 "막힌 지점"으로 찾아 맞는 활동을 추천해요',
    MakerNote: '확산이 멈춘 부서가 왜 멈췄는지 설명할 근거가 필요해서 만들었어요.', Output: '단계별 점수 · 막힌 지점 · 추천 활동',
    rel: [['1.0', '처음 공유', 4]] },
  { file: 'project-status-dashboard.html', Title: '프로젝트 현황 대시보드 (PMO)', Summary: '단계 일정 · 마일스톤 · 위험 히트맵 · 신호등 상태를 한 화면에',
    Category: '대시보드', WorkArea: ['프로젝트·사내 업무 하기'], Tools: ['Claude'], Scope: ['고객 프로젝트용'],
    Does: '단계 · 마일스톤 · 위험을 한 줄씩 적으면 간트 차트와 위험 히트맵을 그려요\n계획 대비 진행률과 위험 수준으로 종합 상태(정상 · 주의 · 위험)를 판단해요\n고객 주간 보고에 넣을 문장을 만들어 복사할 수 있어요\n인쇄 · PDF로 바로 보고 자료가 돼요',
    MakerNote: '매주 고객 보고 때마다 PPT 일정표를 손으로 고치던 걸 없애려고 만들었어요. 내용은 이 브라우저에 저장돼요.', Output: '프로젝트 현황 한 장 · 주간 보고 문장',
    rel: [['1.0', '처음 공유', 15], ['1.1', '종합 상태 자동 판단 추가', 2]] },
  { file: 'pilot-impact-dashboard.html', Title: '파일럿 효과 측정 대시보드', Summary: '사전 · 사후 설문으로 절감 시간 · 만족도 · NPS와 확산 효과를 계산해요',
    Category: '대시보드', WorkArea: ['데이터로 인사이트 찾기'], Tools: ['Claude', 'Copilot'], Scope: ['고객 프로젝트용'],
    Does: 'Forms 설문 결과를 붙여 넣으면 시나리오별 · 부서별 절감 시간을 보여 줘요\n만족도 분포와 추천 의향(NPS)을 계산해요\n확산 인원과 인건비를 넣으면 연간 기대 효과를 보수 · 기준으로 계산해요\n확산 의사결정 보고 요약을 만들어 복사할 수 있어요',
    MakerNote: '파일럿 끝나고 "그래서 확산해요?"에 답할 근거를 하루 만에 만들려고 만들었어요.', Output: '파일럿 효과 요약 · 확산 시 기대 효과',
    rel: [['1.0', '처음 공유', 10]] },
  { file: 'adoption-funnel-dashboard.html', Title: '교육 · 확산 퍼널 대시보드', Summary: '라이선스 → 교육 → 첫 사용 → 주간 활성, 어디서 빠지는지 부서별로',
    Category: '대시보드', WorkArea: ['교육·확산 프로그램 운영하기'], Tools: ['Claude'], Scope: ['고객 프로젝트용', '사내 업무용'],
    Does: '부서별 라이선스 · 교육 이수 · 첫 사용 · 주간 활성 숫자로 확산 퍼널을 그려요\n부서마다 가장 많이 빠지는 단계(병목)를 찾아 표시해요\n병목 단계에 맞는 처방(교육 방식, 첫 과제, 미션)을 추천해요\n주간 활성 사용률 추이를 부서별로 비교해요',
    MakerNote: '활성 사용률이 낮을 때 "교육이 문제인지, 쓸 일이 없는 건지" 구분하려고 만들었어요.', Output: '부서별 병목 단계 · 처방',
    rel: [['1.0', '처음 공유', 6]] }
];

/* ---------- Agent 6개 (AgentList) ---------- */
const agents = [
  { Title: 'DEMO-AG-POLICY', AgentName: '사내 규정 도우미', Summary: '휴가 · 출장 · 경비 규정을 근거 조항과 함께 바로 답해요', BuildTool: 'Agent Builder',
    TaskArea: ['프로젝트·사내 업무 하기'], Output: ['답변'], OutputNote: '근거 규정 이름과 조항이 붙은 짧은 답변', Scope: ['사내 업무용'],
    Does: ['휴가 · 출장 · 경비 · 보안 규정 질문에 바로 답해요', '답변 끝에 근거 문서와 조항을 붙여요', '규정에 없는 내용은 담당 부서를 알려 줘요'],
    Prompts: ['해외 출장 일비는 얼마야?', '반차를 쓰려면 언제까지 신청해야 해?', '법인카드로 회식비 결제할 때 한도가 있어?'],
    MakerNote: '경영지원팀에 오던 규정 질문이 매주 30건이 넘었어요. 이제 Agent가 먼저 답하고, 사람은 예외만 봐요.',
    Instructions: '너는 MUNI LABS 사내 규정 도우미야.\n- 연결된 규정 문서에 있는 내용만 근거로 답해.\n- 답변 끝에 [출처: 문서명 > 조항]을 붙여.\n- 문서에 없으면 추측하지 말고 담당 부서(경영지원팀)를 안내해.\n- 금액 · 기한은 원문 그대로 써.',
    Config: { knowledge: [{ name: '사내 규정집', where: 'SharePoint 경영지원 사이트 > 규정 문서함', type: '문서' }, { name: '경비 처리 FAQ', where: 'SharePoint 페이지', type: '페이지' }], tools: [] },
    rel: [['1.0', '처음 배포', 52], ['1.1', '출처 표시 규칙 추가', 21], ['1.2', '보안 규정 문서 연결', 6]], skills: [] },
  { Title: 'DEMO-AG-BRIEFING', AgentName: '고객 미팅 브리핑', Summary: '미팅 전 고객과 주고받은 메일 · 문서 · 지난 회의를 한 장으로', BuildTool: 'Copilot Studio',
    TaskArea: ['고객 업무 이해하고 설계하기'], Output: ['문서 초안', '체크리스트'], OutputNote: '고객 현황 · 지난 논의 · 오늘 논의 포인트 3개 · 예상 질문이 담긴 한 장 브리핑', Scope: ['고객 프로젝트용'],
    Does: ['다음 미팅 고객과의 최근 메일 · Teams 회의 · 공유 문서를 모아요', '지난 논의와 아직 안 끝난 일을 정리해요', '오늘 꺼낼 논의 포인트와 예상 질문을 뽑아요'],
    Prompts: ['내일 오전 A사 미팅 브리핑 만들어 줘', '지난 3번의 회의에서 고객이 걱정한 것만 정리해 줘', '오늘 미팅에서 받을 만한 질문 5개와 답 초안'],
    MakerNote: '미팅 전에 메일함 · Teams · SharePoint를 뒤지던 30분이 3분이 됐어요. 대표님 미팅 전에 특히 많이 써요.',
    Instructions: '너는 컨설턴트의 고객 미팅 준비를 돕는 브리핑 작성자야.\n- 사용자 일정에서 다음 고객 미팅을 찾고, 그 고객과 관련된 최근 메일 · 회의 · 문서만 근거로 써.\n- 형식: 고객 현황 / 지난 논의 / 미결 사항 / 오늘 논의 포인트 3개 / 예상 질문과 답.\n- 한 페이지를 넘기지 마.',
    Config: { knowledge: [{ name: '고객 프로젝트 사이트', where: 'SharePoint 프로젝트 사이트', type: '사이트' }], tools: [{ name: '일정 읽기', connector: 'Office 365 Outlook', kind: '작업' }, { name: '메일 검색', connector: 'Office 365 Outlook', kind: '작업' }] },
    rel: [['1.0', '처음 배포', 33], ['1.1', '예상 질문과 답 추가', 8]], skills: ['고객 인터뷰 → 현황 진단'] },
  { Title: 'DEMO-AG-WEEKLY', AgentName: '프로젝트 주간 보고 작성기', Summary: '한 주의 회의록 · 메일 · Planner를 모아 고객 주간 보고 초안으로', BuildTool: 'Copilot Studio',
    TaskArea: ['프로젝트·사내 업무 하기'], Output: ['문서 초안', '표'], OutputNote: '진행 현황 · 이번 주 한 일 · 다음 주 계획 · 이슈와 위험이 담긴 주간 보고 Word 초안', Scope: ['고객 프로젝트용'],
    Does: ['이번 주 프로젝트 회의록 · 메일 · Planner 작업을 모아요', '한 일 · 다음 주 계획 · 이슈를 표로 나눠요', '고객 보고 양식에 맞춘 Word 초안을 만들어요'],
    Prompts: ['B사 프로젝트 이번 주 주간 보고 만들어 줘', '이슈와 위험만 표로 다시 정리해 줘', '고객용으로 말투를 정중하게 바꿔 줘'],
    MakerNote: '금요일마다 PM들이 1시간씩 쓰던 주간 보고를 10분 검토로 줄였어요.',
    Instructions: '너는 컨설팅 프로젝트 PM의 주간 보고 작성자야.\n- 이번 주(월~금) 자료만 근거로 써.\n- 진행률은 Planner 완료 비율로 계산해.\n- 이슈는 영향 · 대응 · 담당 · 기한으로 나눠.\n- 고객에게 보낼 정중한 존댓말로 써.',
    Config: { knowledge: [{ name: '프로젝트 회의록', where: 'SharePoint 프로젝트 사이트 > 회의록', type: '문서' }, { name: '주간 보고 양식', where: 'SharePoint 템플릿 문서함', type: '문서' }], tools: [{ name: 'Planner 작업 읽기', connector: 'Planner', kind: '작업' }, { name: 'Word 문서 만들기', connector: 'Word Online', kind: '작업' }] },
    rel: [['1.0', '처음 배포', 45], ['1.1', 'Planner 진행률 계산 추가', 15], ['2.0', 'Word 초안 자동 생성', 3]], skills: ['프로젝트 착수 패키지'] },
  { Title: 'DEMO-AG-SME', AgentName: '사내 전문가 찾기', Summary: '"이 주제 누가 잘 알아?"에 프로젝트 이력으로 사람을 찾아 줘요', BuildTool: 'Agent Builder',
    TaskArea: ['프로젝트·사내 업무 하기'], Output: ['답변', '표'], OutputNote: '전문가 이름 · 관련 프로젝트 · 근거 문서가 담긴 추천 표', Scope: ['사내 업무용'],
    Does: ['주제를 말하면 관련 프로젝트를 한 사람을 찾아요', '추천 이유(프로젝트, 문서, 사례)를 같이 보여 줘요', 'Teams 채팅으로 바로 물어볼 수 있게 이름을 알려 줘요'],
    Prompts: ['Copilot Studio 커넥터 경험 있는 사람 찾아 줘', '금융권 Copilot 도입 프로젝트 해 본 사람은?', '민감도 레이블 설계 잘 아는 사람 3명 추천해 줘'],
    MakerNote: '신규 프로젝트 제안 때 "이거 해 본 사람?"을 Teams에 묻고 반나절 기다리던 걸 없앴어요.',
    Instructions: '너는 MUNI LABS의 사내 전문가 찾기 도우미야.\n- 프로젝트 사례 · 산출물 문서의 작성자와 참여자를 근거로 추천해.\n- 최대 3명, 각자 근거 프로젝트와 문서를 붙여.\n- 개인 평가나 순위를 매기지 마.',
    Config: { knowledge: [{ name: '프로젝트 사례 목록', where: 'SharePoint MUNIVERSE > Case Library', type: '목록' }, { name: '산출물 문서함', where: 'SharePoint 프로젝트 아카이브', type: '문서' }], tools: [] },
    rel: [['1.0', '처음 배포', 24]], skills: [] },
  { Title: 'DEMO-AG-PLANDAY', AgentName: '오늘의 업무 계획', Summary: '일정 · 메일 · 할 일을 보고 오늘 할 일의 순서를 짜 줘요', BuildTool: 'Agent Builder',
    TaskArea: ['프로젝트·사내 업무 하기'], Output: ['체크리스트'], OutputNote: '시간대별 오늘 계획과 꼭 답해야 할 메일 목록', Scope: ['사내 업무용'],
    Does: ['오늘 일정 사이의 빈 시간을 찾아요', '답해야 할 메일과 마감이 가까운 할 일을 골라요', '시간대별 오늘 계획을 체크리스트로 만들어요'],
    Prompts: ['오늘 계획 짜 줘', '오후에 집중 시간 2시간 확보해 줘', '오늘 꼭 답해야 할 메일만 알려 줘'],
    MakerNote: '아침마다 Outlook · Teams · To Do를 오가며 10분씩 정리하던 걸 한 번에 해요.',
    Instructions: '너는 사용자의 하루 계획을 돕는 비서야.\n- 오늘 일정, 지난 24시간 받은 메일, To Do 할 일을 근거로 써.\n- 회의 사이 30분 이상 빈 시간에 할 일을 배치해.\n- 답장이 필요한 메일은 보낸 사람 · 제목 · 이유를 한 줄로.',
    Config: { knowledge: [], tools: [{ name: '일정 읽기', connector: 'Office 365 Outlook', kind: '작업' }, { name: '할 일 읽기', connector: 'Microsoft To Do', kind: '작업' }] },
    rel: [['1.0', '처음 배포', 17], ['1.1', '집중 시간 확보 기능', 5]], skills: [] },
  { Title: 'DEMO-AG-LEARN', AgentName: 'Copilot 학습 코치', Summary: '내 직무에 맞는 Copilot 활용법을 매일 하나씩 알려 줘요', BuildTool: 'Copilot Studio',
    TaskArea: ['교육·확산 프로그램 운영하기'], Output: ['답변', '체크리스트'], OutputNote: '직무 맞춤 활용 팁 · 바로 쓰는 프롬프트 · 오늘의 미션', Scope: ['사내 업무용', '고객 프로젝트용'],
    Does: ['직무와 업무를 말하면 Copilot 활용 장면을 추천해요', '복사해 쓰는 프롬프트와 고친 예시를 보여 줘요', '매일 하나씩 해 볼 미션을 줘요'],
    Prompts: ['나는 재무팀이야. Excel에서 Copilot 어떻게 써?', '회의록 요약 프롬프트 더 좋게 고쳐 줘', '오늘의 Copilot 미션 줘'],
    MakerNote: '고객사 교육이 끝난 뒤에도 직원들이 계속 물어볼 곳이 필요해서 만들었어요. 고객사에 맞게 복사해서 배포해요.',
    Instructions: '너는 Microsoft 365 Copilot 학습 코치야.\n- 사용자의 직무를 먼저 묻고, 그 직무의 실제 업무 장면으로 설명해.\n- 프롬프트는 목표 · 맥락 · 자료 · 기대 결과 네 요소를 갖춰 완성된 문장으로.\n- 한 번에 팁은 3개까지만.',
    Config: { knowledge: [{ name: 'Copilot 활용 가이드', where: 'SharePoint 교육 자료실', type: '문서' }, { name: 'Microsoft Learn', where: 'learn.microsoft.com', type: '웹사이트' }], tools: [] },
    rel: [['1.0', '처음 배포', 38], ['1.1', '오늘의 미션 추가', 10]], skills: ['직무별 프롬프트 교육 자료', '챔피언 프로그램 운영 가이드'] }
];

const WITH_REVIEWS = false;
const DATA = {
  withReviews: WITH_REVIEWS,
  skills: skills.map(s => ({ ...s, text: read('skills', s.file) })),
  htmls: htmls.map(h => ({ ...h, text: read('html', h.file) })),
  agents
};

/* ---------- 브라우저에서 돌아가는 부분 ---------- */
function runtime(DATA) {
  (async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const me = _spPageContextInfo.userId;
    const J = { Accept: 'application/json;odata=verbose' };
    const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    let D = await digest();
    const L = t => `${web}/_api/web/lists/getbytitle('${encodeURIComponent(t)}')`;
    const get = async url => { const r = await fetch(url, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${url.replace(web, '')}`); } return (await r.json()).d; };
    const post = async (url, body, extra) => {
      const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, ...(extra || {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (!r.ok) { throw new Error(`${r.status} ${url.replace(web, '')}\n${(await r.text()).slice(0, 300)}`); }
      const t = await r.text();
      return t ? JSON.parse(t).d : undefined;
    };
    const multi = a => ({ results: a });
    const day = n => new Date(Date.now() - n * 86400000).toISOString();
    const rel = list => JSON.stringify(list.map(([v, n, d]) => ({ v, d: day(d).slice(0, 10), n })));
    const log = [];
    const step = async (what, fn) => { try { const r = await fn(); log.push({ 단계: what, 결과: '✅' + (typeof r === 'string' ? ' ' + r : '') }); return r; } catch (e) { log.push({ 단계: what, 결과: '❌ ' + e.message.split('\n')[0] }); console.warn(what, e.message); return undefined; } };

    /* 이미 넣은 데모 항목이 있으면 건너뜁니다 (두 번 실행해도 중복이 안 생기게) */
    const C = (await get(`${L('HubContents')}?$select=ListItemEntityTypeFullName,Id`));
    const existing = (await get(`${L('HubContents')}/items?$select=Id,Title,Kind&$top=5000`)).results;
    const has = (kind, title) => existing.filter(r => r.Kind === kind && r.Title === title)[0];
    const contentIds = {};
    const attach = async (id, name, text) => {
      const r = await fetch(`${L('HubContents')}/items(${id})/AttachmentFiles/add(FileName='${encodeURIComponent(name)}')`, { method: 'POST', headers: { ...J, 'X-RequestDigest': D }, body: new Blob([text], { type: 'text/plain;charset=utf-8' }) });
      if (!r.ok) { throw new Error(`첨부 실패 ${r.status}: ${(await r.text()).slice(0, 200)}`); }
    };
    const comment = (id, text) => post(`${L('HubContents')}/items(${id})/Comments`, { text }, { 'Content-Type': 'application/json;odata=nometadata', Accept: 'application/json;odata=nometadata' });
    const rate = (id, v) => post(`${web}/_api/Microsoft.Office.Server.ReputationModel.Reputation.SetRating(listID=@a1,itemID=@a2,rating=@a3)?@a1='{${C.Id}}'&@a2='${id}'&@a3=${v}`);

    const putContent = async (kind, x) => {
      const old = has(kind, x.Title);
      if (old) { contentIds[x.Title] = old.Id; return '이미 있어 건너뜀'; }
      const { file, text, rel: r, stars, review, ...f } = x;
      const it = await post(`${L('HubContents')}/items`, { __metadata: { type: C.ListItemEntityTypeFullName }, ...f, Kind: kind, WorkArea: multi(f.WorkArea), Tools: multi(f.Tools), Scope: multi(f.Scope), Releases: rel(r), Hidden: false });
      contentIds[x.Title] = it.Id;
      await attach(it.Id, `${Date.now()}_${file}`, text);
      // 리뷰 · 별점은 지금은 넣지 않습니다. 넣으려면 WITH_REVIEWS 를 true 로 바꾸세요.
      if (DATA.withReviews && stars) { await rate(it.Id, stars).catch(() => undefined); }
      if (DATA.withReviews && review) { await comment(it.Id, `[★${stars}] ${review}`); }
      return `ID ${it.Id}`;
    };
    for (const s of DATA.skills) { await step(`Skill · ${s.Title}`, () => putContent('Skill', s)); }
    for (const h of DATA.htmls) { await step(`HTML · ${h.Title}`, () => putContent('HTML', h)); }

    /* ---------- AgentList ---------- */
    const lists = (await get(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`)).results;
    const norm = s => String(s || '').toLowerCase().replace(/[\s_-]/g, '');
    const hit = lists.filter(l => norm(l.Title) === 'agentlist' || /\/lists\/agentlist$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (!hit) { log.push({ 단계: 'AgentList', 결과: '❌ 목록을 찾지 못했어요' }); } else {
      const base = `${web}/_api/web/lists(guid'${hit.Id}')`;
      const info = await get(`${base}?$select=ListItemEntityTypeFullName`);
      const choiceCache = {};
      const choicesOf = async name => {
        if (!(name in choiceCache)) { choiceCache[name] = await get(`${base}/fields/getbyinternalnameortitle('${name}')?$select=Choices,TypeAsString`).then(f => ({ type: f.TypeAsString, list: (f.Choices && f.Choices.results) || [] })).catch(() => null); }
        return choiceCache[name];
      };
      const opsList = ((await choicesOf('OpsStatus')) || { list: [] }).list;
      const ops = ['정식 운영', '운영 중', '안정화 중'].filter(x => opsList.indexOf(x) >= 0)[0] || opsList.filter(x => !/중단|폐기/.test(x))[0];
      const agentRows = (await get(`${base}/items?$select=Id,Title&$top=5000&$filter=startswith(Title,'DEMO-AG-')`)).results;
      for (const a of DATA.agents) {
        await step(`Agent · ${a.AgentName}`, async () => {
          if (agentRows.some(r => r.Title === a.Title)) { return '이미 있어 건너뜀'; }
          const { rel: r, skills, Config, Does, Prompts, ...rest } = a;
          const fields = { __metadata: { type: info.ListItemEntityTypeFullName }, Title: rest.Title, AgentName: rest.AgentName, Summary: rest.Summary, OutputNote: rest.OutputNote,
            Does: Does.join('\n'), Prompts: Prompts.join('\n'), MakerNote: rest.MakerNote, Instructions: rest.Instructions, Config: JSON.stringify(Config),
            Version: r[r.length - 1][0], Releases: rel(r), FirstDeployedOn: day(r[0][2]), DeployedAt: day(r[r.length - 1][2]), OwnerId: me,
            OpenUrl: { __metadata: { type: 'SP.FieldUrlValue' }, Url: 'https://m365.cloud.microsoft/chat', Description: 'Copilot에서 열기' } };
          const skipped = [];
          for (const k of ['BuildTool', 'TaskArea', 'Output', 'Scope', 'Env', 'OpsStatus']) {
            const want = k === 'Env' ? ['Prod'] : k === 'OpsStatus' ? [ops] : [].concat(rest[k]);
            const c = await choicesOf(k);
            if (!c) { skipped.push(k); continue; }
            const ok = want.filter(x => c.list.indexOf(x) >= 0);
            if (!ok.length) { skipped.push(k); continue; }
            fields[k] = c.type === 'MultiChoice' ? { __metadata: { type: 'Collection(Edm.String)' }, results: ok } : ok[0];
          }
          const it = await post(`${base}/items`, fields);
          let note = `ID ${it.Id}` + (skipped.length ? ` (못 넣은 열: ${skipped.join(', ')})` : '');
          const ids = skills.map(t => contentIds[t]).filter(Boolean);
          if (ids.length) {
            await post(`${base}/items(${it.Id})`, { __metadata: { type: info.ListItemEntityTypeFullName }, SkillsId: multi(ids) }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' })
              .then(() => { note += ` · Skill ${ids.length}개 연결`; }, () => { note += ' · Skill 연결 열 없음'; });
          }
          return note;
        });
      }
    }

    console.table(log);
    console.log(log.every(x => x.결과.startsWith('✅')) ? '✅ 데모 데이터를 다 넣었어요. Hub를 새로 고쳐 보세요.' : '⚠️ 일부가 실패했어요. 위 표의 ❌ 줄을 보내 주세요.');
    console.log('지울 때는 hubDemoCleanup() 을 입력하세요. 이 스크립트가 넣은 제목의 항목만 휴지통으로 보내요.');
  })().catch(e => console.error('중간에 멈췄어요:', e.message));

  window.hubDemoCleanup = async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const del = url => fetch(url + '/recycle()', { method: 'POST', headers: { ...J, 'X-RequestDigest': D } });
    const titles = { Skill: DATA.skills.map(x => x.Title), HTML: DATA.htmls.map(x => x.Title) };
    const L = `${web}/_api/web/lists/getbytitle('HubContents')`;
    const rows = (await (await fetch(`${L}/items?$select=Id,Title,Kind&$top=5000`, { headers: J })).json()).d.results.filter(r => (titles[r.Kind] || []).indexOf(r.Title) >= 0);
    for (const r of rows) { await del(`${L}/items(${r.Id})`); }
    console.log(`HubContents: ${rows.length}개 휴지통으로`);
    const lists = (await (await fetch(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`, { headers: J })).json()).d.results;
    const hit = lists.filter(l => l.Title.toLowerCase().replace(/[\s_-]/g, '') === 'agentlist' || /\/lists\/agentlist$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (hit) {
      const B = `${web}/_api/web/lists(guid'${hit.Id}')`;
      const keys = DATA.agents.map(a => a.Title);
      const ar = (await (await fetch(`${B}/items?$select=Id,Title&$top=5000&$filter=startswith(Title,'DEMO-AG-')`, { headers: J })).json()).d.results.filter(r => keys.indexOf(r.Title) >= 0);
      for (const r of ar) { await del(`${B}/items(${r.Id})`); }
      console.log(`AgentList: ${ar.length}개 휴지통으로`);
    }
  };
}

const header = `/*
 * MUNIVERSE 데모 데이터 넣기 · 지우기 (브라우저 콘솔용) — node scripts/build-demo-seed.js 로 만든 파일입니다. 직접 고치지 마세요.
 *
 * 넣는 것
 *   - HubContents : Skill ${skills.length}개 (SKILL.md 첨부), HTML ${htmls.length}개 (실제로 동작하는 HTML 첨부)${WITH_REVIEWS ? ', 내 별점 · 리뷰' : ' (리뷰 · 별점 없음)'}
 *   - AgentList   : 예시 Agent ${agents.length}개 (행 키가 DEMO-AG- 로 시작, Owner = 실행한 사람, 관련 Skill 연결)
 *   제목은 '[테스트]' 없이 깨끗하게 넣습니다. 같은 제목이 이미 있으면 건너뛰어 두 번 실행해도 중복이 안 생겨요.
 *
 * 쓰는 법
 *   1. Hub 사이트를 열고 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter.
 *   2. 지울 때는 Console 에 hubDemoCleanup() 입력 → 이 스크립트가 넣은 제목 · 행 키의 항목만 휴지통으로 보냅니다.
 */
`;
const out = path.join(__dirname, 'seed-demo-data.js');
fs.writeFileSync(out, header + `(${runtime.toString()})(${JSON.stringify(DATA)});\n`, 'utf8');
console.log('만들었어요:', out, Math.round(fs.statSync(out).size / 1024) + 'KB');
