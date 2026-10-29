/* SharePoint 목록 읽기·쓰기 (SharePoint REST + SPHttpClient)
   - 별도 패키지 없이 SPFx 기본 SPHttpClient 만 씁니다. 요청 다이제스트와 인증은 SPHttpClient 가 처리합니다.
   - 응답은 odata=nometadata 형식으로 받아 가볍게 유지합니다.
   - 열 내부 이름은 docs/lists.md 와 같습니다. */
import { SPHttpClient, SPHttpClientResponse, ISPHttpClientOptions } from '@microsoft/sp-http';
import {
  IAgent, IAgentRequest, IHubData, IHubLists, IIdea, IInsight, IMe, INewAgentRequest, INewIdea, INewInsight,
  IPerson, IReaction, ReactionKind, TargetType
} from '../models/types';

const JSON_HEADERS: { [k: string]: string } = {
  'Accept': 'application/json;odata=nometadata',
  'Content-Type': 'application/json;odata=nometadata',
  'odata-version': ''
};

export class HubError extends Error {
  public status: number;
  public listTitle?: string;
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

export class HubService {
  private readonly site: string;

  constructor(private readonly client: SPHttpClient, siteUrl: string, private readonly lists: IHubLists) {
    this.site = siteUrl.replace(/\/+$/, '');
  }

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
      throw new HubError(`'${listTitle}' 목록을 찾을 수 없습니다. 목록 생성 스크립트를 실행했는지, 웹 파트 설정의 목록 이름이 맞는지 확인해 주세요.`, 404, listTitle);
    }
    if (res.status === 401 || res.status === 403) {
      throw new HubError(`${listTitle ? `'${listTitle}' 목록에 ` : ''}접근 권한이 없습니다. Hub 운영 담당자에게 권한을 요청해 주세요.`, res.status, listTitle);
    }
    throw new HubError(detail || `SharePoint 요청이 실패했습니다 (${res.status}).`, res.status, listTitle);
  }
  private async getJson(url: string, listTitle?: string): Promise<any> {
    const res = await this.client.get(url, SPHttpClient.configurations.v1, { headers: { 'Accept': 'application/json;odata=nometadata', 'odata-version': '' } });
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

  /* ---------- 사용자 ---------- */
  public async getMe(): Promise<IMe> {
    const d = await this.getJson(`${this.site}/_api/web/currentuser?$select=Id,Title,Email`);
    return { id: d.Id, name: d.Title, email: d.Email };
  }

  /* ---------- 읽기 ---------- */
  public async loadAll(me: IMe): Promise<IHubData> {
    const [agents, ideas, insights, reactions, myRequests] = await Promise.all([
      this.getAgents(), this.getIdeas(), this.getInsights(), this.getReactions(), this.getMyRequests(me.id)
    ]);
    return { agents, ideas, insights, reactions, myRequests };
  }

  public async getAgents(): Promise<IAgent[]> {
    const rows = await this.items(this.lists.agents,
      ['Id', 'Title', 'AgentSummary', 'AgentDescription', 'AgentCategory', 'AgentType', 'ShareLevel', 'RiskTier',
        'DataSources', 'DataSensitivity', 'ExternalConnections', 'InstallLink', 'OwnerTeam', 'ReviewedOn', 'SourceIdeaId',
        'AgentOwner/Id', 'AgentOwner/Title', 'AgentOwner/EMail'],
      ['AgentOwner'],
      "AgentStatus eq '게시'");
    return rows.map((r: any): IAgent => ({
      id: r.Id, title: str(r.Title), summary: str(r.AgentSummary), description: str(r.AgentDescription),
      category: str(r.AgentCategory), type: r.AgentType || '정보 조회형', shareLevel: r.ShareLevel || '직원 공유',
      risk: r.RiskTier || '저', dataSources: str(r.DataSources), sensitivity: str(r.DataSensitivity),
      external: splitList(r.ExternalConnections), installLink: str(r.InstallLink), ownerTeam: str(r.OwnerTeam),
      reviewedOn: str(r.ReviewedOn), sourceIdeaId: num(r.SourceIdeaId),
      owner: person(r.AgentOwner)
    }));
  }

  public async getMyRequests(meId: number): Promise<IAgentRequest[]> {
    const rows = await this.items(this.lists.requests,
      ['Id', 'Title', 'AgentSummary', 'AgentCategory', 'AgentType', 'ShareLevel', 'RiskTier', 'RequestStatus',
        'ReviewerComment', 'PublishedAgentId', 'Created'],
      [], `AuthorId eq ${meId}`, 200);
    return rows.map((r: any): IAgentRequest => ({
      id: r.Id, title: str(r.Title), summary: str(r.AgentSummary), category: str(r.AgentCategory),
      type: r.AgentType || '정보 조회형', shareLevel: r.ShareLevel || '직원 공유', risk: r.RiskTier || '저',
      status: r.RequestStatus || '검토 중', reviewerComment: str(r.ReviewerComment),
      publishedAgentId: num(r.PublishedAgentId), created: str(r.Created)
    }));
  }

  public async getIdeas(): Promise<IIdea[]> {
    const rows = await this.items(this.lists.ideas,
      ['Id', 'Title', 'IdeaSummary', 'IdeaPain', 'Frequency', 'MinutesPerRun', 'ProposerTeam', 'IdeaCategory',
        'IdeaStatus', 'LinkedAgentId', 'Created', 'Author/Id', 'Author/Title', 'Author/EMail'],
      ['Author']);
    return rows.map((r: any): IIdea => ({
      id: r.Id, title: str(r.Title), summary: str(r.IdeaSummary), pain: str(r.IdeaPain),
      frequency: r.Frequency || undefined, minutes: num(r.MinutesPerRun), team: str(r.ProposerTeam),
      category: str(r.IdeaCategory), status: r.IdeaStatus || '아이디어', linkedAgentId: num(r.LinkedAgentId),
      author: person(r.Author), created: str(r.Created)
    }));
  }

  public async getInsights(): Promise<IInsight[]> {
    const rows = await this.items(this.lists.insights,
      ['Id', 'Title', 'InsightSummary', 'Industry', 'BusinessArea', 'CustomerType', 'BuiltWith', 'Problem', 'Solution',
        'Outcome', 'Lessons', 'AuthorTeam', 'ProjectName', 'DetailUrl', 'Created', 'OData__ModerationStatus'],
      []);
    return rows.map((r: any): IInsight => ({
      id: r.Id, title: str(r.Title), summary: str(r.InsightSummary), industry: str(r.Industry), area: str(r.BusinessArea),
      customerType: str(r.CustomerType), tools: splitList(r.BuiltWith), problem: str(r.Problem), solution: str(r.Solution),
      outcome: str(r.Outcome), lessons: str(r.Lessons), team: str(r.AuthorTeam), project: str(r.ProjectName),
      detailUrl: str(r.DetailUrl), created: str(r.Created),
      // 콘텐츠 승인: 0 = 승인됨. 그 밖의 값은 본인 글이 아직 검토 중이라는 뜻
      pending: typeof r.OData__ModerationStatus === 'number' && r.OData__ModerationStatus !== 0
    }));
  }

  public async getReactions(): Promise<IReaction[]> {
    const rows = await this.items(this.lists.reactions,
      ['Id', 'TargetType', 'TargetId', 'ReactionKind', 'ReactionBody', 'Created', 'Author/Id', 'Author/Title', 'Author/EMail'],
      ['Author'], undefined, 5000);
    return rows.map((r: any): IReaction => ({
      id: r.Id, targetType: r.TargetType, targetId: r.TargetId, kind: r.ReactionKind || '좋아요',
      body: str(r.ReactionBody), author: person(r.Author), created: str(r.Created)
    }));
  }

  /* ---------- 쓰기 ---------- */
  public async createRequest(req: INewAgentRequest): Promise<number> {
    const d = await this.send(this.listUrl(this.lists.requests) + '/items', {
      Title: req.title,
      AgentSummary: req.summary,
      AgentDescription: req.description,
      AgentCategory: req.category,
      AgentType: req.type,
      DataSources: req.dataSources,
      DataSensitivity: req.sensitivity,
      ExternalConnections: req.external.join('; '),
      ShareLevel: req.shareLevel,
      InstallLink: req.installLink,
      OwnerTeam: req.ownerTeam,
      TestConfirmed: req.testConfirmed,
      TestNote: req.testNote,
      RiskTier: req.risk,
      RequestStatus: '검토 중'
    }, undefined, this.lists.requests);
    return d.Id;
  }

  public async cancelRequest(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.requests)}/items(${id})`, { RequestStatus: '취소' },
      { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }, this.lists.requests);
  }

  public async createIdea(idea: INewIdea): Promise<number> {
    const d = await this.send(this.listUrl(this.lists.ideas) + '/items', {
      Title: idea.title,
      IdeaSummary: idea.summary,
      IdeaPain: idea.pain,
      Frequency: idea.frequency,
      MinutesPerRun: idea.minutes === undefined ? null : idea.minutes,
      ProposerTeam: idea.team,
      IdeaCategory: idea.category,
      IdeaStatus: '아이디어'
    }, undefined, this.lists.ideas);
    return d.Id;
  }

  /** 사례 올리기. 목록에 콘텐츠 승인이 켜져 있어 운영 담당자가 승인하기 전에는 작성자에게만 보입니다. */
  public async createInsight(s: INewInsight): Promise<number> {
    const d = await this.send(this.listUrl(this.lists.insights) + '/items', {
      Title: s.title,
      InsightSummary: s.summary,
      Industry: s.industry,
      BusinessArea: s.area,
      CustomerType: s.customerType,
      BuiltWith: s.tools.join('; '),
      Problem: s.problem,
      Solution: s.solution,
      Outcome: s.outcome,
      Lessons: s.lessons,
      AuthorTeam: s.team,
      ProjectName: s.project,
      DetailUrl: s.detailUrl
    }, undefined, this.lists.insights);
    return d.Id;
  }

  public async addReaction(targetType: TargetType, targetId: number, kind: ReactionKind, body: string = ''): Promise<IReaction> {
    const d = await this.send(this.listUrl(this.lists.reactions) + '/items', {
      Title: `${targetType}:${targetId}:${kind}`,
      TargetType: targetType,
      TargetId: targetId,
      ReactionKind: kind,
      ReactionBody: body
    }, undefined, this.lists.reactions);
    return { id: d.Id, targetType, targetId, kind, body, created: str(d.Created) || new Date().toISOString() };
  }

  public async updateReactionBody(id: number, body: string): Promise<void> {
    await this.send(`${this.listUrl(this.lists.reactions)}/items(${id})`, { ReactionBody: body },
      { 'X-HTTP-Method': 'MERGE', 'IF-MATCH': '*' }, this.lists.reactions);
  }

  public async removeReaction(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.reactions)}/items(${id})`, undefined,
      { 'X-HTTP-Method': 'DELETE', 'IF-MATCH': '*' }, this.lists.reactions);
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
