/* SharePoint 목록 읽기·쓰기 (SharePoint REST + SPHttpClient)
   - 별도 패키지 없이 SPFx 기본 SPHttpClient 만 씁니다. 요청 다이제스트와 인증은 SPHttpClient 가 처리합니다.
   - 응답은 odata=nometadata 형식으로 받아 가볍게 유지합니다.
   - 열 내부 이름은 README의 'SharePoint 목록'과 같습니다. */
import { SPHttpClient, SPHttpClientResponse, ISPHttpClientOptions } from '@microsoft/sp-http';
import {
  IAgent, ICase, IHtmlTool, IHubData, IHubLists, IIdea, IImage, IMe, INewAgent, INewCase, INewHtml, INewIdea, INewSkill,
  IPerson, IReaction, ISkill, IVersion, TargetType
} from '../models/types';
import { extOf, originalSkillName, parseEffect, parsePrompts, parseSolutions, promptsText, solutionsText, splitLines, storedSkillName } from '../models/rules';

// SPHttpClient(v1)는 OData-Version 이 3.0 또는 4.0 이어야 합니다. odata=nometadata 는 OData 3.0 형식이라 3.0 으로 맞춥니다.
const JSON_HEADERS: { [k: string]: string } = {
  'Accept': 'application/json;odata=nometadata',
  'Content-Type': 'application/json;odata=nometadata',
  'odata-version': '3.0'
};

export class HubError extends Error {
  public status: number;
  public listTitle?: string;
  /** 파일 올리기에서 어느 단계가 실패했는지: file = 파일 업로드, info = 정보(열) 저장 */
  public stage?: 'file' | 'info';
  constructor(message: string, status: number, listTitle?: string) {
    super(message);
    this.status = status;
    this.listTitle = listTitle;
    // ES5 대상에서 instanceof 가 동작하도록 (lib 설정에 따라 setPrototypeOf 선언이 없을 수 있음)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const O = Object as any;
    if (O.setPrototypeOf) { O.setPrototypeOf(this, HubError.prototype); }
  }
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function person(v: any): IPerson | undefined {
  if (!v || !v.Id) { return undefined; }
  return { id: v.Id, name: v.Title || '', email: v.EMail || '' };
}
function splitList(v: any): string[] {
  if (!v) { return []; }
  if (Object.prototype.toString.call(v) === '[object Array]') { return v as string[]; }
  return String(v).split(/\s*;\s*/).filter(x => !!x);
}
function str(v: any): string { return v === null || v === undefined ? '' : String(v); }
function num(v: any): number | undefined { return typeof v === 'number' && !isNaN(v) ? v : undefined; }
/** 대표 효과를 큰 글자(62% 감소)와 작은 설명(보고서 작성 시간)으로 나눕니다. 설명 열(KeyEffectNote)이 있으면 그대로 씁니다. */
function splitEffect(effect: string, note: string): { value: string; note: string } {
  const e = effect.trim();
  if (note.trim()) { return { value: e, note: note.trim() }; }
  // 숫자가 든 마지막 말(+ 뒤 한 단어)을 큰 글자로: '보고서 작성 시간 62% 감소' → '62% 감소'
  const m = /^(.*\S)\s+(\S*\d\S*(?:\s+[^\s\d]+)?)$/.exec(e);
  return m ? { value: m[2], note: m[1] } : { value: e, note: '' };
}
const AUTHOR = ['Author/Id', 'Author/Title', 'Author/EMail'];
/** Idea Board 항목 댓글 중 이 문구로 시작하면 '만들래요' 참여로 봅니다 (SharePoint 목록 화면에서도 읽히는 문장) */
export const MAKE_TEXT = '[만들래요]';
export const MAKE_COMMENT = MAKE_TEXT + ' 이 아이디어를 같이 만들어요.';
/** 참여자가 '만들기 시작하기'를 누르면 남는 댓글 (지우면 '함께할 사람 찾기'로 돌아감) */
export const START_TEXT = '[만들기 시작]';
export const START_COMMENT = START_TEXT + ' 이 아이디어를 만들기 시작했어요.';
/** 리뷰 댓글 앞에 붙이는 별점 표시: '[★4] ' */
const REVIEW_STAR = /^\[★([1-5])\]\s*/;
export function reviewText(rating: number, body: string): string { return `[★${rating}] ${body}`; }

export class HubService {
  private readonly site: string;

  constructor(private readonly client: SPHttpClient, siteUrl: string, private readonly lists: IHubLists) {
    this.site = siteUrl.replace(/\/+$/, '');
  }

  /** 웹 파트 설정의 목록 이름 (안내 문구용) */
  public listName(k: keyof IHubLists): string { return this.lists[k]; }

