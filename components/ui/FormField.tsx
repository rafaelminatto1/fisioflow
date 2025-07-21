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

const FormField: React.FC<FormFieldProps> = ({
  label,
  name,
  error,
  className,
  containerClassName,
  ...props
}) => {
  const baseInputStyles = `w-full bg-slate-900 border rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition disabled:bg-slate-700 disabled:cursor-not-allowed`;
  const errorStyles = 'border-red-500';
  const normalStyles = 'border-slate-600';

  const renderInput = () => {
    const inputClassName = `${baseInputStyles} ${error ? errorStyles : normalStyles} ${className}`;

    if (props.as === 'textarea') {
      return (
        <textarea id={name} name={name} className={inputClassName} {...props} />
      );
    }
    if (props.as === 'select') {
      return (
        <select id={name} name={name} className={inputClassName} {...props} />
      );
    }
    return (
      <input id={name} name={name} className={inputClassName} {...props} />
    );
  };

  return (
    <div className={`space-y-2 ${containerClassName}`}>
      <label htmlFor={name} className="text-sm font-medium text-slate-300">
        {label}
      </label>
      {renderInput()}
      {error && <p className="mt-1 text-xs text-red-400">{error}</p>}
    </div>
  );
};

export default FormField;
