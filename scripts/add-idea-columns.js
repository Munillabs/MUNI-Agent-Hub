/*
 * HubIdeas 에 Idea Board 시안용 열 2개 추가하기 (브라우저 콘솔용)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *   3. 끝나면 표로 결과가 나옵니다.
 *
 * 추가하는 열
 *   - Category    (카테고리, 선택)        : 아이디어 카테고리 6개. 값은 models/rules.ts 의 IDEA_CATS 와 같아야 합니다.
 *   - ScrapSource (출처, 여러 줄 텍스트)  : 외부에서 스크랩한 아이디어의 원문 주소(주소 없이 스크랩이면 '외부').
 *                                          Case Library 솔루션에서 올린 아이디어면 'case:사례 번호|솔루션 이름'.
 *
 * 하는 일
 *   - 목록에 없는 열만 추가합니다. 이미 있는 열 · 데이터 · 보기는 건드리지 않습니다.
 *   - 새 열은 필수가 아니고, 기본 보기에는 넣지 않습니다.
 *   - 여러 번 실행해도 안전합니다.
 *   - 열을 추가하기 전에도 Hub는 동작합니다. (카테고리 · 스크랩 · 사례 연결만 저장되지 않고, 화면에 안내가 나옵니다)
 */
(async () => {
  const LIST_TITLES = ['HubIdeas'];   // 이 이름 중 하나로 찾고, 없으면 주소 /Lists/HubIdeas 로 찾습니다
  const ADD_TO_VIEW = false;          // true 면 새 열을 기본 보기에도 넣습니다

  const COLS = [
    ['Category', '카테고리', 'Choice', { choices: ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'] }],
    ['ScrapSource', '스크랩 원문', 'Note', {}]
  ];

  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
  const webPath = new URL(web).pathname.replace(/\/$/, '');
  const H = { Accept: 'application/json;odata=nometadata' };
  const digest = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: H })).json()).FormDigestValue;
  const req = async (method, url, body) => {
    const r = await fetch(url, {
      method, headers: Object.assign({}, H, { 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest }),
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 404) { return null; }
    if (!r.ok) { throw new Error(r.status + ' ' + (await r.text()).slice(0, 200)); }
    return r.status === 204 ? {} : r.json().catch(() => ({}));
  };
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const findList = async (titles, urlName) => {
    for (const t of titles) {
      const base = `${web}/_api/web/lists/getbytitle('${t.replace(/'/g, "''")}')`;
      const l = await req('GET', `${base}?$select=Id,Title`);
      if (l) { return { base, info: l }; }
    }
    const base = `${web}/_api/web/GetList('${webPath}/Lists/${urlName}')`;
    const l = await req('GET', `${base}?$select=Id,Title`);
    return l ? { base, info: l } : null;
  };

  const L = await findList(LIST_TITLES, 'HubIdeas');
  if (!L) { console.error('HubIdeas 목록을 찾지 못했어요. 위쪽 LIST_TITLES 에 실제 목록 이름을 넣어 주세요.'); return; }
  console.log('목록:', L.info.Title);

  const fields = ((await req('GET', `${L.base}/fields?$select=InternalName,Title,TypeAsString&$top=1000`)) || { value: [] }).value;
  const byName = {};
  fields.forEach(f => { byName[f.InternalName.toLowerCase()] = f; });

  const schema = (name, display, type, o) => {
    const head = a => `<Field Type="${a}" Name="${name}" StaticName="${name}" DisplayName="${x(display)}" Required="FALSE"`;
    if (type === 'Choice') { return `${head('Choice')} Format="Dropdown" FillInChoice="FALSE"><CHOICES>${o.choices.map(c => `<CHOICE>${x(c)}</CHOICE>`).join('')}</CHOICES></Field>`; }
    if (type === 'Note') { return `${head('Note')} NumLines="3" RichText="FALSE" RichTextMode="Compatible" AppendOnly="FALSE" />`; }
    throw new Error('알 수 없는 형식: ' + type);
  };

  const report = [];
  for (const [name, display, type, o] of COLS) {
    const same = byName[name.toLowerCase()];
    if (same) { report.push({ 열: name, 결과: `건너뜀 (이미 있음: ${same.Title} · ${same.TypeAsString})` }); continue; }
    try {
      await req('POST', `${L.base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: schema(name, display, type, o), Options: 8 } });
      if (ADD_TO_VIEW) { await req('POST', `${L.base}/defaultview/viewfields/addviewfield('${name}')`).catch(() => undefined); }
      report.push({ 열: name, 결과: '추가함' });
    } catch (e) {
      report.push({ 열: name, 결과: '⚠ 실패: ' + e.message });
    }
  }
  console.table(report);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
