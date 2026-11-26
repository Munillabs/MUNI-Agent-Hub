/*
 * Agent List 만들기 (브라우저 콘솔용) — 열 46개 + OutputNote
 *
 * 쓰는 법
 *   1. Hub 사이트(예: https://munilabskr.sharepoint.com/sites/MuniAgentHub)를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *      (처음 붙여 넣을 때 'allow pasting' 을 입력하라고 하면 그대로 입력한 뒤 다시 붙여 넣습니다.)
 *   3. 끝나면 표로 결과가 나옵니다.
 *
 * 하는 일
 *   - 목록이 없으면 주소 /Lists/AgentList, 표시 이름 'Agent List' 로 만듭니다. 있으면 그대로 씁니다.
 *   - 없는 열만 추가합니다. 이미 있는 열은 건드리지 않고, 형식이 다르면 '형식 다름'으로 알려 줍니다.
 *   - Title 은 표시 이름을 '행 키'로 바꾸고 고유 값 + 색인을 켭니다.
 *   - Status · RequestStatus · RiskCalc · ApprovalId 에 색인을 겁니다.
 *   - 버전 관리와 첨부 파일(thumb, result1, result2 이미지)을 켭니다.
 *   - Skills(사용 Skill)는 HubContents 목록을 조회합니다. HubContents 가 없으면 이 열만 건너뜁니다.
 *     (HubContents 를 만든 뒤 다시 실행하면 그때 추가됩니다)
 *   - 여러 번 실행해도 안전합니다.
 *
 * REQUIRED = true 이면 설계표의 필수(Y) 열을 SharePoint 필수 열로 만듭니다.
 * 신청 슬롯처럼 일부만 채운 행을 Flow 등으로 먼저 만들 계획이면 false 로 두세요.
 */
