/* 화면과 무관한 규칙들: 선택지, 아이디어 단계, 별점, 버전, 파일 이름, 비슷한 항목 찾기.
   SPFx 기본 tsconfig(target es5)에서 동작하도록 Array.includes · Object.entries · Set 펼치기를 쓰지 않습니다. */
import { IAgent, ICasePrompt, IIdea, IdeaStage, IReaction, ISolution, SolutionKind } from './types';

/* ---------- 선택지 (바꾸면 이미 저장된 값은 그대로 남습니다. 목록 열은 한 줄 텍스트) ---------- */
export const AGENT_TOOLS: string[] = ['Copilot Studio', 'Agent Builder'];
export const WORK_TYPES: string[] = ['회의 정리', '문서 작성', '요약', '검색·답변', '고객 응대', '규정 확인', '데이터 정리', '분류', '번역', '자동 실행 (메일·작업 생성)', '개발 지원'];
export const OUTPUTS: string[] = ['답변', '문서 초안', '메일 초안', '표', '체크리스트', '기타'];
export const SCOPES: string[] = ['사내 업무용', '고객 프로젝트용'];
export const SKILL_TOOLS: string[] = ['Cowork', 'Copilot', 'Copilot Studio', 'Agent Builder'];
export const SKILL_KINDS: string[] = ['규칙 (지침)', '양식 (템플릿)', '참조 자료 (용어집·코드표)', '체크리스트', '업무 절차'];
export const SKILL_AREAS: string[] = ['회의 정리', '문서 작성', '고객 응대', '규정 확인', '데이터 정리', '개발 지원'];
export const SKILL_EXTS: string[] = ['md', 'txt', 'docx'];
export const IDEA_TYPES: string[] = ['Agent', 'Skill', 'HTML', '기타'];
export const CASE_INDUSTRIES: string[] = ['제조', '금융·보험', 'IT·통신·미디어', '유통·커머스', '공공·국제기관', '교육', '의료·복지', '건설·부동산', '에너지·환경',
  '물류·운송', '관광·숙박·외식', '전문·사업서비스', '문화·스포츠·여가', '농림수산·광업', '생활·기타서비스'];
/** 사례: Copilot 활용 방식 */
export const CASE_PATTERNS: string[] = ['초안 작성', '요약 · 분류', '검토 · 점검', '비교 분석', '데이터 시각화', '질의응답', '형식 변환'];
/** 사례: 활용 제품 (목록의 색 점은 PRODUCT_CLASS) */
export const CASE_PRODUCTS: string[] = ['Copilot', 'Copilot Cowork', 'Copilot Studio', 'Agent Builder', 'Word', 'Excel', 'PowerPoint', 'Outlook', 'Teams'];
export const PRODUCT_CLASS: { [p: string]: string } = {
  Copilot: 'pc-cp', 'Copilot Chat': 'pc-cp', 'Copilot Cowork': 'pc-cw', 'Copilot Studio': 'pc-cs', Excel: 'pc-xl', Word: 'pc-wd', PowerPoint: 'pc-pp', Outlook: 'pc-ol', Teams: 'pc-tm'
};
/** 사례: 품질 · 정신적 노력 5단계 */
export const CASE_LEVELS: string[] = ['매우 낮음', '낮음', '보통', '높음', '매우 높음'];
export const DEPTS: string[] = ['AX컨설팅팀', 'AI솔루션팀', '데이터팀'];
export const SOLUTION_KINDS: { k: SolutionKind; label: string; hint: string }[] = [
  { k: 'agent', label: 'Agent', hint: '프로젝트에서 만든 Agent예요. Marketplace에 있으면 바로 연결돼요.' },
  { k: 'skill', label: 'Skill', hint: '다른 Agent에 붙여 쓸 수 있는 지침·지식 묶음이에요.' },
  { k: 'html', label: 'HTML', hint: '브라우저에서 바로 여는 도구·대시보드·보고 페이지예요.' }
];
export const REPORT_KINDS: string[] = ['틀린 답변', '응답 없음·느림', '연결 오류', '권한 오류', '기타'];
/** HTML 도구를 만든 도구 */
export const MADE_WITH: string[] = ['Claude', 'ChatGPT', 'Copilot', '기타'];
/** 올릴 수 있는 HTML 파일 최대 크기 (2MB) */
export const HTML_MAX_BYTES = 2 * 1024 * 1024;
/** 사례 효과 측정 칸: 'before|after' 로 저장 */
export function parseEffect(label: string, v: string): { label: string; before: string; after: string } | undefined {
  const i = (v || '').indexOf('|');
  return i > 0 ? { label, before: v.slice(0, i).trim(), after: v.slice(i + 1).trim() } : undefined;
}
/** 만드는 사람이 없는 아이디어는 이 날수가 지나면 보관됩니다. */
export const IDEA_ARCHIVE_DAYS = 90;
/** 올릴 수 있는 Skill 파일 최대 크기 (1MB) */
export const SKILL_MAX_BYTES = 1024 * 1024;

