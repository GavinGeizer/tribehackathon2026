import { useRef, useState } from 'react';
import type { DocumentType, Project, ProjectDocument } from '../domain/types';
import { DOCUMENT_TYPE_LABELS, MAX_DOCS_PER_PROJECT, formatBytes, formatDateTime } from './api';
import { Icons } from './icons';
import { EmptyState, SyntheticBadge } from './ui';

const ALL_TYPES = Object.keys(DOCUMENT_TYPE_LABELS) as DocumentType[];

export function DocumentsTab({
  project,
  uploading,
  uploadErrors,
  dragActive,
  maxBytes,
  serviceMode,
  onFiles,
  onDragOver,
  onDragLeave,
  onDrop,
  onConfirmType,
  onRemove,
  onInspect,
  onAddSample,
}: {
  project: Project;
  uploading: boolean;
  uploadErrors: string[];
  dragActive: boolean;
  maxBytes: number;
  serviceMode: string | null;
  onFiles: (files: FileList | File[]) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onConfirmType: (docId: string, docType: DocumentType) => void;
  onRemove: (docId: string) => void;
  onInspect: (docId: string) => void;
  onAddSample: (() => void) | null;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);

  return (
    <div className="tab-stack">
      <div
        className={`dropzone${dragActive ? ' dropzone-active' : ''}`}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        role="button"
        tabIndex={0}
        aria-label="Upload documents: drag files here or press Enter to browse"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
      >
        <Icons.UploadCloud size={28} aria-hidden />
        <p>
          <strong>Drag &amp; drop</strong> PDF, TXT, or MD here, or{' '}
          <button
            type="button"
            className="link-btn"
            disabled={uploading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            browse files
          </button>
        </p>
        <p className="muted small">
          Up to {MAX_DOCS_PER_PROJECT} documents per project · max {(maxBytes / 1048576).toFixed(1)} MiB each
          {serviceMode ? ` · service mode: ${serviceMode}` : ''} · originals are processed,
          never retained — only extracted text and metadata are kept.
        </p>
        <input
          ref={inputRef}
          type="file"
          className="visually-hidden"
          multiple
          accept=".pdf,.txt,.md,application/pdf,text/plain,text/markdown"
          disabled={uploading}
          onChange={(e) => {
            if (e.target.files) onFiles(e.target.files);
            e.target.value = '';
          }}
        />
      </div>

      {uploading ? (
        <p className="banner banner-info" role="status">
          <Icons.Loader2 size={16} className="spin" aria-hidden /> Analyzing upload…
        </p>
      ) : null}
      {uploadErrors.map((err, i) => (
        <p key={i} className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {err}
        </p>
      ))}

      {project.documents.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={<Icons.FileText size={28} />}
            title="No documents yet"
            body="Upload a construction plan, elevations, or project description to start matching evidence. If the service is offline you can still add the synthetic sample to explore."
            action={
              onAddSample ? (
                <button type="button" className="btn btn-secondary" onClick={onAddSample}>
                  <Icons.Sparkles size={16} aria-hidden /> Add synthetic sample evidence
                </button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <ul className="doc-list">
          {project.documents.map((doc) => (
            <DocCard
              key={doc.id}
              doc={doc}
              removing={removingId === doc.id}
              onStartRemove={() => setRemovingId(doc.id)}
              onCancelRemove={() => setRemovingId(null)}
              onConfirmRemove={() => {
                setRemovingId(null);
                onRemove(doc.id);
              }}
              onConfirmType={onConfirmType}
              onInspect={onInspect}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function DocCard({
  doc,
  removing,
  onStartRemove,
  onCancelRemove,
  onConfirmRemove,
  onConfirmType,
  onInspect,
}: {
  doc: ProjectDocument;
  removing: boolean;
  onStartRemove: () => void;
  onCancelRemove: () => void;
  onConfirmRemove: () => void;
  onConfirmType: (docId: string, docType: DocumentType) => void;
  onInspect: (docId: string) => void;
}) {
  const preview = doc.text.length > 320 ? `${doc.text.slice(0, 320)}…` : doc.text;
  return (
    <li className="card doc-card">
      <div className="doc-top">
        <div>
          <p className="doc-name">
            <Icons.FileText size={16} aria-hidden /> {doc.name}
          </p>
          <p className="muted small">
            {formatBytes(doc.size)} · uploaded {formatDateTime(doc.uploadedAt)} · {doc.pages}{' '}
            {doc.pages === 1 ? 'page' : 'pages'} · via {doc.method === 'model' ? 'model-assisted' : 'deterministic'} extraction
          </p>
        </div>
        <div className="doc-flags">
          {doc.synthetic ? <SyntheticBadge /> : null}
          {doc.userConfirmedType ? (
            <span className="badge badge-teal">Type confirmed</span>
          ) : (
            <span className="badge badge-amber">Confirm type</span>
          )}
        </div>
      </div>

      <div className="doc-grid">
        <label className="field">
          <span className="field-label">Recognized type</span>
          <select
            value={doc.documentType}
            onChange={(e) => onConfirmType(doc.id, e.target.value as DocumentType)}
            aria-label={`Confirm document type for ${doc.name}`}
          >
            {ALL_TYPES.map((t) => (
              <option key={t} value={t}>
                {DOCUMENT_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </label>
        <div className="doc-status">
          <span className="field-label">Extraction</span>
          <span className="muted small">
            {doc.text.trim()
              ? `${doc.text.length.toLocaleString()} characters extracted`
              : 'No text extracted — upload a text version or flag for professional review'}
            {doc.warnings.length > 0 ? ` · ${doc.warnings.length} warning${doc.warnings.length === 1 ? '' : 's'}` : ''}
            {doc.uncertainties.length > 0 ? ` · ${doc.uncertainties.length} uncertain ${doc.uncertainties.length === 1 ? 'item' : 'items'}` : ''}
          </span>
        </div>
      </div>

      {preview.trim() ? (
        <blockquote className="doc-preview">{preview}</blockquote>
      ) : (
        <p className="banner banner-warn">
          <Icons.AlertTriangle size={16} aria-hidden /> No extractable text. Scans or image-only
          PDFs need a text version, or route this item to professional review.
        </p>
      )}

      <div className="doc-actions">
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => onInspect(doc.id)}>
          <Icons.Search size={14} aria-hidden /> Evidence detail
        </button>
        {removing ? (
          <span className="confirm-inline">
            Remove? Conflicting evidence can be fixed by removing and uploading corrected text.
            <button type="button" className="btn btn-danger btn-sm" onClick={onConfirmRemove}>
              Yes, remove
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={onCancelRemove}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" className="btn btn-ghost btn-danger-text btn-sm" onClick={onStartRemove}>
            <Icons.Trash2 size={14} aria-hidden /> Remove
          </button>
        )}
      </div>
    </li>
  );
}
