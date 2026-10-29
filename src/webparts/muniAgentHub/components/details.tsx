/* 상세 패널: Agent 상세(후기 포함), 인사이트 사례 상세 */
import * as React from 'react';
import { IAgent, IIdea, IInsight, ReactionKind } from '../models/types';
import { agentCode, first, initials, mmdd, monthlyHours } from '../models/rules';
import { IHubApi } from './api';
import { AddButton } from './views';
import { IconLike, IconUp, LevelBadge, PanelHead, RiskBadge, StatusPill, Tile } from './ui';

function Person(props: { name: string; note: string }): JSX.Element {
  return <span className="pp"><span className="av">{initials(props.name)}</span>{props.name} · {props.note}</span>;
}

export function AgentDetail(props: {
  api: IHubApi;
  agent: IAgent;
  onClose: () => void;
  onFeedback: (agentId: number, kind: ReactionKind, body: string) => Promise<boolean>;
}): JSX.Element {
  const { api, agent: a } = props;
  const [text, setText] = React.useState('');
  const [kind, setKind] = React.useState<ReactionKind>('후기');
  const [busy, setBusy] = React.useState(false);
  const idea = a.sourceIdeaId ? first(api.data.ideas, i => i.id === a.sourceIdeaId) : undefined;
  const fb = api.data.reactions
    .filter(r => r.targetType === 'Agent' && r.targetId === a.id && r.kind !== '좋아요')
    .sort((x, y) => (y.created || '').localeCompare(x.created || ''));
  const liked = api.liked('Agent', a.id);

  const submit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const t = text.trim();
    if (!t) { api.toast('후기 내용을 입력해 주세요.', 'error'); return; }
    setBusy(true);
    const ok = await props.onFeedback(a.id, kind, t);
    setBusy(false);
    if (ok) { setText(''); setKind('후기'); }
  };

  return (
    <>
      <PanelHead id="hub-p-title" title={a.title} onClose={props.onClose}
        icon={<Tile category={a.category} type={a.type} large={true} />}
        badges={<><LevelBadge level={a.shareLevel} /><RiskBadge risk={a.risk} /></>}
        sub={<><span className="aid">{agentCode(a.id)}</span> · {a.category} · {a.type}{a.reviewedOn ? ` · 최종 검토 ${mmdd(a.reviewedOn)}` : ''}</>} />
      <div className="pb">
        <p className="lead">{a.description || a.summary}</p>
        <dl className="kv">
          <dt>사용 데이터</dt><dd>{a.dataSources || '—'}</dd>
          <dt>외부 연결</dt><dd className={a.external.length ? 'hl' : ''}>{a.external.length ? a.external.join(', ') : '없음'}</dd>
          <dt>담당자</dt>
          <dd><div className="ppl">
            {a.owner ? <Person name={a.owner.name} note={a.ownerTeam || '담당'} /> : '—'}          </div></dd>
          {idea ? <><dt>시작한 아이디어</dt><dd><button type="button" className="lnk" onClick={() => api.go('ideas')}>{idea.title}</button> ({idea.team})</dd></> : null}
        </dl>
        <div className="pbtns">
          <AddButton agent={a} />
          <button type="button" className="btn" aria-pressed={liked} onClick={() => api.toggleLike('Agent', a.id)}><IconLike /> 좋아요 <span className="num">{api.likeCount('Agent', a.id)}</span></button>
          <button type="button" className="btn" onClick={() => api.copyAgentLink(a.id)}>링크 복사</button>
        </div>
        {a.shareLevel === '직원 공유'
          ? <p className="info">직원 공유 Agent는 담당자가 공유한 사람만 추가할 수 있습니다. 추가가 안 되면 담당자{a.owner ? `(${a.owner.name})` : ''}에게 공유를 부탁하세요.</p> : null}
        <p className="warn">Agent가 참조하는 원본 문서에 권한이 없으면 그 내용은 답변에 나오지 않습니다. 문제가 있으면 담당자에게 알려 주세요.</p>
        <div className="fb">
          <h4>후기 {fb.length}</h4>
          <div className="rvs">
            {fb.length ? fb.map(f => (
              <div key={f.id} className="rv"><span className="k">{f.kind}</span>{f.body}<small>{f.author ? f.author.name : '나'} · {mmdd(f.created)}</small></div>
            )) : <p className="pfoot plain">아직 후기가 없습니다. 첫 후기를 남겨 주세요.</p>}
          </div>
          <form className="fbform" onSubmit={submit}>
            <textarea id="hub-fb-text" maxLength={500} value={text} onChange={e => setText(e.target.value)} placeholder="사용 후기나 개선 요청을 남겨 주세요 (500자)" aria-label="후기 내용" />
            <div className="r">
              <span>
                <label><input type="radio" name="hub-fb-kind" checked={kind === '후기'} onChange={() => setKind('후기')} />후기</label>
                <label><input type="radio" name="hub-fb-kind" checked={kind === '개선 요청'} onChange={() => setKind('개선 요청')} />개선 요청</label>
              </span>
              <button type="submit" className="btn sm" disabled={busy}>{busy ? '남기는 중…' : '후기 남기기'}</button>
            </div>
          </form>
        </div>
        <p className="pfoot">Hub에는 검토를 통과해 '게시'된 Agent만 보입니다.</p>
      </div>
    </>
  );
}

