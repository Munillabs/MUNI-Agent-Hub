/* 입력 화면 (시안 마크업): Skill 올리기, HTML 올리기, 사례 올리기, 오류 신고 */
import * as React from 'react';
import { ICase, IHtmlTool, IIdea, INewCase, INewHtml, INewIdea, INewSkill, IReportTarget, ISkill, ISolution, SolutionKind } from '../models/types';
import {
  CASE_INDUSTRIES, CASE_LEVELS, CASE_PATTERNS, CASE_PRODUCTS, HTML_KINDS, HTML_MAX_BYTES, IDEA_FREQS, IDEA_TYPES, MADE_WITH, REPORT_KINDS, SCOPES, SKILL_AREAS, SKILL_EXTS, SKILL_KINDS, SKILL_MAX_BYTES,
  SKILL_TOOLS, SOLUTION_KINDS,
  compareVersion, extOf, fileSize, isEmail, isVersion, looksLikeSecret, nextVersion, periodOptions, readFrontMatter,
  splitLines
} from '../models/rules';

type Errors = { [field: string]: string };

function useForm<T extends object>(init: T): [T, (k: keyof T, v: unknown) => void, Errors, React.Dispatch<React.SetStateAction<Errors>>] {
  const [f, setF] = React.useState<T>(init);
  const [errors, setErrors] = React.useState<Errors>({});
  const set = (k: keyof T, v: unknown): void => {
    setF(prev => { const n = { ...prev } as { [k: string]: unknown }; n[k as string] = v; return n as T; });
    setErrors(e => { if (!e[k as string]) { return e; } const n = { ...e }; delete n[k as string]; return n; });
  };
  return [f, set, errors, setErrors];
}
function Req(): JSX.Element { return <span className="req" aria-hidden="true">*</span>; }
/** 시안의 .field: 오류가 있으면 .bad 를 붙이고 .err 문구를 보입니다 */
function Field(props: { id?: string; k?: string; label?: React.ReactNode; req?: boolean; hint?: React.ReactNode; errors?: Errors; children: React.ReactNode; className?: string }): JSX.Element {
  const err = props.k && props.errors ? props.errors[props.k] : '';
  return (
    <div className={'field' + (err ? ' bad' : '') + (props.className ? ' ' + props.className : '')} data-f={props.k}>
      {props.label ? (props.id ? <label htmlFor={props.id}>{props.label}{props.req ? <Req /> : null}</label> : <span className="flabel">{props.label}{props.req ? <Req /> : null}</span>) : null}
      {props.children}
      {props.hint ? <span className="hint">{props.hint}</span> : null}
      {props.k ? <span className="err" id={`hub-e-${props.k}`}>{err}</span> : null}
    </div>
  );
}
function inv(errors: Errors, k: string): { 'aria-invalid': boolean; 'aria-describedby'?: string } {
  return errors[k] ? { 'aria-invalid': true, 'aria-describedby': `hub-e-${k}` } : { 'aria-invalid': false };
}
function Checks(props: { name: string; items: string[]; value: string[]; onChange: (v: string[]) => void }): JSX.Element {
  return (
    <div className="chkrow">
      {props.items.map((t, k) => (
        <label key={t}><input type="checkbox" id={`${props.name}-${k}`} value={t} checked={props.value.indexOf(t) >= 0}
          onChange={() => props.onChange(props.value.indexOf(t) >= 0 ? props.value.filter(y => y !== t) : props.value.concat([t]))} /> {t}</label>
      ))}
    </div>
  );
}
/** 첫 오류 칸으로 이동 */
function focusFirstError(root: HTMLElement | null): void {
  if (!root) { return; }
  window.setTimeout(() => {
    const bad = root.querySelector('.field.bad, .errsum.on') as HTMLElement | null;
    if (!bad) { return; }
    const ctl = bad.classList.contains('errsum') ? bad : bad.querySelector('input:not([type=file]),select,textarea') as HTMLElement | null;
    if (ctl) { ctl.focus(); }
    bad.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, 0);
}
function readAs(fl: File, how: 'text' | 'buffer'): Promise<string | ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string | ArrayBuffer);
    r.onerror = () => reject(new Error('파일을 읽지 못했습니다.'));
    if (how === 'text') { r.readAsText(fl, 'utf-8'); } else { r.readAsArrayBuffer(fl); }
  });
}
/** 끌어다 놓기 · 눌러서 고르기 상자 (시안 .drop) */
/** 파일 끌어다 놓기.
    SharePoint 편집 화면(워크벤치 포함)은 파일을 끌면 문서 단계에서 먼저 가로채 '웹 파트 추가' 등으로 처리합니다.
    그래서 창(window) 단계의 캡처로 먼저 받아, 폼이 열려 있는 동안에는 파일 끌기를 Hub가 처리합니다.
    놓은 위치는 이벤트 대상이 아니라 좌표로 판단합니다(SharePoint가 끌기 중에 덮개를 띄워도 동작하도록). */
