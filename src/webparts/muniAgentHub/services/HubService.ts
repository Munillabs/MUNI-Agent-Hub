/* SharePoint 목록 읽기·쓰기 (SharePoint REST + SPHttpClient)
   - 별도 패키지 없이 SPFx 기본 SPHttpClient 만 씁니다. 요청 다이제스트와 인증은 SPHttpClient 가 처리합니다.
   - 응답은 odata=nometadata 형식으로 받아 가볍게 유지합니다.
   - 열 내부 이름은 README의 'SharePoint 목록'과 같습니다. */
import { SPHttpClient, SPHttpClientResponse, ISPHttpClientOptions } from '@microsoft/sp-http';
import {
  IAgent, IAgentEdit, ICase, ICaseRef, IHtmlTool, IHubData, IHubLists, IIdea, IImage, IMe, INewCase, INewHtml, INewIdea, INewSkill, INewShot, INewThumb,
  IPerson, IReaction, ISkill, IVersion, TargetType
} from '../models/types';
import {
  IDEA_STATUS, compareText, extOf, runLabel, originalSkillName, parseCompare, parseProcess, parsePrompts, parseSolutions, processText, promptsText, solutionsText, splitLines, storedSkillName, useFromPattern
} from '../models/rules';

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
/** 선택(여러 개) 열: nometadata 는 배열, verbose 는 {results: []} */
function choices(v: any): string[] {
  if (!v) { return []; }
  if (Object.prototype.toString.call(v) === '[object Array]') { return (v as any[]).map(x => String(x)).filter(x => !!x); }
  if (v.results) { return choices(v.results); }
  return String(v).split(/\s*;#?\s*/).filter(x => !!x);
}
/** 조회(여러 개) 열에서 보여 줄 값만 */
function lookups(v: any, field: string): string[] {
  const list: any[] = Object.prototype.toString.call(v) === '[object Array]' ? v : ((v && v.results) || []);
  return list.map(x => str(x && x[field])).filter(x => !!x);
}
function str(v: any): string { return v === null || v === undefined ? '' : String(v); }
function num(v: any): number | undefined { return typeof v === 'number' && !isNaN(v) ? v : undefined; }
function pad2(n: number): string { return (n < 10 ? '0' : '') + n; }
/** 대표 효과를 큰 글자(62% 감소)와 작은 설명(보고서 작성 시간)으로 나눕니다. 설명 열(KeyEffectNote)이 있으면 그대로 씁니다. */
function splitEffect(effect: string, note: string): { value: string; note: string } {
  const e = effect.trim();
  if (note.trim()) { return { value: e, note: note.trim() }; }
  // 숫자가 든 마지막 말(+ 뒤 한 단어)을 큰 글자로: '보고서 작성 시간 62% 감소' → '62% 감소'
  const m = /^(.*\S)\s+(\S*\d\S*(?:\s+[^\s\d]+)?)$/.exec(e);
  return m ? { value: m[2], note: m[1] } : { value: e, note: '' };
}
const AUTHOR = ['Author/Id', 'Author/Title', 'Author/EMail'];
/** 리뷰 댓글 앞에 붙이는 별점 표시: '[★4] ' */
const REVIEW_STAR = /^\[★([1-5])\]\s*/;
export function reviewText(rating: number, body: string): string { return `[★${rating}] ${body}`; }

export class HubService {
  private readonly site: string;

  constructor(private readonly client: SPHttpClient, siteUrl: string, private readonly lists: IHubLists) {
    this.site = siteUrl.replace(/\/+$/, '');
  }

  /** 웹 파트 설정의 목록 이름 (안내 문구용) */
  public listName(k: keyof IHubLists): string { return this.lists[k] || ''; }

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
  private async itemsOpt(title: string, select: string[], expand: string[], opt: { select: string[]; expand?: string[] } | { select: string[]; expand?: string[] }[], filter?: string, top?: number): Promise<any[]> {
    type Opt = { select: string[]; expand?: string[] };
    const opts = Object.prototype.toString.call(opt) === '[object Array]' ? (opt as Opt[]) : [opt as Opt];
    const run = (use: Opt[], n?: number): Promise<any[]> =>
      this.items(title, use.reduce((s, o) => s.concat(o.select), select), use.reduce((x, o) => x.concat(o.expand || []), expand), filter, n || top);
    try {
      return await run(opts);
    } catch (e) {
      if (!(e instanceof HubError && e.status === 400)) { throw e; }
    }
    // 어느 묶음이 문제인지 하나씩 1줄만 읽어 보고, 되는 묶음만 남겨 다시 읽습니다
    // (예: 조회 열이 깨져도 조회수 열은 계속 읽음)
    const ok: Opt[] = [];
    for (const o of opts) {
      try { await run(ok.concat([o]), 1); ok.push(o); } catch (e) {
        if (!(e instanceof HubError && e.status === 400)) { throw e; }
      }
    }
    return run(ok);
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
    const [ag, id, cs, rx, sk, ht, av, ic] = await Promise.all([
      soft(this.getAgents(), 'Agent'), soft(this.getIdeas(), 'Idea'), soft(this.getCases(), 'Case'), this.getReactions(),
      soft(this.getSkills(), 'Skill'), soft(this.getHtmls(), 'HTML'),
      // 프로필 배지는 없어도 됩니다 (열이 없으면 모두 자동: 최근 배지)
      this.getProfiles().then(v => v, () => ({ avatars: {}, visits: {} })),
      this.ideaCategoryCol()
    ]);
    return {
      avatars: av.avatars, visits: av.visits, ideaCats: ic && ic.choices.length ? ic.choices : undefined,
      agents: ag.list, agentsError: ag.error, ideas: id.list, ideasError: id.error, cases: cs.list, casesError: cs.error,
      reactions: rx.list.concat(HubService.ideaReactions(id.list)), reactionsError: rx.error, skills: sk.list, skillsError: sk.error, htmls: ht.list, htmlsError: ht.error
    };
  }

  /* ---------- 프로필 배지 (HubProfiles) ----------
     사람마다 한 줄: 만든 사람 = 그 사람, AvatarBadge = 고른 배지 키('photo'면 사진, 비우면 자동).
     목록이 없으면 모두 자동(최근 배지)으로 보입니다.
     방문 기록도 같은 행에 둡니다: VisitCount = Hub를 방문한 날 수(숫자), LastVisit = 마지막으로 센 날(텍스트 'YYYY-MM-DD').
     두 열이 없으면 방문 기록만 빠지고 배지는 그대로 동작합니다. */
  public async getProfiles(): Promise<{ avatars: { [personId: number]: string }; visits: { [personId: number]: { name: string; count: number } } }> {
    const avatars: { [personId: number]: string } = {};
    const visits: { [personId: number]: { name: string; count: number } } = {};
    if (!this.lists.profiles) { return { avatars, visits }; }
    const rows = await this.itemsOpt(this.lists.profiles, ['Id', 'AvatarBadge', 'AuthorId', 'Author/Title'], ['Author'], { select: ['VisitCount'] }, undefined, 5000);
    // 최신 행이 먼저 오므로, 같은 사람의 행이 여러 개면 최신 것만
    rows.forEach((r: any) => {
      if (!r.AuthorId || r.AuthorId in avatars) { return; }
      avatars[r.AuthorId] = str(r.AvatarBadge);
      const n = num(r.VisitCount) || 0;
      if (n > 0) { visits[r.AuthorId] = { name: str(r.Author && r.Author.Title), count: n }; }
    });
    return { avatars, visits };
  }
  /** Hub를 열 때 방문을 셉니다. 같은 사람은 하루에 한 번만 (새로 고침해도 그대로). 내 행이 없으면 만듭니다.
      저장한 뒤의 내 방문 수를 돌려줍니다. 열이 없으면 오류로 끝나고 아무것도 바뀌지 않습니다. */
  public async recordVisit(meId: number, email: string): Promise<number | undefined> {
    const list = this.lists.profiles;
    if (!list) { return undefined; }
    const t = new Date();
    const today = `${t.getFullYear()}-${pad2(t.getMonth() + 1)}-${pad2(t.getDate())}`;
    const rows = await this.items(list, ['Id', 'VisitCount', 'LastVisit'], [], `AuthorId eq ${meId}`, 1);
    if (rows.length) {
      const n = num(rows[0].VisitCount) || 0;
      if (str(rows[0].LastVisit) === today) { return n; }
      await this.merge(list, rows[0].Id, { VisitCount: n + 1, LastVisit: today });
      return n + 1;
    }
    await this.create(list, { Title: email, VisitCount: 1, LastVisit: today });
    return 1;
  }
  /** 내 프로필 배지 저장: 내 행이 있으면 고치고, 없으면 만듭니다 */
  public async setAvatarBadge(meId: number, email: string, key: string): Promise<void> {
    const list = this.lists.profiles || 'HubProfiles';
    const rows = await this.items(list, ['Id'], [], `AuthorId eq ${meId}`, 1);
    // Title(목록에서 '이메일' 열)에는 이메일을 넣습니다 (사람이 볼 때 참고용. Hub는 '만든 사람'으로 구분)
    if (rows.length) {
      await this.merge(list, rows[0].Id, { Title: email, AvatarBadge: key });
    } else {
      await this.create(list, { Title: email, AvatarBadge: key });
    }
  }

  /* ---------- 조회수 (AgentList · HubContents 의 ViewCount 열) ----------
     ViewCount = 지금까지 조회수(숫자). 열이 없으면 조회수만 비고(undefined) 나머지는 그대로 동작합니다. */
  private static readonly VIEW_COLS = ['ViewCount'];
  private static viewsOf(r: any): { views?: number } {
    if (!r || !('ViewCount' in r)) { return {}; }
    return { views: num(r.ViewCount) || 0 };
  }
  /** 상세 화면을 열 때 조회수를 1 올립니다.
      '수정한 날짜'와 '수정한 사람'은 원래 값으로 되돌려 쓰고, 새 버전을 만들지 않습니다(ValidateUpdateListItem, bNewDocumentUpdate).
      그래서 '최근 업데이트'가 바뀌지 않습니다. 이 항목을 편집할 권한이 없으면 오류로 끝나고 숫자만 오르지 않습니다. */
  public async recordView(type: TargetType, id: number): Promise<void> {
    const list = type === 'Agent' ? this.lists.agents : this.lists.contents;
    const base = `${this.listUrl(list)}/items(${id})`;
    const cur = await this.getJson(`${base}?$select=ViewCount,Modified,Editor/Name&$expand=Editor`, list);
    // 수정한 날짜(UTC)를 사이트 시간대로 바꿉니다
    const local = cur && cur.Modified ? await this.siteLocal(String(cur.Modified)).then(v => v, () => undefined) : undefined;
    // 날짜를 못 구하면 '최근 업데이트'가 바뀌지 않도록 저장하지 않습니다
    if (!local) { throw new HubError('조회수를 저장하지 못했어요: 수정한 날짜를 사이트 시간대로 바꾸지 못했어요.', 400, list); }
    const base0: { FieldName: string; FieldValue: string }[] = [
      { FieldName: 'ViewCount', FieldValue: String((num(cur && cur.ViewCount) || 0) + 1) }
    ];
    if (cur && cur.Editor && cur.Editor.Name) { base0.push({ FieldName: 'Editor', FieldValue: JSON.stringify([{ Key: cur.Editor.Name }]) }); }
    // 날짜 글자 형식은 사이트 지역 설정마다 달라서, 맞는 형식을 찾을 때까지 차례로 넣어 봅니다 (찾으면 기억)
    const order = HubService.DATE_FORMATS.map((f, i) => i).sort((a, b) => (a === this.dateFmt ? -1 : b === this.dateFmt ? 1 : a - b));
    let lastErr = '';
    for (const fi of order) {
      const values = base0.concat([{ FieldName: 'Modified', FieldValue: HubService.DATE_FORMATS[fi](local) }]);
      const res = await this.send(`${base}/ValidateUpdateListItem`, { formValues: values, bNewDocumentUpdate: true }, undefined, list);
      const bad = ((res && res.value) || []).filter((v: any) => v && v.HasException);
      if (!bad.length) { this.dateFmt = fi; return; }
      lastErr = bad.map((v: any) => `${v.FieldName} ${v.ErrorMessage || ''}`).join(', ');
      // 날짜 형식만 틀렸으면 다음 형식으로, 다른 칸이 틀렸으면 멈춤
      if (bad.some((v: any) => v.FieldName !== 'Modified')) { break; }
    }
    throw new HubError(`조회수를 저장하지 못했어요: ${lastErr}`, 400, list);
  }
  /** 조회수 저장 때 '수정한 날짜'를 되돌려 쓸 형식 (사이트 지역 설정에 맞는 것을 찾으면 기억합니다) */
  private dateFmt: number = -1;
  private static readonly DATE_FORMATS: ((t: { y: number; M: number; d: number; H: number; m: number }) => string)[] = [
    // 한국어: 2012-02-23 오후 2:25
    t => `${t.y}-${pad2(t.M)}-${pad2(t.d)} ${t.H < 12 ? '오전' : '오후'} ${t.H % 12 || 12}:${pad2(t.m)}`,
    // 영어(미국): 2/23/2012 2:25 PM
    t => `${t.M}/${t.d}/${t.y} ${t.H % 12 || 12}:${pad2(t.m)} ${t.H < 12 ? 'AM' : 'PM'}`,
    // 영어(영국 등): 23/02/2012 14:25
    t => `${pad2(t.d)}/${pad2(t.M)}/${t.y} ${pad2(t.H)}:${pad2(t.m)}`,
    // 24시간: 2012-02-23 14:25
    t => `${t.y}-${pad2(t.M)}-${pad2(t.d)} ${pad2(t.H)}:${pad2(t.m)}`
  ];
  /** UTC 시각을 사이트 지역 설정의 시간대로 바꿉니다 */
  private async siteLocal(utc: string): Promise<{ y: number; M: number; d: number; H: number; m: number } | undefined> {
    const iso = new Date(utc).toISOString();
    const r = await this.getJson(`${this.site}/_api/web/RegionalSettings/TimeZone/utcToLocalTime(@d)?@d='${encodeURIComponent(iso)}'`);
    const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(str(r && (r.value || r.UTCToLocalTime)));
    return m ? { y: +m[1], M: +m[2], d: +m[3], H: +m[4], m: +m[5] } : undefined;
  }

  /* ---------- Agent (AgentList) ----------
     AgentList 는 배포·심사 흐름이 함께 쓰는 목록입니다. Hub는 읽기만 합니다 (조회수 열 ViewCount 만 고칩니다).
     (Hub 소개 열은 배포 Agent가 Profile Card로 받아 채우고, Owner가 Hub에서 직접 고치지 않습니다)
     Hub에는 대표 행 중 운영 중인 것만 보입니다: OpsStatus 가 비어 있지 않고 '중단'·'폐기'가 아닌 행.
     신청 슬롯(_PENDING) 행은 빠집니다. */
  public async getAgents(): Promise<IAgent[]> {
    const rows = await this.itemsOpt(this.lists.agents,
      ['Id', 'Title', 'AgentName', 'Summary', 'BuildTool', 'Env', 'OpsStatus', 'TaskArea', 'Output', 'OutputNote', 'Scope',
        'Does', 'Prompts', 'MakerNote', 'Instructions', 'Config', 'Releases', 'Version', 'OpenUrl',
        'FirstDeployedOn', 'DeployedAt', 'LastUsedOn', 'Created', 'Modified',
        'Owner/Id', 'Owner/Title', 'Owner/EMail', 'Sponsor/Id', 'Sponsor/Title', 'Sponsor/EMail',
        'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl'],
      ['Owner', 'Sponsor', 'AttachmentFiles'],
      // 조회 열은 대상 목록이 바뀌거나 없으면 400 이 나므로 따로 읽어 봅니다
      // 조회수 열(ViewCount)도 아직 없을 수 있어 따로 읽어 봅니다 (묶음마다 따로 빠짐)
      [{ select: ['LinkedAgents/AgentName', 'Skills/Title'], expand: ['LinkedAgents', 'Skills'] }, { select: HubService.VIEW_COLS },
        // 상세 정보 'Agent 구성 정보' 열 4개 (scripts/add-agent-config-columns.js). 없으면 Config JSON 값을 씁니다
        { select: HubService.CONF_COLS }]);
    return rows.filter(HubService.onHub).map((r: any): IAgent => {
      const cfg = HubService.json(r.Config);
      const releases = HubService.releases(r.Releases);
      const areas = choices(r.TaskArea);
      const outputs = choices(r.Output);
      return {
        id: r.Id, title: str(r.AgentName) || str(r.Title), summary: str(r.Summary), tool: str(r.BuildTool),
        workType: areas.join(' · '), workTypes: areas, scopes: choices(r.Scope), output: outputs.join(' · '), outputs, outputNote: str(r.OutputNote),
        does: splitLines(str(r.Does)), prompts: splitLines(str(r.Prompts)), makerNote: str(r.MakerNote),
        instructions: str(r.Instructions),
        ...HubService.agentConf(r, cfg),
        knowledge: HubService.cfgLines(cfg && cfg.knowledge, ['where', 'type']),
        actions: HubService.cfgLines(cfg && cfg.tools, ['connector', 'kind']),
        linkedAgents: lookups(r.LinkedAgents, 'AgentName'), linkedSkills: lookups(r.Skills, 'Title'),
        version: str(r.Version), changeNote: releases.length ? releases[0].note : '', releases,
        installLink: str(r.OpenUrl && (r.OpenUrl.Url || r.OpenUrl)), env: str(r.Env), opsStatus: str(r.OpsStatus),
        views: HubService.viewsOf(r).views, lastUsed: str(r.LastUsedOn),
        images: this.images(r.AttachmentFiles), thumb: this.thumbOf(r.AttachmentFiles), icon: this.thumbOf(r.AttachmentFiles, 'icon'),
        owner: person(r.Owner), sponsor: person(r.Sponsor),
        // '새로 나온 Agent'는 처음 배포일 기준 (없으면 항목을 만든 날)
        created: str(r.FirstDeployedOn) || str(r.DeployedAt) || str(r.Created), modified: str(r.DeployedAt) || str(r.Modified), stamp: str(r.Modified)
      };
    });
  }
  private static onHub(r: any): boolean {
    const ops = str(r.OpsStatus).trim();
    if (!ops || /중단|폐기/.test(ops)) { return false; }
    return !/_PENDING$/i.test(str(r.Title));
  }
  private static json(v: any): any {
    if (!v) { return undefined; }
    try { return JSON.parse(String(v)); } catch (e) { return undefined; }
  }
  /** 구성 정보(Config) JSON 의 knowledge·tools 를 '이름 · 설명' 줄로 바꿉니다 */
  private static cfgLines(list: any, extra: string[]): string[] {
    if (Object.prototype.toString.call(list) !== '[object Array]') { return []; }
    return (list as any[]).map(x => {
      if (typeof x === 'string') { return x; }
      const name = str(x && x.name).trim();
      const more = extra.map(k => str(x && x[k]).trim()).filter(s => !!s)[0] || '';
      return name && more ? `${name} · ${more}` : name || more;
    }).filter(s => !!s);
  }
  /** 'Agent 구성 정보' 열: 사용 대상 · 사용 모델 · 실행 방식 · 실행 일시 */
  private static readonly CONF_COLS = ['TargetUsers', 'AIModel', 'RunMode', 'RunSchedule'];
  /** 열 값을 먼저, 비어 있으면 예전 Config JSON(audience · model · run) 값 */
  private static agentConf(r: any, cfg: any): { audience: string[]; model: string[]; run: string[]; runMode: string } {
    const audience = HubService.cfgList(r.TargetUsers).length ? HubService.cfgList(r.TargetUsers) : HubService.cfgList(cfg && cfg.audience);
    const model = HubService.cfgList(r.AIModel).length ? HubService.cfgList(r.AIModel) : HubService.cfgList(cfg && cfg.model);
    const mode = str(r.RunMode).trim();
    const run = mode ? [mode, str(r.RunSchedule).trim()].filter(x => !!x) : HubService.cfgRun(cfg && cfg.run);
    return { audience, model, run, runMode: runLabel(run) };
  }
  /** Config 의 audience · model: 문자열("A, B") 또는 배열 → 목록 */
  private static cfgList(v: any): string[] {
    const arr: any[] = Object.prototype.toString.call(v) === '[object Array]' ? v : typeof v === 'string' ? v.split(/\s*[,\n]\s*/) : [];
    return arr.map(x => str(x).trim()).filter(s => !!s);
  }
  /** Config 의 run: "대화형" 또는 ["대화형", "사용자 요청 시"] → "대화형 (사용자 요청 시)" */
  private static cfgRun(v: any): string[] {
    return HubService.cfgList(Object.prototype.toString.call(v) === '[object Array]' ? v : typeof v === 'string' ? [v] : []).slice(0, 2);
  }
  /** 업데이트 기록(Releases) JSON: [{"v":"1.0.0.3","d":"2026-11-01","n":"변경 내용"}] → 최신이 먼저 */
  private static releases(v: any): IVersion[] {
    const list = HubService.json(v);
    if (Object.prototype.toString.call(list) !== '[object Array]') { return []; }
    return (list as any[]).map(x => ({ version: str(x && x.v), note: str(x && x.n), date: str(x && x.d) }))
      .filter(x => !!x.version || !!x.note)
      // 날짜가 같거나 없으면 뒤에 붙은 것(최근)이 먼저
      .map((x, i) => ({ x, i })).sort((a, b) => b.x.date.localeCompare(a.x.date) || b.i - a.i).map(o => o.x);
  }
  /** 첨부 파일 thumb.* (카드 썸네일) 또는 icon.* (상세 화면 프로필, 정사각형) */
  private thumbOf(files: any, base: 'thumb' | 'icon' = 'thumb'): IImage | undefined {
    const list: any[] = Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []);
    const re = base === 'icon' ? /^icon\./i : /^thumb\./i;
    const f = list.filter(x => re.test(str(x.FileName)))[0];
    return f ? { slot: 0, name: str(f.FileName), url: this.origin() + encodeURI(str(f.ServerRelativeUrl)) } : undefined;
  }
  /** 첨부 파일 중 result1.* / result-1.*, result2.* / result-2.* 를 결과 이미지로 */
  private images(files: any): IImage[] {
    const list: any[] = Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []);
    const out: IImage[] = [];
    list.forEach(f => {
      const m = /^result-?([12])\./i.exec(str(f.FileName));
      if (m) { out.push({ slot: Number(m[1]), name: str(f.FileName), url: this.origin() + encodeURI(str(f.ServerRelativeUrl)) }); }
    });
    return out.sort((a, b) => a.slot - b.slot);
  }
  /** Agent 소개 고치기 (Owner). 한 줄 소개 · 이런 일을 해요 · 이렇게 말해 보세요 · 제작자 글 + 썸네일 · 결과 이미지 2장.
      이름 · 지침 · 구성 정보 · 버전은 배포 흐름이 관리해서 건드리지 않습니다. */
  public async updateAgent(a: IAgent, e: IAgentEdit): Promise<void> {
    const list = this.lists.agents;
    await this.staged('info', async () => {
      const base = { Summary: e.summary, Does: e.does.join('\n'), Prompts: e.prompts.join('\n'), MakerNote: e.makerNote };
      // 구성 정보(Config)는 JSON 하나에 지식 원본 · 도구도 들어 있어서, 지금 값을 읽어 세 항목만 바꿔 씁니다
      const d = await this.getJson(`${this.listUrl(list)}/items(${a.id})?$select=Config`, list);
      const raw = HubService.json(d && d.Config);
      const cfg = raw && typeof raw === 'object' && Object.prototype.toString.call(raw) !== '[object Array]' ? raw : {};
      const run = e.run.filter(x => !!x);
      // 1) 'Agent 구성 정보' 열 4개에 저장. 예전 Config 값은 지워서, 칸을 비우면 예전 값이 다시 보이지 않게 합니다
      const old = { ...cfg };
      delete cfg.audience; delete cfg.model; delete cfg.run;
      try {
        await this.merge(list, a.id, { ...base, Config: JSON.stringify(cfg),
          TargetUsers: e.audience.join(', '), AIModel: e.model.join(', '), RunMode: run[0] || null, RunSchedule: run[0] && run[0] !== '대화형' ? (run[1] || '') : '' });
        return;
      } catch (err) {
        if (!(err instanceof HubError && err.status === 400)) { throw err; }
      }
      // 2) 열이 아직 없으면(400) 예전처럼 Config JSON 에 저장
      old.audience = e.audience; old.model = e.model; old.run = run;
      if (!run.length) { delete old.run; }
      await this.merge(list, a.id, { ...base, Config: JSON.stringify(old) });
    });
    await this.applyThumb(list, a.id, a.thumb, e.thumb, e.dropThumb);
    await this.applyThumb(list, a.id, a.icon, e.icon, e.dropIcon, 'icon');
    await this.saveShots('Agent', a.id, a.images, e.shots || [], e.dropShots || []);
  }
  /** Agent를 Hub에서 내리기. AgentList 항목은 배포 · 승인 기록이라 지우지 않고, 운영 상태(OpsStatus)를 목록에 있는 '중단'(없으면 '폐기') 값으로 바꿉니다.
      Hub는 중단 · 폐기 행을 보여 주지 않으므로 바로 사라지고, 운영 상태를 되돌리면 다시 보입니다. 바꾼 값을 돌려줍니다. */
  public async retireAgent(id: number): Promise<string> {
    const list = this.lists.agents;
    const f = await this.getJson(`${this.listUrl(list)}/fields/getbyinternalnameortitle('OpsStatus')?$select=Choices,TypeAsString`, list);
    const opts: string[] = (f && f.Choices) || [];
    const to = opts.filter(c => /중단/.test(c))[0] || opts.filter(c => /폐기/.test(c))[0];
    if (!to) { throw new HubError("AgentList 운영 상태(OpsStatus)에 '중단'이나 '폐기' 값이 없어 Hub에서 내릴 수 없어요. 목록 관리자에게 알려 주세요.", 400, list); }
    // 선택(Choice)은 값 하나, 여러 개 선택(MultiChoice)은 배열로 저장합니다
    await this.merge(list, id, { OpsStatus: f && f.TypeAsString === 'MultiChoice' ? [to] : to });
    return to;
  }
  /** 업데이트 탭: AgentList 의 업데이트 기록(Releases)을 그대로 씁니다 */
  public async getAgentVersions(id: number): Promise<IVersion[]> {
    const d = await this.getJson(`${this.listUrl(this.lists.agents)}/items(${id})?$select=Releases`, this.lists.agents);
    return HubService.releases(d && d.Releases);
  }

  /* ---------- 아이디어 (HubIdeas) ----------
     공감 = 목록 평점 설정의 좋아요(LikedBy · LikesCount), 만들래요 = 함께 만드는 사람(Makers) 사람 열.
     만들기 시작 = 시작일(StartedOn) + 상태 '제작 중'. 만들기 완료 = 상태 '완성' + 완성일(DoneAt) + 결과물(ResultRef).
     (함께 만드는 사람이 화면에서 누르거나, 운영 담당자가 목록에서 직접 넣습니다)
     댓글은 항목 댓글을 씁니다. */
  /** HubIdeas 의 카테고리 열: 내부 이름 Category, 없으면 표시 이름 '카테고리'인 열. 선택 값도 함께 (한 번만 읽음) */
  private ideaCatColP?: Promise<{ name: string; choices: string[]; multi: boolean } | undefined>;
  public ideaCategoryCol(): Promise<{ name: string; choices: string[]; multi: boolean } | undefined> {
    if (!this.ideaCatColP) {
      const url = `${this.listUrl(this.lists.ideas)}/fields?$select=InternalName,Title,Choices,Hidden,TypeAsString&$filter=InternalName eq 'Category' or Title eq '${encodeURIComponent('카테고리')}'`;
      this.ideaCatColP = this.getJson(url, this.lists.ideas).then((d: any) => {
        const v: any[] = ((d && d.value) || []).filter((f: any) => !f.Hidden);
        const f = v.filter(x => x.InternalName === 'Category')[0] || v[0];
        return f ? { name: String(f.InternalName), choices: choices(f.Choices), multi: f.TypeAsString === 'MultiChoice' } : undefined;
      }, () => undefined);
    }
    return this.ideaCatColP;
  }
  public async getIdeas(): Promise<IIdea[]> {
    const col = await this.ideaCategoryCol();
    const catName = col ? col.name : 'Category';
    const ppl = (f: string): string[] => [`${f}/Id`, `${f}/Title`, `${f}/EMail`];
    // 공감은 목록 평점 설정(좋아요)의 '좋아요 표시한 사람(LikedBy)'. 평점 설정이 꺼져 있으면 그 열만 빼고 읽습니다.
    const rows = await this.itemsOpt(this.lists.ideas,
      ['Id', 'Title', 'Status', 'Detail', 'Pain', 'Frequency', 'MinutesPerRun', 'StartedOn', 'DoneAt', 'ResultRef', 'ArchivedOn', 'RevivedOn', 'Created', 'Modified']
        .concat(AUTHOR, ppl('Makers')), ['Author', 'Makers'],
      // 카테고리(Category) · 출처(ScrapSource) 열은 11/25 시안에서 더해져 아직 없을 수 있어 따로 읽어 봅니다
      [{ select: ppl('LikedBy'), expand: ['LikedBy'] }, { select: [catName] }, { select: ['ScrapSource'] }], undefined, 5000);
    const people = (v: any): IPerson[] => HubService.users(v).map(person).filter(p => !!p) as IPerson[];
    return rows.map((r: any): IIdea => ({
      id: r.Id, title: str(r.Title), category: choices(r[catName])[0] || '', source: HubService.isCaseSrc(str(r.ScrapSource)) ? '' : str(r.ScrapSource),
      caseRef: HubService.isCaseSrc(str(r.ScrapSource)) ? HubService.caseRefOf(r.ScrapSource) : undefined, detail: str(r.Detail), status: str(r.Status),
      likers: people(r.LikedBy), makers: people(r.Makers),
      startedOn: str(r.StartedOn), doneAt: str(r.DoneAt), resultRef: str(r.ResultRef), archivedOn: str(r.ArchivedOn), revivedOn: str(r.RevivedOn),
      pain: str(r.Pain), frequency: str(r.Frequency), minutes: num(r.MinutesPerRun),
      author: person(r.Author), created: str(r.Created), modified: str(r.Modified)
    }));
  }
  /** 아이디어의 공감·만들래요·시작을 반응으로 바꿉니다 (점수·알림·배지가 같은 방식으로 셉니다).
      사람 열에는 누른 날이 없어서 항목을 마지막으로 고친 날을 씁니다. */
  public static ideaReactions(ideas: IIdea[]): IReaction[] {
    const out: IReaction[] = [];
    ideas.forEach(i => {
      i.likers.forEach(p => out.push({ id: `lk:Idea:${i.id}:${p.id}`, targetType: 'Idea', targetId: i.id, kind: '좋아요', body: '', author: p, created: '' }));
      i.makers.forEach(p => out.push({ id: `mk:Idea:${i.id}:${p.id}`, targetType: 'Idea', targetId: i.id, kind: '만들래요', body: '', author: p, created: i.modified }));
      if (i.startedOn) { out.push({ id: `st:Idea:${i.id}`, targetType: 'Idea', targetId: i.id, kind: '시작', body: '', created: i.startedOn }); }
    });
    return out;
  }
  /** 사례 연결은 출처(ScrapSource) 열에 "case:사례 번호|솔루션 이름"으로 넣습니다. 새 열 없이 씁니다 */
  private static readonly CASE_SRC = 'case:';
  private static isCaseSrc(v: string): boolean { return v.indexOf(HubService.CASE_SRC) === 0; }
  /** "사례 번호|솔루션 이름" (앞의 case: 는 빼고) */
  private static caseRefOf(v: any): ICaseRef | undefined {
    let t = str(v);
    if (HubService.isCaseSrc(t)) { t = t.slice(HubService.CASE_SRC.length); }
    const i = t.indexOf('|');
    const id = i > 0 ? Number(t.slice(0, i)) : NaN;
    return i > 0 && !isNaN(id) && t.slice(i + 1).trim() ? { caseId: id, sol: t.slice(i + 1).trim() } : undefined;
  }
  private ideaFields(idea: INewIdea): any {
    const f: any = {
      Title: idea.title, Detail: idea.detail || '', Pain: idea.pain || '',
      Frequency: idea.frequency || null, MinutesPerRun: typeof idea.minutes === 'number' && !isNaN(idea.minutes) ? idea.minutes : null
    };
    if (idea.category !== undefined) { f.Category = idea.category || null; }
    // 외부 스크랩 주소가 있으면 그게 출처, 없고 사례에서 왔으면 사례 연결이 출처입니다
    if (idea.caseRef && !idea.source) { f.ScrapSource = `${HubService.CASE_SRC}${idea.caseRef.caseId}|${idea.caseRef.sol}`; }
    else if (idea.source !== undefined) { f.ScrapSource = idea.source || null; }
    return f;
  }
  /** ScrapSource · Category 열이 아직 없으면(400) 하나씩 빼며 다시 저장합니다. 화면은 다시 읽은 값으로 빠진 것을 알려 줍니다 */
  private async ideaSave<T>(idea: INewIdea, run: (fields: any) => Promise<T>): Promise<T> {
    const f = this.ideaFields(idea);
    // 카테고리는 목록의 실제 카테고리 열(내부 이름이 Category 가 아닐 수도 있음)에 넣습니다
    const col = await this.ideaCategoryCol();
    let cat = 'Category';
    if ('Category' in f && col) {
      const v = f.Category;
      delete f.Category;
      cat = col.name;
      f[cat] = col.multi ? (v ? [v] : []) : v;
    }
    // 400(열 없음)이면 새로 생긴 열을 하나씩 빼며 다시 저장합니다. 없는 열 하나 때문에 카테고리까지 빠지지 않게
    // 나중에 생긴 열부터 뺍니다: ScrapSource → 카테고리
    const optional = ['ScrapSource', cat];
    for (;;) {
      try {
        return await run(f);
      } catch (e) {
        const next = optional.filter(k => k in f)[0];
        if (!(e instanceof HubError && e.status === 400) || !next) { throw e; }
        delete f[next];
      }
    }
  }
  public async createIdea(idea: INewIdea): Promise<number> {
    const d = await this.ideaSave(idea, f => this.create(this.lists.ideas, { ...f, Status: IDEA_STATUS.live }));
    return d.Id;
  }
  /** 내 아이디어 고치기 */
  public async updateIdea(id: number, idea: INewIdea): Promise<void> {
    await this.ideaSave(idea, f => this.merge(this.lists.ideas, id, f));
  }
  /** 사람 열(Makers)에 나를 넣거나 뺍니다. 다른 사람이 방금 누른 것을 지우지 않도록 저장 직전에 다시 읽습니다. */
  private async togglePerson(id: number, field: 'Makers', meId: number, on: boolean): Promise<number[]> {
    const d = await this.getJson(`${this.listUrl(this.lists.ideas)}/items(${id})?$select=${field}Id`, this.lists.ideas);
    const now: number[] = HubService.users(d && d[field + 'Id']).map(Number).filter((x: number) => !isNaN(x));
    const next = on ? (now.indexOf(meId) >= 0 ? now : now.concat([meId])) : now.filter(x => x !== meId);
    const fields: any = {};
    fields[field + 'Id'] = next;
    if (field === 'Makers' && !next.length) {
      // 만드는 사람이 아무도 없으면 시작도 되돌립니다
      fields.StartedOn = null;
      fields.Status = IDEA_STATUS.live;
    }
    await this.merge(this.lists.ideas, id, fields);
    return next;
  }
  /** 공감 켜기·끄기: 목록 평점 설정(좋아요)의 좋아요. '좋아요' 개수(LikesCount)가 함께 바뀝니다. */
  public setLike(ideaId: number, on: boolean): Promise<void> {
    return this.reputation('Idea', 'SetLike', ideaId, on);
  }
  /** 만들래요 참여·취소 */
  public setMaker(ideaId: number, meId: number, on: boolean): Promise<number[]> {
    return this.togglePerson(ideaId, 'Makers', meId, on);
  }
  /** 만들기 시작 / 중지 */
  public async setStarted(ideaId: number, on: boolean): Promise<string> {
    const at = on ? new Date().toISOString() : '';
    await this.merge(this.lists.ideas, ideaId, { StartedOn: at || null, Status: on ? IDEA_STATUS.making : IDEA_STATUS.live });
    return at;
  }
  /** 만들기 완료: 상태 '완성' + 완성일 + 결과물(Agent·Skill·HTML 이름 또는 주소, 비워도 됨) */
  public async setDone(ideaId: number, resultRef: string): Promise<string> {
    const at = new Date().toISOString();
    await this.merge(this.lists.ideas, ideaId, { Status: IDEA_STATUS.done, DoneAt: at, ResultRef: resultRef || null });
    return at;
  }
  /** 새 열이 아직 없으면 그 칸만 빼고 다시 저장합니다 */
  private async withOptional<T>(fields: any, optional: string[], run: (f: any) => Promise<T>): Promise<T> {
    try { return await run(fields); } catch (e) {
      if (!(e instanceof HubError && e.status === 400) || !optional.some(k => k in fields)) { throw e; }
      const f = { ...fields };
      optional.forEach(k => { delete f[k]; });
      return run(f);
    }
  }
  /** 내 아이디어 지우기 (사이트 휴지통으로) */
  public async deleteIdea(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.ideas)}/items(${id})/recycle()`, undefined, undefined, this.lists.ideas);
  }
  /** 보관 해제: 보관까지 남은 날을 오늘부터 다시 셉니다. 보관일을 비우고 상태를 '모집 중'으로 돌립니다. */
  public async reviveIdea(id: number): Promise<string> {
    const now = new Date().toISOString();
    await this.merge(this.lists.ideas, id, { RevivedOn: now, ArchivedOn: null, Status: IDEA_STATUS.live });
    return now;
  }

  /* ---------- 사례 ---------- */
  /* ---------- 사례 (HubCases) ----------
     여러 줄 칸 형식: 전후 비교(Compare) '항목|전|후' 줄, 업무 프로세스(Process) [Before]/[After] 줄(AI 단계 끝에 [AI]),
     솔루션 '종류|이름' 줄 또는 JSON, 프롬프트 JSON [{name, step, text}], 적용 포인트 · 측정 방법은 한 줄에 하나. */
  public async getCases(): Promise<ICase[]> {
    const rows = await this.items(this.lists.cases,
      ['Id', 'Title', 'Industry', 'Client', 'Dept', 'Period', 'Project', 'Area', 'Pattern', 'Products', 'KeyResult', 'KeyDetail',
        'Compare', 'ChangeBefore', 'ChangeAfter', 'Process', 'Measure', 'Solutions', 'ApplyPoints', 'CasePrompts', 'Created', 'OData__ModerationStatus',
        'Contact/Id', 'Contact/Title', 'Contact/EMail', 'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl'].concat(AUTHOR),
      ['Author', 'Contact', 'AttachmentFiles'], undefined, 5000);
    return rows.map((r: any): ICase => {
      const key = splitEffect(str(r.KeyResult), str(r.KeyDetail));
      const proc = parseProcess(str(r.Process));
      const after = str(r.ChangeAfter);
      const contact = person(r.Contact);
      return {
        id: r.Id, title: str(r.Title), industry: str(r.Industry), client: str(r.Client), dept: str(r.Dept), period: str(r.Period),
        // 활용 방식이 비어 있는 예전 사례는 Pattern 열 값을 새 활용 방식으로 바꿔 채웁니다
        solutions: parseSolutions(str(r.Solutions)).map(s => s.use ? s : { ...s, use: useFromPattern(str(r.Pattern)) || undefined }), files: this.allFiles(r.AttachmentFiles), progress: '',
        oneLine: (after.split(/[.\n]/)[0] || '').trim(), beforeText: str(r.ChangeBefore), afterText: after, keyValue: key.value, keyNote: key.note,
        contact: contact ? contact.name : '', contactPerson: contact, how: str(r.Measure), prompts: parsePrompts(str(r.CasePrompts), proc.aiStep),
        summary: str(r.Project), keyEffect: str(r.KeyResult), points: splitLines(str(r.ApplyPoints)),
        area: str(r.Area), pattern: str(r.Pattern), products: choices(r.Products),
        before: proc.before, after: proc.after, aiStep: proc.aiStep,
        effects: parseCompare(str(r.Compare)),
        verify: splitLines(str(r.Measure)), prompt: str(r.CasePrompts),
        author: person(r.Author), created: str(r.Created),
        // 사례는 승인 없이 바로 공개합니다(목록의 콘텐츠 승인은 끕니다).
        // 혹시 승인이 켜져 있으면 0 = 승인됨, 그 밖의 값은 본인 글이 아직 검토 중이라 '공개 검토 중'으로 표시합니다.
        pending: typeof r.OData__ModerationStatus === 'number' && r.OData__ModerationStatus !== 0
      };
    });
  }
  /** 이메일(또는 로그인 이름)로 사이트 사용자 번호를 찾습니다. 사이트에 처음 오는 사람이면 사이트 사용자로 등록됩니다. */
  private async userId(login: string): Promise<number> {
    const v = login.trim();
    const name = /^i:0#\.f\|/.test(v) ? v : `i:0#.f|membership|${v}`;
    try {
      const d = await this.send(`${this.site}/_api/web/ensureuser`, { logonName: name }, undefined);
      if (d && d.Id) { return d.Id; }
    } catch (e) { /* 아래 안내 */ }
    throw new HubError(`문의 담당자 '${v}'을(를) 찾지 못했어요. 회사 이메일 주소로 적어 주세요.`, 400, this.lists.cases);
  }
  private async caseFields(c: INewCase): Promise<any> {
    const step = c.prompts.filter(p => p.step >= 0)[0];
    return {
      Title: c.title, Industry: c.industry || null, Client: c.client, Dept: c.dept, Period: c.period || null,
      Project: c.project, Area: c.area, Pattern: c.pattern || null, Products: HubService.multi(c.products),
      ContactId: c.contact.trim() ? await this.userId(c.contact) : null,
      KeyResult: c.keyValue, KeyDetail: c.keyNote,
      Compare: compareText([{ label: '시간', before: c.time[0], after: c.time[1] }, { label: '품질 수준', before: c.quality[0], after: c.quality[1] },
        { label: '정신적 노력 수준', before: c.effort[0], after: c.effort[1] }]),
      ChangeBefore: c.beforeText, ChangeAfter: c.afterText,
      // 첫 Use Case가 연결된 After 단계를 AI 단계로 표시합니다
      Process: processText(c.beforeSteps, c.afterSteps, step ? step.step : -1),
      Measure: c.how, Solutions: solutionsText(c.solutions), CasePrompts: promptsText(c.prompts)
    };
  }
  /** 사례 올리기. 승인 없이 바로 모두에게 보입니다. */
  public async createCase(c: INewCase): Promise<number> {
    const d = await this.create(this.lists.cases, await this.caseFields(c));
    await this.caseFiles(d.Id, c);
    return d.Id;
  }
  /** 솔루션 원본 파일 첨부: 같은 이름이 있으면 바꾸고, 어느 솔루션도 쓰지 않는 첨부는 지웁니다 */
  private async caseFiles(id: number, c: INewCase, old?: IImage[]): Promise<void> {
    const list = this.lists.cases;
    const keep = c.solutions.map(s => s.file || '').filter(n => !!n);
    for (const f of old || []) {
      const replaced = (c.addFiles || []).some(a => a.name === f.name);
      if (replaced || keep.indexOf(f.name) < 0) { await this.removeAttachment(list, id, f.name); }
    }
    for (const a of c.addFiles || []) { await this.addAttachment(list, id, a.name, a.data); }
  }
  private allFiles(files: any): IImage[] {
    const list: any[] = Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []);
    return list.map((f: any) => ({ slot: 0, name: str(f.FileName), url: this.origin() + encodeURI(str(f.ServerRelativeUrl)) }));
  }
  /** 내 사례 고치기 */
  public async updateCase(id: number, c: INewCase, old?: IImage[]): Promise<void> {
    await this.merge(this.lists.cases, id, await this.caseFields(c));
    await this.caseFiles(id, c, old);
  }
  public async deleteCase(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.cases)}/items(${id})/recycle()`, undefined, undefined, this.lists.cases);
  }

  /* ---------- 반응: 별도 목록 없이 SharePoint 기본 기능을 씁니다 ----------
     - 리뷰 별점: AgentList · HubContents 의 평점 설정(별 등급). 한 사람당 하나, 다시 매기면 바뀝니다.
     - 리뷰 글: 같은 세 목록의 항목 댓글
     - 아이디어 댓글: HubIdeas 항목 댓글 (공감·만들래요는 HubIdeas 사람 열, 위 '아이디어' 참고) */
  private listIds: { [title: string]: string } = {};
  private titleOf(t: TargetType): string {
    return t === 'Agent' ? this.lists.agents : t === 'Skill' || t === 'Html' ? this.lists.contents : this.lists.ideas;
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
  private commentOf(t: TargetType, itemId: number, c: any): IReaction {
    const text = str(c && c.text);
    const a = (c && c.author) || {};
    // 리뷰 댓글은 '[★4] 한 줄 평' 처럼 그 리뷰의 별점을 앞에 적어 둡니다 (리뷰를 여러 개 남겨도 각자 별점이 남도록)
    const star = t !== 'Idea' ? REVIEW_STAR.exec(text) : null;
    return {
      id: `cm:${t}:${itemId}:${c.id}`, commentId: Number(c.id), targetType: t, targetId: itemId,
      kind: t === 'Idea' ? '댓글' : '리뷰', body: star ? text.slice(star[0].length) : text,
      rating: star ? Number(star[1]) : undefined,
      likes: Number(c && c.likeCount) || 0, likedByMe: !!(c && c.isLikedByUser),
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
    const [ar, ac, cr, cc, kinds, ic] = await Promise.all([
      part(this.starRows('Agent')), part(this.commentRows('Agent')), part(this.starRows('Skill')), part(this.commentRows('Skill')),
      this.contentKinds().catch((): { [id: number]: TargetType } => ({})), part(this.commentRows('Idea'))
    ]);
    // HubContents 의 반응은 일단 Skill 로 읽었으니, 구분이 HTML 인 항목은 Html 로 바꿉니다
    const retag = (r: IReaction): IReaction => kinds[r.targetId] === 'Html' ? { ...r, targetType: 'Html', id: r.id.replace(':Skill:', ':Html:') } : r;
    // 아이디어 공감·만들래요·시작은 HubIdeas 사람·날짜 열에서 읽어 loadAll 이 더합니다
    return {
      list: HubService.pairReviews(ar, ac).concat(HubService.pairReviews(cr, cc).map(retag), ic),
      error: errs.length ? errs.join(' ') : undefined
    };
  }
  /** HubContents 항목 번호 → Skill / Html */
  private async contentKinds(): Promise<{ [id: number]: TargetType }> {
    const rows = await this.items(this.lists.contents, ['Id', 'Kind'], [], undefined, 5000);
    const out: { [id: number]: TargetType } = {};
    rows.forEach((r: any) => { out[r.Id] = str(r.Kind).toUpperCase() === 'HTML' ? 'Html' : 'Skill'; });
    return out;
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
  /** 항목 댓글 달기 (Agent·Skill·HTML 리뷰 글, 아이디어 댓글) */
  public async addComment(t: TargetType, itemId: number, text: string): Promise<IReaction> {
    const title = this.titleOf(t);
    const d = await this.send(`${this.listUrl(title)}/items(${itemId})/Comments`, { text }, undefined, title);
    return this.commentOf(t, itemId, d && d.id !== undefined ? d : { id: 0, text, createdDate: new Date().toISOString() });
  }
  /** 항목 댓글 좋아요 · 취소 (SharePoint 댓글 기본 기능) */
  public async likeComment(t: TargetType, itemId: number, commentId: number, on: boolean): Promise<void> {
    const title = this.titleOf(t);
    await this.send(`${this.listUrl(title)}/items(${itemId})/Comments(${commentId})/${on ? 'like' : 'unlike'}`, undefined, undefined, title);
  }
  public async removeComment(t: TargetType, itemId: number, commentId: number): Promise<void> {
    const title = this.titleOf(t);
    await this.send(`${this.listUrl(title)}/items(${itemId})/Comments(${commentId})`, undefined, { 'X-HTTP-Method': 'DELETE' }, title);
  }

  /* ---------- Skill · HTML 공통 (HubContents 목록 + 첨부 파일) ----------
     항목 하나 = Skill(또는 HTML 도구) 하나이고, 파일은 그 항목의 첨부 파일로 둡니다.
     목록이라 Agent처럼 평점(별 등급)과 항목 댓글(리뷰 글)을 쓸 수 있습니다.
     새 버전을 올리면 첨부 파일을 바꾸고 업데이트 기록(Releases)에 한 줄을 더합니다. 이전 파일 내용은 남지 않습니다. */
  private fileApi(fileRef: string): string {
    return `${this.site}/_api/web/GetFileByServerRelativePath(decodedurl='${encodeURIComponent(fileRef.replace(/'/g, "''"))}')`;
  }
  private origin(): string {
    const m = /^https?:\/\/[^/]+/i.exec(this.site);
    return m ? m[0] : '';
  }
  /** 항목의 첨부 파일 (여럿이면 가장 최근에 올린 것: 이름 앞의 숫자가 올린 시각) */
  private fileOf(files: any): { stored: string; ref: string; url: string } {
    // 썸네일(thumb.*) · 프로필(icon.*)과 결과 이미지(result1.* · result2.*)는 본문 파일이 아니라서 뺍니다
    const list: any[] = (Object.prototype.toString.call(files) === '[object Array]' ? files : ((files && files.results) || []))
      .filter((a: any) => !/^(thumb|icon|result-?[12])\./i.test(str(a.FileName)))
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
  private async createWithFile(list: string, fields: any, name: string, body: string | ArrayBuffer, thumb?: INewThumb, shots?: INewShot[], icon?: INewThumb): Promise<number> {
    const d = await this.staged('info', () => this.create(list, fields));
    try {
      await this.staged('file', () => this.addAttachment(list, d.Id, name, body));
      if (thumb) { await this.staged('file', () => this.addAttachment(list, d.Id, `thumb.${thumb.ext}`, thumb.data)); }
      if (icon) { await this.staged('file', () => this.addAttachment(list, d.Id, `icon.${icon.ext}`, icon.data)); }
      for (const s of shots || []) { await this.staged('file', () => this.addAttachment(list, d.Id, `result${s.slot}.${s.ext}`, s.data)); }
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
  /** 썸네일(thumb) · 프로필(icon) 바꾸기 · 지우기. 첨부 파일 <base>.<ext> 하나만 둡니다 (이름이 같으면 먼저 지워야 새로 붙일 수 있어요). */
  private async applyThumb(list: string, id: number, old: IImage | undefined, thumb?: INewThumb, drop?: boolean, base: 'thumb' | 'icon' = 'thumb'): Promise<void> {
    if (thumb) {
      const name = `${base}.${thumb.ext}`;
      const same = !!old && old.name.toLowerCase() === name.toLowerCase();
      if (old && same) { await this.staged('file', () => this.removeAttachment(list, id, old.name)); }
      await this.staged('file', () => this.addAttachment(list, id, name, thumb.data));
      if (old && !same) { await this.removeAttachment(list, id, old.name).catch(() => undefined); }
    } else if (drop && old) {
      await this.staged('file', () => this.removeAttachment(list, id, old.name));
    }
  }

  /** '제작자는 이렇게 썼어요' 이미지 바꾸기 · 빼기. 칸(slot) 1 · 2 마다 첨부 파일 result<slot>.<ext> 하나만 둡니다.
      Agent는 AgentList, Skill · HTML은 HubContents 항목에 붙입니다. */
  public async saveShots(t: 'Agent' | 'Skill' | 'Html', id: number, old: IImage[], add: INewShot[], drop: number[]): Promise<void> {
    const list = t === 'Agent' ? this.lists.agents : this.lists.contents;
    const at = (slot: number): IImage | undefined => old.filter(x => x.slot === slot)[0];
    for (const s of add) {
      const name = `result${s.slot}.${s.ext}`;
      // 같은 칸의 예전 파일 중 이름이 같은 것을 기준으로 바꾸고, 나머지(확장자가 다른 예전 파일 · 남아 있던 중복)는 모두 지워 한 칸에 파일 하나만 남깁니다
      const olds = old.filter(x => x.slot === s.slot);
      const same = olds.filter(x => x.name.toLowerCase() === name.toLowerCase())[0];
      await this.replaceAttachment(list, id, same || olds[0], name, s.data);
      for (const o of olds) {
        if (o !== same && o !== olds[0] && o.name.toLowerCase() !== name.toLowerCase()) { await this.removeAttachment(list, id, o.name).catch(() => undefined); }
      }
    }
    for (const slot of drop) {
      const o = at(slot);
      if (o && !add.some(s => s.slot === slot)) { await this.staged('file', () => this.removeAttachment(list, id, o.name)); }
    }
  }
  /** 같은 이름이면 먼저 지워야 새로 붙일 수 있어서, 이름이 같을 때만 먼저 지우고 다르면 붙인 뒤에 지웁니다 */
  private async replaceAttachment(list: string, id: number, old: IImage | undefined, name: string, data: ArrayBuffer): Promise<void> {
    const same = !!old && old.name.toLowerCase() === name.toLowerCase();
    if (old && same) { await this.staged('file', () => this.removeAttachment(list, id, old.name)); }
    await this.staged('file', () => this.addAttachment(list, id, name, data));
    if (old && !same) { await this.removeAttachment(list, id, old.name).catch(() => undefined); }
  }

  /* ---------- HubContents: Skill · HTML (한 목록, 구분 열로 나눔) ----------
     구분(Kind) = Skill / HTML. 숨김(Hidden)이 '예'인 항목은 Hub에 보이지 않습니다.
     버전은 따로 된 열 없이 업데이트 기록(Releases) JSON 의 가장 최근 항목에서 읽습니다: [{"v":"1.2","d":"2026-11-17","n":"변경 내용"}] */
  private static readonly CONTENT_COLS = ['Id', 'Title', 'Kind', 'Summary', 'Category', 'WorkArea', 'Tools', 'Scope', 'Does', 'Usage', 'MakerNote', 'Output', 'Releases', 'Hidden',
    'AttachmentFiles/FileName', 'AttachmentFiles/ServerRelativeUrl', 'Created', 'Modified'];
  private async contentRows(kind: 'Skill' | 'HTML'): Promise<any[]> {
    const rows = await this.itemsOpt(this.lists.contents, HubService.CONTENT_COLS.concat(AUTHOR), ['Author', 'AttachmentFiles'], { select: HubService.VIEW_COLS }, `Kind eq '${kind}'`);
    return rows.filter((r: any) => r.Hidden !== true);
  }
  /** 업데이트 기록에 이번 버전을 더합니다. 같은 버전이면 그 줄의 내용만 바꿉니다. 최근 10개만 남깁니다. */
  private static withRelease(raw: any, version: string, note: string): string {
    const old = HubService.json(raw);
    const list: { v: string; d: string; n: string }[] = Object.prototype.toString.call(old) === '[object Array]' ? (old as any[]).map(x => ({ v: str(x && x.v), d: str(x && x.d), n: str(x && x.n) })) : [];
    const last = list[list.length - 1];
    const today = new Date().toISOString().slice(0, 10);
    if (last && last.v === version) { last.n = note || last.n; } else { list.push({ v: version, d: today, n: note }); }
    return JSON.stringify(list.slice(-10));
  }
  private async releasesOf(id: number): Promise<any> {
    const d = await this.getJson(`${this.listUrl(this.lists.contents)}/items(${id})?$select=Releases`, this.lists.contents);
    return d && d.Releases;
  }
  /** 선택 열에 넣을 값: 빈 값은 빼고 배열로 (여러 개 선택 열) */
  private static multi(v: string | string[]): string[] {
    return (typeof v === 'string' ? [v] : v).map(x => (x || '').trim()).filter(x => !!x);
  }

  public async getSkills(): Promise<ISkill[]> {
    const rows = await this.contentRows('Skill');
    return rows.map((r: any): ISkill => {
      const f = this.fileOf(r.AttachmentFiles);
      const rel = HubService.releases(r.Releases);
      const areas = choices(r.WorkArea);
      const scopes = choices(r.Scope);
      return {
        id: r.Id, title: str(r.Title) || originalSkillName(f.stored), summary: str(r.Summary),
        purpose: str(r.Does), usage: str(r.Usage), tools: choices(r.Tools),
        kind: str(r.Category), scope: scopes.join(' · '), scopes, area: areas.join(' · '), areas,
        version: rel.length ? rel[0].version : '1.0', changeNote: rel.length ? rel[0].note : '',
        storedName: f.stored, fileName: originalSkillName(f.stored), ext: extOf(f.stored), fileRef: f.ref, fileUrl: f.url, thumb: this.thumbOf(r.AttachmentFiles), icon: this.thumbOf(r.AttachmentFiles, 'icon'), images: this.images(r.AttachmentFiles),
        author: person(r.Author), created: str(r.Created), modified: str(r.Modified), ...HubService.viewsOf(r)
      };
    });
  }
  private skillFields(s: INewSkill, releases: string): any {
    return {
      Title: s.title, Kind: 'Skill', Summary: s.summary, Does: s.purpose, Usage: s.usage, Tools: HubService.multi(s.tools),
      Category: s.kind || null, Scope: HubService.multi(s.scope), WorkArea: HubService.multi(s.area), Releases: releases
    };
  }
  private fileBody(s: INewSkill): string | ArrayBuffer {
    return s.file ? (s.file.data || s.file.text || '') : '';
  }

  /** Skill 올리기. 승인 없이 바로 모두에게 보입니다. */
  public async createSkill(s: INewSkill): Promise<number> {
    if (!s.file) { throw new HubError('Skill 파일을 골라 주세요.', 400); }
    return this.createWithFile(this.lists.contents, this.skillFields(s, HubService.withRelease('', s.version, s.changeNote)), storedSkillName(s.file.name), this.fileBody(s), s.thumb, s.shots);
  }
  /** Skill 새 버전. 새 파일이 있으면 첨부 파일을 바꾸고, 정보 열과 업데이트 기록을 고칩니다. */
  public async updateSkill(skill: ISkill, s: INewSkill): Promise<void> {
    const rel = HubService.withRelease(await this.releasesOf(skill.id), s.version, s.changeNote);
    await this.updateWithFile(this.lists.contents, skill.id, skill.storedName, this.skillFields(s, rel), s.file ? { name: s.file.name, body: this.fileBody(s) } : undefined);
    await this.applyThumb(this.lists.contents, skill.id, skill.thumb, s.thumb, s.dropThumb);
    await this.saveShots('Skill', skill.id, skill.images, s.shots || [], s.dropShots || []);
  }
  /** Skill 삭제. 항목과 첨부 파일이 사이트 휴지통으로 갑니다. */
  public async deleteSkill(id: number): Promise<void> {
    await this.send(`${this.listUrl(this.lists.contents)}/items(${id})/recycle()`, undefined, undefined, this.lists.contents);
  }
  /** Skill 파일 내용 (md·txt 본문 보기·복사용) */
  public async getSkillText(fileRef: string): Promise<string> {
    const res = await this.client.get(`${this.fileApi(fileRef)}/$value`, SPHttpClient.configurations.v1);
    if (!res.ok) { return this.fail(res, this.lists.contents); }
    return res.text();
  }
  public async getSkillVersions(id: number): Promise<IVersion[]> {
    return HubService.releases(await this.releasesOf(id));
  }

  /* ---------- HTML 도구 (HubContents, 구분 = HTML) ----------
     항목 하나 = 도구 하나, .html 파일은 첨부 파일. '열기'는 파일 내용을 읽어 격리된(sandbox) 창에서 보여 줍니다. */
  public async getHtmls(): Promise<IHtmlTool[]> {
    const rows = await this.contentRows('HTML');
    return rows.map((r: any): IHtmlTool => {
      const f = this.fileOf(r.AttachmentFiles);
      const rel = HubService.releases(r.Releases);
      const tools = choices(r.Tools);
      const scopes = choices(r.Scope);
      const areas = choices(r.WorkArea);
      return {
        id: r.Id, title: str(r.Title) || originalSkillName(f.stored), summary: str(r.Summary), does: splitLines(str(r.Does)),
        makerNote: str(r.MakerNote), madeWith: tools.join(' · '), tools, scope: scopes.join(' · '), scopes,
        workType: str(r.Category), area: areas.join(' · '), areas, output: str(r.Output),
        version: rel.length ? rel[0].version : '1.0', changeNote: rel.length ? rel[0].note : '',
        storedName: f.stored, fileName: originalSkillName(f.stored), fileRef: f.ref, fileUrl: f.url, thumb: this.thumbOf(r.AttachmentFiles), icon: this.thumbOf(r.AttachmentFiles, 'icon'), images: this.images(r.AttachmentFiles),
        author: person(r.Author), created: str(r.Created), modified: str(r.Modified), ...HubService.viewsOf(r)
      };
    });
  }
  private htmlFields(h: INewHtml, releases: string): any {
    return {
      Title: h.title, Kind: 'HTML', Summary: h.summary, Does: h.does.join('\n'), MakerNote: h.makerNote, Tools: HubService.multi(h.madeWith),
      Scope: HubService.multi(h.scope), Category: h.workType || null, WorkArea: HubService.multi(h.area), Output: h.output, Releases: releases
    };
  }
  /** HTML 올리기. 승인 없이 바로 보입니다. */
  public async createHtml(h: INewHtml): Promise<number> {
    if (!h.file) { throw new HubError('HTML 파일을 골라 주세요.', 400); }
    return this.createWithFile(this.lists.contents, this.htmlFields(h, HubService.withRelease('', h.version, h.changeNote)), storedSkillName(h.file.name), h.file.text, h.thumb, h.shots, h.icon);
  }
  public async updateHtml(tool: IHtmlTool, h: INewHtml): Promise<void> {
    const rel = HubService.withRelease(await this.releasesOf(tool.id), h.version, h.changeNote);
    await this.updateWithFile(this.lists.contents, tool.id, tool.storedName, this.htmlFields(h, rel), h.file ? { name: h.file.name, body: h.file.text } : undefined);
    await this.applyThumb(this.lists.contents, tool.id, tool.thumb, h.thumb, h.dropThumb);
    await this.applyThumb(this.lists.contents, tool.id, tool.icon, h.icon, h.dropIcon, 'icon');
    await this.saveShots('Html', tool.id, tool.images, h.shots || [], h.dropShots || []);
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
    await this.send(`${this.listUrl(this.lists.contents)}/items(${id})/recycle()`, undefined, undefined, this.lists.contents);
  }
  public async getFileText(fileRef: string): Promise<string> {
    const res = await this.client.get(`${this.fileApi(fileRef)}/$value`, SPHttpClient.configurations.v1);
    if (!res.ok) { return this.fail(res); }
    return res.text();
  }
  public async getHtmlVersions(id: number): Promise<IVersion[]> {
    return HubService.releases(await this.releasesOf(id));
  }
}
/* eslint-enable @typescript-eslint/no-explicit-any */
