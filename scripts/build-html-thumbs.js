/*
 * HTML 썸네일 올리기 코드 만들기 (node scripts/build-html-thumbs.js)
 *   samples/demo/thumbs/html/*.jpg (+ agent-tool-picker-thumb.png) 를 base64 로 넣어
 *   브라우저 콘솔용 scripts/upload-html-thumbs.js 를 만듭니다.
 *   그림 원본은 samples/demo/html 의 실제 도구 화면을 캡처한 것입니다.
 */
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname, '..');
const htmlDir = path.join(root, 'samples/demo/html');
const thumbDir = path.join(root, 'samples/demo/thumbs/html');
const titleOf = f => { const m = /<title>([^<]+)<\/title>/i.exec(fs.readFileSync(path.join(htmlDir, f), 'utf8')); return m ? m[1].trim() : ''; };

const items = [];
fs.readdirSync(thumbDir).filter(f => /\.jpg$/i.test(f)).sort().forEach(f => {
  const base = f.replace(/\.jpg$/i, '');
  items.push({ file: base + '.html', title: titleOf(base + '.html'), ext: 'jpg', data: fs.readFileSync(path.join(thumbDir, f)).toString('base64') });
});
const picker = path.join(root, 'samples/demo/thumbs/agent-tool-picker-thumb.png');
if (fs.existsSync(picker)) {
  items.push({ file: 'agent-tool-picker.html', title: titleOf('agent-tool-picker.html'), ext: 'png', data: fs.readFileSync(picker).toString('base64') });
}

