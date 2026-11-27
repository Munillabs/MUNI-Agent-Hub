/*
 * AgentList 에 예시 Agent 1개 등록 (브라우저 콘솔용) — Owner · 만든 사람: 조희재
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *
 * 하는 일
 *   - 조희재 님을 이름으로 찾아(사이트 사용자 → 회사 디렉터리 순) Owner 로 넣습니다.
 *   - Hub에 바로 보이도록 OpsStatus(운영 상태)를 '정식 운영' 등 운영 중 값으로 넣습니다.
 *   - 선택 열 값은 목록에 실제로 있는 값만 넣고, 없는 값은 빼고 알려 줍니다.
 *   - 등록한 뒤 '만든 사람 · 수정한 사람'도 조희재 님으로 바꿉니다.
 *   - 제목(행 키)에 [테스트] 를 붙입니다. 지울 때는 목록에서 그 항목만 지우면 됩니다.
 *
 * 아래 AGENT 의 내용을 바꿔서 다른 Agent 도 등록할 수 있습니다.
 */
(async () => {
  const OWNER_NAME = '조희재';
  const AGENT = {
    Title: '[테스트] AG-WEEKLY-REPORT',
    AgentName: '주간 보고 작성 도우미',
    Summary: '한 주 업무 메모를 주간 보고 초안으로 정리해요',
    BuildTool: 'Copilot Studio',
    Env: 'Prod',
    OpsStatus: ['정식 운영', '안정화 중'],          // 목록에 있는 첫 값을 씁니다
    TaskArea: ['프로젝트·사내 업무 하기'],
    Output: ['문서 초안', '표'],
    OutputNote: '팀 양식에 맞춘 주간 보고 초안 (이번 주 한 일 · 다음 주 계획 · 이슈)',
    Scope: ['사내 업무용'],
    OpenUrl: { Url: 'https://teams.microsoft.com/', Description: 'Teams에서 열기' },
    Does: [
      '한 주 동안 적어 둔 업무 메모를 항목별로 묶어 정리해요',
      '이번 주 한 일 · 다음 주 계획 · 이슈로 나눠 보고서 초안을 만들어요',
      '팀 보고 양식에 맞춰 표로 바꿔 줘요'
    ].join('\n'),
    Prompts: [
      '이번 주 메모로 주간 보고 초안 만들어 줘',
      '다음 주 계획만 3줄로 요약해 줘',
      '이슈 항목을 표로 정리해 줘'
    ].join('\n'),
    MakerNote: '매주 금요일 오후에 30분씩 걸리던 주간 보고 작성을 5분으로 줄였어요. 메모를 그대로 붙여 넣기만 하면 돼요.',
    Instructions: '너는 MUNI LABS 직원의 주간 보고 작성을 돕는 도우미야.\n- 사용자가 준 메모만 근거로 써.\n- 이번 주 한 일 / 다음 주 계획 / 이슈 세 칸으로 나눠.\n- 각 항목은 한 줄로, 숫자와 날짜는 그대로 남겨.',
    Config: JSON.stringify({
      knowledge: [{ name: '주간 보고 양식', where: 'SharePoint 팀 사이트 문서', type: '문서' }],
      tools: [{ name: 'Word 문서 만들기', connector: 'Office 365', kind: '작업' }]
    }),
    Version: '1.0',
    Releases: JSON.stringify([{ v: '1.0', d: new Date().toISOString().slice(0, 10), n: '처음 배포' }]),
    FirstDeployedOn: new Date().toISOString(),
    DeployedAt: new Date().toISOString()
  };

  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
  const H = { Accept: 'application/json;odata=verbose' };
  const digest = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: H })).json()).d.GetContextWebInformation.FormDigestValue;
  const req = async (method, url, body, extra) => {
    const r = await fetch(url, {
      method, headers: Object.assign({}, H, { 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest }, extra || {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 404) { return null; }
    if (!r.ok) { throw new Error(url.replace(web, '') + ' → ' + r.status + ' ' + (await r.text()).slice(0, 300)); }
    return r.status === 204 ? {} : (await r.json().catch(() => ({}))).d;
  };

  /* ---------- 목록 ---------- */
  // 이름이 아니라 사이트의 목록 전체에서 찾습니다 (표시 이름 또는 주소가 AgentList / Agent List 와 비슷한 것)
  const all = await req('GET', `${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`);
  const lists = (all && all.results) || [];
  const norm = s => String(s || '').toLowerCase().replace(/[\s_-]/g, '');
  const hit = lists.filter(l => norm(l.Title) === 'agentlist' || /\/lists\/agentlist$/i.test(l.RootFolder.ServerRelativeUrl))[0]
    || lists.filter(l => /agent/i.test(l.Title) || /agent/i.test(l.RootFolder.ServerRelativeUrl))[0];
  if (!hit) {
    console.error('Agent 목록을 찾지 못했어요. 이 사이트의 목록:', lists.map(l => `${l.Title} (${l.RootFolder.ServerRelativeUrl})`));
    return;
  }
  const base = `${web}/_api/web/lists(guid'${hit.Id}')`;
  console.log('목록:', hit.Title, hit.RootFolder.ServerRelativeUrl);
  const info = await req('GET', `${base}?$select=ListItemEntityTypeFullName`);

  /* ---------- 조희재 님 찾기 ---------- */
  let login = '';
  const su = await req('GET', `${web}/_api/web/siteusers?$filter=Title eq '${OWNER_NAME}'&$select=LoginName,Email`);
  if (su && su.results && su.results.length) { login = su.results[0].LoginName; }
  if (!login) {
    const pp = await req('POST', `${web}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.clientPeoplePickerSearchUser`, {
      queryParams: { __metadata: { type: 'SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters' }, QueryString: OWNER_NAME, MaximumEntitySuggestions: 10, AllowEmailAddresses: true, PrincipalSource: 15, PrincipalType: 1 }
    });
    const hits = JSON.parse(pp.ClientPeoplePickerSearchUser || '[]').filter(h => h.DisplayText === OWNER_NAME);
    if (hits.length > 1) { console.warn(`'${OWNER_NAME}' 이 ${hits.length}명이에요. 첫 번째(${hits[0].Description || hits[0].Key})를 씁니다.`); }
    if (hits.length) { login = hits[0].Key; }
  }
  if (!login) { console.error(`'${OWNER_NAME}' 님을 찾지 못했어요. 이름이 디렉터리와 같은지 확인해 주세요.`); return; }
  const owner = await req('POST', `${web}/_api/web/ensureuser`, { logonName: login });
  console.log('Owner:', owner.Title, owner.Email);

  /* ---------- 선택 열 값 맞추기 ---------- */
  const report = [];
  const choicesOf = async name => {
    const f = await req('GET', `${base}/fields/getbyinternalnameortitle('${name}')?$select=Choices,TypeAsString`).catch(() => null);
    return f ? { type: f.TypeAsString, list: (f.Choices && f.Choices.results) || [] } : null;
  };
  const fields = { __metadata: { type: info.ListItemEntityTypeFullName } };
  for (const k of Object.keys(AGENT)) {
    const v = AGENT[k];
    if (k === 'OpsStatus' || ['BuildTool', 'Env', 'TaskArea', 'Output', 'Scope'].indexOf(k) >= 0) {
      const c = await choicesOf(k);
      if (!c) { report.push({ 열: k, 결과: '⚠ 열이 없어 뺐어요' }); continue; }
      const want = Array.isArray(v) ? v : [v];
      const ok = want.filter(x => c.list.indexOf(x) >= 0);
      if (!ok.length) { report.push({ 열: k, 결과: `⚠ 넣을 수 있는 값이 없어 뺐어요 (목록 값: ${c.list.join(', ')})` }); continue; }
      if (c.type === 'MultiChoice') { fields[k] = { __metadata: { type: 'Collection(Edm.String)' }, results: ok }; } else { fields[k] = ok[0]; }
      report.push({ 열: k, 결과: (c.type === 'MultiChoice' ? ok.join(', ') : ok[0]) + (ok.length < want.length && c.type === 'MultiChoice' ? ` (뺀 값: ${want.filter(x => ok.indexOf(x) < 0).join(', ')})` : '') });
      continue;
    }
    if (k === 'OpenUrl') { fields[k] = { __metadata: { type: 'SP.FieldUrlValue' }, Url: v.Url, Description: v.Description }; continue; }
    fields[k] = v;
  }
  fields.OwnerId = owner.Id;

  /* ---------- 등록 ---------- */
  const item = await req('POST', `${base}/items`, fields);
  console.log('등록했어요. ID:', item.Id);

  // 만든 사람 · 수정한 사람도 조희재 님으로 (새 버전 없이)
  const who = JSON.stringify([{ Key: owner.LoginName }]);
  const res = await req('POST', `${base}/items(${item.Id})/ValidateUpdateListItem`, {
    formValues: [{ FieldName: 'Author', FieldValue: who }, { FieldName: 'Editor', FieldValue: who }], bNewDocumentUpdate: true
  });
  const bad = ((res && res.ValidateUpdateListItem && res.ValidateUpdateListItem.results) || []).filter(v => v.HasException);
  report.push({ 열: '만든 사람', 결과: bad.length ? '⚠ 바꾸지 못했어요: ' + bad.map(v => v.ErrorMessage).join(', ') : owner.Title });

  console.table(report);
  console.log(`✅ Hub에서 확인: #agent-${item.Id}  (Marketplace 목록에도 보여요)`);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
