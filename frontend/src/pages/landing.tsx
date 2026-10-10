import { useRef, useState } from 'react';

const LandingPage = () => {
	const dialogRef = useRef<HTMLDialogElement | null>(null);
	const [reviewed, setReviewed] = useState(false);

	const handleReviewClick = () => {
		if (reviewed) {
			setReviewed(false);
			return;
		}

		dialogRef.current?.showModal();
	};

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

	const reviewCount = reviewed ? '3' : '2';
	const progressWidth = reviewed ? '100%' : '66.6667%';
	const statusText = reviewed ? '✓ Reviewed' : 'Needs review';
	const statusColor = reviewed ? '#24664c' : '#886021';
	const actionTitle = reviewed ? 'Sample review complete' : 'One item to look at';
	const actionCopy = reviewed ? 'All three sample documents have been marked reviewed. This does not indicate permit approval.' : 'Confirm that the project details match your latest scope of work.';
	const reviewButtonLabel = reviewed ? 'Reset example ↺' : 'Review item →';

	return (
		<div>
			<svg xmlns='http://www.w3.org/2000/svg' className='hidden' aria-hidden='true'>
				<symbol id='arrow' viewBox='0 0 24 24'>
					<path d='M5 12h14m-5-5 5 5-5 5' />
				</symbol>
				<symbol id='check' viewBox='0 0 24 24'>
					<path d='m5 12 4 4L19 6' />
				</symbol>
				<symbol id='file' viewBox='0 0 24 24'>
					<path d='M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8zM14 3v5h5M9 12h6m-6 4h6' />
				</symbol>
				<symbol id='grid' viewBox='0 0 24 24'>
					<rect x='4' y='4' width='6' height='6' rx='1' />
					<rect x='14' y='4' width='6' height='6' rx='1' />
					<rect x='4' y='14' width='6' height='6' rx='1' />
					<rect x='14' y='14' width='6' height='6' rx='1' />
				</symbol>
				<symbol id='link' viewBox='0 0 24 24'>
					<path d='m10 13 4-4m-6 6-2 2a4 4 0 0 1-6-6l4-4a4 4 0 0 1 6 0m4 2 2-2a4 4 0 0 0-6-6L6 9' transform='translate(3 2)' />
				</symbol>
				<symbol id='shield' viewBox='0 0 24 24'>
					<path d='m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z' />
					<path d='m8 12 3 3 5-6' />
				</symbol>
				<symbol id='mark' viewBox='0 0 32 32'>
					<path d='M8 25V7h10a6 6 0 0 1 0 12h-5' stroke='currentColor' strokeWidth='3' fill='none' strokeLinecap='round' />
					<path d='m14 24 3 3 7-7' stroke='currentColor' strokeWidth='2.5' fill='none' strokeLinecap='round' strokeLinejoin='round' />
				</symbol>
			</svg>

			<a href='#main' className='sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-white focus:p-4'>
				Skip to content
			</a>

			<main id='main'>
				<section className='wrap pt-16 md:pt-24'>
					<div className='mx-auto max-w-[800px] text-center'>
						<div className='mb-7 inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-[11px] font-medium text-muted'>
							<span className='h-1.5 w-1.5 rounded-full bg-brand' />
							Built for commercial renovations in Halifax <span className='pl-1 text-brand'>↗</span>
						</div>
						<h1 className='text-[44px] font-medium leading-[1.07] tracking-[-0.065em] sm:text-6xl md:text-[76px]'>
							From paperwork
							<br />
							to <span className='text-brand'>permit-ready.</span>
						</h1>
						<p className='mx-auto mt-6 max-w-[560px] text-[16px] leading-7 text-muted md:text-[17px]'>Bring clarity to your next permit application. Organize your documents, understand what’s missing, and move forward with a clear plan.</p>
						<div className='mt-8 flex flex-col justify-center gap-3 sm:flex-row'>
							<a href='#workspace' className='btn btn-primary'>
								Explore the demo
								<svg className='icon !h-4 !w-4' aria-hidden='true'>
									<use href='#arrow' />
								</svg>
							</a>
							<a href='#how-it-works' className='btn btn-secondary'>
								See how it works <span aria-hidden='true'>↓</span>
							</a>
						</div>
						<p className='mt-4 text-[11px] text-muted'>A clearer path for contractors, architects, and permit consultants.</p>
					</div>

					{/* Illustrative interface: no real regulatory assessment is performed. */}
					<div id='workspace' className='relative mt-14 rounded-2xl border border-line bg-paper p-2.5 md:mt-16 md:p-3.5'>
						<div className='overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_50px_-30px_rgba(24,36,32,0.25)]'>
							<div className='flex items-center justify-between border-b border-line px-5 py-3 text-[10px] text-muted'>
								<span className='flex items-center gap-1.5'>
									<span className='h-2 w-2 rounded-full bg-[#dce2dc]' />
									<span className='h-2 w-2 rounded-full bg-[#dce2dc]' />
									<span className='h-2 w-2 rounded-full bg-[#dce2dc]' />
								</span>
								<span>PermitPath / Project workspace</span>
								<span className='rounded bg-paper px-2 py-1 text-[9px] uppercase tracking-wider'>Sample project</span>
							</div>

							<div className='flex'>
								<aside className='hidden w-48 shrink-0 border-r border-line bg-[#fcfdfc] p-4 lg:block' aria-label='Demo sidebar'>
									<div className='mb-7 flex items-center gap-2 px-2 text-xs font-semibold'>
										<span className='flex h-7 w-7 items-center justify-center rounded-md bg-[#e8ede9] text-[10px]'>NS</span>
										North Studio <span className='ml-auto text-muted'>⌄</span>
									</div>
									<div className='mb-2 px-2 text-[9px] uppercase tracking-widest text-muted'>Workspace</div>
									<a href='#workspace' className='flex items-center gap-2 rounded-md bg-[#eaf1ec] px-3 py-2.5 text-[11px] font-medium text-brand'>
										<svg className='icon !h-4 !w-4'>
											<use href='#grid' />
										</svg>
										Projects <span className='ml-auto'>1</span>
									</a>
									<div className='mt-36 rounded-lg border border-line p-3'>
										<svg className='icon mb-2 text-brand'>
											<use href='#shield' />
										</svg>
										<p className='text-[10px] font-medium'>Clarity at every step.</p>
										<p className='mt-1 text-[10px] leading-4 text-muted'>Requirements, evidence, and next steps. Together.</p>
									</div>
								</aside>

								<div className='min-w-0 flex-1 p-5 md:p-8'>
									<div className='mb-5 text-[10px] text-muted'>
										Projects <span className='mx-2 text-[#bbc3bc]'>/</span> Commercial renovation
									</div>

									<div className='flex flex-wrap items-center justify-between gap-3'>
										<div>
											<h2 className='text-xl font-semibold tracking-[-0.035em]'>The corner café</h2>
											<p className='mt-1.5 text-[11px] text-muted'>
												Halifax, Nova Scotia <span className='mx-1'>·</span> Commercial renovation
											</p>
										</div>
										<span className='rounded-full border border-[#e6dac1] bg-[#fbf7ef] px-2.5 py-1 text-[10px] text-[#886021]'>In preparation</span>
									</div>

									<div className='mt-6 grid gap-5 md:grid-cols-[1fr_220px]'>
										<div>
											<div className='flex items-center justify-between border-b border-line pb-3'>
												<h3 className='text-xs font-semibold'>Document overview</h3>
												<span className='text-[10px] text-muted'>3 sample documents</span>
											</div>

											<div className='divide-y divide-line'>
												<div className='flex items-center gap-3 py-4'>
													<span className='rounded-md border border-line p-2 text-muted'>
														<svg className='icon !h-4 !w-4'>
															<use href='#file' />
														</svg>
													</span>
													<div className='min-w-0 flex-1'>
														<p className='truncate text-[11px] font-medium'>Project description.pdf</p>
														<p className='mt-1 text-[10px] text-muted'>Project scope</p>
													</div>
													<span className='text-[10px] text-brand'>✓ Reviewed</span>
												</div>

												<div className='flex items-center gap-3 py-4'>
													<span className='rounded-md border border-line p-2 text-muted'>
														<svg className='icon !h-4 !w-4'>
															<use href='#file' />
														</svg>
													</span>
													<div className='min-w-0 flex-1'>
														<p className='truncate text-[11px] font-medium'>Proposed floor plan.pdf</p>
														<p className='mt-1 text-[10px] text-muted'>Design documents</p>
													</div>
													<span className='text-[10px] text-brand'>✓ Reviewed</span>
												</div>

												<div className='flex items-center gap-3 py-4'>
													<span className='rounded-md border border-line p-2 text-muted'>
														<svg className='icon !h-4 !w-4'>
															<use href='#file' />
														</svg>
													</span>
													<div className='min-w-0 flex-1'>
														<p className='truncate text-[11px] font-medium'>Project details.pdf</p>
														<p className='mt-1 text-[10px] text-muted'>Supporting information</p>
													</div>
													<span id='document-status' style={{ color: statusColor }} className='text-[10px]'>
														{statusText}
													</span>
												</div>
											</div>

											<div className='mt-2 flex items-start gap-2 rounded-lg bg-paper px-3 py-2.5 text-[10px] leading-4 text-muted'>
												<svg className='icon !h-4 !w-4 shrink-0 text-brand'>
													<use href='#link' />
												</svg>
												Keep each finding connected to its requirement and supporting evidence.
											</div>
										</div>

										<div className='rounded-lg border border-line p-4'>
											<div className='flex items-center justify-between'>
												<h3 className='text-[11px] font-semibold'>Readiness overview</h3>
												<span className='text-muted' aria-hidden='true'>
													↗
												</span>
											</div>

											<p className='mt-5 text-[28px] font-medium tracking-[-0.05em]'>
												<span>{reviewCount}</span>
												<span className='text-lg text-[#96a199]'> / 3</span>
											</p>
											<p className='mt-1 text-[10px] text-muted'>sample documents reviewed</p>

											<div className='mt-3 h-1.5 overflow-hidden rounded-full bg-[#e9eee9]'>
												<div className='h-full rounded-full bg-brand transition-all' style={{ width: progressWidth }} />
											</div>

											<div className='mt-5 border-t border-line pt-4'>
												<p className='text-[11px] font-medium'>{actionTitle}</p>
												<p className='mt-2 text-[10px] leading-[1.7] text-muted'>{actionCopy}</p>
												<button id='review-button' type='button' className='mt-3 flex w-full items-center justify-between rounded-md border border-line px-3 py-2 text-[10px] font-medium hover:bg-paper' onClick={handleReviewClick}>
													{reviewButtonLabel}
													<span aria-hidden='true'>{reviewed ? '↺' : '→'}</span>
												</button>
											</div>
										</div>
									</div>

									<p className='mt-5 text-[9px] leading-4 text-muted'>Illustrative demo only. Document review is not a compliance assessment or a guarantee of permit approval.</p>
								</div>
							</div>
						</div>
					</div>

					<div className='flex flex-col items-center justify-between gap-5 border-b border-line py-8 md:flex-row'>
						<p className='text-xs text-muted'>Built around the way your team works.</p>
						<div className='flex flex-wrap justify-center gap-x-8 gap-y-3 text-xs font-medium text-[#59675f]'>
							<span>Contractors</span>
							<span>Architects</span>
							<span>Renovation teams</span>
							<span>Permit consultants</span>
						</div>
					</div>
				</section>

				<section id='platform' className='wrap py-20 md:py-24'>
					<div className='flex flex-col justify-between gap-5 md:flex-row md:items-end'>
						<div>
							<p className='eyebrow mb-4'>Less guesswork. More clarity.</p>
							<h2 className='section-title'>
								Everything in place.
								<br />
								Nothing left to guess.
							</h2>
						</div>
						<p className='max-w-[360px] text-sm leading-6 text-muted'>Turn scattered documents and complex requirements into a preparation workflow your whole team can follow.</p>
					</div>

					<div className='mt-10 grid gap-4 md:grid-cols-3'>
						<article className='rounded-xl border border-line p-7'>
							<span className='mb-7 flex h-10 w-10 items-center justify-center rounded-lg bg-paper text-brand'>
								<svg className='icon'>
									<use href='#file' />
								</svg>
							</span>
							<h3 className='text-[17px] font-semibold tracking-tight'>One organized workspace.</h3>
							<p className='mt-3 text-sm leading-6 text-muted'>Keep your scope, plans, and supporting files together. Give every document a place and every project a clear view.</p>
							<div className='mt-7 flex items-center gap-2 border-t border-line pt-4 text-[11px] font-medium text-brand'>
								<svg className='icon !h-3.5 !w-3.5'>
									<use href='#check' />
								</svg>
								Project details, connected
							</div>
						</article>

						<article className='rounded-xl border border-line p-7'>
							<span className='mb-7 flex h-10 w-10 items-center justify-center rounded-lg bg-paper text-brand'>
								<svg className='icon'>
									<use href='#link' />
								</svg>
							</span>
							<h3 className='text-[17px] font-semibold tracking-tight'>Context behind every check.</h3>
							<p className='mt-3 text-sm leading-6 text-muted'>Understand the why behind a requirement, with official source references and evidence you can trace back.</p>
							<div className='mt-7 flex items-center gap-2 border-t border-line pt-4 text-[11px] font-medium text-brand'>
								<svg className='icon !h-3.5 !w-3.5'>
									<use href='#check' />
								</svg>
								Source-backed preparation
							</div>
						</article>

						<article className='rounded-xl border border-line p-7'>
							<span className='mb-7 flex h-10 w-10 items-center justify-center rounded-lg bg-paper text-brand'>
								<svg className='icon'>
									<use href='#shield' />
								</svg>
							</span>
							<h3 className='text-[17px] font-semibold tracking-tight'>A clear next step.</h3>
							<p className='mt-3 text-sm leading-6 text-muted'>See missing information, unresolved questions, and items needing professional review before you submit.</p>
							<div className='mt-7 flex items-center gap-2 border-t border-line pt-4 text-[11px] font-medium text-brand'>
								<svg className='icon !h-3.5 !w-3.5'>
									<use href='#check' />
								</svg>
								Actionable readiness reports
							</div>
						</article>
					</div>
				</section>

				<section id='how-it-works' className='border-y border-line bg-[#fafbf9]'>
					<div className='wrap grid gap-12 py-20 md:grid-cols-[0.9fr_1.1fr] md:gap-24 md:py-24'>
						<div>
							<p className='eyebrow mb-4'>A simpler process</p>
							<h2 className='section-title'>
								Your next application.
								<br />A clearer path.
							</h2>
							<p className='mt-5 max-w-sm text-sm leading-6 text-muted'>From the first project detail to the final preparation report. Know where you stand at every step.</p>
							<a href='#workspace' className='mt-7 inline-flex items-center gap-3 text-sm font-semibold text-brand'>
								Take a look inside{' '}
								<svg className='icon !h-4 !w-4'>
									<use href='#arrow' />
								</svg>
							</a>
						</div>

						<ol className='space-y-8'>
							<li className='flex gap-5'>
								<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-xs text-brand'>01</span>
								<div>
									<h3 className='text-base font-semibold tracking-tight'>Tell us about your project</h3>
									<p className='mt-2 text-sm leading-6 text-muted'>Start with your location, renovation scope, and project details to put your application in context.</p>
								</div>
							</li>

							<li className='flex gap-5'>
								<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line bg-white text-xs text-brand'>02</span>
								<div>
									<h3 className='text-base font-semibold tracking-tight'>Bring your documents together</h3>
									<p className='mt-2 text-sm leading-6 text-muted'>Add your supporting files and review how the available evidence matches applicable requirements.</p>
								</div>
							</li>

							<li className='flex gap-5'>
								<span className='flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-brand bg-brand text-xs text-white'>03</span>
								<div>
									<h3 className='text-base font-semibold tracking-tight'>Resolve gaps. Prepare with confidence.</h3>
									<p className='mt-2 text-sm leading-6 text-muted'>Work through findings and organize a readiness report before submitting through the municipal portal.</p>
								</div>
							</li>
						</ol>
					</div>
				</section>

				<section id='faq' className='wrap grid gap-10 py-20 md:grid-cols-[0.85fr_1.15fr] md:gap-24 md:py-24'>
					<div>
						<p className='eyebrow mb-4'>Good questions</p>
						<h2 className='section-title'>A little more clarity.</h2>
						<p className='mt-5 text-sm leading-6 text-muted'>What to know before you get started.</p>
					</div>

					<div className='divide-y divide-line border-y border-line'>
						<details className='py-5' open>
							<summary className='flex items-center justify-between gap-5 text-sm font-medium'>
								What is PermitPath?
								<span className='plus text-xl font-normal text-muted transition-transform'>+</span>
							</summary>
							<p className='mt-3 pr-7 text-sm leading-6 text-muted'>PermitPath is a prototype for organizing and checking permit application documents before submission. It is designed to help professional teams identify gaps and understand their next steps.</p>
						</details>

						<details className='py-5'>
							<summary className='flex items-center justify-between gap-5 text-sm font-medium'>
								Which projects is it designed for?
								<span className='plus text-xl font-normal text-muted transition-transform'>+</span>
							</summary>
							<p className='mt-3 pr-7 text-sm leading-6 text-muted'>The initial focus is commercial renovation permit preparation in Halifax Regional Municipality, Nova Scotia. Other jurisdictions and permit categories are outside the initial scope.</p>
						</details>

						<details className='py-5'>
							<summary className='flex items-center justify-between gap-5 text-sm font-medium'>
								Does PermitPath approve or submit permits?
								<span className='plus text-xl font-normal text-muted transition-transform'>+</span>
							</summary>
							<p className='mt-3 pr-7 text-sm leading-6 text-muted'>No. Applications are submitted through the municipality’s own process. PermitPath does not issue permits, guarantee approval, or replace architects, engineers, or other qualified professionals.</p>
						</details>

						<details className='py-5'>
							<summary className='flex items-center justify-between gap-5 text-sm font-medium'>
								Can I upload documents on this page?
								<span className='plus text-xl font-normal text-muted transition-transform'>+</span>
							</summary>
							<p className='mt-3 pr-7 text-sm leading-6 text-muted'>This landing page includes a sample workspace only. The interactive example uses fictional project information; it does not upload files or perform a regulatory assessment.</p>
						</details>
					</div>
				</section>

				<section className='wrap pb-20'>
					<div className='relative overflow-hidden rounded-2xl border border-[#dde7df] bg-[#f3f7f3] px-6 py-14 text-center md:py-16'>
						<p className='eyebrow mb-4'>Make room for the actual work</p>
						<h2 className='section-title'>
							Less paperwork friction.
							<br />
							More forward progress.
						</h2>
						<p className='mx-auto mt-5 max-w-md text-sm leading-6 text-muted'>A more organized application starts with a clearer picture of what’s ready—and what needs attention.</p>
						<a href='#workspace' className='btn btn-primary mt-7'>
							Explore PermitPath
							<svg className='icon !h-4 !w-4'>
								<use href='#arrow' />
							</svg>
						</a>
					</div>
				</section>
			</main>

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
					onClick={() => {
						setReviewed(true);
						dialogRef.current?.close();
					}}>
					Mark sample as reviewed
					<svg className='icon !h-4 !w-4'>
						<use href='#check' />
					</svg>
				</button>
			</dialog>
		</div>
	);
};

export { LandingPage };
