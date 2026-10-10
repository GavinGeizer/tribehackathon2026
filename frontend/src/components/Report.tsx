import { useState } from 'react';
import type { Evaluation, Project } from '../domain/types';
import { buildReportData } from '../domain/report';
import { computeReadiness } from './helpers';
import { Icons } from './icons';
import { EmptyState, SyntheticBadge } from './ui';
import { ReportPreview } from './ReportPreview';

export function ReportPanel({
  project,
  evaluation,
  onExport,
  exporting,
  exportError,
}: {
  project: Project;
  evaluation: Evaluation;
  onExport: () => void;
  exporting: boolean;
  exportError: string | null;
}) {
  const [showPreview, setShowPreview] = useState(false);
  const readiness = computeReadiness(evaluation);
  let preview: ReturnType<typeof buildReportData> | null = null;
  let previewError: string | null = null;
  if (showPreview) {
    try {
      preview = buildReportData(project, evaluation);
    } catch (e) {
      previewError = e instanceof Error ? e.message : 'Could not build the report preview.';
    }
  }

  const hasEvidence = project.documents.length > 0;
  const hasSynthetic = project.synthetic || project.documents.some((d) => d.synthetic);
  return (
    <section className="card report-card" aria-label="Report export">
      <div className="report-top">
        <div>
          <h3 className="report-title">Submission readiness report{hasSynthetic ? <SyntheticBadge /> : null}</h3>
          <p className="muted small">
            {readiness.label}. Uses actual uploaded evidence{hasSynthetic ? ' plus synthetic demo content' : ''}.
          </p>
        </div>
        <div className="report-actions">
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setShowPreview((s) => !s)}>
            {showPreview ? 'Hide preview' : 'Preview report'}
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={exporting} onClick={onExport}>
            {exporting ? <Icons.Loader2 size={14} className="spin" aria-hidden /> : <Icons.Download size={14} aria-hidden />}
            {exporting ? ' Exporting…' : ' Export report'}
          </button>
        </div>
      </div>
      {!hasEvidence ? (
        <div className="report-empty">
          <EmptyState
            icon={<Icons.Download size={24} />}
            title="Export works best with evidence"
            body="You can export now, but the report will show missing evidence honestly. Upload documents first for a useful handoff."
          />
        </div>
      ) : null}
      {exportError ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {exportError}
        </p>
      ) : null}
      {showPreview ? (
        previewError ? (
          <p className="banner banner-error" role="alert">
            <Icons.TriangleAlert size={16} aria-hidden /> {previewError}
          </p>
        ) : preview ? (
          <ReportPreview data={preview} />
        ) : null
      ) : null}
    </section>
  );
}
