/**
 * Componente de Card para KPIs
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

interface KPICardProps {
  title: string;
  value: string;
  change: string;
  changeType: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red';
}

const colorClasses = {
  blue: {
    bg: 'bg-blue-50',
    icon: 'bg-blue-100 text-blue-600',
    text: 'text-blue-600'
  },
  green: {
    bg: 'bg-green-50',
    icon: 'bg-green-100 text-green-600',
    text: 'text-green-600'
  },
  purple: {
    bg: 'bg-purple-50',
    icon: 'bg-purple-100 text-purple-600',
    text: 'text-purple-600'
  },
  orange: {
    bg: 'bg-orange-50',
    icon: 'bg-orange-100 text-orange-600',
    text: 'text-orange-600'
  },
  red: {
    bg: 'bg-red-50',
    icon: 'bg-red-100 text-red-600',
    text: 'text-red-600'
  }
};

const changeTypeClasses = {
  positive: 'text-green-600 bg-green-100',
  negative: 'text-red-600 bg-red-100',
  neutral: 'text-gray-600 bg-gray-100'
};

export function KPICard({ title, value, change, changeType, icon: Icon, color }: KPICardProps) {
  const colors = colorClasses[color];

  return (
    <div className={`${colors.bg} border rounded-lg p-6 transition-all hover:shadow-lg`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`p-3 rounded-full ${colors.icon}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className={`px-2 py-1 rounded-full text-xs font-medium ${changeTypeClasses[changeType]}`}>
          {change}
        </div>
      </div>
      
      <div>
        <h3 className="text-sm font-medium text-gray-600 mb-1">{title}</h3>
        <p className={`text-2xl font-bold ${colors.text}`}>{value}</p>
      </div>
    </div>
  );
}