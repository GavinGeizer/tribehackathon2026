import { navigateRadioGroup } from './radio-navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import type { Project } from '../domain/types';
import { EMPTY_NEW_PROJECT, validateNewProject, type NewProjectInput, type NewProjectErrors } from './helpers';
import { Icons } from './icons';
import { FieldError } from './ui';
import DashboardView from '../pages/dashboard';

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
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={navigateRadioGroup}>
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
            tabIndex={value === opt.v ? 0 : -1}
            className={value === opt.v ? 'seg-active' : ''}
            onClick={() => onChange(opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>
      <span className="field-hint">{hint}</span>
    </div>
  );
}

/**
 * Functional wrapper rendered at /workspace when no project is open.
 * Keeps the legacy create-project form (validation + decimal m² typing)
 * and renders the user's green visual dashboard with live domain data.
 * No SiteLayout here — PermitWorkspace already provides the header.
 */
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
        <div className="permit-workspace dashboard-create-panel">
        <form className="card form-card" onSubmit={submit} noValidate>
          <h3>New project</h3>
          <div className="grid-2">
            <label className="field">
              <span className="field-label">Project name *</span>
              <input
                autoFocus
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
        </div>
      ) : null}

      {!showForm ? <DashboardView
        projects={projects}
        onOpen={onOpen}
        onLoadDemo={onLoadDemo}
        onNewProject={() => setShowForm((s) => !s)}
      /> : null}
    </div>
  );
}
