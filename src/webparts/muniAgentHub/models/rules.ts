/* 화면과 무관한 규칙들: 선택지, 아이디어 단계, 별점, 버전, 파일 이름, 비슷한 항목 찾기.
   SPFx 기본 tsconfig(target es5)에서 동작하도록 Array.includes · Object.entries · Set 펼치기를 쓰지 않습니다. */
import { IAgent, ICasePrompt, IIdea, IdeaStage, IReaction, ISolution, SolutionKind } from './types';

/* ---------- 선택지 (바꾸면 이미 저장된 값은 그대로 남습니다. 목록 열은 한 줄 텍스트) ---------- */
export const AGENT_TOOLS: string[] = ['Copilot Studio', 'Agent Builder'];
/** 카테고리 (11/25 시안 확정 6개): Agent · Skill · HTML · 아이디어가 함께 씁니다.
    AgentList 카테고리(TaskArea), HubContents 카테고리(WorkArea), HubIdeas 카테고리(Category) 선택 값과 같아야 필터가 맞습니다 */
export const CATEGORIES: string[] = ['제안과 전략 세우기', '데이터로 인사이트 찾기', '고객 업무 이해하고 설계하기', '산출물 만들고 다듬기', '교육·확산 프로그램 운영하기', '프로젝트·사내 업무 하기'];
/** Agent 카테고리 (AgentList TaskArea) */
export const WORK_TYPES: string[] = CATEGORIES;
/** AgentList 결과물 형태(Output) 선택 값 */
export const OUTPUTS: string[] = ['답변', '문서 초안', '메일 초안', '표', '체크리스트'];
export const SCOPES: string[] = ['사내 업무용', '고객 프로젝트용'];
export const SKILL_TOOLS: string[] = ['Cowork', 'Copilot', 'Copilot Studio', 'Agent Builder'];
/* 아래 선택 값은 HubContents 목록의 선택 열 값과 같아야 합니다 (저장과 필터가 맞도록) */
/** 종류(Category) 중 Skill 용 */
export const SKILL_KINDS: string[] = ['규칙', '양식', '참조 자료', '체크리스트', '업무 절차'];
/** 종류(Category) 중 HTML 용 */
export const HTML_KINDS: string[] = ['계산기', '대시보드', '점검표', '투표 및 설문', '판단 도우미'];
/** Skill · HTML 카테고리 (HubContents WorkArea) */
export const SKILL_AREAS: string[] = CATEGORIES;
export const SKILL_EXTS: string[] = ['md', 'txt', 'docx'];
/** 아이디어 카테고리 (HubIdeas 의 Category 열). 시안 11/25 ib3: 6개, 색은 [종이, 글자, 형광펜] */
export const IDEA_CATS: string[] = CATEGORIES;
export const IDEA_CAT_PAL: { [cat: string]: [string, string, string] } = {
  '제안과 전략 세우기': ['#f8e1e7', '#8b3a52', 'rgba(190,80,110,.20)'],
  '데이터로 인사이트 찾기': ['#e1edf5', '#1f5f8b', 'rgba(31,116,168,.20)'],
  '고객 업무 이해하고 설계하기': ['#ece6f6', '#5b4a8b', 'rgba(110,90,170,.20)'],
  '산출물 만들고 다듬기': ['#fbe5d6', '#8a4a22', 'rgba(200,110,50,.22)'],
  '교육·확산 프로그램 운영하기': ['#e1f2e6', '#2f6b45', 'rgba(60,140,90,.22)'],
  '프로젝트·사내 업무 하기': ['#fcf1c8', '#7a5c00', 'rgba(200,150,0,.25)']
};
/** 카테고리 설명 (아이디어 쓰기 칸 · Skill · HTML 등록 폼 안내) */
export const IDEA_CAT_DESC: { [cat: string]: string } = {
  '제안과 전략 세우기': '제안서, RFP 분석, 견적, 도입 전략과 로드맵',
  '데이터로 인사이트 찾기': '자료 조사, 데이터 분석, 성과(KPI) 측정',
  '고객 업무 이해하고 설계하기': '인터뷰, FGI, 워크숍, 활용 방안과 To-Be 설계',
  '산출물 만들고 다듬기': '보고서, 홍보 콘텐츠, Agent와 자동화 구축, 검토',
  '교육·확산 프로그램 운영하기': '교육 자료와 교육 진행, 챌린지, 캠페인, 오픈 뒤 문의 대응',
  '프로젝트·사내 업무 하기': '일정, 회의, 주간 보고, 계약과 정산, 메일, 경비'
};
/** 스크랩했지만 원문 주소가 없을 때 Source 열에 넣는 값 */
export const IDEA_SCRAP = '외부';
export const CASE_INDUSTRIES: string[] = ['제조', '금융·보험', 'IT·통신·미디어', '유통·커머스', '공공·국제기관', '교육', '의료·복지', '건설·부동산', '에너지·환경',
  '물류·운송', '관광·숙박·외식', '전문·사업서비스', '문화·스포츠·여가', '농림수산·광업', '생활·기타서비스'];
