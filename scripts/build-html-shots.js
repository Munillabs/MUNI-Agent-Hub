/*
 * HTML '제작자는 이렇게 썼어요' 이미지 올리기 코드 만들기 (node scripts/build-html-shots.js)
 *   samples/demo/shots/html/<이름>-1.jpg · <이름>-2.jpg 를 base64 로 넣어
 *   브라우저 콘솔용 scripts/upload-html-shots.js 를 만듭니다.
 *   그림 원본은 samples/demo/html 의 실제 도구를 띄워 캡처한 것입니다 (1장 = 첫 화면, 2장 = 결과 화면).
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlDir = path.join(root, 'samples/demo/html');
const shotDir = path.join(root, 'samples/demo/shots/html');
const titleOf = f => { const p = path.join(htmlDir, f); if (!fs.existsSync(p)) { return ''; } const m = /<title>([^<]+)<\/title>/i.exec(fs.readFileSync(p, 'utf8')); return m ? m[1].trim() : ''; };

const by = {};
fs.readdirSync(shotDir).forEach(f => {
  const m = /^(.+)-([12])\.jpg$/i.exec(f);
  if (!m) { return; }
  (by[m[1]] = by[m[1]] || []).push({ slot: Number(m[2]), ext: 'jpg', data: fs.readFileSync(path.join(shotDir, f)).toString('base64') });
});
const items = Object.keys(by).sort().map(base => ({ file: base + '.html', title: titleOf(base + '.html'), shots: by[base].sort((a, b) => a.slot - b.slot) }));

const body = `/*
 * HTML '제작자는 이렇게 썼어요' 이미지 한 번에 올리기 (브라우저 콘솔용) — node scripts/build-html-shots.js 로 만든 파일
 *
 * HubContents 의 HTML 항목마다 실제 도구 화면 2장(첫 화면 · 결과 화면)을 첨부 파일 result1.jpg · result2.jpg 로 넣습니다.
 * 항목 찾기: 첨부된 .html 파일 이름 → 없으면 제목으로
 * 들어 있는 도구 ${items.length}개:
${items.map(i => ` *   - ${i.title} (${i.file}) ${i.shots.length}장`).join('\n')}
 *
 * 쓰는 법 (Hub 코드를 먼저 배포한 다음에 하세요. 예전 코드는 result1.jpg 를 HTML 파일로 잘못 고릅니다)
 *   1. Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter
 *      → 화면 위에 항목별 2장 미리보기가 뜨고, Console 에 어느 항목에 넣을지 표가 나옵니다 (아무것도 안 바꿈)
 *   2. 미리보기의 [올리기] 또는 hubHtmlShots()  → 비어 있는 칸에만 넣기
 *      hubHtmlShots({ overwrite: true })   → 이미 있는 이미지도 바꾸기
 *   3. 되돌리기: hubHtmlShotsRemove() → 이 코드로 올린 이미지만 지웁니다
 */
