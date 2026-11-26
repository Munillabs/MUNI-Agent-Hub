/*
 * HubIdeas 기존 아이디어의 카테고리를 새 카테고리 6개로 바꾸기 (브라우저 콘솔용)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *      → 처음에는 '미리 보기'만 합니다 (RUN = false). 아이디어마다 지금 값 → 바뀔 카테고리와 그 이유가 표로 나옵니다.
 *   3. 표를 보고 틀린 것은 아래 FIX 에 { 번호: '카테고리' } 로 적습니다. (번호 = 표의 id)
 *   4. RUN = true 로 바꿔 다시 붙여 넣으면 실제로 바꿉니다.
 *
 * 하는 일 (RUN = true 일 때)
 *   - Category(카테고리) 열이 없으면 만들고, 있으면 선택 값을 카테고리 6개로 맞춥니다.
 *   - 아이디어마다 카테고리를 넣습니다. 정하는 순서:
 *       ① FIX 에 적은 값  ② FIX_BY_TITLE (제목 추천)  ③ 이미 새 카테고리면 그대로  ④ 제목 · 자세한 내용의 낱말로 추정
 *   - 추정할 낱말이 없으면 '⚠ 확인 필요'로 두고 바꾸지 않습니다 (FIX 에 적거나 목록에서 직접 골라 주세요).
 *   - 예전 유형(Type: Agent · Skill · HTML · 기타) 열과 다른 열은 건드리지 않습니다. 여러 번 실행해도 안전합니다.
 */