function Drop(props: { id: string; accept: string; has: boolean; title: React.ReactNode; sub: React.ReactNode; onPick: (f: File) => void; children?: React.ReactNode }): JSX.Element {
  const [over, setOver] = React.useState(false);
  const ref = React.useRef<HTMLLabelElement>(null);
  const pick = React.useRef(props.onPick);
  pick.current = props.onPick;
  React.useEffect(() => {
    const isFile = (e: DragEvent): boolean => !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
    const inside = (e: DragEvent): boolean => {
      const el = ref.current;
      if (!el) { return false; }
      const r = el.getBoundingClientRect();
      return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
    };
    const onOver = (e: DragEvent): void => {
      if (!isFile(e)) { return; }
      e.preventDefault();
      e.stopPropagation();
      const ins = inside(e);
      if (e.dataTransfer) { e.dataTransfer.dropEffect = ins ? 'copy' : 'none'; }
      setOver(ins);
    };
    const onLeave = (e: DragEvent): void => {
      if (!isFile(e)) { return; }
      e.stopPropagation();
      if (!e.relatedTarget || !inside(e)) { setOver(false); }
    };
    const onDrop = (e: DragEvent): void => {
      if (!isFile(e)) { return; }
      // 영역 밖에 놓아도 브라우저가 파일을 열어 페이지를 떠나지 않게 막습니다
      e.preventDefault();
      e.stopPropagation();
      setOver(false);
      const f = inside(e) && e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : undefined;
      if (f) { pick.current(f); }
    };
    window.addEventListener('dragenter', onOver, true);
    window.addEventListener('dragover', onOver, true);
    window.addEventListener('dragleave', onLeave, true);
    window.addEventListener('drop', onDrop, true);
    return () => {
      window.removeEventListener('dragenter', onOver, true);
      window.removeEventListener('dragover', onOver, true);
      window.removeEventListener('dragleave', onLeave, true);
      window.removeEventListener('drop', onDrop, true);
    };
  }, []);
  return (
    <label ref={ref} className={'drop' + (props.has ? ' has' : '') + (over ? ' over' : '')} htmlFor={props.id}>
      <input type="file" id={props.id} accept={props.accept} className="sr" onChange={e => { const f = e.target.files && e.target.files[0]; e.target.value = ''; if (f) { props.onPick(f); } }} />
      {props.children}
      <b>{props.title}</b><span>{props.sub}</span>
    </label>
  );
}
/* ---------- 올리기 실패 안내 (Skill · HTML) ---------- */
interface IUploadFailure { title: string; tips: string[]; detail: string }
/** SharePoint 오류를 사용자가 읽을 수 있는 안내로 바꿉니다. lib = 목록 이름, cols = 필요한 열 */
function uploadFailure(e: unknown, lib: string, cols: string[]): IUploadFailure {
  const err = (e || {}) as { status?: number; stage?: string; message?: string };
  const msg = err.message || String(e);
  const status = err.status || 0;
  const colMissing = /(열|column|field|property|속성)/i.test(msg) && /(없|not exist|does not exist|cannot find|찾을 수)/i.test(msg);
  if (status === 404 && !colMissing) {
    return { title: `'${lib}' 목록을 찾을 수 없어요`, detail: msg, tips: [
      `사이트 콘텐츠에 '${lib}'가 있는지, 이름이 정확히 같은지 확인해 주세요.`,
      '문서 라이브러리가 아니라 목록으로 만들어야 해요. 파일은 항목의 첨부 파일로 저장해요.',
      '이름이 다르면 웹 파트 설정의 목록 이름을 맞춰 주세요.'] };
  }
  if (status === 401 || status === 403) {
    return { title: '올릴 권한이 없어요', detail: msg, tips: [`'${lib}'에 편집(기여) 권한이 필요해요. Hub 관리자에게 권한을 요청해 주세요.`] };
  }
  if (err.stage === 'file' && /(attach|첨부)/i.test(msg)) {
    return { title: '파일을 첨부하지 못했어요', detail: msg, tips: [
      `'${lib}' 목록에서 첨부 파일이 꺼져 있을 수 있어요. 목록 설정 → 고급 설정 → 첨부 파일을 '사용'으로 바꿔 주세요.`,
      '올리던 항목은 남기지 않았어요. 설정을 고친 뒤 다시 올려 주세요.'] };
  }
  if (colMissing || err.stage === 'info') {
    return { title: '정보를 저장하지 못했어요', detail: msg, tips: [
      `'${lib}'에 필요한 열이 없거나 형식이 달라요. 목록 설정에서 아래 열이 모두 있는지 확인해 주세요.`,
      cols.join(', '),
      '아무것도 저장하지 않았어요. 열을 고친 뒤 다시 올려 주세요.'] };
  }
  if (status === 413 || /too large|크기/i.test(msg)) {
    return { title: '파일이 너무 커요', detail: msg, tips: ['파일 크기를 줄여 다시 올려 주세요.'] };
  }
  if (!status) {
    return { title: 'SharePoint에 연결하지 못했어요', detail: msg, tips: ['인터넷 연결을 확인하고 잠시 뒤 다시 올려 주세요.'] };
  }
  return { title: err.stage === 'file' ? '파일을 올리지 못했어요' : 'SharePoint에 저장하지 못했어요', detail: msg, tips: [
    '잠시 뒤 다시 올려 주세요.',
    '계속 안 되면 아래 \'자세한 내용\'을 Hub 관리자에게 보내 주세요.'] };
}
function UploadError(props: { f?: IUploadFailure }): JSX.Element {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => { if (props.f && ref.current) { ref.current.focus(); ref.current.scrollIntoView({ block: 'nearest' }); } }, [props.f]);
  if (!props.f) { return <></>; }
  return (
    <div ref={ref} className="errsum on upfail" role="alert" tabIndex={-1}>
      <h2>{props.f.title}</h2>
      <ul>{props.f.tips.map((t, k) => <li key={k}>{t}</li>)}</ul>
      {props.f.detail ? <p className="upfail-d">자세한 내용: {props.f.detail}</p> : null}
    </div>
  );
}

/** 올리기 버튼 바로 위 빨간 안내: 비어 있는 필수 항목 수 (긴 폼에서 맨 위 요약이 안 보여도 알 수 있게) */
function MissingNote(props: { errors: Errors }): JSX.Element {
  const n = Object.keys(props.errors).filter(k => !!props.errors[k]).length;
  if (!n) { return <></>; }
  return <p className="mact-err" role="alert">작성하지 않은 필수 항목이 {n}개 있어요. 빨간색으로 표시한 칸을 채워 주세요.</p>;
}
function Act(props:{ busy: boolean; label: string; onCancel: () => void; cancelFirst?: boolean; errors?: Errors }): JSX.Element {
  return (
    <>{props.errors ? <MissingNote errors={props.errors} /> : null}
    <div className="mact">
      <button type="submit" className="btn pri" disabled={props.busy}>{props.busy ? '저장하는 중…' : props.label}</button>
      <button type="button" className="btn" onClick={props.onCancel}>취소</button>
    </div></>
  );
}

/* ================= Skill 올리기 · 새 버전 (모달 본문) ================= */
/** HubContents 열 (올리기 실패 안내에 보여 줌) */
const SKILL_COLS = ['Kind', 'Summary', 'Category', 'WorkArea', 'Tools', 'Scope', 'Does', 'Usage', 'Releases'];
const HTML_COLS = ['Kind', 'Summary', 'Category', 'WorkArea', 'Tools', 'Scope', 'Does', 'MakerNote', 'Output', 'Releases'];

