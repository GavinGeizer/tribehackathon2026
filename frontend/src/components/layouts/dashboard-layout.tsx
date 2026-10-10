import type { ReactNode } from 'react';

type DashboardLayoutProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  /** Optional controlled view wiring when used around live content. */
  view?: string;
  onViewChange?: (view: 'overview' | 'projects' | 'activity') => void;
  projectCount?: number;
};

const NAV_ITEMS = [
  { id: 'overview', label: 'Overview', target: 'dash-overview' },
  { id: 'projects', label: 'Projects', target: 'dash-projects' },
  { id: 'activity', label: 'Activity', target: 'dash-activity' },
] as const;

function scrollToSection(target: string) {
  document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

const DashboardLayout = ({ title, subtitle, action, children, view, onViewChange, projectCount }: DashboardLayoutProps) => {
  const activeId = view ?? NAV_ITEMS[0].id;
  return (
    <div className='mx-auto max-w-[1400px] px-4 py-8 md:px-6 lg:px-8'>
      <div className='mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
        <div>
          <p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand'>Workspace</p>
          <h1 className='text-3xl font-medium tracking-[-0.05em] md:text-[38px]'>{title}</h1>
          {subtitle ? <p className='mt-2 text-sm leading-6 text-muted'>{subtitle}</p> : null}
        </div>
        {action}
      </div>

      <div className='grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]'>
        <aside className='rounded-2xl border border-line bg-[#f8faf8] p-4' aria-label='Dashboard sections'>
          <div className='mb-5 flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-3'>
            <div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf4ef] text-xs font-semibold text-brand'>NS</div>
            <div>
              <p className='text-[13px] font-semibold'>Workspace</p>
              <p className='text-[11px] text-muted'>Browser-local projects</p>
            </div>
            {typeof projectCount === 'number' ? (
              <span className='ml-auto rounded-md bg-[#f1f5f1] px-1.5 py-0.5 text-[10px] font-medium tabular-nums'>{projectCount}</span>
            ) : null}
          </div>

          <nav className='space-y-2' aria-label='Dashboard sections'>
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => {
                  if (onViewChange && (item.id === 'overview' || item.id === 'projects' || item.id === 'activity')) {
                    onViewChange(item.id);
                  } else {
                    scrollToSection(item.target);
                  }
                }}
                aria-current={activeId === item.id ? 'page' : undefined}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition hover:bg-white ${activeId === item.id ? 'bg-[#edf4ef] font-medium text-brand' : 'text-muted'}`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        <div>{children}</div>
      </div>
    </div>
  );
};

export { DashboardLayout };
