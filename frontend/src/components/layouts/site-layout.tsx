import type { ReactNode } from 'react';
import { Footer } from '../footer';
import { Header } from '../header';

type SiteLayoutProps = {
	children: ReactNode;
};

const SiteLayout = ({ children }: SiteLayoutProps) => {
	return (
		<div className='flex min-h-screen flex-col bg-white'>
			<Header />
			<main className='flex-1'>{children}</main>
			<Footer />
		</div>
	);
};

export { SiteLayout };
