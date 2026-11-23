/*
 * AgentList '사용 Skill'(Skills) 조회 열 고치기 (브라우저 콘솔용)
 *
 * 문제: Skills 열이 지워진 목록을 가리켜서 고를 항목이 없고, Hub 상세 화면의 'Skill'이 늘 0개입니다.
 *       SharePoint는 조회 열이 가리키는 목록을 바꿀 수 없어서, 열을 지우고 HubContents를 가리키게 다시 만듭니다.
 *       내부 이름(Skills)과 표시 이름은 그대로라 Hub · 배포 흐름이 계속 같은 열을 씁니다.
 *       (지금 이 열의 값은 사라진 목록의 번호라 이미 쓸 수 없는 값입니다)
 *
 * 쓰는 법
 *   1. Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter → 확인만 하고 계획을 보여 줍니다 (아무것도 안 바꿈)
 *   2. 계획이 맞으면 Console 에 hubFixSkills() 입력 → 열을 다시 만들고 아래 LINKS 대로 Skill을 연결합니다
 */
(() => {
  // Agent 이름 → 연결할 Skill 이름 (HubContents 의 Skill 제목)
  const LINKS = {
    '인사 규정 Q&A': ['데이터 과다 공유(오버셰어링) 점검', '변화관리 커뮤니케이션 플랜 (ADKAR)'],
    '고객 미팅 브리핑': ['고객 인터뷰 → 현황 진단'],
    '프로젝트 주간 보고 작성기': ['프로젝트 착수 패키지'],
    'Copilot 학습 코치': ['직무별 프롬프트 교육 자료', '챔피언 프로그램 운영 가이드']
  };

  const web = _spPageContextInfo.webAbsoluteUrl;
  const J = { Accept: 'application/json;odata=verbose' };
  const norm = s => String(s || '').toLowerCase().replace(/[\s_\-·]/g, '');
  const get = async u => { const r = await fetch(u, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${u.replace(web, '')}`); } return (await r.json()).d; };
  const tryGet = u => get(u).catch(() => null);
  const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
  const send = async (D, url, body, extra) => {
    const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, ...(extra || {}) }, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
    return r.status === 204 ? null : r.json().then(j => j.d, () => null);
  };

  /** 확인: AgentList · HubContents · Skills 열 상태 */
  const inspect = async () => {
    const lists = (await get(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,ItemCount,RootFolder/ServerRelativeUrl&$expand=RootFolder`)).results;
    const byName = (n, url) => lists.filter(l => norm(l.Title) === n || new RegExp(`/lists/${url}$`, 'i').test(l.RootFolder.ServerRelativeUrl))[0];
    const al = byName('agentlist', 'agentlist');
    const hc = byName('hubcontents', 'hubcontents');
    if (!al) { throw new Error('AgentList 목록을 찾지 못했어요'); }
    if (!hc) { throw new Error('HubContents 목록을 찾지 못했어요. 목록 이름: ' + lists.map(l => l.Title).join(', ')); }
    const base = `${web}/_api/web/lists(guid'${al.Id}')`;
    const f = (await get(`${base}/fields?$filter=InternalName eq 'Skills'`)).results[0];
    const target = f ? String(f.LookupList || '').replace(/[{}]/g, '') : '';
    const alive = target ? !!(await tryGet(`${web}/_api/web/lists(guid'${target}')?$select=Id`)) : false;
    return { al, hc, base, f, target, alive };
  };

  (async () => {
    const s = await inspect();
    console.log(`AgentList: ${s.al.Title} (${s.al.ItemCount}개)`);
    console.log(`HubContents: ${s.hc.Title} (ID ${s.hc.Id})`);
    if (!s.f) { console.log('Skills 열: 없음 → hubFixSkills() 가 새로 만듭니다'); }
    else if (s.alive && s.target.toLowerCase() === String(s.hc.Id).toLowerCase()) { console.log('✅ Skills 열은 이미 HubContents를 가리켜요. 고칠 필요 없어요. hubFixSkills() 는 연결만 합니다.'); }
    else if (s.alive) { console.log(`⚠️ Skills 열은 다른(살아 있는) 목록 ${s.target} 을 가리켜요. 안전을 위해 hubFixSkills() 는 열을 지우지 않습니다.`); }
    else { console.log(`Skills 열 '${s.f.Title}': 사라진 목록(${s.target})을 가리킴 → hubFixSkills() 가 지우고 HubContents를 가리키게 다시 만듭니다`); }
    console.log('연결 계획:'); console.table(Object.keys(LINKS).map(a => ({ Agent: a, Skill: LINKS[a].join(', ') })));
    console.log('진행하려면 hubFixSkills() 를 입력하세요.');
  })().catch(e => console.error('확인하다 멈췄어요:', e.message));

  window.hubFixSkills = async () => {
    const s = await inspect();
    const D = await digest();
    const type = (await get(`${s.base}?$select=ListItemEntityTypeFullName`)).ListItemEntityTypeFullName;
    const hcOk = s.f && s.alive && s.target.toLowerCase() === String(s.hc.Id).toLowerCase();
    if (s.f && s.alive && !hcOk) { console.error('Skills 열이 다른 살아 있는 목록을 가리켜서 멈췄어요. 그 목록 ID를 알려 주세요: ' + s.target); return; }
    const title = (s.f && s.f.Title) || '사용 Skill';

    if (!hcOk) {
      // 1) 옛 열 지우기 (사라진 목록을 가리키는 경우만)
      if (s.f) {
        if (s.f.ReadOnlyField || s.f.Sealed) { await send(D, `${s.base}/fields/getbyinternalnameortitle('Skills')`, { __metadata: { type: 'SP.Field' }, ReadOnlyField: false, Sealed: false }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }); }
        await send(D, `${s.base}/fields/getbyinternalnameortitle('Skills')`, undefined, { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' });
        console.log('옛 Skills 열을 지웠어요.');
      }
      // 2) HubContents 를 가리키는 여러 값 조회 열로 다시 만들기 (내부 이름 Skills)
      const xml = `<Field Type="LookupMulti" Mult="TRUE" DisplayName="Skills" Name="Skills" StaticName="Skills" List="{${s.hc.Id}}" ShowField="Title" />`;
      await send(D, `${s.base}/fields/CreateFieldAsXml`, { parameters: { __metadata: { type: 'SP.XmlSchemaFieldCreationInformation' }, SchemaXml: xml, Options: 1 | 8 | 16 } });
      const nf = (await get(`${s.base}/fields?$filter=InternalName eq 'Skills'`)).results[0];
      if (!nf) { console.error('새 열을 찾지 못했어요. 목록 설정에서 확인해 주세요.'); return; }
      // 표시 이름을 원래대로
      if (title !== 'Skills') { await send(D, `${s.base}/fields/getbyinternalnameortitle('Skills')`, { __metadata: { type: 'SP.FieldLookup' }, Title: title }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }); }
      console.log(`✅ '${title}' 열을 HubContents를 가리키게 다시 만들었어요.`);
    }

    // 3) Skill 연결
    const agents = (await get(`${s.base}/items?$select=Id,Title,AgentName,OpsStatus&$top=5000`)).results;
    const skills = (await get(`${web}/_api/web/lists(guid'${s.hc.Id}')/items?$select=Id,Title,Kind&$top=5000`)).results.filter(x => x.Kind === 'Skill');
    const onHub = r => !!String(r.OpsStatus || '').trim() && !/중단|폐기/.test(r.OpsStatus) && !/_PENDING$/i.test(r.Title || '');
    const log = [];
    for (const name of Object.keys(LINKS)) {
      const rows = agents.filter(r => norm(r.AgentName || r.Title) === norm(name));
      const row = rows.filter(onHub)[0] || rows[0];
      if (!row) { log.push({ Agent: name, 결과: '❌ Agent를 찾지 못했어요' }); continue; }
      const ids = [], miss = [];
      LINKS[name].forEach(n => { const it = skills.filter(x => norm(x.Title) === norm(n))[0]; if (it) { ids.push(it.Id); } else { miss.push(n); } });
      if (!ids.length) { log.push({ Agent: name, 결과: '❌ Skill 이름을 못 찾았어요: ' + miss.join(', ') }); continue; }
      try {
        await send(D, `${s.base}/items(${row.Id})`, { __metadata: { type }, SkillsId: { __metadata: { type: 'Collection(Edm.Int32)' }, results: ids } }, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' });
        log.push({ Agent: name, 결과: `✅ ${ids.length}개 연결` + (miss.length ? ` (못 찾음: ${miss.join(', ')})` : '') });
      } catch (e) { log.push({ Agent: name, 결과: '❌ ' + e.message.split('\n')[0] }); }
    }
    console.table(log);
    if (log.some(x => x.결과.indexOf('Skill 이름') >= 0)) { console.log('HubContents 에 있는 Skill 이름:', skills.map(x => x.Title)); }
    console.log('Hub를 새로 고쳐 Agent 상세 정보 탭의 Skill을 확인해 보세요. 목록 편집 화면의 \'사용 Skill\'에서도 이제 Skill을 고를 수 있어요.');
  };
})();