/** 사례: Copilot 활용 방식 */
/* 아래 사례 선택 값은 HubCases 목록의 선택 열 값과 같아야 합니다 */
/** Case Library 솔루션의 활용 방식 (솔루션이 하는 일, 시안 USE) */
export const CASE_USES: string[] = ['문서 작성', '요약 분류', '질의응답', '검토 점검', '데이터 분석', '양식 변환'];
/** 예전 Pattern 열 값 → 새 활용 방식 (솔루션에 활용 방식이 비어 있을 때만 씁니다) */
const OLD_PATTERN_USE: { [k: string]: string } = {
  '초안 작성': '문서 작성', '요약 및 분류': '요약 분류', '질의응답': '질의응답', '검토 및 점검': '검토 점검',
  '비교 분석': '데이터 분석', '데이터 시각화': '데이터 분석', '형식 변환': '양식 변환'
};
export function useFromPattern(pattern: string): string {
  const p = (pattern || '').trim();
  return CASE_USES.indexOf(p) >= 0 ? p : (OLD_PATTERN_USE[p] || '');
}
/** Agent 실행 방식: 대화형은 늘 '사용자 요청 시', 자동 실행만 일시를 적습니다 */
export const RUN_MODES: string[] = ['대화형', '자동 실행'];
export const RUN_CHAT_WHEN = '사용자 요청 시';
/** [실행 방식, 일시] → '대화형 (사용자 요청 시)' / '자동 실행 (매일 오전 8시)' */
export function runLabel(run?: string[]): string {
  const m = ((run && run[0]) || '').trim();
  if (!m) { return ''; }
  const w = m === '대화형' ? RUN_CHAT_WHEN : ((run && run[1]) || '').trim();
  return w ? `${m} (${w})` : m;
}
export const CASE_PATTERNS: string[] =['초안 작성', '요약 및 분류', '검토 및 점검', '비교 분석', '데이터 시각화', '질의응답', '형식 변환'];
/** 사례: 시기(Period) 선택 값. 목록에 분기를 더하면 여기도 더해 주세요. */
export const CASE_PERIODS: string[] = ['2025 3분기', '2025 4분기', '2026 1분기', '2026 2분기', '2026 3분기', '2026 4분기'];
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
/** HTML 만든 도구 (도구(Tools) 열 값 중) */
export const MADE_WITH: string[] = ['Claude', 'ChatGPT', 'Copilot', 'Cowork'];
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

/** 사례 시기 선택지: 목록의 분기 중 지금 분기까지, 최근 것이 먼저 */
export function periodOptions(now: Date): string[] {
  const cur = now.getFullYear() * 10 + Math.floor(now.getMonth() / 3) + 1;
  const key = (p: string): number => { const m = /^(\d{4})\s*(\d)분기/.exec(p); return m ? Number(m[1]) * 10 + Number(m[2]) : 0; };
  return CASE_PERIODS.filter(p => key(p) <= cur).sort((a, b) => key(b) - key(a));
}

/* ---------- HubCases 여러 줄 칸 ---------- */
/** 전후 비교(Compare): 한 줄에 '항목|도입 전|도입 후' */
export const CASE_COMPARE_LABELS: string[] = ['시간', '품질 수준', '정신적 노력 수준'];
export function parseCompare(v: string): { label: string; before: string; after: string }[] {
  return splitLines(v).map(line => {
    const p = line.split('|').map(x => x.trim());
    return p.length >= 3 ? { label: p[0], before: p[1], after: p.slice(2).join('|') } : undefined;
  }).filter(x => !!x && (!!x.before || !!x.after)) as { label: string; before: string; after: string }[];
}
export function compareText(rows: { label: string; before: string; after: string }[]): string {
  return rows.filter(r => !!r.before || !!r.after).map(r => `${r.label}|${r.before}|${r.after}`).join('\n');
}
/** 업무 프로세스(Process): '[Before]' 아래 도입 전 단계, '[After]' 아래 도입 후 단계를 한 줄에 하나.
    AI가 맡는 After 단계는 끝에 ' [AI]' */
