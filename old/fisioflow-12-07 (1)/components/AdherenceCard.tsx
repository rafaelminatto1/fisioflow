import React, { useMemo } from 'react';
import { Prescription, ExerciseLog } from '../types';

interface AdherenceCardProps {
    prescriptions: Prescription[];
    exerciseLogs: ExerciseLog[];
}

const AdherenceCalendarDot: React.FC<{ status: 'logged' | 'missed' | 'future' }> = ({ status }) => {
    const statusClasses = {
        logged: 'bg-emerald-500',
        missed: 'bg-red-500',
        future: 'bg-slate-600'
    };
    return <div className={`w-3 h-3 rounded-full ${statusClasses[status]}`}></div>;
}

export const AdherenceCard: React.FC<AdherenceCardProps> = ({ prescriptions, exerciseLogs }) => {
    
    const { adherenceRate, weeklyStatus } = useMemo(() => {
        if (prescriptions.length === 0) {
            return { adherenceRate: 0, weeklyStatus: [] };
        }

        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const last7Days: Date[] = [];
        for (let i = 6; i >= 0; i--) {
            const day = new Date(today);
            day.setDate(today.getDate() - i);
            last7Days.push(day);
        }
        
        const logsInLast7Days = new Set(
            exerciseLogs
                .filter(log => new Date(log.date) >= last7Days[0])
                .map(log => new Date(log.date).toDateString())
        );

        // Simple adherence calculation: Assume one session per day is expected if there are any prescriptions
        const daysWithLogs = logsInLast7Days.size;
        const adherenceRate = (daysWithLogs / 7) * 100;
        
        const weeklyStatus = last7Days.map(day => {
            const dateString = day.toDateString();
            if (day > today) {
                return { day: day.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0), status: 'future' };
            }
            return {
                day: day.toLocaleDateString('pt-BR', { weekday: 'short' }).charAt(0),
                status: logsInLast7Days.has(dateString) ? 'logged' : 'missed'
            };
        });

        return { adherenceRate, weeklyStatus };

    }, [prescriptions, exerciseLogs]);

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-full flex flex-col justify-between">
            <div>
                <h4 className="text-base font-semibold text-slate-300 mb-2">Adesão ao Tratamento</h4>
                <p className="text-3xl font-bold text-slate-100">{adherenceRate.toFixed(0)}%</p>
                <p className="text-xs text-slate-400">Nos últimos 7 dias</p>
            </div>
            <div className="mt-4">
                <div className="flex justify-around items-center">
                    {weeklyStatus.map((status, index) => (
                        <div key={index} className="text-center">
                            <AdherenceCalendarDot status={status.status as any} />
                            <p className="text-xs text-slate-500 mt-1">{status.day}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};