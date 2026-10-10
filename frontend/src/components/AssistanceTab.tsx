import { useMemo, useState } from 'react';
import type { Project } from '../domain/types';
import type { DocumentDiscrepancy } from '../domain/lifecycle-types';
import {
  applyFieldSuggestion,
  buildApplicationWorksheet,
  detectDocumentDiscrepancies,
  getFieldSuggestions,
} from '../domain/assistance';
import { Icons } from './icons';
import { Badge } from './ui';
import './lifecycle.css';

const HRM_GUIDANCE_URL =
  'https://www.halifax.ca/home-property/building-development-permits/help-using-online-pplc-system/how-apply-a-permit';

function stamp(project: Project, message: string): Project {
  const at = new Date().toISOString();
  return {
    ...project,
    activity: [...project.activity, { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at, message }],
    updatedAt: at,
  };
}

function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AssistanceTab({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (next: Project) => void;
}) {
  const suggestions = useMemo(() => getFieldSuggestions(project), [project]);
  const discrepancies: DocumentDiscrepancy[] = useMemo(
    () => detectDocumentDiscrepancies(project),
    [project],
  );
  const worksheet = useMemo(() => buildApplicationWorksheet(project), [project]);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [worksheetFormat, setWorksheetFormat] = useState<'text' | 'json'>('text');

  function handleApply(id: string) {
    setApplyError(null);
    const suggestion = suggestions.find((s) => s.id === id);
    if (!suggestion) {
      setApplyError('Suggestion no longer available; nothing was applied.');
      return;
    }
    try {
      const next = applyFieldSuggestion(project, suggestion);
      onUpdate(
        stamp(next, `Applied reviewed suggestion for “${suggestion.field}” from ${suggestion.documentName}.`),
      );
    } catch (e) {
      setApplyError(e instanceof Error ? e.message : 'Suggestion could not be applied; nothing changed.');
    }
  }

  function handleWorksheetDownload() {
    const content =
      worksheetFormat === 'json'
        ? JSON.stringify(worksheet, null, 2)
        : worksheet;
    const ext = worksheetFormat === 'json' ? 'json' : 'txt';
    downloadFile(`application-worksheet-${project.id}.${ext}`, content, 'text/plain;charset=utf-8');
    onUpdate(stamp(project, `Internal application worksheet downloaded (${worksheetFormat}). Not an official form; nothing submitted.`));
  }

  return (
    <div className="lc-stack">
      <section className="card" aria-label="Field suggestions">
        <p className="kicker">Reviewed suggestions</p>
        <h3>Field suggestions</h3>
        <p className="muted small">
          Supported form autofill only: suggestions quote the source document and page. Nothing is
          auto-applied — each value needs your explicit review and Apply.
        </p>
        {applyError ? (
          <p className="banner banner-error" role="alert" style={{ marginTop: 10 }}>
            <Icons.TriangleAlert size={16} aria-hidden /> {applyError}
          </p>
        ) : null}
        {suggestions.length === 0 ? (
          <p className="muted small" style={{ marginTop: 10 }}>
            No grounded field suggestions right now. Upload documents with labelled fields to get
            reviewable suggestions.
          </p>
        ) : (
          <ul className="lc-suggest-list">
            {suggestions.map((s) => (
              <li key={s.id} className="card lc-suggest-card">
                <div className="lc-row-between">
                  <strong>{s.field}</strong>
                  <div className="lc-badges">
                    <Badge tone="navy">{s.method === 'explicit_label' ? 'Labelled' : 'Model'}</Badge>
                    {s.page != null ? <Badge tone="grey">p. {s.page}</Badge> : null}
                  </div>
                </div>
                <p className="small" style={{ marginTop: 6, overflowWrap: 'anywhere' }}>
                  Suggested value: <strong>{s.value}</strong>
                </p>
                <blockquote className="lc-quote">
                  <q>{s.quote}</q>
                  <br />
                  <span className="muted small">
                    Source: {s.documentName}
                    {s.page != null ? ` · p. ${s.page}` : ''}
                  </span>
                </blockquote>
                <div className="lc-actions">
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleApply(s.id)}>
                    Apply after my review
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-label="Document discrepancies">
        <h3>Document discrepancies</h3>
        <p className="muted small">
          Conflicts between your own uploads. Resolve by removing and re-uploading corrected text;
          suggestions never redefine official requirements.
        </p>
        {discrepancies.length === 0 ? (
          <p className="muted small" style={{ marginTop: 10 }}>No document discrepancies detected.</p>
        ) : (
          <ul className="lc-suggest-list">
            {discrepancies.map((d) => (
              <li key={d.id} className="card lc-notif-card is-expired">
                <div className="lc-row-between">
                  <strong>{d.title}</strong>
                  <Badge tone={d.severity === 'conflicting' ? 'red' : 'amber'}>
                    {d.severity === 'conflicting' ? 'Conflicting' : 'Needs review'}
                  </Badge>
                </div>
                <p className="muted small">Field: {d.field}</p>
                {d.evidence.map((e, i) => (
                  <blockquote key={i} className="lc-quote">
                    <strong>{e.documentName}</strong>: <span style={{ overflowWrap: 'anywhere' }}>{e.value}</span>
                    <br />
                    <q>{e.quote}</q>
                    {e.page != null ? <span className="muted small"> · p. {e.page}</span> : null}
                  </blockquote>
                ))}
                <p className="next-action">
                  <Icons.ArrowRight size={14} aria-hidden /> {d.nextAction}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="card" aria-label="Application worksheet">
        <p className="kicker">Internal worksheet</p>
        <h3>Application worksheet</h3>
        <p className="banner banner-warn" role="note" style={{ marginTop: 10 }}>
          <Icons.TriangleAlert size={16} aria-hidden />
          INTERNAL WORKSHEET — not an official permit form, and not submitted anywhere. Official
          forms come only from the verified source catalog.
        </p>
        <pre className="lc-worksheet" aria-label="Worksheet preview">{worksheet}</pre>
        <div className="lc-actions">
          <label className="field" style={{ marginBottom: 0, minWidth: 140 }}>
            <span className="field-label">Download format</span>
            <select
              value={worksheetFormat}
              onChange={(e) => setWorksheetFormat(e.target.value as 'text' | 'json')}
              aria-label="Worksheet download format"
            >
              <option value="text">Text</option>
              <option value="json">JSON</option>
            </select>
          </label>
          <button type="button" className="btn btn-secondary" onClick={handleWorksheetDownload}>
            <Icons.Download size={16} aria-hidden /> Download worksheet
          </button>
        </div>
      </section>

      <section className="card" aria-label="Guidance">
        <h3>Official guidance</h3>
        <p className="muted small">
          Verified HRM guidance only. Other municipalities link official sources via the later
          source catalog — no unknown municipal URLs are hardcoded here.
        </p>
        <p className="small" style={{ marginTop: 8 }}>
          <a href={HRM_GUIDANCE_URL} target="_blank" rel="noreferrer">
            HRM: how to apply for a permit (verified official source)
          </a>
        </p>
        <p className="muted small" style={{ marginTop: 6 }}>
          Need a source-catalog callback for other municipalities? Reported to the lead as a
          follow-up — this tab does not invent municipal URLs.
        </p>
      </section>
    </div>
  );
}
