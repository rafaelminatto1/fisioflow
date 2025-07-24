


import React from 'react';
import { Achievement, Notebook, Task } from './types';
import { IconBook, IconClipboardList, IconStar, IconFlame, IconAward, IconTrophy, IconClipboardCheck, IconCrosshair, IconMessageCircle } from './components/icons/IconComponents';


export const TASK_STATUSES: Record<Task['status'], string> = {
    todo: 'A Fazer',
    in_progress: 'Em Progresso',
    review: 'Em Revisão',
    done: 'Concluído',
};

export const TASK_STATUS_COLORS: Record<Task['status'], string> = {
    todo: 'bg-slate-500',
    in_progress: 'bg-blue-500',
    review: 'bg-amber-500',
    done: 'bg-emerald-500',
};

export const TASK_PRIORITY_STYLES: Record<Task['priority'], { color: string; icon: React.ReactNode }> = {
    low: { color: 'text-slate-400', icon: '↓' },
    medium: { color: 'text-yellow-400', icon: '•' },
    high: { color: 'text-orange-400', icon: '↑' },
    urgent: { color: 'text-red-500', icon: '!!' },
};

export const CANNED_CHAT_RESPONSES = [
    { title: "Lembrete de Exercícios", text: "Olá! Passando para lembrar sobre a importância de realizar seus exercícios em casa para uma boa recuperação. Qualquer dúvida, estou à disposição!" },
    { title: "Confirmar Agendamento", text: "Olá, tudo bem? Gostaria de confirmar seu agendamento para [DATA] às [HORA]. Por favor, responda com 'SIM' para confirmar." },
    { title: "Feedback da Sessão", text: "Olá! Como você está se sentindo após a nossa última sessão? Houve alguma melhora, dor ou desconforto?" },
];

export const ACHIEVEMENTS_LIST: Achievement[] = [
    { id: 'first-log', title: 'Primeiro Passo', description: 'Você registrou seu primeiro exercício!', icon: <IconStar className="text-yellow-400" /> },
    { id: 'streak-3', title: 'Começando com Tudo', description: 'Manteve uma sequência de 3 dias!', icon: <IconFlame className="text-orange-400" /> },
    { id: 'streak-7', title: 'Semana Incrível', description: '7 dias seguidos de exercícios!', icon: <IconFlame className="text-red-500" /> },
    { id: 'level-2', title: 'Nível 2', description: 'Alcançou o nível 2. Continue assim!', icon: <IconAward className="text-gray-400" /> },
    { id: 'level-5', title: 'Nível 5', description: 'Chegou ao nível 5! Você está no caminho certo.', icon: <IconTrophy className="text-amber-400" /> },
    { id: 'first-assessment', title: 'Check-up Completo', description: 'Concluiu sua primeira avaliação detalhada.', icon: <IconClipboardCheck className="text-green-400" /> },
    { id: 'goal-achieved', title: 'Meta Pessoal Atingida', description: 'Você completou uma de suas metas pessoais!', icon: <IconCrosshair className="text-blue-400" /> },
    { id: 'first-feedback', title: 'Comunicador', description: 'Enviou seu primeiro feedback via chat.', icon: <IconMessageCircle className="text-indigo-400" /> },
];

export const NOTEBOOKS: Notebook[] = [
    {
        id: 'nb-1',
        title: 'Protocolos Clínicos',
        icon: <IconBook />,
        pages: [
            { id: 'page-1-1', title: 'Avaliação de Ombro' },
            { id: 'page-1-2', title: 'Pós-operatório de LCA' },
        ],
    },
    {
        id: 'nb-2',
        title: 'Gestão da Clínica',
        icon: <IconClipboardList />,
        pages: [
            { id: 'page-2-1', title: 'Processos de Faturamento' },
            { id: 'page-2-2', title: 'Onboarding de Estagiários' },
        ],
    },
];