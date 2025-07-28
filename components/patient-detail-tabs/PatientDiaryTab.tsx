import React, { useMemo } from 'react';
import { ResponsiveContainer, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

import { DailyLog } from '../../types';
import { IconBook } from '../icons/IconComponents';
import EmptyState from '../ui/EmptyState';

interface PatientDiaryTabProps {
    dailyLogs: DailyLog[];
}

const moodColors: Record<string, string> = {
    triste: '#ef4444',
    neutro: '#f59e0b',
    feliz: '#10b981',
}

const moodText: Record<string, string> = {
    triste: 'Triste',
    neutro: 'Neutro',
    feliz: 'Feliz',
}

export const PatientDiaryTab: React.FC<PatientDiaryTabProps> = ({ dailyLogs }) => {
    const sortedLogs = useMemo(() => 
        [...dailyLogs].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [dailyLogs]);

    const chartData = useMemo(() =>
        sortedLogs.map(log => ({
            date: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
            Dor: log.painLevel,
            Energia: log.energyLevel,
            Sono: log.sleepQuality,
            Humor: log.mood,
        })),
    [sortedLogs]);

    if (dailyLogs.length === 0) {
        return <EmptyState icon={<IconBook />} title="Nenhum Registro no Diário" message="O paciente ainda não fez nenhum registro em seu diário de sintomas." />;
    }

    return (
        <div className="space-y-6">
            <div>
                <h3 className="text-base font-semibold text-slate-200 mb-2">Gráfico de Evolução dos Sintomas</h3>
                <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer>
                        <ComposedChart data={chartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                            <XAxis dataKey="date" stroke="#cbd5e1" fontSize={12} />
                            <YAxis yAxisId="left" stroke="#cbd5e1" fontSize={12} domain={[0, 10]} label={{ value: 'Nível de Dor', angle: -90, position: 'insideLeft', fill: '#cbd5e1', fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" stroke="#cbd5e1" fontSize={12} domain={[0, 5]} label={{ value: 'Energia / Sono', angle: -90, position: 'insideRight', fill: '#cbd5e1', fontSize: 12 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', color: '#f8fafc', borderRadius: '0.5rem' }} />
                            <Legend wrapperStyle={{ fontSize: '14px' }}/>
                            <Bar yAxisId="left" dataKey="Dor" barSize={20} fill="#ef4444" name="Dor (0-10)" />
                            <Line yAxisId="right" type="monotone" dataKey="Energia" stroke="#3b82f6" name="Energia (1-5)" />
                            <Line yAxisId="right" type="monotone" dataKey="Sono" stroke="#10b981" name="Sono (1-5)" />
                        </ComposedChart>
                    </ResponsiveContainer>
                </div>
            </div>
            <div>
                 <h3 className="text-base font-semibold text-slate-200 mb-2">Registros do Diário</h3>
                 <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                    {sortedLogs.map(log => (
                        <div key={log.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700">
                             <div className="flex justify-between items-center mb-2">
                                <p className="font-semibold text-slate-200">{new Date(log.date).toLocaleDateString('pt-BR', {day: '2-digit', month: 'long', year: 'numeric'})}</p>
                                 <span style={{color: moodColors[log.mood]}} className="font-bold text-sm">{moodText[log.mood]}</span>
                             </div>
                              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                                <p>Dor: <strong className="text-slate-100">{log.painLevel}/10</strong></p>
                                <p>Energia: <strong className="text-slate-100">{log.energyLevel}/5</strong></p>
                                <p>Sono: <strong className="text-slate-100">{log.sleepQuality}/5</strong></p>
                            </div>
                            {log.notes && (
                                 <p className="text-sm text-slate-300 bg-slate-800 p-2 rounded-md mt-2 whitespace-pre-wrap">
                                    "{log.notes}"
                                </p>
                            )}
                        </div>
                    )).reverse()}
                 </div>
            </div>
        </div>
    );
};