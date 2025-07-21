import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  icon,
  title,
  value,
  change,
}) => {
  const isPositive = change.startsWith('+');
  const isNegative = change.startsWith('-');
  const changeColor = isPositive
    ? 'text-emerald-400'
    : isNegative
      ? 'text-red-400'
      : 'text-slate-400';

  return (
    <div className="flex flex-col justify-between rounded-lg border border-slate-700 bg-slate-800 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-medium text-slate-300">{title}</h3>
        <div className="text-slate-400">{icon}</div>
      </div>
      <div>
        <p className="text-3xl font-bold text-slate-50">{value}</p>
        <p className={`text-sm ${changeColor}`}>{change}</p>
      </div>
    </div>
  );
};

export default MetricCard;
