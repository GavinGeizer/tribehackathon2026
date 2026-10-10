import { DashboardLayout } from '../components/layouts/dashboard-layout';
import { SiteLayout } from '../components/layouts/site-layout';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const projectData = [
  {
    id: 'cafe',
    name: 'The corner café',
    location: 'North End, Halifax',
    type: 'Commercial renovation',
    documents: 8,
    reviewed: 6,
    status: 'Needs attention',
    accent: '#eaf1e7',
    initials: 'CC',
    openItems: 2,
  },
  {
    id: 'studio',
    name: 'Harbour design studio',
    location: 'Downtown, Halifax',
    type: 'Commercial renovation',
    documents: 5,
    reviewed: 3,
    status: 'Needs attention',
    accent: '#edf0f5',
    initials: 'HS',
    openItems: 2,
  },
  {
    id: 'retail',
    name: 'Quinpool retail space',
    location: 'Quinpool Road, Halifax',
    type: 'Commercial renovation',
    documents: 6,
    reviewed: 6,
    status: 'Review complete',
    accent: '#f3ede4',
    initials: 'QR',
    openItems: 0,
  },
  {
    id: 'wellness',
    name: 'West End wellness',
    location: 'West End, Halifax',
    type: 'Commercial renovation',
    documents: 0,
    reviewed: 0,
    status: 'Draft',
    accent: '#f1edf3',
    initials: 'WW',
    openItems: 0,
  },
];

const stats = [
  { label: 'Total projects', value: '4', detail: 'Across your workspace' },
  { label: 'Open review items', value: '4', detail: 'Items awaiting your attention' },
  { label: 'Documents', value: '19', detail: 'In the sample project collection' },
  { label: 'Reviews complete', value: '1', detail: 'Document review, not approval' },
];

const activity = [
  { label: 'Floor plan review updated', project: 'The corner café', time: 'Today · 9:20 AM' },
  { label: 'Project details added', project: 'Harbour design studio', time: 'Today · 8:05 AM' },
  { label: 'Document review completed', project: 'Quinpool retail space', time: 'Yesterday' },
  { label: 'Draft project created', project: 'West End wellness', time: 'Yesterday' },
];

const getBadgeVariant = (status: string) => {
  if (status === 'Review complete') return 'success';
  if (status === 'Needs attention') return 'warning';
  return 'neutral';
};