export function solutionLabel(k: string): string {
  const s = first(SOLUTION_KINDS, x => x.k === k);
  return s ? s.label : k;
}

/** 사례 시기 선택지: 올해부터 2년 전까지 하반기·상반기 */
export function periodOptions(now: Date): string[] {
  const out: string[] = [];
  for (let y = now.getFullYear(); y >= now.getFullYear() - 2; y--) { out.push(`${y} 하반기`, `${y} 상반기`); }
  return out;
}

/* ---------- 여러 값을 한 칸에 저장 ---------- */
export function splitLines(v: string): string[] {
  return (v || '').split(/\r?\n/).map(x => x.trim()).filter(x => !!x);
}
/** 사례 Solution: 예전 형식은 한 줄에 '종류|이름', 지금은 상세(지침·도구·본문 등)까지 담은 JSON 배열 */
export function parseSolutions(v: string): ISolution[] {
  const t = (v || '').trim();
  if (t.charAt(0) === '[') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (JSON.parse(t) as any[]).filter(s => s && s.name).map(s => ({ ...s, kind: (s.kind === 'skill' || s.kind === 'html' ? s.kind : 'agent') as SolutionKind, name: String(s.name) }));
    } catch (e) { /* 아래 한 줄 형식으로 */ }
  }
  return splitLines(t).map(line => {
    const i = line.indexOf('|');
    const k = (i > 0 ? line.slice(0, i) : 'agent').trim().toLowerCase();
    return { kind: (k === 'skill' || k === 'html' ? k : 'agent') as SolutionKind, name: (i > 0 ? line.slice(i + 1) : line).trim() };
  }).filter(s => !!s.name);
}
export function solutionsText(list: ISolution[]): string {
  // 상세가 하나라도 있으면 JSON, 이름만 있으면 읽기 쉬운 '종류|이름' 줄
  const rich = list.some(s => !!(s.ins || s.desc || s.body || (s.tools && s.tools.length) || (s.data && s.data.length) || (s.parts && s.parts.length)));
  return rich ? JSON.stringify(list) : list.map(s => `${s.kind}|${s.name}`).join('\n');
}
/** 사례 프롬프트(Use Case): JSON 배열 [{name, step, text}] 또는 예전처럼 프롬프트 한 개 */
export function parsePrompts(v: string, aiStep: number): ICasePrompt[] {
  const t = (v || '').trim();
  if (!t) { return []; }
  if (t.charAt(0) === '[') {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return (JSON.parse(t) as any[]).filter(p => p && p.text).map(p => ({ name: String(p.name || ''), step: typeof p.step === 'number' ? p.step : -1, text: String(p.text) }));
    } catch (e) { /* 아래 한 개 형식으로 */ }
  }
  return [{ name: '', step: aiStep, text: t }];
}
export function promptsText(list: ICasePrompt[]): string {
  return list.length ? JSON.stringify(list) : '';
}
/** After 단계를 Before 단계 구간에 나란히 놓기 (시안 기본 배치) */
export function stepSpans(before: number, after: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < after; i++) { out.push([Math.round(i * before / after), Math.round((i + 1) * before / after) - 1]); }
  return out;
}
/** 사례에 들어 있는 Solution 종류 (중복 없이, agent·skill·html 순) */
export function solutionKinds(list: ISolution[]): SolutionKind[] {
  return SOLUTION_KINDS.map(x => x.k).filter(k => list.some(s => s.kind === k));
}