export function IdeaDetail(props: { api: IHubApi; idea: IIdea; onClose: () => void }): JSX.Element {
  const { api, idea: i } = props;
  const agent = i.linkedAgentId ? first(api.data.agents, x => x.id === i.linkedAgentId) : undefined;
  const hrs = monthlyHours(i.frequency, i.minutes);
  const mine = !!(i.author && i.author.id === api.me.id);
  const liked = api.liked('Idea', i.id);
  return (
    <>
      <PanelHead id="hub-p-title" title={i.title} onClose={props.onClose}
        badges={<><StatusPill status={i.status} />{mine ? <span className="badge b-idea">내 아이디어</span> : null}</>}
        sub={`${i.team}${i.category ? ' · ' + i.category : ''} · ${mmdd(i.created)}`} />
      <div className="pb">
        <div className="blk"><h4>Agent가 해 줬으면 하는 일</h4><p>{i.summary}</p></div>
        <div className="blk"><h4>지금 겪는 불편</h4><p>{i.pain || '—'}</p></div>
        <dl className="kv">
          <dt>빈도</dt><dd>{i.frequency || '—'}</dd>
          <dt>1회 소요 시간</dt><dd>{i.minutes ? `${i.minutes}분` : '—'}</dd>
          <dt>제안 팀</dt><dd>{i.team || '—'}</dd>
        </dl>
        {hrs !== undefined ? <div className="blk good"><h4>이 업무에 드는 시간</h4><p>한 사람 기준 월 약 {hrs}시간</p></div> : null}
        <div className="pbtns">
          <button type="button" className="btn" aria-pressed={liked} onClick={() => api.toggleLike('Idea', i.id)}><IconUp /> 좋아요 <span className="num">{api.likeCount('Idea', i.id)}</span></button>
          {agent ? <button type="button" className="btn pr" onClick={() => api.openAgent(agent.id)}>만들어진 Agent 보기</button> : null}
        </div>
        <p className="pfoot">좋아요가 많은 아이디어와 업무 시간이 큰 아이디어를 월 1회 검토해 제작 담당을 정합니다.</p>
      </div>
    </>
  );
}

export function InsightDetail(props: { insight: IInsight; onClose: () => void }): JSX.Element {
  const s = props.insight;
  return (
    <>
      <PanelHead id="hub-p-title" title={s.title} onClose={props.onClose}
        badges={<><span className={'ind i-' + s.industry}>{s.industry}</span>{s.pending ? <span className="st s-rv">게시 검토 중</span> : null}</>}
        sub={`고객사 · ${s.customerType} · ${s.area} · ${s.team} · ${mmdd(s.created)}`} />
      <div className="pb">
        <div className="tags">{s.tools.map(t => <span key={t}>{t}</span>)}</div>
        <div className="blk"><h4>문제</h4><p>{s.problem}</p></div>
        <div className="blk"><h4>해결 방식</h4><p>{s.solution}</p></div>
        <div className="blk good"><h4>성과</h4><p>{s.outcome}</p></div>
        {s.lessons ? <div className="blk"><h4>배운 점</h4><p>{s.lessons}</p></div> : null}
        {s.project ? <p className="sub">프로젝트 · {s.project}</p> : null}
        {s.detailUrl ? <div className="pbtns"><a className="btn" href={s.detailUrl} target="_blank" rel="noopener noreferrer">상세 자료 보기</a></div> : null}
        <p className="pfoot">고객사명과 고객 데이터는 게시하지 않습니다. 문제가 있으면 운영 담당자에게 알려 주세요.</p>
      </div>
    </>
  );
}
