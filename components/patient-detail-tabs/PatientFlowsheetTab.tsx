import React, { useMemo } from 'react';
import { Patient, Assessment, ExerciseLog, DailyLog, Prescription } from '../../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
import EmptyState from '../ui/EmptyState';
import { IconTrendingUp } from '../icons/IconComponents';

interface PatientFlowsheetTabProps {
    patient: Patient;
    assessments: Assessment[];
    exerciseLogs: ExerciseLog[];
    dailyLogs: DailyLog[];
    prescriptions: Prescription[];
}

type FlowsheetDataPoint = {
    timestamp: number;
    date: string;
    value: number;
    type?: string;
};

const MetricEvolutionChart: React.FC<{
    title: string;
    data: FlowsheetDataPoint[];
    dataKey: string;
    color: string;
    domain?: [number | string, number | string];
    unit?: string;
}> = ({ title, data, dataKey, color, domain = [0, 10], unit = '' }) => (
    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
        <h4 className="text-base font-semibold text-slate-300 mb-4">{title}</h4>
        <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer>
                <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                    <XAxis dataKey="date" stroke="#cbd5e1" fontSize={12} />
                    <YAxis stroke="#cbd5e1" fontSize={12} domain={domain} />
                    <Tooltip 
                        contentStyle={{ 
                            backgroundColor: 'rgba(30, 41, 59, 0.9)', 
                            border: '1px solid #475569', 
                            color: '#f8fafc', 
                            borderRadius: '0.5rem' 
                        }} 
                        formatter={(value: any) => [`${value}${unit}`, title]}
                    />
                    <Line 
                        type="monotone" 
                        dataKey={dataKey} 
                        stroke={color} 
                        strokeWidth={2}
                        dot={{ fill: color, strokeWidth: 2, r: 4 }}
                        activeDot={{ r: 6, stroke: color, strokeWidth: 2 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    </div>
);

const AdherenceCard: React.FC<{
    prescriptions: Prescription[];
    exerciseLogs: ExerciseLog[];
}> = ({ prescriptions, exerciseLogs }) => {
    const adherenceRate = useMemo(() => {
        if (prescriptions.length === 0) return 0;
        
        const totalExpectedSessions = prescriptions.reduce((acc, p) => {
            const daysSinceStart = Math.floor(
                (new Date().getTime() - new Date(p.startDate || new Date()).getTime()) / (1000 * 3600 * 24)
            );
            const frequencyPerWeek = parseInt(p.frequency?.split('x')[0] || '3');
            const expectedSessions = Math.floor((daysSinceStart / 7) * frequencyPerWeek);
            return acc + Math.max(0, expectedSessions);
        }, 0);
        
        const completedSessions = exerciseLogs.length;
        return totalExpectedSessions > 0 ? Math.round((completedSessions / totalExpectedSessions) * 100) : 0;
    }, [prescriptions, exerciseLogs]);

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-full">
            <h4 className="text-base font-semibold text-slate-300 mb-4">Aderência ao Tratamento</h4>
            <div className="text-center">
                <div className="text-4xl font-bold text-blue-400 mb-2">{adherenceRate}%</div>
                <p className="text-sm text-slate-400 mb-4">Taxa de Aderência</p>
                <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                        className="bg-blue-400 h-2 rounded-full transition-all duration-300" 
                        style={{ width: `${adherenceRate}%` }}
                    ></div>
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
                    <div>
                        <p className="text-slate-400">Sessões Realizadas</p>
                        <p className="font-bold text-slate-100">{exerciseLogs.length}</p>
                    </div>
                    <div>
                        <p className="text-slate-400">Exercícios Prescritos</p>
                        <p className="font-bold text-slate-100">{prescriptions.length}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export const PatientFlowsheetTab: React.FC<PatientFlowsheetTabProps> = ({
    patient, assessments, exerciseLogs, dailyLogs, prescriptions
}) => {
    
    const painData = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const dailyPain: FlowsheetDataPoint[] = dailyLogs
            .filter(log => new Date(log.date) >= thirtyDaysAgo)
            .map(log => ({
                timestamp: new Date(log.date).getTime(),
                date: new Date(log.date).toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit'}),
                value: log.painLevel,
                type: 'Dor (Diário)',
            }));

        const exercisePain: FlowsheetDataPoint[] = exerciseLogs
             .filter(log => new Date(log.date) >= thirtyDaysAgo)
            .map(log => ({
                timestamp: new Date(log.date).getTime(),
                date: new Date(log.date).toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit'}),
                value: log.painLevel || 0,
                type: 'Dor (Exercício)',
            }));
            
        const combinedLogs = [...dailyPain, ...exercisePain].sort((a,b) => a.timestamp - b.timestamp);
        
        const averagedData: Record<string, { total: number, count: number, timestamp: number }> = {};
        combinedLogs.forEach(log => {
            if (!averagedData[log.date]) {
                averagedData[log.date] = { total: 0, count: 0, timestamp: log.timestamp };
            }
            averagedData[log.date].total += log.value;
            averagedData[log.date].count += 1;
        });
        
        return Object.entries(averagedData).map(([date, {total, count, timestamp}]) => ({
            date,
            timestamp,
            value: total / count,
        })).sort((a,b) => a.timestamp - b.timestamp);

    }, [dailyLogs, exerciseLogs]);
    
    const energyData = useMemo(() => {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        return dailyLogs
            .filter(log => new Date(log.date) >= thirtyDaysAgo)
            .map(log => ({
                timestamp: new Date(log.date).getTime(),
                date: new Date(log.date).toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit'}),
                value: log.energyLevel,
            }))
            .sort((a,b) => a.timestamp - b.timestamp);
    }, [dailyLogs]);
    
    if (assessments.length === 0 && exerciseLogs.length === 0 && dailyLogs.length === 0) {
        return <EmptyState 
            icon={<IconTrendingUp />} 
            title="Flowsheet Vazio"
            message="Dados de avaliações, exercícios e logs aparecerão aqui para monitorar a evolução do paciente."
        />
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-100">Flowsheet de Evolução</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MetricEvolutionChart 
                        title="Evolução da Dor (Últimos 30 dias)" 
                        data={painData} 
                        dataKey="value" 
                        color="#ef4444" 
                        domain={[0, 10]} 
                    />
                </div>
                <div className="h-full">
                    <AdherenceCard prescriptions={prescriptions} exerciseLogs={exerciseLogs} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <MetricEvolutionChart 
                    title="Nível de Energia (Últimos 30 dias)" 
                    data={energyData} 
                    dataKey="value" 
                    color="#3b82f6" 
                    domain={[0, 5]} 
                />
                
                <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                    <h4 className="text-base font-semibold text-slate-300 mb-4">Resumo de Avaliações</h4>
                    {assessments.length > 0 ? (
                        <div className="space-y-3">
                            {assessments
                                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                .slice(0, 5)
                                .map(assessment => (
                                <div key={assessment.id} className="bg-slate-800 p-3 rounded-md">
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-semibold text-slate-200">
                                            {new Date(assessment.date).toLocaleDateString('pt-BR')}
                                        </p>
                                        <span className="text-xs text-slate-400">Avaliação</span>
                                    </div>
                                    <p className="text-sm text-slate-300 truncate">
                                        {assessment.diagnosticHypothesis || 'Sem hipótese diagnóstica'}
                                    </p>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400">Nenhuma avaliação registrada.</p>
                    )}
                </div>
            </div>
        </div>
    );
};