/* ---------- 날짜 ---------- */
export function daysSince(iso: string, now: Date): number {
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return 0; }
  return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
}
/** ISO 날짜 → 'MM/DD' */
export function mmdd(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  const m = d.getMonth() + 1, day = d.getDate();
  return (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day;
}
/** ISO 날짜 → 'YYYY-MM-DD' */
export function ymd(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  const m = d.getMonth() + 1, day = d.getDate();
  return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
}
export function newestFirst(a: string, b: string): number {
  return (b || '').localeCompare(a || '');
}

/* ---------- 아이디어 단계 ----------
   완성(운영 담당자가 표시) > 제작 중(참여자가 '만들기 시작하기'를 누름) > 보관됨(만들래요 없이 90일) > 모집 중
   모집 중 안에서도 공감 10개 또는 만들래요 1명부터는 '함께할 사람 찾기' 단계로 보여 줍니다. */
export const IDEA_LIKE_GOAL = 10;
export function ideaStart(i: IIdea): string {
  return i.revivedOn && i.revivedOn > i.created ? i.revivedOn : i.created;
}
export function ideaStage(i: IIdea, makers: number, now: Date, started?: boolean): IdeaStage {
  if (i.status === '완성') { return 'done'; }
  if (started) { return 'making'; }
  if (makers > 0) { return 'live'; }
  return daysSince(ideaStart(i), now) >= IDEA_ARCHIVE_DAYS ? 'archived' : 'live';
}
/** 보관까지 남은 날 */
export function daysToArchive(i: IIdea, now: Date): number {
  return Math.max(0, IDEA_ARCHIVE_DAYS - daysSince(ideaStart(i), now));
}

/* ---------- 별점 ---------- */
export function ratingOf(reviews: IReaction[]): { avg: number; n: number } {
  const rs = reviews.filter(r => typeof r.rating === 'number' && r.rating! > 0);
  if (!rs.length) { return { avg: 0, n: 0 }; }
  const sum = rs.reduce((a, r) => a + (r.rating || 0), 0);
  return { avg: Math.round(sum / rs.length * 10) / 10, n: rs.length };
}
export function stars(n: number): string {
  const k = Math.max(0, Math.min(5, Math.round(n)));
  return '★★★★★'.slice(0, k) + '☆☆☆☆☆'.slice(0, 5 - k);
}

/* ---------- 버전 ---------- */
/** '1.2.0' 같은 버전 문자열인지 */
export function isVersion(s: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){0,2}$/.test(s);
}
/** 버전 비교: a가 크면 양수, 같으면 0, 작으면 음수 */
export function compareVersion(a: string, b: string): number {
  const x = a.split('.'), y = b.split('.');
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (Number(x[i]) || 0) - (Number(y[i]) || 0);
    if (d) { return d; }
  }
  return 0;
}
/** 다음 버전 제안: 1.0 → 1.1, 1.2.3 → 1.2.4 */
export function nextVersion(v: string): string {
  if (!isVersion(v)) { return '1.0'; }
  const p = v.split('.');
  if (p.length === 1) { p.push('0'); }
  p[p.length - 1] = String(Number(p[p.length - 1]) + 1);
  return p.join('.');
}

