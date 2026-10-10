import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './index.css';
import './App.css';
import './project-workspace.css';
import { DocumentsTab } from './components/Documents';
import { SourceDrawer, type DrawerSelection } from './components/Drawer';
import { ProjectDashboard } from './components/Dashboard';
import { ResourcesTab } from './components/ResourcesTab';
import { LifecycleTab } from './components/LifecycleTab';
import { JurisdictionPanel } from './components/JurisdictionPanel';
import { AssistanceTab } from './components/AssistanceTab';
import { getProjectJurisdiction } from './domain/jurisdiction';
import { ReportPanel } from './components/Report';
import { ActivityTab, OverviewTab, RequirementsTab } from './components/Tabs';
import { DetailsForm, WorkspaceHeader } from './components/Workspace';
import { TABS, computeReadiness, inputToDetails, mergeUploadedDocuments, validateIncoming, type NewProjectInput, type WorkspaceTab } from './components/helpers';
import {
  MAX_FILE_BYTES_FALLBACK,
  analyzeDocument,
  fetchHealth,
  formatDateTime,
  uid,
} from './components/api';
import { Icons } from './components/icons';
import { evaluateProject } from './domain/engine';
import { exportReport } from './domain/report';
import { requirements } from './domain/rules';
import { createDemoProject, createProject } from './domain/seed';
import { clearStoredProjects, loadProjects, saveProjects } from './domain/storage';
import type { DocumentType, Evaluation, Project, ProjectDocument } from './domain/types';

const SAMPLE_TEXT = [
  'HALIFAX COMMERCIAL RENOVATION — SYNTHETIC SAMPLE EVIDENCE',
  'Project: Juniper Studio Renovation (fictional). Contractor: Seabright Works (fictional).',
  'Site: 120 Example Lane, Halifax, NS (synthetic; whole building).',
  'Scope: interior renovation with external wall cladding replacement;',
  'Proposed Total Area: 450 m² (whole-building total; official 600 threshold is m² — not converted).',
  '2 storeys; external wall work: yes.',
  'Source term shown as "Total Area"; treated here as a total-building',
  'assumption that needs reviewer confirmation — not verified fact.',
  'No work in the municipal right-of-way.',
  'This sample is a synthetic summary for evaluation only — not an actual',
  'engineering drawing and not professionally sufficient.',
].join('\n');

function log(project: Project, message: string): Project {
  const entry = { id: uid('act'), at: new Date().toISOString(), message };
  return { ...project, activity: [...project.activity, entry], updatedAt: entry.at };
}

function persistErrorMessage(e: unknown): string {
  const detail = e instanceof Error && e.message ? ` (${e.message})` : '';
  return (
    'Could not save to browser storage — your changes are visible now but may not survive a reload. ' +
    `Free up space or check site settings${detail}.`
  );
}

function readInitialProjects(): { projects: Project[]; error: string | null } {
  try {
    return { projects: loadProjects(), error: null };
  } catch (e) {
    return {
      projects: [],
      error:
        e instanceof Error && e.message
          ? `Stored projects could not be read: ${e.message}. Starting with an empty workspace — nothing was deleted.`
          : 'Stored projects could not be read. Starting with an empty workspace — nothing was deleted.',
    };
  }
}

