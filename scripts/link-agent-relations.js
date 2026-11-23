/*
 * MUNIVERSE 데모 — Agent 상세 정보 탭의 '연결된 Agent' · 'Skill' 채우기 (브라우저 콘솔용)
 *
 * AgentList 의 조회 열 두 개에 값을 넣습니다.
 *   - LinkedAgents (연결된 Agent) : AgentList 의 다른 Agent
 *   - Skills       (Skill)        : HubContents 의 Skill
 * 이름으로 번호를 찾아 넣고, 못 찾은 이름과 그 목록에 있는 이름을 표로 보여 줍니다.
 *
 * 쓰는 법
 *   1. 아래 AGENT_NAME · LINKS 를 필요하면 고칩니다.
 *   2. Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter.
 *   3. 되돌리려면 Console 에 hubLinkRestore() 입력.
 */
(() => {
  const AGENT_NAME = '인사 규정 Q&A';
  const LINKS = {
    LinkedAgents: ['사내 규정 도우미', '사내 전문가 찾기'],
    Skills: ['데이터 과다 공유(오버셰어링) 점검', '변화관리 커뮤니케이션 플랜 (ADKAR)']
  };

  (async () => {
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const get = async url => { const r = await fetch(url, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`); } return (await r.json()).d; };
    const merge = async (url, body) => {
      const r = await fetch(url, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' }, body: JSON.stringify(body) });
      if (!r.ok) { throw new Error(`${r.status} ${(await r.text()).slice(0, 300)}`); }
    };
    const norm = s => String(s || '').toLowerCase().replace(/[\s_\-·]/g, '');

    // AgentList 찾기
    const lists = (await get(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`)).results;
    const al = lists.filter(l => norm(l.Title) === 'agentlist' || /\/lists\/agentlist$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (!al) { console.error('AgentList 목록을 찾지 못했어요.'); return; }
    const base = `${web}/_api/web/lists(guid'${al.Id}')`;
    const type = (await get(`${base}?$select=ListItemEntityTypeFullName`)).ListItemEntityTypeFullName;

    // 대상 Agent 찾기 (Hub에 보이는 행 먼저)
    const rows = (await get(`${base}/items?$select=Id,Title,AgentName,OpsStatus&$top=5000`)).results;
    const same = r => norm(r.AgentName || r.Title) === norm(AGENT_NAME);
    const onHub = r => !!String(r.OpsStatus || '').trim() && !/중단|폐기/.test(r.OpsStatus) && !/_PENDING$/i.test(r.Title || '');
    const row = rows.filter(r => same(r) && onHub(r))[0] || rows.filter(same)[0];
    if (!row) { console.error(`'${AGENT_NAME}' Agent를 찾지 못했어요.`); return; }

    // 조회 열 정보 (전체 속성을 받으려고 $select 없이 읽음)
    const fieldRows = (await get(`${base}/fields?$filter=${Object.keys(LINKS).map(k => `InternalName eq '${k}'`).join(' or ')}`)).results;
    const log = [];
    const backup = { base, type, id: row.Id, fields: {} };

    for (const col of Object.keys(LINKS)) {
      const f = fieldRows.filter(x => x.InternalName === col)[0];
      if (!f) { log.push({ 열: col, 결과: '❌ AgentList에 이 열이 없어요', 연결: '', '못 찾은 이름': LINKS[col].join(', ') }); continue; }
      try {
        const tId = String(f.LookupList || '').replace(/[{}]/g, '');
        if (!tId) { throw new Error('조회 열이 가리키는 목록을 알 수 없어요'); }
        const target = `${web}/_api/web/lists(guid'${tId}')`;
        const tInfo = await get(`${target}?$select=Title`);
        const show = f.LookupField || 'Title';
        const items = (await get(`${target}/items?$select=Id,Title,${show === 'Title' ? '' : show + ','}Kind&$top=5000`).catch(() => get(`${target}/items?$select=Id,Title${show === 'Title' ? '' : ',' + show}&$top=5000`))).results;
        const found = [], missing = [];
        LINKS[col].forEach(n => {
          const it = items.filter(x => norm(x[show]) === norm(n) || norm(x.Title) === norm(n))[0];
          if (it) { found.push(it.Id); } else { missing.push(n); }
        });
        // 지금 값 (되돌리기용)
        const cur = await get(`${base}/items(${row.Id})?$select=${col}Id`).catch(() => ({}));
        const old = cur[col + 'Id'];
        backup.fields[col + 'Id'] = f.AllowMultipleValues ? { results: (old && old.results) || [] } : (old || null);
        if (!found.length) {
          log.push({ 열: col, 결과: `❌ '${tInfo.Title}' 목록에서 이름을 하나도 못 찾았어요`, 연결: '', '못 찾은 이름': missing.join(', ') });
          console.log(`'${tInfo.Title}' 목록에 있는 이름 (${show}):`, items.map(x => x[show]).filter(Boolean));
          continue;
        }
        const v = {};
        v[col + 'Id'] = f.AllowMultipleValues ? { __metadata: { type: 'Collection(Edm.Int32)' }, results: found } : found[0];
        await merge(`${base}/items(${row.Id})`, { __metadata: { type }, ...v });
        log.push({ 열: col, 결과: `✅ ${f.AllowMultipleValues ? found.length : 1}개 연결`, 연결: `${tInfo.Title} · ID ${found.join(', ')}`, '못 찾은 이름': missing.join(', ') });
        if (missing.length) { console.log(`'${tInfo.Title}' 목록에 있는 이름 (${show}):`, items.map(x => x[show]).filter(Boolean)); }
      } catch (e) {
        log.push({ 열: col, 결과: '❌ ' + e.message.split('\n')[0], 연결: '', '못 찾은 이름': '' });
      }
    }
    try { localStorage.setItem('hubLinkBackup', JSON.stringify(backup)); } catch (e) { /* 무시 */ }
    console.log(`Agent '${AGENT_NAME}' (AgentList ID ${row.Id})`);
    console.table(log);
    console.log(log.every(x => x.결과.startsWith('✅')) ? '✅ 연결했어요. Hub를 새로 고쳐 상세 정보 탭을 확인해 보세요.' : '⚠️ 일부를 연결하지 못했어요. 위 표를 보내 주세요.');
    console.log('되돌릴 때는 hubLinkRestore() 를 입력하세요.');
  })().catch(e => console.error('중간에 멈췄어요:', e.message));

  window.hubLinkRestore = async () => {
    const b = JSON.parse(localStorage.getItem('hubLinkBackup') || 'null');
    if (!b) { console.log('되돌릴 값이 없어요.'); return; }
    const web = _spPageContextInfo.webAbsoluteUrl;
    const J = { Accept: 'application/json;odata=verbose' };
    const D = (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
    const f = {};
    Object.keys(b.fields).forEach(k => { const v = b.fields[k]; f[k] = v && v.results ? { __metadata: { type: 'Collection(Edm.Int32)' }, results: v.results } : v; });
    const r = await fetch(`${b.base}/items(${b.id})`, { method: 'POST', headers: { ...J, 'Content-Type': 'application/json;odata=verbose', 'X-RequestDigest': D, 'IF-MATCH': '*', 'X-HTTP-Method': 'MERGE' }, body: JSON.stringify({ __metadata: { type: b.type }, ...f }) });
    console.log(r.ok ? '되돌렸어요.' : '되돌리지 못했어요 ' + r.status);
  };
})();
