import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';
import { DocumentsTab } from './components/Documents';
import { SourceDrawer, type DrawerSelection } from './components/Drawer';
import { ProjectDashboard } from './components/Dashboard';
import { ReportPanel } from './components/Report';
import { ActivityTab, OverviewTab, RequirementsTab } from './components/Tabs';
import { DetailsForm, WorkspaceHeader } from './components/Workspace';
import { TABS, computeReadiness, inputToDetails, validateIncoming, type NewProjectInput, type WorkspaceTab } from './components/helpers';
import {
  MAX_FILE_BYTES_FALLBACK,
  analyzeDocument,
  fetchHealth,
  formatDateTime,
  uid,
} from './components/api';
import { Icons } from './components/icons';
import { SyntheticBadge } from './components/ui';
import { evaluateProject } from './domain/engine';
import { exportReport } from './domain/report';
import { createDemoProject, createProject } from './domain/seed';
import { loadProjects, saveProjects } from './domain/storage';
import type { DocumentType, Evaluation, Project, ProjectDocument } from './domain/types';

const SAMPLE_TEXT = [
  'HALIFAX COMMERCIAL RENOVATION — SYNTHETIC SAMPLE EVIDENCE',
  'Site: 1234 Barrington St, Halifax, NS.',
  'Scope: interior fit-up of 480 sq ft on 2 storeys; no exterior wall work;',
  'no work in the municipal right-of-way.',
  'This sample is synthetic demonstration data and is not a real submission.',
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
      persist(projects.map((p) => (p.id === id ? fn(p) : p)));
    },
    [persist, projects],
  );

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
        persist([...projects, withMsg]);
        setCreateError(null);
        setOpenId(withMsg.id);
        setTab('overview');
      } catch (e) {
        setCreateError(e instanceof Error ? e.message : 'Could not create the project.');
      }
    },
    [persist, projects],
  );

  const handleLoadDemo = useCallback(() => {
    try {
      if (projects.some((p) => p.synthetic)) {
        const demo = projects.find((p) => p.synthetic);
        if (demo) {
          setOpenId(demo.id);
          setTab('overview');
        }
        return;
      }
      const demo = log(createDemoProject(), 'Synthetic demo project loaded.');
      persist([...projects, demo]);
      setOpenId(demo.id);
      setTab('overview');
    } catch (e) {
      setCreateError(e instanceof Error ? e.message : 'Could not load the demo project.');
    }
  }, [persist, projects]);

  const handleResetDemo = useCallback(() => {
    persist(projects.filter((p) => !p.synthetic));
    const remaining = projects.filter((p) => !p.synthetic);
    setOpenId(remaining.length > 0 && openId && projects.find((p) => p.id === openId)?.synthetic ? null : openId);
    if (openId && projects.find((p) => p.id === openId)?.synthetic) setOpenId(null);
  }, [persist, projects, openId]);

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      if (!project) return;
      const { ok, errors } = validateIncoming(Array.from(files), project.documents.length, maxBytes);
      setUploadErrors(errors);
      if (ok.length === 0) return;
      setUploading(true);
      const added: ProjectDocument[] = [];
      const failures: string[] = [...errors];
      for (const file of ok) {
        try {
          const analysis = await analyzeDocument(file, project.details);
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
      setUploading(false);
      setUploadErrors(failures);
      if (added.length > 0) {
        updateProject(project.id, (p) =>
          log(
            { ...p, documents: [...p.documents, ...added] },
            added.length === 1
              ? `Uploaded "${added[0].name}" (${added[0].documentType}, ${added[0].method}). Original not retained; extracted text kept.`
              : `Uploaded ${added.length} documents. Originals not retained; extracted text kept.`,
          ),
        );
      }
    },
    [project, maxBytes, updateProject],
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
    persist(projects.map((p) => (p.id === project.id ? { ...p, activity: [...p.activity, stamp] } : p)));
  }, [project, persist, projects]);

  const handleExport = useCallback(async () => {
    if (!project || !evaluation) return;
    setExporting(true);
    setExportError(null);
    try {
      await exportReport(project, evaluation);
      persist(
        projects.map((p) =>
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
  }, [project, evaluation, persist, projects]);

  const handleAddSample = useCallback(() => {
    if (!project) return;
    if (project.documents.length >= 20) {
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
    updateProject(project.id, (p) =>
      log({ ...p, documents: [...p.documents, sample] }, 'Added synthetic sample evidence (labelled synthetic).'),
    );
  }, [project, updateProject]);

  const openDocDrawer = useCallback(
    (docId: string) => {
      const doc = project?.documents.find((d) => d.id === docId);
      if (doc) setDrawer({ kind: 'document', doc });
    },
    [project],
  );

  const readiness = evaluation ? computeReadiness(evaluation) : { total: 0, supported: 0, label: '' };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" aria-hidden>
            <Icons.HardHat size={20} />
          </span>
          <div>
            <p className="brand-name">PermitPath</p>
            <p className="brand-sub">Halifax commercial-renovation pre-submission QA · prototype</p>
          </div>
        </div>
        <div className="topbar-right">
          <SyntheticBadge />
          <span className="badge badge-outline" title="Records stay in this browser">
            <Icons.ShieldCheck size={12} aria-hidden /> Local only
          </span>
        </div>
      </header>

      <main className="main">
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
                persist(projects.filter((p) => p.id !== project.id));
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
            <nav className="tabs" aria-label="Project workspace">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'tab tab-active' : 'tab'}
                  onClick={() => setTab(t.id)}
                >
                  {t.id === 'documents' && project.documents.length > 0 ? (
                    <span className="tab-count">{project.documents.length}</span>
                  ) : null}
                  {t.label}
                </button>
              ))}
            </nav>

            {tab === 'overview' ? (
              <div className="overview-grid">
                <div className="overview-main">
                  <OverviewTab
                    project={project}
                    evaluation={evaluation}
                    readiness={readiness}
                    onGoDocuments={() => setTab('documents')}
                    onReevaluate={handleReevaluate}
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
                  <DetailsForm project={project} onSave={handleSaveDetails} saveError={detailsError} />
                </div>
              </div>
            ) : null}

            {tab === 'documents' ? (
              <DocumentsTab
                project={project}
                uploading={uploading}
                uploadErrors={uploadErrors}
                dragActive={dragActive}
                maxBytes={maxBytes}
                serviceMode={serviceMode}
                onFiles={(f) => void handleFiles(f)}
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
                acknowledgements={project.acknowledgements}
                onAcknowledge={handleAcknowledge}
                onInspectDoc={openDocDrawer}
                ackError={ackError}
              />
            ) : null}

            {tab === 'activity' ? <ActivityTab project={project} /> : null}

            <p className="disclaimer">
              PermitPath is an evidence-backed QA prototype. It offers no compliance or approval
              guarantee, and               nothing here is submitted to Halifax. Professional
              evidence always requires human verification.
            </p>
          </div>
        ) : null}
      </main>

      <SourceDrawer
        selection={drawer}
        onClose={() => setDrawer(null)}
        onInspectDoc={openDocDrawer}
      />
    </div>
  );
}
