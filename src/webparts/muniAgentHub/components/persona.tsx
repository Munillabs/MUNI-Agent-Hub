/* 사람 이름에 마우스를 올리면 Microsoft 365 프로필 카드(Live Persona Card)를 띄웁니다.
   SharePoint·Teams가 쓰는 카드를 그대로 불러오므로, 직함·상태·일정·파일은 Microsoft 365가 채워 줍니다.
   카드를 불러오지 못하면(공식 문서가 없는 내부 구성 요소라 바뀔 수 있음) 이름만 그대로 보여 줍니다. */
import * as React from 'react';
import { SPComponentLoader } from '@microsoft/sp-loader';
import { ServiceScope } from '@microsoft/sp-core-library';
import { IPerson } from '../models/types';

/* eslint-disable @typescript-eslint/no-explicit-any */
const LIVE_PERSONA_ID = '914330ee-2df2-4f6e-a858-30c23a812408';
let scope: ServiceScope | undefined;
let loaded: React.ComponentType<any> | undefined;
let loading: Promise<React.ComponentType<any> | undefined> | undefined;

/** 웹 파트가 시작할 때 한 번 부릅니다 */
export function initPersonaCard(s: ServiceScope): void { scope = s; }

function loadCard(): Promise<React.ComponentType<any> | undefined> {
  if (!loading) {
    loading = SPComponentLoader.loadComponentById<any>(LIVE_PERSONA_ID)
      .then(lib => { loaded = lib && lib.LivePersonaCard ? lib.LivePersonaCard : undefined; return loaded; }, () => undefined);
  }
  return loading;
}

const noop = (): void => undefined;

/** 이름(또는 children)을 보여 주고, 이메일이 있으면 마우스를 올렸을 때 프로필 카드를 띄웁니다 */
export function Person(props: { p?: IPerson; fallback?: string; className?: string; children?: React.ReactNode }): JSX.Element {
  const p = props.p;
  const email = p && p.email ? p.email : '';
  const [Card, setCard] = React.useState<React.ComponentType<any> | undefined>(() => loaded);
  React.useEffect(() => {
    if (Card || !email || !scope) { return undefined; }
    let alive = true;
    loadCard().then(c => { if (alive && c) { setCard(() => c); } }, noop);
    return () => { alive = false; };
  }, [email]);

  const label = props.children !== undefined ? props.children : (p ? p.name : (props.fallback || '—'));
  if (!email) { return <span className={props.className}>{label}</span>; }
  const inner = <span className={'pcard' + (props.className ? ' ' + props.className : '')}>{label}</span>;
  if (!Card || !scope) { return inner; }
  // 카드는 이름을 <div>로 감싸서 줄이 바뀌므로, 글 사이에 그대로 들어가도록 한 번 더 감쌉니다 (.pcwrap)
  return <span className="pcwrap">{React.createElement(Card, {
    serviceScope: scope,
    upn: email,
    legacyUpn: email,
    clientScenario: 'PeopleWebPart',
    hostAppPersonaInfo: { PersonaType: 'User' },
    disableHover: false,
    onCardOpen: noop,
    onCardClose: noop
  }, inner)}</span>;
}
