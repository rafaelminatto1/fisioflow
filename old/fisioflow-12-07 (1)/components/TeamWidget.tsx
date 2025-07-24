

import React from 'react';
import { TeamInsight } from '../types';
import { IconSparkles, IconTrendingUp, IconTrendingDown, IconUsers, IconCompass } from './icons/IconComponents';
import Skeleton from './ui/Skeleton';

interface TeamWidgetProps {
    insights: TeamInsight[] | null | undefined;
    isLoading: boolean;
}

const insightIcons: Record<TeamInsight['icon'], React.ReactNode> = {
    performance: <IconTrendingUp size={20} className="text-emerald-400" />,
    workload: <IconUsers size={20} className="text-blue-400" />,
    bottleneck: <IconTrendingDown size={20} className="text-amber-400" />,
    opportunity: <IconCompass size={20} className="text-purple-400" />,
};

const TeamWidget: React.FC<TeamWidgetProps> = ({ insights, isLoading }) => {
    
    if (isLoading) {
        return (
            <div className="space-y-3 p-1">
                <Skeleton className="h-6 w-1/3 mb-2" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
            </div>
        )
    }

    return (
        <>
            <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <IconSparkles /> Insights da Equipe
            </h3>
            <div className="flex-1 overflow-y-auto -mr-3 pr-2">
                {insights && insights.length > 0 ? (
                    <ul className="space-y-3">
                        {insights.map(insight => (
                            <li key={insight.id} className="flex items-start gap-3 p-2 rounded-md bg-slate-900/40">
                                <div className="flex-shrink-0 mt-1">{insightIcons[insight.icon]}</div>
                                <div>
                                    <p className="font-semibold text-slate-200 text-sm">{insight.title}</p>
                                    <p className="text-xs text-slate-400">{insight.insight}</p>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div className="text-slate-400 text-sm h-full flex items-center justify-center">
                        <p>Nenhum insight novo para a equipe hoje. Continue o bom trabalho!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default TeamWidget;