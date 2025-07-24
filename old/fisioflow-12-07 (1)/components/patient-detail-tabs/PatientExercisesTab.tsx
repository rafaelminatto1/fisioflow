import React, { useState } from 'react';
import { Prescription, Exercise, Patient } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { IconPlus, IconVideo, IconHistory, IconPencil, IconActivity, IconPrinter } from '../icons/IconComponents';
import ExerciseSheetModal from '../ExerciseSheetModal';
import { usePrescriptions } from '../../hooks/usePrescriptions';
import ExerciseCardSkeleton from '../ui/ExerciseCardSkeleton';

interface PatientExercisesTabProps {
    patient: Patient;
    prescribedExercises: Prescription[];
    exercises: Exercise[];
    onPrescribeNew: () => void;
    onViewVideo: (exercise: Exercise) => void;
    onViewHistory: (exercise: Exercise, prescriptionId: string) => void;
    onEditPrescription: (prescription: Prescription) => void;
}

export const PatientExercisesTab: React.FC<PatientExercisesTabProps> = ({
    patient,
    prescribedExercises,
    exercises,
    onPrescribeNew,
    onViewVideo,
    onViewHistory,
    onEditPrescription,
}) => {
    const [isSheetModalOpen, setIsSheetModalOpen] = useState(false);
    // Assuming you might have a loading state from a parent hook, or you could add one here.
    // For demonstration, let's use the one from usePrescriptions hook.
    const { isLoading: isLoadingPrescriptions } = usePrescriptions();

    const renderContent = () => {
        if (isLoadingPrescriptions) {
            return (
                <div className="space-y-3">
                    <ExerciseCardSkeleton />
                    <ExerciseCardSkeleton />
                </div>
            )
        }

        if (prescribedExercises.length > 0) {
            return (
                <div className="space-y-3">
                    {prescribedExercises.map(p => {
                        const exercise = exercises.find(ex => ex.id === p.exerciseId);
                        if (!exercise) return <div key={p.id} className="text-sm text-red-400">Exercício não encontrado para a prescrição ID {p.id}</div>;
                        return (
                            <div key={p.id} className="bg-slate-900/50 p-3 rounded-lg flex items-center justify-between gap-4">
                                <div>
                                    <p className="font-semibold text-slate-100">{exercise.name}</p>
                                    <p className="text-xs text-slate-400">{p.sets}x{p.reps} - {p.frequency}</p>
                                </div>
                                <div className="flex items-center gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => onViewVideo(exercise)} icon={<IconVideo/>}></Button>
                                    <Button variant="ghost" size="sm" onClick={() => onViewHistory(exercise, p.id)} icon={<IconHistory/>}></Button>
                                    <Button variant="ghost" size="sm" onClick={() => onEditPrescription(p)} icon={<IconPencil/>}></Button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return <EmptyState icon={<IconActivity/>} title="Nenhum Exercício" message="Nenhum exercício foi prescrito para este paciente ainda." />;
    }
    
    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-base font-semibold text-slate-200">Exercícios Prescritos</h3>
                <div className="flex items-center gap-2">
                    <Button onClick={() => setIsSheetModalOpen(true)} icon={<IconPrinter />} size="sm" variant="secondary">Gerar Ficha</Button>
                    <Button onClick={onPrescribeNew} icon={<IconPlus />} size="sm">Prescrever</Button>
                </div>
            </div>
            
            {renderContent()}
        
            {isSheetModalOpen && (
                <ExerciseSheetModal 
                    isOpen={isSheetModalOpen}
                    onClose={() => setIsSheetModalOpen(false)}
                    patient={patient}
                    prescriptions={prescribedExercises}
                    exercises={exercises}
                />
            )}
        </div>
    );
};