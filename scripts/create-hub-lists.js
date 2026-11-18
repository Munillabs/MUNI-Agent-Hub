/*
 * MUNI AI Hub Case Library 목록 만들기 (브라우저 콘솔용)
 *   AgentList 는 배포 흐름과 같이 쓰는 목록이라 따로 만듭니다: create-agent-list.js / add-agent-list-columns.js
 *   HubContents(Skill · HTML), HubIdeas(아이디어)는 사이트에서 직접 만든 목록을 씁니다. 열은 README를 보세요.
 *
 * 쓰는 법
 *   1. Hub 사이트(예: https://munilabskr.sharepoint.com/sites/MuniAgentHub)를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *      (처음 붙여 넣을 때 'allow pasting' 을 입력하라고 하면 그대로 입력한 뒤 다시 붙여 넣습니다.)
 *   3. 끝나면 표로 결과가 나옵니다.
 *
 * 하는 일
 *   - 목록이 없으면 만들고, 있으면 그대로 씁니다. (지우거나 덮어쓰는 일은 없습니다)
 *   - 같은 이름이 문서 라이브러리면 건너뛰고 알려 줍니다. (예전 라이브러리는 이름을 바꾼 뒤 다시 실행)
 *   - 없는 열만 추가합니다. 이미 있는 열은 건드리지 않고, 형식이 다르면 '형식 다름'으로 알려 줍니다.
 *   - 내부 이름은 영문(README와 같게), 표시 이름은 한글로 만듭니다.
 *   - Case Library 는 버전 관리를 켜고 콘텐츠 승인은 끕니다.
 *   - 여러 번 실행해도 안전합니다.
 *
 * 직접 할 일: 평점 설정 (목록 설정 > 평점 설정)
 *   AgentList · HubContents = 별 등급, HubIdeas = 좋아요
 */
(async () => {
  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
  const T = 'Text', N = 'Note', NUM = 'Number', DT = 'DateTime', U = 'User';
  const LISTS = [
    { title: 'Case Library', template: 100, settings: { EnableVersioning: true, EnableModeration: false }, fields: [
      ['Industry', T, '업종'], ['ClientName', T, '고객사'], ['Department', T, '조직'], ['Period', T, '시기'], ['PainPoint', N, 'Pain Point'],
      ['Solutions', N, '솔루션 (종류|이름)'], ['Progress', N, '진행 내용'],
      ['KeyEffect', T, '대표 효과 (결과)'], ['KeyEffectNote', T, '대표 효과 (상세)'], ['BeforeText', N, '업무 변화 Before'], ['AfterText', N, '업무 변화 After'],
      ['CaseContact', T, '문의 담당자'], ['BeforeItems', N, 'Before 단계'], ['AfterItems', N, 'After 단계'], ['AIStep', NUM, 'AI 단계 번호'],
      ['ProjectSummary', T, '프로젝트 개요'], ['BusinessArea', T, '업무 영역'], ['Products', T, '활용 제품'], ['AIPattern', T, 'Copilot 활용 방식'],
      ['ApplyPoints', N, '적용 포인트'], ['Verification', N, '검증 방식'], ['ReusePrompt', N, '재사용 프롬프트'],
      ['EffectTime', T, '효과: 시간 (전|후)'], ['EffectQuality', T, '효과: 품질 (전|후)'], ['EffectEffort', T, '효과: 정신적 노력 (전|후)']] }
  ];

  const esc = s => s.replace(/'/g, "''");
  const x = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
  const digest = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: { Accept: 'application/json;odata=nometadata' } })).json()).FormDigestValue;
  const req = async (method, path, body, extra) => {
    const r = await fetch(web + '/_api/' + path, {
      method: method === 'MERGE' ? 'POST' : method,
      headers: Object.assign({ Accept: 'application/json;odata=nometadata', 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest }, extra || {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (!r.ok && r.status !== 404) { throw new Error(path + ' → ' + r.status + ' ' + (await r.text()).slice(0, 300)); }
    return r.status === 404 ? null : (r.status === 204 ? {} : r.json().catch(() => ({})));
  };
  const schema = (name, type, display) => {
    const extra = type === N ? ' NumLines="6" RichText="FALSE" RichTextMode="Compatible"'
      : type === DT ? ' Format="DateTime"' : type === U ? ' UserSelectionMode="PeopleOnly" UserSelectionScope="0"' : '';
    return `<Field Type="${type}" Name="${name}" StaticName="${name}" DisplayName="${x(display)}" Required="FALSE"${extra} />`;
  };

  const report = [];
  for (const L of LISTS) {
    const base = `web/lists/getbytitle('${esc(L.title)}')`;
    let list = await req('GET', base + '?$select=Id,BaseTemplate');
    if (list && list.BaseTemplate !== L.template) {
      report.push({ 목록: L.title, 열: '(목록)', 결과: `⚠ 종류 다름 (${list.BaseTemplate === 101 ? '문서 라이브러리예요. 이름을 바꾸고 다시 실행하세요' : '목록이어야 함'})` });
      continue;
    }
    if (!list) {
      await req('POST', 'web/lists', { __metadata: { type: 'SP.List' }, Title: L.title, BaseTemplate: L.template, AllowContentTypes: true, ContentTypesEnabled: false });
      report.push({ 목록: L.title, 열: '(목록)', 결과: '새로 만듦' });
    } else {
      report.push({ 목록: L.title, 열: '(목록)', 결과: '이미 있음' });
    }
    if (Object.keys(L.settings).length) {
      await req('MERGE', base, Object.assign({ __metadata: { type: 'SP.List' } }, L.settings), { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    }
    // 열은 하나씩 묻지 않고 한 번에 읽습니다 (없는 열을 물으면 SharePoint가 400을 돌려줍니다)
    const have = {};
    ((await req('GET', `${base}/fields?$select=InternalName,TypeAsString&$top=1000`)) || { value: [] }).value
      .forEach(f => { have[f.InternalName] = f; });
    for (const [name, type, display] of L.fields) {
      const f = have[name];
      if (f) {
        const same = f.TypeAsString === type || (type === U && f.TypeAsString === 'User');
        report.push({ 목록: L.title, 열: name, 결과: same ? '이미 있음' : `형식 다름 (지금 ${f.TypeAsString}, 필요 ${type})` });
        continue;
      }
      await req('POST', `${base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: schema(name, type, display), Options: 8 } });
      await req('POST', `${base}/defaultview/viewfields/addviewfield('${name}')`).catch(() => undefined);
      report.push({ 목록: L.title, 열: name, 결과: '추가함' });
    }
  }
  console.table(report);
  const warn = report.filter(r => /다름/.test(r.결과));
  console.log(warn.length ? `⚠ 확인이 필요한 항목 ${warn.length}개가 있어요 (위 표의 '다름').` : '✅ 2개 목록과 열이 모두 준비됐어요. 이제 평점 설정만 직접 켜 주세요.');
})().catch(e => console.error('중간에 멈췄어요:', e.message));
