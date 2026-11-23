/* 활동 점수 · 부문별 랭킹 · 배지 · 알림
   별도 목록 없이 지금 읽어 온 목록 데이터(아이디어, Agent, 사례, 반응)로 바로 계산합니다.
   점수 기준은 랭킹 화면의 '점수는 이렇게 쌓여요' 표와 같습니다.
   공감(좋아요)과 댓글 없는 별점은 SharePoint가 날짜를 남기지 않아 '최근 30일' 계산에서 빠지고, 기간 없는 배지에만 씁니다.
   '지금 부문별 1위'(awards)는 5개 부문 모두 기간 없이 지금까지의 활동으로 셉니다. */
import { HubView, IHubData, IPerson } from './types';
import { daysSince, first } from './rules';

export const WINDOW_DAYS = 30;
export const POINTS = {
  idea: 1,          // 아이디어 붙이기
  made: 5,          // 내 아이디어가 만들어짐 (누군가 '만들래요')
  cheer: 1,         // 다른 사람 아이디어에 댓글 (하루 최대 5점)
  cheerDailyMax: 5,
  case: 5,          // 사례 올리기
  deploy: 10        // Agent 배포 (Marketplace에 올라감)
};

/** tie: 주 기준(value)이 같을 때 차례로 비교하는 값 (클수록 앞) */
/** by: 게시물이 1위 대상일 때 올린 사람 이름 */
export interface IRankRow { key: string; name: string; value: number; view?: HubView; id?: number; tie?: number[]; by?: string }
/** tieLabels: tie 값마다 붙일 이름과 표시 방법 (Home의 '2위와 비교' 문구) */
/** fmt: 값 표시 방법 (없으면 정수 그대로. 인기 Agent는 평점 4.5) */
export interface IAward { k: string; title: string; icon: string; crit: string; unit: string; rows: IRankRow[]; fmt?: (n: number) => string; tieLabels?: { label: string; fmt: (n: number) => string }[]; mine?: { rank: number; value: number; gap: number; label?: string } }
export interface IBadge { k: string; title: string; mark: string; desc: string; got: boolean; date?: string; have?: number; need?: number }
export interface INotice { id: string; kind: 'mine' | 'idea' | 'all'; title: string; sub: string; date: string; view: HubView; target: number; btn?: string }

interface IEvent { who: IPerson; date: string; pts: number }

/** 날짜가 없는 것(별점·공감)은 기간 계산에서 뺍니다 */
function within(iso: string, now: Date): boolean { return !!iso && daysSince(iso, now) <= WINDOW_DAYS; }
function dayKey(iso: string): string { return (iso || '').slice(0, 10); }

/** 최근 30일 점수 이벤트 */
function events(d: IHubData, now: Date): IEvent[] {
  const ev: IEvent[] = [];
  d.ideas.forEach(i => { if (i.author && within(i.created, now)) { ev.push({ who: i.author, date: i.created, pts: POINTS.idea }); } });
  // 내 아이디어가 만들어짐: 올린 사람 말고 처음 '만들래요'를 누른 때
  d.ideas.forEach(i => {
    const firstMake = d.reactions.filter(r => r.targetType === 'Idea' && r.targetId === i.id && r.kind === '만들래요' && r.author && (!i.author || r.author.id !== i.author.id))
      .sort((a, b) => a.created.localeCompare(b.created))[0];
    if (firstMake && i.author && within(firstMake.created, now)) { ev.push({ who: i.author, date: firstMake.created, pts: POINTS.made }); }
  });
  // 댓글: 하루 5점까지
  const perDay: { [k: string]: number } = {};
  d.reactions.filter(r => r.targetType === 'Idea' && r.kind === '댓글' && r.author && within(r.created, now)).forEach(r => {
    const idea = first(d.ideas, i => i.id === r.targetId);
    if (!idea || (idea.author && idea.author.id === r.author!.id)) { return; }
    const k = r.author!.id + '|' + dayKey(r.created);
    perDay[k] = (perDay[k] || 0) + 1;
    if (perDay[k] <= POINTS.cheerDailyMax) { ev.push({ who: r.author!, date: r.created, pts: POINTS.cheer }); }
  });
  d.cases.filter(c => !c.pending && c.author && within(c.created, now)).forEach(c => ev.push({ who: c.author!, date: c.created, pts: POINTS.case }));
  d.agents.filter(a => a.owner && within(a.created, now)).forEach(a => ev.push({ who: a.owner!, date: a.created, pts: POINTS.deploy }));
  return ev;
}

