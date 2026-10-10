import { useState } from 'react';
import type { Project } from '../domain/types';
import type { CustomerType, JurisdictionId, ProjectJurisdiction } from '../domain/lifecycle-types';
import { Icons } from './icons';
import { FieldError } from './ui';
import './lifecycle.css';

const MUNICIPALITIES: { id: JurisdictionId; label: string }[] = [
  { id: 'hrm', label: 'Halifax Regional Municipality (HRM)' },
  { id: 'cbrm', label: 'Cape Breton Regional Municipality (CBRM)' },
  { id: 'truro', label: 'Town of Truro' },
  { id: 'kentville', label: 'Town of Kentville' },
  { id: 'bridgewater', label: 'Town of Bridgewater' },
  { id: 'other_ns', label: 'Other Nova Scotia municipality' },
];

const CUSTOMERS: { id: CustomerType; label: string }[] = [
  { id: 'individual', label: 'Individual / homeowner' },
  { id: 'independent_contractor', label: 'Independent contractor' },
  { id: 'small_company', label: 'Small company' },
  { id: 'medium_company', label: 'Medium company' },
  { id: 'enterprise', label: 'Enterprise' },
];

const WORKFLOWS: { id: ProjectJurisdiction['workflow']; label: string }[] = [
  { id: 'commercial-renovation', label: 'Commercial renovation' },
  { id: 'manual', label: 'Manual / guided workflow' },
];

export const DEFAULT_JURISDICTION: ProjectJurisdiction = {
  province: 'NS',
  municipality: 'hrm',
  municipalityName: 'Halifax Regional Municipality',
  customerType: 'small_company',
  workflow: 'commercial-renovation',
};

function labelFor(id: JurisdictionId): string {
  if (id === 'other_ns') return '';
  return MUNICIPALITIES.find((m) => m.id === id)?.label ?? id;
}

function stamp(project: Project, message: string): Project {
  const at = new Date().toISOString();
  return {
    ...project,
    activity: [...project.activity, { id: `act-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at, message }],
    updatedAt: at,
  };
}

export function JurisdictionPanel({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (next: Project) => void;
}) {
  const current: ProjectJurisdiction = project.jurisdiction ?? DEFAULT_JURISDICTION;
  const [municipality, setMunicipality] = useState<JurisdictionId>(current.municipality);
  const [municipalityName, setMunicipalityName] = useState(current.municipalityName);
  const [customerType, setCustomerType] = useState<CustomerType>(current.customerType);
  const [workflow, setWorkflow] = useState<ProjectJurisdiction['workflow']>(current.workflow);
  const [nameError, setNameError] = useState<string | undefined>(undefined);
  const [savedTick, setSavedTick] = useState(0);

  const dirty =
    municipality !== current.municipality ||
    municipalityName !== current.municipalityName ||
    customerType !== current.customerType ||
    workflow !== current.workflow;

  const automated = municipality === 'hrm' && workflow === 'commercial-renovation';

  function save() {
    if (municipality === 'other_ns' && !municipalityName.trim()) {
      setNameError('Enter the municipal name so project tracking stays accurate.');
      return;
    }
    setNameError(undefined);
    const next: ProjectJurisdiction = {
      province: 'NS',
      municipality,
      municipalityName:
        municipality === 'other_ns' ? municipalityName.trim() : municipalityName.trim() || labelFor(municipality),
      customerType,
      workflow: municipality === 'hrm' ? workflow : 'manual',
    };
    const effectiveWorkflow = municipality === 'hrm' ? workflow : 'manual';
    if (municipality !== 'hrm') setWorkflow('manual');
    onUpdate(
      stamp(
        { ...project, jurisdiction: { ...next, workflow: effectiveWorkflow } },
        `Jurisdiction updated: ${next.municipalityName || next.municipality} · ${next.customerType} · ${effectiveWorkflow}. ${
          next.municipality === 'hrm' && effectiveWorkflow === 'commercial-renovation'
            ? 'Automated HRM commercial-renovation rule pack applies.'
            : 'Project tracking with guided manual workflow; HRM automated rules do not apply.'
        }`,
      ),
    );
    setSavedTick((t) => t + 1);
  }

  return (
    <div className="lc-stack">
      <section className="card" aria-label="Jurisdiction and customer">
        <div className="lc-row-between">
          <div>
            <p className="kicker">Jurisdiction</p>
            <h3>Where is this project?</h3>
          </div>
        </div>
        <p className="muted small">
          Legacy records without jurisdiction metadata default to HRM · commercial renovation ·
          small company. Changing jurisdiction never reuses HRM rules as province-wide law.
        </p>
        <div className="lc-grid" style={{ marginTop: 12 }}>
          <label className="field">
            <span className="field-label">NS municipality</span>
            <select
              value={municipality}
              onChange={(e) => {
                const v = e.target.value as JurisdictionId;
                setMunicipality(v);
                if (v !== 'other_ns') {
                  setMunicipalityName(labelFor(v));
                  setNameError(undefined);
                } else {
                  setMunicipalityName('');
                }
              }}
              aria-label="NS municipality"
            >
              {MUNICIPALITIES.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Customer type</span>
            <select
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as CustomerType)}
              aria-label="Customer type"
            >
              {CUSTOMERS.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        {municipality === 'other_ns' ? (
          <label className="field">
            <span className="field-label">Municipal name *</span>
            <input
              value={municipalityName}
              onChange={(e) => setMunicipalityName(e.target.value)}
              placeholder="e.g. Town of Antigonish"
              aria-invalid={Boolean(nameError)}
            />
            <FieldError message={nameError} />
          </label>
        ) : null}
        <label className="field">
          <span className="field-label">Workflow</span>
          <select
            value={workflow}
            onChange={(e) => setWorkflow(e.target.value as ProjectJurisdiction['workflow'])}
            aria-label="Workflow"
            disabled={municipality !== 'hrm'}
          >
            {WORKFLOWS.map((w) => (
              <option key={w.id} value={w.id}>
                {w.label}
              </option>
            ))}
          </select>
          <span className="field-hint">
            {municipality === 'hrm'
              ? 'HRM offers the verified commercial-renovation rule pack or a guided manual workflow.'
              : 'Outside HRM only the guided manual workflow is available; the selector is locked to manual.'}
          </span>
        </label>
        {automated ? (
          <p className="banner banner-info" role="status">
            <Icons.ShieldCheck size={16} aria-hidden />
            Automated coverage: only HRM commercial renovation uses the verified rule pack.
          </p>
        ) : (
          <p className="banner banner-warn" role="status">
            <Icons.Info size={16} aria-hidden />
            No automated assessment for {municipalityName || municipality}. Project tracking plus
            a guided manual workflow with official sources only — HRM rules are not applied here.
          </p>
        )}
        <div className="form-foot">
          <span className="muted small" aria-live="polite">
            {savedTick > 0 && !dirty ? 'Saved — activity recorded.' : dirty ? 'Unsaved changes.' : ''}
          </span>
          <button type="button" className="btn btn-primary" disabled={!dirty} onClick={save}>
            Save jurisdiction
          </button>
        </div>
      </section>
    </div>
  );
}
