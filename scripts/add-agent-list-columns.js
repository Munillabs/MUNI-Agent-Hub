/*
 * 이미 쓰고 있는 AgentList 에 '없는 열만' 추가하기 (브라우저 콘솔용)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *   3. 끝나면 표로 결과가 나옵니다.
 *
 * 하는 일
 *   - 아래 20개 열 중 목록에 없는 것만 추가합니다.
 *   - 같은 내부 이름이나 같은 표시 이름의 열이 이미 있으면 건너뜁니다.
 *   - 이미 있는 열, 목록 설정, 제목(Title), 들어 있는 데이터는 하나도 건드리지 않습니다.
 *   - 운영 상태는 이미 있는 OpsStatus 를 쓰므로 Status 열은 만들지 않습니다.
 *   - 새 열은 필수가 아니고, 기본 보기에는 넣지 않습니다. (지금 보기 화면이 그대로 유지됩니다)
 *   - 여러 번 실행해도 안전합니다.
 */
(async () => {
  const LIST_TITLES = ['AgentList', 'Agent List'];   // 이 이름 중 하나로 찾고, 없으면 주소 /Lists/AgentList 로 찾습니다
  const ADD_TO_VIEW = false;                          // true 면 새 열을 기본 보기에도 넣습니다

  const COLS = [
    ['BuildTool', '만든 도구', 'Choice', { choices: ['Copilot Studio', 'Agent Builder'] }],
    ['Env', '환경', 'Choice', { choices: ['Prod', 'Default'] }],
    ['FirstDeployedOn', '처음 배포일', 'Date', {}],
    ['LastUsedOn', '최근 사용일', 'Date', {}],
    ['CheckNote', '점검 메모', 'Note', {}],
    ['CheckDue', '조치 기한', 'Date', {}],
    ['Summary', '한 줄 소개', 'Text', { max: 40 }],
    ['TaskArea', '카테고리', 'MultiChoice', { choices: ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'] }],
    ['Output', '결과물 형태', 'MultiChoice', { choices: ['답변', '문서 초안', '메일 초안', '표', '체크리스트'] }],
    ['OutputNote', '결과물 설명', 'Text', { max: 255 }],
    ['Scope', '사용 범위', 'MultiChoice', { choices: ['사내 업무용', '고객 프로젝트용'] }],
    ['OpenUrl', 'Teams 링크', 'URL', {}],
    ['Does', '이런 일을 해요', 'Note', {}],
    ['Prompts', '이렇게 말해 보세요', 'Note', {}],
    ['MakerNote', '제작자는 이렇게 썼어요', 'Note', {}],
    ['LinkedAgents', '연결된 Agent', 'LookupMulti', { lookup: { self: true, show: 'AgentName' } }],
    ['Skills', '사용 Skill', 'LookupMulti', { lookup: { list: 'HubContents', url: 'HubContents', show: 'Title' } }],
    ['Instructions', '지침', 'Note', {}],
    ['Config', '구성 정보', 'Note', {}],
    ['Releases', '업데이트 기록', 'Note', {}]
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

  const L = await findList(LIST_TITLES, 'AgentList');
  if (!L) { console.error('AgentList 목록을 찾지 못했어요. 위쪽 LIST_TITLES 에 실제 목록 이름을 넣어 주세요.'); return; }
  console.log('목록:', L.info.Title);

  // 이미 있는 열: 내부 이름과 표시 이름을 모두 봅니다
  const fields = ((await req('GET', `${L.base}/fields?$select=InternalName,Title,TypeAsString&$top=1000`)) || { value: [] }).value;
  const byName = {}, byTitle = {};
  fields.forEach(f => { byName[f.InternalName.toLowerCase()] = f; byTitle[f.Title.toLowerCase()] = f; });

  const schema = (name, display, type, o, lookupListId) => {
    const head = a => `<Field Type="${a}" Name="${name}" StaticName="${name}" DisplayName="${x(display)}" Required="FALSE"`;
    const def = o.def !== undefined ? `<Default>${x(o.def)}</Default>` : '';
    const choices = o.choices ? `<CHOICES>${o.choices.map(c => `<CHOICE>${x(c)}</CHOICE>`).join('')}</CHOICES>` : '';
    switch (type) {
      case 'Text': return `${head('Text')} MaxLength="${o.max || 255}" />`;
      case 'Note': return `${head('Note')} NumLines="6" RichText="FALSE" RichTextMode="Compatible" AppendOnly="FALSE" />`;
      case 'Choice': return `${head('Choice')} Format="Dropdown" FillInChoice="FALSE">${choices}${def}</Field>`;
      case 'MultiChoice': return `${head('MultiChoice')} FillInChoice="FALSE">${choices}${def}</Field>`;
      case 'Date': return `${head('DateTime')} Format="DateOnly" />`;
      case 'Number': return `${head('Number')} Decimals="0"${o.min !== undefined ? ` Min="${o.min}"` : ''}>${def}</Field>`;
      case 'URL': return `${head('URL')} Format="Hyperlink" />`;
      case 'LookupMulti': return `${head('LookupMulti')} Mult="TRUE" List="{${lookupListId}}" ShowField="${o.lookup.show}" />`;
    }
    throw new Error('알 수 없는 형식: ' + type);
  };

  const report = [];
  for (const [name, display, type, o] of COLS) {
    const same = byName[name.toLowerCase()] || byTitle[name.toLowerCase()] || byTitle[display.toLowerCase()];
    if (same) { report.push({ 열: name, 결과: `건너뜀 (이미 있음: ${same.Title} · ${same.TypeAsString})` }); continue; }
    let lookupId;
    if (type === 'LookupMulti') {
      if (o.lookup.self) {
        if (!byName[o.lookup.show.toLowerCase()]) { report.push({ 열: name, 결과: `건너뜀: 조회할 '${o.lookup.show}' 열이 없어요` }); continue; }
        lookupId = L.info.Id;
      } else {
        const T = await findList([o.lookup.list], o.lookup.url);
        if (!T) { report.push({ 열: name, 결과: `건너뜀: '${o.lookup.list}' 목록이 아직 없어요 (만든 뒤 다시 실행)` }); continue; }
        lookupId = T.info.Id;
      }
    }
    try {
      await req('POST', `${L.base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: schema(name, display, type, o, lookupId), Options: 8 } });
      if (ADD_TO_VIEW) { await req('POST', `${L.base}/defaultview/viewfields/addviewfield('${name}')`).catch(() => undefined); }
      report.push({ 열: name, 결과: '추가함' });
    } catch (e) {
      report.push({ 열: name, 결과: '⚠ 실패: ' + e.message });
    }
  }
  console.table(report);
  const added = report.filter(r => r.결과 === '추가함').length;
  const warn = report.filter(r => /⚠|목록이 아직|열이 없어요/.test(r.결과)).length;
  console.log(`추가 ${added}개 · 건너뜀 ${report.length - added - warn}개${warn ? ` · 확인 필요 ${warn}개` : ''}`);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
