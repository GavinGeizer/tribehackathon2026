import { useRef, useState } from 'react';

const Footer = () => {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const [reviewed, setReviewed] = useState(false);

	const handleDialogClick = (event: React.MouseEvent<HTMLDialogElement>) => {
		const dialog = dialogRef.current;
		if (!dialog || event.target !== dialog) {
			return;
		}

		const { left, right, top, bottom } = dialog.getBoundingClientRect();
		if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) {
			dialog.close();
		}
	};

	return (
		<div>
			<footer className='border-t border-line'>
				<div className='wrap py-9'>
					<div className='flex flex-col justify-between gap-5 sm:flex-row sm:items-center'>
						<a href='#' className='flex items-center gap-2 text-lg font-semibold tracking-[-0.05em]'>
							<svg className='h-7 w-7 text-brand' aria-hidden='true'>
								<use href='#mark' />
							</svg>
							PermitPath
						</a>
						<div className='flex gap-6 text-xs text-muted'>
							<a href='#platform' className='hover:text-brand'>
								Platform
							</a>
							<a href='#how-it-works' className='hover:text-brand'>
								How it works
							</a>
							<a href='#faq' className='hover:text-brand'>
								FAQs
							</a>
						</div>
					</div>

					<div className='mt-7 flex flex-col justify-between gap-3 border-t border-line pt-5 text-[10px] leading-5 text-muted'>
						<p>Independent permit preparation prototype. Not affiliated with Halifax Regional Municipality. No guarantee of regulatory compliance or permit approval.</p>
						<p>© {new Date().getFullYear()} PermitPath. From paperwork to permit-ready.</p>
					</div>
				</div>
			</footer>

			<dialog ref={dialogRef} id='review-dialog' aria-labelledby='dialog-title' className='fixed inset-0 m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-line bg-white p-7 text-ink shadow-xl backdrop:bg-ink/30' onClick={handleDialogClick}>
				<div className='flex items-center justify-between'>
					<p className='eyebrow'>Sample document review</p>
					<button id='close-dialog' type='button' aria-label='Close review' className='rounded p-1 text-xl text-muted' onClick={() => dialogRef.current?.close()}>
						×
					</button>
				</div>

				<h2 id='dialog-title' className='mt-5 text-xl font-semibold tracking-tight'>
					Confirm the project scope
				</h2>
				<p className='mt-3 text-sm leading-6 text-muted'>In this fictional example, the project details need a final check against the latest renovation scope.</p>

				<div className='my-5 rounded-lg bg-paper p-4 text-sm leading-6'>
					<p className='font-medium'>The corner café</p>
					<p className='mt-1 text-muted'>Interior commercial renovation in Halifax. Review the project description and supporting plans for consistency.</p>
				</div>

				<p className='mb-5 text-xs leading-5 text-muted'>This action updates the sample interface only. No documents are analyzed or submitted.</p>

				<button
					id='confirm-review'
					type='button'
					className='btn btn-primary w-full'
					disabled={reviewed}
					onClick={() => {
						setReviewed(true);
						dialogRef.current?.close();
					}}>
					{reviewed ? 'Sample reviewed' : 'Mark sample as reviewed'}
					<svg className='icon !h-4 !w-4'>
						<use href='#check' />
					</svg>
				</button>
			</dialog>
		</div>
	);
};

export { Footer };
