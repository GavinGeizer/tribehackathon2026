import { useState } from 'react';

const Header = () => {
	const [mobileNavOpen, setMobileNavOpen] = useState<boolean>(false);

	return (
		<header className='sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur-md'>
			<div className='wrap flex h-20 items-center justify-between gap-6'>
				<a href='#' className='flex items-center gap-2 text-xl font-semibold tracking-[-0.06em]' aria-label='PermitPath home'>
					<svg className='h-8 w-8 text-brand' aria-hidden='true'>
						<use href='#mark' />
					</svg>
					PermitPath
					<span className='ml-1 hidden rounded border border-line px-1.5 py-0.5 text-[9px] font-medium tracking-wide text-muted sm:block'>BETA</span>
				</a>

				<nav className='hidden items-center gap-8 text-[13px] text-muted md:flex' aria-label='Main navigation'>
					<a className='hover:text-ink' href='#platform'>
						Platform
					</a>
					<a className='hover:text-ink' href='#how-it-works'>
						How it works
					</a>
					<a className='hover:text-ink' href='#faq'>
						FAQs
					</a>
				</nav>

				<a href='#workspace' className='btn btn-primary hidden min-h-10 px-4 text-xs sm:inline-flex'>
					Explore the demo
					<svg className='icon !h-4 !w-4' aria-hidden='true'>
						<use href='#arrow' />
					</svg>
				</a>

				<button id='menu-toggle' className='rounded-lg border border-line p-2 sm:hidden' aria-label={mobileNavOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={mobileNavOpen} aria-controls='mobile-nav' onClick={() => setMobileNavOpen((prev) => !prev)}>
					<svg className='icon' viewBox='0 0 24 24'>
						<path d='M4 7h16M4 12h16M4 17h16' />
					</svg>
				</button>
			</div>

			<nav id='mobile-nav' hidden={!mobileNavOpen} className='border-t border-line px-6 py-5 text-sm' aria-label='Mobile navigation'>
				<div className='flex flex-col gap-5'>
					<a href='#platform'>Platform</a>
					<a href='#how-it-works'>How it works</a>
					<a href='#faq'>FAQs</a>
					<a href='#workspace' className='text-brand'>
						Explore the demo →
					</a>
				</div>
			</nav>
		</header>
	);
};

export { Header };
