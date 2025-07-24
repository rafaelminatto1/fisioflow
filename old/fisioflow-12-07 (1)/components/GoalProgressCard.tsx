import React from 'react';
import { TherapistGoal } from '../types';
import { IconPencil } from './icons/IconComponents';

interface GoalProgressCardProps {
    goal: TherapistGoal;
    onEdit: () => void;
}

const GoalProgressCard: React.FC<GoalProgressCardProps> = ({ goal, onEdit }) => {
    const progress = goal.targetValue > 0 ? (goal.currentValue / goal.targetValue) * 100 : 0;

    const getProgressColor = (percentage: number) => {
        if (percentage >= 100) return 'bg-emerald-500';
        if (percentage > 70) return 'bg-blue-500';
        if (percentage > 40) return 'bg-yellow-500';
        return 'bg-amber-600';
    };

    return (
        <div className="bg-slate-900/70 p-4 rounded-lg border border-slate-700 space-y-2 group">
            <div className="flex justify-between items-start">
                <p className="font-semibold text-slate-200">{goal.description}</p>
                <button onClick={onEdit} className="p-1.5 text-slate-400 hover:text-amber-400 rounded-md hover:bg-slate-700/50 opacity-0 group-hover:opacity-100 transition-opacity" title="Editar Meta">
                    <IconPencil size={14} />
                </button>
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2.5">
                <div 
                    className={`${getProgressColor(progress)} h-2.5 rounded-full transition-all duration-500`} 
                    style={{ width: `${Math.min(100, progress)}%` }}
                ></div>
            </div>
            <div className="text-right text-xs text-slate-400">
                <span className="font-bold text-slate-200">{goal.currentValue}</span> / {goal.targetValue} {goal.unit}
            </div>
        </div>
    );
};

export default GoalProgressCard;