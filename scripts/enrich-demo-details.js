/*
 * MUNIVERSE 데모 — 상세 화면 내용 채우기 (브라우저 콘솔용)
 *
 * 고치는 것
 *   - Agent '인사 규정 Q&A' (AgentList)
 *       한 줄 소개 · 이런 일을 해요 · 이렇게 말해 보세요 · 제작자는 이렇게 썼어요 · 지침 · 참조 지식 · 사용 도구 · 결과물 설명
 *       상세 정보 탭의 연결된 Agent(사내 규정 도우미 · 사내 전문가 찾기) · Skill(오버셰어링 점검 · ADKAR 커뮤니케이션 플랜)
 *       업데이트 기록 1.0~1.4 (이미 있는 버전은 그대로 두고 없는 것만 더함, 버전은 가장 최근 것으로)
 *       (업무 영역 · 결과물 · 사용 범위는 목록의 선택지에 있는 값만 넣습니다. Owner는 그대로)
 *   - Skill 'Copilot 활용 시나리오 평가' (HubContents)
 *       한 줄 소개 · 이럴 때 써요 · 활용 방법 · 본문(첨부 .md 파일 내용) · 업데이트 기록에 1.3 추가
 *   - HTML 'Agent 도구 선택 도우미' (HubContents)
 *       한 줄 소개 · 이런 일을 해요 · 제작자는 이렇게 썼어요 · 결과물 (HTML 파일은 그대로)
 *
 * 쓰는 법
 *   1. Hub 사이트를 열고 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter.
 *   2. 고치기 전 값은 이 브라우저에 저장됩니다. 되돌리려면 Console 에 hubDetailRestore() 입력.
 */
