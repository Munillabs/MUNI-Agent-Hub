/*
 * 조회수 열 추가: AgentList · HubContents 에 ViewCount (브라우저 콘솔용)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *
 * 하는 일
 *   - 두 목록에 없으면 추가합니다. 이미 있으면 건너뜁니다. 여러 번 실행해도 안전합니다.
 *     ViewCount (숫자, 'Hub 조회수')      : 지금까지 조회수
 *   - 새 열은 새 항목/편집 양식에서 숨깁니다 (사람이 고치는 열이 아니라서).
 *   - 기존 항목의 ViewCount 는 비어 있다가, 처음 조회될 때 1이 됩니다.
 *
 * 꼭 확인할 권한 (조회수는 '보는 사람'의 권한으로 항목을 고쳐서 올립니다)
 *   - 직원이 두 목록의 항목을 '편집'할 수 있어야 숫자가 오릅니다. 권한이 없으면 화면은 그대로이고 숫자만 오르지 않습니다.
 *   - HubContents 의 항목 수준 권한이 '자기 항목만 편집'이면 남의 Skill·HTML 조회수가 오르지 않습니다.
 *   - 콘텐츠 승인을 켠 목록이면, 승인 권한이 없는 사람이 볼 때 항목이 '승인 대기'로 돌아갈 수 있습니다.
 */
(async () => {
  const LISTS = [['AgentList', 'Agent List'], ['HubContents']];

  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
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
  const COLS = [
    ['ViewCount', '<Field Type="Number" Name="ViewCount" StaticName="ViewCount" DisplayName="Hub 조회수" Decimals="0" Min="0" Required="FALSE" ShowInNewForm="FALSE" ShowInEditForm="FALSE" />']
  ];

  const report = [];
  for (const titles of LISTS) {
    let base = null;
    for (const t of titles) {
      const b = `${web}/_api/web/lists/getbytitle('${t}')`;
      if (await req('GET', `${b}?$select=Id`)) { base = b; break; }
    }
    if (!base) { report.push({ 목록: titles[0], 열: '-', 결과: '⚠ 목록을 찾지 못했어요' }); continue; }
    const fields = ((await req('GET', `${base}/fields?$select=InternalName&$top=1000`)) || { value: [] }).value.map(f => f.InternalName);
    for (const [name, xml] of COLS) {
      if (fields.indexOf(name) >= 0) { report.push({ 목록: titles[0], 열: name, 결과: '건너뜀 (이미 있음)' }); continue; }
      try {
        await req('POST', `${base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: xml, Options: 8 } });
        report.push({ 목록: titles[0], 열: name, 결과: '추가함' });
      } catch (e) {
        report.push({ 목록: titles[0], 열: name, 결과: '⚠ 실패: ' + e.message });
      }
    }
  }
  console.table(report);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
