import type { ReactNode } from 'react';

type DashboardLayoutProps = {
	title: string;
	subtitle?: string;
	action?: ReactNode;
	children: ReactNode;
};

const DashboardLayout = ({ title, subtitle, action, children }: DashboardLayoutProps) => {
	return (
		<div className='mx-auto max-w-[1400px] px-4 py-8 md:px-6 lg:px-8'>
			<div className='mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between'>
				<div>
					<p className='mb-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-brand'>Workspace</p>
					<h1 className='text-3xl font-medium tracking-[-0.05em] md:text-[38px]'>{title}</h1>
					{subtitle ? <p className='mt-2 text-sm text-muted'>{subtitle}</p> : null}
				</div>
				{action}
			</div>

			<div className='grid gap-6 xl:grid-cols-[240px_minmax(0,1fr)]'>
				<aside className='rounded-2xl border border-line bg-[#f8faf8] p-4'>
					<div className='mb-5 flex items-center gap-3 rounded-xl border border-line bg-white px-3 py-3'>
						<div className='flex h-9 w-9 items-center justify-center rounded-lg bg-[#edf4ef] text-xs font-semibold text-brand'>NS</div>
						<div>
							<p className='text-xs font-semibold'>North Studio</p>
							<p className='text-[10px] text-muted'>Demo workspace</p>
						</div>
					</div>

					<nav className='space-y-2'>
						<a href='#' className='flex items-center gap-3 rounded-lg bg-[#edf4ef] px-3 py-2.5 text-sm font-medium text-brand'>
							Overview
						</a>
						<a href='#' className='flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white'>
							Projects
						</a>
						<a href='#' className='flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-muted hover:bg-white'>
							Activity
						</a>
					</nav>
				</aside>

				<div>{children}</div>
			</div>
		</div>
	);
};

export { DashboardLayout };
