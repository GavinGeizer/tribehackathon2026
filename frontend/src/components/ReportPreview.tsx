import type { Project, ReportData, RequirementResult } from '../domain/types';

const evidenceLabels = {
  satisfied: 'Supporting evidence present',
  missing: 'Evidence missing',
  incomplete: 'Evidence incomplete',
  conflicting: 'Conflicting evidence',
  human_review: 'Human review required',
};

function displayDate(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function yesNo(value: boolean | null) {
  return value === null ? 'Unknown' : value ? 'Yes' : 'No';
}

function Finding({ result, project }: { result: RequirementResult; project: Project }) {
  const { requirement } = result;
  const acknowledgements = project.acknowledgements.filter((note) => note.requirementId === requirement.id);
  const hasNotes = result.reasons.length > 0 || requirement.exceptions.length > 0 || requirement.humanReviewNotes.length > 0 || acknowledgements.length > 0;
  return (
    <article style={{ borderTop: '1px solid var(--line)', paddingBlock: 12, overflowWrap: 'anywhere' }}>
      <h5 style={{ marginBlock: '0 6px' }}>{requirement.title}</h5>
      <p className="small">
        <strong>{evidenceLabels[result.evidenceState]}</strong> · {result.applicability === 'undetermined' ? 'Applicability unknown' : result.applicability === 'not_applicable' ? 'Not applicable to current facts' : 'Applicable'}
        {result.acknowledged ? ' · Acknowledged; evidence status unchanged' : ''}
      </p>
      <p className="small">{requirement.description}</p>
      <p className="small"><strong>Next action:</strong> {result.nextAction}</p>
      {result.evidence.length ? result.evidence.map((item, index) => (
        <div key={`${item.documentId}-${index}`} className="small" style={{ marginBlock: 8 }}>
          <strong>{item.documentName}</strong>{item.page !== undefined ? ` · page ${item.page}` : ''}
          <blockquote style={{ margin: '4px 0', paddingLeft: 12, borderLeft: '3px solid var(--line)', whiteSpace: 'pre-wrap' }}>
            {item.quote || 'No readable evidence quote available.'}
          </blockquote>
        </div>
      )) : <p className="small muted">No supporting evidence attached.</p>}
      {requirement.sourceUrl ? (
        <p className="small">
          <a href={requirement.sourceUrl} target="_blank" rel="noopener noreferrer">Official source: {requirement.sourceSection}</a>
          <br />Source status: {requirement.verificationStatus === 'verified' ? 'Verified' : 'Needs review'} · Last verified: {requirement.lastVerified}
        </p>
      ) : <p className="small muted">Internal PermitPath consistency check. {requirement.sourceSection}.</p>}
      {hasNotes ? (
        <details className="small" style={{ marginTop: 8 }}>
          <summary>Review notes, exceptions and acknowledgements</summary>
          <ul className="reason-list">
            {result.reasons.map((note, index) => <li key={`reason-${index}`}>{note}</li>)}
            {requirement.exceptions.map((note, index) => <li key={`exception-${index}`}>Exception to review: {note}</li>)}
            {requirement.humanReviewNotes.map((note, index) => <li key={`review-${index}`}>{note}</li>)}
            {acknowledgements.map((note, index) => <li key={`ack-${index}`}>Acknowledged {displayDate(note.at)}: {note.note}. Acknowledgement does not satisfy evidence.</li>)}
          </ul>
        </details>
      ) : null}
    </article>
  );
}

export function ReportPreview({ data }: { data: ReportData }) {
  const { project, evaluation } = data;
  const facts = project.details;
  const required = evaluation.results.filter((result) => result.requirement.classification === 'required' && result.applicability !== 'not_applicable');
  const internal = evaluation.results.filter((result) => !result.requirement.sourceUrl);
  const other = evaluation.results.filter((result) => result.requirement.sourceUrl && !required.includes(result));
  const unresolved = [...required, ...internal].filter((result) => result.applicability === 'undetermined' || result.evidenceState !== 'satisfied');
  const synthetic = project.synthetic || project.documents.some((document) => document.synthetic);
  return (
    <section className="report-preview" aria-label="Submission readiness report preview">
      <h3>{project.name}</h3>
      <p className="small muted">Generated {displayDate(data.generatedAt)} · Evaluated {displayDate(evaluation.evaluatedAt)}</p>
      {synthetic ? <p className="small"><strong>Synthetic demonstration:</strong> This report contains fictional project facts or document evidence.</p> : null}
      <h4>Project facts</h4>
      <dl className="small" style={{ display: 'grid', gridTemplateColumns: 'minmax(100px, 1fr) minmax(0, 2fr)', gap: '4px 12px', overflowWrap: 'anywhere' }}>
        <dt>Address</dt><dd style={{ margin: 0 }}>{facts.address || 'Unknown'}</dd>
        <dt>Scope</dt><dd style={{ margin: 0 }}>{facts.description || 'Unknown'}</dd>
        <dt>Contractor / client</dt><dd style={{ margin: 0 }}>{project.contractor || 'Unknown'} / {project.client || 'Unknown'}</dd>
        <dt>Proposed total area</dt><dd style={{ margin: 0 }}>{facts.proposedArea === null ? 'Unknown' : `${facts.proposedArea} m²`} (total building assumption)</dd>
        <dt>Storeys</dt><dd style={{ margin: 0 }}>{facts.storeys ?? 'Unknown'}</dd>
        <dt>External wall work</dt><dd style={{ margin: 0 }}>{yesNo(facts.externalWalls)}</dd>
        <dt>On HRM road</dt><dd style={{ margin: 0 }}>{yesNo(facts.onHrmRoad)}</dd>
        <dt>Right-of-way work</dt><dd style={{ margin: 0 }}>{yesNo(facts.rightOfWayWork)}</dd>
        <dt>Heritage property</dt><dd style={{ margin: 0 }}>{yesNo(facts.heritageProperty)}</dd>
        <dt>Energy document</dt><dd style={{ margin: 0 }}>{facts.energyDocument === null ? 'Unknown' : facts.energyDocument === 'hrm_checklist' ? 'HRM checklist' : 'Other'}</dd>
      </dl>
      <h4>Supporting evidence readiness</h4>
      <p className="small"><strong>{evaluation.supported} of {evaluation.applicable} applicable required items have supporting evidence.</strong> {evaluation.missing} missing or incomplete · {evaluation.unknown} required conditions unknown · {evaluation.conflicts} conflicts (including internal checks) · {evaluation.humanReview} require human review.</p>
      <p className="small muted">Scope: 23 municipal entries, including 13 required entries, for Halifax commercial renovation pre-submission review. Optional and later-stage entries are excluded from the required denominator. This is not coverage of the entire building code or all possible permit requirements.</p>
      <h4>Remaining issues</h4>
      {unresolved.length ? <ul className="reason-list small">{unresolved.map((result) => <li key={result.requirement.id}><strong>{result.requirement.title}:</strong> {result.nextAction}</li>)}</ul> : <p className="small">No outstanding evidence issues identified within this review scope. Technical adequacy and municipal acceptance still require review.</p>}
      <h4>Required findings and unknown conditions</h4>
      {required.length ? required.map((result) => <Finding key={result.requirement.id} result={result} project={project} />) : <p className="small muted">No required items are applicable or undetermined for the current facts.</p>}
      {internal.length ? <><h4>Internal consistency findings</h4>{internal.map((result) => <Finding key={result.requirement.id} result={result} project={project} />)}</> : null}
      {other.length ? (
        <details style={{ marginBlock: 12 }}>
          <summary>Optional, later-stage and not-applicable findings ({other.length})</summary>
          <p className="small muted">These entries are excluded from the applicable required denominator.</p>
          {other.map((result) => <Finding key={result.requirement.id} result={result} project={project} />)}
        </details>
      ) : null}
      <details style={{ marginBlock: 12 }}>
        <summary>Document inventory and extraction notes ({project.documents.length})</summary>
        {project.documents.length ? project.documents.map((document) => (
          <div key={document.id} className="small" style={{ marginBlock: 8, overflowWrap: 'anywhere' }}>
            <strong>{document.name}</strong> · {document.pages} page(s) · {document.documentType.replaceAll('_', ' ')} · {document.method} analysis{document.synthetic ? ' · Synthetic' : ''}
            {document.uncertainties.length || document.warnings.length ? <ul className="reason-list">{[...document.uncertainties, ...document.warnings].map((note, index) => <li key={index}>{note}</li>)}</ul> : <p className="muted">No extraction uncertainty reported. Technical adequacy is not verified.</p>}
          </div>
        )) : <p className="small muted">No documents attached.</p>}
      </details>
      <p className="small muted">{data.disclaimer}</p>
    </section>
  );
}
