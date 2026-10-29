/* 신청서: Agent 등록, 아이디어 올리기 */
import * as React from 'react';
import { AgentType, Frequency, IAgent, IIdea, IMe, INewAgentRequest, INewIdea, INewInsight, Sensitivity, ShareLevel } from '../models/types';
import {
  AGENT_TYPES, AREAS, CATEGORIES, EXTERNALS, FREQUENCIES, INDUSTRIES, ROUTE, SENSITIVITIES, TEAMS, TOOLS, TYPE_HINT,
  catColor, findSimilar, hasRiskyConnection, isHttpsUrl, looksLikeCompanyName, monthlyHours, riskOf
} from '../models/rules';
import { PanelHead, RiskBadge, Shape, StatusPill } from './ui';

type Errors = { [field: string]: string };

function Err(props: { id: string; errors: Errors }): JSX.Element | null {
  const m = props.errors[props.id];
  return m ? <p className="err" id={`hub-e-${props.id}`}>{m}</p> : null;
}
function inv(errors: Errors, id: string): { 'aria-invalid': boolean; 'aria-describedby'?: string } {
  return errors[id] ? { 'aria-invalid': true, 'aria-describedby': `hub-e-${id}` } : { 'aria-invalid': false };
}
/** 첫 오류 칸으로 이동 */
function focusFirstError(form: HTMLFormElement | null): void {
  if (!form) { return; }
  window.setTimeout(() => {
    const err = form.querySelector('.err');
    if (!err) { return; }
    const host = (err.closest('.fld') || err.parentElement) as HTMLElement | null;
    const ctl = host ? host.querySelector('input:not([disabled]),select,textarea') as HTMLElement | null : null;
    if (ctl) { ctl.focus(); }
    err.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 0);
}

function Footer(props: { busy: boolean; label: string; busyLabel: string; onCancel: () => void }): JSX.Element {
  return (
    <div className="rfoot">
      <button type="button" className="btn" onClick={props.onCancel}>취소</button>
      <button type="submit" className="btn pr" disabled={props.busy}>{props.busy ? props.busyLabel : props.label}</button>
    </div>
  );
}

/* ================= Agent 등록 ================= */
export function RegisterForm(props: {
  me: IMe;
  existingTitles: string[];
  onCancel: () => void;
  onSubmit: (req: INewAgentRequest) => Promise<boolean>;
}): JSX.Element {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [f, setF] = React.useState({
    title: '', summary: '', description: '', category: '', type: '' as AgentType | '',
    dataSources: '', sensitivity: '' as Sensitivity | '', external: [] as string[],
    shareLevel: '직원 공유' as ShareLevel, installLink: '', ownerTeam: '',
    testConfirmed: false, testNote: ''
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [busy, setBusy] = React.useState(false);

  const set = (k: string, v: unknown): void => {
    setF(prev => { const n = { ...prev } as { [k: string]: unknown }; n[k] = v; return n as typeof prev; });
    if (errors[k]) { const e = { ...errors }; delete e[k]; setErrors(e); }
  };
  const toggleExt = (x: string): void => set('external', f.external.indexOf(x) >= 0 ? f.external.filter(y => y !== x) : f.external.concat([x]));
  const risk = riskOf(f.type, f.sensitivity, f.external);

  const validate = (): Errors => {
    const e: Errors = {};
    const t = f.title.trim();
    if (!t) { e.title = 'Agent 이름을 입력해 주세요.'; }
    else if (props.existingTitles.indexOf(t) >= 0) { e.title = '같은 이름의 Agent가 이미 있습니다. 다른 이름을 써 주세요.'; }
    if (!f.summary.trim()) { e.summary = '카드에 보일 한 줄 소개를 입력해 주세요.'; }
    if (f.description.trim().length < 20) { e.description = '자세한 설명을 20자 이상 입력해 주세요.'; }
    if (!f.category) { e.category = '카테고리를 골라 주세요.'; }
    if (!f.type) { e.type = '유형을 골라 주세요.'; }
    if (!f.dataSources.trim()) { e.dataSources = '참조하는 데이터를 적어 주세요. 없으면 "없음"이라고 적습니다.'; }
    if (!f.sensitivity) { e.sensitivity = '데이터 등급을 골라 주세요.'; }
    if (!f.installLink.trim()) { e.installLink = '설치 링크를 붙여 넣어 주세요. 게시 전이면 Copilot Studio에서 먼저 게시합니다.'; }
    else if (!isHttpsUrl(f.installLink.trim())) { e.installLink = 'https://로 시작하는 링크를 붙여 넣어 주세요.'; }
    if (!f.ownerTeam) { e.ownerTeam = '담당 팀을 골라 주세요.'; }
    if (!f.testConfirmed) { e.testConfirmed = '테스트를 마친 뒤 신청할 수 있습니다.'; }
    return e;
  };

  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    if (Object.keys(e).length || !risk || !f.type || !f.sensitivity) { focusFirstError(formRef.current); return; }
    setBusy(true);
    const ok = await props.onSubmit({
      title: f.title.trim(), summary: f.summary.trim(), description: f.description.trim(), category: f.category,
      type: f.type, dataSources: f.dataSources.trim(), sensitivity: f.sensitivity, external: f.external,
      shareLevel: f.shareLevel, installLink: f.installLink.trim(),
      ownerTeam: f.ownerTeam, testConfirmed: f.testConfirmed, testNote: f.testNote.trim(), risk
    });
    setBusy(false);
    if (!ok) { return; }
  };

  const previewColor = f.category ? catColor(f.category) : 'var(--line-2)';
  return (
    <>
      <PanelHead id="hub-p-title" title="Agent 등록" onClose={props.onCancel}
        badges={<span className="badge b-sh">등록 신청서</span>}
        sub="운영 담당자가 위험도와 테스트 결과를 검토한 뒤 Hub에 게시합니다."
        icon={<span className="tile lg" style={{ ['--c' as string]: previewColor } as React.CSSProperties} aria-hidden="true">
          <svg viewBox="0 0 40 40">{f.category && f.type ? <Shape type={f.type} color={catColor(f.category)} />
            : <rect x="8" y="8" width="24" height="24" rx="3" style={{ fill: 'none', stroke: 'var(--muted)', strokeDasharray: '3 3' }} />}</svg>
        </span>} />
      <form ref={formRef} className="pb rform" noValidate={true} onSubmit={submit}>
        <fieldset>
          <legend><i>1</i>무엇을 하는 Agent인가요?</legend>
          <div className="fld"><label htmlFor="hub-r-title">Agent 이름</label><input id="hub-r-title" maxLength={40} autoComplete="off" placeholder="예: 계약서 검토 도우미" value={f.title} onChange={e => set('title', e.target.value)} {...inv(errors, 'title')} /><Err id="title" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-r-summary">한 줄 소개</label><input id="hub-r-summary" maxLength={60} autoComplete="off" placeholder="카드에 보이는 문장입니다 (60자)" value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'summary')} /><Err id="summary" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-r-desc">자세한 설명 <span className="opt">언제, 누가 쓰면 좋은지</span></label><textarea id="hub-r-desc" maxLength={400} placeholder="상세 화면에 보이는 설명입니다 (400자)" value={f.description} onChange={e => set('description', e.target.value)} {...inv(errors, 'description')} /><Err id="description" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-r-cat">카테고리</label><select id="hub-r-cat" value={f.category} onChange={e => set('category', e.target.value)} {...inv(errors, 'category')}><option value="">선택하세요</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select><Err id="category" errors={errors} /></div>
          <div className="fld">
            <span className="lbl" id="hub-l-type">유형</span>
            <div className="tcards" role="radiogroup" aria-labelledby="hub-l-type">
              {AGENT_TYPES.map((t, k) => (
                <label key={t} className={'tcard' + (f.type === t ? ' on' : '')}>
                  <input type="radio" name="hub-r-type" id={`hub-r-type-${k}`} value={t} checked={f.type === t} onChange={() => set('type', t)} />
                  <svg viewBox="0 0 40 40" aria-hidden="true"><Shape type={t} color="currentColor" /></svg><b>{t}</b><small>{TYPE_HINT[t]}</small>
                </label>
              ))}
            </div>
            <Err id="type" errors={errors} />
          </div>
        </fieldset>

        <fieldset>
          <legend><i>2</i>어떤 데이터를 쓰나요?</legend>
          <div className="fld"><label htmlFor="hub-r-data">참조하는 데이터</label><input id="hub-r-data" maxLength={120} autoComplete="off" placeholder="예: 계약서 보관함(SharePoint), 첨부한 파일" value={f.dataSources} onChange={e => set('dataSources', e.target.value)} {...inv(errors, 'dataSources')} /><Err id="dataSources" errors={errors} /></div>
          <div className="fld">
            <span className="lbl" id="hub-l-sens">가장 민감한 데이터 등급</span>
            <div className="seg" role="radiogroup" aria-labelledby="hub-l-sens">
              {SENSITIVITIES.map((x, k) => <label key={x} className={f.sensitivity === x ? 'on' : ''}><input type="radio" name="hub-r-sens" id={`hub-r-sens-${k}`} checked={f.sensitivity === x} onChange={() => set('sensitivity', x)} /><span>{x}</span></label>)}
            </div>
            <Err id="sensitivity" errors={errors} />
          </div>
          <div className="fld">
            <span className="lbl" id="hub-l-ext">외부 연결 <span className="opt">해당하는 것 모두</span></span>
            <div className="checks" role="group" aria-labelledby="hub-l-ext">
              {EXTERNALS.map((x, k) => <label key={x}><input type="checkbox" id={`hub-r-ext-${k}`} checked={f.external.indexOf(x) >= 0} onChange={() => toggleExt(x)} />{x}</label>)}
            </div>
          </div>
        </fieldset>

        <fieldset>
          <legend><i>3</i>누가, 어떻게 쓰나요?</legend>
          <div className="fld">
            <span className="lbl" id="hub-l-lv">공유 등급</span>
            <div className="seg two" role="radiogroup" aria-labelledby="hub-l-lv">
              <label className={f.shareLevel === '직원 공유' ? 'on' : ''}><input type="radio" name="hub-r-lv" id="hub-r-lv-0" checked={f.shareLevel === '직원 공유'} onChange={() => set('shareLevel', '직원 공유')} /><span>직원 공유<small>개발·테스트 환경, 최대 5명</small></span></label>
              <label className={f.shareLevel === '공식 운영' ? 'on' : ''}><input type="radio" name="hub-r-lv" id="hub-r-lv-1" checked={f.shareLevel === '공식 운영'} onChange={() => set('shareLevel', '공식 운영')} /><span>공식 운영 신청<small>승인 후 운영 환경으로 이전</small></span></label>
            </div>
          </div>
          <div className="fld"><label htmlFor="hub-r-link">설치 링크 <span className="opt">Copilot Studio › 채널 › Availability options › Copy link</span></label><input id="hub-r-link" type="url" inputMode="url" autoComplete="off" placeholder="https://teams.microsoft.com/l/app/…" value={f.installLink} onChange={e => set('installLink', e.target.value)} {...inv(errors, 'installLink')} /><Err id="installLink" errors={errors} /></div>
          <div className="fld half">
            <div><label htmlFor="hub-r-own">담당자</label><input id="hub-r-own" value={`${props.me.name} (신청자)`} disabled={true} /></div>
            <div><label htmlFor="hub-r-team">담당 팀</label><select id="hub-r-team" value={f.ownerTeam} onChange={e => set('ownerTeam', e.target.value)} {...inv(errors, 'ownerTeam')}><option value="">선택하세요</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select><Err id="ownerTeam" errors={errors} /></div>
          </div>        </fieldset>

        <fieldset>
          <legend><i>4</i>테스트했나요?</legend>
          <div className="fld">
            <label className="cbx" htmlFor="hub-r-test"><input type="checkbox" id="hub-r-test" checked={f.testConfirmed} onChange={e => set('testConfirmed', e.target.checked)} {...inv(errors, 'testConfirmed')} /><span>대표 질문 5개 이상으로 테스트했고, 답변에 권한 밖의 정보가 나오지 않는 것을 확인했습니다.</span></label>
            <Err id="testConfirmed" errors={errors} />
          </div>
          <div className="fld"><label htmlFor="hub-r-note">테스트 메모 <span className="opt">선택</span></label><textarea id="hub-r-note" maxLength={300} placeholder="예: 질문 6개 중 5개 정확, 1개는 문서 최신본이 없어 답변 못 함" value={f.testNote} onChange={e => set('testNote', e.target.value)} /></div>
        </fieldset>

        <div className={'riskbox' + (risk ? ' on r-' + risk : '')} aria-live="polite">
          {risk ? (
            <>
              <div><span className="lbl">예상 위험도</span><RiskBadge risk={risk} /></div>
              <p><b>승인 경로</b> {ROUTE[risk]}</p>
              <p className="why">{f.type} · 데이터 {f.sensitivity}{f.external.length ? ' · 외부 연결 ' + f.external.join(', ') : ''}{hasRiskyConnection(f.external) ? ' (MCP·커넥터 연결 시 최소 중위험)' : ''}</p>
            </>
          ) : (
            <>
              <div><span className="lbl">예상 위험도</span><span className="pending">유형과 데이터 등급을 고르면 계산됩니다</span></div>
              <p className="why">위험도 = 업무 유형 × 데이터 민감도. 최종 판정은 운영 담당자가 합니다.</p>
            </>
          )}
        </div>
        <Footer busy={busy} label="신청하기" busyLabel="신청하는 중…" onCancel={props.onCancel} />
      </form>
    </>
  );
}

/* ================= 아이디어 올리기 ================= */
export function IdeaForm(props: {
  agents: IAgent[];
  ideas: IIdea[];
  onCancel: () => void;
  onOpenAgent: (id: number) => void;
  onSubmit: (idea: INewIdea) => Promise<boolean>;
}): JSX.Element {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [f, setF] = React.useState({ title: '', pain: '', summary: '', frequency: '' as Frequency | '', minutes: '', team: '', category: '' });
  const [errors, setErrors] = React.useState<Errors>({});
  const [busy, setBusy] = React.useState(false);
  const set = (k: string, v: string): void => {
    setF(prev => { const n = { ...prev } as { [k: string]: string }; n[k] = v; return n as typeof prev; });
    if (errors[k]) { const e = { ...errors }; delete e[k]; setErrors(e); }
  };
  const similar = f.title.trim().length >= 2 ? findSimilar(f.title, props.agents, props.ideas) : [];
  const mins = f.minutes ? Number(f.minutes) : undefined;
  const hrs = monthlyHours(f.frequency, mins);

  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    if (!f.title.trim()) { e.title = '아이디어 제목을 입력해 주세요.'; }
    if (f.pain.trim().length < 10) { e.pain = '지금 겪는 불편을 10자 이상 적어 주세요. 검토할 때 가장 중요하게 봅니다.'; }
    if (!f.summary.trim()) { e.summary = 'Agent가 해 줬으면 하는 일을 한 줄로 적어 주세요.'; }
    if (!f.frequency) { e.frequency = '이 업무를 얼마나 자주 하는지 골라 주세요.'; }
    if (f.minutes && (!(mins! >= 1) || mins! > 480)) { e.minutes = '1분에서 480분 사이로 적어 주세요.'; }
    if (!f.team) { e.team = '제안하는 팀을 골라 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length || !f.frequency) { focusFirstError(formRef.current); return; }
    setBusy(true);
    await props.onSubmit({ title: f.title.trim(), pain: f.pain.trim(), summary: f.summary.trim(), frequency: f.frequency, minutes: mins, team: f.team, category: f.category });
    setBusy(false);
  };

  return (
    <>
      <PanelHead id="hub-p-title" title="아이디어 올리기" onClose={props.onCancel}
        badges={<span className="badge b-idea">아이디어</span>}
        sub="'이런 Agent가 있으면 좋겠다'를 적어 주세요. 좋아요가 많은 아이디어는 월 1회 검토해 제작 담당을 정합니다."
        icon={<span className="tile lg" style={{ ['--c' as string]: 'var(--hot)' } as React.CSSProperties} aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M20 6a10 10 0 0 1 6 18v4H14v-4A10 10 0 0 1 20 6z" style={{ fill: 'var(--hot)' }} /><rect x="14" y="30" width="12" height="4" rx="1" style={{ fill: 'var(--hot)' }} opacity=".5" /></svg></span>} />
      <form ref={formRef} className="pb rform" noValidate={true} onSubmit={submit}>
        <fieldset>
          <legend><i>1</i>어떤 Agent가 필요한가요?</legend>
          <div className="fld"><label htmlFor="hub-d-title">아이디어 제목</label><input id="hub-d-title" maxLength={40} autoComplete="off" placeholder="예: 고객 미팅 회의록 정리 Agent" value={f.title} onChange={e => set('title', e.target.value)} {...inv(errors, 'title')} /><Err id="title" errors={errors} /></div>
          {similar.length ? (
            <div className="similar">
              <b>비슷한 것이 이미 있어요</b>
              <ul>
                {similar.map(s => s.agent
                  ? <li key={'a' + s.agent.id}><span className="badge b-of">Agent</span> <button type="button" className="lnk" onClick={() => props.onOpenAgent(s.agent!.id)}>{s.agent.title}</button> · {s.agent.summary}</li>
                  : <li key={'i' + s.idea!.id}><StatusPill status={s.idea!.status} /> {s.idea!.title}</li>)}
              </ul>
              <small>같은 내용이면 새로 올리기보다 기존 아이디어에 좋아요를 눌러 주세요.</small>
            </div>
          ) : null}
          <div className="fld"><label htmlFor="hub-d-pain">지금 겪는 불편 <span className="opt">누가, 언제, 무엇이 힘든지</span></label><textarea id="hub-d-pain" maxLength={300} placeholder="예: 고객 미팅이 끝나면 담당자가 녹취를 다시 들으며 회의록을 쓰느라 1시간씩 걸립니다." value={f.pain} onChange={e => set('pain', e.target.value)} {...inv(errors, 'pain')} /><Err id="pain" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-d-summary">Agent가 해 줬으면 하는 일</label><input id="hub-d-summary" maxLength={60} autoComplete="off" placeholder="보드에 보이는 한 줄입니다 (60자)" value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'summary')} /><Err id="summary" errors={errors} /></div>
        </fieldset>
        <fieldset>
          <legend><i>2</i>얼마나 자주, 오래 하는 일인가요?</legend>
          <div className="fld">
            <span className="lbl" id="hub-l-freq">이 업무를 하는 빈도</span>
            <div className="seg four" role="radiogroup" aria-labelledby="hub-l-freq">
              {FREQUENCIES.map((x, k) => <label key={x} className={f.frequency === x ? 'on' : ''}><input type="radio" name="hub-d-freq" id={`hub-d-freq-${k}`} checked={f.frequency === x} onChange={() => set('frequency', x)} /><span>{x}</span></label>)}
            </div>
            <Err id="frequency" errors={errors} />
          </div>
          <div className="fld"><label htmlFor="hub-d-min">한 번 할 때 걸리는 시간 <span className="opt">분, 대략</span></label><input id="hub-d-min" type="number" inputMode="numeric" min={1} max={480} placeholder="예: 60" value={f.minutes} onChange={e => set('minutes', e.target.value)} {...inv(errors, 'minutes')} /><Err id="minutes" errors={errors} /></div>
          <div className="fld half">
            <div><label htmlFor="hub-d-team">제안하는 팀</label><select id="hub-d-team" value={f.team} onChange={e => set('team', e.target.value)} {...inv(errors, 'team')}><option value="">선택하세요</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select><Err id="team" errors={errors} /></div>
            <div><label htmlFor="hub-d-cat">가까운 카테고리 <span className="opt">선택</span></label><select id="hub-d-cat" value={f.category} onChange={e => set('category', e.target.value)}><option value="">모르겠어요</option>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select></div>
          </div>
          <div className={'riskbox' + (hrs !== undefined ? ' on' : '')} aria-live="polite">
            {hrs !== undefined ? (
              <><div><span className="lbl">이 업무에 드는 시간</span><b className="num big">월 약 {hrs}시간</b></div><p className="why">한 사람 기준 · {f.frequency} {f.minutes}분. 같은 일을 하는 사람이 많을수록 우선순위가 올라갑니다.</p></>
            ) : (
              <><div><span className="lbl">이 업무에 드는 시간</span><span className="pending">빈도와 시간을 넣으면 계산됩니다</span></div><p className="why">검토 때 우선순위를 정하는 데 씁니다.</p></>
            )}
          </div>
        </fieldset>
        <p className="pfoot plain">고객사 이름이나 고객 데이터는 적지 마세요. 올린 아이디어는 전 직원에게 보입니다.</p>
        <Footer busy={busy} label="아이디어 올리기" busyLabel="올리는 중…" onCancel={props.onCancel} />
      </form>
    </>
  );
}

/* ================= 사례 올리기 ================= */
export function InsightForm(props: {
  onCancel: () => void;
  onSubmit: (s: INewInsight) => Promise<boolean>;
}): JSX.Element {
  const formRef = React.useRef<HTMLFormElement>(null);
  const [f, setF] = React.useState({
    title: '', summary: '', industry: '', area: '', customerType: '', tools: [] as string[],
    problem: '', solution: '', outcome: '', lessons: '', team: '', project: '', detailUrl: '', confirmed: false
  });
  const [errors, setErrors] = React.useState<Errors>({});
  const [busy, setBusy] = React.useState(false);
  const set = (k: string, v: unknown): void => {
    setF(prev => { const n = { ...prev } as { [k: string]: unknown }; n[k] = v; return n as typeof prev; });
    if (errors[k]) { const e = { ...errors }; delete e[k]; setErrors(e); }
  };
  const toggleTool = (t: string): void => set('tools', f.tools.indexOf(t) >= 0 ? f.tools.filter(x => x !== t) : f.tools.concat([t]));
  const nameRisk = [f.title, f.summary, f.customerType, f.problem, f.solution, f.outcome, f.project].some(looksLikeCompanyName);
  const outcomeHasNumber = /\d/.test(f.outcome);

  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    if (!f.title.trim()) { e.title = '사례 제목을 입력해 주세요. 예: 민원 응대 가이드 Agent'; }
    if (!f.summary.trim()) { e.summary = '카드에 보일 한 줄 요약을 입력해 주세요.'; }
    if (!f.industry) { e.industry = '업종을 골라 주세요.'; }
    if (!f.customerType.trim()) { e.customerType = '고객사 유형을 적어 주세요. 예: 공공기관, 중견 제조사'; }
    if (f.problem.trim().length < 15) { e.problem = '고객이 겪던 문제를 15자 이상 적어 주세요.'; }
    if (f.solution.trim().length < 15) { e.solution = '어떻게 해결했는지 15자 이상 적어 주세요.'; }
    if (!f.outcome.trim()) { e.outcome = '성과를 한 줄로 적어 주세요. 예: 확인 시간 15분 → 4분'; }
    if (!f.team) { e.team = '작성 팀을 골라 주세요.'; }
    if (f.detailUrl.trim() && !isHttpsUrl(f.detailUrl.trim())) { e.detailUrl = 'https://로 시작하는 주소를 넣어 주세요.'; }
    if (nameRisk) { e.customerType = '고객사 실명으로 보이는 표현이 있습니다. 업종 유형까지만 써 주세요.'; }
    if (!f.confirmed) { e.confirmed = '고객사 실명과 고객 데이터를 넣지 않았는지 확인해 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(formRef.current); return; }
    setBusy(true);
    await props.onSubmit({
      title: f.title.trim(), summary: f.summary.trim(), industry: f.industry, area: f.area, customerType: f.customerType.trim(),
      tools: f.tools, problem: f.problem.trim(), solution: f.solution.trim(), outcome: f.outcome.trim(), lessons: f.lessons.trim(),
      team: f.team, project: f.project.trim(), detailUrl: f.detailUrl.trim()
    });
    setBusy(false);
  };

  return (
    <>
      <PanelHead id="hub-p-title" title="사례 올리기" onClose={props.onCancel}
        badges={<span className="badge b-insight">인사이트</span>}
        sub="고객 프로젝트에서 만든 Agent 사례를 나눠 주세요. 운영 담당자가 고객 정보를 확인한 뒤 모두에게 게시합니다."
        icon={<span className="tile lg" style={{ ['--c' as string]: 'var(--c-learn)' } as React.CSSProperties} aria-hidden="true"><svg viewBox="0 0 40 40"><rect x="7" y="9" width="26" height="22" rx="4" style={{ fill: 'var(--c-learn)' }} opacity=".25" /><path d="M12 25l5-6 4 4 7-8" style={{ fill: 'none', stroke: 'var(--c-learn)', strokeWidth: 3, strokeLinecap: 'round', strokeLinejoin: 'round' }} /></svg></span>} />
      <form ref={formRef} className="pb rform" noValidate={true} onSubmit={submit}>
        <fieldset>
          <legend><i>1</i>어떤 사례인가요?</legend>
          <div className="fld"><label htmlFor="hub-s-title">사례 제목</label><input id="hub-s-title" maxLength={50} autoComplete="off" placeholder="예: 민원 응대 가이드 Agent" value={f.title} onChange={e => set('title', e.target.value)} {...inv(errors, 'title')} /><Err id="title" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-s-summary">한 줄 요약</label><input id="hub-s-summary" maxLength={70} autoComplete="off" placeholder="이 Agent가 고객사에서 하는 일 (70자)" value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'summary')} /><Err id="summary" errors={errors} /></div>
          <div className="fld">
            <span className="lbl" id="hub-l-ind">업종</span>
            <div className="seg five" role="radiogroup" aria-labelledby="hub-l-ind">
              {INDUSTRIES.map((x, k) => <label key={x} className={f.industry === x ? 'on' : ''}><input type="radio" name="hub-s-ind" id={`hub-s-ind-${k}`} checked={f.industry === x} onChange={() => set('industry', x)} /><span>{x}</span></label>)}
            </div>
            <Err id="industry" errors={errors} />
          </div>
          <div className="fld half">
            <div><label htmlFor="hub-s-area">업무 영역 <span className="opt">선택</span></label><select id="hub-s-area" value={f.area} onChange={e => set('area', e.target.value)}><option value="">선택하세요</option>{AREAS.map(a => <option key={a}>{a}</option>)}</select></div>
            <div><label htmlFor="hub-s-cu">고객사 유형</label><input id="hub-s-cu" maxLength={30} autoComplete="off" placeholder="예: 공공기관, 중견 제조사" value={f.customerType} onChange={e => set('customerType', e.target.value)} {...inv(errors, 'customerType')} /></div>
          </div>
          <Err id="customerType" errors={errors} />
          {nameRisk && !errors.customerType ? <p className="warn">고객사 실명으로 보이는 표현이 있습니다. '공공기관', '금융사'처럼 업종 유형까지만 써 주세요.</p> : null}
        </fieldset>

        <fieldset>
          <legend><i>2</i>무엇을 만들었나요?</legend>
          <div className="fld">
            <span className="lbl" id="hub-l-tools">구성 도구 <span className="opt">해당하는 것 모두</span></span>
            <div className="checks" role="group" aria-labelledby="hub-l-tools">
              {TOOLS.map((t, k) => <label key={t}><input type="checkbox" id={`hub-s-tool-${k}`} checked={f.tools.indexOf(t) >= 0} onChange={() => toggleTool(t)} />{t}</label>)}
            </div>
          </div>
          <div className="fld"><label htmlFor="hub-s-problem">고객이 겪던 문제</label><textarea id="hub-s-problem" maxLength={400} placeholder="예: 신규 담당자가 민원 처리 기준을 찾느라 건당 평균 15분을 썼고, 담당자마다 답변이 달랐습니다." value={f.problem} onChange={e => set('problem', e.target.value)} {...inv(errors, 'problem')} /><Err id="problem" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-s-solution">해결 방식</label><textarea id="hub-s-solution" maxLength={400} placeholder="예: 민원 처리 지침 120여 건을 SharePoint 지식으로 연결하고, 유형별로 근거 조항과 서식을 함께 안내하도록 구성했습니다." value={f.solution} onChange={e => set('solution', e.target.value)} {...inv(errors, 'solution')} /><Err id="solution" errors={errors} /></div>
          <div className="fld"><label htmlFor="hub-s-outcome">성과 <span className="opt">숫자로 쓰면 카드에서 눈에 잘 띕니다</span></label><input id="hub-s-outcome" maxLength={60} autoComplete="off" placeholder="예: 기준 확인 시간 15분 → 4분" value={f.outcome} onChange={e => set('outcome', e.target.value)} {...inv(errors, 'outcome')} /><Err id="outcome" errors={errors} />
            {f.outcome.trim() && !outcomeHasNumber ? <p className="hint-t">시간, 건수, 비율처럼 숫자가 들어가면 다른 팀이 효과를 더 쉽게 가늠합니다.</p> : null}
          </div>
          <div className="fld"><label htmlFor="hub-s-lessons">배운 점 <span className="opt">선택, 다음 프로젝트에 도움이 되는 것</span></label><textarea id="hub-s-lessons" maxLength={300} placeholder="예: 지침 문서의 최신본 관리가 답변 품질을 좌우했습니다. 문서 소유자와 갱신 주기를 먼저 정하세요." value={f.lessons} onChange={e => set('lessons', e.target.value)} /></div>
        </fieldset>

        <fieldset>
          <legend><i>3</i>누가 했나요?</legend>
          <div className="fld half">
            <div><label htmlFor="hub-s-team">작성 팀</label><select id="hub-s-team" value={f.team} onChange={e => set('team', e.target.value)} {...inv(errors, 'team')}><option value="">선택하세요</option>{TEAMS.map(t => <option key={t}>{t}</option>)}</select><Err id="team" errors={errors} /></div>
            <div><label htmlFor="hub-s-prj">프로젝트 이름 <span className="opt">선택</span></label><input id="hub-s-prj" maxLength={50} autoComplete="off" placeholder="예: 공공기관 Copilot 확산" value={f.project} onChange={e => set('project', e.target.value)} /></div>
          </div>
          <div className="fld"><label htmlFor="hub-s-url">상세 자료 주소 <span className="opt">선택, 사내 문서·뉴스 게시물</span></label><input id="hub-s-url" type="url" inputMode="url" autoComplete="off" placeholder="https://munilabskr.sharepoint.com/…" value={f.detailUrl} onChange={e => set('detailUrl', e.target.value)} {...inv(errors, 'detailUrl')} /><Err id="detailUrl" errors={errors} /></div>
        </fieldset>

        {f.title.trim() || f.outcome.trim() ? (
          <div className="preview">
            <span className="lbl">카드 미리보기</span>
            <div className="card static">
              <span className="top">{f.industry ? <span className={'ind i-' + f.industry}>{f.industry}</span> : <span className="ind i-서비스">업종</span>}</span>
              <h3>{f.title || '사례 제목'}</h3>
              <p className="meta">고객사 · {f.customerType || '고객사 유형'}{f.area ? ' · ' + f.area : ''}</p>
              {f.summary ? <p className="desc">{f.summary}</p> : null}
              {f.tools.length ? <div className="tags">{f.tools.map(t => <span key={t}>{t}</span>)}</div> : null}
              {f.outcome ? <div className="foot col"><span className="out1"><b>{f.outcome}</b></span></div> : null}
            </div>
          </div>
        ) : null}

        <div className="fld">
          <label className="cbx" htmlFor="hub-s-ok"><input type="checkbox" id="hub-s-ok" checked={f.confirmed} onChange={e => set('confirmed', e.target.checked)} {...inv(errors, 'confirmed')} /><span>고객사 실명, 담당자 이름, 고객 데이터를 넣지 않았습니다.</span></label>
          <Err id="confirmed" errors={errors} />
        </div>
        <Footer busy={busy} label="사례 올리기" busyLabel="올리는 중…" onCancel={props.onCancel} />
      </form>
    </>
  );
}
