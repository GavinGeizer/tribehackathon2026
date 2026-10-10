import type { ReactNode } from 'react';

type BadgeVariant = 'neutral' | 'success' | 'warning' | 'brand';

type BadgeProps = {
	children: ReactNode;
	variant?: BadgeVariant;
	className?: string;
};

const variantClasses: Record<BadgeVariant, string> = {
	neutral: 'bg-[#f3f6f3] text-muted',
	success: 'bg-[#edf5ee] text-brand',
	warning: 'bg-[#faf3e8] text-[#8d6825]',
	brand: 'bg-[#edf4ef] text-brand',
};

const Badge = ({ children, variant = 'neutral', className = '' }: BadgeProps) => <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-medium ${variantClasses[variant]} ${className}`}>{children}</span>;

export { Badge };
