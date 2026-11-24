/*
 * Hub 이미지 확인 (브라우저 콘솔용, 읽기만 함 — 아무것도 바꾸지 않습니다)
 *
 * Hub에 보이는 Agent · Skill · HTML 항목마다 썸네일(thumb.*)과 '제작자는 이렇게 썼어요' 이미지(result1.* · result2.*)가
 * 첨부되어 있는지 표로 보여 줍니다.
 *   - Agent: AgentList (운영 상태가 비었거나 중단 · 폐기, _PENDING 항목은 Hub에 안 보여서 뺌)
 *   - Skill · HTML: HubContents (숨김 항목은 뺌)
 *
 * 쓰는 법: Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter
 */
(async () => {
  const web = _spPageContextInfo.webAbsoluteUrl;
  const J = { Accept: 'application/json;odata=verbose' };
  const get = async u => { const r = await fetch(u, { headers: J }); if (!r.ok) { throw new Error(r.status + ' ' + u.replace(web, '')); } return (await r.json()).d; };
  const all = async u => { let out = []; let next = u; while (next) { const d = await get(next); out = out.concat(d.results); next = d.__next; } return out; };
  const items = (list, cols) => all(web + "/_api/web/lists/getbytitle('" + list + "')/items?$select=" + cols + ",AttachmentFiles/FileName&$expand=AttachmentFiles&$top=500");
  const check = (kind, title, files) => {
    const names = (files.results || []).map(f => f.FileName);
    const has = re => names.filter(n => re.test(n))[0] || '';
    const t = has(/^thumb\./i), r1 = has(/^result-?1\./i), r2 = has(/^result-?2\./i);
    return { 종류: kind, 이름: title, 썸네일: t || '❌ 없음', 이미지1: r1 || '❌ 없음', 이미지2: r2 || '❌ 없음', ok: !!(t && r1 && r2) };
  };

  const rows = [];
  try {
    const agents = await items('AgentList', 'Id,Title,AgentName,OpsStatus');
    agents.filter(r => { const ops = String(r.OpsStatus || '').trim(); return ops && !/중단|폐기/.test(ops) && !/_PENDING$/i.test(r.Title || ''); })
      .forEach(r => rows.push(check('Agent', r.AgentName || r.Title, r.AttachmentFiles)));
  } catch (e) { console.warn('AgentList 를 읽지 못했어요:', e.message); }
  try {
    const contents = await items('HubContents', 'Id,Title,Kind,Hidden');
    contents.filter(r => r.Hidden !== true && (r.Kind === 'Skill' || r.Kind === 'HTML'))
      .forEach(r => rows.push(check(r.Kind, r.Title, r.AttachmentFiles)));
  } catch (e) { console.warn('HubContents 를 읽지 못했어요:', e.message); }

  const order = { Agent: 0, Skill: 1, HTML: 2 };
  rows.sort((a, b) => order[a.종류] - order[b.종류] || Number(a.ok) - Number(b.ok) || a.이름.localeCompare(b.이름));
  console.table(rows.map(({ ok, ...r }) => ({ ...r, 상태: ok ? '✅ 다 있음' : '⚠ 빠짐' })));
  const miss = rows.filter(r => !r.ok);
  ['Agent', 'Skill', 'HTML'].forEach(k => {
    const n = rows.filter(r => r.종류 === k).length;
    const m = miss.filter(r => r.종류 === k).length;
    console.log(k + ': ' + n + '개 중 ' + (n - m) + '개 다 있음' + (m ? ', ' + m + '개 빠짐' : ''));
  });
  if (miss.length) { console.log('빠진 항목:\n' + miss.map(r => ' - [' + r.종류 + '] ' + r.이름 + ' → ' + [r.썸네일, r.이미지1, r.이미지2].map((v, i) => /없음/.test(v) ? ['썸네일', '이미지1', '이미지2'][i] : '').filter(Boolean).join(', ')).join('\n')); }
  else { console.log('✅ 모든 항목에 썸네일과 이미지 2장이 다 있어요.'); }
})().catch(e => console.error('확인하다 멈췄어요:', e.message));
