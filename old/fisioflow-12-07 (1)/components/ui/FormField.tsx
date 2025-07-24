
import React from 'react';

type CommonProps = {
    name: string;
    label: string;
    error?: string;
    className?: string;
    containerClassName?: string;
};

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
    as?: 'input';
};

type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & {
    as: 'textarea';
};

type SelectProps = React.SelectHTMLAttributes<HTMLSelectElement> & {
    as: 'select';
    children: React.ReactNode;
};

type FormFieldProps = CommonProps & (InputProps | TextareaProps | SelectProps);

const FormField = React.forwardRef<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
    FormFieldProps
>(({
    label,
    name,
    error,
    className,
    containerClassName,
    ...props
}, ref) => {
    const baseInputStyles = `w-full bg-slate-900 border rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-slate-700 disabled:cursor-not-allowed`;
    const errorStyles = 'border-red-500';
    const normalStyles = 'border-slate-600';

    const renderInput = () => {
        const inputClassName = `${baseInputStyles} ${error ? errorStyles : normalStyles} ${className}`;
        
        if (props.as === 'textarea') {
            return <textarea id={name} name={name} className={inputClassName} ref={ref as React.Ref<HTMLTextAreaElement>} {...props} />;
        }
        if (props.as === 'select') {
            return <select id={name} name={name} className={inputClassName} ref={ref as React.Ref<HTMLSelectElement>} {...props} />;
        }
        return <input id={name} name={name} className={inputClassName} ref={ref as React.Ref<HTMLInputElement>} {...props} />;
    };

    return (
        <div className={`space-y-2 ${containerClassName}`}>
            <label htmlFor={name} className="text-sm font-medium text-slate-300">
                {label}
            </label>
            {renderInput()}
            {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
        </div>
    );
});

export default FormField;
