/*
 * MUNIVERSE 시안 CSS → Hub 웹 파트용 CSS 변환 (Node로 실행)
 *
 *   node scripts/build-muniverse-css.js
 *
 * 입력
 *   - design/muniverse-mockup.css : 시안(MUNIVERSE 아티팩트)의 <style> 블록을 그대로 모은 것. 시안이 바뀌면 이 파일만 바꿉니다.
 *   - design/hub-overrides.css    : 시안에 없는 Hub 전용 화면 요소와 Hub에서 바꾼 부분. 시안 CSS 뒤에 붙습니다.
 * 출력
 *   - src/webparts/muniAgentHub/theme/muniverseCss.ts : 웹 파트가 화면에 넣는 CSS 문자열 (직접 고치지 마세요)
 *
 * 바꾸는 규칙 (시안과 같은 우선순위가 되도록)
 *   - :root · html · body  → 웹 파트 루트(.mv-root). 그 밖의 선택자는 모두 .mv-root 아래로
 *     (SharePoint 페이지의 다른 부분에 영향을 주지 않습니다)
 *   - :where(:root[data-theme=dark]) → .mv-root:where([data-theme=dark]) (시안의 우선순위 그대로)
 *   - #id → #mv-id (주소 #ideas 와 id가 같으면 브라우저가 그 위치로 스크롤하므로 앞에 mv- 를 붙입니다)
 *   - 화면 폭 @media → @container hub (웹 파트가 놓인 섹션 폭 기준)
 *   - 큰 그림(data: 주소)은 한 번만 넣고 변수로 다시 씁니다
 */
const fs = require('fs');
const path = require('path');
const postcss = require('postcss');
const sp = require('postcss-selector-parser');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'design', 'muniverse-mockup.css');
const OVR = path.join(ROOT, 'design', 'hub-overrides.css');
const OUT = path.join(ROOT, 'src', 'webparts', 'muniAgentHub', 'theme', 'muniverseCss.ts');
const R = 'mv-root';

const isRootNode = n => (n.type === 'pseudo' && n.value === ':root') || (n.type === 'tag' && (n.value === 'html' || n.value === 'body'));

/** 괄호 안(:is, :not, :where, :has)의 선택자: root → .mv-root, #id → #mv-id */
function inner(sel) {
  sel.walk(n => {
    if (n.type === 'id') { n.value = 'mv-' + n.value; }
    else if (isRootNode(n)) { n.replaceWith(sp.className({ value: R })); }
  });
}
/** :where(:root[...]) 처럼 root만 감싼 :where 인지 */
function whereRoot(n) {
  if (n.type !== 'pseudo' || n.value !== ':where' || n.nodes.length !== 1) { return false; }
  const first = n.nodes[0].nodes[0];
  return !!first && isRootNode(first) && !n.nodes[0].nodes.some(x => x.type === 'combinator');
}

function convertSelector(selector, inContainer) {
  return sp(root => {
    root.each(sel => {
      // 1) 맨 앞 compound 들 중 root 계열을 모읍니다
      const parts = [];
      let cur = [];
      sel.nodes.forEach(n => { if (n.type === 'combinator') { parts.push({ nodes: cur, comb: n }); cur = []; } else { cur.push(n); } });
      parts.push({ nodes: cur, comb: null });
      const rootish = p => p.nodes.some(n => isRootNode(n) || whereRoot(n));
      let k = 0;
      while (k < parts.length && rootish(parts[k])) { k++; }
      // 괄호 안 먼저 변환
      parts.forEach(p => p.nodes.forEach(n => {
        if (n.type === 'id') { n.value = 'mv-' + n.value; }
        if (n.type === 'pseudo' && n.nodes && n.nodes.length) {
          if (whereRoot(n)) {
            // :where(:root[data-theme=dark]) → :where([data-theme=dark]) (+ 앞에 .mv-root)
            const s0 = n.nodes[0];
            s0.nodes.filter(isRootNode).forEach(x => x.remove());
            if (!s0.nodes.length) { s0.append(sp.universal()); }
            s0.walk(x => { if (x.type === 'id') { x.value = 'mv-' + x.value; } });
          } else {
            n.nodes.forEach(inner);
          }
        }
      }));
      const out = [];
      if (k > 0) {
        // root 계열 compound 를 하나로: .mv-root + 나머지 조건
        const merged = [sp.className({ value: R })];
        for (let i = 0; i < k; i++) { parts[i].nodes.forEach(n => { if (!isRootNode(n)) { merged.push(n); } }); }
        out.push(...merged);
        if (k < parts.length) { out.push(parts[k - 1].comb || sp.combinator({ value: ' ' })); }
        else if (inContainer) { out.push(sp.combinator({ value: ' > ' }), sp.universal()); }
      } else {
        out.push(sp.className({ value: R }), sp.combinator({ value: ' ' }));
      }
      for (let i = k; i < parts.length; i++) {
        out.push(...parts[i].nodes);
        if (parts[i].comb && i < parts.length - 1) { out.push(parts[i].comb); }
      }
      sel.nodes.slice().forEach(n => n.remove());
      out.forEach(n => sel.append(n.clone ? n.clone() : n));
    });
  }).processSync(selector);
}