/** 내 점수와 순위 */
export function myScore(d: IHubData, me: IPerson, now: Date): { score: number; rank: number; people: number; toNext: number } {
  const totals: { [id: number]: number } = {};
  events(d, now).forEach(e => { totals[e.who.id] = (totals[e.who.id] || 0) + e.pts; });
  if (!(me.id in totals)) { totals[me.id] = 0; }
  const list = Object.keys(totals).map(k => ({ id: Number(k), v: totals[Number(k)] })).sort((a, b) => b.v - a.v);
  const score = totals[me.id];
  const rank = list.filter(x => x.v > score).length + 1;
  // 한 단계 위(다음 순위)까지 필요한 점수
  const above = list.filter(x => x.v > score);
  const toNext = above.length ? above[above.length - 1].v - score : 0;
  return { score, rank, people: list.length, toNext };
}

/* ---------- 부문별 랭킹 ---------- */
/** 주 기준이 같은 두 줄을 tie 값으로 차례로 비교합니다. 0이면 끝까지 같음 */
export function tieCompare(a: IRankRow, b: IRankRow): number {
  const x = a.tie || [];
  const y = b.tie || [];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (y[i] || 0) - (x[i] || 0);
    if (d) { return d; }
  }
  return 0;
}
function rank(counts: { [key: string]: { name: string; value: number; view?: HubView; id?: number; tie?: number[]; by?: string } }): IRankRow[] {
  return Object.keys(counts).map(k => ({ key: k, name: counts[k].name, value: counts[k].value, view: counts[k].view, id: counts[k].id, tie: counts[k].tie, by: counts[k].by }))
    .filter(r => r.value > 0).sort((a, b) => b.value - a.value || tieCompare(a, b) || a.name.localeCompare(b.name, 'ko'));
}
function mineOf(rows: IRankRow[], key: string): { rank: number; value: number; gap: number } {
  const i = rows.map(r => r.key).indexOf(key);
  const value = i >= 0 ? rows[i].value : 0;
  const r = i >= 0 ? i + 1 : rows.length + 1;
  return { rank: r, value, gap: r > 1 && rows[0] ? rows[0].value - value : 0 };
}

