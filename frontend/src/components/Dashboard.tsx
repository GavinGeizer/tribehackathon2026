import type { FormEvent } from 'react';
import { useState } from 'react';
import type { Project } from '../domain/types';
import { EMPTY_NEW_PROJECT, validateNewProject, type NewProjectInput, type NewProjectErrors } from './helpers';
import { Icons } from './icons';
import { FieldError, SyntheticBadge } from './ui';

function TriState({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: boolean | null;
  onChange: (v: boolean | null) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
        {(
          [
            { v: true, label: 'Yes' },
            { v: false, label: 'No' },
            { v: null, label: 'Unknown' },
          ] as const
        ).map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={value === opt.v}
            className={value === opt.v ? 'seg-active' : ''}
            onClick={() => onChange(opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="field-hint">{hint}</span>
    </label>
  );
}

export function ProjectDashboard({
  projects,
  onOpen,
  onCreate,
  onLoadDemo,
  createError,
  storageError,
}: {
  projects: Project[];
  onOpen: (id: string) => void;
  onCreate: (input: NewProjectInput) => void;
  onLoadDemo: () => void;
  createError: string | null;
  storageError: string | null;
}) {
  const [showForm, setShowForm] = useState(false);
  const [input, setInput] = useState<NewProjectInput>(EMPTY_NEW_PROJECT);
  const [errors, setErrors] = useState<NewProjectErrors>({});
  const set = <K extends keyof NewProjectInput>(k: K, v: NewProjectInput[K]) =>
    setInput((prev) => ({ ...prev, [k]: v }));

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs = validateNewProject(input);
    setErrors(errs);
    if (errs.name || errs.address || errs.proposedArea || errs.storeys) return;
    onCreate(input);
    setInput(EMPTY_NEW_PROJECT);
    setErrors({});
    setShowForm(false);
  };

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <p className="kicker">Halifax · Commercial renovation · Pre-submission QA</p>
          <h2>Projects</h2>
          <p className="muted">
            Evidence-backed readiness checks. Records stay in this browser only — nothing is
            submitted to the municipality from here.
          </p>
        </div>
        <div className="dash-actions">
          <button type="button" className="btn btn-secondary" onClick={onLoadDemo}>
            <Icons.Sparkles size={16} aria-hidden /> Load synthetic demo
          </button>
          <button type="button" className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
            <Icons.Plus size={16} aria-hidden /> New project
          </button>
        </div>
      </div>

      {storageError ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {storageError}
        </p>
      ) : null}
      {createError ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {createError}
        </p>
      ) : null}

      {showForm ? (
        <form className="card form-card" onSubmit={submit} noValidate>
          <h3>New project</h3>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Project name *</span>
              <input
                value={input.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="e.g. Juniper Studio façade renewal"
                aria-invalid={Boolean(errors.name)}
              />
              <FieldError message={errors.name} />
            </label>
            <label className="field">
              <span className="field-label">Site address *</span>
              <input
                value={input.address}
                onChange={(e) => set('address', e.target.value)}
                placeholder="e.g. 120 Example Lane, Halifax, NS"
                aria-invalid={Boolean(errors.address)}
              />
              <FieldError message={errors.address} />
            </label>
          </div>
          <label className="field">
            <span className="field-label">Description</span>
            <textarea
              value={input.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="What is being renovated? Interior fit-up, façade, structural…"
              rows={2}
            />
          </label>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Contractor</span>
              <input
                value={input.contractor}
                onChange={(e) => set('contractor', e.target.value)}
                placeholder="Contractor company"
              />
            </label>
            <label className="field">
              <span className="field-label">Client</span>
              <input
                value={input.client}
                onChange={(e) => set('client', e.target.value)}
                placeholder="Building owner / tenant"
              />
            </label>
          </div>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Proposed Total Area (m²)</span>
              <input
                inputMode="decimal"
                value={input.proposedArea}
                onChange={(e) => set('proposedArea', e.target.value)}
                placeholder="Unknown"
                aria-invalid={Boolean(errors.proposedArea)}
              />
              <FieldError message={errors.proposedArea} />
              <span className="field-hint">Square metres, whole-building total (official 600 threshold is m² — not converted). Leave blank if unknown.</span>
            </label>
            <label className="field">
              <span className="field-label">Storeys</span>
              <input
                inputMode="numeric"
                value={input.storeys}
                onChange={(e) => set('storeys', e.target.value)}
                placeholder="Unknown"
                aria-invalid={Boolean(errors.storeys)}
              />
              <FieldError message={errors.storeys} />
              <span className="field-hint">Whole number; leave blank if unknown.</span>
            </label>
          </div>
          <div className="grid-3">
            <TriState
              label="Exterior wall work?"
              hint="Envelope / façade scope triggers extra evidence."
              value={input.externalWalls}
              onChange={(v) => set('externalWalls', v)}
            />
            <TriState
              label="On an HRM street?"
              hint="Abuts a municipal right-of-way."
              value={input.onHrmRoad}
              onChange={(v) => set('onHrmRoad', v)}
            />
            <TriState
              label="Work in the right-of-way?"
              hint="Hoarding, excavation, or occupancy beyond the lot line."
              value={input.rightOfWayWork}
              onChange={(v) => set('rightOfWayWork', v)}
            />
          </div>
          <div className="grid-2">
            <TriState
              label="Heritage property?"
              hint="Any heritage designation or district, or a “yes” answer on the source-table heritage question — triggers heritage evidence."
              value={input.heritageProperty}
              onChange={(v) => set('heritageProperty', v)}
            />
            <label className="field">
              <span className="field-label">Energy document</span>
              <select
                value={input.energyDocument ?? ''}
                onChange={(e) =>
                  set(
                    'energyDocument',
                    e.target.value === '' ? null : (e.target.value as 'hrm_checklist' | 'other'),
                  )
                }
                aria-label="Energy document type"
              >
                <option value="">Unknown</option>
                <option value="hrm_checklist">HRM energy checklist</option>
                <option value="other">Other energy document</option>
              </select>
              <span className="field-hint">Unknown stays unknown until you choose.</span>
            </label>
          </div>
          <div className="form-foot">
            <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Icons.ArrowRight size={16} aria-hidden /> Create project
            </button>
          </div>
        </form>
      ) : null}

      {projects.length === 0 ? (
        <div className="empty-wrap card">
          <div className="empty-icon" aria-hidden>
            <Icons.Building2 size={28} />
          </div>
          <h3>No projects yet</h3>
          <p>
            Create your first project above, or load the synthetic demo to explore the full
            workspace without entering real customer data.
          </p>
          <div className="empty-action">
            <button type="button" className="btn btn-primary" onClick={() => setShowForm(true)}>
              <Icons.Plus size={16} aria-hidden /> New project
            </button>
            <button type="button" className="btn btn-secondary" onClick={onLoadDemo}>
              <Icons.Sparkles size={16} aria-hidden /> Load synthetic demo
            </button>
          </div>
        </div>
      ) : (
        <ul className="project-grid">
          {projects.map((p) => (
            <li key={p.id} className="card project-card">
              <div className="project-card-top">
                <h3>{p.name}</h3>
                {p.synthetic ? <SyntheticBadge /> : null}
              </div>
              <p className="muted small">{p.details.address || 'No address recorded'}</p>
              <div className="project-meta">
                <span>
                  <Icons.Files size={14} aria-hidden /> {p.documents.length}{' '}
                  {p.documents.length === 1 ? 'document' : 'documents'}
                </span>
                <span>
                  <Icons.Activity size={14} aria-hidden /> {p.activity.length}{' '}
                  {p.activity.length === 1 ? 'event' : 'events'}
                </span>
              </div>
              <button type="button" className="btn btn-secondary btn-block" onClick={() => onOpen(p.id)}>
                Open workspace <Icons.ArrowRight size={16} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