(() => {
  const ago = n => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10);
  /** 업데이트 기록(Releases JSON [{v,d,n}])에 더하기: 이미 있는 버전은 그대로 두고, 날짜 순으로 정렬 */
  const addReleases = (raw, add) => {
    let list = [];
    try { list = raw ? JSON.parse(raw) : []; } catch (e) { list = []; }
    if (Object.prototype.toString.call(list) !== '[object Array]') { list = []; }
    add.forEach(([v, n, days]) => { if (!list.some(x => x && x.v === v)) { list.push({ v, d: ago(days), n }); } });
    list.sort((a, b) => String(a.d || '').localeCompare(String(b.d || '')));
    return list.slice(-10);
  };
  // 첨부 파일 내용 주소 (한글 · 따옴표가 든 파일 이름도 되도록 매개변수로 넘김)
  const fileValue = (web, path) => `${web}/_api/web/GetFileByServerRelativePath(decodedurl=@u)/$value?@u='${encodeURIComponent(String(path).replace(/'/g, "''"))}'`;

  /* ======================= Agent: 인사 규정 Q&A ======================= */
  const AGENT_NAME = '인사 규정 Q&A';
  const AGENT = {
    Summary: '휴가 · 근태 · 급여 · 복리후생 질문에 규정 근거와 함께 바로 답해요',
    Does: [
      '연차 · 반차 · 경조휴가 · 육아휴직 같은 휴가 규정을 내 상황에 맞춰 계산해 답해요',
      '근무 시간 · 유연근무 · 재택근무 · 초과근무 신청 기준과 승인자를 알려 줘요',
      '급여 지급일 · 수당 · 연말정산 일정처럼 자주 묻는 급여 질문에 답해요',
      '경조금 · 건강검진 · 교육비 지원 등 복리후생 신청 방법과 필요한 서류를 안내해요',
      '답변마다 [출처: 규정명 > 조항]을 붙여 원문을 바로 확인할 수 있어요',
      '개인 상황 판단이 필요한 질문은 인사팀 문의 양식으로 연결해 줘요'
    ],
    Prompts: [
      '입사 1년 6개월 차인데 올해 연차가 며칠이야? 계산 과정도 보여줘',
      '다음 달에 결혼하는데 경조휴가랑 경조금은 어떻게 신청해?',
      '재택근무는 일주일에 며칠까지 되고 누구 승인을 받아야 해?',
      '육아휴직 쓰면 급여는 어떻게 되고, 복직은 언제까지 알려야 해?',
      '야근 수당은 몇 시부터 붙고 신청은 어디서 해?'
    ],
    MakerNote: '인사팀 메신저로 하루 20건 넘게 오던 "연차 며칠 남았어요?", "경조금 얼마예요?" 같은 질문을 줄이려고 만들었어요.\n'
      + '취업규칙 · 복리후생 안내서 · 인사팀 FAQ만 지식으로 연결해서, 문서에 없는 내용은 추측하지 않고 인사팀으로 넘기게 했어요.\n'
      + '배포 후 한 달 동안 인사팀 단순 문의가 62% 줄었고, 인사팀이 답변 100건을 검수해 보니 정확도는 96%였어요.\n'
      + '개인 급여 · 평가 정보는 일부러 연결하지 않았어요. "내 연봉"처럼 개인 정보를 물으면 정중하게 거절하고 확인 방법만 알려 줘요.',
    Instructions: [
      '너는 MUNI LABS의 인사 규정 Q&A 도우미야. 직원이 휴가 · 근태 · 급여 · 복리후생 · 인사 제도에 대해 물으면 답해.',
      '',
      '## 답변 원칙',
      '- 연결된 취업규칙 · 복리후생 안내서 · 인사팀 FAQ · 휴가 신청 가이드에 있는 내용만 근거로 답해.',
      '- 순서: ① 결론 1~2문장 ② 조건 · 절차 ③ [출처: 문서명 > 조항].',
      '- 일수 · 금액 · 기한은 원문 숫자를 그대로 쓰고, 계산이 필요하면 계산 과정을 한 줄로 보여 줘.',
      '- 규정이 바뀐 적이 있으면 지금 적용되는 최신 기준으로 답하고 시행일을 함께 적어.',
      '- 비교가 필요한 질문(예: 휴가 종류별 일수)은 표로 정리해.',
      '',
      '## 하지 말 것',
      '- 문서에 없는 내용을 추측하지 마. "규정에서 찾지 못했어요"라고 말하고 인사팀 문의 방법을 안내해.',
      '- 특정 직원의 급여 · 평가 · 징계 같은 개인 정보는 답하지 마.',
      '- 법률 해석이나 분쟁 판단은 하지 마.',
      '',
      '## 인사팀으로 넘길 때',
      '- 개인 상황에 따라 달라지는 판단 (휴직 승인 여부, 예외 적용 등)',
      '- 규정끼리 내용이 서로 다를 때',
      '- 직원이 불만이나 고충을 말할 때: 공감하는 한 문장을 먼저 쓰고 고충 처리 절차를 안내해.',
      '',
      '## 말투',
      '- 존댓말, 짧은 문장. 전문 용어는 쉬운 말로 풀어서.'
    ].join('\n'),
    Config: {
      knowledge: [
        { name: '취업규칙 (2026년 개정판)', where: 'SharePoint 인사 사이트 > 규정 문서함', type: '문서' },
        { name: '복리후생 안내서', where: 'SharePoint 인사 사이트 > 안내서', type: '문서' },
        { name: '인사팀 자주 묻는 질문 120건', where: 'SharePoint 인사 사이트 > FAQ 목록', type: '목록' },
        { name: '휴가·근태 신청 가이드', where: 'SharePoint 인사 사이트 > 페이지', type: '페이지' }
      ],
      tools: [
        { name: '인사팀 문의 양식 열기', connector: 'Microsoft Forms', kind: '작업' },
        { name: '인사팀 채널에 문의 남기기', connector: 'Microsoft Teams', kind: '작업' }
      ]
    },
    OutputNote: '결론 · 조건과 절차 · 근거 조항이 붙은 짧은 답변 (필요하면 표)',
    TaskArea: ['규정 확인', '검색 및 답변'], Output: ['답변'], Scope: ['사내 업무용'],
    // 업데이트 기록: [버전, 변경 내용, 며칠 전]
    releases: [
      ['1.0', '처음 배포 · 취업규칙 연결', 64],
      ['1.1', '복리후생 안내서 · 인사팀 FAQ 120건 연결', 47],
      ['1.2', '연차 · 휴가 일수 계산 과정을 답변에 표시', 30],
      ['1.3', '개인 급여 · 평가 질문은 정중하게 거절하는 규칙 추가', 16],
      ['1.4', '답이 없을 때 인사팀 문의 양식 · Teams 채널로 연결', 4]
    ],
    // 상세 정보 탭의 '연결된 Agent' · 'Skill' (Hub에 있는 이름. 없는 이름은 건너뜀)
    LinkedAgents: ['사내 규정 도우미', '사내 전문가 찾기'],
    Skills: ['데이터 과다 공유(오버셰어링) 점검', '변화관리 커뮤니케이션 플랜 (ADKAR)']
  };

  /* ======================= Skill: Copilot 활용 시나리오 평가 ======================= */
  const SKILL_TITLE = 'Copilot 활용 시나리오 평가';
  const SKILL = {
    Summary: '업무 목록만 주면 Copilot 시나리오 · 점수표 · Quick Win Top 3까지 한 번에',
    Does: [
      '고객 부서의 업무 목록을 받아 Copilot을 어디에 먼저 쓸지 정해야 할 때',
      '효과 · 난이도 · 데이터 준비도로 점수를 매겨 Quick Win을 골라야 할 때',
      '시나리오 워크숍 결과를 경영진 보고용 우선순위 표로 정리해야 할 때',
      '파일럿 대상 업무와 바로 쓸 시작 프롬프트를 함께 제안해야 할 때'
    ].join('\n'),
    Usage: '고객 인터뷰나 업무 일지에서 뽑은 업무 목록(업무명 · 빈도 · 1회 소요 시간)을 Excel이나 표로 준비해요.\n'
      + 'Copilot 대화에 이 Skill 파일과 업무 목록을 함께 첨부하고 "이 업무 목록으로 시나리오 평가해줘"라고 말해요. Copilot Studio Agent에서는 지침 아래에 이 Skill을 추가해 두면 돼요.\n'
      + '결과 표의 Quick Win 3개는 HTML \'시나리오 우선순위 매트릭스\'에 옮겨 고객과 워크숍에서 위치를 같이 정하고, \'Copilot 도입 효과(ROI) 계산기\'로 기대 효과를 숫자로 보여 주면 제안서까지 바로 이어져요.\n'
      + 'E리테일 MD기획팀은 업무 23개를 넣어 30분 만에 Quick Win 3개를 골랐고, 그중 \'주간 매출 리뷰\' 준비 시간이 80% 줄었어요.',
    body: `---
name: copilot-scenario-assessment
description: 부서·직무의 업무 목록을 받아 Microsoft 365 Copilot 활용 시나리오를 만들고, 효과·난이도·데이터 준비도로 점수를 매겨 우선순위를 정할 때 사용합니다. "Copilot 쓸 만한 업무 찾아줘", "시나리오 우선순위", "Quick Win 골라줘" 같은 요청에 씁니다.
---

# Copilot 활용 시나리오 평가

당신은 Microsoft 365 Copilot 도입 컨설턴트입니다. 사용자가 준 부서·직무 정보와 업무 목록만 근거로 시나리오를 만들고 평가합니다. 추측한 내용은 "가정"이라고 표시합니다.

## 입력으로 받는 것
- 부서 / 직무 / 인원
- 반복 업무 목록 (업무명, 빈도, 1회 소요 시간을 알면 함께)
- 쓰는 앱 (Outlook, Teams, Word, Excel, PowerPoint, SharePoint 등)
- (있으면) 고객이 특히 불편하다고 말한 업무, 보안상 Copilot에 넣으면 안 되는 자료

빠진 정보가 있으면 표를 만들기 전에 최대 3개까지만 물어봅니다. 그래도 없으면 "가정"으로 채우고 진행합니다.

## 순서
1. 업무마다 Copilot이 도울 수 있는 장면을 1개씩 찾습니다. 도울 수 없는 업무는 "대상 아님"과 이유를 적습니다.
2. 장면마다 활용 방식을 하나 고릅니다: 초안 작성 / 요약 및 분류 / 검토 및 점검 / 비교 분석 / 데이터 시각화 / 질의응답 / 형식 변환
3. 시나리오마다 아래 세 기준으로 1~5점을 매깁니다.
4. 총점 = 효과 × 2 + 난이도 + 데이터 준비도 (최대 20점)
5. 총점 순으로 정렬하고 구분을 붙입니다.

## 점수 기준표
| 점수 | 효과 (팀 전체 주당 절감) | 난이도 (높을수록 쉬움) | 데이터 준비도 |
|---|---|---|---|
| 5 | 10시간 이상 | 오늘 프롬프트로 바로 가능 | SharePoint·Teams에 최신본이 정리돼 있음 |
| 4 | 5~10시간 | 프롬프트 + 템플릿 1개 | 대부분 M365 안에 있음 |
| 3 | 2~5시간 | Skill·Notebook 정리 필요 | 일부는 메일·개인 PC에 흩어져 있음 |
| 2 | 1~2시간 | Agent Builder로 Agent 필요 | 자료를 새로 모아야 함 |
| 1 | 1시간 미만 | Copilot Studio·시스템 연동 필요 | 자료가 M365 밖(사내 시스템)에만 있음 |

## 구분
- 15점 이상: **빠른 성과 (Quick Win)** — 1~2주 안에 파일럿
- 10~14점: **다음 단계** — 데이터 정리나 교육 후 진행
- 9점 이하: **장기 과제** — Agent 개발이나 시스템 연동 검토

## 출력 형식
### 1) 시나리오 평가표
| 순위 | 업무 | Copilot 활용 장면 | 활용 방식 | 쓰는 앱 | 예시 프롬프트 | 주당 절감(가정) | 효과 | 난이도 | 데이터 | 총점 | 구분 |
|---|---|---|---|---|---|---|---|---|---|---|---|

### 2) 빠른 성과 Top 3
시나리오마다 한 줄 요약, "첫 주에 할 일" 2개, 성공을 확인할 지표 1개.

### 3) 확인이 필요한 것
점수에 영향을 준 가정과, 고객에게 확인할 질문 (최대 5개).

## 예시
입력: MD기획팀 8명, "주간 매출 리뷰 자료 준비 (매주, 6시간)", "협력사 메일 회신 (매일, 1시간)", "신상품 품의서 작성 (매월, 4시간)"

| 순위 | 업무 | Copilot 활용 장면 | 활용 방식 | 쓰는 앱 | 예시 프롬프트 | 주당 절감(가정) | 효과 | 난이도 | 데이터 | 총점 | 구분 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 주간 매출 리뷰 | POS 시트에서 증감 · 이상치를 찾고 슬라이드 초안 작성 | 데이터 시각화 | Excel, PowerPoint | 지난주 대비 10% 이상 변한 카테고리를 찾아 원인 후보와 표로 정리해줘 | 4.8시간 × 8명 | 5 | 4 | 4 | 18 | 빠른 성과 |
| 2 | 협력사 메일 회신 | 받은 메일 요약과 회신 초안 | 초안 작성 | Outlook | 이 메일의 요청 사항을 3줄로 요약하고 정중한 회신 초안을 써줘 | 0.5시간 × 8명 | 4 | 5 | 5 | 18 | 빠른 성과 |
| 3 | 신상품 품의서 | 시장 자료를 품의서 양식에 맞춰 초안 | 초안 작성 | Word | 첨부한 시장 조사 자료로 품의서 양식의 배경 · 기대 효과를 채워줘 | 0.7시간 × 8명 | 3 | 4 | 3 | 13 | 다음 단계 |

## 지켜야 할 것
- 예시 프롬프트는 바로 복사해 쓸 수 있게 구체적으로 씁니다. (목표 · 맥락 · 자료 · 원하는 결과)
- 개인정보·고객사 실명이 입력에 있으면 결과에서는 "고객사 A"처럼 바꿉니다.
- 절감 시간은 근거를 함께 적습니다. 근거가 없으면 "가정"으로 표시합니다.
- 개인별 성과 평가나 감시로 읽힐 수 있는 시나리오(예: 직원별 메일 응답 속도 비교)는 만들지 않습니다.
`,
    releases: [
      ['1.0', '처음 공유', 41],
      ['1.1', '총점 공식에 효과 가중치(×2) 추가', 18],
      ['1.2', '예시 프롬프트 열 추가', 9],
      ['1.3', '점수 기준표 · 예시 입력과 결과 · 활용 방식 열 추가', 0]
    ]
  };

  /* ======================= HTML: Agent 도구 선택 도우미 ======================= */
  const HTML_TITLE = 'Agent 도구 선택 도우미';
  const HTML = {
    Summary: '질문 7개로 Copilot · Agent Builder · Copilot Studio 중 맞는 도구 추천',
    Does: [
      '사용자 수 · 지식 위치 · 실행 작업 · 배포 범위 · 라이선스 · 일정 · 관리자 7개 질문에 답하면 도구를 추천해요',
      '왜 그 도구인지 판단 이유를 질문별로 보여 줘요',
      '추천 도구로 시작할 때 다음에 할 일 3단계를 알려 줘요',
      'Copilot 채팅 · Agent Builder · Copilot Studio를 한눈에 비교하는 표가 같이 나와요',
      '답을 바꾸면 추천이 바로 바뀌어서 고객과 화면을 같이 보며 조건을 맞춰 볼 수 있어요',
      '서버로 아무것도 보내지 않아서 고객사 회의실에서도 바로 열 수 있어요'
    ].join('\n'),
    MakerNote: '고객이 "이건 Copilot Studio로 만들어야 해요?"라고 물을 때마다 같은 설명을 화이트보드에 반복해서 그렸어요. 그래서 판단 기준을 질문 7개로 정리했어요.\n'
      + 'G회계법인 계약 검토 건에서는 "문서 2개 비교라 Copilot 채팅 + Skill이면 충분하다"는 결론이 나와 Agent 구축 비용을 아꼈고, C생명 상품 Q&A는 사용자 수와 Teams 배포 때문에 Copilot Studio로 정했어요.\n'
      + '착수 미팅에서 고객과 화면을 같이 보며 답을 고르면, 도구 결정이 10분 안에 끝나고 "왜 이 도구인지"를 고객이 직접 설명할 수 있게 돼요.',
    Output: '추천 도구 · 판단 이유 · 다음 단계 · 비교표',
    releases: [
      ['1.0', '처음 공유', 38],
      ['1.1', '세 도구 비교표 추가', 24],
      ['1.2', '질문별 판단 이유 표시', 13],
      ['1.3', '추천 도구로 시작할 때 다음 할 일 3단계 추가', 5]
    ]
  };

  (async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const get = async url => { const r = await fetch(url, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${url.replace(web, '')}`); } return (await r.json()).d; };
    const merge = async (url, body) => {
      const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' }, body: JSON.stringify(body) });
      if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
    };
    const putFile = async (serverRelUrl, text) => {
      const r = await fetch(fileValue(web, serverRelUrl), {
        method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'PUT', 'Content-Type': 'text/plain; charset=utf-8' }, body: new Blob([text], { type: 'text/plain;charset=utf-8' }) });
      if (!r.ok) { throw new Error(`파일 ${r.status} ${(await r.text()).slice(0, 200)}`); }
    };
    const log = [];
    const backup = {};
    const step = async (what, fn) => { try { log.push({ 단계: what, 결과: '✅ ' + (await fn()) }); } catch (e) { log.push({ 단계: what, 결과: '❌ ' + e.message.split('\n')[0] }); console.warn(what, e.message); } };

    /* ---------- Agent ---------- */
    await step(`Agent · ${AGENT_NAME}`, async () => {
      const lists = (await get(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`)).results;
      const norm = s => String(s || '').toLowerCase().replace(/[\s_-]/g, '');
      const hit = lists.filter(l => norm(l.Title) === 'agentlist' || /\/lists\/agentlist$/i.test(l.RootFolder.ServerRelativeUrl))[0];
      if (!hit) { throw new Error('AgentList 목록을 찾지 못했어요'); }
      const base = `${web}/_api/web/lists(guid'${hit.Id}')`;
      const type = (await get(`${base}?$select=ListItemEntityTypeFullName`)).ListItemEntityTypeFullName;
      const cols = 'Id,Title,AgentName,OpsStatus,Summary,Does,Prompts,MakerNote,Instructions,Config,OutputNote,TaskArea,Output,Scope,Version,Releases';
      const rows = (await get(`${base}/items?$select=${cols}&$top=5000`)).results;
      const same = r => norm(r.AgentName || r.Title) === norm(AGENT_NAME);
      const onHub = r => !!String(r.OpsStatus || '').trim() && !/중단|폐기/.test(r.OpsStatus) && !/_PENDING$/i.test(r.Title || '');
      const row = rows.filter(r => same(r) && onHub(r))[0] || rows.filter(same)[0];
      if (!row) { throw new Error(`'${AGENT_NAME}' Agent를 찾지 못했어요`); }
      backup.agent = { base, type, id: row.Id, fields: {} };
      ['Summary', 'Does', 'Prompts', 'MakerNote', 'Instructions', 'Config', 'OutputNote', 'Version', 'Releases'].forEach(k => { backup.agent.fields[k] = row[k] == null ? null : row[k]; });
      const rel = addReleases(row.Releases, AGENT.releases);
      // 구성 정보(Config)는 다른 값(배포 흐름이 쓰는 값)을 지우지 않도록 knowledge · tools 만 바꿉니다
      let cfg = {};
      try { cfg = row.Config ? JSON.parse(row.Config) : {}; } catch (e) { cfg = {}; }
      const fields = { __metadata: { type }, Summary: AGENT.Summary, Does: AGENT.Does.join('\n'), Prompts: AGENT.Prompts.join('\n'), MakerNote: AGENT.MakerNote,
        Instructions: AGENT.Instructions, Config: JSON.stringify({ ...cfg, knowledge: AGENT.Config.knowledge, tools: AGENT.Config.tools }), OutputNote: AGENT.OutputNote,
        Releases: JSON.stringify(rel), Version: rel[rel.length - 1].v };
      // 선택 열은 목록에 있는 값만
      const skipped = [];
      for (const k of ['TaskArea', 'Output', 'Scope']) {
        const f = await get(`${base}/fields/getbyinternalnameortitle('${k}')?$select=Choices,TypeAsString`).catch(() => null);
        const ok = f ? AGENT[k].filter(x => ((f.Choices && f.Choices.results) || []).indexOf(x) >= 0) : [];
        if (!ok.length) { skipped.push(k); continue; }
        backup.agent.fields[k] = row[k] && row[k].results ? { __metadata: { type: 'Collection(Edm.String)' }, results: row[k].results } : (row[k] == null ? null : row[k]);
        fields[k] = f.TypeAsString === 'MultiChoice' ? { __metadata: { type: 'Collection(Edm.String)' }, results: ok } : ok[0];
      }
      await merge(`${base}/items(${row.Id})`, fields);
      let note = `ID ${row.Id} 고침 · 업데이트 기록 ${rel.length}개 (지금 v${rel[rel.length - 1].v})` + (skipped.length ? ` (선택지에 없어 그대로 둔 열: ${skipped.join(', ')})` : '');

      // 연결된 Agent(LinkedAgents) · Skill(Skills): 조회 열이 가리키는 목록에서 이름으로 번호를 찾아 넣습니다
      for (const [col, names, label] of [['LinkedAgents', AGENT.LinkedAgents, '연결된 Agent'], ['Skills', AGENT.Skills, 'Skill']]) {
        try {
          const f = (await get(`${base}/fields?$filter=InternalName eq '${col}'`)).results[0];
          if (!f) { throw new Error('AgentList에 이 열이 없어요'); }
          const target = `${web}/_api/web/lists(guid'${String(f.LookupList).replace(/[{}]/g, '')}')`;
          const show = f.LookupField || 'Title';
          const items = (await get(`${target}/items?$select=Id,${show}&$top=5000`)).results;
          const ids = names.map(n => (items.filter(x => norm(x[show]) === norm(n))[0] || {}).Id).filter(Boolean);
          const cur = await get(`${base}/items(${row.Id})?$select=${col}Id`).catch(() => ({}));
          const old = cur[col + 'Id'];
          backup.agent.fields[col + 'Id'] = f.AllowMultipleValues ? { results: (old && old.results) || [] } : (old || null);
          if (!ids.length) { note += ` · ${label}: 이름을 찾지 못해 건너뜀`; continue; }
          const v = {}; v[col + 'Id'] = f.AllowMultipleValues ? { __metadata: { type: 'Collection(Edm.Int32)' }, results: ids } : ids[0];
          await merge(`${base}/items(${row.Id})`, { __metadata: { type }, ...v });
          note += ` · ${label} ${f.AllowMultipleValues ? ids.length : 1}개 연결`;
        } catch (e) { note += ` · ${label} 연결 못 함 (${e.message.slice(0, 60)})`; }
      }
      return note;
    });

    /* ---------- Skill · HTML (HubContents) ---------- */
    const C = `${web}/_api/web/lists/getbytitle('HubContents')`;
    const ctype = (await get(`${C}?$select=ListItemEntityTypeFullName`).catch(() => ({}))).ListItemEntityTypeFullName;
    const findContent = async (kind, title) => {
      const rows = (await get(`${C}/items?$select=Id,Title,Kind,Summary,Does,Usage,MakerNote,Output,Releases,AttachmentFiles/FileName,AttachmentFiles/ServerRelativeUrl&$expand=AttachmentFiles&$filter=Kind eq '${kind}'&$top=5000`)).results;
      const r = rows.filter(x => (x.Title || '').trim() === title)[0];
      if (!r) { throw new Error(`'${title}' ${kind}을 찾지 못했어요`); }
      return r;
    };

    await step(`Skill · ${SKILL_TITLE}`, async () => {
      const r = await findContent('Skill', SKILL_TITLE);
      const file = ((r.AttachmentFiles && r.AttachmentFiles.results) || [])[0];
      let oldBody = null;
      if (file) { const fr = await fetch(fileValue(web, file.ServerRelativeUrl)); oldBody = fr.ok ? await fr.text() : null; }
      backup.skill = { id: r.Id, fields: { Summary: r.Summary, Does: r.Does, Usage: r.Usage, Releases: r.Releases }, file: file ? file.ServerRelativeUrl : null, body: oldBody };
      // 업데이트 기록: 이미 있는 버전은 그대로, 없는 버전만 더함
      const rel = addReleases(r.Releases, SKILL.releases);
      await merge(`${C}/items(${r.Id})`, { __metadata: { type: ctype }, Summary: SKILL.Summary, Does: SKILL.Does, Usage: SKILL.Usage, Releases: JSON.stringify(rel) });
      const ver = ` · 업데이트 기록 ${rel.length}개 (지금 v${rel[rel.length - 1].v})`;
      if (!file) { return `ID ${r.Id} 고침${ver} (첨부 파일이 없어 본문은 못 바꿈)`; }
      if (/\.docx$/i.test(file.FileName)) { return `ID ${r.Id} 고침${ver} (본문이 .docx 라 그대로 둠)`; }
      await putFile(file.ServerRelativeUrl, SKILL.body);
      return `ID ${r.Id} 고침 · 본문 파일 바꿈${ver}`;
    });

    await step(`HTML · ${HTML_TITLE}`, async () => {
      const r = await findContent('HTML', HTML_TITLE);
      backup.html = { id: r.Id, fields: { Summary: r.Summary, Does: r.Does, MakerNote: r.MakerNote, Output: r.Output, Releases: r.Releases } };
      const rel = addReleases(r.Releases, HTML.releases);
      await merge(`${C}/items(${r.Id})`, { __metadata: { type: ctype }, Summary: HTML.Summary, Does: HTML.Does, MakerNote: HTML.MakerNote, Output: HTML.Output, Releases: JSON.stringify(rel) });
      return `ID ${r.Id} 고침 · 업데이트 기록 ${rel.length}개 (지금 v${rel[rel.length - 1].v})`;
    });

    try { localStorage.setItem('hubDetailBackup', JSON.stringify({ at: new Date().toISOString(), ctype, ...backup })); } catch (e) { console.warn('되돌리기용 값을 저장하지 못했어요', e); }
    console.table(log);
    console.log(log.every(x => x.결과.startsWith('✅')) ? '✅ 다 고쳤어요. Hub를 새로 고쳐 상세 화면을 확인해 보세요.' : '⚠️ 일부가 실패했어요. 위 표의 ❌ 줄을 보내 주세요.');
    console.log('되돌릴 때는 hubDetailRestore() 를 입력하세요.');
  })().catch(e => console.error('중간에 멈췄어요:', e.message));

  /* ---------- 되돌리기 ---------- */
  window.hubDetailRestore = async () => {
    const b = JSON.parse(localStorage.getItem('hubDetailBackup') || 'null');
    if (!b) { console.log('되돌릴 값이 없어요.'); return; }
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const merge = (url, body) => fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' }, body: JSON.stringify(body) });
    const C = `${web}/_api/web/lists/getbytitle('HubContents')`;
    if (b.agent) { const r = await merge(`${b.agent.base}/items(${b.agent.id})`, { __metadata: { type: b.agent.type }, ...b.agent.fields }); console.log('Agent', r.ok ? '되돌림' : '실패 ' + r.status); }
    if (b.skill) {
      const r = await merge(`${C}/items(${b.skill.id})`, { __metadata: { type: b.ctype }, ...b.skill.fields }); console.log('Skill 정보', r.ok ? '되돌림' : '실패 ' + r.status);
      if (b.skill.file && b.skill.body != null) {
        const f = await fetch(fileValue(web, b.skill.file), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'PUT' }, body: new Blob([b.skill.body], { type: 'text/plain;charset=utf-8' }) });
        console.log('Skill 본문', f.ok ? '되돌림' : '실패 ' + f.status);
      }
    }
    if (b.html) { const r = await merge(`${C}/items(${b.html.id})`, { __metadata: { type: b.ctype }, ...b.html.fields }); console.log('HTML', r.ok ? '되돌림' : '실패 ' + r.status); }
  };
})();
