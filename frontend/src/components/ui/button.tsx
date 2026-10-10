import type { ButtonHTMLAttributes, ReactNode } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
	variant?: ButtonVariant;
	size?: ButtonSize;
	leadingIcon?: ReactNode;
	trailingIcon?: ReactNode;
};

const baseClasses = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition duration-200 disabled:cursor-not-allowed disabled:opacity-60';
const variantClasses: Record<ButtonVariant, string> = {
	primary: 'bg-brand text-white hover:bg-[#1d4d3a] active:translate-y-px',
	secondary: 'border border-line bg-white text-ink hover:bg-paper',
	ghost: 'text-brand hover:bg-[#edf4ef]',
};
const sizeClasses: Record<ButtonSize, string> = {
	sm: 'min-h-8 px-3 text-xs',
	md: 'min-h-10 px-4 text-sm',
	lg: 'min-h-12 px-5 text-sm',
};

const Button = ({ variant = 'primary', size = 'md', leadingIcon, trailingIcon, className = '', children, ...props }: ButtonProps) => (
	<button {...props} className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
		{leadingIcon}
		{children}
		{trailingIcon}
	</button>
);

export { Button };
