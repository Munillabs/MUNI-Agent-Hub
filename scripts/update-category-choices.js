/*
 * '업무 분야' → '카테고리' 6개로 바꾸기 (브라우저 콘솔용)
 *
 * 대상 열
 *   - AgentList   의 TaskArea (Agent 카테고리)
 *   - HubContents 의 WorkArea (Skill · HTML 카테고리)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *      → 처음에는 '미리 보기'만 합니다 (RUN = false). 항목마다 지금 값 → 바뀔 값이 표로 나옵니다.
 *   3. 표를 보고 아래 MAP 을 고친 뒤, RUN = true 로 바꿔 다시 실행하면 실제로 바꿉니다.
 *
 * 하는 일 (RUN = true 일 때)
 *   - 두 열의 선택 값을 카테고리 6개로 바꿉니다. 열 표시 이름은 '카테고리'로 바꿉니다
 *     (HubContents 에는 내부 이름이 Category 인 '종류' 열이 따로 있어서, WorkArea 표시 이름은 '카테고리(분야)'로 둡니다).
 *   - 항목의 예전 값을 MAP 으로 새 카테고리로 바꿉니다. MAP 에 없는 예전 값은 빼고, 이미 새 카테고리인 값은 그대로 둡니다.
 *   - 바꿀 값이 하나도 없는 항목은 비게 됩니다 → 표의 '확인 필요'를 보고 목록에서 직접 골라 주세요.
 *   - 제목 · 다른 열 · 첨부 파일은 건드리지 않습니다. 여러 번 실행해도 안전합니다.
 */
(async () => {
  const RUN = false;

  const CATS = ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'];
  /* 예전 업무 분야 → 새 카테고리 (추정이에요. 미리 보기를 보고 맞게 고쳐 주세요) */
  const MAP = {
    '회의 정리': '프로젝트·사내 업무 하기',
    '문서 작성': '산출물 만들고 다듬기',
    '요약': '산출물 만들고 다듬기',
    '검색 및 답변': '데이터로 인사이트 찾기',
    '고객 응대': '교육·확산 프로그램 운영하기',
    '규정 확인': '프로젝트·사내 업무 하기',
    '데이터 정리': '데이터로 인사이트 찾기',
    '분류': '데이터로 인사이트 찾기',
    '번역': '산출물 만들고 다듬기',
    '자동 실행': '산출물 만들고 다듬기',
    '개발 지원': '산출물 만들고 다듬기'
  };
  const TARGETS = [
    { titles: ['AgentList', 'Agent List'], url: 'AgentList', field: 'TaskArea', display: '카테고리' },
    { titles: ['HubContents'], url: 'HubContents', field: 'WorkArea', display: '카테고리(분야)' }
  ];

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
  const findList = async (titles, urlName) => {
    for (const t of titles) {
      const base = `${web}/_api/web/lists/getbytitle('${t.replace(/'/g, "''")}')`;
      const l = await req('GET', `${base}?$select=Id,Title,ListItemEntityTypeFullName`);
      if (l) { return { base, info: l }; }
    }
    const base = `${web}/_api/web/GetList('${webPath}/Lists/${urlName}')`;
    const l = await req('GET', `${base}?$select=Id,Title,ListItemEntityTypeFullName`);
    return l ? { base, info: l } : null;
  };
  const vals = v => (v && v.results) ? v.results : Array.isArray(v) ? v : v ? [v] : [];

  for (const T of TARGETS) {
    const L = await findList(T.titles, T.url);
    if (!L) { console.warn(`${T.url} 목록을 찾지 못해 건너뜀`); continue; }
    const fld = await req('GET', `${L.base}/fields/getbyinternalnameortitle('${T.field}')?$select=Id,Title,TypeAsString,Choices`);
    if (!fld) { console.warn(`${L.info.Title}: ${T.field} 열이 없어 건너뜀`); continue; }
    const multi = fld.TypeAsString === 'MultiChoice';

    // 항목별 바뀔 값
    const rows = [];
    let url = `${L.base}/items?$select=Id,Title,${T.field}&$top=500`;
    while (url) {
      const d = await req('GET', url);
      (d.value || []).forEach(it => {
        const old = vals(it[T.field]);
        const next = [];
        old.forEach(v => { const n = CATS.indexOf(v) >= 0 ? v : MAP[v]; if (n && next.indexOf(n) < 0) { next.push(n); } });
        const same = old.length === next.length && old.every((v, i) => v === next[i]);
        rows.push({ id: it.Id, 제목: it.Title, 지금: old.join(' · '), 바뀔값: next.join(' · ') || '(비어 있음)', 상태: same ? '그대로' : !next.length ? '⚠ 확인 필요' : '바뀜', _next: next, _same: same });
      });
      url = d['odata.nextLink'] || d['@odata.nextLink'] || null;
    }
    console.log(`%c${L.info.Title} · ${T.field} (${fld.TypeAsString})`, 'font-weight:bold');
    console.table(rows.map(({ _next, _same, ...r }) => r));
    if (!RUN) { continue; }

    // 1) 선택 값 · 표시 이름 바꾸기
    await req('POST', `${web}/_api/web/lists(guid'${L.info.Id}')/fields(guid'${fld.Id}')`,
      { __metadata: { type: multi ? 'SP.FieldMultiChoice' : 'SP.FieldChoice' }, Choices: { __metadata: { type: 'Collection(Edm.String)' }, results: CATS }, Title: T.display },
      { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    // 2) 항목 값 바꾸기
    let done = 0, fail = 0;
    for (const r of rows.filter(x => !x._same)) {
      const value = multi ? { __metadata: { type: 'Collection(Edm.String)' }, results: r._next } : (r._next[0] || null);
      try {
        await req('POST', `${L.base}/items(${r.id})`, { __metadata: { type: L.info.ListItemEntityTypeFullName }, [T.field]: value }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
        done++;
      } catch (e) { fail++; console.warn(`#${r.id} ${r.제목}: ${e.message}`); }
    }
    console.log(`${L.info.Title}: 선택 값을 카테고리 6개로 바꿈 · 항목 ${done}개 바꿈${fail ? ` · 실패 ${fail}개` : ''}`);
  }
  console.log(RUN ? '끝났어요. Hub를 새로 고침해 주세요.' : '미리 보기만 했어요. MAP 을 확인하고 RUN = true 로 바꿔 다시 실행하세요.');
})().catch(e => console.error('중간에 멈췄어요:', e.message));
