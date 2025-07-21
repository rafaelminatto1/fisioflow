import React from 'react';

interface PageShellProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

const PageShell: React.FC<PageShellProps> = ({
  title,
  description,
  action,
  children,
}) => {
  return (
    <div className="space-y-6">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-100">{title}</h1>
          {description && <p className="mt-1 text-slate-400">{description}</p>}
        </div>
        {action && <div className="w-full md:w-auto">{action}</div>}
      </header>
      <main>{children}</main>
    </div>
  );
};

export default PageShell;
