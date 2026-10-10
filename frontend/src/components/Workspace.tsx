import { navigateRadioGroup } from './radio-navigation';
import type { FormEvent } from 'react';
import { useState } from 'react';
import type { Project } from '../domain/types';
import { parseArea, parseStoreys } from './helpers';
import { Icons } from './icons';
import { FieldError } from './ui';

export function WorkspaceHeader({
  project,
  onBack,
  onDelete,
  onResetDemo,
}: {
  project: Project;
  onBack: () => void;
  onDelete: () => void;
  onResetDemo: (() => void) | null;
}) {
  const [confirming, setConfirming] = useState(false);
  return (
    <div className="ws-head">
      <button type="button" className="btn btn-ghost" onClick={onBack}>
        <Icons.ArrowLeft size={16} aria-hidden /> All projects
      </button>
      <div className="ws-title-row">
        <div>
          <h1>{project.name}</h1>
          <p className="muted">{project.details.address || 'No address recorded'}</p>
        </div>
        <div className="ws-head-actions">
          {onResetDemo ? (
            <button type="button" className="btn btn-secondary" onClick={onResetDemo} title="Remove the synthetic demo project; your other projects are kept.">
              <Icons.RotateCcw size={16} aria-hidden /> Reset demo
            </button>
          ) : null}
          {confirming ? (
            <span className="confirm-inline">
              Delete this project?
              <button type="button" className="btn btn-danger btn-sm" onClick={onDelete}>
                Yes, delete
              </button>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(false)}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="btn btn-ghost btn-danger-text" onClick={() => setConfirming(true)}>
              <Icons.Trash2 size={16} aria-hidden /> Delete
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function DetailsForm({
  project,
  onSave,
  saveError,
}: {
  project: Project;
  onSave: (details: Project['details']) => void;
  saveError: string | null;
}) {
  const d = project.details;
  const [address, setAddress] = useState(d.address);
  const [description, setDescription] = useState(d.description);
  const [area, setArea] = useState(d.proposedArea == null ? '' : String(d.proposedArea));
  const [storeys, setStoreys] = useState(d.storeys == null ? '' : String(d.storeys));
  const [externalWalls, setExternalWalls] = useState(d.externalWalls);
  const [onHrmRoad, setOnHrmRoad] = useState(d.onHrmRoad);
  const [rightOfWayWork, setRightOfWayWork] = useState(d.rightOfWayWork);
  const [heritageProperty, setHeritageProperty] = useState(d.heritageProperty);
  const [energyDocument, setEnergyDocument] = useState(d.energyDocument);
  const [addressError, setAddressError] = useState<string | undefined>(undefined);
  const [areaError, setAreaError] = useState<string | undefined>(undefined);
  const [storeysError, setStoreysError] = useState<string | undefined>(undefined);
  const [savedTick, setSavedTick] = useState(0);

  const dirty =
    address !== d.address ||
    description !== d.description ||
    area !== (d.proposedArea == null ? '' : String(d.proposedArea)) ||
    storeys !== (d.storeys == null ? '' : String(d.storeys)) ||
    externalWalls !== d.externalWalls ||
    onHrmRoad !== d.onHrmRoad ||
    rightOfWayWork !== d.rightOfWayWork ||
    heritageProperty !== d.heritageProperty ||
    energyDocument !== d.energyDocument;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    let valid = true;
    if (!address.trim()) {
      setAddressError('An address is required — requirements depend on it.');
      valid = false;
    } else {
      setAddressError(undefined);
    }
    const areaRaw = area.trim();
    if (areaRaw !== '' && parseArea(areaRaw) == null) {
      setAreaError('Enter a positive total area in m², or clear it for unknown.');
      valid = false;
    } else {
      setAreaError(undefined);
    }
    const storeysRaw = storeys.trim();
    if (storeysRaw !== '' && parseStoreys(storeysRaw) == null) {
      setStoreysError('Enter a whole number of storeys, or clear it for unknown.');
      valid = false;
    } else {
      setStoreysError(undefined);
    }
    if (!valid) return;
    onSave({
      address: address.trim(),
      description: description.trim(),
      proposedArea: parseArea(area),
      storeys: parseStoreys(storeys),
      externalWalls,
      onHrmRoad,
      rightOfWayWork,
      heritageProperty,
      energyDocument,
    });
    setSavedTick((t) => t + 1);
  };

  const tri = (
    label: string,
    value: boolean | null,
    setValue: (v: boolean | null) => void,
  ) => (
    <div className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label} onKeyDown={navigateRadioGroup}>
        {(
          [
            { v: true, label: 'Yes' },
            { v: false, label: 'No' },
            { v: null, label: 'Unknown' },
          ] as { v: boolean | null; label: string }[]
        ).map((opt) => (
          <button
            key={opt.label}
            type="button"
            role="radio"
            aria-checked={value === opt.v}
            tabIndex={value === opt.v ? 0 : -1}
            className={value === opt.v ? 'seg-active' : ''}
            onClick={() => setValue(opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <form className="card" onSubmit={submit} noValidate key={project.id + project.updatedAt}>
      <h3>Project facts</h3>
      <p className="muted small">
        These facts determine which submission requirements apply. Leave uncertain answers unknown.
      </p>
      <div className="grid-2">
        <label className="field field-full">
          <span className="field-label">Site address *</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={Boolean(addressError)} />
          <FieldError message={addressError} />
        </label>
        <label className="field field-full">
          <span className="field-label">Description</span>
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Proposed Total Area (m²)</span>
          <input inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Unknown" aria-invalid={Boolean(areaError)} />
          <FieldError message={areaError} />
          <span className="field-hint">Whole-building total in square metres. Blank means unknown.</span>
        </label>
        <label className="field">
          <span className="field-label">Storeys</span>
          <input inputMode="numeric" value={storeys} onChange={(e) => setStoreys(e.target.value)} placeholder="Unknown" aria-invalid={Boolean(storeysError)} />
          <FieldError message={storeysError} />
          <span className="field-hint">Blank means unknown.</span>
        </label>
      </div>
      <div className="grid-3">
        {tri('Exterior wall work?', externalWalls, setExternalWalls)}
        {tri('On an HRM street?', onHrmRoad, setOnHrmRoad)}
        {tri('Work in the right-of-way?', rightOfWayWork, setRightOfWayWork)}
      </div>
      <div className="grid-2">
        {tri(
          'Heritage property?',
          heritageProperty,
          setHeritageProperty,
        )}
        <p className="field-hint heritage-help">Include heritage designation, a heritage district, or a “yes” to the municipality’s heritage question.</p>
        <label className="field">
          <span className="field-label">Energy document</span>
          <select
            value={energyDocument ?? ''}
            onChange={(e) =>
              setEnergyDocument(
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
      {saveError ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {saveError}
        </p>
      ) : null}
      <div className="form-foot">
        <span className="muted small" aria-live="polite">
          {savedTick > 0 && !dirty ? 'Saved — evaluation refreshed.' : dirty ? 'Unsaved changes.' : ''}
        </span>
        <button type="submit" className="btn btn-primary" disabled={!dirty}>
          Save facts &amp; re-evaluate
        </button>
      </div>
    </form>
  );
}
