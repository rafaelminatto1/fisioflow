import React, { ReactNode } from 'react';

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, action }) => {
  return (
    <div className="text-center p-8 md:p-12 bg-slate-800/50 rounded-lg border-2 border-dashed border-slate-700 w-full">
      <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-slate-700 text-blue-400">
        {icon}
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-100">{title}</h3>
      <p className="mt-1 text-sm text-slate-400">{message}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
};

export default EmptyState;