const body = `/*
 * HTML 썸네일 한 번에 올리기 (브라우저 콘솔용) — node scripts/build-html-thumbs.js 로 만든 파일
 *
 * HubContents 의 HTML 항목마다 실제 도구 화면을 캡처한 썸네일을 첨부 파일 thumb.jpg(.png) 로 넣습니다.
 * 항목 찾기: 첨부된 .html 파일 이름 → 없으면 제목으로
 * 들어 있는 썸네일 ${items.length}개:
${items.map(i => ` *   - ${i.title} (${i.file})`).join('\n')}
 *
 * 쓰는 법
 *   1. Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter → 어느 항목에 넣을지 표만 보여 줍니다 (아무것도 안 바꿈)
 *   2. hubHtmlThumbs()                      → 썸네일이 없는 항목에만 넣기
 *      hubHtmlThumbs({ overwrite: true })   → 이미 있는 썸네일도 바꾸기
 *   3. 되돌리기: hubHtmlThumbsRemove() → 이 코드로 올린 썸네일만 지웁니다
 */
(() => {
  const THUMBS = ${JSON.stringify(items.map(i => ({ file: i.file, title: i.title, ext: i.ext, data: i.data })))};
  const KEY = 'hubHtmlThumbsDone';
  const web = _spPageContextInfo.webAbsoluteUrl;
  const J = { Accept: 'application/json;odata=verbose' };
  const norm = s => String(s || '').toLowerCase().replace(/[\\s_\\-·]/g, '');
  const get = async u => { const r = await fetch(u, { headers: J }); if (!r.ok) { throw new Error(r.status + ' ' + u.replace(web, '')); } return (await r.json()).d; };
  const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
  const att = (base, id, name) => base + '/items(' + id + ')/AttachmentFiles' + (name ? "('" + encodeURIComponent(name.replace(/'/g, "''")) + "')" : '');
  const bytes = b64 => { const s = atob(b64); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) { u[i] = s.charCodeAt(i); } return u.buffer; };

  const plan = async () => {
    const lists = (await get(web + "/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder")).results;
    const hc = lists.filter(l => norm(l.Title) === 'hubcontents' || /\\/lists\\/hubcontents$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (!hc) { throw new Error('HubContents 목록을 찾지 못했어요'); }
    const base = web + "/_api/web/lists(guid'" + hc.Id + "')";
    const rows = (await get(base + "/items?$select=Id,Title,Kind,Hidden,AttachmentFiles/FileName&$expand=AttachmentFiles&$filter=Kind eq 'HTML'&$top=5000")).results.filter(r => r.Hidden !== true);
    const out = rows.map(r => {
      const files = (r.AttachmentFiles.results || []).map(f => f.FileName);
      const html = files.filter(f => /\\.html?$/i.test(f));
      const t = THUMBS.filter(x => html.some(f => f.toLowerCase().endsWith(x.file.toLowerCase())))[0] || THUMBS.filter(x => norm(x.title) === norm(r.Title))[0];
      return { id: r.Id, title: r.Title, thumb: t, old: files.filter(f => /^thumb\\./i.test(f))[0] || '' };
    });
    return { base, out };
  };

  let state;
  (async () => {
    state = await plan();
    console.table(state.out.map(p => ({ HTML: p.title, 넣을_썸네일: p.thumb ? p.thumb.file : '— (캡처 없음)', 지금: p.old || '없음' })));
    const n = state.out.filter(p => p.thumb && !p.old).length, m = state.out.filter(p => p.thumb && p.old).length;
    console.log('썸네일 없는 항목 ' + n + '개에 넣으려면 hubHtmlThumbs()  /  이미 있는 ' + m + '개까지 바꾸려면 hubHtmlThumbs({ overwrite: true })');
  })().catch(e => console.error('확인하다 멈췄어요:', e.message));

  window.hubHtmlThumbs = async opt => {
    const overwrite = !!(opt && opt.overwrite);
    const { base, out } = state || await plan();
    const D = await digest();
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    const log = [];
    for (const p of out) {
      if (!p.thumb) { log.push({ HTML: p.title, 결과: '건너뜀 (캡처 없음)' }); continue; }
      if (p.old && !overwrite) { log.push({ HTML: p.title, 결과: '건너뜀 (이미 ' + p.old + ')' }); continue; }
      try {
        if (p.old) {
          const r = await fetch(att(base, p.id, p.old), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' } });
          if (!r.ok) { throw new Error('예전 썸네일 지우기 실패 ' + r.status); }
        }
        const name = 'thumb.' + p.thumb.ext;
        const r = await fetch(att(base, p.id) + "/add(FileName='" + name + "')", { method: 'POST', headers: { ...J, 'X-RequestDigest': D }, body: bytes(p.thumb.data) });
        if (!r.ok) { throw new Error(r.status + ' ' + (await r.text()).slice(0, 160)); }
        p.old = name;
        if (!done.some(d => d.id === p.id)) { done.push({ id: p.id, name }); }
        log.push({ HTML: p.title, 결과: '✅ ' + name });
      } catch (e) { log.push({ HTML: p.title, 결과: '❌ ' + e.message }); }
    }
    localStorage.setItem(KEY, JSON.stringify(done));
    console.table(log);
    console.log('Hub를 새로 고쳐 HTML 카드를 확인해 보세요. 되돌리려면 hubHtmlThumbsRemove()');
  };

  window.hubHtmlThumbsRemove = async () => {
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!done.length) { console.log('이 코드로 올린 썸네일 기록이 없어요.'); return; }
    const { base } = state || await plan();
    const D = await digest();
    for (const d of done) {
      const r = await fetch(att(base, d.id, d.name), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' } });
      console.log('항목 ' + d.id + ': ' + (r.ok ? '지움' : '실패 ' + r.status));
    }
    localStorage.removeItem(KEY);
  };
})();
`;
fs.writeFileSync(path.join(root, 'scripts/upload-html-thumbs.js'), body, 'utf8');
console.log(`완료: scripts/upload-html-thumbs.js (${Math.round(body.length / 1024)} KB, 썸네일 ${items.length}개)`);
items.forEach(i => console.log(` - ${i.title} ← ${i.file}`));
