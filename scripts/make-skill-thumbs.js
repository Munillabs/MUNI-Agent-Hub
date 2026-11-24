/*
 * Skill 썸네일 한 번에 만들기 (브라우저 콘솔용)
 *
 * HubContents 의 Skill마다 썸네일 그림(1200×480)을 브라우저에서 그려, 그 항목의 첨부 파일 thumb.png 로 올립니다.
 * 그림: 왼쪽 = 종류 · 이름 · 한 줄 소개 · 활용 도구 / 오른쪽 = 그 Skill이 만들어 주는 화면 예시
 *       종류(Category)마다 색과 화면 모양이 다릅니다
 *         체크리스트 = 초록 · 점검표 / 양식 = 파랑 · 작성 양식 / 업무 절차 = 주황 · 단계 흐름
 *         참조 자료 = 보라 · 자료 목록 / 규칙 = 빨강 · 해요 · 피해요 / 그 밖 = 청록 · 문서
 *       화면 안의 글은 Skill의 '이럴 때 써요'(Does) 줄을 씁니다
 *
 * 쓰는 법
 *   1. Hub 사이트에서 F12 → Console 에 이 파일 전체를 붙여 넣고 Enter
 *      → 화면 위에 모든 Skill 썸네일 미리보기가 뜹니다 (아직 아무것도 안 올림)
 *   2. 미리보기 창의 [올리기] 버튼을 누르거나 Console 에 hubSkillThumbs() 입력
 *      - 이미 썸네일(thumb.*)이 있는 Skill은 건너뜁니다
 *      - 있는 썸네일도 바꾸려면 hubSkillThumbs({ overwrite: true })
 *   3. 되돌리기: hubSkillThumbsRemove() → 이 코드로 올린 thumb.png 만 지웁니다
 *      (덮어쓴 경우 예전 썸네일은 돌아오지 않아요)
 */
