import type { FormEvent } from 'react';
import { useState } from 'react';
import type { Project } from '../domain/types';
import { parseOptionalNumber } from './helpers';
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
          <h2>{project.name}</h2>
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
  const [addressError, setAddressError] = useState<string | undefined>(undefined);
  const [savedTick, setSavedTick] = useState(0);

  const dirty =
    address !== d.address ||
    description !== d.description ||
    parseOptionalNumber(area) !== d.proposedArea ||
    parseOptionalNumber(storeys) !== d.storeys ||
    externalWalls !== d.externalWalls ||
    onHrmRoad !== d.onHrmRoad ||
    rightOfWayWork !== d.rightOfWayWork;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!address.trim()) {
      setAddressError('An address is required — requirements depend on it.');
      return;
    }
    setAddressError(undefined);
    onSave({
      address: address.trim(),
      description: description.trim(),
      proposedArea: parseOptionalNumber(area),
      storeys: parseOptionalNumber(storeys),
      externalWalls,
      onHrmRoad,
      rightOfWayWork,
    });
    setSavedTick((t) => t + 1);
  };

  const tri = (
    label: string,
    value: boolean | null,
    setValue: (v: boolean | null) => void,
  ) => (
    <label className="field">
      <span className="field-label">{label}</span>
      <div className="segmented" role="radiogroup" aria-label={label}>
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
            className={value === opt.v ? 'seg-active' : ''}
            onClick={() => setValue(opt.v)}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </label>
  );

  return (
    <form className="card" onSubmit={submit} noValidate key={project.id + project.updatedAt}>
      <h3>Project facts</h3>
      <p className="muted small">
        Unknown fields stay <strong>unknown</strong> — the evaluation never guesses. Changing
        facts re-evaluates requirements deterministically.
      </p>
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Site address *</span>
          <input value={address} onChange={(e) => setAddress(e.target.value)} aria-invalid={Boolean(addressError)} />
          <FieldError message={addressError} />
        </label>
        <label className="field">
          <span className="field-label">Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
      </div>
      <div className="grid-2">
        <label className="field">
          <span className="field-label">Proposed area (ft²)</span>
          <input inputMode="decimal" value={area} onChange={(e) => setArea(e.target.value)} placeholder="Unknown" />
          <span className="field-hint">Blank means unknown.</span>
        </label>
        <label className="field">
          <span className="field-label">Storeys</span>
          <input inputMode="numeric" value={storeys} onChange={(e) => setStoreys(e.target.value)} placeholder="Unknown" />
          <span className="field-hint">Blank means unknown.</span>
        </label>
      </div>
      <div className="grid-3">
        {tri('Exterior wall work?', externalWalls, setExternalWalls)}
        {tri('On an HRM street?', onHrmRoad, setOnHrmRoad)}
        {tri('Work in the right-of-way?', rightOfWayWork, setRightOfWayWork)}
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