export function awards(d: IHubData, me: IPerson, now: Date): IAward[] {
  const add = (m: { [k: string]: { name: string; value: number; view?: HubView; id?: number } }, key: string, name: string, n: number, view?: HubView, id?: number): void => {
    m[key] = m[key] || { name, value: 0, view, id };
    m[key].value += n;
  };
  const ideaKing: { [k: string]: { name: string; value: number } } = {};
  // 아이디어 뱅크: Idea Board에 올린 아이디어 수
  d.ideas.forEach(i => { if (i.author) { add(ideaKing, String(i.author.id), i.author.name, 1); } });
  const popular: { [k: string]: { name: string; value: number; view?: HubView; id?: number; tie?: number[] } } = {};
  // 5개 부문 모두 기간 제한 없이 지금까지의 활동으로 셉니다. (Home에서는 1분마다 다시 계산)
  // 인기 Agent: 평점(받은 별점의 평균, 소수 첫째 자리). 같으면 ① 조회수(ViewCount) ② 평가 수 ③ 글을 남긴 리뷰 수 순으로 가립니다
  d.agents.forEach(a => {
    const rv = d.reactions.filter(r => r.kind === '리뷰' && r.targetType === 'Agent' && r.targetId === a.id);
    const rated = rv.filter(r => !!r.rating);
    if (!rated.length) { return; }
    const avg = Math.round(rated.reduce((s, r) => s + (r.rating || 0), 0) / rated.length * 10) / 10;
    popular[String(a.id)] = { name: a.title, value: avg, view: 'agent', id: a.id,
      tie: [a.views || 0, rated.length, rv.filter(r => !!(r.body || '').trim()).length] };
  });
  // 리뷰 마스터: 다른 사람의 Agent·Skill·HTML에 남긴 리뷰 + 다른 사람 아이디어에 남긴 댓글 수 (내 것에 단 건 빼요)
  const reviewer: { [k: string]: { name: string; value: number } } = {};
  const posterOf = (t: string, id: number): IPerson | undefined => {
    if (t === 'Agent') { const a = first(d.agents, x => x.id === id); return a && a.owner; }
    if (t === 'Skill') { const s = first(d.skills, x => x.id === id); return s && s.author; }
    if (t === 'Html') { const h = first(d.htmls, x => x.id === id); return h && h.author; }
    return undefined;
  };
  d.reactions.filter(r => r.kind === '리뷰' && r.author && (r.targetType === 'Agent' || r.targetType === 'Skill' || r.targetType === 'Html')).forEach(r => {
    const p = posterOf(r.targetType, r.targetId);
    if (!(p && p.id === r.author!.id)) { add(reviewer, String(r.author!.id), r.author!.name, 1); }
  });
  // 아이디어에 남긴 댓글도 리뷰로 셉니다 (내 아이디어에 단 댓글은 빼요)
  d.reactions.filter(r => r.kind === '댓글' && r.targetType === 'Idea' && r.author).forEach(r => {
    const idea = first(d.ideas, i => i.id === r.targetId);
    if (idea && !(idea.author && idea.author.id === r.author!.id)) { add(reviewer, String(r.author!.id), r.author!.name, 1); }
  });
  // 공유 MVP: Marketplace에 올린 Skill·HTML 수
  const sharer: { [k: string]: { name: string; value: number } } = {};
  d.skills.forEach(s => { if (s.author) { add(sharer, String(s.author.id), s.author.name, 1); } });
  d.htmls.forEach(h => { if (h.author) { add(sharer, String(h.author.id), h.author.name, 1); } });
  // 단골 방문자: Hub를 방문한 날 수 (HubProfiles VisitCount 열, 하루 1회만 셈)
  const visitor: { [k: string]: { name: string; value: number } } = {};
  const vs = d.visits || {};
  Object.keys(vs).forEach(k => { add(visitor, k, vs[Number(k)].name || (Number(k) === me.id ? me.name : '알 수 없음'), vs[Number(k)].count); });

  const meKey = String(me.id);
  const list: IAward[] = [
    { k: 'idea', title: '아이디어 뱅크', icon: '💡', crit: 'Idea Board에 올린 아이디어 수', unit: '아이디어', rows: rank(ideaKing) },
    { k: 'pop', title: '인기 Agent', icon: '🔥', crit: '평점 (받은 별점의 평균, 같으면 조회수 → 평가 수 → 리뷰 글 수)', unit: '평점', rows: rank(popular), fmt: n => n.toFixed(1),
      tieLabels: [{ label: '조회', fmt: n => n + '회' }, { label: '평가', fmt: n => n + '개' }, { label: '리뷰 글', fmt: n => n + '개' }] },
    { k: 'review', title: '리뷰 마스터', icon: '⭐', crit: '다른 사람 Agent·Skill·HTML에 남긴 리뷰 + 아이디어에 남긴 댓글 수', unit: '리뷰', rows: rank(reviewer) },
    { k: 'share', title: '공유 MVP', icon: '📚', crit: 'Marketplace에 올린 Skill·HTML 수', unit: 'Skill·HTML 공유', rows: rank(sharer) },
    { k: 'visit', title: '단골 방문자', icon: '👣', crit: 'Hub를 방문한 날 수 (하루에 한 번만 셈)', unit: '방문', rows: rank(visitor), fmt: n => n + '일' }
  ];
  list.forEach(a => {
    if (a.k === 'pop') {
      // 게시물 부문은 내 게시물 중 가장 높은 순위
      const mineRow = (r: IRankRow): boolean => {
        const ag = first(d.agents, x => String(x.id) === r.key);
        return !!(ag && ag.owner && ag.owner.id === me.id);
      };
      let best: { rank: number; value: number; gap: number; label?: string } | undefined;
      a.rows.forEach((r, i) => {
        if (!best && mineRow(r)) { best = { rank: i + 1, value: r.value, gap: i ? a.rows[0].value - r.value : 0, label: r.name }; }
      });
      a.mine = best;
    } else {
      a.mine = mineOf(a.rows, meKey);
    }
  });
  return list;
}