(async () => {
  const REQUIRED = false;

  const web = (window._spPageContextInfo && window._spPageContextInfo.webAbsoluteUrl)
    || location.origin + (location.pathname.match(/^\/(sites|teams)\/[^/]+/) || [''])[0];
  const webPath = new URL(web).pathname.replace(/\/$/, '');
  const H = { Accept: 'application/json;odata=nometadata' };
  const digest = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: H })).json()).FormDigestValue;
  const req = async (method, url, body, extra) => {
    const r = await fetch(url, {
      method: method === 'MERGE' ? 'POST' : method,
      headers: Object.assign({}, H, { 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': digest }, extra || {}),
      body: body ? JSON.stringify(body) : undefined
    });
    if (r.status === 404) { return null; }
    if (!r.ok) { throw new Error(url.replace(web, '') + ' → ' + r.status + ' ' + (await r.text()).slice(0, 300)); }
    return r.status === 204 ? {} : r.json().catch(() => ({}));
  };
  const x = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const listAt = async (title, urlName) => {
    const byTitle = `${web}/_api/web/lists/getbytitle('${title.replace(/'/g, "''")}')`;
    let l = await req('GET', `${byTitle}?$select=Id,Title,BaseTemplate`);
    if (l) { return { base: byTitle, info: l }; }
    const byUrl = `${web}/_api/web/GetList('${webPath}/Lists/${urlName}')`;
    l = await req('GET', `${byUrl}?$select=Id,Title,BaseTemplate`);
    return l ? { base: byUrl, info: l } : null;
  };

  /* ---------- 열 정의 (설계표 순서) ----------
     [내부 이름, 표시 이름, 형식, 옵션]
     형식: Text, Note, Choice, MultiChoice, User, Date, DateTime, Number, Boolean, URL, LookupMulti
     옵션: req(필수 Y), idx(색인), max(글자 수), choices, def(기본값), lookup:{list, url, show}  */
  const COLS = [
    ['AgentName', 'Agent 이름', 'Text', { req: true, max: 255 }],
    ['BuildTool', '만든 도구', 'Choice', { req: true, choices: ['Copilot Studio', 'Agent Builder'] }],
    ['Env', '환경', 'Choice', { req: true, choices: ['Prod', 'Default'] }],
    ['Status', '운영 상태', 'Choice', { idx: true, choices: ['안정화 중', '정식 운영', '미사용 후보', '중단', '폐기'] }],
    ['Owner', 'Owner', 'User', { req: true }],
    ['Sponsor', 'Sponsor', 'User', {}],
    ['FirstDeployedOn', '처음 배포일', 'Date', {}],
    ['DeployedAt', '배포 일시', 'DateTime', {}],
    ['Version', '버전', 'Text', { max: 255 }],
    ['LastUsedOn', '최근 사용일', 'Date', {}],
    // 신청 · 슬롯
    ['RequestStatus', '신청 상태', 'Choice', { idx: true, choices: ['테스트', '승인 대기', '승인', '배포 완료'] }],
    ['ProfileAt', 'Profile 확정 일시', 'DateTime', {}],
    ['WorkType', '업무 유형', 'MultiChoice', { choices: ['사내 문서 조회 및 요약', '데이터 쓰기 및 수정', '자동 실행 트리거'] }],
    ['WorkDesc', '주요 업무 설명', 'Note', {}],
    ['DataType', '활용 데이터 유형', 'MultiChoice', { choices: ['사내 문서', '고객사 정보', '개인정보'] }],
    ['DataSources', '지식원, 데이터 위치', 'Note', {}],
    ['Connections', '외부 연결', 'MultiChoice', { choices: ['외부 연결 없음', '승인된 외부 커넥터', 'MCP 연결', '외부 전송'] }],
    ['ShareScope', '공유 범위', 'Choice', { choices: ['개인', '그룹 단위 공유', '전사 공유'] }],
    ['AuthMode', '연결 인증 방식', 'Choice', { choices: ['최종 사용자 인증', '제작자 인증', '연결 없음'] }],
    // 위험도
    ['RiskCalc', '계산 위험도', 'Choice', { idx: true, choices: ['저위험', '중위험', '고위험'] }],
    ['RiskReason', '판정 근거', 'Note', {}],
    ['ConfirmedRisk', '확정 위험도', 'Choice', { choices: ['저위험', '중위험', '고위험'] }],
    // Profile 2차 · 중위험 · 고위험만
    ['SecReview', '보안 검토 내용', 'Note', {}],
    ['HumanApproval', '사람 승인 단계', 'Choice', { choices: ['있음', '없음', '해당 없음'], def: '해당 없음' }],
    ['HumanApprovalNote', '사람 승인 내용', 'Note', {}],
    ['CtlApprovedConn', '승인된 연결만', 'Boolean', { def: '0' }],
    ['IncidentPlan', '사고 대응 방안', 'Note', {}],
    // 테스트 · 승인
    ['EvalSummary', '평가 요약', 'Note', {}],
    ['ApprovalId', '승인 ID', 'Text', { idx: true, max: 255 }],
    // 정기 점검
    ['CheckNote', '점검 메모', 'Note', {}],
    ['CheckDue', '조치 기한', 'Date', {}],
    // Hub 소개 (Profile Card)
    ['Summary', '한 줄 소개', 'Text', { req: true, max: 40 }],
    ['TaskArea', '카테고리', 'MultiChoice', { req: true, choices: ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'] }],
    ['Output', '결과물 형태', 'MultiChoice', { choices: ['답변', '문서 초안', '메일 초안', '표', '체크리스트'] }],
    ['OutputNote', '결과물 설명', 'Text', { max: 255 }],
    ['Scope', '사용 범위', 'MultiChoice', { choices: ['사내 업무용', '고객 프로젝트용'] }],
    ['OpenUrl', 'Teams 링크', 'URL', { req: true }],
    ['Does', '이런 일을 해요', 'Note', { req: true }],
    ['Prompts', '이렇게 말해 보세요', 'Note', { req: true }],
    ['MakerNote', '제작자는 이렇게 썼어요', 'Note', {}],
    ['LinkedAgents', '연결된 Agent', 'LookupMulti', { lookup: { self: true, show: 'AgentName' } }],
    ['Skills', '사용 Skill', 'LookupMulti', { lookup: { list: 'HubContents', url: 'HubContents', show: 'Title' } }],
    // 구성 정보
    ['Instructions', '지침', 'Note', {}],
    ['Config', '구성 정보', 'Note', {}],
    ['Releases', '업데이트 기록', 'Note', {}]
  ];
  const SP_TYPE = { Date: 'DateTime', LookupMulti: 'LookupMulti', URL: 'URL' };

  const schema = (name, display, type, o, lookupListId) => {
    const req = REQUIRED && o.req ? 'TRUE' : 'FALSE';
    const head = a => `<Field Type="${a}" Name="${name}" StaticName="${name}" DisplayName="${x(display)}" Required="${req}"${o.idx ? ' Indexed="TRUE"' : ''}`;
    const def = o.def !== undefined ? `<Default>${x(o.def)}</Default>` : '';
    const choices = o.choices ? `<CHOICES>${o.choices.map(c => `<CHOICE>${x(c)}</CHOICE>`).join('')}</CHOICES>` : '';
    switch (type) {
      case 'Text': return `${head('Text')} MaxLength="${o.max || 255}" />`;
      case 'Note': return `${head('Note')} NumLines="6" RichText="FALSE" RichTextMode="Compatible" AppendOnly="FALSE" />`;
      case 'Choice': return `${head('Choice')} Format="Dropdown" FillInChoice="FALSE">${choices}${def}</Field>`;
      case 'MultiChoice': return `${head('MultiChoice')} FillInChoice="FALSE">${choices}${def}</Field>`;
      case 'User': return `${head('User')} UserSelectionMode="PeopleOnly" UserSelectionScope="0" />`;
      case 'Date': return `${head('DateTime')} Format="DateOnly" />`;
      case 'DateTime': return `${head('DateTime')} Format="DateTime" />`;
      case 'Number': return `${head('Number')} Decimals="0"${o.min !== undefined ? ` Min="${o.min}"` : ''}>${def}</Field>`;
      case 'Boolean': return `${head('Boolean')}>${def}</Field>`;
      case 'URL': return `${head('URL')} Format="Hyperlink" />`;
      case 'LookupMulti': return `${head('LookupMulti')} Mult="TRUE" List="{${lookupListId}}" ShowField="${o.lookup.show}" />`;
    }
    throw new Error('알 수 없는 형식: ' + type);
  };

  const report = [];
  const add = (열, 결과) => report.push({ 열, 결과 });

  /* ---------- 목록 ---------- */
  let L = await listAt('Agent List', 'AgentList');
  if (L && L.info.BaseTemplate !== 100) {
    console.error(`'${L.info.Title}' 는 일반 목록이 아니에요 (BaseTemplate ${L.info.BaseTemplate}). 이름을 바꾼 뒤 다시 실행하세요.`);
    return;
  }
  if (!L) {
    // 주소를 /Lists/AgentList 로 만들려고 먼저 'AgentList' 로 만든 뒤 표시 이름을 바꿉니다
    await req('POST', `${web}/_api/web/lists`, { __metadata: { type: 'SP.List' }, Title: 'AgentList', BaseTemplate: 100, AllowContentTypes: true, ContentTypesEnabled: false });
    L = await listAt('AgentList', 'AgentList');
    await req('MERGE', L.base, { __metadata: { type: 'SP.List' }, Title: 'Agent List' }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    L = await listAt('Agent List', 'AgentList');
    add('(목록)', '새로 만듦 · /Lists/AgentList');
  } else {
    add('(목록)', `이미 있음 · ${L.info.Title}`);
  }
  await req('MERGE', L.base, { __metadata: { type: 'SP.List' }, EnableVersioning: true, EnableAttachments: true }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  add('(설정)', '버전 관리 · 첨부 파일 켬');

  /* ---------- Title = 행 키 (고유 + 색인) ---------- */
  try {
    await req('MERGE', `${L.base}/fields/getbyinternalnameortitle('Title')`,
      { __metadata: { type: 'SP.Field' }, Title: '행 키', Indexed: true, EnforceUniqueValues: true }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
    add('Title', '표시 이름 행 키 · 고유 값 · 색인');
  } catch (e) {
    add('Title', '⚠ 고유 값 설정 실패 (이미 같은 값이 있는 행이 있는지 확인): ' + e.message.slice(0, 120));
  }

  /* ---------- 열 ---------- */
  const have = {};
  ((await req('GET', `${L.base}/fields?$select=InternalName,TypeAsString&$top=1000`)) || { value: [] }).value
    .forEach(f => { have[f.InternalName] = f.TypeAsString; });

  for (const [name, display, type, o] of COLS) {
    const want = SP_TYPE[type] || type;
    if (have[name]) {
      add(name, have[name] === want ? '이미 있음' : `⚠ 형식 다름 (지금 ${have[name]}, 필요 ${want})`);
      continue;
    }
    let lookupId;
    if (type === 'LookupMulti') {
      if (o.lookup.self) { lookupId = L.info.Id; } else {
        const T = await listAt(o.lookup.list, o.lookup.url);
        if (!T) { add(name, `건너뜀: '${o.lookup.list}' 목록이 아직 없어요 (만든 뒤 다시 실행)`); continue; }
        lookupId = T.info.Id;
      }
    }
    try {
      await req('POST', `${L.base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: schema(name, display, type, o, lookupId), Options: 8 } });
      await req('POST', `${L.base}/defaultview/viewfields/addviewfield('${name}')`).catch(() => undefined);
      add(name, '추가함');
    } catch (e) {
      add(name, '⚠ 실패: ' + e.message.slice(0, 160));
    }
  }

  console.table(report);
  const warn = report.filter(r => /⚠|건너뜀/.test(r.결과));
  console.log(warn.length
    ? `확인이 필요한 항목 ${warn.length}개가 있어요 (위 표의 ⚠ · 건너뜀).`
    : '✅ Agent List 와 열 47개(Title 포함)가 준비됐어요. Hub 별점·댓글을 쓰려면 목록 설정 > 평점 설정에서 별 등급을 켜 주세요.');
})().catch(e => console.error('중간에 멈췄어요:', e.message));