(async () => {
  const RUN = false;
  const FIX = {
    // 12: '제안과 전략 세우기',
  };
  /* 제목에 이 글자가 들어 있으면 이 카테고리 (FIX 다음으로 먼저 적용). 지금 HubIdeas 에 있는 아이디어 기준 추천 */
  const FIX_BY_TITLE = [
    ['Expense Report', '프로젝트·사내 업무 하기'],
    ['월간 보고 메일', '산출물 만들고 다듬기'],
    ['RFP 요구사항', '제안과 전략 세우기'],
    ['워크숍 투표', '고객 업무 이해하고 설계하기'],
    ['프롬프트 첨삭', '교육·확산 프로그램 운영하기'],
    ['단골 질문', '교육·확산 프로그램 운영하기'],
    ['회의록이랑 할 일', '프로젝트·사내 업무 하기'],
    ['라이선스', '데이터로 인사이트 찾기'],
    ['설문 결과', '데이터로 인사이트 찾기'],
    ['미팅 전에 메일함', '고객 업무 이해하고 설계하기'],
    ['오버셰어링', '데이터로 인사이트 찾기'],
    ['회의실 예약', '프로젝트·사내 업무 하기'],
    ['사내 규정', '프로젝트·사내 업무 하기'],
    ['정기 점검', '프로젝트·사내 업무 하기']
  ];

  const CATS = ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'];
  /* 카테고리를 추정하는 낱말 (대소문자 구분 없음). 낱말이 가장 많이 맞는 카테고리, 같으면 PRIORITY 순 */
  const WORDS = {
    '제안과 전략 세우기': ['제안', 'rfp', '견적', '전략', '로드맵', '입찰', '수주', '영업', '고객사 발굴', '사업 계획'],
    '데이터로 인사이트 찾기': ['데이터', '분석', 'kpi', '지표', '조사', '리서치', '통계', '대시보드', '성과', '트렌드', '시장', '인사이트'],
    '고객 업무 이해하고 설계하기': ['인터뷰', 'fgi', '워크숍', 'to-be', 'as-is', '업무 흐름', '프로세스', '설계', '진단', '현황', '요구사항 정의', '활용 방안', '녹취'],
    '산출물 만들고 다듬기': ['보고서', '문서', '콘텐츠', '홍보', '자동화', '구축', '검토', '장표', 'ppt', '초안', '번역', '교정', '요약'],
    '교육·확산 프로그램 운영하기': ['교육', '챌린지', '캠페인', '문의', '확산', '가이드', '프롬프트', '챔피언', '온보딩', '사용법', '헬프', 'faq', '막히면'],
    '프로젝트·사내 업무 하기': ['일정', '회의', '회의록', '주간 보고', '계약', '정산', '메일', '경비', '출장', '영수증', '규정', '결재', 'expense', '휴가', '알림', '사내', '마감']
  };
  const PRIORITY = ['프로젝트·사내 업무 하기', '제안과 전략 세우기', '고객 업무 이해하고 설계하기', '교육·확산 프로그램 운영하기', '데이터로 인사이트 찾기', '산출물 만들고 다듬기'];

  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
  const webPath = new URL(web).pathname.replace(/\/$/, '');
  const H = { Accept: 'application/json;odata=nometadata' };
  const digest = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: H })).json()).FormDigestValue;
  const req = async (method, url, body, extra) => {
    const r = await fetch(url, {
      method, headers: Object.assign({}, H, { 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest }, extra || {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 404) { return null; }
    if (!r.ok) { throw new Error(r.status + ' ' + (await r.text()).slice(0, 200)); }
    return r.status === 204 ? {} : r.json().catch(() => ({}));
  };
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  // 목록 찾기
  let base = `${web}/_api/web/lists/getbytitle('HubIdeas')`;
  let L = await req('GET', `${base}?$select=Id,Title,ListItemEntityTypeFullName`);
  if (!L) { base = `${web}/_api/web/GetList('${webPath}/Lists/HubIdeas')`; L = await req('GET', `${base}?$select=Id,Title,ListItemEntityTypeFullName`); }
  if (!L) { console.error('HubIdeas 목록을 찾지 못했어요.'); return; }

  // Category 열 확인
  const fields = (await req('GET', `${base}/fields?$select=Id,InternalName,Title,TypeAsString,Choices&$top=1000`)).value;
  const cat = fields.filter(f => f.InternalName === 'Category')[0];
  const sameTitle = fields.filter(f => f.Title === '카테고리' && f.InternalName !== 'Category')[0];
  const display = sameTitle ? '아이디어 카테고리' : '카테고리';
  console.log(cat ? `Category 열: 있음 (${cat.TypeAsString})` : `Category 열: 없음 → ${RUN ? '만듭니다' : 'RUN = true 이면 만듭니다'} (표시 이름 '${display}')`);
  if (sameTitle) { console.log(`참고: 표시 이름이 '카테고리'인 다른 열(${sameTitle.InternalName})이 있어요. Hub는 그 열이 아니라 Category 열을 읽어요.`); }

  // 아이디어 읽기
  const sel = ['Id', 'Title', 'Type', 'Detail'].concat(cat ? ['Category'] : []).join(',');
  const items = [];
  let url = `${base}/items?$select=${sel}&$top=500`;
  while (url) { const d = await req('GET', url); items.push(...(d.value || [])); url = d['odata.nextLink'] || d['@odata.nextLink'] || null; }

  const guess = text => {
    const t = String(text || '').toLowerCase();
    let best = '', score = 0, hits = [];
    PRIORITY.forEach(c => {
      const h = WORDS[c].filter(w => t.indexOf(w) >= 0);
      if (h.length > score) { best = c; score = h.length; hits = h; }
    });
    return { cat: best, hits };
  };
  const rows = items.map(it => {
    const now = String(it.Category || '');
    let next = '', why = '';
    const byTitle = FIX_BY_TITLE.filter(p => String(it.Title || '').toLowerCase().indexOf(p[0].toLowerCase()) >= 0)[0];
    if (FIX[it.Id]) { next = FIX[it.Id]; why = 'FIX 에 적은 값'; }
    else if (byTitle) { next = byTitle[1]; why = `제목 추천: ${byTitle[0]}`; }
    else if (CATS.indexOf(now) >= 0) { next = now; why = '이미 새 카테고리'; }
    else { const g = guess(`${it.Title} ${it.Detail || ''}`); next = g.cat; why = g.cat ? `낱말: ${g.hits.join(', ')}` : '맞는 낱말 없음'; }
    if (next && CATS.indexOf(next) < 0) { why = `⚠ '${next}'는 6개 중에 없어요`; next = ''; }
    return { id: it.Id, 제목: it.Title, 예전유형: it.Type || '', 지금: now, 바뀔값: next || '(그대로)', 이유: why, 상태: !next ? '⚠ 확인 필요' : next === now ? '그대로' : '바뀜', _next: next, _now: now };
  });
  console.table(rows.map(({ _next, _now, ...r }) => r));
  const todo = rows.filter(r => r._next && r._next !== r._now);
  console.log(`전체 ${rows.length}개 · 바뀜 ${todo.length}개 · 확인 필요 ${rows.filter(r => !r._next).length}개`);
  if (!RUN) { console.log('미리 보기만 했어요. 틀린 것은 FIX 에 적고, RUN = true 로 바꿔 다시 실행하세요.'); return; }

  // 열 만들기 · 선택 값 맞추기
  if (!cat) {
    const xml = `<Field Type="Choice" Name="Category" StaticName="Category" DisplayName="${x(display)}" Required="FALSE" Format="Dropdown" FillInChoice="FALSE"><CHOICES>${CATS.map(c => `<CHOICE>${x(c)}</CHOICE>`).join('')}</CHOICES></Field>`;
    await req('POST', `${base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: xml, Options: 8 } });
    console.log('Category 열을 만들었어요.');
  } else if (/Choice/.test(cat.TypeAsString)) {
    await req('POST', `${web}/_api/web/lists(guid'${L.Id}')/fields(guid'${cat.Id}')`,
      { __metadata: { type: cat.TypeAsString === 'MultiChoice' ? 'SP.FieldMultiChoice' : 'SP.FieldChoice' }, Choices: { __metadata: { type: 'Collection(Edm.String)' }, results: CATS } },
      { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    console.log('Category 열의 선택 값을 6개로 맞췄어요.');
  }
  const multi = cat && cat.TypeAsString === 'MultiChoice';

  // 항목 바꾸기
  let done = 0, fail = 0;
  for (const r of todo) {
    const value = multi ? { __metadata: { type: 'Collection(Edm.String)' }, results: [r._next] } : r._next;
    try {
      await req('POST', `${base}/items(${r.id})`, { __metadata: { type: L.ListItemEntityTypeFullName }, Category: value }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
      done++;
    } catch (e) { fail++; console.warn(`#${r.id} ${r.제목}: ${e.message}`); }
  }
  console.log(`끝났어요. ${done}개 바꿈${fail ? ` · 실패 ${fail}개` : ''}. Hub를 새로 고침해 주세요.`);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