/** onSubmit 은 실패하면 오류를 던집니다. 폼이 받아 버튼 위에 안내를 띄웁니다. */
export function SkillForm(props: { skill?: ISkill; existingTitles: string[]; libName: string; onCancel: () => void; onSubmit: (s: INewSkill) => Promise<void> }): JSX.Element {
  const cur = props.skill;
  const editing = !!cur;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({
    title: cur ? cur.title : '', summary: cur ? cur.summary : '', purpose: cur ? cur.purpose : '', usage: cur ? cur.usage : '',
    tools: cur ? cur.tools : [] as string[], kind: cur ? cur.kind : '', scope: cur ? (cur.scopes[0] || '') : '', area: cur ? (cur.areas[0] || '') : '',
    version: cur ? nextVersion(cur.version) : '1.0', changeNote: cur ? '' : '처음 공유'
  });
  const [file, setFile] = React.useState<{ name: string; text?: string; data?: ArrayBuffer; size: number } | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<IUploadFailure | undefined>(undefined);
  const fileErr = (m: string): void => { setFile(undefined); setErrors(e => ({ ...e, file: m })); };
  const take = (fl: File): void => {
    const ext = extOf(fl.name);
    if (SKILL_EXTS.indexOf(ext) < 0) { fileErr('.md · .txt · .docx 파일만 올릴 수 있어요.'); return; }
    if (fl.size > SKILL_MAX_BYTES) { fileErr('1MB 이하 파일만 올릴 수 있어요.'); return; }
    if (!fl.size) { fileErr('내용이 비어 있는 파일이에요.'); return; }
    readAs(fl, ext === 'docx' ? 'buffer' : 'text').then(r => {
      setErrors(e => { const n = { ...e }; delete n.file; return n; });
      if (ext === 'docx') { setFile({ name: fl.name, data: r as ArrayBuffer, size: fl.size }); return; }
      const text = String(r);
      setFile({ name: fl.name, text, size: fl.size });
      // Claude Skill 형식(--- name / description ---)이면 빈 칸을 채워 줍니다
      const fm = readFrontMatter(text);
      if (!f.title && fm.name) { set('title', fm.name.slice(0, 24)); }
      if (!f.summary && fm.description) { set('summary', fm.description.slice(0, 40)); }
    }, () => fileErr('파일을 읽지 못했어요. 다시 골라 주세요.'));
  };
  const secret = !!file && !!file.text && looksLikeSecret(file.text);

  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    if (errors.file) { e.file = errors.file; } else if (!editing && !file) { e.file = 'Skill 파일을 올려 주세요.'; }
    const t = f.title.trim();
    if (!t) { e.name = '이름을 적어 주세요.'; } else if (props.existingTitles.indexOf(t) >= 0 && (!cur || cur.title !== t)) { e.name = '같은 이름의 Skill이 이미 있어요.'; }
    if (!f.summary.trim()) { e.desc = '한 줄 소개를 적어 주세요.'; }
    if (!f.tools.length) { e.tools = '하나 이상 골라 주세요.'; }
    if (!f.purpose.trim()) { e.purpose = '어떤 때 쓰는지 적어 주세요.'; }
    if (!f.usage.trim()) { e.usage = '활용 방법을 적어 주세요.'; }
    const v = f.version.trim();
    if (!isVersion(v)) { e.version = '버전은 1.0처럼 숫자와 점으로 적어 주세요.'; }
    else if (cur && file && compareVersion(v, cur.version) <= 0) { e.version = `파일을 바꾸면 버전을 올려 주세요. 지금 버전은 ${cur.version}이에요.`; }
    else if (cur && compareVersion(v, cur.version) < 0) { e.version = `지금 버전(${cur.version})보다 낮게 적을 수 없어요.`; }
    if (cur && compareVersion(v, cur.version) !== 0 && !f.changeNote.trim()) { e.changeNote = '무엇이 바뀌었는지 적어 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    setFailure(undefined);
    try {
      await props.onSubmit({
        title: t, summary: f.summary.trim(), purpose: f.purpose.trim(), usage: f.usage.trim(), tools: f.tools, kind: f.kind, scope: f.scope, area: f.area,
        version: v, changeNote: f.changeNote.trim() || (cur ? cur.changeNote : ''), file: file ? { name: file.name, text: file.text, data: file.data } : undefined
      });
    } catch (err) {
      setFailure(uploadFailure(err, props.libName, SKILL_COLS));
    }
    setBusy(false);
  };

  return (
    <div className="fgrid">
      <form ref={ref} noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
        <Field k="file" label={editing ? '새 파일로 바꾸기 (선택)' : 'Skill 파일'} req={!editing} errors={errors}>
          <Drop id="hub-sk-file" accept=".md,.txt,.docx" has={!!file} title={file ? file.name : '파일을 끌어다 놓거나 눌러서 고르세요'}
            sub={file ? `${fileSize(file.size)} · 다른 파일을 고르려면 누르세요` : editing ? `지금 파일: ${cur!.fileName}` : '.md · .txt · .docx · 1MB 이하'} onPick={take} />
          {file && file.text ? <pre className="mdview" aria-label="파일 앞부분">{file.text.split(/\r?\n/).slice(0, 10).join('\n')}</pre> : null}
          {secret ? <p className="fwarn">API 키나 비밀번호로 보이는 줄이 있어요. 올리기 전에 지워 주세요.</p> : null}
        </Field>
        <Field id="hub-sk-name" k="name" label="이름" req={true} errors={errors}><input id="hub-sk-name" maxLength={24} placeholder="예: 출처 달기" value={f.title} onChange={e => set('title', e.target.value)} {...inv(errors, 'name')} /></Field>
        <Field id="hub-sk-desc" k="desc" label="한 줄 소개" req={true} errors={errors}><input id="hub-sk-desc" maxLength={40} placeholder="예: 답변 끝에 근거 문서와 위치를 표시" value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'desc')} /></Field>
        <fieldset className={'field' + (errors.tools ? ' bad' : '')} data-f="tools" style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
          <legend>활용 도구<Req /></legend><Checks name="hub-sk-tool" items={SKILL_TOOLS} value={f.tools} onChange={v => set('tools', v)} /><span className="err">{errors.tools}</span>
        </fieldset>
        <div className="row2">
          <Field id="hub-sk-kind" label="종류"><select id="hub-sk-kind" value={f.kind} onChange={e => set('kind', e.target.value)}><option value="">선택 (선택 사항)</option>{SKILL_KINDS.map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field id="hub-sk-scope" label="사용 범위"><select id="hub-sk-scope" value={f.scope} onChange={e => set('scope', e.target.value)}><option value="">선택 (선택 사항)</option>{SCOPES.map(x => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field id="hub-sk-area" label="업무 분야"><select id="hub-sk-area" value={f.area} onChange={e => set('area', e.target.value)}><option value="">선택 (선택 사항)</option>{SKILL_AREAS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field id="hub-sk-when" k="purpose" label="이럴 때 써요" hint="여러 개는 Enter로 줄을 바꿔 한 줄에 하나씩 적어 주세요" req={true} errors={errors}><textarea id="hub-sk-when" rows={4} placeholder={'예: 규정 답변에 근거를 꼭 보여줘야 할 때\n고객사 미팅 자료를 준비할 때'} value={f.purpose} onChange={e => set('purpose', e.target.value)} {...inv(errors, 'purpose')} /></Field>
        <Field id="hub-sk-usage" k="usage" label="활용 방법" req={true} hint="상세 화면의 '제작자는 이렇게 썼어요'에 보여요" errors={errors}><textarea id="hub-sk-usage" placeholder="예: 지침 맨 아래에 붙여 두면 어떤 Agent든 같은 규칙으로 답해요. 처음에는 Cowork 대화에 파일만 첨부해서 확인해 보세요." value={f.usage} onChange={e => set('usage', e.target.value)} {...inv(errors, 'usage')} /></Field>
        <div className="row2">
          <Field id="hub-sk-ver" k="version" label="버전" hint={editing ? `지금 ${cur!.version}` : undefined} errors={errors}><input id="hub-sk-ver" placeholder="1.0" value={f.version} onChange={e => set('version', e.target.value)} {...inv(errors, 'version')} /></Field>
          <Field id="hub-sk-chg" k="changeNote" label="변경 내용" hint={editing ? '버전을 올리면 꼭 적어 주세요' : undefined} errors={errors}><input id="hub-sk-chg" maxLength={120} placeholder={editing ? '예: 오래된 문서 표시 규칙 추가' : '처음 공유'} value={f.changeNote} onChange={e => set('changeNote', e.target.value)} {...inv(errors, 'changeNote')} /></Field>
        </div>
        <UploadError f={failure} />
        <Act busy={busy} label={editing ? '저장' : '올리기'} onCancel={props.onCancel} errors={errors} />
      </form>
      <aside className="sticky-side"><p className="note" style={{ marginTop: 0 }}>고객사 실명, 개인정보, 비밀번호·키는 파일에 넣지 마세요.</p>
        {editing ? <p className="note">새 파일을 올리면 이전 파일은 바뀌고, 버전과 변경 내용은 업데이트 기록에 남아요. 수정과 버전 관리는 올린 사람이 해요.</p> : null}</aside>
    </div>
  );
}

/* ================= HTML 올리기 · 새 버전 (모달 본문) ================= */
export function HtmlForm(props: { tool?: IHtmlTool; existingTitles: string[]; libName: string; onCancel: () => void; onSubmit: (h: INewHtml) => Promise<void> }): JSX.Element {
  const cur = props.tool;
  const editing = !!cur;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({
    title: cur ? cur.title : '', summary: cur ? cur.summary : '', does: cur ? cur.does.join('\n') : '', makerNote: cur ? cur.makerNote : '',
    madeWith: cur ? (cur.tools[0] || 'Claude') : 'Claude', scope: cur ? (cur.scopes[0] || '사내 업무용') : '사내 업무용', workType: cur ? cur.workType : '', area: cur ? (cur.areas[0] || '') : '', output: cur ? cur.output : '',
    version: cur ? nextVersion(cur.version) : '0.1', changeNote: cur ? '' : '처음 공유'
  });
  const [file, setFile] = React.useState<{ name: string; text: string; size: number } | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<IUploadFailure | undefined>(undefined);
  const take = (fl: File): void => {
    if (!/\.html?$/i.test(fl.name)) { setFile(undefined); setErrors(e => ({ ...e, file: '.html 파일만 올릴 수 있어요.' })); return; }
    if (fl.size > HTML_MAX_BYTES) { setFile(undefined); setErrors(e => ({ ...e, file: '2MB 이하 파일만 올릴 수 있어요.' })); return; }
    readAs(fl, 'text').then(r => {
      const m = /<title>([^<]{1,40})<\/title>/i.exec(String(r));
      setFile({ name: fl.name, text: String(r), size: fl.size });
      setErrors(e => { const n = { ...e }; delete n.file; return n; });
      if (!f.title && m) { set('title', m[1].trim().slice(0, 24)); }
    }, () => setErrors(e => ({ ...e, file: '파일을 읽지 못했어요.' })));
  };
  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    if (errors.file) { e.file = errors.file; } else if (!editing && !file) { e.file = 'HTML 파일을 올려 주세요.'; }
    const t = f.title.trim();
    if (!t) { e.name = '이름을 적어 주세요.'; } else if (props.existingTitles.indexOf(t) >= 0 && (!cur || cur.title !== t)) { e.name = '같은 이름의 HTML이 이미 있어요.'; }
    if (!f.summary.trim()) { e.desc = '한 줄 소개를 적어 주세요.'; }
    if (!splitLines(f.does).length) { e.does = '이 도구가 하는 일을 한 줄 이상 적어 주세요.'; }
    if (!f.workType) { e.workType = '종류를 골라 주세요.'; }
    if (!f.output.trim()) { e.output = '결과물을 적어 주세요.'; }
    if (!f.area) { e.area = '업무 분야를 골라 주세요.'; }
    if (!f.scope) { e.scope = '사용 범위를 골라 주세요.'; }
    if (!f.makerNote.trim()) { e.makerNote = '어떻게 썼는지 적어 주세요.'; }
    const v = f.version.trim();
    if (!isVersion(v)) { e.version = '버전은 0.1처럼 숫자와 점으로 적어 주세요.'; }
    else if (cur && file && compareVersion(v, cur.version) <= 0) { e.version = `파일을 바꾸면 버전을 올려 주세요. 지금 버전은 ${cur.version}이에요.`; }
    if (cur && compareVersion(v, cur.version) !== 0 && !f.changeNote.trim()) { e.changeNote = '무엇이 바뀌었는지 적어 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    setFailure(undefined);
    try {
      await props.onSubmit({
        title: t, summary: f.summary.trim(), does: splitLines(f.does), makerNote: f.makerNote.trim(), madeWith: f.madeWith, scope: f.scope,
        workType: f.workType, area: f.area, output: f.output.trim(), version: v, changeNote: f.changeNote.trim() || (cur ? cur.changeNote : ''),
        file: file ? { name: file.name, text: file.text } : undefined
      });
    } catch (err) {
      setFailure(uploadFailure(err, props.libName, HTML_COLS));
    }
    setBusy(false);
  };
  return (
    <div className="fgrid">
      <form ref={ref} noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
        <Field k="file" label={editing ? '새 파일로 바꾸기 (선택)' : 'HTML 파일'} req={!editing} errors={errors}>
          <Drop id="hub-ht-file" accept=".html,.htm" has={!!file} title={file ? file.name : '파일을 끌어다 놓거나 눌러서 고르세요'}
            sub={file ? `${fileSize(file.size)} · 다른 파일을 고르려면 누르세요` : editing ? `지금 파일: ${cur!.fileName}` : '.html · 2MB 이하 · 파일 하나로 동작하는 도구'} onPick={take} />
        </Field>
        <div className="row2">
          <Field id="hub-ht-name" k="name" label="이름" req={true} errors={errors}><input id="hub-ht-name" maxLength={24} placeholder="예: 견적 계산기" value={f.title} onChange={e => set('title', e.target.value)} {...inv(errors, 'name')} /></Field>
          <Field id="hub-ht-made" label="만든 도구"><select id="hub-ht-made" value={f.madeWith} onChange={e => set('madeWith', e.target.value)}>{MADE_WITH.map(x => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field id="hub-ht-desc" k="desc" label="한 줄 소개" req={true} errors={errors}><input id="hub-ht-desc" maxLength={40} placeholder="예: 품목·수량만 넣으면 표준 단가로 견적표 작성" value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'desc')} /></Field>
        <Field id="hub-ht-does" k="does" label="이런 일을 해요" req={true} hint="한 줄에 하나씩" errors={errors}><textarea id="hub-ht-does" rows={3} value={f.does} onChange={e => set('does', e.target.value)} {...inv(errors, 'does')} /></Field>
        <div className="row2">
          <Field id="hub-ht-type" k="workType" label="종류" req={true} errors={errors}><select id="hub-ht-type" value={f.workType} onChange={e => set('workType', e.target.value)} {...inv(errors, 'workType')}><option value="">선택해 주세요</option>{HTML_KINDS.map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field id="hub-ht-out" k="output" label="결과물" req={true} hint="예: 견적표, 추천 결과, 보고서 초안, 일정표, 차트" errors={errors}><input id="hub-ht-out" maxLength={20} placeholder="이 도구를 쓰면 무엇이 나오나요?" value={f.output} onChange={e => set('output', e.target.value)} {...inv(errors, 'output')} /></Field>
        </div>
        <div className="row2">
          <Field id="hub-ht-area" k="area" label="업무 분야" req={true} errors={errors}><select id="hub-ht-area" value={f.area} onChange={e => set('area', e.target.value)} {...inv(errors, 'area')}><option value="">선택해 주세요</option>{SKILL_AREAS.map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field id="hub-ht-scope" k="scope" label="사용 범위" req={true} errors={errors}><select id="hub-ht-scope" value={f.scope} onChange={e => set('scope', e.target.value)} {...inv(errors, 'scope')}>{SCOPES.map(x => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field id="hub-ht-note" k="makerNote" label="제작자는 이렇게 썼어요" req={true} errors={errors}><textarea id="hub-ht-note" rows={4} placeholder="예: 매주 월요일 고객 견적 요청이 오면 품목만 붙여 넣고 바로 견적표를 만들어 보내요." value={f.makerNote} onChange={e => set('makerNote', e.target.value)} {...inv(errors, 'makerNote')} /></Field>
        <div className="row2">
          <Field id="hub-ht-ver" k="version" label="버전" hint={editing ? `지금 ${cur!.version}` : undefined} errors={errors}><input id="hub-ht-ver" value={f.version} onChange={e => set('version', e.target.value)} {...inv(errors, 'version')} /></Field>
          <Field id="hub-ht-chg" k="changeNote" label="변경 내용" errors={errors}><input id="hub-ht-chg" maxLength={120} value={f.changeNote} onChange={e => set('changeNote', e.target.value)} {...inv(errors, 'changeNote')} /></Field>
        </div>
        <UploadError f={failure} />
        <Act busy={busy} label={editing ? '저장' : '올리기'} onCancel={props.onCancel} errors={errors} />
      </form>
      <aside className="sticky-side"><p className="note" style={{ marginTop: 0 }}>올린 도구는 격리된 창에서 열려 Hub와 SharePoint 정보에 접근할 수 없어요. 외부 서버로 데이터를 보내는 도구는 올리지 마세요.</p></aside>
    </div>
  );
}

/* ================= 사례 올리기 · 고치기 (모달 본문, 시안 casenew) ================= */
const CASE_REQ: [string, string, string][] = [
  ['title', 'hub-cf-title', '사례명을 적어 주세요.'], ['industry', 'hub-cf-ind', '업종을 골라 주세요.'], ['client', 'hub-cf-cli', '고객사를 적어 주세요.'],
  ['dept', 'hub-cf-dept', '조직을 적어 주세요.'], ['period', 'hub-cf-when', '시기를 골라 주세요.'], ['pattern', 'hub-cf-pat', '활용 방식을 골라 주세요.'],
  ['keyValue', 'hub-cf-keyb', '대표 효과 결과를 적어 주세요.'], ['keyNote', 'hub-cf-keyl', '대표 효과 상세를 적어 주세요.'],
  ['beforeText', 'hub-cf-bt', '업무 변화 Before를 적어 주세요.'], ['afterText', 'hub-cf-at', '업무 변화 After를 적어 주세요.'],
  ['beforeSteps', 'hub-cf-pb', 'Before 단계를 적어 주세요.'], ['afterSteps', 'hub-cf-pa', 'After 단계를 적어 주세요.'], ['how', 'hub-cf-how', '측정 방법을 적어 주세요.']];
interface ISolRow { kind: SolutionKind; name: string; ins: string; tools: string; data: string; desc: string; body: string; parts: string }
interface IPrmRow { name: string; step: string; text: string }
const solRow = (s?: ISolution): ISolRow => ({ kind: s ? s.kind : 'agent', name: s ? s.name : '', ins: (s && s.ins) || '', tools: ((s && s.tools) || []).join('\n'),
  data: ((s && s.data) || []).join('\n'), desc: (s && s.desc) || '', body: (s && s.body) || '', parts: ((s && s.parts) || []).join('\n') });
const effPair = (c: ICase | undefined, label: string): [string, string] => { const x = c ? c.effects.filter(e => e.label === label)[0] : undefined; return x ? [x.before, x.after] : ['', '']; };
export function CaseForm(props: { now: Date; item?: ICase; onCancel: () => void; onSubmit: (c: INewCase) => Promise<boolean> }): JSX.Element {
  const ref = React.useRef<HTMLFormElement>(null);
  const c = props.item;
  const [f, set, errors, setErrors] = useForm({
    title: c ? c.title : '', industry: c ? c.industry : '', client: c ? c.client : '', dept: c ? c.dept : '', period: c ? c.period : '',
    project: c ? c.summary : '', area: c ? c.area : '', pattern: c ? c.pattern : '', contact: c && c.contactPerson ? c.contactPerson.email : '', keyValue: c ? c.keyValue : '', keyNote: c ? c.keyNote : '',
    beforeText: c ? c.beforeText : '', afterText: c ? c.afterText : '', beforeSteps: c ? c.before.join('\n') : '', afterSteps: c ? c.after.join('\n') : '', how: c ? (c.how || c.verify.join('\n')) : ''
  });
  const [products, setProducts] = React.useState<string[]>(c ? c.products : []);
  const [time, setTime] = React.useState<[string, string]>(effPair(c, '시간'));
  const [quality, setQuality] = React.useState<[string, string]>(effPair(c, '품질 수준'));
  const [effort, setEffort] = React.useState<[string, string]>(effPair(c, '정신적 노력 수준'));
  const [sols, setSols] = React.useState<ISolRow[]>(c ? c.solutions.map(solRow) : []);
  const [prms, setPrms] = React.useState<IPrmRow[]>(c && c.prompts.length ? c.prompts.map(p => ({ name: p.name, step: p.step >= 0 ? String(p.step) : '', text: p.text })) : [{ name: '', step: '', text: '' }]);
  const [busy, setBusy] = React.useState(false);
  const afterSteps = splitLines(f.afterSteps);
  const clearErr = (k: string): void => setErrors(e => { if (!e[k]) { return e; } const n = { ...e }; delete n[k]; return n; });
  const setSol = (i: number, p: Partial<ISolRow>): void => setSols(sols.map((x, k) => k === i ? { ...x, ...p } : x));
  const setPrm = (i: number, p: Partial<IPrmRow>): void => { setPrms(prms.map((x, k) => k === i ? { ...x, ...p } : x)); clearErr('prm'); };
  const filledPrms = prms.filter(p => !!p.text.trim());
  const filledSols = sols.filter(s => !!s.name.trim());
  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    CASE_REQ.forEach(x => { if (!String((f as { [k: string]: string })[x[0]]).trim()) { e[x[0]] = x[2]; } });
    if (!products.length) { e.prod = '활용 제품을 하나 이상 골라 주세요.'; }
    if (!time[0].trim() || !time[1].trim() || !quality[0] || !quality[1] || !effort[0] || !effort[1]) { e.ba = '시간, 품질 수준, 정신적 노력 수준의 Before와 After를 모두 채워 주세요.'; }
    if (!filledPrms.length) { e.prm = '프롬프트를 하나 이상 적어 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    const lines = (v: string): string[] => splitLines(v);
    await props.onSubmit({
      title: f.title.trim(), industry: f.industry, client: f.client.trim(), dept: f.dept.trim(), period: f.period,
      project: f.project.trim(), area: f.area.trim(), pattern: f.pattern, contact: f.contact.trim(), products,
      keyValue: f.keyValue.trim(), keyNote: f.keyNote.trim(), time: [time[0].trim(), time[1].trim()], quality, effort,
      beforeText: f.beforeText.trim(), afterText: f.afterText.trim(), beforeSteps: lines(f.beforeSteps), afterSteps: lines(f.afterSteps), how: f.how.trim(),
      solutions: filledSols.map(s => s.kind === 'agent' ? { kind: s.kind, name: s.name.trim(), ins: s.ins.trim(), tools: lines(s.tools), data: lines(s.data) }
        : s.kind === 'skill' ? { kind: s.kind, name: s.name.trim(), desc: s.desc.trim(), body: s.body.trim() }
          : { kind: s.kind, name: s.name.trim(), desc: s.desc.trim(), parts: lines(s.parts) }),
      prompts: filledPrms.map(p => ({ name: p.name.trim(), step: p.step === '' ? -1 : Number(p.step), text: p.text.trim() }))
    });
    setBusy(false);
  };
  const errList: [string, string, string][] = CASE_REQ.filter(x => !!errors[x[0]])
    .concat(errors.prod ? [['prod', 'hub-cf-prod-0', errors.prod]] : [], errors.ba ? [['ba', 'hub-cf-tb', errors.ba]] : [], errors.prm ? [['prm', 'hub-cf-pp-0', errors.prm]] : []);
  const txt = (k: 'title' | 'client' | 'dept' | 'project' | 'area' | 'contact' | 'keyValue' | 'keyNote', id: string, ph: string, max?: number): JSX.Element =>
    <input id={id} maxLength={max} placeholder={ph} value={f[k]} onChange={e => set(k, e.target.value)} {...inv(errors, k)} />;
  const area = (k: 'beforeText' | 'afterText' | 'beforeSteps' | 'afterSteps' | 'how', id: string, ph: string, rows: number): JSX.Element =>
    <textarea id={id} rows={rows} placeholder={ph} value={f[k]} onChange={e => set(k, e.target.value)} {...inv(errors, k)} />;
  const lvSel = (id: string, v: string, on: (x: string) => void, label?: string): JSX.Element =>
    <select id={id} aria-label={label} value={v} onChange={e => { on(e.target.value); clearErr('ba'); }}><option value="">선택</option>{CASE_LEVELS.map(x => <option key={x}>{x}</option>)}</select>;
  return (
    <div className="fgrid one">
      <form ref={ref} noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
        <div className={'errsum' + (errList.length ? ' on' : '')} role="alert" tabIndex={-1}><h2>입력하지 않은 항목이 있어요</h2>
          <ul>{errList.map(x => <li key={x[0]}><a href={'#' + x[1]} onClick={ev => { ev.preventDefault(); const el = document.getElementById(x[1]); if (el) { el.focus(); } }}>{x[2]}</a></li>)}</ul></div>
        <fieldset className="afs"><legend>기본 정보</legend>
          <Field id="hub-cf-title" k="title" label="사례명" req={true} errors={errors}>{txt('title', 'hub-cf-title', '예: 콜센터 상담 요약', 30)}</Field>
          <div className="row2">
            <Field id="hub-cf-ind" k="industry" label="업종" req={true} errors={errors}><select id="hub-cf-ind" value={f.industry} onChange={e => set('industry', e.target.value)} {...inv(errors, 'industry')}><option value="">선택</option>{CASE_INDUSTRIES.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field id="hub-cf-cli" k="client" label="고객사" req={true} errors={errors}>{txt('client', 'hub-cf-cli', '예: B사', 20)}</Field>
          </div>
          <div className="row2">
            <Field id="hub-cf-dept" k="dept" label="조직" req={true} errors={errors}>{txt('dept', 'hub-cf-dept', '예: 고객센터', 30)}</Field>
            <Field id="hub-cf-when" k="period" label="시기" req={true} errors={errors}><select id="hub-cf-when" value={f.period} onChange={e => set('period', e.target.value)} {...inv(errors, 'period')}><option value="">선택</option>{periodOptions(props.now).concat(f.period && periodOptions(props.now).indexOf(f.period) < 0 ? [f.period] : []).map(x => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <div className="row2">
            <Field id="hub-cf-proj" label="프로젝트명">{txt('project', 'hub-cf-proj', '예: 콜센터 AI 상담 지원 구축')}</Field>
            <Field id="hub-cf-area" label="업무 영역">{txt('area', 'hub-cf-area', '예: 고객 상담')}</Field>
          </div>
          <div className="row2">
            <Field id="hub-cf-pat" k="pattern" label="활용 방식" req={true} errors={errors}><select id="hub-cf-pat" value={f.pattern} onChange={e => set('pattern', e.target.value)} {...inv(errors, 'pattern')}><option value="">선택</option>{CASE_PATTERNS.concat(f.pattern && CASE_PATTERNS.indexOf(f.pattern) < 0 ? [f.pattern] : []).map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field id="hub-cf-owner" label="문의 담당자" hint="회사 이메일. 비워 두면 올린 사람">{txt('contact', 'hub-cf-owner', '예: name@munilabs.co.kr')}</Field>
          </div>
          <fieldset className={'field' + (errors.prod ? ' bad' : '')} data-f="prod"><legend>활용 제품<Req /></legend>
            <div className="chkrow">{CASE_PRODUCTS.map((p, k) => <label key={p}><input type="checkbox" id={`hub-cf-prod-${k}`} checked={products.indexOf(p) >= 0}
              onChange={() => { setProducts(products.indexOf(p) >= 0 ? products.filter(x => x !== p) : products.concat([p])); clearErr('prod'); }} /> {p}</label>)}</div>
            <span className="err">{errors.prod}</span></fieldset>
        </fieldset>
        <fieldset className="afs"><legend>요약 카드</legend>
          <h3 className="afh">대표 효과</h3>
          <div className="row2">
            <Field id="hub-cf-keyb" k="keyValue" label="결과" req={true} hint="굵게 크게 보여요" errors={errors}>{txt('keyValue', 'hub-cf-keyb', '예: 75% 감소', 12)}</Field>
            <Field id="hub-cf-keyl" k="keyNote" label="상세" req={true} errors={errors}>{txt('keyNote', 'hub-cf-keyl', '예: 상담 후처리 시간', 24)}</Field>
          </div>
          <h3 className="afh">전후 비교</h3>
          <div className={'field' + (errors.ba ? ' bad' : '')} data-f="ba"><div className="bagrid"><span className="bah" /><small>Before</small><span /><small>After</small>
            <label htmlFor="hub-cf-tb">시간<Req /></label><input id="hub-cf-tb" placeholder="예: 3시간" value={time[0]} onChange={e => { setTime([e.target.value, time[1]]); clearErr('ba'); }} /><span className="baarr" aria-hidden="true">→</span>
            <input aria-label="시간 After" placeholder="예: 40분" value={time[1]} onChange={e => { setTime([time[0], e.target.value]); clearErr('ba'); }} />
            <label htmlFor="hub-cf-qb">품질 수준<Req /></label>{lvSel('hub-cf-qb', quality[0], x => setQuality([x, quality[1]]))}<span className="baarr" aria-hidden="true">→</span>{lvSel('hub-cf-qa', quality[1], x => setQuality([quality[0], x]), '품질 수준 After')}
            <label htmlFor="hub-cf-eb">정신적 노력 수준<Req /></label>{lvSel('hub-cf-eb', effort[0], x => setEffort([x, effort[1]]))}<span className="baarr" aria-hidden="true">→</span>{lvSel('hub-cf-ea', effort[1], x => setEffort([effort[0], x]), '정신적 노력 수준 After')}
          </div><span className="err">{errors.ba}</span></div>
        </fieldset>
        <fieldset className="afs"><legend>개선 내용 탭</legend>
          <h3 className="afh">업무 변화</h3>
          <div className="row2">
            <Field id="hub-cf-bt" k="beforeText" label="Before" req={true} errors={errors}>{area('beforeText', 'hub-cf-bt', '예: 상담이 끝난 뒤 메모를 다시 읽으며 요약을 쓰고, 코드표를 검색해 처리 코드를 직접 고르는 방식.', 3)}</Field>
            <Field id="hub-cf-at" k="afterText" label="After" req={true} errors={errors} hint="첫 문장이 사례 목록에 한 줄 설명으로 보여요">{area('afterText', 'hub-cf-at', '예: 통화가 끝나면 요약과 처리 코드가 바로 만들어지고, 상담사는 확인 후 저장만 하는 방식.', 3)}</Field>
          </div>
          <h3 className="afh">업무 프로세스</h3>
          <div className="row2">
            <Field id="hub-cf-pb" k="beforeSteps" label="Before 단계" req={true} hint="한 줄에 한 단계" errors={errors}>{area('beforeSteps', 'hub-cf-pb', '상담 종료\n메모 다시 읽기\n요약 작성\n코드표 검색\n코드 입력', 5)}</Field>
            <Field id="hub-cf-pa" k="afterSteps" label="After 단계" req={true} hint="한 줄에 한 단계" errors={errors}>{area('afterSteps', 'hub-cf-pa', '상담 종료\nAgent가 요약과 코드 추천\n상담사 확인 후 저장', 5)}</Field>
          </div>
          <Field id="hub-cf-how" k="how" label="어떻게 측정했나요" req={true} errors={errors}>{area('how', 'hub-cf-how', '예: 상담 300건의 처리 시간을 도입 전후로 비교하고, 상담사 12명 설문으로 부담 정도를 측정.', 3)}</Field>
        </fieldset>
        <fieldset className="afs"><legend>솔루션 탭<span className="opt">선택</span></legend>
          <div>{sols.map((s, i) => (
            <div key={i} className="solcard" data-t={s.kind}>
              <div className="solhd"><label className="sr" htmlFor={`hub-cf-st-${i}`}>솔루션 종류</label>
                <select id={`hub-cf-st-${i}`} value={s.kind} onChange={e => setSol(i, { kind: e.target.value as SolutionKind })}>{SOLUTION_KINDS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}</select>
                <label className="sr" htmlFor={`hub-cf-sn-${i}`}>솔루션 이름</label><input id={`hub-cf-sn-${i}`} placeholder="예: 상담 요약 Agent" value={s.name} onChange={e => setSol(i, { name: e.target.value })} />
                <button type="button" className="soldel" aria-label="솔루션 지우기" onClick={() => setSols(sols.filter((_, k) => k !== i))}>✕</button></div>
              <div className="solbd">
                {s.kind === 'agent' ? <>
                  <div className="field"><label htmlFor={`hub-cf-sa-${i}`}>지침</label><textarea id={`hub-cf-sa-${i}`} rows={4} placeholder="Agent 지침을 그대로 붙여 넣어 주세요" value={s.ins} onChange={e => setSol(i, { ins: e.target.value })} /></div>
                  <div className="row2"><div className="field"><label htmlFor={`hub-cf-sb-${i}`}>도구</label><textarea id={`hub-cf-sb-${i}`} rows={3} placeholder={'SharePoint 파일 읽기\nWord 문서 만들기'} value={s.tools} onChange={e => setSol(i, { tools: e.target.value })} /></div>
                    <div className="field"><label htmlFor={`hub-cf-sc-${i}`}>사용 데이터</label><textarea id={`hub-cf-sc-${i}`} rows={3} placeholder={'품질 검사 결과 (SharePoint 폴더)\n주간 보고서 양식 (Word)'} value={s.data} onChange={e => setSol(i, { data: e.target.value })} /></div></div>
                </> : <>
                  <div className="field"><label htmlFor={`hub-cf-sd-${i}`}>설명</label><input id={`hub-cf-sd-${i}`} placeholder="언제 쓰는 산출물인지 한 줄로" value={s.desc} onChange={e => setSol(i, { desc: e.target.value })} /></div>
                  {s.kind === 'skill'
                    ? <div className="field"><label htmlFor={`hub-cf-se-${i}`}>본문</label><textarea id={`hub-cf-se-${i}`} rows={5} placeholder="Skill 파일 내용을 그대로 붙여 넣어 주세요" value={s.body} onChange={e => setSol(i, { body: e.target.value })} /></div>
                    : <div className="field"><label htmlFor={`hub-cf-sf-${i}`}>화면 구성</label><textarea id={`hub-cf-sf-${i}`} rows={3} placeholder={'일별 매출 추이 차트\n매장 순위 표'} value={s.parts} onChange={e => setSol(i, { parts: e.target.value })} /></div>}
                </>}
              </div>
            </div>
          ))}</div>
          <button type="button" id="mv-addSol" className="btn sm addSol" onClick={() => setSols(sols.concat([solRow()]))}>＋ 솔루션 추가</button>
        </fieldset>
        <fieldset className="afs"><legend>프롬프트 탭</legend>
          <div className={'field' + (errors.prm ? ' bad' : '')} data-f="prm" style={{ marginBottom: 8 }}>
            {prms.map((p, i) => (
              <div key={i} className="prmrow">
                <div className="prmhd"><span className="ucn">USE CASE <b>{i + 1}</b></span><button type="button" className="soldel" aria-label="프롬프트 지우기" onClick={() => { if (prms.length > 1) { setPrms(prms.filter((_, k) => k !== i)); } }}>✕</button></div>
                <div className="row2"><div className="field"><label htmlFor={`hub-cf-pn-${i}`}>이름</label><input id={`hub-cf-pn-${i}`} placeholder="예: 상담 요약과 코드 추천" value={p.name} onChange={e => setPrm(i, { name: e.target.value })} /></div>
                  <div className="field"><label htmlFor={`hub-cf-ps-${i}`}>연결할 After 단계</label><select id={`hub-cf-ps-${i}`} value={p.step} onChange={e => setPrm(i, { step: e.target.value })}><option value="">선택 안 함</option>{afterSteps.map((t, k) => <option key={k} value={String(k)}>{k + 1}. {t}</option>)}</select></div></div>
                <div className="field" style={{ marginBottom: 0 }}><label htmlFor={`hub-cf-pp-${i}`}>프롬프트</label><textarea id={`hub-cf-pp-${i}`} rows={3} placeholder="Copilot에 그대로 붙여 넣을 프롬프트" value={p.text} onChange={e => setPrm(i, { text: e.target.value })} /></div>
              </div>
            ))}
            <span className="err">{errors.prm}</span></div>
          <button type="button" className="btn sm" onClick={() => setPrms(prms.concat([{ name: '', step: '', text: '' }]))}>＋ 프롬프트 추가</button>
        </fieldset>
        <p className="note" style={{ marginTop: 12 }}>고객사 실명, 계약 금액, 개인정보는 적지 마세요.</p>
        <MissingNote errors={errors} />
        <div className="mact"><button className="btn pri" type="submit" disabled={busy}>{busy ? '저장하는 중…' : c ? '저장' : '올리기'}</button><button type="button" className="btn" onClick={props.onCancel}>취소</button></div>
      </form>
    </div>
  );
}

/* ================= 아이디어 고치기 (모달 본문, 시안 ideaedit) ================= */
export function IdeaEditForm(props: { idea: IIdea; onCancel: () => void; onSubmit: (idea: INewIdea) => Promise<boolean> }): JSX.Element {
  const [title, setTitle] = React.useState(props.idea.title);
  const [detail, setDetail] = React.useState(props.idea.detail);
  const [type, setType] = React.useState(props.idea.type || 'Agent');
  const [pain, setPain] = React.useState(props.idea.pain);
  const [freq, setFreq] = React.useState(props.idea.frequency);
  const [mins, setMins] = React.useState(typeof props.idea.minutes === 'number' ? String(props.idea.minutes) : '');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) { setErr('아이디어를 한 줄 적어 주세요.'); (document.getElementById('hub-ie-title') as HTMLElement).focus(); return; }
    setBusy(true);
    await props.onSubmit({ title: title.trim(), type, detail: detail.trim(), pain: pain.trim(), frequency: freq, minutes: mins.trim() ? Number(mins) : undefined });
    setBusy(false);
  };
  return (
    <form id="mv-ieForm" className="ieForm" noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
      <div className={'field' + (err ? ' bad' : '')}><label htmlFor="hub-ie-title">아이디어<Req /></label><input id="hub-ie-title" maxLength={60} value={title} onChange={e => { setTitle(e.target.value); setErr(''); }} aria-invalid={!!err} /><span className="err">{err}</span></div>
      <div className="field"><label htmlFor="hub-ie-desc">자세한 설명</label><textarea id="hub-ie-desc" rows={4} placeholder="어떤 일에서 불편한지, 있으면 무엇이 좋아지는지 적어 주세요." value={detail} onChange={e => setDetail(e.target.value)} /></div>
      <fieldset className="field"><legend>무엇으로 만들면 좋을까요</legend>
        <div className="seg" role="radiogroup" aria-label="유형">{IDEA_TYPES.map(x => <label key={x}><input type="radio" name="hub-ie-kind" value={x} checked={type === x} onChange={() => setType(x)} /> {x}</label>)}</div></fieldset>
      <div className="field"><label htmlFor="hub-ie-pain">지금 겪는 불편</label><textarea id="hub-ie-pain" rows={3} placeholder="지금은 어떻게 하고 있고, 무엇이 번거로운지 적어 주세요." value={pain} onChange={e => setPain(e.target.value)} /></div>
      <div className="field"><label htmlFor="hub-ie-freq">얼마나 자주 하나요</label>
        <select id="hub-ie-freq" value={freq} onChange={e => setFreq(e.target.value)}><option value="">고르지 않음</option>{IDEA_FREQS.map(x => <option key={x}>{x}</option>)}</select></div>
      <div className="field"><label htmlFor="hub-ie-min">한 번에 걸리는 시간(분)</label><input id="hub-ie-min" type="number" min={0} step={1} inputMode="numeric" value={mins} onChange={e => setMins(e.target.value.replace(/[^\d]/g, ''))} /></div>
      <div className="mact"><button className="btn pri" type="submit" disabled={busy}>{busy ? '저장하는 중…' : '수정 저장'}</button><button type="button" className="btn" onClick={props.onCancel}>취소</button></div>
    </form>
  );
}

/* ================= 오류 신고 (메일) ================= */
export function ReportForm(props: { target: IReportTarget; adminEmail: string; reporter: string; onCancel: () => void; onSent: () => void }): JSX.Element {
  const t = props.target;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({ kind: '', what: '', ask: '', when: '' });
  const to = t.owner && isEmail(t.owner.email) ? t.owner.email : '';
  const cc = props.adminEmail.split(/[;,\s]+/).filter(isEmail).join(';');
  const submit = (ev: React.FormEvent): void => {
    ev.preventDefault();
    const e: Errors = {};
    if (!f.kind) { e.kind = '문제 종류를 골라 주세요.'; }
    if (!f.what.trim()) { e.what = '내용을 적어 주세요.'; }
    if (!to && !cc) { e.what = '받는 사람 메일 주소가 없어요. 웹 파트 설정에 Hub 관리자 메일을 넣어 주세요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    // 메일 앱(mailto)은 글자만 넘길 수 있어서, 접수 메일처럼 구역을 나눈 텍스트 서식으로 씁니다
    const now = new Date();
    const p2 = (n: number): string => (n < 10 ? '0' : '') + n;
    const stamp = `${now.getFullYear()}-${p2(now.getMonth() + 1)}-${p2(now.getDate())} ${p2(now.getHours())}:${p2(now.getMinutes())}`;
    const ticket = `R-${now.getFullYear()}${p2(now.getMonth() + 1)}${p2(now.getDate())}-${p2(now.getHours())}${p2(now.getMinutes())}`;
    const view = t.type === 'Agent' ? 'agent' : t.type === 'Skill' ? 'skill' : 'htool';
    const link = t.id ? `${window.location.origin}${window.location.pathname}#${view}-${t.id}` : '';
    const line = '────────────────────────────';
    const indent = (s: string): string => s.split(/\r?\n/).map(x => '   ' + x).join('\n');
    const subject = `[MUNIVERSE 오류 신고] ${t.type} '${t.title}' · ${f.kind} (${ticket})`;
    const body = [
      `${t.owner ? t.owner.name + '님' : '담당자님'}, 안녕하세요.`,
      `MUNIVERSE에서 '${t.title}' ${t.type}에 대한 오류 신고가 접수되었어요.`,
      `확인 후 조치 결과를 회신해 주세요.`,
      '',
      line,
      '■ 신고 정보',
      line,
      `· 접수 번호: ${ticket}`,
      `· 대상: ${t.type} · ${t.title}`,
      `· 문제 종류: ${f.kind}`,
      `· 발생 시각: ${f.when ? f.when.replace('T', ' ') : '모름'}`,
      `· 신고 시각: ${stamp}`,
      `· 신고한 사람: ${props.reporter}`,
      '',
      line,
      '■ 무슨 일이 있었나요?',
      line,
      indent(f.what.trim()),
      ...(f.ask.trim() ? ['', '■ 이렇게 물어봤어요', indent(`"${f.ask.trim()}"`)] : []),
      '',
      line,
      '■ 확인해 주세요',
      line,
      ...(link ? [`· 바로 가기: ${link}`] : []),
      '· 화면 캡처: 이 메일에 첨부해 주세요 (보내기 전에 첨부)',
      '',
      '이 메일은 MUNIVERSE 오류 신고 화면에서 작성되었어요.'
    ].join('\n');
    window.location.href = `mailto:${encodeURIComponent(to || cc)}?${to && cc ? `cc=${encodeURIComponent(cc)}&` : ''}subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    props.onSent();
  };
  return (
    <form ref={ref} noValidate={true} style={{ marginTop: 18 }} onSubmit={submit}>
      <fieldset className={'field' + (errors.kind ? ' bad' : '')} data-f="kind" style={{ border: 0, padding: 0, margin: '0 0 20px' }}>
        <legend>어떤 문제인가요?<Req /></legend>
        <div className="chkrow">{REPORT_KINDS.map((x, k) => <label key={x}><input type="radio" name="hub-rp-kind" id={`hub-rp-kind-${k}`} value={x} checked={f.kind === x} onChange={() => set('kind', x)} /> {x}</label>)}</div>
        <span className="err">{errors.kind}</span>
      </fieldset>
      <Field id="hub-rp-what" k="what" label="무슨 일이 있었나요?" req={true} errors={errors}><textarea id="hub-rp-what" placeholder="예: 할 일 담당자가 다른 사람으로 나와요" value={f.what} onChange={e => set('what', e.target.value)} {...inv(errors, 'what')} /></Field>
      <div className="row2">
        <Field id="hub-rp-ask" label="보낸 질문 (선택)"><input id="hub-rp-ask" placeholder="예: 어제 주간 회의 정리해줘" value={f.ask} onChange={e => set('ask', e.target.value)} /></Field>
        <Field id="hub-rp-when" label="언제 (선택)"><input id="hub-rp-when" type="datetime-local" value={f.when} onChange={e => set('when', e.target.value)} /></Field>
      </div>
      <p className="note" style={{ margin: '0 0 16px' }}>메일 앱이 열리면 화면 캡처를 첨부해 주세요. 개인정보·고객사 실명은 빼 주세요.</p>
      <div className="mact"><button className="btn pri" type="submit">메일로 보내기</button><button type="button" className="btn" onClick={props.onCancel}>취소</button></div>
    </form>
  );
}