  /* ---------- 공통 ---------- */
  private listUrl(title: string): string {
    return `${this.site}/_api/web/lists/getbytitle('${encodeURIComponent(title.replace(/'/g, "''"))}')`;
  }
  private query(params: { [k: string]: string }): string {
    const parts: string[] = [];
    Object.keys(params).forEach(k => { if (params[k]) { parts.push(`${k}=${encodeURIComponent(params[k])}`); } });
    return parts.length ? '?' + parts.join('&') : '';
  }
  private async fail(res: SPHttpClientResponse, listTitle?: string): Promise<never> {
    let detail = '';
    try {
      const body: any = await res.json();
      detail = (body && body['odata.error'] && body['odata.error'].message && body['odata.error'].message.value)
        || (body && body.error && body.error.message && (body.error.message.value || body.error.message)) || '';
    } catch (e) { /* 본문 없음 */ }
    if (res.status === 404 && listTitle) {
      throw new HubError(`'${listTitle}' 목록을 찾을 수 없습니다. 사이트에 목록이 있는지, 웹 파트 설정의 목록 이름이 맞는지 확인해 주세요.`, 404, listTitle);
    }
    if (res.status === 401 || res.status === 403) {
      throw new HubError(`${listTitle ? `'${listTitle}' 목록에 ` : ''}접근 권한이 없습니다. Hub 운영 담당자에게 권한을 요청해 주세요.`, res.status, listTitle);
    }
    throw new HubError(detail || `SharePoint 요청이 실패했습니다 (${res.status}).`, res.status, listTitle);
  }
  private async getJson(url: string, listTitle?: string): Promise<any> {
    const res = await this.client.get(url, SPHttpClient.configurations.v1, { headers: { 'Accept': 'application/json;odata=nometadata', 'odata-version': '3.0' } });
    if (!res.ok) { return this.fail(res, listTitle); }
    return res.json();
  }
  private async send(url: string, body: any, extra: { [k: string]: string } | undefined, listTitle?: string): Promise<any> {
    const headers: { [k: string]: string } = {};
    Object.keys(JSON_HEADERS).forEach(k => { headers[k] = JSON_HEADERS[k]; });
    if (extra) { Object.keys(extra).forEach(k => { headers[k] = extra[k]; }); }
    const opts: ISPHttpClientOptions = { headers, body: body === undefined ? undefined : JSON.stringify(body) };
    const res = await this.client.post(url, SPHttpClient.configurations.v1, opts);
    if (!res.ok) { return this.fail(res, listTitle); }
    if (res.status === 204) { return undefined; }
    const text = await res.text();
    return text ? JSON.parse(text) : undefined;
  }
  private async items(title: string, select: string[], expand: string[], filter?: string, top: number = 2000): Promise<any[]> {
    const url = this.listUrl(title) + '/items' + this.query({
      '$select': select.join(','),
      '$expand': expand.join(','),
      '$filter': filter || '',
      '$orderby': 'Id desc',
      '$top': String(top)
    });
    const data = await this.getJson(url, title);
    return (data && data.value) || [];
  }
  /** 새로 생긴 열(opt)까지 읽어 봅니다. 그 열이 아직 목록에 없어 400이 나면 opt 를 빼고 다시 읽어, 목록 화면이 멈추지 않게 합니다. */
  private async itemsOpt(title: string, select: string[], expand: string[], opt: { select: string[]; expand?: string[] }, filter?: string, top?: number): Promise<any[]> {
    try {
      return await this.items(title, select.concat(opt.select), expand.concat(opt.expand || []), filter, top);
    } catch (e) {
      if (e instanceof HubError && e.status === 400) { return this.items(title, select, expand, filter, top); }
      throw e;
    }
  }
  private create(list: string, fields: any): Promise<any> {
    return this.send(this.listUrl(list) + '/items', fields, undefined, list);
  }
  private merge(list: string, id: number, fields: any): Promise<any> {
    return this.send(`${this.listUrl(list)}/items(${id})`, fields, { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }, list);
  }
  private remove(list: string, id: number): Promise<any> {
    return this.send(`${this.listUrl(list)}/items(${id})`, undefined, { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' }, list);
  }
  /** 항목 버전 기록에서 버전 번호 열이 바뀐 지점만 뽑습니다 (같은 번호는 가장 최근 것 하나). */
  private async versions(list: string, id: number, verField: string, noteField: string): Promise<IVersion[]> {
    const d = await this.getJson(`${this.listUrl(list)}/items(${id})/versions`, list);
    const rows: any[] = ((d && d.value) || []).slice().sort((a: any, b: any) => (Number(b.VersionId) || 0) - (Number(a.VersionId) || 0));
    const out: IVersion[] = [];
    const seen: { [v: string]: boolean } = {};
    rows.forEach((r: any) => {
      const v = str(r[verField]);
      if (!v || seen[v]) { return; }
      seen[v] = true;
      out.push({ version: v, note: str(r[noteField]), date: str(r.Modified || r.Created) });
    });
    return out;
  }

  /* ---------- 사용자 ---------- */
  public async getMe(): Promise<IMe> {
    const d = await this.getJson(`${this.site}/_api/web/currentuser?$select=Id,Title,Email`);
    return { id: d.Id, name: d.Title, email: d.Email };
  }

  /* ---------- 한꺼번에 읽기 ---------- */
  public async loadAll(): Promise<IHubData> {
    // 목록마다 따로 받습니다. 하나가 없거나 권한이 없어도 그 목록을 쓰는 화면에만 안내가 나오고 나머지 화면은 열립니다.
    const soft = <T>(p: Promise<T[]>, what: string): Promise<{ list: T[]; error?: string }> => p.then(
      (list): { list: T[]; error?: string } => ({ list }),
      (e): { list: T[]; error?: string } => ({ list: [], error: e instanceof Error ? e.message : `${what} 목록을 불러오지 못했습니다.` }));
    const [ag, id, cs, rx, sk, ht] = await Promise.all([
      soft(this.getAgents(), 'Agent'), soft(this.getIdeas(), 'Idea'), soft(this.getCases(), 'Case'), this.getReactions(),
      soft(this.getSkills(), 'Skill'), soft(this.getHtmls(), 'HTML')
    ]);
    return {
      agents: ag.list, agentsError: ag.error, ideas: id.list, ideasError: id.error, cases: cs.list, casesError: cs.error,
      reactions: rx.list, reactionsError: rx.error, skills: sk.list, skillsError: sk.error, htmls: ht.list, htmlsError: ht.error
    };
  }

  /* ---------- Agent ---------- */
  public async getAgents(): Promise<IAgent[]> {
    const rows = await this.itemsOpt(this.lists.agents,
      ['Id', 'Title', 'AgentSummary', 'AgentTool', 'AgentWorkType', 'UseScope', 'OutputType', 'OutputNote', 'AgentDoes', 'AgentPrompts',
        'MakerNote', 'AgentInstructions', 'AgentKnowledge', 'AgentActions', 'LinkedAgents', 'LinkedSkills', 'AgentVersion', 'AgentChangeNote',
        'InstallLink', 'Created', 'Modified', 'AgentOwner/Id', 'AgentOwner/Title', 'AgentOwner/EMail',
        'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl'],
      ['AgentOwner', 'AttachmentFiles'],
      { select: ['AgentSponsor/Id', 'AgentSponsor/Title', 'AgentSponsor/EMail'], expand: ['AgentSponsor'] },
      "AgentStatus eq '게시'");
    return rows.map((r: any): IAgent => ({
      id: r.Id, title: str(r.Title), summary: str(r.AgentSummary), tool: str(r.AgentTool), workType: str(r.AgentWorkType),
      scopes: splitList(r.UseScope), output: str(r.OutputType), outputNote: str(r.OutputNote),
      does: splitLines(str(r.AgentDoes)), prompts: splitLines(str(r.AgentPrompts)), makerNote: str(r.MakerNote),
      instructions: str(r.AgentInstructions), knowledge: splitLines(str(r.AgentKnowledge)), actions: splitLines(str(r.AgentActions)),
      linkedAgents: splitList(r.LinkedAgents), linkedSkills: splitList(r.LinkedSkills),
      version: str(r.AgentVersion), changeNote: str(r.AgentChangeNote), installLink: str(r.InstallLink),
      images: this.images(r.AttachmentFiles), thumb: this.thumbOf(r.AttachmentFiles),
      owner: person(r.AgentOwner), sponsor: person(r.AgentSponsor), created: str(r.Created), modified: str(r.Modified)
    }));
  }
  private thumbOf(files: any): IImage | undefined {
    const list: any[] = Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []);
    const f = list.filter(x => /^thumb\./i.test(str(x.FileName)))[0];
    return f ? { slot: 0, name: str(f.FileName), url: this.origin() + encodeURI(str(f.ServerRelativeUrl)) } : undefined;
  }
  /** 첨부 파일 중 result-1.*, result-2.* 를 결과 이미지로 */
  private images(files: any): IImage[] {
    const list: any[] = Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []);
    const out: IImage[] = [];
    list.forEach(f => {
      const m = /^result-([12])\./i.exec(str(f.FileName));
      if (m) { out.push({ slot: Number(m[1]), name: str(f.FileName), url: this.origin() + encodeURI(str(f.ServerRelativeUrl)) }); }
    });
    return out.sort((a, b) => a.slot - b.slot);
  }
  /** 결과 이미지 올리기: 같은 자리의 이전 이미지를 지우고 result-<자리>.<확장자> 로 첨부 */
  private async saveImages(id: number, a: INewAgent, existing: IImage[], oldThumb?: IImage): Promise<void> {
    const list = this.lists.agents;
    if (a.newThumb) {
      if (oldThumb) { await this.removeAttachment(list, id, oldThumb.name).catch(() => undefined); }
      await this.addAttachment(list, id, `thumb.${extOf(a.newThumb.name) || 'png'}`, a.newThumb.data);
    }
    for (const img of a.newImages || []) {
      const old = existing.filter(x => x.slot === img.slot);
      for (const o of old) {
        await this.send(`${this.listUrl(list)}/items(${id})/AttachmentFiles('${encodeURIComponent(o.name.replace(/'/g, "''"))}')`, undefined, { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' }, list);
      }
      const name = `result-${img.slot}.${extOf(img.name) || 'png'}`;
      const res = await this.client.post(`${this.listUrl(list)}/items(${id})/AttachmentFiles/add(FileName='${encodeURIComponent(name)}')`, SPHttpClient.configurations.v1, {
        headers: { 'Accept': 'application/json;odata=nometadata', 'odata-version': '3.0' }, body: img.data
      });
      if (!res.ok) { await this.fail(res, list); }
    }
  }
  private agentFields(a: INewAgent): any {
    return {
      Title: a.title, AgentSummary: a.summary, AgentTool: a.tool, AgentWorkType: a.workType, UseScope: a.scopes.join('; '),
      OutputType: a.output, OutputNote: a.outputNote, AgentDoes: a.does.join('\n'), AgentPrompts: a.prompts.join('\n'),
      MakerNote: a.makerNote, AgentInstructions: a.instructions, AgentKnowledge: a.knowledge.join('\n'), AgentActions: a.actions.join('\n'),
      LinkedAgents: a.linkedAgents.join('; '), LinkedSkills: a.linkedSkills.join('; '),
      AgentVersion: a.version, AgentChangeNote: a.changeNote, InstallLink: a.installLink
    };
  }
  /** Agent 소개 등록. 승인 단계 없이 '게시' 상태로 저장하므로 바로 Marketplace에 보입니다. */
  public async createAgent(a: INewAgent, ownerId: number): Promise<number> {
    const f = this.agentFields(a);
    f.AgentOwnerId = ownerId;
    f.AgentStatus = '게시';
    const d = await this.create(this.lists.agents, f);
    await this.saveImages(d.Id, a, []);
    return d.Id;
  }
  public async updateAgent(id: number, a: INewAgent, existing: IImage[], oldThumb?: IImage): Promise<void> {
    await this.merge(this.lists.agents, id, this.agentFields(a));
    await this.saveImages(id, a, existing, oldThumb);
  }
  public getAgentVersions(id: number): Promise<IVersion[]> {
    return this.versions(this.lists.agents, id, 'AgentVersion', 'AgentChangeNote');
  }

  /* ---------- 아이디어 ---------- */
  public async getIdeas(): Promise<IIdea[]> {
    const rows = await this.itemsOpt(this.lists.ideas,
      ['Id', 'Title', 'IdeaType', 'IdeaStatus', 'LinkedAgentId', 'RevivedOn', 'Created'].concat(AUTHOR), ['Author'], { select: ['IdeaDetail'] });
    return rows.map((r: any): IIdea => ({
      id: r.Id, title: str(r.Title), type: str(r.IdeaType), detail: str(r.IdeaDetail), status: str(r.IdeaStatus), linkedAgentId: num(r.LinkedAgentId),
      revivedOn: str(r.RevivedOn), author: person(r.Author), created: str(r.Created)
    }));
  }
  /** 새 열(IdeaDetail)이 아직 없으면 그 칸만 빼고 다시 저장합니다 */
  private async withOptional<T>(fields: any, optional: string[], run: (f: any) => Promise<T>): Promise<T> {
    try { return await run(fields); } catch (e) {
      if (!(e instanceof HubError && e.status === 400) || !optional.some(k => k in fields)) { throw e; }
      const f = { ...fields };
      optional.forEach(k => { delete f[k]; });
      return run(f);
    }
  }
  public async createIdea(idea: INewIdea): Promise<number> {
    const d = await this.withOptional({ Title: idea.title, IdeaType: idea.type, IdeaDetail: idea.detail || '' }, ['IdeaDetail'], f => this.create(this.lists.ideas, f));
    return d.Id;
  }
  /** 내 아이디어 고치기 */
  public async updateIdea(id: number, idea: INewIdea): Promise<void> {
    await this.withOptional({ Title: idea.title, IdeaType: idea.type, IdeaDetail: idea.detail || '' }, ['IdeaDetail'], f => this.merge(this.lists.ideas, id, f));
  }
  /** 내 아이디어 지우기 (사이트 휴지통으로) */
  public async deleteIdea(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.ideas)}/items(${id})/recycle()`, undefined, undefined, this.lists.ideas);
  }
  /** 보관 해제: 보관까지 남은 날을 오늘부터 다시 셉니다. */
  public async reviveIdea(id: number): Promise<string> {
    const now = new Date().toISOString();
    await this.merge(this.lists.ideas, id, { RevivedOn: now });
    return now;
  }

  /* ---------- 사례 ---------- */
  public async getCases(): Promise<ICase[]> {
    const rows = await this.itemsOpt(this.lists.cases,
      ['Id', 'Title', 'Industry', 'ClientName', 'Department', 'Period', 'PainPoint', 'Solutions', 'Progress', 'Created', 'OData__ModerationStatus',
        'ProjectSummary', 'KeyEffect', 'ApplyPoints', 'BusinessArea', 'AIPattern', 'Products', 'BeforeItems', 'AfterItems', 'AIStep',
        'EffectTime', 'EffectQuality', 'EffectEffort', 'Verification', 'ReusePrompt'].concat(AUTHOR),
      ['Author'], { select: ['BeforeText', 'AfterText', 'KeyEffectNote', 'CaseContact'] });
    return rows.map((r: any): ICase => {
      const key = splitEffect(str(r.KeyEffect), str(r.KeyEffectNote));
      const aiStep = typeof r.AIStep === 'number' ? r.AIStep - 1 : -1;
      const after = str(r.AfterText);
      return {
      id: r.Id, title: str(r.Title), industry: str(r.Industry), client: str(r.ClientName), dept: str(r.Department), period: str(r.Period),
      pain: str(r.PainPoint), solutions: parseSolutions(str(r.Solutions)), progress: str(r.Progress),
      oneLine: (after.split(/[.\n]/)[0] || '').trim(), beforeText: str(r.BeforeText), afterText: after, keyValue: key.value, keyNote: key.note,
      contact: str(r.CaseContact), how: str(r.Verification), prompts: parsePrompts(str(r.ReusePrompt), aiStep),
      summary: str(r.ProjectSummary), keyEffect: str(r.KeyEffect), points: splitLines(str(r.ApplyPoints)),
      area: str(r.BusinessArea), pattern: str(r.AIPattern), products: splitList(r.Products),
      before: splitLines(str(r.BeforeItems)), after: splitLines(str(r.AfterItems)),
      // 목록에는 사람이 읽는 번호(1부터)로 넣습니다
      aiStep,
      effects: [parseEffect('시간', str(r.EffectTime)), parseEffect('품질 수준', str(r.EffectQuality)), parseEffect('정신적 노력 수준', str(r.EffectEffort))]
        .filter(x => !!x) as { label: string; before: string; after: string }[],
      verify: splitLines(str(r.Verification)), prompt: str(r.ReusePrompt),
      author: person(r.Author), created: str(r.Created),
      // 사례는 승인 없이 바로 공개합니다(목록의 콘텐츠 승인은 끕니다).
      // 혹시 승인이 켜져 있으면 0 = 승인됨, 그 밖의 값은 본인 글이 아직 검토 중이라 '공개 검토 중'으로 표시합니다.
      pending: typeof r.OData__ModerationStatus === 'number' && r.OData__ModerationStatus !== 0
      };
    });
  }
  private caseFields(c: INewCase): any {
    const step = c.prompts.filter(p => p.step >= 0)[0];
    return {
      Title: c.title, Industry: c.industry, ClientName: c.client, Department: c.dept, Period: c.period,
      ProjectSummary: c.project, BusinessArea: c.area, AIPattern: c.pattern, Products: c.products.join('; '),
      KeyEffect: c.keyValue, KeyEffectNote: c.keyNote,
      EffectTime: c.time.join('|'), EffectQuality: c.quality.join('|'), EffectEffort: c.effort.join('|'),
      BeforeText: c.beforeText, AfterText: c.afterText, BeforeItems: c.beforeSteps.join('\n'), AfterItems: c.afterSteps.join('\n'),
      // 예전 화면과 맞추려고 첫 Use Case가 연결된 After 단계를 AI 단계 번호(1부터)로도 남깁니다
      AIStep: step ? step.step + 1 : null,
      Verification: c.how, Solutions: solutionsText(c.solutions), ReusePrompt: promptsText(c.prompts), CaseContact: c.contact
    };
  }
  private static CASE_NEW_COLS = ['KeyEffectNote', 'BeforeText', 'AfterText', 'CaseContact'];
  /** 사례 올리기. 승인 없이 바로 모두에게 보입니다. (새 열이 아직 없으면 그 칸만 빼고 저장) */
  public async createCase(c: INewCase): Promise<number> {
    const d = await this.withOptional(this.caseFields(c), HubService.CASE_NEW_COLS, f => this.create(this.lists.cases, f));
    return d.Id;
  }
  /** 내 사례 고치기 */
  public async updateCase(id: number, c: INewCase): Promise<void> {
    await this.withOptional(this.caseFields(c), HubService.CASE_NEW_COLS, f => this.merge(this.lists.cases, id, f));
  }
  public async deleteCase(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.cases)}/items(${id})/recycle()`, undefined, undefined, this.lists.cases);
  }

