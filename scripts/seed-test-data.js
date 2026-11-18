/*
 * MUNI AI Hub 테스트 데이터 넣기 · 지우기 (브라우저 콘솔용)
 *
 * 넣는 것 (모두 제목이 '[테스트]'로 시작합니다)
 *   - HubContents : Skill 3개, HTML 2개 (첨부 파일 포함), 내 별점 · 리뷰
 *   - HubIdeas    : 아이디어 6개 (모집 중 · 제작 중 · 완성 · 보관 단계), 내 공감 · 만들래요 · 댓글
 *   - HubCases    : 사례 3개 (문의 담당자 = 나)
 *   AgentList 는 배포 흐름과 같이 쓰는 목록이라 건드리지 않습니다.
 *
 * 쓰는 법
 *   1. Hub 사이트를 열고 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter → 테스트 데이터를 넣습니다.
 *   2. 다 보고 나면 Console 에 아래 한 줄을 입력하면 '[테스트]' 항목만 휴지통으로 보냅니다.
 *        hubTestCleanup()
 */
(async () => {
  const web = _spPageContextInfo.webAbsoluteUrl;
  const me = _spPageContextInfo.userId;
  const PREFIX = '[테스트] ';
  const J = { Accept: 'application/json;odata=verbose' };
  const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
  let D = await digest();
  const L = t => `${web}/_api/web/lists/getbytitle('${encodeURIComponent(t)}')`;
  const types = {};
  const typeOf = async t => types[t] || (types[t] = (await (await fetch(`${L(t)}?$select=ListItemEntityTypeFullName,Id`, { headers: J })).json()).d);
  const post = async (url, body, extra) => {
    const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, ...(extra || {}) }, body: body === undefined ? undefined : JSON.stringify(body) });
    if (!r.ok) { throw new Error(`${r.status} ${url.replace(web, '')}\n${(await r.text()).slice(0, 300)}`); }
    const t = await r.text();
    return t ? JSON.parse(t).d : undefined;
  };
  const multi = a => ({ results: a });
  const add = async (list, fields) => {
    const t = await typeOf(list);
    return post(`${L(list)}/items`, { __metadata: { type: t.ListItemEntityTypeFullName }, ...fields, Title: PREFIX + fields.Title });
  };
  const merge = async (list, id, fields) => {
    const t = await typeOf(list);
    await post(`${L(list)}/items(${id})`, { __metadata: { type: t.ListItemEntityTypeFullName }, ...fields }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  };
  const attach = async (list, id, name, text) => {
    const r = await fetch(`${L(list)}/items(${id})/AttachmentFiles/add(FileName='${encodeURIComponent(name)}')`, { method: 'POST', headers: { ...J, 'X-RequestDigest': D }, body: text });
    if (!r.ok) { throw new Error(`첨부 실패 ${r.status}: ${(await r.text()).slice(0, 200)}`); }
  };
  const comment = (list, id, text) => post(`${L(list)}/items(${id})/Comments`, { text }, { 'Content-Type': 'application/json;odata=nometadata', Accept: 'application/json;odata=nometadata' });
  const rep = async (list, op, id, v) => {
    const lid = (await typeOf(list)).Id;
    const arg = op === 'SetRating' ? 'rating' : 'like';
    return post(`${web}/_api/Microsoft.Office.Server.ReputationModel.Reputation.${op}(listID=@a1,itemID=@a2,${arg}=@a3)?@a1='{${lid}}'&@a2='${id}'&@a3=${v}`);
  };
  const day = n => new Date(Date.now() - n * 86400000).toISOString();
  const rel = list => JSON.stringify(list.map(([v, n, d]) => ({ v, d: day(d).slice(0, 10), n })));
  const stamp = () => String(Date.now());
  const log = [];
  const step = async (what, fn) => { try { const r = await fn(); log.push({ 단계: what, 결과: '✅' }); return r; } catch (e) { log.push({ 단계: what, 결과: '❌ ' + e.message.split('\n')[0] }); console.warn(what, e.message); return undefined; } };

  /* ---------- HubContents: Skill ---------- */
  const skills = [
    { Title: '보고서 말투 맞추기', Summary: '보고서 문장을 회사 표준 말투로', Category: '규칙', WorkArea: ['문서 작성'], Tools: ['Copilot', 'Cowork'], Scope: ['사내 업무용'],
      Does: '보고서 초안 말투가 제각각일 때', Usage: '파일을 받아 Agent 지침 맨 아래에 붙여요.', Releases: rel([['1.0', '처음 공유', 20], ['1.1', '높임말 규칙 추가', 3]]),
      file: ['tone.md', '---\nname: 보고서 말투 맞추기\ndescription: 보고서 문장을 회사 표준 말투로\n---\n\n- 문장은 "~합니다"로 끝냅니다.\n- 한 문장은 50자 이내로 씁니다.\n'], stars: 5, review: '팀 보고서가 한 사람이 쓴 것처럼 맞춰졌어요' },
    { Title: '회의록 양식', Summary: '결정 · 할 일 · 미결로 나눈 회의록 틀', Category: '양식', WorkArea: ['회의 정리'], Tools: ['Copilot', 'Agent Builder'], Scope: ['사내 업무용', '고객 프로젝트용'],
      Does: '회의록 형식을 팀 전체가 똑같이 맞추고 싶을 때', Usage: 'Copilot 대화에 첨부하고 "이 양식으로 정리해줘"라고 말해요.', Releases: rel([['1.0', '처음 공유', 10]]),
      file: ['meeting.md', '# 회의록\n## 결정 사항\n## 할 일 (담당자 | 할 일 | 기한)\n## 미결 쟁점\n'], stars: 4, review: '할 일 표가 깔끔해요' },
    { Title: '출처 표시 규칙', Summary: '답변 끝에 근거 문서와 위치 표시', Category: '체크리스트', WorkArea: ['규정 확인'], Tools: ['Copilot Studio'], Scope: ['고객 프로젝트용'],
      Does: '규정 답변에 근거를 꼭 보여줘야 할 때', Usage: 'Copilot Studio 지침에 붙여요.', Releases: rel([['1.0', '처음 공유', 2]]),
      file: ['source.txt', '답변 끝에 [출처: 문서명 > 조항]을 붙이세요. 근거가 없으면 "근거 없음"이라고 쓰세요.\n'] }
  ];
  for (const s of skills) {
    await step(`Skill · ${s.Title}`, async () => {
      const { file, stars, review, ...f } = s;
      const it = await add('HubContents', { ...f, Kind: 'Skill', WorkArea: multi(f.WorkArea), Tools: multi(f.Tools), Scope: multi(f.Scope), Hidden: false });
      await attach('HubContents', it.Id, `${stamp()}_${file[0]}`, file[1]);
      if (stars) { await comment('HubContents', it.Id, `[★${stars}] ${review}`); await rep('HubContents', 'SetRating', it.Id, stars).catch(() => undefined); }
    });
  }
  /* ---------- HubContents: HTML ---------- */
  const page = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:sans-serif;padding:24px}button{padding:8px 14px}</style></head><body><h1>${title}</h1>${body}</body></html>`;
  const htmls = [
    { Title: '출장비 계산기', Summary: '일수 · 지역만 넣으면 출장비 합계', Category: '계산기', WorkArea: ['데이터 정리'], Tools: ['Claude'], Scope: ['사내 업무용'],
      Does: '출장 일수와 지역으로 일비 · 숙박비를 계산해요.\n합계를 복사할 수 있어요.', MakerNote: '매달 출장 정산 때 엑셀을 열기 귀찮아서 만들었어요.', Output: '출장비 합계', Releases: rel([['0.1', '처음 공유', 6]]),
      file: ['trip.html', page('출장비 계산기', '<label>일수 <input id="d" type="number" value="2"></label> <button onclick="r.textContent=(d.value*80000).toLocaleString()+\'원\'">계산</button><p id="r"></p>')], stars: 4, review: '정산할 때 바로 써요' },
    { Title: '도구 고르기 도우미', Summary: '질문 3개로 Agent Builder · Copilot Studio 추천', Category: '판단 도우미', WorkArea: ['개발 지원'], Tools: ['ChatGPT', 'Copilot'], Scope: ['사내 업무용', '고객 프로젝트용'],
      Does: '질문에 답하면 맞는 도구를 추천해요.', MakerNote: '', Output: '추천 도구', Releases: rel([['0.1', '처음 공유', 12], ['0.2', '질문 1개 추가', 1]]),
      file: ['pick.html', page('도구 고르기 도우미', '<p>외부 시스템에 데이터를 쓰나요?</p><button onclick="r.textContent=\'Copilot Studio\'">예</button> <button onclick="r.textContent=\'Agent Builder\'">아니요</button><p id="r"></p>')] }
  ];
  for (const h of htmls) {
    await step(`HTML · ${h.Title}`, async () => {
      const { file, stars, review, ...f } = h;
      const it = await add('HubContents', { ...f, Kind: 'HTML', WorkArea: multi(f.WorkArea), Tools: multi(f.Tools), Scope: multi(f.Scope), Hidden: false });
      await attach('HubContents', it.Id, `${stamp()}_${file[0]}`, file[1]);
      if (stars) { await comment('HubContents', it.Id, `[★${stars}] ${review}`); await rep('HubContents', 'SetRating', it.Id, stars).catch(() => undefined); }
    });
  }
  await step('숨김 Skill (Hub에 안 보여야 함)', () => add('HubContents', { Title: '숨긴 Skill — 보이면 안 됨', Kind: 'Skill', Summary: '숨김 확인용', Category: '규칙', Hidden: true }));

  /* ---------- HubIdeas ---------- */
  const ideas = [
    { Title: '영수증을 출장 규정이랑 대조해 주는 Agent', Type: 'Agent', Status: '모집 중', Detail: '규정 금액을 넘는 항목만 표시해 주면 좋겠어요.',
      Pain: '영수증 사진을 하나씩 열어 규정과 비교해요.', Frequency: '매월', MinutesPerRun: 30, like: true, note: '저도 매달 같은 일을 해요!' },
    { Title: '신입 FAQ 답해 주는 봇', Type: 'Agent', Status: '모집 중', Detail: '', Pain: '같은 질문에 매번 답해요.', Frequency: '매주', MinutesPerRun: 20, like: true, make: true },
    { Title: '회의실 빈 시간 한 번에 찾기', Type: 'HTML', Status: '제작 중', StartedOn: day(3), make: true, Frequency: '매일', MinutesPerRun: 5 },
    { Title: '주간 보고 양식 자동 채우기', Type: 'Skill', Status: '완성', DoneAt: day(1), ResultRef: PREFIX + '보고서 말투 맞추기', make: true },
    { Title: '사내 메신저 이모지 추천', Type: '기타', Status: '보관', ArchivedOn: day(5) },
    { Title: '계약서 위험 조항 표시', Type: 'Skill', Status: '모집 중', Detail: '불리한 조항에 형광펜처럼 표시', Frequency: '가끔', MinutesPerRun: 60 }
  ];
  for (const i of ideas) {
    await step(`아이디어 · ${i.Title}`, async () => {
      const { like, make, note, ...f } = i;
      const it = await add('HubIdeas', { ...f, ...(make ? { MakersId: multi([me]) } : {}) });
      if (like) { await rep('HubIdeas', 'SetLike', it.Id, true); }
      if (note) { await comment('HubIdeas', it.Id, note); }
    });
  }

  /* ---------- HubCases ---------- */
  const cases = [
    { Title: '품질 보고서 작성 자동화', Industry: '제조', Client: 'A사', Dept: '품질팀', Period: '2026 2분기', Project: 'Copilot Studio Agent PoC', Area: '품질 관리 · 보고', Pattern: '초안 작성',
      Products: ['Copilot Studio', 'Word', 'Excel'], KeyResult: '62% 감소', KeyDetail: '보고서 작성 시간',
      Compare: '시간|주 4시간|1.5시간\n품질 수준|보통|매우 높음\n정신적 노력 수준|매우 높음|낮음',
      ChangeBefore: '담당자가 엑셀에서 검사 데이터를 모아 보고서 양식에 옮겨 적었어요.', ChangeAfter: 'Agent가 데이터를 모아 초안을 만들고 담당자는 확인만 해요. 숫자 오류도 줄었어요.',
      Process: '[Before]\n데이터 수집\n엑셀 취합\n양식 입력\n초안 작성\n팀장 검토\n[After]\nAgent가 데이터 취합 · 초안 작성 [AI]\n담당자 확인\n보고 완료',
      Measure: '도입 전후 4주 작성 시간 비교\n보고서 20건 샘플 검수', Solutions: `agent|품질 보고서 초안 Agent\nskill|${PREFIX}보고서 말투 맞추기`,
      ApplyPoints: '검사 데이터 취합\n보고서 초안 작성',
      CasePrompts: JSON.stringify([{ name: '데이터 취합 · 초안 작성', step: 0, text: '지난주 품질 검사 결과 파일을 읽고 주간 품질 보고서 초안을 써줘.' }]) },
    { Title: '콜센터 상담 요약', Industry: '금융·보험', Client: 'B사', Dept: '고객센터', Period: '2026 1분기', Project: '상담 후처리 자동화', Area: '고객 상담', Pattern: '요약 및 분류',
      Products: ['Copilot', 'Teams'], KeyResult: '75% 감소', KeyDetail: '상담 후처리 시간',
      Compare: '시간|건당 4분|1분\n품질 수준|보통|높음\n정신적 노력 수준|높음|낮음',
      ChangeBefore: '상담사가 메모를 다시 읽고 요약과 처리 코드를 직접 입력했어요.', ChangeAfter: 'AI가 요약과 코드를 추천하고 상담사는 확인 후 저장해요.',
      Process: '[Before]\n상담 종료\n메모 다시 읽기\n요약 작성\n코드 입력\n[After]\nAI가 요약 · 코드 추천 [AI]\n상담사 확인',
      Measure: '상담 300건 처리 시간 비교', Solutions: 'agent|상담 요약 Agent',
      CasePrompts: JSON.stringify([{ name: '상담 요약', step: 0, text: '이 상담 기록을 3줄로 요약하고 처리 코드 하나를 추천해줘.' }]) },
    { Title: '매장 매출 대시보드', Industry: '유통·커머스', Client: 'C사', Dept: '영업기획팀', Period: '2025 4분기', Project: '매출 리포트 자동화', Area: '매출 관리', Pattern: '데이터 시각화',
      Products: ['Copilot Cowork', 'Excel'], KeyResult: '83% 감소', KeyDetail: '매출 취합 시간',
      Compare: '시간|하루 1시간|10분',
      ChangeBefore: '매장 파일을 받아 합치고 차트를 다시 그렸어요.', ChangeAfter: '파일을 올리면 대시보드가 바로 갱신돼요.',
      Process: '[Before]\n파일 수신\n파일 합치기\n차트 작성\n공유\n[After]\n파일 업로드\n대시보드 자동 갱신 [AI]\n함께 확인',
      Measure: '2주간 취합 시간 기록', Solutions: `html|${PREFIX}출장비 계산기` }
  ];
  for (const c of cases) {
    await step(`사례 · ${c.Title}`, () => add('HubCases', { ...c, Products: multi(c.Products), ContactId: me }));
  }

  console.table(log);
  console.log(log.every(x => x.결과 === '✅') ? '✅ 테스트 데이터를 다 넣었어요. Hub를 새로 고쳐 보세요.' : '⚠️ 일부가 실패했어요. 위 표의 ❌ 줄을 보내 주세요.');
  console.log("다 보고 나면 hubTestCleanup() 을 입력하면 '[테스트]' 항목을 휴지통으로 보내요.");

  window.hubTestCleanup = async () => {
    D = await digest();
    for (const t of ['HubContents', 'HubIdeas', 'HubCases']) {
      const rows = (await (await fetch(`${L(t)}/items?$select=Id,Title&$top=5000&$filter=startswith(Title,'${encodeURIComponent('[테스트]')}')`, { headers: J })).json()).d.results;
      for (const r of rows) { await post(`${L(t)}/items(${r.Id})/recycle()`); }
      console.log(`${t}: ${rows.length}개 휴지통으로`);
    }
  };
})();
