/* 활동 점수 · 부문별 랭킹 · 배지 · 알림
   별도 목록 없이 지금 읽어 온 목록 데이터(아이디어, Agent, 사례, 반응)로 바로 계산합니다.
   점수 기준은 랭킹 화면의 '점수는 이렇게 쌓여요' 표와 같습니다.
   별점·공감(좋아요)은 SharePoint가 날짜를 남기지 않아 '최근 30일' 계산에서 빠지고, 기간 없는 배지·인기 Agent에만 씁니다. */
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

export interface IRankRow { key: string; name: string; value: number; view?: HubView; id?: number }
export interface IAward { k: string; title: string; icon: string; crit: string; unit: string; rows: IRankRow[]; mine?: { rank: number; value: number; gap: number; label?: string } }
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
function rank(counts: { [key: string]: { name: string; value: number; view?: HubView; id?: number } }): IRankRow[] {
  return Object.keys(counts).map(k => ({ key: k, name: counts[k].name, value: counts[k].value, view: counts[k].view, id: counts[k].id }))
    .filter(r => r.value > 0).sort((a, b) => b.value - a.value || a.name.localeCompare(b.name, 'ko'));
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
  d.ideas.forEach(i => {
    const made = d.reactions.some(r => r.targetType === 'Idea' && r.targetId === i.id && r.kind === '만들래요' && r.author && (!i.author || r.author.id !== i.author.id) && within(r.created, now));
    if (made && i.author) { add(ideaKing, String(i.author.id), i.author.name, 1); }
  });
  const maker: { [k: string]: { name: string; value: number } } = {};
  d.agents.filter(a => a.owner && within(a.created, now)).forEach(a => add(maker, String(a.owner!.id), a.owner!.name, 1));
  const popular: { [k: string]: { name: string; value: number; view?: HubView; id?: number } } = {};
  // 인기 Agent: 받은 별점 평가 수 (별점은 날짜가 없어 전체 기간)
  d.reactions.filter(r => r.kind === '리뷰' && r.targetType === 'Agent' && !!r.rating).forEach(r => {
    const a = first(d.agents, x => x.id === r.targetId);
    if (a) { add(popular, String(a.id), a.title, 1, 'agent', a.id); }
  });
  const cheer: { [k: string]: { name: string; value: number } } = {};
  d.reactions.filter(r => r.targetType === 'Idea' && r.kind === '댓글' && r.author && within(r.created, now)).forEach(r => {
    const idea = first(d.ideas, i => i.id === r.targetId);
    if (idea && !(idea.author && idea.author.id === r.author!.id)) { add(cheer, String(r.author!.id), r.author!.name, 1); }
  });
  const record: { [k: string]: { name: string; value: number } } = {};
  d.cases.filter(c => !c.pending && c.author && within(c.created, now)).forEach(c => add(record, String(c.author!.id), c.author!.name, 1));

  const meKey = String(me.id);
  const list: IAward[] = [
    { k: 'idea', title: '아이디어왕', icon: '💡', crit: '내 아이디어를 누군가 만들기 시작한 수', unit: '만들어짐', rows: rank(ideaKing) },
    { k: 'maker', title: '메이커', icon: '🛠', crit: 'Marketplace에 올린 Agent 수', unit: '배포', rows: rank(maker) },
    { k: 'pop', title: '인기 Agent', icon: '🔥', crit: '받은 별점 평가 수', unit: '평가', rows: rank(popular) },
    { k: 'cheer', title: '공감왕', icon: '👏', crit: '다른 사람 아이디어에 남긴 댓글 수', unit: '댓글', rows: rank(cheer) },
    { k: 'record', title: '기록왕', icon: '📚', crit: 'Case Library에 올린 사례 수', unit: '사례', rows: rank(record) }
  ];
  list.forEach(a => {
    if (a.k === 'pop') {
      // 인기 Agent는 내 Agent 중 가장 높은 순위
      let best: { rank: number; value: number; gap: number; label?: string } | undefined;
      a.rows.forEach((r, i) => {
        const ag = first(d.agents, x => String(x.id) === r.key);
        if (ag && ag.owner && ag.owner.id === me.id && !best) { best = { rank: i + 1, value: r.value, gap: i ? a.rows[0].value - r.value : 0, label: ag.title }; }
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
      out.push({ id: 'fill-' + a.id + '-' + a.modified, kind: 'mine', title: `${a.title} 소개를 채워 주세요`, sub: "'이런 일을 해요'와 '이렇게 말해 보세요'가 비어 있어요", date: a.modified, view: 'agentform', target: a.id, btn: '소개 작성' });
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
