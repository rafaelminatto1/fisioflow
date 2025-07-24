
import React from 'react';
import { GamificationStats } from '../types';
import { IconTrophy, IconFlame, IconStar } from './icons/IconComponents';
import { pointsToReachLevel } from '../utils';

interface GamificationWidgetProps {
    gamification: GamificationStats;
}

const GamificationWidget: React.FC<GamificationWidgetProps> = ({ gamification }) => {
    const { level, points, streak } = gamification;

    const pointsForCurrentLevel = pointsToReachLevel(level);
    const pointsForNextLevel = pointsToReachLevel(level + 1);
    
    const progress = pointsForNextLevel > pointsForCurrentLevel 
        ? ((points - pointsForCurrentLevel) / (pointsForNextLevel - pointsForCurrentLevel)) * 100
        : 100;

    return (
        <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-5 h-full">
            <h3 className="text-xl font-bold text-white flex items-center gap-2"><IconTrophy size={22} className="text-amber-400"/> Seu Progresso</h3>
            
            <div>
                <div className="flex justify-between items-end mb-1">
                    <span className="text-lg font-semibold text-slate-100">Nível {level}</span>
                    <span className="text-sm text-slate-400">{points} / {pointsForNextLevel} pts</span>
                </div>
                <div className="w-full bg-slate-700 rounded-full h-2.5">
                    <div className="bg-green-500 h-2.5 rounded-full transition-all duration-500" style={{ width: `${progress}%` }}></div>
                </div>
                 <p className="text-xs text-slate-500 mt-1">
                    {pointsForNextLevel - points > 0 ? `${pointsForNextLevel - points} pontos para o próximo nível!` : 'Nível máximo atingido!'}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-4 text-center">
                <div className="bg-slate-900/50 p-3 rounded-md">
                    <IconFlame size={28} className="mx-auto text-orange-500 mb-1"/>
                    <p className="text-2xl font-bold text-slate-50">{streak}</p>
                    <p className="text-sm text-slate-400">Dias em sequência</p>
                </div>
                <div className="bg-slate-900/50 p-3 rounded-md">
                    <IconStar size={28} className="mx-auto text-yellow-400 mb-1"/>
                    <p className="text-2xl font-bold text-slate-50">{points}</p>
                    <p className="text-sm text-slate-400">Total de Pontos</p>
                </div>
            </div>
        </div>
    );
};

export default GamificationWidget;
