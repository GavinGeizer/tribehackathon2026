import type * as React from 'react';
import { useMemo, useState } from 'react';
import type { JurisdictionId, OfficialResource } from '../domain/lifecycle-types';
import type { Project } from '../domain/types';
import { getProjectJurisdiction } from '../domain/jurisdiction';
import {
  SUBMISSION_API_FINDING,
  applicationForms,
  buildingPermitCaveat,
  downloadPathFor,
  isGeneralBuildingPermitForm,
  kindLabel,
  loadResourceCatalog,
  manualSubmissionSteps,
  portalEntries,
  requirementsAndGuidance,
  resourcesFor,
} from '../domain/resources';
import {
  TRURO_FORM_PATH,
  fillTruroFormPdf,
  logTruroDraftActivity,
  truroAutofillWorkflow,
  type TruroFieldProposal,
  type TruroFillReport,
  type TruroPdfLib,
  type TruroProposalKind,
} from '../domain/form-fill';
import { Icons } from './icons';
import { Badge, EmptyState } from './ui';
import './resources.css';

const MUNICIPALITIES: { id: JurisdictionId | 'nova_scotia'; label: string }[] = [
  { id: 'hrm', label: 'Halifax (HRM)' },
  { id: 'cbrm', label: 'Cape Breton (CBRM)' },
  { id: 'truro', label: 'Truro' },
  { id: 'kentville', label: 'Kentville' },
  { id: 'bridgewater', label: 'Bridgewater' },
  { id: 'other_ns', label: 'Other NS' },
  { id: 'nova_scotia', label: 'Province-wide' },
];

function KindBadge({ resource }: { resource: OfficialResource }) {
  const tone =
    resource.kind === 'application_form'
      ? 'teal'
      : resource.kind === 'requirements'
        ? 'navy'
        : resource.kind === 'portal'
          ? 'amber'
          : 'grey';
  return <Badge tone={tone as 'teal' | 'navy' | 'amber' | 'grey'}>{kindLabel(resource.kind)}</Badge>;
}

function ResourceCard({ resource }: { resource: OfficialResource }) {
  const download = downloadPathFor(resource);
  const caveat = resource.kind === 'application_form' ? buildingPermitCaveat(resource.id) : null;
  return (
    <li className="pp-res-card">
      <div className="pp-res-top">
        <h4>{resource.title}</h4>
        <div className="pp-res-badges">
          <KindBadge resource={resource} />
          {resource.jurisdiction === 'nova_scotia' ? <Badge tone="outline">Nova Scotia government</Badge> : null}
          <Badge tone={resource.format === 'pdf' ? 'outline' : 'grey'}>
            {resource.format === 'pdf' ? 'PDF' : 'Web'}
          </Badge>
          {resource.verificationStatus === 'verified' ? (
            <Badge tone="teal">Verified {resource.verifiedOn}</Badge>
          ) : (
            <Badge tone="amber">Needs review</Badge>
          )}
        </div>
      </div>
      {caveat ? (
        <p className="pp-res-caveat" role="note">
          <Icons.TriangleAlert size={14} aria-hidden /> {caveat}
        </p>
      ) : null}
      <p className="muted small">Official source: {resource.sourceLocation}</p>
      <p className="muted small">{resource.notes}</p>
      <div className="pp-res-links">
        {download ? (
          <a className="btn btn-secondary btn-sm" href={download} download>
            <Icons.Download size={14} aria-hidden /> Download official PDF
          </a>
        ) : null}
        <a className="btn btn-ghost btn-sm" href={resource.url} target="_blank" rel="noreferrer">
          Official source <Icons.ArrowRight size={14} aria-hidden />
        </a>
      </div>
    </li>
  );
}

