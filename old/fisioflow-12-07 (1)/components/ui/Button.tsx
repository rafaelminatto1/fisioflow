

import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({ variant = 'primary', size = 'md', isLoading = false, children, icon, className, ...props }, ref) => {
        const baseStyles = 'inline-flex items-center justify-center rounded-md font-semibold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 transform-gpu';
        
        const variantStyles = {
            primary: 'bg-blue-600 text-white hover:bg-blue-500 focus:ring-blue-500 disabled:bg-blue-800/50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-blue-500/20 hover:-translate-y-px active:translate-y-0',
            secondary: 'bg-slate-700 text-slate-300 hover:bg-slate-600 focus:ring-slate-500 disabled:bg-slate-700/50 disabled:cursor-not-allowed',
            danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 disabled:bg-red-800/50 disabled:cursor-not-allowed shadow-sm hover:shadow-md hover:shadow-red-500/20 hover:-translate-y-px active:translate-y-0',
            ghost: 'text-slate-300 hover:bg-slate-700 hover:text-white focus:ring-slate-500'
        };
        
        const sizeStyles = {
            sm: 'px-2 py-1 text-xs',
            md: 'px-4 py-2 text-sm',
            lg: 'px-6 py-3 text-base',
        };

        const spinner = (
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
        );

        return (
            <button
                ref={ref}
                className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
                disabled={isLoading || props.disabled}
                {...props}
            >
                {isLoading && spinner}
                {icon && !isLoading && <span className={children ? "mr-2" : ""}>{icon}</span>}
                {children}
            </button>
        );
    }
);

export default Button;