  /* ---------- 반응: 별도 목록 없이 SharePoint 기본 기능을 씁니다 ----------
     - 리뷰 별점: Agent Catalog · Skill Library · HTML Library 의 평점 설정(별 등급). 한 사람당 하나, 다시 매기면 바뀝니다.
     - 리뷰 글: 같은 세 목록의 항목 댓글
     - 공감: Idea Board 평점 설정(좋아요)
     - 댓글 · 만들래요: Idea Board 항목 댓글. 만들래요는 MAKE_TEXT 로 시작하는 댓글입니다. */
  private listIds: { [title: string]: string } = {};
  private titleOf(t: TargetType): string {
    return t === 'Agent' ? this.lists.agents : t === 'Skill' ? this.lists.skills : t === 'Html' ? this.lists.htmls : this.lists.ideas;
  }
  private async listId(title: string): Promise<string> {
    if (!this.listIds[title]) {
      const d = await this.getJson(this.listUrl(title) + '?$select=Id', title);
      this.listIds[title] = str(d && d.Id);
    }
    return this.listIds[title];
  }
  /** 다중 사용자 열 값 (nometadata 는 배열, 오래된 형식은 results) */
  private static users(v: any): any[] {
    if (!v) { return []; }
    if (Object.prototype.toString.call(v) === '[object Array]') { return v; }
    return v.results || [];
  }
  /** 평점 설정이 꺼져 있으면 열이 없어서 400이 납니다. 알아보기 쉬운 안내로 바꿉니다. 목록이 없으면(404) 그 목록 화면에서 이미 안내하므로 비워 둡니다. */
  private ratingFail(e: unknown, title: string, mode: string): IReaction[] {
    if (e instanceof HubError && e.status === 404) { return []; }
    if (e instanceof HubError && e.status === 400) {
      throw new HubError(`'${title}'의 평점 설정이 꺼져 있어요. 목록 설정 → 평점 설정에서 '${mode}'으로 켜 주세요.`, 400, title);
    }
    throw e;
  }
  private async starRows(t: 'Agent' | 'Skill' | 'Html'): Promise<IReaction[]> {
    const title = this.titleOf(t);
    try {
      const rows = await this.items(title, ['Id', 'Ratings', 'RatedBy/Id', 'RatedBy/Title', 'RatedBy/EMail'], ['RatedBy'], undefined, 5000);
      const out: IReaction[] = [];
      rows.forEach((r: any) => {
        // Ratings 는 '5,4,' 처럼 RatedBy 와 같은 순서의 값
        const vals = str(r.Ratings).split(',').filter(x => !!x.trim()).map(Number);
        HubService.users(r.RatedBy).forEach((u: any, k: number) => {
          const p = person(u);
          if (p && vals[k] > 0) { out.push({ id: `rt:${t}:${r.Id}:${p.id}`, targetType: t, targetId: r.Id, kind: '리뷰', body: '', rating: vals[k], author: p, created: '' }); }
        });
      });
      return out;
    } catch (e) { return this.ratingFail(e, title, '별 등급'); }
  }
  private async likeRows(): Promise<IReaction[]> {
    const title = this.lists.ideas;
    try {
      const rows = await this.items(title, ['Id', 'LikedBy/Id', 'LikedBy/Title', 'LikedBy/EMail'], ['LikedBy'], undefined, 5000);
      const out: IReaction[] = [];
      rows.forEach((r: any) => HubService.users(r.LikedBy).forEach((u: any) => {
        const p = person(u);
        if (p) { out.push({ id: `lk:Idea:${r.Id}:${p.id}`, targetType: 'Idea', targetId: r.Id, kind: '좋아요', body: '', author: p, created: '' }); }
      }));
      return out;
    } catch (e) { return this.ratingFail(e, title, '좋아요'); }
  }
  private commentOf(t: TargetType, itemId: number, c: any): IReaction {
    const text = str(c && c.text);
    const make = t === 'Idea' && text.indexOf(MAKE_TEXT) === 0;
    const start = t === 'Idea' && text.indexOf(START_TEXT) === 0;
    const a = (c && c.author) || {};
    // 리뷰 댓글은 '[★4] 한 줄 평' 처럼 그 리뷰의 별점을 앞에 적어 둡니다 (리뷰를 여러 개 남겨도 각자 별점이 남도록)
    const star = t !== 'Idea' ? REVIEW_STAR.exec(text) : null;
    return {
      id: `cm:${t}:${itemId}:${c.id}`, commentId: Number(c.id), targetType: t, targetId: itemId,
      kind: make ? '만들래요' : start ? '시작' : t === 'Idea' ? '댓글' : '리뷰', body: make || start ? '' : star ? text.slice(star[0].length) : text,
      rating: star ? Number(star[1]) : undefined,
      author: a.id || a.email ? { id: Number(a.id) || 0, name: str(a.name), email: str(a.email) } : undefined,
      created: str(c.createdDate)
    };
  }
  private async itemComments(t: TargetType, itemId: number): Promise<IReaction[]> {
    const title = this.titleOf(t);
    const d = await this.getJson(`${this.listUrl(title)}/items(${itemId})/Comments`, title);
    return ((d && d.value) || []).map((c: any) => this.commentOf(t, itemId, c));
  }
  /** 댓글이 달린 항목만 골라(_CommentCount) 항목별로 읽습니다. 한 번에 6개씩 보냅니다. */
  private async commentRows(t: TargetType): Promise<IReaction[]> {
    const title = this.titleOf(t);
    let ids: number[];
    try {
      ids = (await this.items(title, ['Id', '_CommentCount'], [], undefined, 5000)).filter((r: any) => Number(r._CommentCount) > 0).map((r: any) => r.Id);
    } catch (e) {
      if (e instanceof HubError && e.status === 404) { return []; }
      // 댓글 수 열을 못 읽으면 최근 항목 200개만 확인
      ids = (await this.items(title, ['Id'], [], undefined, 200)).map((r: any) => r.Id);
    }
    let out: IReaction[] = [];
    for (let i = 0; i < ids.length; i += 6) {
      const part = await Promise.all(ids.slice(i, i + 6).map(id => this.itemComments(t, id).catch((): IReaction[] => [])));
      part.forEach(p => { out = out.concat(p); });
    }
    return out;
  }
  /** 리뷰: 별점을 남긴 사람의 가장 최근 댓글에 그 별점을 붙입니다. 댓글 없이 별점만 남긴 사람은 별점만 한 줄. */
  private static pairReviews(stars: IReaction[], comments: IReaction[]): IReaction[] {
    const same = (a?: IPerson, b?: IPerson): boolean => !!a && !!b && (a.id && b.id ? a.id === b.id : !!a.email && a.email.toLowerCase() === b.email.toLowerCase());
    const out = comments.slice();
    stars.forEach(s => {
      const theirs = out.filter(c => c.id.indexOf('cm:') === 0 && c.targetId === s.targetId && same(c.author, s.author));
      // Hub에서 남긴 리뷰는 댓글에 별점이 있으므로 그대로 둡니다.
      if (theirs.some(c => !!c.rating)) { return; }
      // SharePoint 화면에서 별점만 누르고 댓글을 따로 단 경우: 가장 최근 댓글에 그 별점을 붙이고, 댓글이 없으면 별점만 한 줄
      const latest = theirs.sort((x, y) => y.created.localeCompare(x.created))[0];
      if (latest) { latest.rating = s.rating; } else { out.push(s); }
    });
    return out;
  }
  /** 별점·좋아요·댓글을 모두 읽습니다. 일부를 못 읽어도 나머지는 보여 주고, 안내 문구를 error 로 돌려줍니다. */
  public async getReactions(): Promise<{ list: IReaction[]; error?: string }> {
    const errs: string[] = [];
    const part = (p: Promise<IReaction[]>): Promise<IReaction[]> => p.catch((e): IReaction[] => {
      const m = e instanceof Error ? e.message : '읽지 못했어요.';
      if (errs.indexOf(m) < 0) { errs.push(m); }
      return [];
    });
    const [ar, ac, sr, sc, hr, hc, il, ic] = await Promise.all([
      part(this.starRows('Agent')), part(this.commentRows('Agent')), part(this.starRows('Skill')), part(this.commentRows('Skill')),
      part(this.starRows('Html')), part(this.commentRows('Html')), part(this.likeRows()), part(this.commentRows('Idea'))
    ]);
    return {
      list: HubService.pairReviews(ar, ac).concat(HubService.pairReviews(sr, sc), HubService.pairReviews(hr, hc), il, ic),
      error: errs.length ? errs.join(' ') : undefined
    };
  }
  private async reputation(t: TargetType, op: 'SetRating' | 'SetLike', itemId: number, value: number | boolean): Promise<void> {
    const title = this.titleOf(t);
    const lid = await this.listId(title);
    const arg = op === 'SetRating' ? 'rating' : 'like';
    const url = `${this.site}/_api/Microsoft.Office.Server.ReputationModel.Reputation.${op}(listID=@a1,itemID=@a2,${arg}=@a3)`
      + `?@a1='${encodeURIComponent('{' + lid + '}')}'&@a2='${itemId}'&@a3=${value}`;
    try { await this.send(url, undefined, undefined, title); } catch (e) {
      if (e instanceof HubError && e.status === 404) { throw e; }
      this.ratingFail(e, title, op === 'SetRating' ? '별 등급' : '좋아요');
    }
  }
  /** 내 별점 (1~5). 이미 매겼으면 바뀝니다. */
  public setRating(t: 'Agent' | 'Skill' | 'Html', itemId: number, rating: number): Promise<void> {
    return this.reputation(t, 'SetRating', itemId, Math.max(1, Math.min(5, Math.round(rating))));
  }
  /** 아이디어 공감 켜기·끄기 */
  public setLike(ideaId: number, on: boolean): Promise<void> {
    return this.reputation('Idea', 'SetLike', ideaId, on);
  }
  /** 항목 댓글 달기 (Agent·Skill·HTML 리뷰 글, 아이디어 댓글·만들래요) */
  public async addComment(t: TargetType, itemId: number, text: string): Promise<IReaction> {
    const title = this.titleOf(t);
    const d = await this.send(`${this.listUrl(title)}/items(${itemId})/Comments`, { text }, undefined, title);
    return this.commentOf(t, itemId, d && d.id !== undefined ? d : { id: 0, text, createdDate: new Date().toISOString() });
  }
  public async removeComment(t: TargetType, itemId: number, commentId: number): Promise<void> {
    const title = this.titleOf(t);
    await this.send(`${this.listUrl(title)}/items(${itemId})/Comments(${commentId})`, undefined, { 'X-HTTP-Method': 'DELETE' }, title);
  }

