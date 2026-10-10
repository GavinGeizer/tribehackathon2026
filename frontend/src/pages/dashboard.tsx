import { useEffect, useMemo, useRef, useState } from 'react';
import { Icons } from '../components/icons';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { evaluateProject } from '../domain/engine';
import { getPermitNotifications } from '../domain/lifecycle';
import { getProjectJurisdiction, hasVerifiedRulePack } from '../domain/jurisdiction';
import type { Evaluation, Project } from '../domain/types';

/**
 * Owned dashboard view — adapted to the user's NEW standalone dashboard
 * design (31351f1 / DASHBOARD-NEW.HTML): fixed icon sidebar, top breadcrumb
 * header, hero, stat cards, attention banner, projects grid, activity rail,
 * approach card. Structure, Inter type, green/white tokens and component
 * shapes are the user's; all data is live domain state.
 *
 * Rendered WITHOUT SiteLayout/DashboardLayout: PermitWorkspace already
 * provides the workspace header, so this draws its own sidebar + header
 * exactly like the user's design. No fake projects, counts or activity.
 */

export interface DashboardViewProps {
  projects: Project[];
  onOpen: (id: string) => void;
  onLoadDemo: () => void;
  onNewProject: () => void;
  newProjectLabel?: string;
}

type Filter = 'all' | 'attention' | 'draft';
type View = 'overview' | 'projects' | 'activity';

interface RowModel {
  project: Project;
  evaluation: Evaluation | null;
  initials: string;
  status: 'Needs attention' | 'Review complete' | 'Draft' | 'In review' | 'Manual tracking';
  supported: number;
  applicable: number;
  missing: number;
  review: number;
  openItems: number;
  verified: boolean;
}

export interface AttentionItem {
  key: string;
  projectId: string;
  projectName: string;
  synthetic: boolean;
  kind: string;
  title: string;
  detail: string;
}

function initialsFor(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words.slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('')) || 'PP').slice(0, 2);
}