const DashboardPage = () => {
  return (
    <SiteLayout>
      <div className='bg-[#f5f7f5]'>
        <DashboardLayout
          title='A clearer path starts here.'
          subtitle='Keep your projects organized and your next steps in focus.'
          action={<Button variant='primary'>New project</Button>}
        >
          <div className='space-y-6'>
            <section className='grid gap-3 md:grid-cols-2 xl:grid-cols-4'>
              {stats.map((item) => (
                <div key={item.label} className='rounded-2xl border border-line bg-white p-4 shadow-sm'>
                  <div className='flex items-center justify-between'>
                    <p className='text-[11px] text-muted'>{item.label}</p>
                    <span className='text-brand'>↗</span>
                  </div>
                  <p className='mt-6 text-[30px] font-medium tracking-[-0.05em]'>{item.value}</p>
                  <p className='mt-2 text-[10px] leading-5 text-muted'>{item.detail}</p>
                </div>
              ))}
            </section>

            <section className='rounded-2xl border border-[#dfe7df] bg-[#f4f9f3] p-5'>
              <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
                <div className='flex items-start gap-3'>
                  <span className='flex h-10 w-10 items-center justify-center rounded-xl border border-[#dce7d8] bg-white text-brand'>!</span>
                  <div>
                    <h2 className='text-sm font-semibold'>Small checks. Smoother next steps.</h2>
                    <p className='mt-1 text-xs leading-5 text-muted'>4 sample review items need attention across 2 projects.</p>
                  </div>
                </div>
                <Button variant='ghost'>Review open items →</Button>
              </div>
            </section>

            <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_320px]'>
              <section className='rounded-2xl border border-line bg-white p-5'>
                <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div className='flex items-center gap-3'>
                    <h2 className='text-lg font-semibold'>Your projects</h2>
                    <span className='rounded-md bg-paper px-2 py-1 text-[10px] text-muted'>{projectData.length}</span>
                  </div>
                  <Button variant='secondary' size='sm'>Export summary</Button>
                </div>

                <div className='mb-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between'>
                  <div className='flex gap-2 rounded-lg bg-paper p-1'>
                    <Button variant='ghost' size='sm' className='bg-white shadow-sm'>All projects</Button>
                    <Button variant='ghost' size='sm'>Needs attention</Button>
                    <Button variant='ghost' size='sm'>Drafts</Button>
                  </div>
                  <div className='w-full md:max-w-[240px]'>
                    <Input placeholder='Search projects…' />
                  </div>
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  {projectData.map((project) => {
                    const reviewPercent = project.documents ? Math.round((project.reviewed / project.documents) * 100) : 0;
                    return (
                      <article key={project.id} className='rounded-2xl border border-line bg-[#fcfdfc] p-5'>
                        <div className='mb-5 flex items-center justify-between'>
                          <div className='flex h-11 w-11 items-center justify-center rounded-xl text-xs font-semibold' style={{ background: project.accent }}>
                            {project.initials}
                          </div>
                          <Badge variant={getBadgeVariant(project.status)}>{project.status}</Badge>
                        </div>

                        <h3 className='text-lg font-semibold tracking-tight'>{project.name}</h3>
                        <p className='mt-1 text-[11px] text-muted'>{project.location}</p>
                        <div className='mt-4 inline-flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[10px] text-muted'>
                          <span className='h-2 w-2 rounded-full bg-brand' />
                          {project.type}
                        </div>

                        <div className='mt-5 flex items-center justify-between text-[10px]'>
                          <span className='text-muted'>Document review</span>
                          <span className='font-medium'>
                            {project.reviewed} / {project.documents}
                          </span>
                        </div>
                        <div className='mt-2 h-1.5 overflow-hidden rounded-full bg-[#edf0ee]'>
                          <div className='h-full rounded-full bg-brand' style={{ width: `${reviewPercent}%` }} />
                        </div>

                        <div className='mt-5 flex items-center justify-between border-t border-line pt-4'>
                          <p className='text-[10px] text-muted'>
                            {project.openItems > 0 ? `${project.openItems} open items` : project.documents > 0 ? 'Review complete' : 'Project details started'}
                          </p>
                          <Button variant='ghost' size='sm'>Open project</Button>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>

              <aside className='space-y-6'>
                <div className='rounded-2xl border border-line bg-white'>
                  <div className='flex items-center justify-between border-b border-line px-5 py-4'>
                    <h2 className='text-sm font-semibold'>Recent activity</h2>
                    <span className='text-muted'>◔</span>
                  </div>
                  <div className='space-y-4 px-5 py-4'>
                    {activity.map((item) => (
                      <div key={item.label} className='flex items-start gap-3 border-b border-line pb-4 last:border-none last:pb-0'>
                        <span className='mt-0.5 flex h-7 w-7 items-center justify-center rounded-full bg-paper text-brand'>✓</span>
                        <div>
                          <p className='text-[11px] font-medium'>{item.label}</p>
                          <p className='mt-1 text-[10px] text-muted'>{item.project}</p>
                          <p className='mt-1 text-[9px] text-muted'>{item.time}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className='rounded-2xl border border-line bg-white p-5'>
                  <div className='mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-paper text-brand'>
                    <span>▣</span>
                  </div>
                  <p className='text-[9px] font-semibold uppercase tracking-[0.15em] text-muted'>The PermitPath approach</p>
                  <h3 className='mt-3 text-base font-semibold'>Know what’s behind each check.</h3>
                  <p className='mt-2 text-xs leading-6 text-muted'>Keep requirements, supporting evidence, and unresolved questions connected throughout preparation.</p>
                  <Button variant='ghost' className='mt-4'>How this demo works →</Button>
                </div>
              </aside>
            </div>
          </div>
        </DashboardLayout>
      </div>
    </SiteLayout>
  );
};

export default DashboardPage;