  /* ---------- Skill · HTML (목록 + 첨부 파일) ----------
     항목 하나 = Skill(또는 HTML 도구) 하나이고, 파일은 그 항목의 첨부 파일로 둡니다.
     목록이라 Agent처럼 평점(별 등급)과 항목 댓글(리뷰 글)을 쓸 수 있습니다.
     새 버전을 올리면 첨부 파일을 바꿉니다. 버전·변경 내용은 항목 버전 기록에 남지만 이전 파일 내용은 남지 않습니다. */
  private fileApi(fileRef: string): string {
    return `${this.site}/_api/web/GetFileByServerRelativePath(decodedurl='${encodeURIComponent(fileRef.replace(/'/g, "''"))}')`;
  }
  private origin(): string {
    const m = /^https?:\/\/[^/]+/i.exec(this.site);
    return m ? m[0] : '';
  }
  /** 항목의 첨부 파일 (여럿이면 가장 최근에 올린 것: 이름 앞의 숫자가 올린 시각) */
  private fileOf(files: any): { stored: string; ref: string; url: string } {
    const list: any[] = (Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []))
      .slice().sort((a: any, b: any) => str(b.FileName).localeCompare(str(a.FileName)));
    const f = list[0];
    const ref = f ? str(f.ServerRelativeUrl) : '';
    return { stored: f ? str(f.FileName) : '', ref, url: ref ? this.origin() + encodeURI(ref) : '' };
  }
  private async addAttachment(list: string, id: number, name: string, body: string | ArrayBuffer): Promise<void> {
    const res = await this.client.post(`${this.listUrl(list)}/items(${id})/AttachmentFiles/add(FileName='${encodeURIComponent(name.replace(/'/g, "''"))}')`,
      SPHttpClient.configurations.v1, { headers: { 'Accept': 'application/json;odata=nometadata', 'odata-version': '3.0' }, body });
    if (!res.ok) { await this.fail(res, list); }
  }
  private removeAttachment(list: string, id: number, name: string): Promise<any> {
    return this.send(`${this.listUrl(list)}/items(${id})/AttachmentFiles('${encodeURIComponent(name.replace(/'/g, "''"))}')`, undefined, { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' }, list);
  }
  /** 새 항목: 정보를 먼저 저장하고 파일을 첨부합니다. 첨부가 실패하면 방금 만든 항목을 휴지통으로 보내 빈 항목이 남지 않게 합니다. */
  private async createWithFile(list: string, fields: any, name: string, body: string | ArrayBuffer): Promise<number> {
    const d = await this.staged('info', () => this.create(list, fields));
    try {
      await this.staged('file', () => this.addAttachment(list, d.Id, name, body));
    } catch (e) {
      await this.send(`${this.listUrl(list)}/items(${d.Id})/recycle()`, undefined, undefined, list).catch(() => undefined);
      throw e;
    }
    return d.Id;
  }
  /** 새 버전: 새 파일을 먼저 첨부하고, 성공하면 이전 파일을 지웁니다(이전 파일 지우기는 실패해도 계속). 그다음 정보를 고칩니다. */
  private async updateWithFile(list: string, id: number, oldName: string, fields: any, file?: { name: string; body: string | ArrayBuffer }): Promise<void> {
    if (file) {
      const name = storedSkillName(file.name);
      await this.staged('file', () => this.addAttachment(list, id, name, file.body));
      if (oldName && oldName !== name) { await this.removeAttachment(list, id, oldName).catch(() => undefined); }
    }
    await this.staged('info', () => this.merge(list, id, fields));
  }

  public async getSkills(): Promise<ISkill[]> {
    const rows = await this.items(this.lists.skills,
      ['Id', 'Title', 'SkillSummary', 'SkillPurpose', 'SkillUsage', 'SkillTools', 'SkillKind', 'SkillScope', 'SkillArea', 'SkillVersion', 'SkillChangeNote',
        'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl', 'Created', 'Modified'].concat(AUTHOR),
      ['Author', 'AttachmentFiles']);
    return rows.map((r: any): ISkill => {
      const f = this.fileOf(r.AttachmentFiles);
      return {
        id: r.Id, title: str(r.Title) || originalSkillName(f.stored), summary: str(r.SkillSummary),
        purpose: str(r.SkillPurpose), usage: str(r.SkillUsage), tools: splitList(r.SkillTools),
        kind: str(r.SkillKind), scope: str(r.SkillScope), area: str(r.SkillArea),
        version: str(r.SkillVersion) || '1.0', changeNote: str(r.SkillChangeNote),
        storedName: f.stored, fileName: originalSkillName(f.stored), ext: extOf(f.stored), fileRef: f.ref, fileUrl: f.url,
        author: person(r.Author), created: str(r.Created), modified: str(r.Modified)
      };
    });
  }
  private skillFields(s: INewSkill): any {
    return {
      Title: s.title, SkillSummary: s.summary, SkillPurpose: s.purpose, SkillUsage: s.usage, SkillTools: s.tools.join('; '),
      SkillKind: s.kind, SkillScope: s.scope, SkillArea: s.area, SkillVersion: s.version, SkillChangeNote: s.changeNote
    };
  }
  private fileBody(s: INewSkill): string | ArrayBuffer {
    return s.file ? (s.file.data || s.file.text || '') : '';
  }

  /** Skill 올리기. 승인 없이 바로 모두에게 보입니다. */
  public async createSkill(s: INewSkill): Promise<number> {
    if (!s.file) { throw new HubError('Skill 파일을 골라 주세요.', 400); }
    return this.createWithFile(this.lists.skills, this.skillFields(s), storedSkillName(s.file.name), this.fileBody(s));
  }
  /** Skill 새 버전. 새 파일이 있으면 첨부 파일을 바꾸고, 정보 열을 고칩니다. */
  public async updateSkill(skill: ISkill, s: INewSkill): Promise<void> {
    await this.updateWithFile(this.lists.skills, skill.id, skill.storedName, this.skillFields(s), s.file ? { name: s.file.name, body: this.fileBody(s) } : undefined);
  }
  /** Skill 삭제. 항목과 첨부 파일이 사이트 휴지통으로 갑니다. */
  public async deleteSkill(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.skills)}/items(${id})/recycle()`, undefined, undefined, this.lists.skills);
  }
  /** Skill 파일 내용 (md·txt 본문 보기·복사용) */
  public async getSkillText(fileRef: string): Promise<string> {
    const res = await this.client.get(`${this.fileApi(fileRef)}/$value`, SPHttpClient.configurations.v1);
    if (!res.ok) { return this.fail(res, this.lists.skills); }
    return res.text();
  }
  public getSkillVersions(id: number): Promise<IVersion[]> {
    return this.versions(this.lists.skills, id, 'SkillVersion', 'SkillChangeNote');
  }

  /* ---------- HTML 도구 (목록 + 첨부 파일) ----------
     항목 하나 = 도구 하나, .html 파일은 첨부 파일. '열기'는 파일 내용을 읽어 격리된(sandbox) 창에서 보여 줍니다. */
  public async getHtmls(): Promise<IHtmlTool[]> {
    const rows = await this.items(this.lists.htmls,
      ['Id', 'Title', 'HtmlSummary', 'HtmlDoes', 'MakerNote', 'MadeWith', 'UseScope', 'WorkType', 'OutputType', 'HtmlVersion', 'HtmlChangeNote',
        'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl', 'Created', 'Modified'].concat(AUTHOR),
      ['Author', 'AttachmentFiles']);
    return rows.map((r: any): IHtmlTool => {
      const f = this.fileOf(r.AttachmentFiles);
      return {
        id: r.Id, title: str(r.Title) || originalSkillName(f.stored), summary: str(r.HtmlSummary), does: splitLines(str(r.HtmlDoes)),
        makerNote: str(r.MakerNote), madeWith: str(r.MadeWith), scope: str(r.UseScope), workType: str(r.WorkType), output: str(r.OutputType),
        version: str(r.HtmlVersion) || '1.0', changeNote: str(r.HtmlChangeNote),
        storedName: f.stored, fileName: originalSkillName(f.stored), fileRef: f.ref, fileUrl: f.url,
        author: person(r.Author), created: str(r.Created), modified: str(r.Modified)
      };
    });
  }
  private htmlFields(h: INewHtml): any {
    return {
      Title: h.title, HtmlSummary: h.summary, HtmlDoes: h.does.join('\n'), MakerNote: h.makerNote, MadeWith: h.madeWith,
      UseScope: h.scope, WorkType: h.workType, OutputType: h.output, HtmlVersion: h.version, HtmlChangeNote: h.changeNote
    };
  }
  /** HTML 올리기. 승인 없이 바로 보입니다. */
  public async createHtml(h: INewHtml): Promise<number> {
    if (!h.file) { throw new HubError('HTML 파일을 골라 주세요.', 400); }
    return this.createWithFile(this.lists.htmls, this.htmlFields(h), storedSkillName(h.file.name), h.file.text);
  }
  public async updateHtml(tool: IHtmlTool, h: INewHtml): Promise<void> {
    await this.updateWithFile(this.lists.htmls, tool.id, tool.storedName, this.htmlFields(h), h.file ? { name: h.file.name, body: h.file.text } : undefined);
  }

  /** 실패하면 어느 단계(파일 / 정보)였는지 오류에 적어 둡니다. 화면이 알맞은 안내를 고를 수 있게. */
  private async staged<T>(stage: 'file' | 'info', run: () => Promise<T>): Promise<T> {
    try { return await run(); } catch (e) {
      const err = e instanceof HubError ? e : new HubError(e instanceof Error ? e.message : String(e), 0);
      err.stage = stage;
      throw err;
    }
  }
  public async deleteHtml(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.htmls)}/items(${id})/recycle()`, undefined, undefined, this.lists.htmls);
  }
  public async getFileText(fileRef: string): Promise<string> {
    const res = await this.client.get(`${this.fileApi(fileRef)}/$value`, SPHttpClient.configurations.v1);
    if (!res.ok) { return this.fail(res); }
    return res.text();
  }
  public getHtmlVersions(id: number): Promise<IVersion[]> {
    return this.versions(this.lists.htmls, id, 'HtmlVersion', 'HtmlChangeNote');
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
