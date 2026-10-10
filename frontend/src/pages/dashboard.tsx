import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

type ProjectStatus = 'Needs attention' | 'Review complete' | 'Draft';

type Project = {
  id: string;
  name: string;
  location: string;
  type: string;
  status: ProjectStatus;
  accent: string;
  initials: string;
  openItems: number;
  progress: number;
  count: {
    reviewed: number;
    total: number;
  };
};

type StatCard = {
  label: string;
  value: string;
  detail: string;
  icon: string;
};

type ActivityItem = {
  title: string;
  subtitle: string;
  time: string;
};

const projectData: Project[] = [
  {
    id: 'cafe',
    name: 'The corner café',
    location: 'North End, Halifax',
    type: 'Commercial renovation',
    status: 'Needs attention',
    accent: '#e7efe7',
    initials: 'CC',
    openItems: 2,
    progress: 75,
    count: { reviewed: 6, total: 8 },
  },
  {
    id: 'studio',
    name: 'Harbour design studio',
    location: 'Downtown, Halifax',
    type: 'Commercial renovation',
    status: 'Needs attention',
    accent: '#edefee',
    initials: 'HS',
    openItems: 2,
    progress: 60,
    count: { reviewed: 3, total: 5 },
  },
  {
    id: 'retail',
    name: 'Quinpool retail space',
    location: 'Quinpool Road, Halifax',
    type: 'Commercial renovation',
    status: 'Review complete',
    accent: '#f3eee3',
    initials: 'QR',
    openItems: 0,
    progress: 100,
    count: { reviewed: 6, total: 6 },
  },
  {
    id: 'wellness',
    name: 'West End wellness',
    location: 'West End, Halifax',
    type: 'Commercial renovation',
    status: 'Draft',
    accent: '#f1edf2',
    initials: 'WW',
    openItems: 0,
    progress: 0,
    count: { reviewed: 0, total: 0 },
  },
];

const statCards: StatCard[] = [
  { label: 'Total projects', value: '4', detail: 'Across your workspace', icon: '▦' },
  { label: 'Open review items', value: '4', detail: 'Items awaiting your attention', icon: '!' },
  { label: 'Documents', value: '19', detail: 'In the sample project collection', icon: '◫' },
  { label: 'Reviews complete', value: '1', detail: 'Document review, not approval', icon: '✓' },
];

const activityItems: ActivityItem[] = [
  { title: 'Floor plan review updated', subtitle: 'The corner café', time: 'Sample history' },
  { title: 'Project details added', subtitle: 'Harbour design studio', time: 'Sample history' },
  { title: 'Document review completed', subtitle: 'Quinpool retail space', time: 'Sample history' },
];

const dashboardNav = [
  { label: 'Overview', isActive: true, icon: '▦' },
  { label: 'Projects', isActive: false, icon: '▣', count: 4 },
  { label: 'Activity', isActive: false, icon: '◔' },
];

const getBadgeVariant = (status: ProjectStatus) => {
  if (status === 'Review complete') return 'success';
  if (status === 'Needs attention') return 'warning';
  return 'neutral';
};

const SidebarNavItem = ({ label, icon, count, isActive }: { label: string; icon: string; count?: number; isActive?: boolean }) => (
  <button className={`flex w-full items-center ${count ? 'justify-between' : ''} rounded-lg px-3 py-2.5 text-[13px] transition ${isActive ? 'bg-[#edf4ee] font-medium text-[#24664c]' : 'text-[#5c655f] hover:bg-[#f8faf8]'}`}>
    <span className='flex items-center gap-3'>
      <span className='inline-flex h-4 w-4 items-center justify-center text-[12px]'>{icon}</span>
      {label}
    </span>
    {count ? <span className='rounded-md bg-[#f1f5f1] px-1.5 py-0.5 text-[10px] font-medium'>{count}</span> : null}
  </button>
);

const StatCardItem = ({ card }: { card: StatCard }) => (
  <div className='rounded-xl border border-[#e5e9e5] bg-[#f9faf8] p-4'>
    <div className='flex items-center justify-between'>
      <p className='text-[11px] text-[#66716b]'>{card.label}</p>
      <span className='text-[#6b786f]'>{card.icon}</span>
    </div>
    <p className='mt-5 text-[32px] font-medium leading-none tracking-[-0.06em] text-[#1d2a27]'>{card.value}</p>
    <p className='mt-3 text-[11px] leading-5 text-[#6a756f]'>{card.detail}</p>
  </div>
);

