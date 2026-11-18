/*
 * 프로필 배지 목록 HubProfiles 만들기 (브라우저 콘솔용)
 *
 * 쓰는 법
 *   1. Hub 사이트를 사이트 소유자 계정으로 엽니다.
 *   2. F12 → Console 탭에 이 파일 전체를 붙여 넣고 Enter.
 *
 * 하는 일 (여러 번 실행해도 안전)
 *   - HubProfiles 목록이 없으면 만들고, AvatarBadge(프로필 배지) 열을 추가합니다.
 *   - 항목 수준 권한: 모두 읽기 · 자기 항목만 편집 (남의 프로필을 바꾸지 못하게)
 *   - 버전 기록은 끕니다.
 *
 * Hub가 쓰는 방법 (사람당 한 줄)
 *   - Title       : 이메일 (찾아보기용)
 *   - 만든 사람    : 그 사람 (SharePoint가 자동으로 남김)
 *   - AvatarBadge : 고른 배지 키 (예: first-idea). 'photo' = 사진, 비우면 최근 배지 자동
 *   - 프로필 패널에서 [프로필로 쓰기]를 처음 누를 때 그 사람의 줄이 생깁니다.
 *
 * 권한: 직원에게 이 목록 '항목 추가' 권한이 있어야 합니다 (사이트 구성원은 기본으로 됨).
 */
(async () => {
  const TITLE = 'HubProfiles';
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
  const report = [];
  const base = `${web}/_api/web/lists/getbytitle('${TITLE}')`;

  if (!(await req('GET', `${base}?$select=Id`))) {
    await req('POST', `${web}/_api/web/lists`, { __metadata: { type: 'SP.List' }, Title: TITLE, BaseTemplate: 100, Description: 'MUNI AI Hub 프로필 배지 (사람당 한 줄, Hub가 자동으로 씁니다)' });
    report.push({ 단계: '목록', 결과: '새로 만듦' });
  } else {
    report.push({ 단계: '목록', 결과: '이미 있음' });
  }

  const has = await req('GET', `${base}/fields?$select=InternalName&$filter=InternalName eq 'AvatarBadge'`);
  if (has && has.value && has.value.length) {
    report.push({ 단계: 'AvatarBadge 열', 결과: '건너뜀 (이미 있음)' });
  } else {
    await req('POST', `${base}/fields/createfieldasxml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' },
      SchemaXml: '<Field Type="Text" Name="AvatarBadge" StaticName="AvatarBadge" DisplayName="프로필 배지" MaxLength="40" Required="FALSE" />', Options: 8 } });
    await req('POST', `${base}/defaultview/viewfields/addviewfield('AvatarBadge')`).catch(() => undefined);
    await req('POST', `${base}/defaultview/viewfields/addviewfield('Author')`).catch(() => undefined);
    report.push({ 단계: 'AvatarBadge 열', 결과: '추가함' });
  }

  // 모두 읽기(1) · 자기 항목만 편집(2) · 버전 기록 끔
  await req('POST', base, { __metadata: { type: 'SP.List' }, ReadSecurity: 1, WriteSecurity: 2, EnableVersioning: false },
    { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
  report.push({ 단계: '설정', 결과: '모두 읽기 · 자기 항목만 편집 · 버전 기록 끔' });

  console.table(report);
  console.log('✅ 완료:', `${web}/Lists/${TITLE}`);
})().catch(e => console.error('중간에 멈췄어요:', e.message));