function toCsvCell(value: string | number): string {
  const raw = String(value);
  const s = /^[=+@-]/.test(raw) ? "'" + raw : raw;
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function exportCsv(filename: string, rows: (string | number)[][]) {
  const blob = new Blob([rows.map((r) => r.map(toCsvCell).join(',')).join('\n')], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

const ACCENTS = ['#eaf1e7', '#edefee', '#f3eee3', '#f1edf2'];

const TITLES: Record<View, string> = {
  overview: 'A clearer path starts here.',
  projects: 'Every project. One clear view.',
  activity: 'Your workspace, in motion.',
};
const DESCRIPTIONS: Record<View, string> = {
  overview: 'Keep your projects organized and your next steps in focus. Readiness counts supporting evidence only — never legal compliance.',
  projects: 'Find your projects, review open items, and keep preparation moving.',
  activity: 'Follow project updates and the small steps that move work forward.',
};

function badgeVariant(status: RowModel['status']): 'neutral' | 'success' | 'warning' | 'brand' {
  if (status === 'Review complete') return 'success';
  if (status === 'Needs attention') return 'warning';
  if (status === 'In review') return 'brand';
  return 'neutral';
}

const DashboardView = ({ projects, onOpen, onLoadDemo, onNewProject, newProjectLabel = 'New project' }: DashboardViewProps) => {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [view, setView] = useState<View>('overview');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    navigationRef.current?.querySelector<HTMLButtonElement>('nav button')?.focus();
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMenuOpen(false); menuButtonRef.current?.focus(); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [menuOpen]);

  const rows = useMemo<RowModel[]>(() => {
    return projects.map((project) => {
      let evaluation: Evaluation | null;
      try {
        evaluation = evaluateProject(project);
      } catch {
        evaluation = null;
      }
      const verified = hasVerifiedRulePack(project);
      const supported = evaluation?.supported ?? 0;
      const applicable = evaluation?.applicable ?? 0;
      const missing = (evaluation?.missing ?? 0) + (evaluation?.conflicts ?? 0);
      const review = (evaluation?.humanReview ?? 0) + (evaluation?.unknown ?? 0);
      const openItems = missing + review;
      const isDraft = project.documents.length === 0 && applicable === 0 && missing === 0;
      const status: RowModel['status'] = !verified
        ? 'Manual tracking'
        : missing > 0
          ? 'Needs attention'
          : review > 0
            ? 'In review'
            : isDraft
              ? 'Draft'
              : 'Review complete';
      return { project, evaluation, initials: initialsFor(project.name), status, supported, applicable, missing, review, openItems, verified };
    });
  }, [projects]);

  const attention = useMemo<AttentionItem[]>(() => {
    const items: AttentionItem[] = [];
    for (const row of rows) {
      const { project, evaluation } = row;
      if (!evaluation) continue;
      for (const r of evaluation.results) {
        if (r.applicability === 'not_applicable') continue;
        if (r.requirement.classification !== 'required' && r.evidenceState !== 'human_review' && r.requirement.id !== 'internal-address-check') continue;
        if (r.requirement.id === 'internal-address-check') {
          items.push({
            key: `${project.id}:address`,
            projectId: project.id,
            projectName: project.name,
            synthetic: project.synthetic,
            kind: 'Address conflict',
            title: r.requirement.title,
            detail: `Expected project address: ${project.details.address}. Resolve before relying on the packet.`,
          });
          continue;
        }
        if (r.requirement.classification !== 'required' && r.evidenceState !== 'human_review') continue;
        if (r.applicability === 'undetermined') {
          items.push({
            key: `${project.id}:${r.requirement.id}:unknown`,
            projectId: project.id,
            projectName: project.name,
            synthetic: project.synthetic,
            kind: 'Unknown scope',
            title: r.requirement.title,
            detail: 'Project facts are unknown — confirm the condition first.',
          });
        } else if (r.evidenceState === 'missing' || r.evidenceState === 'incomplete') {
          items.push({
            key: `${project.id}:${r.requirement.id}:missing`,
            projectId: project.id,
            projectName: project.name,
            synthetic: project.synthetic,
            kind: 'Missing evidence',
            title: r.requirement.title,
            detail: r.nextAction,
          });
        } else if (r.evidenceState === 'conflicting') {
          items.push({
            key: `${project.id}:${r.requirement.id}:conflict`,
            projectId: project.id,
            projectName: project.name,
            synthetic: project.synthetic,
            kind: 'Conflicting evidence',
            title: r.requirement.title,
            detail: r.nextAction,
          });
        } else if (r.evidenceState === 'human_review') {
          items.push({
            key: `${project.id}:${r.requirement.id}:review`,
            projectId: project.id,
            projectName: project.name,
            synthetic: project.synthetic,
            kind: r.requirement.classification === 'later_stage' ? 'Later-stage review' : 'Needs qualified review',
            title: r.requirement.title,
            detail: r.nextAction,
          });
        }
      }
    }
    let notifications: ReturnType<typeof getPermitNotifications>;
    try {
      notifications = getPermitNotifications(projects);
    } catch {
      notifications = [];
    }
    for (const n of notifications) {
      const owner = projects.find((p) => p.id === n.projectId);
      items.push({
        key: `permit:${n.id}`,
        projectId: n.projectId,
        projectName: n.projectName,
        synthetic: owner?.synthetic ?? false,
        kind: 'Permit record',
        title: n.title,
        detail: n.description,
      });
    }
    return items;
  }, [rows, projects]);

  const totals = useMemo(() => {
    const docs = projects.reduce((n, p) => n + p.documents.length, 0);
    const openItems = rows.reduce((n, r) => n + r.openItems, 0);
    const complete = rows.filter((r) => r.status === 'Review complete').length;
    return { docs, openItems, complete };
  }, [projects, rows]);

  const statCards = [
    { label: 'Total projects', value: String(projects.length), detail: projects.length === 1 ? 'Project in this browser' : 'Projects in this browser', icon: Icons.Building2 },
    { label: 'Open review items', value: String(totals.openItems), detail: 'Missing evidence, conflicts and reviews', icon: Icons.TriangleAlert },
    { label: 'Documents', value: String(totals.docs), detail: 'Extracted text kept; originals not retained', icon: Icons.Files },
    { label: 'Reviews complete', value: String(totals.complete), detail: 'Supporting evidence present, not approval', icon: Icons.CheckCircle2 },
  ];

  const visible = rows.filter((row) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' ||
      row.project.name.toLowerCase().includes(q) ||
      (row.project.details.address || '').toLowerCase().includes(q);
    if (!matchesQuery) return false;
    if (filter === 'attention') return row.openItems > 0;
    if (filter === 'draft') return row.status === 'Draft';
    return true;
  });

  const recentActivity = useMemo(() => {
    return projects
      .flatMap((p) => p.activity.map((a) => ({ ...a, projectName: p.name, synthetic: p.synthetic })))
      .sort((a, b) => (a.at < b.at ? 1 : -1))
      .slice(0, 4);
  }, [projects]);

  const allActivity = useMemo(() => {
    return projects
      .flatMap((p) => p.activity.map((a) => ({ ...a, projectName: p.name, synthetic: p.synthetic })))
      .sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [projects]);

  const handleExport = () => {
    exportCsv('permitpath-project-summary.csv', [
      ['Project', 'Address', 'Synthetic', 'Verified pack', 'Supported', 'Applicable', 'Missing+conflicts', 'Review+unknown', 'Documents'],
      ...rows.map((r) => [
        r.project.name,
        r.project.details.address,
        r.project.synthetic ? 'synthetic' : 'real',
        r.verified ? getProjectJurisdiction(r.project).municipalityName : 'manual tracking',
        r.supported,
        r.applicable,
        r.missing,
        r.review,
        r.project.documents.length,
      ]),
    ]);
  };

  const attentionProjects = new Set(attention.map((a) => a.projectId)).size;
  const navItems: { id: View; label: string; icon: typeof Icons.Building2; count?: number }[] = [
    { id: 'overview', label: 'Overview', icon: Icons.Building2 },
    { id: 'projects', label: 'Projects', icon: Icons.ClipboardList, count: projects.length },
    { id: 'activity', label: 'Activity', icon: Icons.Activity },
  ];

  const setViewAndClose = (next: View) => {
    setView(next);
    setMenuOpen(false);
  };

  return (
    <div className='flex min-h-screen bg-[#f7f8f6] text-[#182420]'>
      <a href='#dash-main' className='sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-3'>Skip to dashboard</a>
      {menuOpen ? (
        <button type='button' aria-label='Close navigation' className='fixed inset-0 z-30 bg-ink/30 lg:hidden' onClick={() => setMenuOpen(false)} />
      ) : null}
      <aside ref={navigationRef} aria-label='Dashboard navigation' className={`fixed inset-y-0 left-0 z-40 flex w-[232px] flex-col border-r border-line bg-[#fdfefd] transition-transform lg:static lg:translate-x-0 ${menuOpen ? 'visible' : 'invisible -translate-x-full lg:visible'}`}>
        <div className='flex h-20 items-center justify-between px-6'>
          <span className='flex items-center gap-2 text-xl font-semibold tracking-[-.06em]'>
            <span aria-hidden className='flex h-8 w-8 items-center justify-center rounded-md bg-[#edf4ef] text-xl font-semibold text-brand'>P</span>
            PermitPath
          </span>
          <button type='button' aria-label='Close navigation' className='flex h-11 w-11 items-center justify-center lg:hidden' onClick={() => setMenuOpen(false)}><Icons.X size={20} aria-hidden /></button>
        </div>
        <div className='px-4'>
          <div className='mb-7 flex items-center gap-3 rounded-lg border border-line bg-white px-3 py-3'>
            <div aria-hidden className='flex h-8 w-8 items-center justify-center rounded-md bg-[#edf1eb] text-xs font-semibold text-brand'>NS</div>
            <div>
              <p className='text-xs font-semibold'>Workspace</p>
              <p className='mt-0.5 text-[12px] text-muted'>Browser-local projects</p>
            </div>
            <span className='ml-auto rounded border border-line px-1 text-[9px] text-muted'>BETA</span>
          </div>
          <p className='mb-2 px-3 text-[9px] font-medium uppercase tracking-[.15em] text-muted'>Workspace</p>
          <nav className='space-y-1' aria-label='Dashboard views'>
            {navItems.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setViewAndClose(item.id)}
                aria-current={view === item.id ? 'page' : undefined}
                className={`flex w-full items-center rounded-lg px-3 py-2.5 text-[13px] transition ${view === item.id ? 'bg-[#edf4ee] font-medium text-[#24664c]' : 'text-[#5c655f] hover:bg-[#f8faf8]'}`}
              >
                <span className='flex items-center gap-3'>
                  <item.icon size={16} aria-hidden />
                  {item.label}
                </span>
                {typeof item.count === 'number' ? <span className='ml-auto text-[12px]'>{item.count}</span> : null}
              </button>
            ))}
          </nav>
        </div>
        <div className='mt-auto p-4'>
          <div className='rounded-xl border border-[#e0e9df] bg-[#f6f9f4] p-4'>
            <p className='text-xs font-semibold'>A little clarity goes a long way.</p>
            <p className='mt-2 text-[12px] leading-5 text-muted'>Start with your project details. Build your preparation plan from there.</p>
            <button type='button' onClick={onNewProject} className='mt-3 text-[12px] font-semibold text-[#24664c]'>Start a project <span className='ml-2' aria-hidden>→</span></button>
          </div>
        </div>
        <div className='flex items-center gap-3 border-t border-line px-6 py-5'>
          <span aria-hidden className='flex h-8 w-8 items-center justify-center rounded-full bg-[#e9eee8] text-[12px] font-medium'>PP</span>
          <div>
            <p className='text-xs font-medium'>Workspace owner</p>
            <p className='mt-0.5 text-[12px] text-muted'>Local browser · sample</p>
          </div>
        </div>
      </aside>

      <div className='min-w-0 flex-1 bg-white'>
        <header className='flex h-20 items-center justify-between gap-4 border-b border-line px-5 md:px-9'>
          <div className='flex items-center gap-3'>
            <button
              type='button'
              ref={menuButtonRef}
              className='flex h-11 w-11 items-center justify-center rounded-lg border border-line bg-white lg:hidden'
              aria-label='Open navigation'
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((o) => !o)}
            >
              <Icons.Menu size={18} aria-hidden />
            </button>
            <span className='text-xs text-muted'>Workspace</span>
            <span aria-hidden className='text-xs text-[#c4cdc5]'>/</span>
            <span className='text-xs font-medium capitalize'>{view}</span>
          </div>
          <div className='flex items-center gap-4'>
            <span className='hidden items-center gap-2 text-[12px] text-muted sm:flex'><span aria-hidden className='h-1.5 w-1.5 rounded-full bg-brand' />Halifax, Nova Scotia</span>
            <span className='rounded-md border border-line bg-paper px-2 py-1 text-[9px] font-medium uppercase tracking-wider'>Browser storage</span>
          </div>
        </header>

        <main id='dash-main' className='mx-auto max-w-[1500px] px-5 py-8 md:px-9 md:py-10'>
          <div className='mb-8 flex flex-wrap items-center justify-between gap-5'>
            <div>
              <p className='mb-2 text-[12px] font-medium uppercase tracking-[.15em] text-muted'>Your workspace, at a glance</p>
              <h1 className='text-[29px] font-medium tracking-[-.05em] md:text-[32px]'>{TITLES[view]}</h1>
              <p className='mt-2 text-[13px] text-muted'>{DESCRIPTIONS[view]}</p>
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button variant='secondary' onClick={onLoadDemo}>Load synthetic demo</Button>
              <Button variant='primary' onClick={onNewProject}>{newProjectLabel}</Button>
            </div>
          </div>

          {view === 'overview' ? (
            <>
              <section aria-label='Project summary' className='mb-8 grid grid-cols-2 gap-3 xl:grid-cols-4'>
                {statCards.map((card) => (
                  <div key={card.label} className='rounded-xl border border-line p-4 md:p-5'>
                    <div className='flex items-center justify-between gap-2'>
                      <p className='text-[12px] text-muted'>{card.label}</p>
                      <card.icon size={16} aria-hidden className='text-muted' />
                    </div>
                    <p className='mt-5 text-[30px] font-medium tabular-nums leading-none tracking-tight'>{card.value}</p>
                    <p className='mt-3 text-[12px] leading-4 text-muted'>{card.detail}</p>
                  </div>
                ))}
              </section>

              <section aria-label='Items needing attention' className='mb-8 flex flex-col justify-between gap-4 rounded-xl border border-[#e3e9df] bg-[#f6f9f3] p-5 sm:flex-row sm:items-center'>
                <div className='flex gap-3'>
                  <span aria-hidden className='mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#e0e7d9] bg-white text-brand'>!</span>
                  <div>
                    <h2 className='text-[13px] font-medium'>Small checks. Smoother next steps.</h2>
                    <p className='mt-1 text-xs leading-5 text-muted'>
                      {attention.length === 0
                        ? 'You have no open review items. Your drafts are ready to develop.'
                        : `${attention.length} item${attention.length === 1 ? '' : 's'} need${attention.length === 1 ? 's' : ''} attention across ${attentionProjects} project${attentionProjects === 1 ? '' : 's'}.`}
                    </p>
                  </div>
                </div>
                {attention.length > 0 ? (
                  <button type='button' onClick={() => setView('projects')} className='whitespace-nowrap text-xs font-semibold text-brand'>
                    Review open items <span className='ml-2' aria-hidden>→</span>
                  </button>
                ) : null}
              </section>
            </>
          ) : null}

          {view !== 'activity' ? (
            <div className='grid items-start gap-7 xl:grid-cols-[minmax(0,1fr)_290px]'>
              <section aria-label='Projects' className='min-w-0'>
                <div className='mb-5 flex items-center justify-between'>
                  <div className='flex items-center gap-2.5'>
                    <h2 className='text-[16px] font-semibold tracking-tight'>Your projects</h2>
                    <span className='rounded-md bg-paper px-2 py-0.5 text-[12px] tabular-nums text-muted'>{visible.length}</span>
                  </div>
                  <button type='button' onClick={handleExport} className='flex items-center gap-2 text-[12px] text-muted hover:text-ink'>
                    <span aria-hidden>⤓</span> Export summary
                  </button>
                </div>
                <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
                  <div className='inline-flex rounded-lg bg-paper p-1' role='group' aria-label='Filter projects'>
                    {(
                      [
                        { id: 'all', label: 'All projects' },
                        { id: 'attention', label: 'Needs attention' },
                        { id: 'draft', label: 'Drafts' },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type='button'
                        aria-pressed={filter === t.id}
                        onClick={() => setFilter(t.id)}
                        className={`rounded-md px-3 py-1.5 text-[12px] ${filter === t.id ? 'bg-white shadow-sm' : 'text-muted'}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                  <div className='w-full min-w-0 sm:w-auto sm:flex-1 sm:max-w-[210px]'>
                    <Input placeholder='Search projects…' aria-label='Search projects' type='search' value={query} onChange={(e) => setQuery(e.target.value)} className='!py-2 !text-xs' />
                  </div>
                </div>
                {visible.length === 0 ? (
                  <div className='rounded-xl border border-dashed border-line px-5 py-14 text-center'>
                    <p className='text-sm font-medium'>No projects found</p>
                    <p className='mt-2 text-xs text-muted'>
                      {projects.length === 0 ? 'Load the synthetic demo or create a new project.' : 'Try another search or create a new project.'}
                    </p>
                    <div className='mt-5 flex flex-wrap justify-center gap-2'>
                      {projects.length > 0 ? (
                        <Button
                          variant='secondary'
                          size='sm'
                          onClick={() => {
                            setFilter('all');
                            setQuery('');
                          }}
                        >
                          Clear filters
                        </Button>
                      ) : null}
                      {projects.length === 0 ? <Button variant='secondary' size='sm' onClick={onLoadDemo}>Load synthetic demo</Button> : null}
                    </div>
                  </div>
                ) : (
                  <div className='grid gap-4 md:grid-cols-2' aria-live='polite'>
                    {visible.map((row) => {
                      const accentIndex = rows.indexOf(row);
                      const percent = row.applicable > 0 ? Math.round((row.supported / row.applicable) * 100) : 0;
                      return (
                        <article key={row.project.id} className='group rounded-xl border border-line bg-white p-5 transition hover:border-[#c5d8c9] hover:shadow-[0_5px_20px_-15px_#244d36]'>
                          <div className='mb-5 flex items-center justify-between gap-2'>
                            <span aria-hidden className='flex h-10 w-10 items-center justify-center rounded-lg text-xs font-semibold' style={{ background: ACCENTS[accentIndex % ACCENTS.length] }}>
                              {row.initials}
                            </span>
                            <Badge variant={badgeVariant(row.status)}>{row.status}</Badge>
                          </div>
                          <h3 className='text-[15px] font-semibold tracking-tight'>{row.project.name}</h3>
                          <p className='mt-1.5 text-[12px] text-muted'>{row.project.details.address || 'No address recorded'}</p>
                          {row.project.synthetic ? (
                            <p className='mt-2 inline-block rounded bg-[#f0f2f0] px-1.5 py-0.5 text-[12px] font-medium text-muted'>Synthetic</p>
                          ) : null}
                          <p className='mt-4 inline-flex items-center gap-1.5 rounded border border-line px-2 py-1 text-[9px] text-muted'>
                            {row.verified ? 'Commercial renovation · Halifax' : 'Manual tracking'}
                          </p>
                          <div className='mt-5 flex justify-between gap-2 text-[12px]'>
                            <span className='text-muted'>Supporting evidence</span>
                            <span className='font-medium tabular-nums'>{row.supported}<span className='text-muted'> / {row.applicable}</span></span>
                          </div>
                          <div className='mt-2 h-1 overflow-hidden rounded-full bg-[#edf0ec]' role='img' aria-label={`${row.supported} of ${row.applicable} applicable items have supporting evidence`}>
                            <div className='h-full rounded-full bg-brand' style={{ width: `${percent}%` }} />
                          </div>
                          <div className='mt-5 flex items-center justify-between border-t border-line pt-4'>
                            <span className='text-[12px] text-muted'>
                              {row.openItems > 0 ? `${row.openItems} open item${row.openItems === 1 ? '' : 's'}` : row.applicable > 0 ? 'Evidence present — reviewer confirms adequacy' : 'Project details started'}
                            </span>
                            <button
                              type='button'
                              onClick={() => onOpen(row.project.id)}
                              aria-label={`Open workspace for ${row.project.name}`}
                              className='inline-flex items-center gap-2 text-[12px] font-medium text-brand'
                            >
                              Open workspace <span aria-hidden>→</span>
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </section>

              {view === 'overview' ? (
                <aside className='space-y-6'>
                  <section aria-label='Recent activity' className='rounded-xl border border-line'>
                    <div className='flex items-center justify-between border-b border-line px-5 py-4'>
                      <h2 className='text-[13px] font-semibold'>Recent activity</h2>
                      <span aria-hidden className='text-muted'>◔</span>
                    </div>
                    <div className='px-5 py-2'>
                      {recentActivity.length === 0 ? (
                        <p className='py-4 text-xs leading-6 text-muted'>No activity yet. Project events will appear here.</p>
                      ) : (
                        recentActivity.map((item) => (
                          <div key={item.id} className='flex gap-3 border-b border-line py-4 last:border-0'>
                            <span aria-hidden className='mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-[12px] text-brand'>✓</span>
                            <div>
                              <p className='text-[12px] font-medium leading-5'>{item.message}</p>
                              <p className='mt-0.5 text-[12px] text-muted'>{item.projectName}{item.synthetic ? ' · Synthetic' : ''} · {new Date(item.at).toLocaleString()}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                    <button type='button' onClick={() => setView('activity')} className='w-full border-t border-line px-5 py-3 text-left text-[12px] font-medium text-brand'>
                      View all activity <span className='float-right' aria-hidden>→</span>
                    </button>
                  </section>
                  <section aria-label='PermitPath approach' className='rounded-xl border border-line p-5'>
                    <p className='mb-2 text-[9px] font-medium uppercase tracking-widest text-muted'>The PermitPath approach</p>
                    <h2 className='text-sm font-semibold tracking-tight'>Know what’s behind each check.</h2>
                    <p className='mt-2 text-xs leading-6 text-muted'>
                      Keep requirements, supporting evidence, and unresolved questions connected throughout preparation. Checks cite the verified Halifax source{' '}
                      <a className='underline' href='https://www.halifax.ca/media/72812'>halifax.ca/media/72812</a>; unknown facts stay unknown. Records persist
                      in this browser only.
                    </p>
                  </section>
                </aside>
              ) : null}
            </div>
          ) : (
            <section aria-label='Workspace activity' className='max-w-3xl rounded-xl border border-line'>
              <div className='border-b border-line p-5'>
                <h2 className='text-sm font-semibold'>Workspace activity</h2>
                <p className='mt-1 text-xs text-muted'>Project history and changes made in this browser.</p>
              </div>
              <div className='px-6'>
                {allActivity.length === 0 ? (
                  <p className='py-4 text-xs leading-6 text-muted'>No activity yet.</p>
                ) : (
                  allActivity.map((item) => (
                    <div key={item.id} className='flex gap-3 border-b border-line py-4 last:border-0'>
                      <span aria-hidden className='mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-paper text-[12px] text-brand'>✓</span>
                      <div>
                        <p className='text-[12px] font-medium leading-5'>{item.message}</p>
                        <p className='mt-0.5 text-[12px] text-muted'>{item.projectName}{item.synthetic ? ' · Synthetic' : ''} · {new Date(item.at).toLocaleString()}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </section>
          )}

          <footer className='mt-10 flex flex-wrap justify-between gap-2 border-t border-line pt-5 text-[12px] leading-5 text-muted'>
            <p>Browser-local workspace · No municipal submissions</p>
            <p>Preparation status is not a guarantee of permit approval.</p>
          </footer>
        </main>
      </div>
    </div>
  );
};

export default DashboardView;
export { DashboardView };
