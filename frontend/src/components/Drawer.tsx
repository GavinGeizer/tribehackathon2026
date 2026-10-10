import { useEffect, useRef } from 'react';
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
  const dialogRef = useRef<HTMLDialogElement>(null);
  const returnFocusRef = useRef<Element | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selection) {
      returnFocusRef.current = document.activeElement;
      if (!dialog.open) dialog.showModal();
      // Move focus into the dialog for keyboard/screen-reader users.
      const closeBtn = dialog.querySelector<HTMLButtonElement>('[data-autofocus]');
      (closeBtn ?? dialog).focus();
    } else if (dialog.open) {
      dialog.close();
      // Restore focus to whatever opened the drawer.
      if (returnFocusRef.current instanceof HTMLElement) returnFocusRef.current.focus();
    }
  }, [selection]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const handleClose = () => onClose();
    dialog.addEventListener('close', handleClose);
    return () => dialog.removeEventListener('close', handleClose);
  }, [onClose]);

  return (
    <dialog
      ref={dialogRef}
      className="drawer-dialog"
      aria-label={
        selection?.kind === 'requirement' ? 'Requirement source detail' : 'Source and evidence detail'
      }
      onClick={(e) => {
        // Native <dialog> Escape + backdrop-click close; focus trap + restore handled above.
        if (e.target === dialogRef.current) onClose();
      }}
    >
      <div className="drawer-head">
        <h3>{selection?.kind === 'requirement' ? 'Requirement source' : 'Source / evidence detail'}</h3>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={onClose}
          aria-label="Close detail panel"
          data-autofocus
        >
          <Icons.X size={16} aria-hidden /> Close
        </button>
      </div>
      <div className="drawer-body">
        {selection?.kind === 'document' && selection.doc ? (
          <DocDetail doc={selection.doc} />
        ) : selection?.kind === 'requirement' && selection.result ? (
          <RequirementDetail result={selection.result} onInspectDoc={onInspectDoc} />
        ) : null}
      </div>
    </dialog>
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
                <strong>{name.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase())}:</strong> {f.value}
                <span className="muted small"> ({f.method === 'model' ? 'AI extraction' : 'Labelled text'}{f.page != null ? `, page ${f.page}` : ''})</span>
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
          {r.jurisdiction} · {r.sourceSection} ·{' '}
          {r.verificationStatus === 'verified' ? (
            <>source verified {r.lastVerified}</>
          ) : (
            <strong>source needs review — last checked {r.lastVerified}</strong>
          )}
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
      {r.sourceUrl ? (
        <p>
          <a href={r.sourceUrl} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
            <Icons.Landmark size={14} aria-hidden /> Open official source
          </a>
        </p>
      ) : (
        <p className="banner banner-info">
          <Icons.Info size={16} aria-hidden /> Internal check — an app consistency rule, not a
          municipal requirement. No official source link applies.
        </p>
      )}
    </div>
  );
}