/* ---------- Skill 파일 ---------- */
export function extOf(name: string): string {
  const m = /\.([A-Za-z0-9]+)$/.exec(name || '');
  return m ? m[1].toLowerCase() : '';
}
export function extLabel(ext: string): string {
  return ext === 'md' ? 'md 파일' : ext === 'txt' ? '텍스트' : ext === 'docx' ? 'Word 문서' : '파일';
}
/** SharePoint에 저장할 파일 이름. 이름이 같은 파일(예: SKILL.md)끼리 부딪치지 않게 앞에 숫자를 붙입니다. */
export function storedSkillName(original: string): string {
  const ext = extOf(original) || 'md';
  const base = original.replace(/\.[A-Za-z0-9]+$/, '').replace(/[^0-9A-Za-z가-힣._-]+/g, '_').replace(/^[._]+|[._]+$/g, '') || 'skill';
  return `${Date.now()}_${base.slice(0, 80)}.${ext}`;
}
/** 저장된 이름에서 원래 파일 이름을 되돌립니다. */
export function originalSkillName(stored: string): string {
  return stored.replace(/^\d{13}_/, '');
}
/** .md 앞부분의 name·description(Claude Skill 형식)을 읽어 이름·소개 칸을 채우는 데 씁니다. */
export function readFrontMatter(text: string): { name?: string; description?: string } {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  if (!m) { return {}; }
  const out: { name?: string; description?: string } = {};
  m[1].split(/\r?\n/).forEach(line => {
    const kv = /^(name|description)\s*:\s*(.+)$/.exec(line.trim());
    if (kv) { out[kv[1] as 'name' | 'description'] = kv[2].replace(/^["']|["']$/g, '').trim(); }
  });
  return out;
}
/** API 키·비밀번호처럼 보이는 줄이 있는지 (경고만 하고 막지는 않습니다) */
export function looksLikeSecret(text: string): boolean {
  return /(api[_-]?key|secret|token|password|passwd|비밀번호)\s*[:=]\s*\S{6,}/i.test(text) || /\b(sk-[A-Za-z0-9]{16,}|AKIA[0-9A-Z]{16})\b/.test(text);
}
export function fileSize(bytes: number): string {
  return bytes < 1024 ? `${bytes}B` : `${Math.round(bytes / 102.4) / 10}KB`;
}

/* ---------- 비슷한 항목 ---------- */
const STOP: string[] = ['agent', '에이전트', '자동', '정리', '관리', '주는', '해주는', '해', '줘'];
const PARTICLE = /(을|를|이|가|은|는|의|에|로|으로|와|과|랑|이랑)$/;
export function keywords(text: string): string[] {
  return text.toLowerCase().split(/[\s,·/]+/)
    .map(w => w.replace(PARTICLE, ''))
    .filter(w => w.length >= 2 && STOP.indexOf(w) < 0);
}
/** 아이디어 제목의 핵심어가 하나라도 겹치는 Agent를 겹친 수가 많은 순으로 최대 3개 */
export function similarAgents(title: string, agents: IAgent[]): IAgent[] {
  const words = keywords(title);
  if (!words.length) { return []; }
  return agents
    .map(a => ({ a, n: words.filter(w => (a.title + ' ' + a.summary + ' ' + a.workType).toLowerCase().indexOf(w) >= 0).length }))
    .filter(x => x.n > 0)
    .sort((x, y) => y.n - x.n)
    .slice(0, 3)
    .map(x => x.a);
}

/* ---------- 표기 ---------- */
export function initials(name: string): string {
  const t = (name || '').trim();
  if (!t) { return '?'; }
  if (/^[A-Za-z]/.test(t)) {
    const parts = t.split(/\s+/);
    return (parts.length > 1 ? parts[0].charAt(0) + parts[1].charAt(0) : t.slice(0, 2)).toUpperCase();
  }
  return t.length > 2 ? t.slice(-2) : t;
}
export function isHttpsUrl(s: string): boolean {
  return /^https:\/\/[^\s/]+\.[^\s]+$/.test(s);
}
export function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}
export function first<T>(arr: T[], pred: (x: T) => boolean): T | undefined {
  for (let i = 0; i < arr.length; i++) { if (pred(arr[i])) { return arr[i]; } }
  return undefined;
}
export function uniq(arr: string[]): string[] {
  const out: string[] = [];
  arr.forEach(x => { if (x && out.indexOf(x) < 0) { out.push(x); } });
  return out;
}
export function contains(hay: string, q: string): boolean {
  return (hay || '').toLowerCase().indexOf(q.toLowerCase()) >= 0;
}
