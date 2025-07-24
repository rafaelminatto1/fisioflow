
import React from 'react';
import { Achievement } from '../types';

interface AchievementBadgeProps {
    achievement: Achievement;
    isUnlocked: boolean;
    unlockedDate?: string;
}

const AchievementBadge: React.FC<AchievementBadgeProps> = ({ achievement, isUnlocked, unlockedDate }) => {
    const wrapperClasses = isUnlocked
        ? 'bg-slate-800 border-amber-500/30'
        : 'bg-slate-800/50 border-slate-700/50';
    const contentClasses = isUnlocked ? 'opacity-100' : 'opacity-40 grayscale';

    const formattedDate = unlockedDate
        ? new Date(unlockedDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })
        : '';
        
    return (
        <div
            className={`p-4 rounded-lg border flex flex-col items-center text-center transition-all duration-300 ${wrapperClasses}`}
            title={isUnlocked ? `${achievement.title} - Desbloqueado em ${formattedDate}` : `${achievement.title} - Bloqueado`}
        >
            <div className={`transition-all duration-300 text-4xl mb-2 ${contentClasses}`}>
                {achievement.icon}
            </div>
            <h4 className={`font-bold text-sm transition-colors ${isUnlocked ? 'text-slate-100' : 'text-slate-400'}`}>
                {achievement.title}
            </h4>
            <p className={`text-xs transition-colors ${isUnlocked ? 'text-slate-300' : 'text-slate-500'}`}>
                {achievement.description}
            </p>
            {isUnlocked && (
                <p className="text-xs font-mono mt-2 text-amber-400/70 bg-amber-500/10 px-2 py-0.5 rounded">
                    {formattedDate}
                </p>
            )}
        </div>
    );
};

export default AchievementBadge;
