/* 화면과 무관한 규칙들: 선택지, 위험도 판정, 업무 시간 계산, 비슷한 항목 찾기.
   SPFx 기본 tsconfig(lib: es5 + es2015.collection/promise)에서 동작하도록
   Array.find / includes / padStart / Object.entries 를 쓰지 않습니다. */
import { AgentType, Frequency, IAgent, IIdea, RiskTier, Sensitivity } from './types';

export const CATEGORIES: string[] = ['리서치', '학습', '인사·총무', '프로젝트', '자동화'];
export const AGENT_TYPES: AgentType[] = ['정보 조회형', '데이터 활용형', '업무 실행형'];
export const TYPE_HINT: { [k: string]: string } = {
  '정보 조회형': '문서·웹에서 찾아 답함',
  '데이터 활용형': '자료를 읽고 정리함',
  '업무 실행형': '알림·게시 등 작업 실행'
};
export const TYPE_LONG: { [k: string]: string } = {
  '정보 조회형': '문서·웹에서 찾아 답합니다',
  '데이터 활용형': '내가 준 자료나 업무 데이터를 읽고 정리합니다',
  '업무 실행형': '알림·게시처럼 실제 작업을 실행합니다'
};
export const SENSITIVITIES: Sensitivity[] = ['공개', '사내 일반', '기밀·개인정보'];
export const EXTERNALS: string[] = ['웹 검색', 'MCP 서버', '외부 시스템 커넥터', 'Power Automate'];
export const IDEA_STATUSES: string[] = ['아이디어', '검토 중', '제작 중', '등록 완료'];
export const FREQUENCIES: Frequency[] = ['매일', '매주', '매월', '가끔'];
export const TEAMS: string[] = ['컨설팅팀', '영업팀', '교육팀', 'PMO', '경영지원'];
export const INDUSTRIES: string[] = ['공공', '제조', '금융', '유통', '서비스'];
export const AREAS: string[] = ['고객 응대', '현장·운영', '문서·지식', '영업·제안', '기타'];
/** 고객사 실명으로 보이는 표현 (사례에는 업종 유형까지만 씁니다) */
export function looksLikeCompanyName(s: string): boolean {
  return /(주식회사|\(주\)|㈜|유한회사|corp\.?|inc\.?|co\.,? ?ltd)/i.test(s);
}
export const TOOLS: string[] = ['Copilot Studio', 'Agent Builder', 'SharePoint 지식', 'Power Automate', '커넥터·MCP', '민감도 레이블'];

/** 카테고리 색 (CSS 변수 이름). 무늬 타일의 색이 됩니다. */
export const CAT_COLOR: { [k: string]: string } = {
  '리서치': 'var(--c-res)',
  '학습': 'var(--c-learn)',
  '인사·총무': 'var(--c-hr)',
  '프로젝트': 'var(--c-prj)',
  '자동화': 'var(--c-auto)'
};
export function catColor(cat: string): string {
  return CAT_COLOR[cat] || 'var(--brand)';
}

/* ---------- 위험도 ----------
   예시 기준: 데이터 민감도 점수(공개 0 · 사내 일반 1 · 기밀 2) + 업무 실행형 1점
   0 → 저, 1 → 중, 2 이상 → 고. MCP 서버·외부 커넥터를 연결하면 최소 '중'.
   최종 판정은 운영 담당자가 하며, 운영 기준서의 Risk Tier 표가 나오면 이 함수만 바꾸면 됩니다. */
const SENS_SCORE: { [k: string]: number } = { '공개': 0, '사내 일반': 1, '기밀·개인정보': 2 };

export function riskOf(type: string, sensitivity: string, external: string[]): RiskTier | undefined {
  if (!type || !(sensitivity in SENS_SCORE)) { return undefined; }
  const n = SENS_SCORE[sensitivity] + (type === '업무 실행형' ? 1 : 0);
  let r: RiskTier = n <= 0 ? '저' : n === 1 ? '중' : '고';
  if (r === '저' && hasRiskyConnection(external)) { r = '중'; }
  return r;
}
export function hasRiskyConnection(external: string[]): boolean {
  return external.indexOf('MCP 서버') >= 0 || external.indexOf('외부 시스템 커넥터') >= 0;
}
export const ROUTE: { [k: string]: string } = {
  '저': '자가 등록 → 운영 담당자 확인 후 게시',
  '중': '자가 등록 → 거버넌스 승인 후 게시',
  '고': '자가 등록 → 거버넌스 승인 → 승인권자 승인 후 게시'
};
export const RISK_CLASS: { [k: string]: string } = { '저': 'b-low', '중': 'b-mid', '고': 'b-high' };

/* ---------- 업무 시간 ---------- */
const PER_MONTH: { [k: string]: number } = { '매일': 20, '매주': 4, '매월': 1, '가끔': 0.5 };
/** 한 사람이 그 업무에 한 달 동안 쓰는 시간(시간 단위, 소수 첫째 자리) */
export function monthlyHours(freq?: string, minutes?: number): number | undefined {
  if (!freq || !minutes || !(freq in PER_MONTH)) { return undefined; }
  return Math.round(PER_MONTH[freq] * minutes / 60 * 10) / 10;
}

/* ---------- 비슷한 항목 ---------- */
const STOP: string[] = ['agent', '에이전트', '자동', '정리', '관리'];
const PARTICLE = /(을|를|이|가|은|는|의|에|로|으로|와|과)$/;

export interface ISimilar { kind: 'agent' | 'idea'; agent?: IAgent; idea?: IIdea; score: number; }

export function keywords(text: string): string[] {
  return text.toLowerCase().split(/[\s,·/]+/)
    .map(w => w.replace(PARTICLE, ''))
    .filter(w => w.length >= 2 && STOP.indexOf(w) < 0);
}
/** 제목의 핵심어 중 절반 이상이 겹치는 Agent·아이디어를 최대 3개 돌려줍니다. */
export function findSimilar(title: string, agents: IAgent[], ideas: IIdea[]): ISimilar[] {
  const words = keywords(title);
  if (!words.length) { return []; }
  const need = Math.max(1, Math.ceil(words.length / 2));
  const hit = (s: string): number => {
    const low = s.toLowerCase();
    return words.filter(w => low.indexOf(w) >= 0).length;
  };
  const out: ISimilar[] = [];
  agents.forEach(a => { const n = hit(a.title + ' ' + a.summary); if (n >= need) { out.push({ kind: 'agent', agent: a, score: n }); } });
  ideas.forEach(i => { const n = hit(i.title + ' ' + i.summary); if (n >= need) { out.push({ kind: 'idea', idea: i, score: n }); } });
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

/* ---------- 표기 ---------- */
export function pad3(n: number): string {
  const s = String(n);
  return s.length >= 3 ? s : ('000' + s).slice(-3);
}
export function agentCode(id: number): string { return 'AGT-' + pad3(id); }
export function requestCode(id: number): string { return 'REQ-' + pad3(id); }

/** ISO 날짜 → 'MM.DD' */
export function mmdd(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) { return ''; }
  const m = d.getMonth() + 1, day = d.getDate();
  return (m < 10 ? '0' : '') + m + '.' + (day < 10 ? '0' : '') + day;
}
export function sameMonth(iso: string, now: Date): boolean {
  const d = new Date(iso);
  return !isNaN(d.getTime()) && d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}
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