/* ---------- 배지 (한 번 받으면 계속 남음) ---------- */
export function badges(d: IHubData, me: IPerson, now: Date): IBadge[] {
  const myIdeas = d.ideas.filter(i => i.author && i.author.id === me.id).sort((a, b) => a.created.localeCompare(b.created));
  const myAgents = d.agents.filter(a => a.owner && a.owner.id === me.id).sort((a, b) => a.created.localeCompare(b.created));
  const myCases = d.cases.filter(c => !c.pending && c.author && c.author.id === me.id).sort((a, b) => a.created.localeCompare(b.created));
  const cheers = d.reactions.filter(r => r.targetType === 'Idea' && r.kind === '좋아요' && r.author && r.author.id === me.id)
    .filter(r => { const i = first(d.ideas, x => x.id === r.targetId); return !!i && !(i.author && i.author.id === me.id); })
    .sort((a, b) => a.created.localeCompare(b.created));
  const myIdeaIds = myIdeas.map(i => i.id);
  const received = d.reactions.filter(r => r.targetType === 'Idea' && r.kind === '좋아요' && myIdeaIds.indexOf(r.targetId) >= 0 && !(r.author && r.author.id === me.id))
    .sort((a, b) => a.created.localeCompare(b.created));
  const myAgentIds = myAgents.map(a => a.id);
  const rated = d.reactions.filter(r => r.kind === '리뷰' && !!r.rating && r.targetType === 'Agent' && myAgentIds.indexOf(r.targetId) >= 0 && !(r.author && r.author.id === me.id));
  const done = myIdeas.filter(i => i.status === '완성');

  // 꾸준함: 최근 연속 활동 개월 수 (이번 달 또는 지난달까지 이어진 것)
  const months: { [m: string]: boolean } = {};
  const mark = (iso: string): void => { if (iso) { months[iso.slice(0, 7)] = true; } };
  myIdeas.forEach(i => mark(i.created)); myAgents.forEach(a => mark(a.created)); myCases.forEach(c => mark(c.created));
  d.reactions.filter(r => r.author && r.author.id === me.id).forEach(r => mark(r.created));
  const ym = (y: number, m: number): string => `${y}-${m < 9 ? '0' : ''}${m + 1}`;
  let streak = 0;
  for (let k = 0; k < 24; k++) {
    const dt = new Date(now.getFullYear(), now.getMonth() - k, 1);
    if (months[ym(dt.getFullYear(), dt.getMonth())]) { streak++; } else if (k > 0 || streak > 0) { break; }
  }

  const at = <T extends { created: string }>(list: T[], n: number): string | undefined => list.length >= n ? list[n - 1].created : undefined;
  const b = (k: string, title: string, mark2: string, desc: string, have: number, need: number, date?: string): IBadge =>
    ({ k, title, mark: mark2, desc, got: have >= need, date: have >= need ? date : undefined, have, need });
  return [
    b('first-idea', '첫 포스트잇', '첫\n아이디어', '아이디어를 처음 붙였어요', myIdeas.length, 1, at(myIdeas, 1)),
    b('first-deploy', '첫 배포', '첫\n배포', 'Agent를 처음 Marketplace에 올렸어요', myAgents.length, 1, at(myAgents, 1)),
    b('cheer', '응원단', '응원', '다른 사람 아이디어에 공감 10번', cheers.length, 10, at(cheers, 10)),
    b('steady', '꾸준함', '연속\n3', '3개월 연속 활동', Math.min(streak, 3), 3, streak >= 3 ? now.toISOString() : undefined),
    b('real', '아이디어가 Agent로', '현실\n화', '내 아이디어로 Agent가 만들어졌어요', done.length, 1, at(done, 1)),
    b('tried30', '별점 30', '인기', '내 Agent가 받은 별점 30개', rated.length, 30, undefined),
    b('first-case', '첫 사례', '기록', 'Case Library에 사례를 처음 올려요', myCases.length, 1, at(myCases, 1)),
    b('rich', '공감 부자', '공감\n50', '내 아이디어가 받은 공감 50', received.length, 50, at(received, 50))
  ];
}

