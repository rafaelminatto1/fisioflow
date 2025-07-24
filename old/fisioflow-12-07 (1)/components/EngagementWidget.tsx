import React, { useMemo } from 'react';
import { ExerciseLog } from '../types';
import { IconTrendingUp, IconActivity } from './icons/IconComponents';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { areOnSameDay } from '../utils';

interface EngagementWidgetProps {
  exerciseLogs: ExerciseLog[];
}

const EngagementWidget: React.FC<EngagementWidgetProps> = ({ exerciseLogs }) => {
  const engagementData = useMemo(() => {
    const today = new Date();
    const last30Days = new Set<string>();
    
    for (const log of exerciseLogs) {
      const logDate = new Date(log.date);
      const diffDays = (today.getTime() - logDate.getTime()) / (1000 * 3600 * 24);
      if (diffDays <= 30) {
        last30Days.add(logDate.toISOString().split('T')[0]);
      }
    }
    const adherenceRate = last30Days.size / 30 * 100;

    const weeklyAdherence = Array.from({length: 4}, (_, i) => {
        const weekStart = new Date();
        weekStart.setDate(today.getDate() - (i * 7) - 6); // Start of week (e.g., today is Sunday, start is last Monday)
        weekStart.setHours(0,0,0,0);
        
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);
        weekEnd.setHours(23,59,59,999);

        const daysWithLogs = new Set();
        exerciseLogs.forEach(log => {
            const logDate = new Date(log.date);
            if(logDate >= weekStart && logDate <= weekEnd) {
                daysWithLogs.add(logDate.toISOString().split('T')[0]);
            }
        });
        
        const weekLabel = i === 0 ? 'Esta Semana' : `${i} sem. atrás`;
        return { name: weekLabel, Adesão: daysWithLogs.size };
    }).reverse();

    return { adherenceRate, weeklyAdherence };
  }, [exerciseLogs]);

  return (
    <>
      <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
        <IconTrendingUp /> Engajamento do Paciente
      </h3>
      <div className="flex flex-col h-full">
         <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-md bg-slate-700/50 flex items-center justify-center text-emerald-400">
                <IconActivity size={20}/>
            </div>
            <div>
                <p className="text-xl font-bold text-slate-50">{engagementData.adherenceRate.toFixed(0)}%</p>
                <p className="text-xs text-slate-400">Adesão aos Exercícios (30d)</p>
            </div>
        </div>
        <div className="flex-1" style={{ width: '100%', height: '200px' }}>
          <ResponsiveContainer>
            <BarChart data={engagementData.weeklyAdherence} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
              <XAxis dataKey="name" stroke="#cbd5e1" fontSize={10} />
              <YAxis stroke="#cbd5e1" fontSize={10} unit="d" domain={[0, 7]}/>
              <Tooltip
                 contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', color: '#f8fafc', borderRadius: '0.5rem' }}
                 labelStyle={{ fontWeight: 'bold' }}
                 formatter={(value: number) => [`${value} dias`, 'Adesão']}
              />
              <Bar dataKey="Adesão" fill="#10b981" name="Dias com registro" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
};

export default EngagementWidget;