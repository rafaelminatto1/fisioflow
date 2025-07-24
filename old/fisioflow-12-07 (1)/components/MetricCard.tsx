
import React from 'react';

interface MetricCardProps {
  icon: React.ReactNode;
  title: string;
  value: string;
  change: string;
}

const MetricCard: React.FC<MetricCardProps> = ({ icon, title, value, change }) => {
  const isPositive = change.startsWith('+');
  const isNegative = change.startsWith('-');
  const changeColor = isPositive ? 'text-emerald-400' : isNegative ? 'text-red-400' : 'text-slate-400';

  return (
    <div className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
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
