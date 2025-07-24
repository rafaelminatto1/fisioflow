import React, { useMemo } from 'react';
import { Patient, Assessment, TherapistGoal } from '../types';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { IconArrowLeft, IconPrinter } from './icons/IconComponents';
import { useUsers } from '../hooks/useUsers';
import { useExerciseLogs } from '../hooks/useExerciseLogs';

interface PatientEvolutionReportProps {
    patient: Patient;
    assessments: Assessment[];
    therapistGoals: TherapistGoal[];
    onClose: () => void;
}

const ReportSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <section className="mb-6 p-4 border border-slate-200 rounded-lg bg-white">
        <h2 className="text-xl font-bold text-slate-800 border-b-2 border-slate-300 pb-2 mb-3">{title}</h2>
        {children}
    </section>
);

const PatientEvolutionReport: React.FC<PatientEvolutionReportProps> = ({ patient, assessments, therapistGoals, onClose }) => {
    const { users = [] } = useUsers();
    const { exerciseLogs = [] } = useExerciseLogs();

    const latestAssessment = useMemo(() => {
        return assessments.length > 0 ? [...assessments].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0] : null;
    }, [assessments]);

    const therapist = useMemo(() => {
        return latestAssessment ? users.find(u => u.id === latestAssessment.therapistId) : null;
    }, [latestAssessment, users]);

    const painChartData = useMemo(() => 
        exerciseLogs
            .filter(log => log.patientId === patient.id)
            .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .slice(-10) // last 10 logs
            .map(log => ({
                name: new Date(log.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                Dor: log.painLevel
            })),
    [exerciseLogs, patient.id]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="bg-white text-slate-800 p-8 font-sans">
            <header className="flex justify-between items-center mb-8 no-print">
                <button onClick={onClose} className="flex items-center text-blue-600 hover:underline">
                    <IconArrowLeft size={18} className="mr-2" /> Voltar ao Prontuário
                </button>
                <button onClick={handlePrint} className="flex items-center bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">
                     <IconPrinter size={18} className="mr-2" /> Imprimir Relatório
                </button>
            </header>

            <div className="text-center mb-10">
                <h1 className="text-4xl font-extrabold text-slate-900">Relatório de Evolução do Paciente</h1>
                <p className="text-slate-600 mt-2">Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
            </div>

            <ReportSection title="Informações do Paciente">
                <div className="grid grid-cols-2 gap-4">
                    <div><strong className="block text-slate-600">Nome:</strong> {patient.name}</div>
                    <div><strong className="block text-slate-600">Email:</strong> {patient.email}</div>
                    <div><strong className="block text-slate-600">Telefone:</strong> {patient.phone}</div>
                    {therapist && <div><strong className="block text-slate-600">Fisioterapeuta:</strong> {therapist.name}</div>}
                </div>
                 <div className="mt-4">
                    <strong className="block text-slate-600">Sumário Clínico:</strong>
                    <p className="whitespace-pre-wrap">{patient.medicalHistory}</p>
                </div>
                 {latestAssessment && (
                     <div className="mt-4">
                        <strong className="block text-slate-600">Hipótese Diagnóstica (Última Avaliação):</strong>
                        <p className="whitespace-pre-wrap">{latestAssessment.diagnosticHypothesis}</p>
                    </div>
                )}
            </ReportSection>

             <ReportSection title="Evolução do Nível de Dor">
                <div style={{ width: '100%', height: 250 }}>
                    <ResponsiveContainer>
                        <LineChart data={painChartData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#475569" fontSize={12} />
                            <YAxis stroke="#475569" fontSize={12} domain={[0, 10]} />
                            <Tooltip contentStyle={{ backgroundColor: 'white', borderColor: '#e2e8f0' }} />
                            <Line type="monotone" dataKey="Dor" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </ReportSection>

            <ReportSection title="Progresso das Metas Clínicas">
                 <div className="space-y-4">
                    {therapistGoals.length > 0 ? (
                        therapistGoals.map(goal => (
                             <div key={goal.id} className="p-3 bg-slate-50 rounded-md border border-slate-200">
                                <p className="font-semibold">{goal.description}</p>
                                <p className="text-sm text-slate-600">Meta: {goal.targetValue} {goal.unit} | Atual: {goal.currentValue} {goal.unit}</p>
                                <div className="mt-2 w-full bg-slate-200 rounded-full h-2.5">
                                    <div 
                                        className="bg-blue-600 h-2.5 rounded-full"
                                        style={{ width: `${goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0}%`}}
                                    ></div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <p className="text-slate-500">Nenhuma meta clínica definida.</p>
                    )}
                </div>
            </ReportSection>
        </div>
    );
};

export { PatientEvolutionReport };