const AI_MARK = /\s*\[AI\]\s*$/i;
export function parseProcess(v: string): { before: string[]; after: string[]; aiStep: number } {
  const out = { before: [] as string[], after: [] as string[], aiStep: -1 };
  let sec: 'before' | 'after' = 'before';
  splitLines(v).forEach(line => {
    if (/^\[?\s*before\s*\]?$/i.test(line)) { sec = 'before'; return; }
    if (/^\[?\s*after\s*\]?$/i.test(line)) { sec = 'after'; return; }
    const text = line.replace(AI_MARK, '').replace(/^\d+[.)]\s*/, '');
    if (!text) { return; }
    if (sec === 'after' && AI_MARK.test(line) && out.aiStep < 0) { out.aiStep = out.after.length; }
    out[sec].push(text);
  });
  return out;
}
export function processText(before: string[], after: string[], aiStep: number): string {
  return ['[Before]'].concat(before, ['[After]'], after.map((s, i) => i === aiStep ? s + ' [AI]' : s)).join('\n');
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filled = (v: any): boolean => Array.isArray(v) ? v.length > 0 : !!v;
  const rich = list.some(s => Object.keys(s).some(k => k !== 'kind' && k !== 'name' && filled((s as unknown as { [k: string]: unknown })[k])));
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
/** ISO 날짜 → 'YYYY/MM/DD' (화면 표시용. 이름은 예전 MM/DD 때 그대로) */
export function mmdd(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  const m = d.getMonth() + 1, day = d.getDate();
  // MUNIVERSE 시안(c43): 화면의 날짜는 모두 yyyy/mm/dd
  return d.getFullYear() + '/' + (m < 10 ? '0' : '') + m + '/' + (day < 10 ? '0' : '') + day;
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

/* ---------- 아이디어 단계 (HubIdeas) ----------
   완성(상태 '완성' 또는 완성일) > 보관됨(상태 '보관' 또는 보관일, 단 그 뒤에 보관 해제했으면 아님)
   > 제작 중(시작일) > 모집 중. 함께 만드는 사람 없이 90일이 지나면 계산으로도 보관됨.
   모집 중 안에서도 공감 10개 또는 만들래요 1명부터는 '함께할 사람 찾기' 단계로 보여 줍니다. */
export const IDEA_LIKE_GOAL = 10;
/** HubIdeas 상태(Status) 선택 값 */
export const IDEA_STATUS = { live: '모집 중', making: '제작 중', done: '완성', archived: '보관' };
/** HubIdeas 빈도(Frequency) 선택 값과 한 달 횟수 */
export const IDEA_FREQS: string[] = ['매일', '매주', '매월', '가끔'];
const PER_MONTH: { [f: string]: number } = { '매일': 20, '매주': 4, '매월': 1 };
/** 한 달에 아낄 수 있는 시간(분). 빈도가 '가끔'이거나 비어 있으면 0 */
export function ideaMonthlyMinutes(i: { frequency: string; minutes?: number }): number {
  return (PER_MONTH[i.frequency] || 0) * (i.minutes || 0);
}
export function ideaStart(i: IIdea): string {
  return i.revivedOn && i.revivedOn > i.created ? i.revivedOn : i.created;
}
export function ideaStage(i: IIdea, now: Date): IdeaStage {
  if (i.status === IDEA_STATUS.done || i.doneAt) { return 'done'; }
  const revived = (at: string): boolean => !!i.revivedOn && i.revivedOn > at;
  if (i.archivedOn && !revived(i.archivedOn)) { return 'archived'; }
  // 보관 해제하면 상태도 '모집 중'으로 바꿔 저장합니다
  if (i.status === IDEA_STATUS.archived) { return 'archived'; }
  if (i.startedOn) { return 'making'; }
  if (i.makers.length > 0) { return 'live'; }
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