(() => {
  const W = 1200, H = 480;
  const FONT = '"Pretendard","Segoe UI","Malgun Gothic","Apple SD Gothic Neo",sans-serif';
  const KEY = 'hubSkillThumbsDone';

  /* ---------- 종류별 색 · 화면 ---------- */
  // a: 강조색, d: 진한 글자색, soft: 연한 바탕, bg: 배경 그라데이션
  const CATS = {
    '체크리스트': { a: '#12b76a', d: '#067647', soft: '#dcfae6', bg: ['#f0fdf5', '#c9f5da'], head: '점검 체크리스트', mock: 'check' },
    '양식': { a: '#2e6cf6', d: '#1849a9', soft: '#e0eaff', bg: ['#f2f6ff', '#cfdcff'], head: '작성 양식', mock: 'form' },
    '업무 절차': { a: '#ef6820', d: '#b93815', soft: '#ffead5', bg: ['#fff8f1', '#ffd9bd'], head: '진행 단계', mock: 'steps' },
    '참조 자료': { a: '#7a5af8', d: '#5925dc', soft: '#ebe9fe', bg: ['#f7f5ff', '#dcd4fe'], head: '참조 자료', mock: 'ref' },
    '규칙': { a: '#e5484d', d: '#b42318', soft: '#ffe4e6', bg: ['#fff5f6', '#ffd2d7'], head: '작성 규칙', mock: 'rules' }
  };
  const OTHER = { a: '#0e9fb7', d: '#0e7090', soft: '#d5f5fa', bg: ['#f0fcfe', '#c5eef6'], head: 'Skill 지침', mock: 'doc' };
  const catOf = s => CATS[s.kind] || OTHER;
  const INK = '#101828', INK2 = '#475467', LINE = '#e4e7ec';
  const DEFAULT_LINES = {
    check: ['공유 범위와 권한 확인', '외부 공유 링크 점검', '민감 정보 라벨 확인', '담당자와 조치 기한 지정', '결과 보고서 정리'],
    form: ['제목과 목적', '참석자 · 담당자', '결정 사항', '다음 할 일'],
    steps: ['자료 모으기', '초안 작성', '검토 · 보완', '공유하기'],
    ref: ['기본 개념 정리', '자주 묻는 질문', '사례 모음', '용어 사전'],
    rules: ['결론을 먼저 적어요', '근거 문서를 표시해요', '숫자는 단위와 함께', '추측은 쓰지 않아요'],
    doc: ['목적과 쓰는 때', '입력 · 출력 형식', '답변 규칙', '예시']
  };

  /* ---------- 그리기 도구 ---------- */
  const rr = (c, x, y, w, h, r) => { c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); };
  const fillRR = (c, x, y, w, h, r, color) => { c.fillStyle = color; rr(c, x, y, w, h, r); c.fill(); };
  const fit = (c, t, max) => { if (c.measureText(t).width <= max) { return t; } while (t.length && c.measureText(t + '…').width > max) { t = t.slice(0, -1); } return t + '…'; };
  const text = (c, t, x, y, font, color, max, align) => { c.font = font; c.fillStyle = color; c.textAlign = align || 'left'; c.textBaseline = 'middle'; c.fillText(max ? fit(c, t, max) : t, x, y); return c.measureText(t).width; };
  // 글자 폭에 맞춰 줄 나누기 (띄어쓰기 기준, 너무 긴 낱말은 글자 단위, 넘치면 …)
  const wrap = (c, t, max, lines) => {
    const out = []; let cur = '';
    for (const w of t.split(/(\s+)/).filter(x => x.length)) {
      if (c.measureText((cur + w).trim()).width <= max) { cur += w; continue; }
      if (cur.trim()) { out.push(cur.trim()); cur = ''; }
      if (c.measureText(w).width <= max) { cur = w; continue; }
      for (const ch of w) { if (c.measureText(cur + ch).width > max) { out.push(cur); cur = ''; } cur += ch; }
    }
    if (cur.trim()) { out.push(cur.trim()); }
    if (out.length > lines) { const k = out.slice(0, lines); k[lines - 1] = fit(c, k[lines - 1] + '…', max).replace(/……$/, '…'); return k; }
    return out;
  };
  const checkMark = (c, x, y, s, color) => { c.strokeStyle = color; c.lineWidth = s * 0.16; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); c.moveTo(x - s * 0.28, y); c.lineTo(x - s * 0.06, y + s * 0.22); c.lineTo(x + s * 0.3, y - s * 0.22); c.stroke(); };
  const xMark = (c, x, y, s, color) => { c.strokeStyle = color; c.lineWidth = s * 0.16; c.lineCap = 'round'; c.beginPath(); c.moveTo(x - s * 0.22, y - s * 0.22); c.lineTo(x + s * 0.22, y + s * 0.22); c.moveTo(x + s * 0.22, y - s * 0.22); c.lineTo(x - s * 0.22, y + s * 0.22); c.stroke(); };
  const bar = (c, x, y, w, color) => fillRR(c, x, y - 5, w, 10, 5, color);

  /* ---------- 오른쪽 화면 예시 (종류별) ---------- */
  const MOCKS = {
    check(c, k, L, x, y, w) {
      const done = Math.min(3, L.length - 1);
      text(c, `진행 ${done}/${L.length}`, x, y + 12, `700 18px ${FONT}`, INK2);
      fillRR(c, x + 110, y + 6, w - 110, 12, 6, '#f2f4f7'); fillRR(c, x + 110, y + 6, (w - 110) * done / L.length, 12, 6, k.a);
      L.slice(0, 5).forEach((t, i) => {
        const ry = y + 58 + i * 56, ok = i < done;
        fillRR(c, x, ry - 22, w, 44, 10, ok ? '#fff' : '#f9fafb');
        c.strokeStyle = LINE; c.lineWidth = 1.5; rr(c, x, ry - 22, w, 44, 10); c.stroke();
        if (ok) { fillRR(c, x + 14, ry - 12, 24, 24, 7, k.a); checkMark(c, x + 26, ry, 22, '#fff'); }
        else { c.strokeStyle = '#d0d5dd'; c.lineWidth = 2; rr(c, x + 14, ry - 12, 24, 24, 7); c.stroke(); }
        text(c, t, x + 52, ry, `600 18px ${FONT}`, ok ? INK2 : INK, w - 170);
        const tag = ok ? '완료' : '확인 필요', tw = ok ? 58 : 92;
        fillRR(c, x + w - tw - 12, ry - 15, tw, 30, 15, ok ? k.soft : '#fef0c7');
        text(c, tag, x + w - tw / 2 - 12, ry, `700 15px ${FONT}`, ok ? k.d : '#b54708', 0, 'center');
      });
    },
    form(c, k, L, x, y, w) {
      L.slice(0, 4).forEach((t, i) => {
        const ry = y + i * 74;
        text(c, t, x, ry + 10, `700 16px ${FONT}`, INK2, w);
        fillRR(c, x, ry + 26, w, 38, 9, '#fff'); c.strokeStyle = i === 1 ? k.a : LINE; c.lineWidth = i === 1 ? 2.5 : 1.5; rr(c, x, ry + 26, w, 38, 9); c.stroke();
        bar(c, x + 14, ry + 45, [0.62, 0.4, 0.74, 0.5][i] * w, i === 1 ? k.soft : '#eaecf0');
        if (i === 1) { fillRR(c, x + 14 + 0.4 * w + 6, ry + 34, 2.5, 22, 1, k.a); }
      });
      fillRR(c, x + w - 150, y + 300, 150, 42, 10, k.a); text(c, '작성 완료', x + w - 75, y + 321, `700 17px ${FONT}`, '#fff', 0, 'center');
      fillRR(c, x + w - 262, y + 300, 100, 42, 10, '#f2f4f7'); text(c, '미리보기', x + w - 212, y + 321, `700 17px ${FONT}`, INK2, 0, 'center');
    },
    steps(c, k, L, x, y, w) {
      const n = Math.min(4, L.length), cur = Math.min(2, n - 1);
      c.strokeStyle = '#eaecf0'; c.lineWidth = 4; c.beginPath(); c.moveTo(x + 22, y + 22); c.lineTo(x + 22, y + 22 + (n - 1) * 84); c.stroke();
      c.strokeStyle = k.a; c.beginPath(); c.moveTo(x + 22, y + 22); c.lineTo(x + 22, y + 22 + cur * 84); c.stroke();
      L.slice(0, n).forEach((t, i) => {
        const ry = y + 22 + i * 84, st = i < cur ? 'done' : i === cur ? 'now' : 'todo';
        c.beginPath(); c.arc(x + 22, ry, 20, 0, Math.PI * 2); c.fillStyle = st === 'todo' ? '#fff' : k.a; c.fill();
        if (st === 'todo') { c.strokeStyle = '#d0d5dd'; c.lineWidth = 2.5; c.stroke(); }
        if (st === 'now') { c.beginPath(); c.arc(x + 22, ry, 27, 0, Math.PI * 2); c.strokeStyle = k.soft; c.lineWidth = 6; c.stroke(); }
        if (st === 'done') { checkMark(c, x + 22, ry, 24, '#fff'); } else { text(c, String(i + 1), x + 22, ry + 1, `800 17px ${FONT}`, st === 'now' ? '#fff' : INK2, 0, 'center'); }
        text(c, t, x + 60, ry - 10, `700 19px ${FONT}`, st === 'todo' ? INK2 : INK, w - 150);
        bar(c, x + 60, ry + 16, [0.55, 0.42, 0.5, 0.36][i] * (w - 60), '#eaecf0');
        if (st === 'now') { fillRR(c, x + w - 76, ry - 24, 76, 28, 14, k.soft); text(c, '진행 중', x + w - 38, ry - 10, `700 14px ${FONT}`, k.d, 0, 'center'); }
      });
    },
    ref(c, k, L, x, y, w) {
      fillRR(c, x, y, w, 42, 21, '#f2f4f7');
      c.beginPath(); c.arc(x + 26, y + 20, 8, 0, Math.PI * 2); c.strokeStyle = '#98a2b3'; c.lineWidth = 2.5; c.stroke();
      c.beginPath(); c.moveTo(x + 32, y + 26); c.lineTo(x + 38, y + 32); c.stroke();
      text(c, '무엇이든 찾아보세요', x + 50, y + 21, `500 16px ${FONT}`, '#98a2b3');
      L.slice(0, 4).forEach((t, i) => {
        const ry = y + 66 + i * 70, on = i === 0;
        if (on) { fillRR(c, x - 8, ry - 6, w + 16, 62, 12, k.soft); }
        fillRR(c, x + 4, ry + 4, 38, 38, 10, on ? k.a : '#f2f4f7');
        [0, 1, 2].forEach(j => fillRR(c, x + 13, ry + 14 + j * 7, j === 2 ? 12 : 20, 3, 1.5, on ? '#fff' : '#98a2b3'));
        text(c, t, x + 56, ry + 13, `700 18px ${FONT}`, on ? k.d : INK, w - 70);
        bar(c, x + 56, ry + 36, [0.6, 0.5, 0.66, 0.44][i] * (w - 70), on ? '#fff' : '#eaecf0');
      });
    },
    rules(c, k, L, x, y, w) {
      const half = Math.ceil(Math.min(4, L.length) / 2), cols = [['이렇게 해요', L.slice(0, half), true], ['이건 피해요', L.slice(half, 4), false]];
      cols.forEach(([h, rows, good], ci) => {
        const by = y + ci * 172;
        fillRR(c, x, by, w, 156, 14, good ? '#ecfdf3' : '#fff1f3');
        text(c, h, x + 18, by + 26, `800 17px ${FONT}`, good ? '#067647' : '#b42318');
        (rows.length ? rows : ['—']).forEach((t, i) => {
          const ry = by + 66 + i * 50;
          fillRR(c, x + 14, ry - 20, w - 28, 40, 10, '#fff');
          c.beginPath(); c.arc(x + 36, ry, 11, 0, Math.PI * 2); c.fillStyle = good ? '#12b76a' : k.a; c.fill();
          (good ? checkMark : xMark)(c, x + 36, ry, 16, '#fff');
          text(c, t, x + 58, ry, `600 17px ${FONT}`, INK, w - 90);
        });
      });
    },
    doc(c, k, L, x, y, w) {
      L.slice(0, 4).forEach((t, i) => {
        const ry = y + i * 82;
        fillRR(c, x, ry + 2, 6, 24, 3, k.a);
        text(c, `${i + 1}. ${t}`, x + 18, ry + 14, `700 19px ${FONT}`, INK, w - 20);
        bar(c, x + 18, ry + 44, (w - 18) * 0.92, '#eaecf0'); bar(c, x + 18, ry + 64, (w - 18) * [0.6, 0.72, 0.5, 0.66][i], '#eaecf0');
      });
    }
  };

  /* ---------- 썸네일 한 장 ---------- */
  const draw = s => {
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d');
    const k = catOf(s);
    // 배경: 연한 종류 색 + 큰 빛 번짐 + 옅은 격자
    const g = c.createLinearGradient(0, 0, W, H); g.addColorStop(0, k.bg[0]); g.addColorStop(1, k.bg[1]);
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const glow = c.createRadialGradient(930, 120, 10, 930, 120, 420); glow.addColorStop(0, k.a + '40'); glow.addColorStop(1, k.a + '00');
    c.fillStyle = glow; c.fillRect(0, 0, W, H);
    c.strokeStyle = 'rgba(16,24,40,.045)'; c.lineWidth = 1;
    for (let gx = 0; gx < W; gx += 40) { c.beginPath(); c.moveTo(gx + 0.5, 0); c.lineTo(gx + 0.5, H); c.stroke(); }
    for (let gy = 0; gy < H; gy += 40) { c.beginPath(); c.moveTo(0, gy + 0.5); c.lineTo(W, gy + 0.5); c.stroke(); }

    // 왼쪽: 종류 표시 · 이름 · 소개 · 도구
    const lx = 64;
    c.font = `800 17px ${FONT}`;
    const kindLabel = s.kind || 'Skill';
    const kw = c.measureText(kindLabel).width + 50;
    fillRR(c, lx, 52, kw, 38, 19, '#fff'); c.strokeStyle = k.a + '55'; c.lineWidth = 1.5; rr(c, lx, 52, kw, 38, 19); c.stroke();
    c.beginPath(); c.arc(lx + 20, 71, 6, 0, Math.PI * 2); c.fillStyle = k.a; c.fill();
    text(c, kindLabel, lx + 34, 72, `800 17px ${FONT}`, k.d);

    c.font = `800 50px ${FONT}`;
    const tl = wrap(c, s.title, 540, 2);
    tl.forEach((l, i) => text(c, l, lx, 150 + i * 62, `800 50px ${FONT}`, INK));
    const sy = 150 + (tl.length - 1) * 62 + 64;
    c.font = `500 23px ${FONT}`;
    wrap(c, s.summary || '', 530, 2).forEach((l, i) => text(c, l, lx, sy + i * 34, `500 23px ${FONT}`, INK2));

    let tx = lx;
    (s.tools.length ? s.tools : ['Copilot']).slice(0, 3).forEach(t => {
      c.font = `700 16px ${FONT}`; const tw = c.measureText(t).width + 28;
      fillRR(c, tx, 400, tw, 34, 17, 'rgba(255,255,255,.85)'); c.strokeStyle = LINE; c.lineWidth = 1.5; rr(c, tx, 400, tw, 34, 17); c.stroke();
      text(c, t, tx + 14, 418, `700 16px ${FONT}`, INK2); tx += tw + 8;
    });

    // 오른쪽: 앱 창 (뒤에 한 장 더 겹쳐 깊이감)
    const cx = 676, cy = 56, cw = 470, ch = 460;
    fillRR(c, cx + 26, cy - 18, cw - 52, ch, 20, 'rgba(255,255,255,.45)');
    c.save(); c.shadowColor = 'rgba(16,24,40,.18)'; c.shadowBlur = 40; c.shadowOffsetY = 16;
    fillRR(c, cx, cy, cw, ch, 20, '#fff'); c.restore();
    c.strokeStyle = 'rgba(16,24,40,.06)'; c.lineWidth = 1; rr(c, cx, cy, cw, ch, 20); c.stroke();
    // 창 머리
    ['#fda29b', '#fec84b', '#75e0a7'].forEach((col, i) => { c.beginPath(); c.arc(cx + 26 + i * 20, cy + 28, 6, 0, Math.PI * 2); c.fillStyle = col; c.fill(); });
    text(c, k.head, cx + 96, cy + 29, `700 16px ${FONT}`, INK2);
    fillRR(c, cx + cw - 96, cy + 15, 76, 28, 14, k.soft); text(c, 'Skill', cx + cw - 58, cy + 29, `800 14px ${FONT}`, k.d, 0, 'center');
    c.fillStyle = LINE; c.fillRect(cx, cy + 56, cw, 1);
    // 창 내용 (아래는 잘려도 됨: 실제 화면을 잘라 보여 주는 느낌)
    c.save(); rr(c, cx, cy, cw, ch, 20); c.clip();
    const lines = s.lines.length >= 3 ? s.lines : s.lines.concat(DEFAULT_LINES[k.mock]).slice(0, 5);
    MOCKS[k.mock](c, k, lines, cx + 28, cy + 84, cw - 56);
    c.restore();
    return cv;
  };

  /* ---------- 미리보기 창 ---------- */
  const panel = (items, canvases, onUpload) => {
    const old = document.getElementById('hub-thumb-panel'); if (old) { old.remove(); }
    const p = document.createElement('div'); p.id = 'hub-thumb-panel';
    p.style.cssText = 'position:fixed;inset:24px;z-index:2147483000;background:#0f1b2b;color:#fff;border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.6);overflow:auto;padding:20px 24px;font:14px ' + FONT;
    const head = document.createElement('div'); head.style.cssText = 'display:flex;align-items:center;gap:12px;margin-bottom:16px;position:sticky;top:-20px;background:#0f1b2b;padding:8px 0';
    head.innerHTML = `<b style="font-size:18px;flex:1">Skill 썸네일 미리보기 (${items.length}개)</b>`;
    const up = document.createElement('button'); up.textContent = '올리기 (썸네일 없는 Skill만)';
    const close = document.createElement('button'); close.textContent = '닫기';
    [up, close].forEach(b => { b.style.cssText = 'border:0;border-radius:999px;padding:8px 16px;font-weight:700;cursor:pointer;background:#2b8fd6;color:#fff'; });
    close.style.background = '#40506a';
    up.onclick = () => { up.disabled = true; up.textContent = '올리는 중…'; onUpload().then(() => { up.textContent = '완료 — Hub를 새로 고쳐 보세요'; }, e => { up.textContent = '실패: ' + e.message; }); };
    close.onclick = () => p.remove();
    head.append(up, close); p.append(head);
    const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:16px';
    items.forEach((s, i) => {
      const card = document.createElement('div');
      const img = canvases[i]; img.style.cssText = 'width:100%;height:auto;border-radius:10px;display:block';
      const cap = document.createElement('div'); cap.style.cssText = 'margin-top:6px;opacity:.85';
      cap.textContent = `[${s.kind || '종류 없음'}] ${s.title}${s.thumbName ? ` — 이미 썸네일 있음(${s.thumbName}), 건너뜀` : ''}`;
      if (s.thumbName) { img.style.opacity = '.45'; }
      card.append(img, cap); grid.append(card);
    });
    p.append(grid); document.body.append(p);
  };

  // '이럴 때 써요'(Does) → 화면 예시에 넣을 줄 (앞의 -, •, 숫자 떼기)
  const linesOf = v => String(v || '').split(/\r?\n/).map(x => x.replace(/^\s*([-•*·]|\d+[.)])\s*/, '').trim()).filter(Boolean).slice(0, 5);

  /* ---------- 미리보기 시험용 (SharePoint 없이) ---------- */
  if (window.__THUMB_TEST__) {
    const items = window.__THUMB_TEST__.map(s => ({ ...s, lines: linesOf(s.does) }));
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => panel(items, items.map(draw), () => Promise.resolve()));
    return;
  }

  /* ---------- SharePoint ---------- */
  const web = _spPageContextInfo.webAbsoluteUrl;
  const J = { Accept: 'application/json;odata=verbose' };
  const norm = s => String(s || '').toLowerCase().replace(/[\s_\-·]/g, '');
  const get = async u => { const r = await fetch(u, { headers: J }); if (!r.ok) { throw new Error(`${r.status} ${u.replace(web, '')}`); } return (await r.json()).d; };
  const digest = async () => (await (await fetch(web + '/_api/contextinfo', { method: 'POST', headers: J })).json()).d.GetContextWebInformation.FormDigestValue;
  const multi = v => (v && v.results) ? v.results : (v ? [].concat(v) : []);

  const load = async () => {
    const lists = (await get(`${web}/_api/web/lists?$filter=Hidden eq false and BaseTemplate eq 100&$select=Id,Title,RootFolder/ServerRelativeUrl&$expand=RootFolder`)).results;
    const hc = lists.filter(l => norm(l.Title) === 'hubcontents' || /\/lists\/hubcontents$/i.test(l.RootFolder.ServerRelativeUrl))[0];
    if (!hc) { throw new Error('HubContents 목록을 찾지 못했어요'); }
    const base = `${web}/_api/web/lists(guid'${hc.Id}')`;
    const rows = (await get(`${base}/items?$select=Id,Title,Kind,Summary,Category,WorkArea,Tools,Does,Hidden,AttachmentFiles/FileName&$expand=AttachmentFiles&$filter=Kind eq 'Skill'&$top=5000`)).results
      .filter(r => r.Hidden !== true);
    const items = rows.map(r => {
      const th = (r.AttachmentFiles.results || []).filter(f => /^thumb\./i.test(f.FileName))[0];
      return { id: r.Id, title: r.Title || '', summary: r.Summary || '', kind: r.Category || '', areas: multi(r.WorkArea), tools: multi(r.Tools), lines: linesOf(r.Does), thumbName: th ? th.FileName : '' };
    });
    return { base, items };
  };
  const toBuf = cv => new Promise(res => cv.toBlob(b => b.arrayBuffer().then(res), 'image/png'));
  const att = (base, id, name) => `${base}/items(${id})/AttachmentFiles` + (name ? `('${encodeURIComponent(name.replace(/'/g, "''"))}')` : '');

  let state;
  const upload = async (opt) => {
    const overwrite = !!(opt && opt.overwrite);
    const { base, items } = state || await load();
    const D = await digest();
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    const log = [];
    for (const s of items) {
      if (s.thumbName && !overwrite) { log.push({ Skill: s.title, 결과: `건너뜀 (이미 ${s.thumbName})` }); continue; }
      try {
        if (s.thumbName) {
          const r = await fetch(att(base, s.id, s.thumbName), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' } });
          if (!r.ok) { throw new Error('예전 썸네일 지우기 실패 ' + r.status); }
        }
        const body = await toBuf(draw(s));
        const r = await fetch(att(base, s.id) + `/add(FileName='thumb.png')`, { method: 'POST', headers: { ...J, 'X-RequestDigest': D }, body });
        if (!r.ok) { throw new Error(r.status + ' ' + (await r.text()).slice(0, 160)); }
        if (done.indexOf(s.id) < 0) { done.push(s.id); }
        s.thumbName = 'thumb.png';
        log.push({ Skill: s.title, 결과: '✅ 올림' });
      } catch (e) { log.push({ Skill: s.title, 결과: '❌ ' + e.message }); }
    }
    localStorage.setItem(KEY, JSON.stringify(done));
    console.table(log);
    console.log('Hub를 새로 고쳐 Skill 카드를 확인해 보세요. 되돌리려면 hubSkillThumbsRemove()');
  };

  window.hubSkillThumbs = upload;
  window.hubSkillThumbsRemove = async () => {
    const done = JSON.parse(localStorage.getItem(KEY) || '[]');
    if (!done.length) { console.log('이 코드로 올린 썸네일 기록이 없어요.'); return; }
    const { base } = state || await load();
    const D = await digest();
    for (const id of done) {
      const r = await fetch(att(base, id, 'thumb.png'), { method: 'POST', headers: { ...J, 'X-RequestDigest': D, 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' } });
      console.log(`항목 ${id}: ${r.ok ? '지움' : '실패 ' + r.status}`);
    }
    localStorage.removeItem(KEY);
  };

  (async () => {
    state = await load();
    if (document.fonts) { await document.fonts.ready; }
    const canvases = state.items.map(draw);
    panel(state.items, canvases, () => upload());
    console.log(`Skill ${state.items.length}개 미리보기를 띄웠어요. 이미 썸네일 있는 것: ${state.items.filter(s => s.thumbName).length}개.`);
    console.log('올리려면 미리보기의 [올리기] 또는 hubSkillThumbs()  /  있는 것도 바꾸려면 hubSkillThumbs({ overwrite: true })');
  })().catch(e => console.error('멈췄어요:', e.message));
})();
