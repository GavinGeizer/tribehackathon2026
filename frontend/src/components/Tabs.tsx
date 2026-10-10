import { useState } from 'react';
import type { Applicability, Evaluation, EvidenceState, Project } from '../domain/types';
import { Icons } from './icons';
import { Badge, EmptyState } from './ui';
import type { Readiness } from './helpers';

const APPLICABILITY_BADGE: Record<Applicability, { tone: 'teal' | 'grey' | 'amber'; label: string }> = {
  applicable: { tone: 'teal', label: 'Applicable' },
  not_applicable: { tone: 'grey', label: 'Not applicable' },
  undetermined: { tone: 'amber', label: 'Undetermined' },
};

const EVIDENCE_BADGE: Record<EvidenceState, { tone: 'teal' | 'red' | 'amber' | 'grey'; label: string }> = {
  satisfied: { tone: 'teal', label: 'Supported' },
  missing: { tone: 'red', label: 'Missing evidence' },
  incomplete: { tone: 'amber', label: 'Incomplete' },
  conflicting: { tone: 'red', label: 'Conflicting' },
  human_review: { tone: 'grey', label: 'Human review' },
};

export function OverviewTab({
  project, evaluation, readiness, onGoDocuments, onReevaluate,
  onGoRequirements, onInspectRequirement, evaluatedNote,
}: {
  project: Project; evaluation: Evaluation; readiness: Readiness;
  onGoDocuments: () => void; onReevaluate: () => void;
  onGoRequirements: () => void; onInspectRequirement: (id: string) => void;
  evaluatedNote: string;
}) {
  const pct = readiness.total === 0 ? 0 : Math.round((readiness.supported / readiness.total) * 100);
  const gaps = evaluation.results.filter(r => r.applicability === 'applicable' && r.requirement.classification === 'required' && r.requirement.sourceUrl !== '' && (r.evidenceState === 'missing' || r.evidenceState === 'incomplete'));
  const conflicts = evaluation.results.filter(r => r.evidenceState === 'conflicting');
  const questions = evaluation.results.filter(r => r.applicability === 'undetermined');
  const attention = [...gaps, ...conflicts, ...questions];
  return (
    <div className="tab-stack project-overview">
      <section className="card readiness-card" aria-label="Readiness summary">
        <div className="section-heading"><p className="kicker">Application readiness</p><button type="button" className="btn btn-ghost btn-sm" onClick={onReevaluate}><Icons.RefreshCw size={14} aria-hidden /> Re-evaluate</button></div>
        <div className="readiness-measure"><strong>{readiness.supported}<span> / {readiness.total}</span></strong><div><h3>Requirements with evidence</h3><p className="muted small">{readiness.label}</p></div></div>
        <div className="progress" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={readiness.label}><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        <dl className="stat-row">
          <div><dt>Possible gaps</dt><dd>{evaluation.missing}</dd></div>
          <div><dt>Conflicts</dt><dd>{evaluation.conflicts}</dd></div>
          <div><dt>Unknown</dt><dd>{evaluation.unknown}</dd></div>
          <div><dt>Human review</dt><dd>{evaluation.humanReview}</dd></div>
          <div><dt>Confirmed support</dt><dd>{evaluation.supported}</dd></div>
        </dl>
        <div className="readiness-note"><Icons.ShieldCheck size={14} aria-hidden /><p>Evidence availability, not a compliance score. Optional and later-stage items are excluded.</p></div>
      </section>
      <section className="card project-action-list" aria-label="Project next actions">
        <div className="section-heading"><div><h3>Next actions</h3><p className="muted small">Resolve gaps and review open questions.</p></div><button type="button" className="link-btn" onClick={onGoRequirements}>All requirements <Icons.ArrowRight size={14} aria-hidden /></button></div>
        {attention.length ? <ul className="attention-list">{attention.slice(0, 6).map(r => {
          const conflict = r.evidenceState === 'conflicting';
          const unknown = r.applicability === 'undetermined';
          const Icon = unknown ? Icons.HelpCircle : conflict ? Icons.TriangleAlert : Icons.FileText;
          return <li key={r.requirement.id} className="project-action-row"><span className={conflict ? 'action-icon action-conflict' : 'action-icon'}><Icon size={18} aria-hidden /></span><div><p className="action-kind">{unknown ? 'Confirm applicability' : conflict ? 'Conflicting information' : 'Missing evidence'}</p><strong>{r.requirement.title}</strong><p className="muted small">{r.nextAction}</p></div><button type="button" className="action-open" aria-label={`Review ${r.requirement.title}`} onClick={() => onInspectRequirement(r.requirement.id)}><Icons.ArrowRight size={18} aria-hidden /></button></li>;
        })}</ul> : <EmptyState icon={<Icons.CheckCircle2 size={24} />} title={readiness.total ? 'Assessed evidence is in place' : 'Start with your project documents'} body={readiness.total ? 'Check professional-review items in Requirements before preparing your submission.' : 'Upload documents to extract project information and assess available evidence.'} action={<button type="button" className="btn btn-secondary" onClick={onGoDocuments}>Go to documents</button>} />}
        {attention.length > 6 ? <p className="muted small">Showing 6 of {attention.length} next actions. Open Requirements for the full list.</p> : null}
        <p className="evaluation-timestamp">{evaluatedNote}</p>
      </section>
      <p className="workspace-retention"><Icons.Info size={14} aria-hidden /> Saved in this browser. Original uploads are processed and not retained.{project.synthetic ? ' This project uses synthetic example data.' : ''}</p>
    </div>
  );
}