(() => {
  const SHOTS = ${JSON.stringify(items)};
  const KEY = 'hubHtmlShotsDone';
  const web = _spPageContextInfo.webAbsoluteUrl;
  const J = { Accept: 'application/json;odata=verbose' };
  const norm = s => String(s || '').toLowerCase().replace(/[\\s_\\-·]/g, '');
  const get = async u => { const r = await fetch(u, { headers: J }); if (!r.ok) { throw new Error(r.status + ' ' + u.replace(web, '')); } return (await r.json()).d; };
  const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
  const att = (base, id, name) => base + '/items(' + id + ')/AttachmentFiles' + (name ? "('" + encodeURIComponent(name.replace(/'/g, "''")) + "')" : '');
  const bytes = b64 => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) { u[i] = s.charCodeAt(i); } return u.buffer; };
  const del = (base, id, name, D) => fetch(att(base, id, name), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' } });

  const plan = async () => {
    const lists = (await get(web + "/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder")).results;
    const hc = lists.filter(l => norm(l.Title) === 'hubcontents' || /\\/lists\\/hubcontents$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (!hc) { throw new Error('HubContents 목록을 찾지 못했어요'); }
    const base = web + "/_api/web/lists(guid'" + hc.Id + "')";
    const rows = (await get(base + "/items?$select=Id,Title,Kind,Hidden,AttachmentFiles/FileName&$expand=AttachmentFiles&$filter=Kind eq 'HTML'&$top=5000")).results.filter(r => r.Hidden !== true);
    const out = rows.map(r => {
      const files = (r.AttachmentFiles.results || []).map(f => f.FileName);
      const html = files.filter(f => /\\.html?$/i.test(f));
      const s = SHOTS.filter(x => html.some(f => f.toLowerCase().endsWith(x.file.toLowerCase())))[0] || SHOTS.filter(x => norm(x.title) === norm(r.Title))[0];
      const old = {};
      files.forEach(f => { const m = /^result-?([12])\\./i.exec(f); if (m) { old[m[1]] = f; } });
      return { id: r.Id, title: r.Title, item: s, old };
    });
    return { base, out };
  };

  /* 미리보기 창: Hub의 HTML 항목마다 넣을 2장 (이미 있는 칸은 흐리게) */
  const panel = out => {
    const old = document.getElementById('hub-hshot-panel'); if (old) { old.remove(); }
    const FONT = '"Pretendard","Segoe UI","Malgun Gothic",sans-serif';
    const p = document.createElement('div'); p.id = 'hub-hshot-panel';
    p.style.cssText = 'position:fixed;inset:24px;z-index:2147483000;background:#0f1b2b;color:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:auto;padding:20px 24px;font:14px ' + FONT;
    const head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;position:sticky;top:-20px;background:#0f1b2b;padding:8px 0;z-index:1';
    head.innerHTML = '<b style="font-size:18px;flex:1">HTML \\'제작자는 이렇게 썼어요\\' 이미지 미리보기 (' + out.filter(x => x.item).length + '개 × 2장)</b>';
    const up = document.createElement('button'); up.textContent = '올리기 (비어 있는 칸만)';
    const close = document.createElement('button'); close.textContent = '닫기';
    [up, close].forEach(b => { b.style.cssText = 'border:0;border-radius:999px;padding:8px 16px;font-weight:700;cursor:pointer;background:#2b8fd6;color:#fff'; });
    close.style.background = '#40506a';
    up.onclick = () => { up.disabled = true; up.textContent = '올리는 중…'; window.hubHtmlShots().then(() => { up.textContent = '완료 — Hub를 새로 고쳐 보세요'; }, e => { up.textContent = '실패: ' + e.message; }); };
    close.onclick = () => p.remove();
    head.append(up, close); p.append(head);
    out.forEach(x => {
      const cap = document.createElement('div'); cap.style.cssText = 'margin:0 0 20px;opacity:.85';
      const has = Object.keys(x.old).map(k => x.old[k]);
      if (!x.item) { cap.textContent = x.title + ' — 캡처 없음, 건너뜀'; p.append(cap); return; }
      const row = document.createElement('div'); row.style.cssText = 'display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:6px';
      x.item.shots.forEach(s => {
        const img = document.createElement('img'); img.src = 'data:image/' + (s.ext === 'png' ? 'png' : 'jpeg') + ';base64,' + s.data;
        img.style.cssText = 'width:100%;height:auto;border-radius:10px;display:block;background:#fff' + (x.old[s.slot] ? ';opacity:.45' : '');
        row.append(img);
      });
      cap.textContent = x.title + ' (' + x.item.file + ')' + (has.length ? ' — 이미 있음(' + has.join(', ') + '), 그 칸은 건너뜀' : '');
      p.append(row, cap);
    });
    document.body.append(p);
  };

  let state;
  (async () => {
    state = await plan();
    console.table(state.out.map(p => ({ HTML: p.title, 넣을_이미지: p.item ? p.item.file + ' · ' + p.item.shots.length + '장' : '— (캡처 없음)', 지금: Object.keys(p.old).map(k => p.old[k]).join(', ') || '없음' })));
    panel(state.out);
    console.log('미리보기의 [올리기] 또는 hubHtmlShots()  /  있는 이미지까지 바꾸려면 hubHtmlShots({ overwrite: true })');
  })().catch(e => console.error('확인하다 멈췄어요:', e.message));

  window.hubHtmlShots = async opt => {
    const overwrite = !!(opt && opt.overwrite);
    const { base, out } = state || await plan();
    const D = await digest();
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    const log = [];
    for (const p of out) {
      if (!p.item) { log.push({ HTML: p.title, 결과: '건너뜀 (캡처 없음)' }); continue; }
      const res = [];
      for (const s of p.item.shots) {
        const was = p.old[s.slot];
        if (was && !overwrite) { res.push(s.slot + '장 건너뜀'); continue; }
        try {
          if (was) { const r = await del(base, p.id, was, D); if (!r.ok) { throw new Error('예전 이미지 지우기 실패 ' + r.status); } }
          const name = 'result' + s.slot + '.' + s.ext;
          const r = await fetch(att(base, p.id) + "/add(FileName='" + name + "')", { method: 'POST', headers: { ...J, 'X-RequestDigest': D }, body: bytes(s.data) });
          if (!r.ok) { throw new Error(r.status + ' ' + (await r.text()).slice(0, 120)); }
          p.old[s.slot] = name;
          if (!done.some(d => d.id === p.id && d.name === name)) { done.push({ id: p.id, name }); }
          res.push('✅ ' + name);
        } catch (e) { res.push('❌ ' + s.slot + '장 ' + e.message); }
      }
      log.push({ HTML: p.title, 결과: res.join(' / ') });
    }
    localStorage.setItem(KEY, JSON.stringify(done));
    console.table(log);
    console.log('Hub를 새로 고쳐 HTML 상세를 확인해 보세요. 되돌리려면 hubHtmlShotsRemove()');
  };

  window.hubHtmlShotsRemove = async () => {
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!done.length) { console.log('이 코드로 올린 이미지 기록이 없어요.'); return; }
    const { base } = state || await plan();
    const D = await digest();
    for (const d of done) {
      const r = await del(base, d.id, d.name, D);
      console.log('항목 ' + d.id + ' ' + d.name + ': ' + (r.ok ? '지움' : '실패 ' + r.status));
    }
    localStorage.removeItem(KEY);
  };
})();
`;
fs.writeFileSync(path.join(root, 'scripts/upload-html-shots.js'), body, 'utf8');
console.log(`완료: scripts/upload-html-shots.js (${Math.round(body.length / 1024)} KB, 도구 ${items.length}개)`);
items.forEach(i => console.log(` - ${i.title} ← ${i.file} (${i.shots.length}장)`));
