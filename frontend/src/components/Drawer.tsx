import type { ProjectDocument, RequirementResult } from '../domain/types';
import { DOCUMENT_TYPE_LABELS, formatBytes, formatDateTime } from './api';
import { Icons } from './icons';
import { SyntheticBadge } from './ui';

export interface DrawerSelection {
  kind: 'document' | 'requirement';
  doc?: ProjectDocument;
  result?: RequirementResult;
}

export function SourceDrawer({
  selection,
  onClose,
  onInspectDoc,
}: {
  selection: DrawerSelection | null;
  onClose: () => void;
  onInspectDoc: (docId: string) => void;
}) {
  if (!selection) return null;
  return (
    <div className="drawer-scrim" onClick={onClose}>
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={selection.kind === 'document' ? 'Source and evidence detail' : 'Requirement source detail'}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="drawer-head">
          <h3>{selection.kind === 'document' ? 'Source / evidence detail' : 'Requirement source'}</h3>
          <button type="button" className="btn btn-ghost btn-sm" onClick={onClose} aria-label="Close detail panel">
            <Icons.X size={16} aria-hidden /> Close
          </button>
        </div>
        <div className="drawer-body">
          {selection.kind === 'document' && selection.doc ? (
            <DocDetail doc={selection.doc} />
          ) : selection.kind === 'requirement' && selection.result ? (
            <RequirementDetail result={selection.result} onInspectDoc={onInspectDoc} />
          ) : null}
        </div>
      </aside>
    </div>
  );
}

function DocDetail({ doc }: { doc: ProjectDocument }) {
  const entries = Object.entries(doc.fields ?? {});
  return (
    <div className="drawer-stack">
      <div>
        <p className="drawer-title">{doc.name}</p>
        <p className="muted small">
          {DOCUMENT_TYPE_LABELS[doc.documentType]} · {formatBytes(doc.size)} · uploaded{' '}
          {formatDateTime(doc.uploadedAt)} · via {doc.method === 'model' ? 'model-assisted' : 'deterministic'} extraction
          {doc.userConfirmedType ? ' · type confirmed by user' : ' · type not yet confirmed'}
        </p>
        {doc.synthetic ? <SyntheticBadge /> : null}
      </div>
      {doc.warnings.length > 0 ? (
        <section>
          <h4>Warnings</h4>
          <ul className="reason-list">
            {doc.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {doc.uncertainties.length > 0 ? (
        <section>
          <h4>Uncertainties</h4>
          <ul className="reason-list">
            {doc.uncertainties.map((u, i) => (
              <li key={i}>{u}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {entries.length > 0 ? (
        <section>
          <h4>Extracted fields with evidence</h4>
          <ul className="field-evidence">
            {entries.map(([name, f]) => (
              <li key={name}>
                <strong>{name}:</strong> {f.value}
                <span className="muted small"> ({f.method === 'model' ? 'model' : 'explicit label'}{f.page != null ? `, p. ${f.page}` : ''})</span>
                {f.evidence ? <blockquote>{f.evidence}</blockquote> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted small">No structured fields were extracted from this document.</p>
      )}
      <section>
        <h4>Extracted text preview</h4>
        <pre className="text-preview">{doc.text ? doc.text.slice(0, 4000) : '(no text extracted)'}</pre>
      </section>
    </div>
  );
}

function RequirementDetail({
  result,
  onInspectDoc,
}: {
  result: RequirementResult;
  onInspectDoc: (docId: string) => void;
}) {
  const r = result.requirement;
  return (
    <div className="drawer-stack">
      <div>
        <p className="drawer-title">{r.title}</p>
        <p className="muted small">
          {r.jurisdiction} · {r.sourceSection} · verified {r.lastVerified} · status:{' '}
          {r.verificationStatus === 'verified' ? 'verified' : 'needs review'}
        </p>
      </div>
      <p>{r.description}</p>
      {result.reasons.length > 0 ? (
        <section>
          <h4>Why this assessment</h4>
          <ul className="reason-list">
            {result.reasons.map((reason, i) => (
              <li key={i}>{reason}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {result.evidence.length > 0 ? (
        <section>
          <h4>Evidence quotes</h4>
          <ul className="field-evidence">
            {result.evidence.map((e, i) => (
              <li key={i}>
                <button type="button" className="link-btn" onClick={() => onInspectDoc(e.documentId)}>
                  {e.documentName}
                </button>
                {e.page != null ? <span className="muted small"> · p. {e.page}</span> : null}
                {e.quote ? <blockquote>{e.quote}</blockquote> : null}
              </li>
            ))}
          </ul>
        </section>
      ) : (
        <p className="muted small">No supporting evidence cited yet.</p>
      )}
      {r.humanReviewNotes.length > 0 ? (
        <section>
          <h4>Human review notes</h4>
          <ul className="reason-list">
            {r.humanReviewNotes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </section>
      ) : null}
      {r.exceptions.length > 0 ? (
        <section>
          <h4>Known exceptions</h4>
          <ul className="reason-list">
            {r.exceptions.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </section>
      ) : null}
      <p>
        <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
          <Icons.Landmark size={14} aria-hidden /> Open official source
        </a>
      </p>
    </div>
  );
}