/* ---------- 알림 (최근 30일, 내 것에 생긴 일) ---------- */
export function notices(d: IHubData, me: IPerson, now: Date): INotice[] {
  const out: INotice[] = [];
  const others = (p?: IPerson): boolean => !!p && p.id !== me.id;
  const myAgents = d.agents.filter(a => a.owner && a.owner.id === me.id);
  const mySkills = d.skills.filter(s => s.author && s.author.id === me.id);
  const myHtmls = d.htmls.filter(h => h.author && h.author.id === me.id);
  const myIdeas = d.ideas.filter(i => i.author && i.author.id === me.id);

  myAgents.forEach(a => {
    if (!a.does.length || !a.prompts.length) {
      out.push({ id: 'fill-' + a.id + '-' + a.modified, kind: 'mine', title: `${a.title} 소개를 채워 주세요`, sub: "'이런 일을 해요'와 '이렇게 말해 보세요'가 비어 있어요. 배포 Agent에서 Profile Card를 다시 보내 주세요", date: a.modified, view: 'agent', target: a.id, btn: '자세히' });
    }
  });
  d.reactions.filter(r => r.kind === '리뷰' && others(r.author) && within(r.created, now)).forEach(r => {
    const item = r.targetType === 'Agent' ? first(myAgents, x => x.id === r.targetId) : r.targetType === 'Skill' ? first(mySkills, x => x.id === r.targetId) : r.targetType === 'Html' ? first(myHtmls, x => x.id === r.targetId) : undefined;
    if (item) {
      out.push({ id: 'rv-' + r.id, kind: 'mine', title: `${item.title}에 새 리뷰가 달렸어요`, sub: `${'★★★★★☆☆☆☆☆'.slice(5 - (r.rating || 0), 10 - (r.rating || 0))} ${r.body.split('\n')[0]}`, date: r.created,
        view: r.targetType === 'Agent' ? 'agent' : r.targetType === 'Skill' ? 'skill' : 'htool', target: item.id, btn: '리뷰 보기' });
    }
  });
  mySkills.forEach(s => {
    const users = d.agents.filter(a => others(a.owner) && a.linkedSkills.indexOf(s.title) >= 0 && within(a.modified, now));
    if (users.length) { out.push({ id: `sk-${s.id}-${users.length}`, kind: 'mine', title: `내 Skill '${s.title}'을 Agent ${users.length}개가 붙였어요`, sub: users.map(a => a.title).join(', '), date: users[0].modified, view: 'skill', target: s.id }); }
  });
  d.reactions.filter(r => r.targetType === 'Idea' && (r.kind === '만들래요' || r.kind === '댓글') && others(r.author) && within(r.created, now)).forEach(r => {
    const i = first(myIdeas, x => x.id === r.targetId);
    if (!i) { return; }
    out.push(r.kind === '만들래요'
      ? { id: 'mk-' + r.id, kind: 'idea', title: `내 아이디어 '${i.title}'에 ${r.author!.name}님이 만들기로 참여했어요`, sub: '같이 만들 수 있어요', date: r.created, view: 'idea', target: i.id, btn: '아이디어 보기' }
      : { id: 'cm-' + r.id, kind: 'idea', title: `내 아이디어 '${i.title}'에 댓글이 달렸어요`, sub: r.body, date: r.created, view: 'idea', target: i.id, btn: '아이디어 보기' });
  });
  badges(d, me, now).filter(b => b.got && b.date && within(b.date, now)).forEach(b => {
    out.push({ id: 'bd-' + b.k, kind: 'all', title: `새 배지 '${b.title}'을 받았어요`, sub: b.desc, date: b.date!, view: 'me', target: 0 });
  });
  return out.sort((a, b) => b.date.localeCompare(a.date));
}