function TruroAutofill({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (next: Project) => void;
}) {
  const workflow = useMemo(() => truroAutofillWorkflow(project), [project]);
  const [approvals, setApprovals] = useState<Record<TruroProposalKind, boolean>>({
    name: false,
    address: false,
    scope: false,
    contractor: false,
  });
  const [busy, setBusy] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [report, setReport] = useState<TruroFillReport | null>(null);

  if (!workflow.supported) {
    return (
      <p className="muted small" role="note">
        <Icons.Info size={14} aria-hidden /> {workflow.reason}
      </p>
    );
  }
  const proposals: TruroFieldProposal[] = workflow.proposals;
  const approvedCount = (Object.keys(approvals) as TruroProposalKind[]).filter((k) => approvals[k]).length;

  const toggle = (kind: TruroProposalKind) => {
    setApprovals((prev: Record<TruroProposalKind, boolean>) => ({ ...prev, [kind]: !prev[kind] }));
    setReport(null);
  };

  const handleDownload = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(TRURO_FORM_PATH);
      if (!res.ok) throw new Error(`Could not load the official template (${res.status}).`);
      const templateBytes = new Uint8Array(await res.arrayBuffer());
      // String-masked dynamic import: resolves to the lead-installed
      // `pdf-lib` at integration time; typechecks without the package today.
      const pdfLibModule = (await import('pdf-lib')) as unknown as TruroPdfLib;
      const pdfLib: TruroPdfLib = { PDFDocument: pdfLibModule.PDFDocument };
      const { bytes, report: fillReport } = await fillTruroFormPdf(project, { templateBytes, approvals }, pdfLib);
      const safe = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
      const blob = new Blob([safe.buffer as ArrayBuffer], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'truro-building-development-application-2023-DRAFT.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setReport(fillReport);
      const entry = logTruroDraftActivity(project, fillReport);
      onUpdate({
        ...project,
        activity: [...project.activity, entry],
        updatedAt: entry.at,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Draft preparation failed; nothing was downloaded.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="pp-truro">
      <p className="pp-draft-stamp" role="note">
        <Icons.TriangleAlert size={14} aria-hidden /> Reviewed autofill — output is DRAFT — NEEDS REVIEW.
        Never signed, never submitted. Verify every field against the official blank.
      </p>
      {proposals.length === 0 ? (
        <p className="muted small">
          No project facts available to propose yet — record the project address and scope first. All other fields stay blank.
        </p>
      ) : (
        <fieldset className="pp-approve-list">
          <legend className="field-label">Approve each field explicitly before downloading</legend>
          {proposals.map((p) => (
            <label key={p.kind} className="pp-approve-row">
              <input
                type="checkbox"
                checked={approvals[p.kind]}
                onChange={() => toggle(p.kind)}
              />
              <span>
                <strong>{p.label}</strong>
                <span className="muted small"> → {p.fieldNames.join(', ')}</span>
                <span className="pp-approve-value">{p.value}</span>
                <span className="muted small">{p.basis}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      {error ? (
        <p className="banner banner-error" role="alert">
          <Icons.TriangleAlert size={16} aria-hidden /> {error}
        </p>
      ) : null}
      <div className="pp-truro-foot">
        <button
          type="button"
          className="btn btn-primary"
          disabled={busy || approvedCount === 0}
          onClick={() => void handleDownload()}
        >
          <Icons.Download size={16} aria-hidden />
          {busy ? 'Preparing…' : `Download draft PDF (${approvedCount} approved)`}
        </button>
        <p className="muted small">
          Best effort — not fully complete. Remaining fields stay blank for manual completion.
          Contact, PID/ownership, signature, date, and checkbox fields are never autofilled.
        </p>
      </div>
      {report ? (
        <div className="pp-fill-report" aria-label="Draft fill report">
          <h4>Draft fill report</h4>
          <p className="small">
            <strong>{report.outputLabel}</strong> · template preserved (not flattened, not signed).
          </p>
          <p className="small">
            Filled fields: {report.filledFieldNames.length ? report.filledFieldNames.join(', ') : 'none'}
          </p>
          <p className="small">
            Left blank: {report.unfilledUnknownCount} of 96 fields (e.g. {report.unfilledUnknownSample.join(', ')}).
          </p>
          <ul className="small">
            {report.userApprovalAudit.map((a: { kind: string; fieldNames: string[]; at: string }) => (
              <li key={a.kind}>
                Approved {a.kind} → {a.fieldNames.join(', ')} at {a.at}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function ResourcesTab({
  project,
  onUpdate,
}: {
  project: Project;
  onUpdate: (next: Project) => void;
}) {
  const catalog = useMemo(() => loadResourceCatalog(), []);
  const projectMunicipality = getProjectJurisdiction(project).municipality;
  const [filter, setFilter] = useState<JurisdictionId | 'nova_scotia'>(projectMunicipality);
  const scoped = useMemo(() => resourcesFor(filter, catalog), [catalog, filter]);
  const forms: OfficialResource[] = applicationForms(scoped);
  const generalForms: OfficialResource[] = forms.filter(isGeneralBuildingPermitForm);
  const supplementForms: OfficialResource[] = forms.filter((f: OfficialResource) => !isGeneralBuildingPermitForm(f));
  const reqGuide: OfficialResource[] = requirementsAndGuidance(scoped);
  const portals: OfficialResource[] = portalEntries(scoped);
  const steps = manualSubmissionSteps(filter);
  const isTruro = filter === 'truro';

  return (
    <div className="tab-stack pp-resources">
      <section className="card" aria-label="Official forms catalog">
        <p className="kicker">Verified official forms catalog</p>
        <h3>Official sources for this project</h3>
        <p className="muted small">
          Project municipality: <strong>{projectMunicipality}</strong> · showing entries for the
          selected municipality plus province-wide guidance. No HRM rules are shown outside HRM.
        </p>
        <label className="field pp-filter">
          <span className="field-label">Municipality filter</span>
          <select value={filter} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setFilter(e.target.value as JurisdictionId | 'nova_scotia')}>
            {MUNICIPALITIES.map((m) => (
              <option key={m.id} value={m.id}>
                {m.label}
              </option>
            ))}
          </select>
        </label>
        <p className="muted small">
          Each entry lists its official source URL, verification date, and kind. Application forms
          are distinguished from requirements tables, checklists, handouts, and guidance.
        </p>
      </section>

      <section className="card" aria-label="Application forms">
        <h3>Application forms</h3>
        {generalForms.length === 0 && supplementForms.length === 0 ? (
          <EmptyState
            icon={<Icons.FileText size={28} />}
            title="No application form verified for this selection"
            body="Use the guided manual steps and portal guidance below; contact the municipality for the prescribed form."
          />
        ) : (
          <>
            {generalForms.length ? (
              <ul className="pp-res-list">
                {generalForms.map((r: OfficialResource) => (
                  <ResourceCard key={r.id} resource={r} />
                ))}
              </ul>
            ) : null}
            {supplementForms.length ? (
              <>
                <h4 className="pp-subhead">Supplements — not general permit applications</h4>
                <ul className="pp-res-list">
                  {supplementForms.map((r: OfficialResource) => (
                    <ResourceCard key={r.id} resource={r} />
                  ))}
                </ul>
              </>
            ) : null}
          </>
        )}
      </section>

      {isTruro ? (
        <section className="card" aria-label="Truro reviewed autofill">
          <h3>Truro reviewed autofill (general application only)</h3>
          <TruroAutofill project={project} onUpdate={onUpdate} />
        </section>
      ) : null}

      {reqGuide.length ? (
        <section className="card" aria-label="Requirements and guidance">
          <h3>Requirements &amp; guidance</h3>
          <p className="muted small">
            Checklists, handouts, bylaws, and bulletins — requirements context, never application forms.
          </p>
          <ul className="pp-res-list">
            {reqGuide.map((r: OfficialResource) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </ul>
        </section>
      ) : null}

      {portals.length ? (
        <section className="card" aria-label="Portal guide">
          <h3>Portal guide (manual)</h3>
          <ul className="pp-res-list">
            {portals.map((r: OfficialResource) => (
              <ResourceCard key={r.id} resource={r} />
            ))}
          </ul>
        </section>
      ) : null}

      <section className="card" aria-label="Guided manual submission">
        <h3>Guided manual submission</h3>
        <ol className="pp-steps">
          {steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="banner banner-info">
          <Icons.Info size={16} aria-hidden /> {SUBMISSION_API_FINDING}
        </p>
      </section>
    </div>
  );
}