const ProjectCard = ({ project }: { project: Project }) => (
  <article className='rounded-xl border border-[#e5e9e5] bg-white p-4'>
    <div className='mb-4 flex items-center justify-between'>
      <div className='flex h-10 w-10 items-center justify-center rounded-lg text-[12px] font-semibold text-[#1f2a27]' style={{ background: project.accent }}>
        {project.initials}
      </div>
      <Badge variant={getBadgeVariant(project.status)}>{project.status}</Badge>
    </div>

    <h3 className='text-[21px] font-semibold tracking-[-0.04em] text-[#1d2b28]'>{project.name}</h3>
    <p className='mt-1 text-[11px] text-[#66716b]'>{project.location}</p>

    <div className='mt-4 inline-flex items-center gap-2 rounded-lg border border-[#e5e9e5] bg-[#f9faf8] px-2 py-1.5 text-[10px] text-[#66716b]'>
      <span className='inline-flex h-2.5 w-2.5 items-center justify-center rounded-full bg-[#24664c]' />
      {project.type}
    </div>

    <div className='mt-5 flex items-center justify-between text-[10px] text-[#66716b]'>
      <span>Document review</span>
      <span className='font-medium text-[#1d2b28]'>{project.count.reviewed} / {project.count.total}</span>
    </div>
    <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf2ee]'>
      <div className='h-full rounded-full bg-[#24664c]' style={{ width: `${project.progress}%` }} />
    </div>

    <div className='mt-5 flex items-center justify-between border-t border-[#ecefe9] pt-3'>
      <p className='text-[10px] text-[#66716b]'>{project.openItems > 0 ? `${project.openItems} open items` : 'Review complete'}</p>
      <Button variant='ghost' size='sm' className='!min-h-8 !px-2 !text-[11px]'>Open project</Button>
    </div>
  </article>
);

const ActivityRow = ({ item, index }: { item: ActivityItem; index: number }) => (
  <div className={`flex items-start gap-3 ${index < activityItems.length - 1 ? 'border-b border-[#ecefe9] pb-4' : ''}`}>
    <span className='mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-[#f3f7f3] text-[11px] text-[#24664c]'>✓</span>
    <div>
      <p className='text-[11px] font-medium text-[#1d2b28]'>{item.title}</p>
      <p className='mt-1 text-[10px] text-[#66716b]'>{item.subtitle}</p>
      <p className='mt-1 text-[9px] text-[#8a938d]'>{item.time}</p>
    </div>
  </div>
);

