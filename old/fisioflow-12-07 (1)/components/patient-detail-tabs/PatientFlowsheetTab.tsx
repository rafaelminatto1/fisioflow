import React, { useMemo } from 'react';
import { PatientFlowsheetTabProps, FlowsheetDataPoint, TherapistGoal } from '../../types';
import { MetricEvolutionChart } from '../charts/MetricEvolutionChart';
import { AssessmentRadarChart } from '../charts/AssessmentRadarChart';
import { AdherenceCard } from '../AdherenceCard';
import EmptyState from '../ui/EmptyState';
import { IconTrendingUp } from '../icons/IconComponents';
import BodyChart from '../BodyChart';

export const PatientFlowsheetTab: React.FC<PatientFlowsheetTabProps> = ({
    patient, assessments, goals, exerciseLogs, dailyLogs, prescriptions
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
                value: log.painLevel,
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
    
    const initialAssessment = useMemo(() => 
        assessments.length > 0 ? [...assessments].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())[assessments.length - 1] : null
    , [assessments]);
    
    const latestAssessment = useMemo(() => 
        assessments.length > 0 ? [...assessments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null
    , [assessments]);
    
    const allBodyMarkings = useMemo(() =>
        dailyLogs.flatMap(log => log.bodyChartData || []).concat(
          assessments.flatMap(ass => ass.bodyChartData || [])
        ),
    [dailyLogs, assessments]);

    const getGoalProgressData = (goal: TherapistGoal): FlowsheetDataPoint[] => {
        const data: FlowsheetDataPoint[] = [];
        data.push({
            date: new Date(goal.startDate).toLocaleDateString('pt-BR', {day: '2-digit', month:'2-digit'}),
            timestamp: new Date(goal.startDate).getTime(),
            value: 0, // Placeholder for start value, ideally goals have progress tracking points
        });
        
        // This is a simplified representation. A real implementation might have progress points.
        data.push({
             date: 'Atual',
             timestamp: new Date().getTime(),
             value: goal.currentValue,
        });
        
        data.push({
            date: 'Alvo',
            timestamp: new Date(goal.targetDate).getTime() + 1, // ensure it's last
            value: goal.targetValue,
        });
        
        return data.sort((a,b) => a.timestamp - b.timestamp);
    }
    
    if (assessments.length === 0 && goals.length === 0 && exerciseLogs.length === 0 && dailyLogs.length === 0) {
        return <EmptyState 
            icon={<IconTrendingUp />} 
            title="Flowsheet Vazio"
            message="Dados de avaliações, metas e logs aparecerão aqui para monitorar a evolução do paciente."
        />
    }

    return (
        <div className="space-y-6">
            <h3 className="text-xl font-bold text-slate-100">Flowsheet de Evolução</h3>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <MetricEvolutionChart title="Evolução da Dor (Últimos 30 dias)" data={painData} dataKey="value" color="#ef4444" domain={[0, 10]} />
                </div>
                <div className="h-full">
                    <AdherenceCard prescriptions={prescriptions} exerciseLogs={exerciseLogs} />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                 {allBodyMarkings.length > 0 && (
                    <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-auto flex flex-col">
                        <h4 className="text-base font-semibold text-slate-300 mb-2">Heatmap de Dor</h4>
                         <p className="text-xs text-slate-400 mb-4">Mostra a concentração de todos os pontos de dor registrados pelo paciente.</p>
                        <BodyChart markings={allBodyMarkings} readOnly heatmap />
                    </div>
                )}
                {initialAssessment && latestAssessment && <AssessmentRadarChart initialAssessment={initialAssessment} latestAssessment={latestAssessment} />}
                {goals.map(goal => (
                     <MetricEvolutionChart
                        key={goal.id}
                        title={`Progresso da Meta: ${goal.description}`}
                        data={getGoalProgressData(goal)}
                        dataKey="value"
                        unit={` ${goal.unit}`}
                        color="#3b82f6"
                        domain={['dataMin - 1', 'dataMax + 1']}
                    />
                ))}
            </div>
        </div>
    );
};
