import React from 'react';
import { VideoSubmission, Exercise } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { IconVideo } from '../icons/IconComponents';

interface PatientSubmissionsTabProps {
    videoSubmissions: VideoSubmission[];
    exercises: Exercise[];
    onOpenVideoReviewModal: (submission: VideoSubmission) => void;
}

export const PatientSubmissionsTab: React.FC<PatientSubmissionsTabProps> = ({
    videoSubmissions,
    exercises,
    onOpenVideoReviewModal,
}) => (
    <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-200">Vídeos Enviados para Análise</h3>
        {videoSubmissions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {videoSubmissions.map(sub => {
                    const exercise = exercises.find(ex => ex.id === sub.exerciseId);
                    const statusClasses = {
                        pending_review: 'border-amber-500/50',
                        approved: 'border-emerald-500/50',
                        needs_correction: 'border-red-500/50'
                    };
                    return (
                        <div key={sub.id} className={`bg-slate-900/50 p-3 rounded-lg border-l-4 ${statusClasses[sub.status]}`}>
                            <p className="font-semibold text-slate-200">{exercise?.name}</p>
                            <p className="text-xs text-slate-400">Enviado em: {new Date(sub.timestamp).toLocaleString('pt-BR')}</p>
                            <Button variant="ghost" size="sm" onClick={() => onOpenVideoReviewModal(sub)} className="mt-2">Analisar Vídeo</Button>
                        </div>
                    )
                })}
            </div>
        ) : <EmptyState icon={<IconVideo />} title="Nenhum Vídeo" message="O paciente ainda não enviou nenhum vídeo para análise." />}
    </div>
);