/** 폭만 묻는 @media → @container hub */
function mediaToContainer(params) {
  const p = params.replace(/^\s*(only\s+)?screen\s+and\s+/i, '').trim();
  const parts = p.split(/\s+and\s+/i);
  if (!parts.length || !parts.every(x => /^\(\s*(max|min)-width\s*:/i.test(x.trim()))) { return null; }
  return 'hub ' + parts.join(' and ');
}

function convert(css, label) {
  const root = postcss.parse(css, { from: label });
  // @media(폭) → @container
  root.walkAtRules('media', a => {
    const c = mediaToContainer(a.params);
    if (c) { a.name = 'container'; a.params = c; }
  });
  // 시안은 html 에 페이지 배경을 두고 body 는 투명하게 덮어씁니다(!important). Hub에서는 html 과 body 가 모두 웹 파트 루트이므로
  // body 자체를 고르는 규칙의 배경은 빼서 html 배경(라이트 흰색, 다크 우주색)이 남게 합니다
  const bodyItself = s => {
    let ok = false;
    try {
      sp(rt => {
        const sel = rt.nodes[0];
        const comps = [[]];
        sel.nodes.forEach(n => { if (n.type === 'combinator') { comps.push([]); } else { comps[comps.length - 1].push(n); } });
        const last = comps[comps.length - 1];
        const rootish = c => c.some(n => isRootNode(n) || whereRoot(n));
        ok = last.some(n => n.type === 'tag' && n.value === 'body') && comps.every(rootish);
      }).processSync(s);
    } catch (e) { ok = false; }
    return ok;
  };
  root.walkRules(r => {
    if (r.selectors.every(bodyItself)) { r.walkDecls(/^background/, d => d.remove()); if (!r.nodes.length) { r.remove(); } }
  });
  root.walkRules(r => {
    if (r.parent && r.parent.type === 'atrule' && /keyframes$/i.test(r.parent.name)) { return; }
    let inContainer = false;
    for (let p = r.parent; p; p = p.parent) { if (p.type === 'atrule' && p.name === 'container') { inContainer = true; } }
    try { r.selector = convertSelector(r.selector, inContainer); } catch (e) { console.warn('선택자 변환 실패:', r.selector.slice(0, 120), e.message); }
  });
  return root;
}

function main() {
  const mock = fs.readFileSync(SRC, 'utf8');
  const ovr = fs.existsSync(OVR) ? fs.readFileSync(OVR, 'utf8') : '';
  const a = convert(mock, 'muniverse-mockup.css');
  const b = convert(ovr, 'hub-overrides.css');
  let css = a.toResult().css + '\n/* ===== Hub 전용 (design/hub-overrides.css) ===== */\n' + b.toResult().css;
  // 큰 그림은 변수로 한 번만
  const imgs = [];
  css = css.replace(/url\(\s*(["']?)(data:[^"')]{4000,})\1\s*\)/g, (m, q, data) => {
    let i = imgs.indexOf(data);
    if (i < 0) { imgs.push(data); i = imgs.length - 1; }
    return `var(--mv-img${i})`;
  });
  const vars = imgs.map((d, i) => `--mv-img${i}:url("${d}")`).join(';');
  css = `.${R}{${vars}}\n` + css;
  // 주석·공백 줄이기
  css = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n+/g, '\n').replace(/[ \t]+\n/g, '\n');
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const ts = '/* 자동 생성 파일: scripts/build-muniverse-css.js 가 design/*.css 로 만듭니다. 직접 고치지 마세요. */\n' +
    '/* eslint-disable */\n' +
    `const css: string = ${JSON.stringify(css)};\nexport default css;\n`;
  fs.writeFileSync(OUT, ts);
  console.log(`완료: ${path.relative(ROOT, OUT)} (${Math.round(css.length / 1024)} KB, 그림 ${imgs.length}개)`);
}
main();
