/** PermitPath logo glyph, shared by the landing page, dashboard and project workspace. */
export function BrandMark({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox='0 0 32 32' aria-hidden='true'>
			<path d='M8 25V7h10a6 6 0 0 1 0 12h-5' stroke='currentColor' strokeWidth='3' fill='none' strokeLinecap='round' />
			<path d='m14 24 3 3 7-7' stroke='currentColor' strokeWidth='2.5' fill='none' strokeLinecap='round' strokeLinejoin='round' />
		</svg>
	);
}