export default function App() {
  const [initial] = useState(readInitialProjects);
  const [projects, setProjects] = useState<Project[]>(initial.projects);
  const [loadError] = useState<string | null>(initial.error);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [compactNavigation, setCompactNavigation] = useState(() => window.matchMedia('(max-width: 760px)').matches);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)');
    const update = () => setCompactNavigation(media.matches);
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);
  const [tab, setTab] = useState<WorkspaceTab>('overview');
  const [drawer, setDrawer] = useState<DrawerSelection | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragActive, setDragActive] = useState(false);
  const [maxBytes, setMaxBytes] = useState(MAX_FILE_BYTES_FALLBACK);
  const [serviceMode, setServiceMode] = useState<string | null>(null);
  const [reevalTick, setReevalTick] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [ackError, setAckError] = useState<string | null>(null);
  const [detailsError, setDetailsError] = useState<string | null>(null);

  // Upload-in-progress lock: the ref is written synchronously (immediately)
  // when an upload starts/finishes so a second drop/file-pick in the same
  // tick cannot slip through. The state mirror drives the UI.
  const uploadingRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    fetchHealth()
      .then((h) => {
        if (cancelled) return;
        setMaxBytes(h.maxFileBytes);
        setServiceMode(h.mode);
      })
      .catch(() => {
        if (!cancelled) setServiceMode(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const persist = useCallback((next: Project[]) => {
    setProjects(next);
    try {
      saveProjects(next);
      setStorageError(null);
    } catch (e) {
      setStorageError(persistErrorMessage(e));
    }
  }, []);

  // Mirror of projects state for async continuations (uploads): functional
  // updates below always compute from the latest value, so concurrent edits
  // (type confirm, removal, facts, delete) made mid-upload are retained.
  const projectsRef = useRef<Project[]>(initial.projects);
  const persistRef = useRef(persist);
  useEffect(() => {
    persistRef.current = persist;
  }, [persist]);

  const applyProjectsUpdate = useCallback(
    (fn: (prev: Project[]) => Project[]) => {
      const next = fn(projectsRef.current);
      projectsRef.current = next;
      persistRef.current(next);
    },
    [],
  );

  const project = useMemo(
    () => projects.find((p) => p.id === openId) ?? null,
    [projects, openId],
  );

  const evaluation: Evaluation | null = useMemo(() => {
    if (!project) return null;
    void reevalTick;
    return evaluateProject(project);
  }, [project, reevalTick]);

  const evaluatedNote = evaluation
    ? `Last evaluated ${formatDateTime(evaluation.evaluatedAt)} (deterministic).`
    : 'Not yet evaluated in this session.';

  const updateProject = useCallback(
    (id: string, fn: (p: Project) => Project) => {
      applyProjectsUpdate((prev) => prev.map((p) => (p.id === id ? fn(p) : p)));
    },
    [applyProjectsUpdate],
  );

  const handleReviewedUpdate = useCallback((next: Project) => {
    updateProject(next.id, (current) => ({
      ...next,
      documents: current.documents,
      acknowledgements: current.acknowledgements,
      activity: [...current.activity, ...next.activity.filter(a => !current.activity.some(b => b.id === a.id))],
    }));
  }, [updateProject]);

  const handleCreate = useCallback(
    (input: NewProjectInput) => {
      try {
        const draft = createProject({
          name: input.name.trim(),
          contractor: input.contractor.trim(),
          client: input.client.trim(),
          details: inputToDetails(input),
        });
        const created = log(draft, `Project "${draft.name}" created.`);
        const withMsg: Project = {
          ...created,
          activity: [
            ...created.activity,
            { id: uid('act'), at: new Date().toISOString(), message: 'Project facts recorded.' },
          ],
        };
        applyProjectsUpdate((prev) => [...prev, withMsg]);
        setCreateError(null);
        setOpenId(withMsg.id);
        setTab('overview');
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : 'Could not create the project.');
      }
    },
    [applyProjectsUpdate],
  );

  const handleLoadDemo = useCallback(() => {
    try {
      const existing = projectsRef.current.find((p) => p.synthetic);
      if (existing) {
        setOpenId(existing.id);
        setTab('overview');
        return;
      }
      const demo = log(createDemoProject(), 'Synthetic demo project loaded.');
      applyProjectsUpdate((prev) => [...prev, demo]);
      setOpenId(demo.id);
      setTab('overview');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not load the demo project.');
    }
  }, [applyProjectsUpdate]);

  const handleResetDemo = useCallback(() => {
    const current = projectsRef.current;
    const wasOpenSynthetic = openId != null && current.find((p) => p.id === openId)?.synthetic === true;
    applyProjectsUpdate((prev) => prev.filter((p) => !p.synthetic));
    if (wasOpenSynthetic) setOpenId(null);
  }, [applyProjectsUpdate, openId]);

  // Upload flow is race-safe: snapshot only the target id + a details
  // reference at kickoff; the completion merge is a functional update that
  // appends to the LATEST document list and skips silently if the project
  // was deleted (or hit the cap) while the analysis was in flight.
  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (uploadingRef.current) {
        setUploadErrors((prev) => [
          ...prev,
          'An upload is already in progress — please wait for it to finish.',
        ]);
        return;
      }
      const target = projectsRef.current.find((p) => p.id === openId) ?? null;
      if (!target) return;
      const targetId = target.id;
      const detailsSnapshot = target.details;
      const { ok, errors } = validateIncoming(Array.from(files), target.documents.length, maxBytes);
      setUploadErrors(errors);
      if (ok.length === 0) return;
      // Lock immediately: no second upload (drop or picker) may start until done.
      uploadingRef.current = true;
      setUploading(true);
      const added: ProjectDocument[] = [];
      const failures: string[] = [...errors];
      for (const file of ok) {
        try {
          const analysis = await analyzeDocument(file, detailsSnapshot);
          added.push({
            ...analysis,
            id: uid('doc'),
            name: file.name,
            size: file.size,
            uploadedAt: new Date().toISOString(),
            userConfirmedType: false,
          });
        } catch (e) {
          failures.push(e instanceof Error ? `"${file.name}": ${e.message}` : `"${file.name}": upload failed; project unchanged.`);
        }
      }
      uploadingRef.current = false;
      setUploading(false);
      setUploadErrors(failures);
      if (added.length > 0) {
        let skipped = false;
        applyProjectsUpdate((prev) => {
          const { next, skipped: gone } = mergeUploadedDocuments(prev, targetId, added);
          skipped = gone;
          if (gone) return prev;
          return next.map((p) =>
            p.id === targetId
              ? log(
                  p,
                  added.length === 1
                    ? `Uploaded "${added[0].name}" (${added[0].documentType}, ${added[0].method}). Original not retained; extracted text kept.`
                    : `Uploaded ${added.length} documents. Originals not retained; extracted text kept.`,
                )
              : p,
          );
        });
        if (skipped) {
          setUploadErrors((prev) => [
            ...prev,
            'Upload finished after the project was deleted — nothing was applied.',
          ]);
        }
      }
    },
    [openId, maxBytes, applyProjectsUpdate],
  );

  const handleConfirmType = useCallback(
    (docId: string, docType: DocumentType) => {
      if (!project) return;
      updateProject(project.id, (p) =>
        log(
          {
            ...p,
            documents: p.documents.map((d) =>
              d.id === docId ? { ...d, documentType: docType, userConfirmedType: true } : d,
            ),
          },
          `Confirmed type of "${p.documents.find((d) => d.id === docId)?.name ?? docId}" as ${docType}.`,
        ),
      );
    },
    [project, updateProject],
  );

  const handleRemoveDoc = useCallback(
    (docId: string) => {
      if (!project) return;
      const target = project.documents.find((d) => d.id === docId);
      updateProject(project.id, (p) =>
        log(
          { ...p, documents: p.documents.filter((d) => d.id !== docId) },
          `Removed "${target?.name ?? docId}". Re-upload corrected text to fix conflicting evidence.`,
        ),
      );
      setDrawer((sel) => (sel?.kind === 'document' && sel.doc?.id === docId ? null : sel));
    },
    [project, updateProject],
  );

  const handleSaveDetails = useCallback(
    (details: Project['details']) => {
      if (!project) return;
      setDetailsError(null);
      try {
        updateProject(project.id, (p) => log({ ...p, details }, 'Project facts updated; evaluation refreshed.'));
        setReevalTick((t) => t + 1);
      } catch (e) {
        setDetailsError(e instanceof Error ? e.message : 'Could not save project facts.');
      }
    },
    [project, updateProject],
  );

  const handleAcknowledge = useCallback(
    (requirementId: string, note: string) => {
      if (!project) return;
      const trimmed = note.trim();
      if (!trimmed) {
        setAckError('An acknowledgement note is required — it records what is still missing.');
        return;
      }
      setAckError(null);
      updateProject(project.id, (p) =>
        log(
          {
            ...p,
            acknowledgements: [
              ...p.acknowledgements.filter((a) => a.requirementId !== requirementId),
              { requirementId, note: trimmed, at: new Date().toISOString() },
            ],
          },
          `Acknowledged missing evidence for ${requirementId} (awareness only — still missing).`,
        ),
      );
    },
    [project, updateProject],
  );

  const handleReevaluate = useCallback(() => {
    if (!project) return;
    setReevalTick((t) => t + 1);
    const stamp = { id: uid('act'), at: new Date().toISOString(), message: 'Manual re-evaluation requested.' };
    applyProjectsUpdate((prev) =>
      prev.map((p) => (p.id === project.id ? { ...p, activity: [...p.activity, stamp] } : p)),
    );
  }, [project, applyProjectsUpdate]);

  const handleExport = useCallback(async () => {
    if (!project || !evaluation) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportReport(project, evaluation);
      applyProjectsUpdate((prev) =>
        prev.map((p) =>
          p.id === project.id
            ? { ...p, activity: [...p.activity, { id: uid('act'), at: new Date().toISOString(), message: 'Report exported.' }] }
            : p,
        ),
      );
    } catch (e) {
      setExportError(e instanceof Error ? e.message : 'Report export failed; the project is unchanged.');
    } finally {
      setExporting(false);
    }
  }, [project, evaluation, applyProjectsUpdate]);

  const handleAddSample = useCallback(() => {
    const target = projectsRef.current.find((p) => p.id === openId) ?? null;
    if (!target) return;
    if (target.documents.length >= 20) {
      setUploadErrors([`Document limit reached (20 per project). Remove a document first.`]);
      return;
    }
    const now = new Date().toISOString();
    const sample: ProjectDocument = {
      id: uid('doc'),
      name: 'synthetic-sample-evidence.txt',
      size: new Blob([SAMPLE_TEXT]).size,
      uploadedAt: now,
      synthetic: true,
      userConfirmedType: false,
      documentType: 'project_description',
      text: SAMPLE_TEXT,
      pages: 1,
      fields: {},
      method: 'deterministic',
      uncertainties: [],
      warnings: ['Synthetic sample — for exploring the workflow, not a real submission.'],
    };
    updateProject(target.id, (p) =>
      log({ ...p, documents: [...p.documents, sample] }, 'Added synthetic sample evidence (labelled synthetic).'),
    );
  }, [openId, updateProject]);

  const openDocDrawer = useCallback(
    (docId: string) => {
      const doc = projectsRef.current.find((p) => p.id === openId)?.documents.find((d) => d.id === docId);
      if (doc) setDrawer({ kind: 'document', doc });
    },
    [openId],
  );

  const openRequirementDrawer = useCallback(
    (requirementId: string) => {
      const result = evaluation?.results.find((r) => r.requirement.id === requirementId);
      if (result) setDrawer({ kind: 'requirement', result });
    },
    [evaluation],
  );

  const readiness = evaluation ? computeReadiness(evaluation) : { total: 0, supported: 0, label: '' };

  const MainContainer = project ? 'main' : 'div';

  return (
    <div className={project ? "app permit-workspace" : "permit-dashboard"}>
      {project ? <header className="topbar">
        <a href="/" className="brand" aria-label="PermitPath home">
          <span className="brand-mark" aria-hidden>
            <Icons.HardHat size={20} />
          </span>
          <div>
            <p className="brand-name">PermitPath</p>
            <p className="brand-sub">Project workspace · Nova Scotia</p>
          </div>
        </a>
        <div className="topbar-right">
          <span className="badge badge-outline" title="Demonstration prototype — not a municipal service">
            <Icons.Info size={12} aria-hidden /> Prototype
          </span>
          <span className="badge badge-outline" title="Records stay in this browser">
            <Icons.ShieldCheck size={12} aria-hidden /> Browser storage
          </span>
        </div>
      </header> : null}

      <MainContainer className={project ? "main" : "dashboard-container"}>
        {loadError || storageError ? (
          <button type="button" className="btn btn-secondary" onClick={() => {
            if (!window.confirm('Clear saved PermitPath projects and extracted text in this browser? Download a report first if needed. This cannot be undone.')) return;
            try { clearStoredProjects(); window.location.reload(); }
            catch (error) { setStorageError(persistErrorMessage(error)); }
          }}>Reset browser workspace</button>
        ) : null}
        {loadError ? (
          <p className="banner banner-error" role="alert">
            <Icons.TriangleAlert size={16} aria-hidden /> {loadError}
          </p>
        ) : null}

        {!project ? (
          <ProjectDashboard
            projects={projects}
            onOpen={(id) => {
              setOpenId(id);
              setTab('overview');
              setDrawer(null);
            }}
            onCreate={handleCreate}
            onLoadDemo={handleLoadDemo}
            createError={createError}
            storageError={storageError}
          />
        ) : evaluation ? (
          <div className="workspace">
            <WorkspaceHeader
              project={project}
              onBack={() => {
                setOpenId(null);
                setDrawer(null);
              }}
              onDelete={() => {
                applyProjectsUpdate((prev) => prev.filter((p) => p.id !== project.id));
                setOpenId(null);
                setDrawer(null);
              }}
              onResetDemo={project.synthetic ? handleResetDemo : projects.some((p) => p.synthetic) ? handleResetDemo : null}
            />
            {storageError ? (
              <p className="banner banner-error" role="alert">
                <Icons.TriangleAlert size={16} aria-hidden /> {storageError}
              </p>
            ) : null}
            <div className="project-frame">
            <nav className="tabs project-nav" role="tablist" aria-orientation={compactNavigation ? 'horizontal' : 'vertical'} aria-label="Project workspace">
              <p className="project-nav-label">PROJECT WORKSPACE</p>
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`project-tab-${t.id}`}
                  aria-controls="project-panel"
                  tabIndex={tab === t.id ? 0 : -1}
                  onKeyDown={(event) => {
                    const index = TABS.findIndex(item => item.id === t.id);
                    const direction = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
                    const target = event.key === 'Home' ? 0 : event.key === 'End' ? TABS.length - 1 : direction ? (index + direction + TABS.length) % TABS.length : null;
                    if (target !== null) { event.preventDefault(); setTab(TABS[target].id); document.getElementById(`project-tab-${TABS[target].id}`)?.focus(); }
                  }}
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'tab tab-active' : 'tab'}
                  onClick={() => setTab(t.id)}
                >
                  {(() => { const Icon = ({ overview: Icons.Building2, details: Icons.ClipboardList, documents: Icons.Files, requirements: Icons.ShieldCheck, assistance: Icons.Sparkles, lifecycle: Icons.Landmark, resources: Icons.FileText, activity: Icons.Activity })[t.id]; return <Icon size={17} aria-hidden />; })()}
                  {t.id === 'documents' && project.documents.length > 0 ? (
                    <span className="tab-count">{project.documents.length}</span>
                  ) : null}
                  {t.label}
                </button>
              ))}
            </nav>

            <div className="project-content" id="project-panel" role="tabpanel" aria-labelledby={`project-tab-${tab}`}>
            <h2 className="visually-hidden">{TABS.find(t => t.id === tab)?.label}</h2>
            {tab === 'overview' ? (
              <div className="overview-grid">
                <div className="overview-main">
                  <OverviewTab
                    project={project}
                    evaluation={evaluation}
                    readiness={readiness}
                    onGoDocuments={() => setTab('documents')}
                    onReevaluate={handleReevaluate}
                    onGoRequirements={() => setTab('requirements')}
                    onInspectRequirement={openRequirementDrawer}
                    evaluatedNote={evaluatedNote}
                  />
                  <ReportPanel
                    project={project}
                    evaluation={evaluation}
                    onExport={handleExport}
                    exporting={exporting}
                    exportError={exportError}
                  />
                </div>
                <div className="overview-side">
                  <section className="project-intelligence" aria-label="Document intelligence">
                    <div className="intelligence-heading"><Icons.Files size={20} aria-hidden /><span>Document intelligence</span></div>
                    <h3>Review your documents.</h3>
                    <p>Extract project details, compare addresses and review every suggested value against its source.</p>
                    <div className="analysis-service"><span className={serviceMode === 'model' ? 'service-dot service-live' : 'service-dot'} />{serviceMode === 'model' ? 'AI document analysis connected' : serviceMode === 'deterministic' ? 'Text extraction available' : 'Checking analysis service…'}</div>
                    <button type="button" className="btn btn-primary" onClick={() => setTab('documents')}><Icons.UploadCloud size={16} aria-hidden /> Analyze documents</button>
                    <button type="button" className="intelligence-review" onClick={() => setTab('assistance')}>Review extracted fields <Icons.ArrowRight size={14} aria-hidden /></button>
                    <p className="intelligence-footnote">{project.documents.filter(d => d.method === 'model' && !d.synthetic).length} AI-analyzed · {project.documents.length} documents in this project</p>
                  </section>
                  <section className="card project-at-a-glance" aria-label="Project at a glance">
                    <div className="section-heading"><h3>Project details</h3><button type="button" className="link-btn" onClick={() => setTab('details')}>Edit details <Icons.ArrowRight size={14} aria-hidden /></button></div>
                    <dl><div><dt>Municipality</dt><dd>{getProjectJurisdiction(project).municipalityName || 'Not recorded'}</dd></div><div><dt>Contractor</dt><dd>{project.contractor || 'Not recorded'}</dd></div><div><dt>Client</dt><dd>{project.client || 'Not recorded'}</dd></div><div><dt>Workflow</dt><dd>{getProjectJurisdiction(project).workflow === 'commercial-renovation' ? 'Commercial renovation' : 'Guided manual preparation'}</dd></div></dl>
                    <p className="project-scope">{project.details.description || 'Add a description in Project details.'}</p>
                  </section>
                </div>
              </div>
            ) : null}

            {tab === 'details' ? <div className="project-settings"><div className="project-section-title"><p className="kicker">Project setup</p><h2>Project details</h2><p className="muted">Keep the project facts current. Unknown answers stay visible for review.</p></div><DetailsForm key={project.id} project={project} onSave={handleSaveDetails} saveError={detailsError} /><JurisdictionPanel key={project.id} project={project} onUpdate={handleReviewedUpdate} /></div> : null}

            {tab === 'documents' ? (
              <DocumentsTab
                project={project}
                uploading={uploading}
                uploadErrors={uploadErrors}
                dragActive={dragActive}
                maxBytes={maxBytes}
                serviceMode={serviceMode}
                onFiles={(f) => {
                  if (uploadingRef.current) {
                    setUploadErrors((prev) => [
                      ...prev,
                      'An upload is already in progress — please wait for it to finish.',
                    ]);
                    return;
                  }
                  void handleFiles(f);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files.length > 0) void handleFiles(e.dataTransfer.files);
                }}
                onConfirmType={handleConfirmType}
                onRemove={handleRemoveDoc}
                onInspect={openDocDrawer}
                onAddSample={handleAddSample}
              />
            ) : null}

            {tab === 'requirements' ? (
              <RequirementsTab
                evaluation={evaluation}
                ruleCount={requirements.length}
                acknowledgements={project.acknowledgements}
                onAcknowledge={handleAcknowledge}
                onInspectDoc={openDocDrawer}
                onInspectRequirement={openRequirementDrawer}
                ackError={ackError}
              />
            ) : null}

            {tab === 'assistance' ? <AssistanceTab key={project.id} project={project} onUpdate={handleReviewedUpdate} /> : null}
            {tab === 'lifecycle' ? <LifecycleTab key={project.id} project={project} onUpdate={handleReviewedUpdate} /> : null}
            {tab === 'resources' ? <ResourcesTab key={`${project.id}-${project.jurisdiction?.municipality ?? 'hrm'}`} project={project} onUpdate={handleReviewedUpdate} /> : null}
            {tab === 'activity' ? <ActivityTab project={project} /> : null}

            <p className="disclaimer">
              PermitPath is an evidence-backed QA prototype. It offers no compliance or approval
              guarantee. Verified coverage: {getProjectJurisdiction(project).municipality === 'hrm' && getProjectJurisdiction(project).workflow === 'commercial-renovation' ? 'Halifax commercial renovations' : 'manual workflow; no automated local requirements pack'}. Nothing here is submitted to a municipality. Professional
              evidence always requires human verification.
            </p>
            </div>
            </div>
          </div>
        ) : null}
      </MainContainer>

      <SourceDrawer
        selection={drawer}
        onClose={() => setDrawer(null)}
        onInspectDoc={openDocDrawer}
      />
    </div>
  );
}
