
import React from 'react';
import { SmartSummaryData } from '/types.js';
import { IconSparkles, IconRefresh, IconAlertTriangle, IconClock, IconUser, IconDollarSign, IconMessageCircle, IconClipboardList, IconCalendar, IconTrendingDown } from '/components/icons/IconComponents.js';
import Skeleton from '/components/ui/Skeleton.js';

interface SmartSummaryProps {
    summary: SmartSummaryData | null;
    isLoading: boolean;
    error: string | null;
    onRegenerate: () => void;
}

const alertIcons = {
    high_pain: <IconAlertTriangle className="text-red-400" size={16} />,
    overdue_task: <IconClock className="text-amber-400" size={16} />,
    first_appointment: <IconUser className="text-blue-400" size={16} />,
    pending_payment: <IconDollarSign className="text-yellow-400" size={16} />,
    unread_message: <IconMessageCircle className="text-indigo-400" size={16} />,
    low_adherence: <IconTrendingDown className="text-orange-400" size={16} />,
};

const focusIcons = {
    task: <IconClipboardList size={16} />,
    appointment: <IconCalendar size={16} />,
};

const SmartSummary: React.FC<SmartSummaryProps> = ({ summary, isLoading, error, onRegenerate }) => {
    
    if (isLoading) {
        return (
            <div className="bg-slate-800/70 p-4 rounded-lg border border-slate-700 backdrop-blur-sm">
                 <div className="flex justify-between items-start mb-3">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <IconSparkles className="text-blue-400" />
                        Seu Resumo Inteligente do Dia
                    </h2>
                     <button className="p-1.5 rounded-full text-slate-400" disabled>
                        <IconRefresh size={16} className={'animate-spin'} />
                    </button>
                </div>
                 <div className="space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-5/6" />
                </div>
            </div>
        );
    }
    
    if (error) {
        return (
             <div className="bg-red-900/20 p-4 rounded-lg border border-red-500/30">
                 <div className="flex justify-between items-start mb-3">
                    <h2 className="text-lg font-semibold text-red-300 flex items-center gap-2">
                        <IconAlertTriangle />
                        Erro no Resumo
                    </h2>
                     <button onClick={onRegenerate} className="p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white">
                        <IconRefresh size={16} />
                    </button>
                </div>
                <p className="text-sm text-red-300/80">{error}</p>
            </div>
        )
    }

    if (!summary) {
        return (
             <div className="bg-slate-800/70 p-4 rounded-lg border border-slate-700">
                 <div className="flex justify-between items-center">
                    <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                        <IconSparkles className="text-blue-400" />
                        Seu Resumo Inteligente do Dia
                    </h2>
                     <button onClick={onRegenerate} className="mt-2 p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white">
                        <IconRefresh size={16} />
                    </button>
                 </div>
                <div className="text-center py-8 text-slate-400">
                    <p>Clique no botão de recarregar para gerar seu resumo.</p>
                </div>
             </div>
        )
    }


    return (
        <div className="bg-slate-800/70 p-4 rounded-lg border border-slate-700 backdrop-blur-sm">
            <div className="flex justify-between items-start mb-3">
                <h2 className="text-lg font-semibold text-slate-100 flex items-center gap-2">
                    <IconSparkles className="text-blue-400" />
                    {summary.greeting}
                </h2>
                <button
                    onClick={onRegenerate}
                    disabled={isLoading}
                    className="p-1.5 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white transition-colors"
                    title="Gerar novo resumo"
                >
                    <IconRefresh size={16} />
                </button>
            </div>
            
             <p className="text-sm italic text-slate-400 mb-4">"{summary.motivationalQuote}"</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                    <h3 className="font-semibold text-slate-300 mb-2">Alertas Críticos</h3>
                    {summary.criticalAlerts.length > 0 ? (
                        <ul className="space-y-2">
                            {summary.criticalAlerts.map((alert, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm p-2 bg-slate-900/50 rounded-md">
                                    <span className="mt-0.5">{alertIcons[alert.type]}</span>
                                    <span>{alert.description}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-500 italic">Nenhum alerta crítico hoje.</p>
                    )}
                </div>
                <div>
                     <h3 className="font-semibold text-slate-300 mb-2">Foco do Dia</h3>
                     {summary.dailyFocus.length > 0 ? (
                        <ul className="space-y-2">
                            {summary.dailyFocus.map((focus, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm p-2 bg-slate-900/50 rounded-md">
                                    <span className="mt-0.5 text-slate-400">{focusIcons[focus.type]}</span>
                                    <span>{focus.description}</span>
                                </li>
                            ))}
                        </ul>
                     ) : (
                        <p className="text-sm text-slate-500 italic">Nenhum item de foco para hoje.</p>
                     )}
                </div>
            </div>
        </div>
    );
};

export default SmartSummary;