export function RequirementsTab({
  evaluation,
  ruleCount,
  acknowledgements,
  onAcknowledge,
  onInspectDoc,
  onInspectRequirement,
  ackError,
}: {
  evaluation: Evaluation;
  ruleCount: number;
  acknowledgements: Project['acknowledgements'];
  onAcknowledge: (requirementId: string, note: string) => void;
  onInspectDoc: (docId: string) => void;
  onInspectRequirement: (requirementId: string) => void;
  ackError: string | null;
}) {
  const [filter, setFilter] = useState<'all' | 'attention' | 'supported' | 'unknown'>('all');
  const [query, setQuery] = useState('');
  const [noteDrafts, setNoteDrafts] = useState<Record<string, string>>({});
  const [ackFor, setAckFor] = useState<string | null>(null);

  const visible = evaluation.results.filter((r) => {
    if (filter === 'attention' && (r.evidenceState === 'satisfied' || r.applicability !== 'applicable')) return false;
    if (filter === 'supported' && r.evidenceState !== 'satisfied') return false;
    if (filter === 'unknown' && r.applicability !== 'undetermined') return false;
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      const hay = `${r.requirement.title} ${r.requirement.description} ${r.requirement.id}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  return (
    <div className="tab-stack">
      <p className="muted small">
        Rule library: {ruleCount} {ruleCount === 1 ? 'requirement' : 'requirements'} in the
        shared catalog · {evaluation.results.length} assessed against this project.
      </p>
      <div className="req-toolbar card">
        <div className="segmented" role="radiogroup" aria-label="Filter requirements">
          {(
            [
              { v: 'all', label: 'All' },
              { v: 'attention', label: 'Needs attention' },
              { v: 'supported', label: 'Supported' },
              { v: 'unknown', label: 'Unknown' },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={filter === o.v}
              className={filter === o.v ? 'seg-active' : ''}
              onClick={() => setFilter(o.v)}
            >
              {o.label}
            </button>
          ))}
        </div>
        <label className="search">
          <Icons.Search size={16} aria-hidden />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search requirements…"
            aria-label="Search requirements"
          />
        </label>
      </div>

      {ackError ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {ackError}
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Icons.CheckCircle2 size={28} />}
            title="Nothing matches this filter"
            body="Try a different filter or search term. Optional and later-stage items are shown with their classification so the denominator stays honest."
          />
        </div>
      ) : (
        <ul className="req-list">
          {visible.map((r) => {
            const app = APPLICABILITY_BADGE[r.applicability];
            const ev = EVIDENCE_BADGE[r.evidenceState];
            const acked = acknowledgements.some((a) => a.requirementId === r.requirement.id);
            return (
              <li key={r.requirement.id} className="card req-card">
                <div className="req-top">
                  <h4>{r.requirement.title}</h4>
                  <div className="req-badges">
                    <Badge tone={app.tone}>{app.label}</Badge>
                    <Badge tone={ev.tone}>{ev.label}</Badge>
                    {r.requirement.sourceUrl ? null : <Badge tone="grey">Internal check</Badge>}
                    {r.requirement.classification !== 'required' ? (
                      <Badge tone="outline">
                        {r.requirement.classification === 'optional' ? 'Optional' : 'Later stage'}
                      </Badge>
                    ) : null}
                    {acked ? <Badge tone="navy">Acknowledged</Badge> : null}
                  </div>
                </div>
                <p className="muted small">{r.requirement.description}</p>
                {r.reasons.length > 0 ? (
                  <ul className="reason-list">
                    {r.reasons.map((reason, i) => (
                      <li key={i}>{reason}</li>
                    ))}
                  </ul>
                ) : null}
                {r.evidence.length > 0 ? (
                  <div className="evidence-refs">
                    <span className="field-label">Supporting evidence</span>
                    <ul>
                      {r.evidence.map((e, i) => (
                        <li key={i}>
                          <button type="button" className="link-btn" onClick={() => onInspectDoc(e.documentId)}>
                            {e.documentName}
                          </button>
                          {e.page != null ? <span className="muted small"> · p. {e.page}</span> : null}
                          {e.quote ? <q className="muted small"> {e.quote.slice(0, 120)}</q> : null}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
                <p className="next-action">
                  <Icons.ArrowRight size={14} aria-hidden /> {r.nextAction}
                </p>
                <p className="muted small">
                  {r.requirement.sourceUrl ? (
                    <>
                      Source: {r.requirement.jurisdiction} · {r.requirement.sourceSection} ·{' '}
                      {r.requirement.verificationStatus === 'verified' ? (
                        <>verified {r.requirement.lastVerified}</>
                      ) : (
                        <strong>needs review — last checked {r.requirement.lastVerified}</strong>
                      )}{' '}
                      <a href={r.requirement.sourceUrl} target="_blank" rel="noreferrer">
                        Official source
                      </a>
                    </>
                  ) : (
                    <>
                      <Badge tone="grey">Internal check</Badge> {r.requirement.jurisdiction}
                      {r.requirement.sourceSection ? <> · {r.requirement.sourceSection}</> : null} —
                      app consistency check, not a municipal requirement.
                    </>
                  )}{' '}
                  <button
                    type="button"
                    className="link-btn"
                    onClick={() => onInspectRequirement(r.requirement.id)}
                  >
                    Source details
                  </button>
                </p>
                {r.evidenceState === 'missing' && r.applicability === 'applicable' ? (
                  ackFor === r.requirement.id ? (
                    <form
                      className="ack-form"
                      onSubmit={(e) => {
                        e.preventDefault();
                        onAcknowledge(r.requirement.id, noteDrafts[r.requirement.id] ?? '');
                        setAckFor(null);
                      }}
                    >
                      <label className="field">
                        <span className="field-label">Acknowledgement note (required)</span>
                        <textarea
                          rows={2}
                          value={noteDrafts[r.requirement.id] ?? ''}
                          onChange={(e) =>
                            setNoteDrafts((prev) => ({ ...prev, [r.requirement.id]: e.target.value }))
                          }
                          placeholder="e.g. Owner will provide sealed structural drawings before submission."
                        />
                      </label>
                      <p className="muted small">
                        Acknowledging records awareness only — it never marks evidence as
                        satisfied.
                      </p>
                      <div className="form-foot">
                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAckFor(null)}>
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="btn btn-secondary btn-sm"
                          disabled={!(noteDrafts[r.requirement.id] ?? '').trim()}
                        >
                          Record acknowledgement
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAckFor(r.requirement.id)}>
                      {acked ? 'Update acknowledgement' : 'Acknowledge missing evidence'}
                    </button>
                  )
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export function ActivityTab({ project }: { project: Project }) {
  if (project.activity.length === 0) {
    return (
      <div className="card">
        <EmptyState
          icon={<Icons.Activity size={28} />}
          title="No activity yet"
          body="Every meaningful change — uploads, type confirmations, acknowledgements, re-evaluations — will be recorded here with a timestamp."
        />
      </div>
    );
  }
  const items = [...project.activity].reverse();
  return (
    <div className="card">
      <h3>Action history</h3>
      <ol className="activity-list">
        {items.map((a) => (
          <li key={a.id}>
            <span className="activity-time">
              {new Date(a.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}
            </span>
            <span>{a.message}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
