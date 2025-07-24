
import React from 'react';
import { TherapistGoal } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import GoalProgressCard from '../GoalProgressCard';
import { IconPlus, IconCrosshair } from '../icons/IconComponents';

interface PatientClinicalGoalsTabProps {
    therapistGoals: TherapistGoal[];
    onOpenNewGoalModal: () => void;
    onOpenEditGoalModal: (goal: TherapistGoal) => void;
}

export const PatientClinicalGoalsTab: React.FC<PatientClinicalGoalsTabProps> = ({
    therapistGoals,
    onOpenNewGoalModal,
    onOpenEditGoalModal,
}) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-200">Metas Clínicas</h3>
            <Button onClick={onOpenNewGoalModal} icon={<IconPlus />} size="sm">Nova Meta</Button>
        </div>
        {therapistGoals.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {therapistGoals.map(goal => <GoalProgressCard key={goal.id} goal={goal} onEdit={() => onOpenEditGoalModal(goal)} />)}
            </div>
        ) : <EmptyState icon={<IconCrosshair/>} title="Nenhuma Meta" message="Nenhuma meta clínica foi definida para este paciente."/>}
    </div>
);