const DashboardPage = () => {
  return (
    <div className='flex min-h-screen bg-[#f7f8f6] text-[#182420]'>
      <aside className='flex w-[232px] shrink-0 flex-col border-r border-[#e5e9e5] bg-[#fdfefd]'>
        <div className='flex h-[72px] items-center gap-3 px-6'>
          <div className='flex h-8 w-8 items-center justify-center rounded-md bg-[#edf4ef] text-xl font-semibold text-[#24664c]'>P</div>
          <div className='text-[34px] font-semibold tracking-[-0.06em] text-[#1f2a27]'>PermitPath</div>
        </div>

        <div className='px-4 pb-4'>
          <div className='mb-6 flex items-center gap-3 rounded-xl border border-[#e7ece7] bg-[#f8f9f7] p-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-md bg-[#edf4ef] text-xs font-semibold text-[#24664c]'>NS</div>
            <div>
              <p className='text-sm font-semibold'>North Studio</p>
              <p className='text-[11px] text-[#66716b]'>Demo workspace</p>
            </div>
            <span className='ml-auto rounded border border-[#e7ece7] px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-[#66716b]'>BETA</span>
          </div>

          <div className='mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#7a817c]'>Workspace</div>
          <nav className='space-y-1'>
            {dashboardNav.map((item) => (
              <SidebarNavItem key={item.label} label={item.label} icon={item.icon} count={item.count} isActive={item.isActive} />
            ))}
          </nav>
        </div>

        <div className='mt-auto border-t border-[#e6ebe7] p-4'>
          <div className='rounded-xl border border-[#dfe8df] bg-[#f5f9f4] p-4'>
            <div className='mb-3 flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe7df] bg-white text-[#24664c]'>✓</div>
            <p className='text-sm font-semibold text-[#1d2c23]'>A little clarity goes a long way.</p>
            <p className='mt-2 text-[11px] leading-5 text-[#66716b]'>Start with your project details. Build your preparation plan from there.</p>
            <button className='mt-3 text-[11px] font-semibold text-[#24664c]'>Create a project →</button>
          </div>

          <button className='mt-4 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] text-[#5c655f] hover:bg-[#f8faf8]'>
            <span className='inline-flex h-4 w-4 items-center justify-center text-[12px]'>?</span>
            About this demo
          </button>
        </div>

        <div className='flex items-center gap-3 border-t border-[#e6ebe7] px-4 py-4'>
          <div className='flex h-8 w-8 items-center justify-center rounded-full bg-[#edf4ef] text-[11px] font-medium text-[#1f2a27]'>JD</div>
          <div>
            <p className='text-sm font-medium'>Jamie Davis</p>
            <p className='text-[11px] text-[#66716b]'>Workspace owner · sample</p>
          </div>
        </div>
      </aside>

      <div className='min-w-0 flex-1 bg-white'>
        <header className='flex h-[72px] items-center justify-between border-b border-[#e5e9e5] bg-white px-5 md:px-9'>
          <div className='flex items-center gap-3'>
            <span className='text-[13px] text-[#66716b]'>Workspace</span>
            <span className='text-[#d5d9d5]'>/</span>
            <span className='text-[13px] font-medium text-[#1f2a27]'>Overview</span>
          </div>

          <div className='flex items-center gap-4 text-[12px] text-[#69746d]'>
            <span className='flex items-center gap-2'>
              <span className='h-2 w-2 rounded-full bg-[#24664c]' />
              Halifax, Nova Scotia
            </span>
            <span className='rounded-lg border border-[#dfe7df] bg-[#f8faf7] px-2 py-1 font-medium uppercase tracking-[0.12em] text-[#5f6f69]'>Demo mode</span>
          </div>
        </header>

        <main className='mx-auto max-w-[1180px] px-5 py-8 md:px-9 md:py-10'>
          <div className='mb-6 flex items-end justify-between gap-5'>
            <div>
              <p className='mb-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-[#66716b]'>Your workspace, at a glance</p>
              <h1 className='text-[28px] font-medium tracking-[-0.06em] text-[#1f2a27] md:text-[42px]'>A clearer path starts here.</h1>
              <p className='mt-2 text-[13px] text-[#66716b]'>Keep your projects organized and your next steps in focus.</p>
            </div>
            <Button variant='primary' className='!min-h-[42px] !px-4 !text-[12px]'>+ New project</Button>
          </div>

          <section className='mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
            {statCards.map((card) => (
              <StatCardItem key={card.label} card={card} />
            ))}
          </section>

          <section className='mb-8 flex items-center justify-between gap-4 rounded-xl border border-[#dfe8df] bg-[#f3f8f1] px-5 py-4'>
            <div className='flex items-center gap-3'>
              <span className='flex h-8 w-8 items-center justify-center rounded-lg border border-[#dfe7df] bg-white text-[#24664c]'>!</span>
              <div>
                <h2 className='text-[13px] font-semibold text-[#1d2b28]'>Small checks. Smoother next steps.</h2>
                <p className='mt-1 text-[12px] text-[#66716b]'>4 sample review items need attention across 2 projects.</p>
              </div>
            </div>
            <Button variant='ghost' size='sm' className='!text-[11px] !font-semibold'>Review open items →</Button>
          </section>

          <div className='grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_290px]'>
            <section>
              <div className='mb-4 flex items-center justify-between'>
                <div className='flex items-center gap-3'>
                  <h2 className='text-[18px] font-semibold tracking-[-0.04em] text-[#1d2c28]'>Your projects</h2>
                  <span className='rounded-md bg-[#f4f7f4] px-2 py-1 text-[10px] font-medium text-[#66716b]'>4</span>
                </div>
                <button className='inline-flex items-center gap-2 text-[11px] text-[#66716b]'>
                  <span>⤓</span>
                  Export summary
                </button>
              </div>

              <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                <div className='flex gap-2 rounded-lg bg-[#f5f7f5] p-1'>
                  <button className='rounded-md bg-white px-3 py-1.5 text-[11px] text-[#1d2b27] shadow-sm'>All projects</button>
                  <button className='rounded-md px-3 py-1.5 text-[11px] text-[#66716b]'>Needs attention</button>
                  <button className='rounded-md px-3 py-1.5 text-[11px] text-[#66716b]'>Drafts</button>
                </div>

                <div className='min-w-[180px] md:max-w-[220px]'>
                  <Input placeholder='Search projects…' className='!h-10 !rounded-lg !border-[#e2e8e2] !text-[12px] !placeholder:text-[#8a938d]' />
                </div>
              </div>

              <div className='grid gap-4 md:grid-cols-2'>
                {projectData.map((project) => (
                  <ProjectCard key={project.id} project={project} />
                ))}
              </div>
            </section>

            <aside className='rounded-xl border border-[#e5e9e5] bg-white p-0'>
              <div className='flex items-center justify-between border-b border-[#ecefe9] px-4 py-3'>
                <h3 className='text-[12px] font-semibold text-[#1f2a27]'>Recent activity</h3>
                <span className='text-[#66716b]'>◔</span>
              </div>

              <div className='space-y-4 p-4'>
                {activityItems.map((item, index) => (
                  <ActivityRow key={item.title} item={item} index={index} />
                ))}
              </div>
            </aside>
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardPage;
