/* 입력 화면 (시안 마크업): Skill 올리기, HTML 올리기, 사례 올리기, 오류 신고 */
import * as React from 'react';
import { IAgent, IAgentEdit, ICase, IHtmlTool, IIdea, IImage, INewCase, INewHtml, INewIdea, INewShot, INewSkill, IReportTarget, ISkill, ISolution, SolutionKind } from '../models/types';
import {
  CASE_INDUSTRIES, CASE_USES, HTML_KINDS, HTML_MAX_BYTES, IDEA_CATS, IDEA_CAT_DESC, IDEA_FREQS, IDEA_SCRAP, MADE_WITH, REPORT_KINDS, SCOPES, SKILL_AREAS, SKILL_EXTS, SKILL_KINDS, SKILL_MAX_BYTES,
  RUN_CHAT_WHEN, RUN_MODES, SKILL_TOOLS, SOLUTION_KINDS,
  compareVersion, extOf, fileSize, first, isEmail, isVersion, looksLikeSecret, nextVersion, periodOptions,
  splitLines
} from '../models/rules';

import { AgentThumbSvg } from './mv';
import { HTML_THUMB_EXAMPLE } from './thumbExample';

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
/** 썸네일 맞추기가 끝나지 않았으면 오류 문구 (올리기를 눌러도 그냥 올라가지 않게) */
function cropPending(root: HTMLElement | null): string {
  return root && root.querySelector('.tcrop') ? '썸네일 맞추기를 먼저 끝내 주세요. 아래 \'다음: 프로필 맞추기\' → \'적용\'을 누르거나, 취소해 주세요.' : '';
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
function readAs(fl: Blob, how: 'text' | 'buffer'): Promise<string | ArrayBuffer> {
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
/* ---------- 파일 끌어다 놓기 ----------
   한 폼에 놓는 칸이 여러 개(HTML 파일 · 썸네일 · 결과 이미지)라도 창 전체 리스너는 하나만 둡니다.
   예전에는 칸마다 리스너를 달아, 마지막 칸이 '여기 아님(dropEffect none)'으로 덮어써서 다른 칸에 놓아도 브라우저가 거절했어요. */
interface IDropZone { el: () => HTMLElement | null; setOver: (b: boolean) => void; pick: (f: File) => void }
const dropZones: IDropZone[] = [];
let dropOn: IDropZone | undefined;
const isFileDrag = (e: DragEvent): boolean => !!e.dataTransfer && Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') >= 0;
/** 마우스 아래에 있는 칸 (없으면 undefined) */
function zoneAt(e: DragEvent): IDropZone | undefined {
  for (const z of dropZones) {
    const el = z.el();
    if (!el) { continue; }
    const r = el.getBoundingClientRect();
    if (r.width && e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom) { return z; }
  }
  return undefined;
}
function markOver(z: IDropZone | undefined): void {
  if (dropOn === z) { return; }
  if (dropOn) { dropOn.setOver(false); }
  dropOn = z;
  if (z) { z.setOver(true); }
}
function onDropOver(e: DragEvent): void {
  if (!isFileDrag(e)) { return; }
  // 칸 밖이어도 기본 동작(브라우저가 파일 열기)은 막고, 놓을 수 있는지만 표시합니다
  e.preventDefault();
  const z = zoneAt(e);
  // 칸 위에서는 이벤트를 여기서 멈춥니다. 그러지 않으면 뒤에 오는 SharePoint 페이지의 끌기 처리기가
  // '놓을 수 없음(🚫)'으로 다시 바꿔서, 칸이 강조돼도 놓을 수 없었어요
  if (z) { e.stopPropagation(); }
  if (e.dataTransfer) { e.dataTransfer.dropEffect = z ? 'copy' : 'none'; }
  markOver(z);
}
function onDropLeave(e: DragEvent): void {
  // 창 밖으로 나가면(relatedTarget 없음) 표시를 끕니다
  if (isFileDrag(e) && !e.relatedTarget) { markOver(undefined); }
}
function onDropDrop(e: DragEvent): void {
  if (!isFileDrag(e)) { return; }
  e.preventDefault();
  const z = zoneAt(e);
  markOver(undefined);
  const f = z && e.dataTransfer && e.dataTransfer.files ? e.dataTransfer.files[0] : undefined;
  if (z && f) { e.stopPropagation(); z.pick(f); }
}
function addDropZone(z: IDropZone): () => void {
  if (!dropZones.length) {
    window.addEventListener('dragenter', onDropOver, true);
    window.addEventListener('dragover', onDropOver, true);
    window.addEventListener('dragleave', onDropLeave, true);
    window.addEventListener('drop', onDropDrop, true);
  }
  dropZones.push(z);
  return () => {
    const k = dropZones.indexOf(z);
    if (k >= 0) { dropZones.splice(k, 1); }
    if (dropOn === z) { dropOn = undefined; }
    if (!dropZones.length) {
      window.removeEventListener('dragenter', onDropOver, true);
      window.removeEventListener('dragover', onDropOver, true);
      window.removeEventListener('dragleave', onDropLeave, true);
      window.removeEventListener('drop', onDropDrop, true);
    }
  };
}
function Drop(props: { id: string; accept: string; has: boolean; title: React.ReactNode; sub: React.ReactNode; onPick: (f: File) => void; children?: React.ReactNode }): JSX.Element {
  const [over, setOver] = React.useState(false);
  const ref = React.useRef<HTMLLabelElement>(null);
  const pick = React.useRef(props.onPick);
  pick.current = props.onPick;
  React.useEffect(() => addDropZone({ el: () => ref.current, setOver, pick: f => pick.current(f) }), []);
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

/** 제작 중 아이디어 연결 칸: 고르면 올린 뒤 그 아이디어가 '완성'이 되고 결과물로 이어집니다
    (내가 함께 만드는 제작 중 아이디어 전부. 앞에 [종류]를 붙이고, 올리는 것과 같은 종류를 위에) */
function IdeaLinkField(props: { id: string; kind: 'Skill' | 'HTML'; ideas: IIdea[]; value: string; onChange: (v: string) => void }): JSX.Element | null {
  const list = props.ideas.slice();
  // 연결할 아이디어가 없어도 칸은 보여 주고, 왜 비었는지 알려 줍니다
  if (!list.length) {
    return (
      <Field id={props.id} label="이 아이디어로 만들었어요" hint="Idea Board에서 '함께해요'를 누르고 '만들기 시작하기'를 한 아이디어가 여기에 나와요">
        <select id={props.id} value="" disabled={true}><option value="">연결할 제작 중 아이디어가 없어요</option></select>
      </Field>
    );
  }
  return (
    <Field id={props.id} label="이 아이디어로 만들었어요" hint={`고르면 올릴 때 Idea Board의 아이디어가 '완성'으로 바뀌고, 이 ${props.kind}이 결과물로 연결돼요`}>
      <select id={props.id} value={props.value} onChange={e => props.onChange(e.target.value)}>
        <option value="">연결하지 않음</option>
        {list.map(i => <option key={i.id} value={String(i.id)}>[{i.category || '카테고리 없음'}] {i.title}</option>)}
      </select>
    </Field>
  );
}

/* ---------- 썸네일 이미지 (선택): Marketplace 카드에 보이는 그림, 첨부 파일 thumb.<ext> ---------- */
const THUMB_EXTS = ['png', 'jpg', 'jpeg', 'gif', 'webp'];
const THUMB_MAX_BYTES = 2 * 1024 * 1024;
/** icon: 썸네일과 함께 고른 상세 화면 프로필 (정사각형, 첨부 파일 icon.*) */
interface IThumbState { file?: { ext: string; data: ArrayBuffer; url: string; name: string; size: number }; icon?: { ext: string; data: ArrayBuffer; url: string; name: string; size: number }; drop: boolean }
function useThumb(): [IThumbState, React.Dispatch<React.SetStateAction<IThumbState>>] {
  const [t, setT] = React.useState<IThumbState>({ drop: false });
  // 미리보기 주소 정리
  React.useEffect(() => () => { if (t.file) { URL.revokeObjectURL(t.file.url); } if (t.icon) { URL.revokeObjectURL(t.icon.url); } }, [t.file, t.icon]);
  return [t, setT];
}
/* ---------- 썸네일 자르기 (카톡 프로필처럼: 비율 고르기 → 상자를 끌어 위치 · 크기 맞추기 → 적용) ---------- */
type CropRect = { x: number; y: number; w: number; h: number };
type CropMode = 'move' | 'nw' | 'ne' | 'sw' | 'se';
/** 카드 맞춤 = Marketplace 카드 그림 칸(가로가 긴 16:9) */
const CROP_PRESETS: { k: string; label: string; r?: number }[] = [
  { k: 'card', label: '카드 맞춤', r: 16 / 9 }, { k: 'free', label: '자유롭게' }, { k: 'sq', label: '1:1', r: 1 }, { k: '43', label: '4:3', r: 4 / 3 }, { k: 'all', label: '원본 그대로' }
];
const CROP_MIN = 28;
const CROP_MAX_W = 1600;
function fitRect(W: number, H: number, r?: number): CropRect {
  if (!r) { return { x: 0, y: 0, w: W, h: H }; }
  let w = W, h = W / r;
  if (h > H) { h = H; w = H * r; }
  return { x: (W - w) / 2, y: (H - h) / 2, w, h };
}
const clamp = (n: number, lo: number, hi: number): number => Math.max(lo, Math.min(hi, n));
interface ICropOut { ext: string; data: ArrayBuffer; url: string; name: string; size: number }
/** 자르기 두 단계: ① 카드(썸네일 thumb.*) ② 상세 화면 프로필(정사각형 icon.*) */
const ICON_MAX_W = 600;
function ThumbCropper(props: { file: File; src: string; onCancel: () => void; onDone: (f: { thumb: ICropOut; icon: ICropOut }) => void; onError: (m: string) => void }): JSX.Element {
  const img = React.useRef<HTMLImageElement>(null);
  const [box, setBox] = React.useState<{ W: number; H: number } | undefined>(undefined);
  const [stage, setStage] = React.useState<'card' | 'icon'>('card');
  /** 프로필 단계의 비율 (카드 단계는 카드 맞춤 16:9 하나) */
  const [preset, setPreset] = React.useState('sq');
  const [rect, setRect] = React.useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const [cardRect, setCardRect] = React.useState<CropRect | undefined>(undefined);
  const [busy, setBusy] = React.useState(false);
  const ratioOf = (k: string): number | undefined => (CROP_PRESETS.filter(p => p.k === k)[0] || { r: undefined }).r;
  const isIcon = stage === 'icon';
  const all = isIcon && preset === 'all';
  const ratioNow = isIcon ? ratioOf(preset) : ratioOf('card');
  /** 카드 상자 가운데의 가장 큰 정사각형 (프로필 기본값 · 건너뛰기) */
  const squareIn = (r: CropRect): CropRect => { const s = Math.min(r.w, r.h); return { x: r.x + (r.w - s) / 2, y: r.y + (r.h - s) / 2, w: s, h: s }; };
  const full = (b: { W: number; H: number }): CropRect => ({ x: 0, y: 0, w: b.W, h: b.H });
  const measure = (): void => {
    const im = img.current;
    if (!im || !im.clientWidth) { return; }
    const b = { W: im.clientWidth, H: im.clientHeight };
    // 창 크기가 바뀌면 이미 고른 상자도 같은 비율로 옮깁니다
    if (box && box.W !== b.W) {
      const k = b.W / box.W, sc = (r: CropRect): CropRect => ({ x: r.x * k, y: r.y * k, w: r.w * k, h: r.h * k });
      setRect(sc(rect)); if (cardRect) { setCardRect(sc(cardRect)); }
    } else if (!box) {
      setRect(fitRect(b.W, b.H, ratioOf('card')));
    }
    setBox(b);
  };
  const measureRef = React.useRef(measure);
  measureRef.current = measure;
  React.useEffect(() => {
    const on = (): void => measureRef.current();
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  // 상자 끌기: 누른 순간의 값으로 계산하고, 손을 떼면 끝
  const start = (mode: CropMode) => (e: React.PointerEvent): void => {
    if (!box || all) { return; }
    e.preventDefault(); e.stopPropagation();
    const { W, H } = box, r0 = rect, sx = e.clientX, sy = e.clientY, ratio = ratioNow;
    const move = (ev: PointerEvent): void => {
      const dx = ev.clientX - sx, dy = ev.clientY - sy;
      if (mode === 'move') { setRect({ ...r0, x: clamp(r0.x + dx, 0, W - r0.w), y: clamp(r0.y + dy, 0, H - r0.h) }); return; }
      const left = mode === 'nw' || mode === 'sw', top = mode === 'nw' || mode === 'ne';
      // 반대쪽 모서리는 그대로 두고 크기를 바꿉니다
      const ax = left ? r0.x + r0.w : r0.x, ay = top ? r0.y + r0.h : r0.y;
      const px = clamp((left ? r0.x : r0.x + r0.w) + dx, 0, W), py = clamp((top ? r0.y : r0.y + r0.h) + dy, 0, H);
      const maxW = left ? ax : W - ax, maxH = top ? ay : H - ay;
      let w = clamp(Math.abs(px - ax), CROP_MIN, maxW), h = clamp(Math.abs(py - ay), CROP_MIN, maxH);
      if (ratio) {
        if (w / h > ratio) { w = h * ratio; } else { h = w / ratio; }
        if (w > maxW) { w = maxW; h = w / ratio; }
        if (h > maxH) { h = maxH; w = h * ratio; }
      }
      setRect({ x: left ? ax - w : ax, y: top ? ay - h : ay, w, h });
    };
    const end = (): void => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', end); window.removeEventListener('pointercancel', end); };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', end);
    window.addEventListener('pointercancel', end);
  };
  // 키보드: 방향키로 옮기기, Shift+방향키로 크기
  const key = (e: React.KeyboardEvent): void => {
    if (!box || all) { return; }
    const d = e.altKey ? 1 : 8, ratio = ratioNow;
    const dx = e.key === 'ArrowLeft' ? -d : e.key === 'ArrowRight' ? d : 0, dy = e.key === 'ArrowUp' ? -d : e.key === 'ArrowDown' ? d : 0;
    if (!dx && !dy) { return; }
    e.preventDefault();
    if (!e.shiftKey) { setRect(r => ({ ...r, x: clamp(r.x + dx, 0, box.W - r.w), y: clamp(r.y + dy, 0, box.H - r.h) })); return; }
    setRect(r => {
      let w = clamp(r.w + (dx || dy), CROP_MIN, box.W - r.x), h = ratio ? w / ratio : clamp(r.h + dy, CROP_MIN, box.H - r.y);
      if (ratio && r.y + h > box.H) { h = box.H - r.y; w = h * ratio; }
      if (!ratio) { w = clamp(r.w + dx, CROP_MIN, box.W - r.x); }
      return { ...r, w, h };
    });
  };
  const srcExt = extOf(props.file.name);
  /** 화면 좌표의 상자를 원본 해상도로 잘라 이미지 파일로 */
  const render = (r: CropRect, maxW: number, base: string): Promise<ICropOut> => new Promise((resolve, reject) => {
    const im = img.current;
    if (!im || !box) { reject(new Error('이미지를 아직 읽는 중이에요.')); return; }
    const s = im.naturalWidth / box.W;
    const sw = r.w * s, sh = r.h * s, k = Math.min(1, maxW / sw);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(sw * k)); c.height = Math.max(1, Math.round(sh * k));
    const g = c.getContext('2d');
    if (!g) { reject(new Error('이 브라우저에서는 자르기를 할 수 없어요.')); return; }
    const png = srcExt === 'png';
    if (!png) { g.fillStyle = '#fff'; g.fillRect(0, 0, c.width, c.height); }
    g.drawImage(im, r.x * s, r.y * s, sw, sh, 0, 0, c.width, c.height);
    const out = (type: string, ext: string): void => c.toBlob(b => {
      if (!b) { reject(new Error('이미지를 만들지 못했어요. 다시 해 주세요.')); return; }
      if (b.size > THUMB_MAX_BYTES && type === 'image/png') { out('image/jpeg', 'jpg'); return; }
      if (b.size > THUMB_MAX_BYTES) { reject(new Error('자른 이미지가 2MB를 넘어요. 조금 더 작게 잘라 주세요.')); return; }
      readAs(b, 'buffer').then(d => resolve({ ext, data: d as ArrayBuffer, url: URL.createObjectURL(b), name: `${base}.${ext}`, size: b.size }),
        () => reject(new Error('이미지를 만들지 못했어요. 다시 해 주세요.')));
    }, type, 0.9);
    out(png ? 'image/png' : 'image/jpeg', png ? 'png' : 'jpg');
  });
  /** 카드 썸네일: '원본 그대로'이고 2MB 이하면 원본 파일 그대로 (화질 · 움직임 그대로) */
  const cardOut = (cr: CropRect, wasAll: boolean): Promise<ICropOut> => {
    if (wasAll && props.file.size <= THUMB_MAX_BYTES) {
      return readAs(props.file, 'buffer').then(r => ({ ext: srcExt === 'jpeg' ? 'jpg' : srcExt, data: r as ArrayBuffer, url: URL.createObjectURL(props.file), name: props.file.name, size: props.file.size }));
    }
    return render(cr, CROP_MAX_W, props.file.name.replace(/\.[^.]+$/, ''));
  };
  const next = (): void => {
    if (!box) { return; }
    setCardRect(rect);
    setStage('icon');
    setPreset('sq');
    setRect(squareIn(rect));
  };
  const back = (): void => { if (!cardRect) { return; } setStage('card'); setRect(cardRect); };
  const finish = (iconRect: CropRect): void => {
    if (!cardRect) { return; }
    setBusy(true);
    Promise.all([cardOut(cardRect, false), render(iconRect, ICON_MAX_W, 'icon')])
      .then(([thumb, icon]) => props.onDone({ thumb, icon }), (e: Error) => { setBusy(false); props.onError(e.message); });
  };
  const H4: CropMode[] = ['nw', 'ne', 'sw', 'se'];
  // 단계 단추(다음 · 적용)가 폼 아래 고정 단추(취소 · 올리기)에 가려지지 않게, 이미지를 읽은 뒤와 단계가 바뀔 때 보이는 곳으로 내립니다
  const actRef = React.useRef<HTMLDivElement>(null);
  const ready = !!box;
  React.useEffect(() => {
    if (ready && actRef.current) { actRef.current.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
  }, [ready, stage]);
  return (
    <div className="tcrop" role="group" aria-label="썸네일 자르기">
      <ol className="tcrop-steps" aria-label="단계"><li className={isIcon ? 'done' : 'on'}><b>1</b>카드에 보일 부분</li><li className={isIcon ? 'on' : ''}><b>2</b>프로필에 보일 부분</li></ol>
      <p className="tcrop-h">{isIcon
        ? <><b>상세 화면 프로필에 보일 부분을 맞춰 주세요</b><span>프로필 칸 모양(정사각형)으로 고정돼요. 상자를 끌어 옮기고 모서리로 크기를 바꿔, 글자나 캐릭터처럼 알아보기 쉬운 곳을 골라요.</span></>
        : <><b>Marketplace 카드에 보일 부분을 맞춰 주세요</b><span>상자를 끌어 옮기고, 모서리를 끌어 크기를 바꿔요. 카드에는 상자 안만 보여요.</span></>}</p>
      <div className="tcrop-stage" style={{ touchAction: 'none' }}>
        <img ref={img} src={props.src} alt="" draggable={false} onLoad={measure} />
        {box ? (
          <div className={'tcrop-box' + (all ? ' all' : '')} style={all ? { left: 0, top: 0, width: box.W, height: box.H } : { left: rect.x, top: rect.y, width: rect.w, height: rect.h }}
            tabIndex={all ? -1 : 0} role="slider" aria-label="자를 부분 (방향키로 옮기기, Shift+방향키로 크기)" aria-valuetext={`${Math.round(rect.w)} × ${Math.round(rect.h)}`}
            onPointerDown={start('move')} onKeyDown={key}>
            {all ? null : H4.map(m => <i key={m} className={'tcrop-hd ' + m} onPointerDown={start(m)} aria-hidden="true" />)}
          </div>
        ) : null}
      </div>
      {/* 크기 고정: 카드 단계는 카드 맞춤(16:9), 프로필 단계는 프로필 맞춤(1:1) */}
      <div className="tcrop-opts" role="radiogroup" aria-label="자르는 비율">
        {(isIcon ? [{ k: 'sq', label: '프로필 맞춤', r: 1 }] : CROP_PRESETS.filter(p => p.k === 'card')).map(p => (
          <button key={p.k} type="button" role="radio" aria-checked={true} className="on">
            <span className="tcrop-ic" aria-hidden="true" style={p.r ? { width: p.r >= 1 ? 22 : 22 * p.r, height: p.r >= 1 ? 22 / p.r : 22 } : undefined} data-k={p.k} />{p.label}
          </button>
        ))}
      </div>
      {isIcon ? (
        <div className="tcrop-act" ref={actRef}><button type="button" className="btn sm tcrop-skip" disabled={busy} onClick={() => { if (cardRect) { finish(squareIn(cardRect)); } }}>건너뛰기 (카드 가운데로)</button>
          <button type="button" className="btn sm" onClick={back} disabled={busy}>이전</button><button type="button" className="btn sm pri" onClick={() => finish(all && box ? full(box) : rect)} disabled={busy || !box}>{busy ? '만드는 중…' : '적용'}</button></div>
      ) : (
        <div className="tcrop-act" ref={actRef}><button type="button" className="btn sm" onClick={props.onCancel} disabled={busy}>취소</button><button type="button" className="btn sm pri" onClick={next} disabled={busy || !box}>다음: 프로필 맞추기</button></div>
      )}
    </div>
  );
}

/** fallback: 아직 고른 썸네일이 없을 때 대신 보여 줄 그림 (Agent는 카드의 기본 그림, HTML은 예시 그림). fallbackLabel: 그 그림 위 표시 */
function ThumbField(props: { id: string; current?: string; currentIcon?: string; fallback?: React.ReactNode; fallbackLabel?: string; value: IThumbState; onChange: (v: IThumbState) => void; errors: Errors; setErrors: React.Dispatch<React.SetStateAction<Errors>>; ratio: string }): JSX.Element {
  const v = props.value;
  const bad = (m: string): void => props.setErrors(e => ({ ...e, thumb: m }));
  // 자르는 중인 원본, 마지막으로 고른 원본 (다시 자르기용)
  const [crop, setCrop] = React.useState<{ file: File; src: string } | undefined>(undefined);
  const orig = React.useRef<File | undefined>(undefined);
  React.useEffect(() => () => { if (crop) { URL.revokeObjectURL(crop.src); } }, [crop]);
  const openCrop = (fl: File): void => setCrop({ file: fl, src: URL.createObjectURL(fl) });
  const take = (fl: File): void => {
    const ext = extOf(fl.name);
    if (THUMB_EXTS.indexOf(ext) < 0) { bad('.png · .jpg · .gif · .webp 이미지만 올릴 수 있어요.'); return; }
    // 원본은 커도 돼요. 자른 뒤 2MB 이하가 되면 됩니다
    if (fl.size > 15 * 1024 * 1024) { bad('15MB 이하 이미지만 고를 수 있어요.'); return; }
    props.setErrors(e => { const n = { ...e }; delete n.thumb; return n; });
    orig.current = fl;
    openCrop(fl);
  };
  const shown = v.file ? v.file.url : (!v.drop && props.current) || '';
  // 새로 고르면 새 프로필, 아니면 지금 프로필
  const iconShown = v.file ? (v.icon ? v.icon.url : '') : (!v.drop && (props.currentIcon || '')) || '';
  return (
    <Field k="thumb" label="썸네일 이미지 (선택)" hint={crop ? undefined : `Marketplace 카드와 상세 화면 프로필에 보여요. 가로가 긴 이미지(${props.ratio})가 잘 맞아요. 고르면 카드에 보일 부분과 프로필(정사각형)에 보일 부분을 차례로 맞춰요. 없으면 기본 그림이 나와요.`} errors={props.errors}>
      {crop ? <ThumbCropper file={crop.file} src={crop.src} onCancel={() => setCrop(undefined)} onError={bad}
        onDone={f => { props.setErrors(e => { const n = { ...e }; delete n.thumb; return n; }); props.onChange({ file: f.thumb, icon: f.icon, drop: false }); setCrop(undefined); }} /> : <>
      <div className="thumbpick">
        {shown ? <div className="thumbpair">
          <div className="thumbprev" style={{ backgroundImage: `url("${shown}")` }} role="img" aria-label="카드 썸네일 미리보기" />
          {iconShown ? <div className="iconprev" style={{ backgroundImage: `url("${iconShown}")` }} role="img" aria-label="프로필 미리보기" title="상세 화면 프로필" /> : null}
        </div>
          : props.fallback ? <div className="thumbprev" style={{ overflow: 'hidden', position: 'relative' }} role="img" aria-label={props.fallbackLabel || '기본 그림'}>{props.fallback}
            <span style={{ position: 'absolute', left: 6, bottom: 6, fontSize: 11, fontWeight: 700, background: 'rgba(255,255,255,.92)', color: '#40506a', borderRadius: 999, padding: '2px 8px', boxShadow: '0 0 0 1px rgba(0,0,0,.06)' }}>{props.fallbackLabel || '기본 그림'}</span></div> : null}
        <Drop id={props.id} accept=".png,.jpg,.jpeg,.gif,.webp" has={!!v.file} title={v.file ? v.file.name : shown ? '다른 이미지로 바꾸려면 누르세요' : '이미지를 끌어다 놓거나 눌러서 고르세요'}
          sub={v.file ? `${fileSize(v.file.size)} · 다른 이미지를 고르려면 누르세요` : '.png · .jpg · .gif · .webp · 2MB 이하'} onPick={take} />
      </div>
      {shown ? <div className="thumbbtns">
        {v.file && orig.current ? <button type="button" className="btn sm" onClick={() => { if (orig.current) { openCrop(orig.current); } }}>보여 줄 부분 다시 맞추기</button> : null}
        <button type="button" className="btn sm thumbdel" onClick={() => props.onChange({ drop: !!props.current })}>썸네일 빼기</button></div> : null}
      </>}
    </Field>
  );
}
function thumbOut(t: IThumbState): { thumb?: { ext: string; data: ArrayBuffer }; dropThumb?: boolean; icon?: { ext: string; data: ArrayBuffer }; dropIcon?: boolean } {
  // 썸네일을 새로 고르면 프로필도 함께 바꾸고, 썸네일을 빼면 프로필도 함께 뺍니다
  if (t.file) { return { thumb: { ext: t.file.ext, data: t.file.data }, ...(t.icon ? { icon: { ext: t.icon.ext, data: t.icon.data } } : { dropIcon: true }) }; }
  return t.drop ? { dropThumb: true, dropIcon: true } : {};
}

/* ---------- '제작자는 이렇게 썼어요' 이미지 (선택, 최대 2장): 첨부 파일 result1.<ext> · result2.<ext> ---------- */
const SHOT_MAX_BYTES = 3 * 1024 * 1024;
const SHOT_SLOTS = [1, 2];
function useShots(): [IThumbState[], (slot: number, v: IThumbState) => void] {
  const [s, setS] = React.useState<IThumbState[]>([{ drop: false }, { drop: false }]);
  // 미리보기 주소 정리
  const urls = s.map(x => x.file ? x.file.url : '').join('|');
  React.useEffect(() => () => { s.forEach(x => { if (x.file) { URL.revokeObjectURL(x.file.url); } }); }, [urls]);
  return [s, (slot, v) => setS(all => all.map((x, i) => i === slot - 1 ? v : x))];
}
function ShotsField(props: { id: string; current?: IImage[]; value: IThumbState[]; onChange: (slot: number, v: IThumbState) => void; errors: Errors; setErrors: React.Dispatch<React.SetStateAction<Errors>> }): JSX.Element {
  const bad = (m: string): void => props.setErrors(e => ({ ...e, shots: m }));
  const take = (slot: number, fl: File): void => {
    const ext = extOf(fl.name);
    if (THUMB_EXTS.indexOf(ext) < 0) { bad('.png · .jpg · .gif · .webp 이미지만 올릴 수 있어요.'); return; }
    if (fl.size > SHOT_MAX_BYTES) { bad('3MB 이하 이미지만 올릴 수 있어요.'); return; }
    readAs(fl, 'buffer').then(r => {
      props.setErrors(e => { const n = { ...e }; delete n.shots; return n; });
      props.onChange(slot, { file: { ext: ext === 'jpeg' ? 'jpg' : ext, data: r as ArrayBuffer, url: URL.createObjectURL(fl), name: fl.name, size: fl.size }, drop: false });
    }, () => bad('이미지를 읽지 못했어요. 다시 골라 주세요.'));
  };
  return (
    <Field k="shots" label="결과 이미지 (선택, 최대 2장)" hint="상세 화면의 '제작자는 이렇게 썼어요' 아래에 나란히 보여요. 이미지 전체가 칸 크기에 맞춰 들어가요. 넣지 않으면 이미지 칸이 보이지 않아요." errors={props.errors}>
      <div className="shotpick">
        {SHOT_SLOTS.map(slot => {
          const v = props.value[slot - 1];
          const cur = first(props.current || [], x => x.slot === slot);
          const shown = v.file ? v.file.url : (!v.drop && cur && cur.url) || '';
          return (
            <div key={slot} className="shotslot">
              {shown ? <div className="thumbprev" style={{ backgroundImage: `url("${shown}")` }} role="img" aria-label={`결과 이미지 ${slot} 미리보기`} /> : null}
              <Drop id={`${props.id}-${slot}`} accept=".png,.jpg,.jpeg,.gif,.webp" has={!!v.file} title={v.file ? v.file.name : shown ? `이미지 ${slot} 바꾸기` : `이미지 ${slot}`}
                sub={v.file ? `${fileSize(v.file.size)} · 다시 고르려면 누르세요` : '끌어다 놓거나 눌러서 고르세요 · 3MB 이하'} onPick={fl => take(slot, fl)} />
              {shown ? <button type="button" className="btn sm thumbdel" onClick={() => props.onChange(slot, { drop: !!cur })}>빼기</button> : null}
            </div>
          );
        })}
      </div>
    </Field>
  );
}
function shotsOut(s: IThumbState[]): { shots?: INewShot[]; dropShots?: number[] } {
  const shots: INewShot[] = [];
  const dropShots: number[] = [];
  s.forEach((x, i) => { if (x.file) { shots.push({ slot: i + 1, ext: x.file.ext, data: x.file.data }); } else if (x.drop) { dropShots.push(i + 1); } });
  return { shots, dropShots };
}

/** onSubmit 은 실패하면 오류를 던집니다. 폼이 받아 버튼 위에 안내를 띄웁니다. ideaId: 함께 완성할 제작 중 아이디어 */
export function SkillForm(props: { skill?: ISkill; existingTitles: string[]; libName: string; ideas: IIdea[]; onCancel: () => void; onSubmit: (s: INewSkill, ideaId?: number) => Promise<void> }): JSX.Element {
  const cur = props.skill;
  const editing = !!cur;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({
    title: cur ? cur.title : '', summary: cur ? cur.summary : '', purpose: cur ? cur.purpose : '', usage: cur ? cur.usage : '',
    tools: cur ? cur.tools : [] as string[], kind: cur ? cur.kind : '', scope: cur ? (cur.scopes[0] || '') : '', area: cur ? (cur.areas[0] || '') : '',
    version: cur ? nextVersion(cur.version) : '1.0', changeNote: cur ? '' : '처음 공유'
  });
  const [file, setFile] = React.useState<{ name: string; text?: string; data?: ArrayBuffer; size: number } | undefined>(undefined);
  const [ideaId, setIdeaId] = React.useState('');
  const [thumb, setThumb] = useThumb();
  const [shots, setShot] = useShots();
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
      // 이름 · 한 줄 소개는 파일에서 자동으로 채우지 않고 사용자가 직접 적습니다
      setFile({ name: fl.name, text, size: fl.size });
    },() => fileErr('파일을 읽지 못했어요. 다시 골라 주세요.'));
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
    if (errors.thumb) { e.thumb = errors.thumb; }
    if (errors.shots) { e.shots = errors.shots; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    setFailure(undefined);
    try {
      await props.onSubmit({
        title: t, summary: f.summary.trim(), purpose: f.purpose.trim(), usage: f.usage.trim(), tools: f.tools, kind: f.kind, scope: f.scope, area: f.area,
        version: v, changeNote: f.changeNote.trim() || (cur ? cur.changeNote : ''), file: file ? { name: file.name, text: file.text, data: file.data } : undefined,
        ...thumbOut(thumb), ...shotsOut(shots)
      }, ideaId ? Number(ideaId) : undefined);
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
        <Field id="hub-sk-area" label="카테고리" hint={f.area ? IDEA_CAT_DESC[f.area] : '하는 일에 가장 가까운 카테고리를 골라 주세요'}><select id="hub-sk-area" value={f.area} onChange={e => set('area', e.target.value)}><option value="">선택 (선택 사항)</option>{SKILL_AREAS.map(x => <option key={x}>{x}</option>)}</select></Field>
        <Field id="hub-sk-when" k="purpose" label="이럴 때 써요" hint="여러 개는 Enter로 줄을 바꿔 한 줄에 하나씩 적어 주세요" req={true} errors={errors}><textarea id="hub-sk-when" rows={4} placeholder={'예: 규정 답변에 근거를 꼭 보여줘야 할 때\n고객사 미팅 자료를 준비할 때'} value={f.purpose} onChange={e => set('purpose', e.target.value)} {...inv(errors, 'purpose')} /></Field>
        <Field id="hub-sk-usage" k="usage" label="활용 방법" req={true} hint="상세 화면의 '제작자는 이렇게 썼어요'에 보여요" errors={errors}><textarea id="hub-sk-usage" placeholder="예: 지침 맨 아래에 붙여 두면 어떤 Agent든 같은 규칙으로 답해요. 처음에는 Cowork 대화에 파일만 첨부해서 확인해 보세요." value={f.usage} onChange={e => set('usage', e.target.value)} {...inv(errors, 'usage')} /></Field>
        <ShotsField id="hub-sk-shot" current={cur ? cur.images : undefined} value={shots} onChange={setShot} errors={errors} setErrors={setErrors} />
        <div className="row2">
          <Field id="hub-sk-ver" k="version" label="버전" hint={editing ? `지금 ${cur!.version}` : undefined} errors={errors}><input id="hub-sk-ver" placeholder="1.0" value={f.version} onChange={e => set('version', e.target.value)} {...inv(errors, 'version')} /></Field>
          <Field id="hub-sk-chg" k="changeNote" label="변경 내용" hint={editing ? '버전을 올리면 꼭 적어 주세요' : undefined} errors={errors}><input id="hub-sk-chg" maxLength={120} placeholder={editing ? '예: 오래된 문서 표시 규칙 추가' : '처음 공유'} value={f.changeNote} onChange={e => set('changeNote', e.target.value)} {...inv(errors, 'changeNote')} /></Field>
        </div>
        <IdeaLinkField id="hub-sk-idea" kind="Skill" ideas={props.ideas} value={ideaId} onChange={setIdeaId} />
        <UploadError f={failure} />
        <Act busy={busy} label={editing ? '저장' : '올리기'} onCancel={props.onCancel} errors={errors} />
      </form>
      <aside className="sticky-side"><p className="note" style={{ marginTop: 0 }}>고객사 실명, 개인정보, 비밀번호·키는 파일에 넣지 마세요.</p>
        {editing ? <p className="note">새 파일을 올리면 이전 파일은 바뀌고, 버전과 변경 내용은 업데이트 기록에 남아요. 수정과 버전 관리는 올린 사람이 해요.</p> : null}</aside>
    </div>
  );
}

/* ================= HTML 올리기 · 새 버전 (모달 본문) ================= */
export function HtmlForm(props: { tool?: IHtmlTool; existingTitles: string[]; libName: string; ideas: IIdea[]; onCancel: () => void; onSubmit: (h: INewHtml, ideaId?: number) => Promise<void> }): JSX.Element {
  const cur = props.tool;
  const editing = !!cur;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({
    title: cur ? cur.title : '', summary: cur ? cur.summary : '', does: cur ? cur.does.join('\n') : '', makerNote: cur ? cur.makerNote : '',
    madeWith: cur ? (cur.tools[0] || 'Claude') : 'Claude', scope: cur ? (cur.scopes[0] || '사내 업무용') : '사내 업무용', workType: cur ? cur.workType : '', area: cur ? (cur.areas[0] || '') : '', output: cur ? cur.output : '',
    version: cur ? nextVersion(cur.version) : '0.1', changeNote: cur ? '' : '처음 공유'
  });
  const [file, setFile] = React.useState<{ name: string; text: string; size: number } | undefined>(undefined);
  const [ideaId, setIdeaId] = React.useState('');
  const [thumb, setThumb] = useThumb();
  const [shots, setShot] = useShots();
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
    if (!f.area) { e.area = '카테고리를 골라 주세요.'; }
    if (!f.scope) { e.scope = '사용 범위를 골라 주세요.'; }
    if (!f.makerNote.trim()) { e.makerNote = '어떻게 썼는지 적어 주세요.'; }
    const v = f.version.trim();
    if (!isVersion(v)) { e.version = '버전은 0.1처럼 숫자와 점으로 적어 주세요.'; }
    else if (cur && file && compareVersion(v, cur.version) <= 0) { e.version = `파일을 바꾸면 버전을 올려 주세요. 지금 버전은 ${cur.version}이에요.`; }
    if (cur && compareVersion(v, cur.version) !== 0 && !f.changeNote.trim()) { e.changeNote = '무엇이 바뀌었는지 적어 주세요.'; }
    if (errors.thumb) { e.thumb = errors.thumb; }
    if (cropPending(ref.current)) { e.thumb = cropPending(ref.current); }
    if (errors.shots) { e.shots = errors.shots; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    setFailure(undefined);
    try {
      await props.onSubmit({
        ...thumbOut(thumb), ...shotsOut(shots),
        title: t, summary: f.summary.trim(), does: splitLines(f.does), makerNote: f.makerNote.trim(), madeWith: f.madeWith, scope: f.scope,
        workType: f.workType, area: f.area, output: f.output.trim(), version: v, changeNote: f.changeNote.trim() || (cur ? cur.changeNote : ''),
        file: file ? { name: file.name, text: file.text } : undefined
      }, ideaId ? Number(ideaId) : undefined);
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
        {/* 아직 썸네일이 없으면, 도구 화면 캡처를 올렸을 때 카드에 어떻게 꽉 차는지 예시 그림을 보여 줍니다 */}
        <ThumbField id="hub-ht-thumb" current={cur && cur.thumb ? cur.thumb.url : undefined} currentIcon={cur && cur.icon ? cur.icon.url : undefined} value={thumb}
          fallback={<div className="htex" style={{ backgroundImage: `url("${HTML_THUMB_EXAMPLE}")` }} />} fallbackLabel="예시 · 이렇게 꽉 차요" onChange={setThumb} errors={errors} setErrors={setErrors} ratio="도구 화면 캡처, 가로 2:1 정도" />
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
          <Field id="hub-ht-area" k="area" label="카테고리" hint={f.area ? IDEA_CAT_DESC[f.area] : '하는 일에 가장 가까운 카테고리를 골라 주세요'} req={true} errors={errors}><select id="hub-ht-area" value={f.area} onChange={e => set('area', e.target.value)} {...inv(errors, 'area')}><option value="">선택해 주세요</option>{SKILL_AREAS.map(x => <option key={x}>{x}</option>)}</select></Field>
          <Field id="hub-ht-scope" k="scope" label="사용 범위" req={true} errors={errors}><select id="hub-ht-scope" value={f.scope} onChange={e => set('scope', e.target.value)} {...inv(errors, 'scope')}>{SCOPES.map(x => <option key={x}>{x}</option>)}</select></Field>
        </div>
        <Field id="hub-ht-note" k="makerNote" label="제작자는 이렇게 썼어요" req={true} errors={errors}><textarea id="hub-ht-note" rows={4} placeholder="예: 매주 월요일 고객 견적 요청이 오면 품목만 붙여 넣고 바로 견적표를 만들어 보내요." value={f.makerNote} onChange={e => set('makerNote', e.target.value)} {...inv(errors, 'makerNote')} /></Field>
        <ShotsField id="hub-ht-shot" current={cur ? cur.images : undefined} value={shots} onChange={setShot} errors={errors} setErrors={setErrors} />
        <div className="row2">
          <Field id="hub-ht-ver" k="version" label="버전" hint={editing ? `지금 ${cur!.version}` : undefined} errors={errors}><input id="hub-ht-ver" value={f.version} onChange={e => set('version', e.target.value)} {...inv(errors, 'version')} /></Field>
          <Field id="hub-ht-chg" k="changeNote" label="변경 내용" errors={errors}><input id="hub-ht-chg" maxLength={120} value={f.changeNote} onChange={e => set('changeNote', e.target.value)} {...inv(errors, 'changeNote')} /></Field>
        </div>
        <IdeaLinkField id="hub-ht-idea" kind="HTML" ideas={props.ideas} value={ideaId} onChange={setIdeaId} />
        <UploadError f={failure} />
        <Act busy={busy} label={editing ? '저장' : '올리기'} onCancel={props.onCancel} errors={errors} />
      </form>
      <aside className="sticky-side"><p className="note" style={{ marginTop: 0 }}>올린 도구는 격리된 창에서 열려 Hub와 SharePoint 정보에 접근할 수 없어요. 외부 서버로 데이터를 보내는 도구는 올리지 마세요.</p></aside>
    </div>
  );
}

/* ================= Agent 소개 고치기 (모달 본문) =================
   Agent는 배포 흐름이 AgentList에 만들고, Hub에서는 Owner가 카드 · 상세에 보이는 소개와 이미지만 고칩니다.
   이름 · 지침 · 구성 정보 · 버전은 배포 흐름이 관리해서 여기서 고치지 않습니다. */
const AGENT_COLS = ['Summary', 'Does', 'Prompts', 'MakerNote', 'Config', 'TargetUsers', 'AIModel', 'RunMode', 'RunSchedule'];
/** "A, B" → ['A', 'B'] */
const commaList = (v: string): string[] => v.split(/\s*,\s*/).map(x => x.trim()).filter(x => !!x);
export function AgentForm(props: { agent: IAgent; libName: string; onCancel: () => void; onSubmit: (e: IAgentEdit) => Promise<void> }): JSX.Element {
  const cur = props.agent;
  const ref = React.useRef<HTMLFormElement>(null);
  const [f, set, errors, setErrors] = useForm({ summary: cur.summary, does: cur.does.join('\n'), prompts: cur.prompts.join('\n'), makerNote: cur.makerNote,
    audience: cur.audience.join(', '), model: cur.model.join(', '), runMode: cur.run[0] || '', runWhen: cur.run[0] && cur.run[0] !== RUN_MODES[0] ? (cur.run[1] || '') : '' });
  const [thumb, setThumb] = useThumb();
  const [shots, setShot] = useShots();
  const [busy, setBusy] = React.useState(false);
  const [failure, setFailure] = React.useState<IUploadFailure | undefined>(undefined);
  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    if (!f.summary.trim()) { e.desc = '한 줄 소개를 적어 주세요.'; }
    if (!splitLines(f.does).length) { e.does = '이 Agent가 하는 일을 한 줄 이상 적어 주세요.'; }
    if (!splitLines(f.prompts).length) { e.prompts = '예시 질문을 한 줄 이상 적어 주세요.'; }
    if (errors.thumb) { e.thumb = errors.thumb; }
    if (cropPending(ref.current)) { e.thumb = cropPending(ref.current); }
    if (errors.shots) { e.shots = errors.shots; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    setFailure(undefined);
    try {
      await props.onSubmit({ summary: f.summary.trim(), does: splitLines(f.does), prompts: splitLines(f.prompts), makerNote: f.makerNote.trim(),
        audience: commaList(f.audience), model: commaList(f.model), // 대화형은 늘 '사용자 요청 시', 자동 실행만 일시를 적어요
        run: f.runMode ? (f.runMode === RUN_MODES[0] ? [f.runMode, RUN_CHAT_WHEN] : [f.runMode, f.runWhen.trim()]) : [],
        ...thumbOut(thumb), ...shotsOut(shots) });
    } catch (err) {
      setFailure(uploadFailure(err, props.libName, AGENT_COLS));
    }
    setBusy(false);
  };
  return (
    <div className="fgrid">
      <form ref={ref} noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
        {/* 썸네일을 첨부하지 않은 Agent는 카드에 이름으로 그린 기본 그림이 보여서, 그 그림을 같이 보여 줍니다 */}
        <ThumbField id="hub-ag-thumb" current={cur.thumb ? cur.thumb.url : undefined} currentIcon={cur.icon ? cur.icon.url : undefined} fallback={<AgentThumbSvg name={cur.title} seed={cur.id} />} value={thumb} onChange={setThumb} errors={errors} setErrors={setErrors} ratio="2:1 정도" />
        <Field id="hub-ag-desc" k="desc" label="한 줄 소개" req={true} errors={errors}><input id="hub-ag-desc" maxLength={40} value={f.summary} onChange={e => set('summary', e.target.value)} {...inv(errors, 'desc')} /></Field>
        <Field id="hub-ag-does" k="does" label="이런 일을 해요" req={true} hint="한 줄에 하나씩" errors={errors}><textarea id="hub-ag-does" rows={4} value={f.does} onChange={e => set('does', e.target.value)} {...inv(errors, 'does')} /></Field>
        <Field id="hub-ag-pr" k="prompts" label="이렇게 말해 보세요" req={true} hint="예시 질문을 한 줄에 하나씩. 상세 화면에서 복사 버튼과 함께 보여요" errors={errors}><textarea id="hub-ag-pr" rows={4} value={f.prompts} onChange={e => set('prompts', e.target.value)} {...inv(errors, 'prompts')} /></Field>
        <Field id="hub-ag-note" k="makerNote" label="제작자는 이렇게 썼어요" errors={errors}><textarea id="hub-ag-note" rows={4} placeholder="예: 매주 월요일 팀 회의 전에 지난주 메일을 넣고 이슈 목록을 뽑아 봐요." value={f.makerNote} onChange={e => set('makerNote', e.target.value)} /></Field>
        <ShotsField id="hub-ag-shot" current={cur.images} value={shots} onChange={setShot} errors={errors} setErrors={setErrors} />
        {/* 상세 정보 탭 'Agent 구성 정보' 세 칸 */}
        <div className="row2">
          <Field id="hub-ag-who" label="사용 대상" hint="여러 개면 쉼표(,)로 나눠요"><input id="hub-ag-who" maxLength={80} placeholder="예: 프로젝트 팀원, 사내 구성원" value={f.audience} onChange={e => set('audience', e.target.value)} /></Field>
          <Field id="hub-ag-model" label="사용 모델" hint="여러 개면 쉼표(,)로 나눠요"><input id="hub-ag-model" maxLength={60} placeholder="예: GPT-4.1" value={f.model} onChange={e => set('model', e.target.value)} /></Field>
        </div>
        <div className="row2">
          <Field id="hub-ag-run" label="실행 방식"><select id="hub-ag-run" value={f.runMode} onChange={e => set('runMode', e.target.value)}>
            <option value="">고르지 않음</option>
            {RUN_MODES.concat(f.runMode && RUN_MODES.indexOf(f.runMode) < 0 ? [f.runMode] : []).map(m => <option key={m} value={m}>{m}</option>)}
          </select></Field>
          {f.runMode && f.runMode !== RUN_MODES[0]
            ? <Field id="hub-ag-when" label="실행 일시" hint="상세 화면에 '자동 실행 (매일 오전 8시)'처럼 괄호 안에 보여요"><input id="hub-ag-when" maxLength={40} placeholder="예: 매일 오전 8시, 통화 종료 시" value={f.runWhen} onChange={e => set('runWhen', e.target.value)} /></Field>
            : <Field id="hub-ag-when" label="실행 일시" hint={f.runMode ? `'${RUN_MODES[0]} (${RUN_CHAT_WHEN})'로 보여요` : '자동 실행을 고르면 적을 수 있어요'}><input id="hub-ag-when" disabled={true} value={f.runMode ? RUN_CHAT_WHEN : ''} readOnly={true} /></Field>}
        </div>
        <UploadError f={failure} />
        <Act busy={busy} label="저장" onCancel={props.onCancel} errors={errors} />
      </form>
      <aside className="sticky-side"><p className="note" style={{ marginTop: 0 }}>여기서 고친 내용은 Agent 카드와 상세 화면에 바로 보여요.</p>
        <p className="note">사용 대상 · 사용 모델 · 실행 방식은 상세 정보 탭의 'Agent 구성 정보'에 보여요.</p>
        <p className="note">이름 · 지침 · 지식 원본 · 연결 도구 · 버전은 배포 흐름(AgentList)에서 관리해요.</p></aside>
    </div>
  );
}

/* ================= 사례 올리기 · 고치기 (모달 본문): 프로젝트 기본 정보 + 솔루션 (Case Library는 솔루션 한 줄씩 보여요) ================= */
const CASE_REQ: [string, string, string][] = [
  ['title', 'hub-cf-title', '프로젝트 이름을 적어 주세요.'], ['industry', 'hub-cf-ind', '업종을 골라 주세요.'], ['client', 'hub-cf-cli', '고객사를 적어 주세요.'],
  ['dept', 'hub-cf-dept', '조직을 적어 주세요.'], ['period', 'hub-cf-when', '시기를 골라 주세요.']];
interface ISolRow {
  kind: SolutionKind; name: string; does: string; use: string; desc: string; before: string; after: string;
  ins: string; tools: string; data: string; who: string; model: string; runMode: string; runWhen: string; agents: string; skills: string; ex: string;
  body: string; parts: string; file: string;
}
/** 예시 프롬프트 한 줄 = '제목 | 질문' (제목은 빼도 돼요) */
const exText = (ex?: { t: string; q: string }[]): string => (ex || []).map(p => p.t ? `${p.t} | ${p.q}` : p.q).join('\n');
const exParse = (v: string): { t: string; q: string }[] => splitLines(v).map(line => { const i = line.indexOf('|'); return i > 0 ? { t: line.slice(0, i).trim(), q: line.slice(i + 1).trim() } : { t: '', q: line.trim() }; }).filter(p => !!p.q);
const solRow = (s?: ISolution): ISolRow => ({
  kind: s ? s.kind : 'agent', name: s ? s.name : '', does: (s && s.does) || '', use: (s && s.use) || '', desc: (s && s.desc) || '', before: (s && s.before) || '', after: (s && s.after) || '',
  ins: (s && s.ins) || '', tools: ((s && s.tools) || []).join('\n'), data: ((s && s.data) || []).join('\n'), who: ((s && s.who) || []).join(', '), model: ((s && s.model) || []).join(', '),
  runMode: (s && s.run && s.run[0]) || '', runWhen: (s && s.run && s.run[0] !== '대화형' && s.run[1]) || '', agents: ((s && s.agents) || []).join('\n'), skills: ((s && s.skills) || []).join('\n'), ex: exText(s && s.ex),
  body: (s && s.body) || '', parts: ((s && s.parts) || []).join('\n'), file: (s && s.file) || ''
});
const effPair = (c: ICase | undefined, label: string): [string, string] => { const x = c ? c.effects.filter(e => e.label === label)[0] : undefined; return x ? [x.before, x.after] : ['', '']; };
export function CaseForm(props: { now: Date; item?: ICase; onCancel: () => void; onSubmit: (c: INewCase) => Promise<boolean> }): JSX.Element {
  const ref = React.useRef<HTMLFormElement>(null);
  const c = props.item;
  const [f, set, errors, setErrors] = useForm({
    title: c ? c.title : '', industry: c ? c.industry : '', client: c ? c.client : '', dept: c ? c.dept : '', period: c ? c.period : '',
    contact: c && c.contactPerson ? c.contactPerson.email : ''
  });
  const [sols, setSols] = React.useState<ISolRow[]>(c && c.solutions.length ? c.solutions.map(solRow) : [solRow()]);
  /** 솔루션별로 새로 고른 원본 파일 (번호 → 파일) */
  const [files, setFiles] = React.useState<{ [i: number]: { name: string; data: ArrayBuffer; size: number } }>({});
  const [busy, setBusy] = React.useState(false);
  const clearErr = (k: string): void => setErrors(e => { if (!e[k]) { return e; } const n = { ...e }; delete n[k]; return n; });
  const setSol = (i: number, p: Partial<ISolRow>): void => { setSols(sols.map((x, k) => k === i ? { ...x, ...p } : x)); clearErr('sol'); };
  const dropSol = (i: number): void => {
    setSols(sols.filter((_, k) => k !== i));
    // 뒤 솔루션의 새 파일 번호를 하나씩 당깁니다
    const n: { [i: number]: { name: string; data: ArrayBuffer; size: number } } = {};
    Object.keys(files).forEach(k => { const j = Number(k); if (j < i) { n[j] = files[j]; } else if (j > i) { n[j - 1] = files[j]; } });
    setFiles(n);
  };
  const pickFile = (i: number, fl: File): void => {
    if (fl.size > 10 * 1024 * 1024) { setErrors(e => ({ ...e, sol: '원본 파일은 10MB 이하만 올릴 수 있어요.' })); return; }
    readAs(fl, 'buffer').then(r => { setFiles(m => ({ ...m, [i]: { name: fl.name, data: r as ArrayBuffer, size: fl.size } })); setSol(i, { file: fl.name }); },
      () => setErrors(e => ({ ...e, sol: '파일을 읽지 못했어요. 다시 골라 주세요.' })));
  };
  const filledSols = sols.filter(s => !!s.name.trim());
  const submit = async (ev: React.FormEvent): Promise<void> => {
    ev.preventDefault();
    const e: Errors = {};
    CASE_REQ.forEach(x => { if (!String((f as { [k: string]: string })[x[0]]).trim()) { e[x[0]] = x[2]; } });
    // 사례 하나에는 솔루션 하나만 둡니다
    if (!filledSols.length) { e.sol = '솔루션 이름을 적어 주세요.'; }
    else if (sols.length > 1) { e.sol = '사례 하나에는 솔루션을 하나만 둘 수 있어요. 나머지 솔루션은 ✕로 빼고, 필요하면 새 사례로 올려 주세요.'; }
    else if (filledSols.some(s => !s.does.trim())) { e.sol = '솔루션마다 한 줄 설명을 적어 주세요. 목록에 보여요.'; }
    // 같은 이름의 원본 파일은 하나만 첨부할 수 있어요
    const names = filledSols.map(s => s.kind !== 'agent' ? s.file : '').filter(n => !!n);
    if (names.some((n, k) => names.indexOf(n) !== k)) { e.sol = '솔루션마다 원본 파일 이름이 달라야 해요.'; }
    setErrors(e);
    if (Object.keys(e).length) { focusFirstError(ref.current); return; }
    setBusy(true);
    const lines = (v: string): string[] => splitLines(v);
    const addFiles: { name: string; data: ArrayBuffer }[] = [];
    const solutions: ISolution[] = [];
    sols.forEach((s, i) => {
      if (!s.name.trim()) { return; }
      const common = { kind: s.kind, name: s.name.trim(), does: s.does.trim(), use: s.use, desc: s.desc.trim(), before: s.before.trim(), after: s.after.trim() };
      if (s.kind === 'agent') {
        solutions.push({ ...common, ins: s.ins.trim(), tools: lines(s.tools), data: lines(s.data), who: commaList(s.who), model: commaList(s.model),
          run: s.runMode ? (s.runMode === RUN_MODES[0] ? [s.runMode, RUN_CHAT_WHEN] : [s.runMode, s.runWhen.trim()]) : [],
          agents: lines(s.agents), skills: lines(s.skills), ex: exParse(s.ex) });
        return;
      }
      const nf = files[i];
      if (nf && s.file === nf.name) { addFiles.push({ name: nf.name, data: nf.data }); }
      solutions.push(s.kind === 'skill' ? { ...common, body: s.body.trim(), file: s.file || undefined } : { ...common, parts: lines(s.parts), file: s.file || undefined });
    });
    // 예전 사례 형식의 칸(대표 효과 · 전후 비교 · 업무 프로세스 · 프롬프트)은 화면에서 뺐어요. 고칠 때는 저장된 값을 그대로 둡니다
    await props.onSubmit({
      title: f.title.trim(), industry: f.industry, client: f.client.trim(), dept: f.dept.trim(), period: f.period, contact: f.contact.trim(),
      project: c ? c.summary : '', area: c ? c.area : '', pattern: c ? c.pattern : '', products: c ? c.products : [],
      keyValue: c ? c.keyValue : '', keyNote: c ? c.keyNote : '', time: effPair(c, '시간'), quality: effPair(c, '품질 수준'), effort: effPair(c, '정신적 노력 수준'),
      beforeText: c ? c.beforeText : '', afterText: c ? c.afterText : '', beforeSteps: c ? c.before : [], afterSteps: c ? c.after : [], how: c ? c.how : '',
      solutions, prompts: c ? c.prompts : [], addFiles
    });
    setBusy(false);
  };
  const errList: [string, string, string][] = CASE_REQ.filter(x => !!errors[x[0]]).concat(errors.sol ? [['sol', 'hub-cf-sn-0', errors.sol]] : []);
  const txt = (k: 'title' | 'client' | 'dept' | 'contact', id: string, ph: string, max?: number): JSX.Element =>
    <input id={id} maxLength={max} placeholder={ph} value={f[k]} onChange={e => set(k, e.target.value)} {...inv(errors, k)} />;
  /* 고칠 때: 아직 비어 있는 칸을 노랗게 표시하고, 위에 목록으로 모아 보여 줍니다 (누르면 그 칸으로) */
  const gapsOf = (s: ISolRow, i: number): { k: keyof ISolRow; id: string; label: string }[] => {
    const list: { k: keyof ISolRow; id: string; label: string }[] = [
      { k: 'does', id: `hub-cf-sdo-${i}`, label: '한 줄 설명' }, { k: 'use', id: `hub-cf-su-${i}`, label: '활용 방식' }, { k: 'desc', id: `hub-cf-sd-${i}`, label: '개요' },
      { k: 'before', id: `hub-cf-sbf-${i}`, label: '이런 상황에서' }, { k: 'after', id: `hub-cf-saf-${i}`, label: '이런 결과로' }];
    if (s.kind === 'agent') {
      list.push({ k: 'who', id: `hub-cf-sw-${i}`, label: '사용 대상' }, { k: 'model', id: `hub-cf-sm-${i}`, label: '사용 모델' }, { k: 'runMode', id: `hub-cf-sr-${i}`, label: '실행 방식' });
      if (s.runMode && s.runMode !== RUN_MODES[0]) { list.push({ k: 'runWhen', id: `hub-cf-srw-${i}`, label: '실행 일시' }); }
      list.push({ k: 'ins', id: `hub-cf-sa-${i}`, label: '지침' }, { k: 'data', id: `hub-cf-sc-${i}`, label: '지식 원본' }, { k: 'tools', id: `hub-cf-sb-${i}`, label: '연결 도구 및 커넥터' });
    } else if (s.kind === 'skill') { list.push({ k: 'body', id: `hub-cf-se-${i}`, label: '본문' }); }
    else { list.push({ k: 'parts', id: `hub-cf-sf-${i}`, label: '화면 구성' }); }
    return list.filter(g => !String(s[g.k] || '').trim());
  };
  const gaps = c ? sols.map((s, i) => ({ s, i, list: s.name.trim() ? gapsOf(s, i) : [] })).filter(g => g.list.length) : [];
  const nGaps = gaps.reduce((n, g) => n + g.list.length, 0);
  /** 고치는 중이고 이 칸이 비어 있으면 노란 표시 */
  const fe = (i: number, k: keyof ISolRow): string => c && sols[i].name.trim() && !String(sols[i][k] || '').trim() ? ' fempty' : '';
  const jump = (id: string): void => { const el = document.getElementById(id); if (el) { el.scrollIntoView({ block: 'center' }); el.focus(); } };
  const ta = (i: number, k: keyof ISolRow, id: string, label: string, ph: string, rows: number, hint?: string): JSX.Element => (
    <div className={'field' + fe(i, k)}><label htmlFor={id}>{label}</label><textarea id={id} rows={rows} placeholder={ph} value={sols[i][k]} onChange={e => setSol(i, { [k]: e.target.value } as Partial<ISolRow>)} />{hint ? <span className="hint">{hint}</span> : null}</div>
  );
  const one = (i: number, k: keyof ISolRow, id: string, label: string, ph: string, hint?: string): JSX.Element => (
    <div className={'field' + fe(i, k)}><label htmlFor={id}>{label}</label><input id={id} placeholder={ph} value={sols[i][k]} onChange={e => setSol(i, { [k]: e.target.value } as Partial<ISolRow>)} />{hint ? <span className="hint">{hint}</span> : null}</div>
  );
  return (
    <div className="fgrid one">
      <form ref={ref} noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
        <div className={'errsum' + (errList.length ? ' on' : '')} role="alert" tabIndex={-1}><h2>입력하지 않은 항목이 있어요</h2>
          <ul>{errList.map(x => <li key={x[0]}><a href={'#' + x[1]} onClick={ev => { ev.preventDefault(); const el = document.getElementById(x[1]); if (el) { el.focus(); } }}>{x[2]}</a></li>)}</ul></div>
        <fieldset className="afs"><legend>프로젝트 기본 정보</legend>
          <Field id="hub-cf-title" k="title" label="프로젝트 이름" req={true} hint="목록에는 솔루션 이름이 보이고, 프로젝트 이름은 검색에 쓰여요" errors={errors}>{txt('title', 'hub-cf-title', '예: 콜센터 AI 상담 지원 구축', 40)}</Field>
          <div className="row2">
            <Field id="hub-cf-ind" k="industry" label="업종" req={true} errors={errors}><select id="hub-cf-ind" value={f.industry} onChange={e => set('industry', e.target.value)} {...inv(errors, 'industry')}><option value="">선택</option>{CASE_INDUSTRIES.map(x => <option key={x}>{x}</option>)}</select></Field>
            <Field id="hub-cf-cli" k="client" label="고객사" req={true} errors={errors}>{txt('client', 'hub-cf-cli', '예: B사', 20)}</Field>
          </div>
          <div className="row2">
            <Field id="hub-cf-dept" k="dept" label="조직" req={true} errors={errors}>{txt('dept', 'hub-cf-dept', '예: 고객센터', 30)}</Field>
            <Field id="hub-cf-when" k="period" label="시기" req={true} errors={errors}><select id="hub-cf-when" value={f.period} onChange={e => set('period', e.target.value)} {...inv(errors, 'period')}><option value="">선택</option>{periodOptions(props.now).concat(f.period && periodOptions(props.now).indexOf(f.period) < 0 ? [f.period] : []).map(x => <option key={x}>{x}</option>)}</select></Field>
          </div>
          <Field id="hub-cf-owner" label="담당자" hint="회사 이메일. 비워 두면 올린 사람. 상세 화면의 '담당자에게 Teams로 문의하기'로 연결돼요">{txt('contact', 'hub-cf-owner', '예: name@munilabs.co.kr')}</Field>
        </fieldset>
        {nGaps ? <div className="cf-gaps" role="note"><h3>아직 채우지 않은 칸이 {nGaps}개 있어요</h3><p>노랗게 표시한 칸이에요. 누르면 그 칸으로 이동해요. 비워 둔 칸은 상세 화면에 '없음'으로 보이거나 빠져요.</p>
          <ul>{gaps.map(g => <li key={g.i}><b>{g.s.name}</b><span>{g.list.map(x => <button key={x.id} type="button" onClick={() => jump(x.id)}>{x.label}</button>)}</span></li>)}</ul></div> : null}
        <fieldset className={'afs' + (errors.sol ? ' bad' : '')} data-f="sol"><legend>솔루션<Req /></legend>
          <p className="hint" style={{ margin: '0 0 10px' }}>사례 하나에 솔루션 하나만 올려요. 다른 솔루션은 새 사례로 올려 주세요.</p>
          {errors.sol ? <p className="err" style={{ display: 'block', marginTop: 0 }}>{errors.sol}</p> : null}
          <div>{sols.map((s, i) => (
            <div key={i} className="solcard" data-t={s.kind}>
              <div className="solhd"><label className="sr" htmlFor={`hub-cf-st-${i}`}>솔루션 종류</label>
                <select id={`hub-cf-st-${i}`} value={s.kind} onChange={e => setSol(i, { kind: e.target.value as SolutionKind })}>{SOLUTION_KINDS.map(x => <option key={x.k} value={x.k}>{x.label}</option>)}</select>
                <label className="sr" htmlFor={`hub-cf-sn-${i}`}>솔루션 이름</label><input id={`hub-cf-sn-${i}`} placeholder="예: 상담 요약" value={s.name} onChange={e => setSol(i, { name: e.target.value })} />
                {/* 예전에 여러 개 넣은 사례만 빼기 단추가 보여요 */}
                {sols.length > 1 ? <button type="button" className="soldel" aria-label="솔루션 지우기" onClick={() => dropSol(i)}>✕</button> : null}</div>
              <div className="solbd">
                <div className="row2">
                  {one(i, 'does', `hub-cf-sdo-${i}`, '한 줄 설명 (필수)', '예: 통화 종료 직후 상담 내용 요약', '목록과 상세 머리에 보여요')}
                  <div className={'field' + fe(i, 'use')}><label htmlFor={`hub-cf-su-${i}`}>활용 방식</label><select id={`hub-cf-su-${i}`} value={s.use} onChange={e => setSol(i, { use: e.target.value })}><option value="">선택</option>{CASE_USES.concat(s.use && CASE_USES.indexOf(s.use) < 0 ? [s.use] : []).map(x => <option key={x}>{x}</option>)}</select></div>
                </div>
                {ta(i, 'desc', `hub-cf-sd-${i}`, '개요', '어떤 솔루션인지 한두 문장으로', 2)}
                <div className="row2">
                  {ta(i, 'before', `hub-cf-sbf-${i}`, '활용 목적: 이런 상황에서', '예: 통화가 끝난 뒤 메모를 다시 읽으며 상담사가 요약을 직접 작성', 3)}
                  {ta(i, 'after', `hub-cf-saf-${i}`, '활용 목적: 이런 결과로', '예: 통화가 끝나자마자 요약이 채워져, 상담사는 확인 후 바로 다음 상담 응대', 3)}
                </div>
                {s.kind === 'agent' ? <>
                  <h4 className="afh">Agent 구성 정보</h4>
                  <div className="row2">
                    {one(i, 'who', `hub-cf-sw-${i}`, '사용 대상', '예: 고객센터 상담사', '여러 개면 쉼표(,)로 나눠요')}
                    {one(i, 'model', `hub-cf-sm-${i}`, '사용 모델', '예: GPT-4.1', '여러 개면 쉼표(,)로 나눠요')}
                  </div>
                  <div className="row2">
                    <div className={'field' + fe(i, 'runMode')}><label htmlFor={`hub-cf-sr-${i}`}>실행 방식</label><select id={`hub-cf-sr-${i}`} value={s.runMode} onChange={e => setSol(i, { runMode: e.target.value })}><option value="">고르지 않음</option>{RUN_MODES.map(m => <option key={m} value={m}>{m}</option>)}</select>
                      <span className="hint">{s.runMode === RUN_MODES[0] ? `'${RUN_MODES[0]} (${RUN_CHAT_WHEN})'로 보여요` : s.runMode ? '자동 실행은 일시를 함께 적어요' : ''}</span></div>
                    {s.runMode && s.runMode !== RUN_MODES[0] ? one(i, 'runWhen', `hub-cf-srw-${i}`, '실행 일시', '예: 매일 오전 8시, 통화 종료 시') : <div />}
                  </div>
                  {ta(i, 'ins', `hub-cf-sa-${i}`, '지침', 'Agent 지침을 그대로 붙여 넣어 주세요', 4)}
                  <h4 className="afh">연결된 자료와 도구</h4>
                  <div className="row2">
                    {ta(i, 'data', `hub-cf-sc-${i}`, '지식 원본', '품질 검사 결과 (SharePoint 폴더)\n주간 보고서 양식 (Word)', 3, '한 줄에 하나씩')}
                    {ta(i, 'tools', `hub-cf-sb-${i}`, '연결 도구 및 커넥터', 'SharePoint 파일 읽기\nWord 문서 만들기', 3, '한 줄에 하나씩')}
                  </div>
                  <div className="row2">
                    {ta(i, 'agents', `hub-cf-sg-${i}`, '연결 에이전트', '예: 상담 요약', 2, '한 줄에 하나씩. Marketplace에 같은 이름이 있으면 링크돼요')}
                    {ta(i, 'skills', `hub-cf-sk-${i}`, 'Skill', '예: 처리 코드 분류 기준', 2, '한 줄에 하나씩. Marketplace에 같은 이름이 있으면 링크돼요')}
                  </div>
                  {ta(i, 'ex', `hub-cf-sx-${i}`, '예시 프롬프트', '통화 요약 | 방금 끝난 상담 내용을 요약해 줘.\n처리 코드 | 이 상담에 맞는 처리 코드를 추천해 줘.', 3, "한 줄에 하나씩 '제목 | 질문'. 제목은 빼도 돼요")}
                </> : <>
                  {s.kind === 'skill'
                    ? ta(i, 'body', `hub-cf-se-${i}`, '본문', 'Skill 파일 내용을 그대로 붙여 넣어 주세요', 5)
                    : ta(i, 'parts', `hub-cf-sf-${i}`, '화면 구성', '일별 매출 추이 차트\n매장 순위 표', 3, '한 줄에 하나씩')}
                  <div className="field"><span className="flabel">원본 파일 (선택)</span>
                    {s.file ? <div className="cf-file"><b>{s.file}</b>{files[i] && files[i].name === s.file ? <small>{fileSize(files[i].size)} · 저장하면 올라가요</small> : <small>올려 둔 파일</small>}
                      <button type="button" className="btn sm" onClick={() => setSol(i, { file: '' })}>빼기</button></div> : null}
                    <Drop id={`hub-cf-sfile-${i}`} accept={s.kind === 'html' ? '.html,.htm' : '.md,.txt,.docx'} has={!!s.file} title={s.file ? '다른 파일로 바꾸려면 누르세요' : '원본 파일을 끌어다 놓거나 눌러서 고르세요'}
                      sub={`${s.kind === 'html' ? '.html' : '.md · .txt · .docx'} · 10MB 이하. 없으면 상세 화면에 '원본 파일이 없어요'로 보여요`} onPick={fl => pickFile(i, fl)} /></div>
                </>}
              </div>
            </div>
          ))}</div>
        </fieldset>
        <p className="note" style={{ marginTop: 12 }}>고객사 실명, 계약 금액, 개인정보는 적지 마세요.</p>
        <MissingNote errors={errors} />
        <div className="mact"><button className="btn pri" type="submit" disabled={busy}>{busy ? '저장하는 중…' : c ? '저장' : '올리기'}</button><button type="button" className="btn" onClick={props.onCancel}>취소</button></div>
      </form>
    </div>
  );
}

/* ================= 아이디어 고치기 (모달 본문, 시안 ideaedit) ================= */
export function IdeaEditForm(props: { idea: IIdea; cats?: string[]; onCancel: () => void; onSubmit: (idea: INewIdea) => Promise<boolean> }): JSX.Element {
  const [title, setTitle] = React.useState(props.idea.title);
  const [detail, setDetail] = React.useState(props.idea.detail);
  const [cat, setCat] = React.useState(props.idea.category);
  const [scrap, setScrap] = React.useState(!!props.idea.source);
  const [link, setLink] = React.useState(/^https?:\/\//i.test(props.idea.source) ? props.idea.source : '');
  const [pain, setPain] = React.useState(props.idea.pain);
  const [freq, setFreq] = React.useState(props.idea.frequency);
  const [mins, setMins] = React.useState(typeof props.idea.minutes === 'number' ? String(props.idea.minutes) : '');
  const [err, setErr] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!title.trim()) { setErr('아이디어를 한 줄 적어 주세요.'); (document.getElementById('hub-ie-title') as HTMLElement).focus(); return; }
    setBusy(true);
    const l = link.trim();
    const source = scrap ? (l ? (/^https?:\/\//i.test(l) ? l : 'https://' + l) : IDEA_SCRAP) : '';
    // 사례에서 온 아이디어는 고쳐도 사례 연결을 그대로 둡니다 (외부 스크랩으로 바꾸면 그 주소가 출처가 됩니다)
    await props.onSubmit({ title: title.trim(), category: cat, source, detail: detail.trim(), pain: pain.trim(), frequency: freq, minutes: mins.trim() ? Number(mins) : undefined, caseRef: props.idea.caseRef });
    setBusy(false);
  };
  return (
    <form id="mv-ieForm" className="ieForm" noValidate={true} onSubmit={e => { submit(e).catch(() => undefined); }}>
      <div className={'field' + (err ? ' bad' : '')}><label htmlFor="hub-ie-title">아이디어<Req /></label><input id="hub-ie-title" maxLength={60} value={title} onChange={e => { setTitle(e.target.value); setErr(''); }} aria-invalid={!!err} /><span className="err">{err}</span></div>
      <div className="field"><label htmlFor="hub-ie-desc">자세한 설명</label><textarea id="hub-ie-desc" rows={4} placeholder="어떤 일에서 불편한지, 있으면 무엇이 좋아지는지 적어 주세요." value={detail} onChange={e => setDetail(e.target.value)} /></div>
      <div className="field"><label htmlFor="hub-ie-cat">카테고리</label>
        <select id="hub-ie-cat" value={cat} onChange={e => setCat(e.target.value)}>{cat ? null : <option value="">카테고리 선택</option>}{(props.cats && props.cats.length ? props.cats : IDEA_CATS).map(x => <option key={x} value={x}>{x}</option>)}</select>
        {cat && IDEA_CAT_DESC[cat] ? <span className="hint ib4-hint">{IDEA_CAT_DESC[cat]}</span> : null}</div>
      <div className="field"><label style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }}><input type="checkbox" checked={scrap} onChange={e => setScrap(e.target.checked)} /> 🔭 외부에서 스크랩했어요</label>
        {scrap ? <input id="hub-ie-link" type="url" inputMode="url" aria-label="원문 링크 (선택)" placeholder="원문 링크 붙여 넣기 (선택)" value={link} onChange={e => setLink(e.target.value)} /> : null}</div>
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
