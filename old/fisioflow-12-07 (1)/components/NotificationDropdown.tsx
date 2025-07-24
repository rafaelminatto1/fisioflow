import React, { useMemo } from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import { IconBell, IconClock, IconClipboardCheck, IconActivity } from './icons/IconComponents';
import { useTasks } from '../hooks/useTasks';
import { useExerciseLogs } from '../hooks/useExerciseLogs';
import { useUsers } from '../hooks/useUsers';
import { usePatients } from '../hooks/usePatients';

interface NotificationDropdownProps {
    closeDropdown: () => void;
}

const formatDistanceToNow = (date: Date): string => {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    let interval = seconds / 31536000;
    if (interval > 1) return `${Math.floor(interval)}a atrás`;
    interval = seconds / 2592000;
    if (interval > 1) return `${Math.floor(interval)}m atrás`;
    interval = seconds / 86400;
    if (interval > 1) return `${Math.floor(interval)}d atrás`;
    interval = seconds / 3600;
    if (interval > 1) return `${Math.floor(interval)}h atrás`;
    interval = seconds / 60;
    if (interval > 1) return `${Math.floor(interval)}min atrás`;
    return `agora`;
};

const NotificationItem: React.FC<{ icon: React.ReactNode; text: React.ReactNode; time: string }> = ({ icon, text, time }) => (
    <li className="p-3 hover:bg-slate-700/50 rounded-md">
        <div className="flex items-start gap-3">
            <div className="text-blue-400 mt-1">{icon}</div>
            <div className="flex-1">
                <p className="text-sm text-slate-200">{text}</p>
                <p className="text-xs text-slate-400">{time}</p>
            </div>
        </div>
    </li>
);

const NotificationDropdown: React.FC<NotificationDropdownProps> = ({ closeDropdown }) => {
    const { user } = useAuth();
    const { tasks = [] } = useTasks();
    const { exerciseLogs = [] } = useExerciseLogs();
    const { users = [] } = useUsers();
    const { patients = [] } = usePatients();
    
    const notifications = useMemo(() => {
        if (!user) return [];
        
        const allNotifications: { date: Date; component: React.ReactNode }[] = [];
        const now = new Date();

        // 1. Tasks for review (for mentors)
        if (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA) {
            tasks
                .filter(t => t.status === 'review' && t.assigneeId)
                .forEach(t => {
                    const submitter = users.find(u => u.id === t.assigneeId);
                    // Assume tasks don't have a created date, use a recent but fixed date for demo
                    allNotifications.push({
                        date: new Date(now.getTime() - Math.random() * 1000 * 3600 * 24),
                        component: (
                            <NotificationItem
                                icon={<IconClipboardCheck size={18} />}
                                text={<><strong>{submitter?.name || 'Um estagiário'}</strong> enviou a tarefa <strong>"{t.title}"</strong> para revisão.</>}
                                time={formatDistanceToNow(new Date(now.getTime() - Math.random() * 1000 * 3600 * 24))}
                            />
                        ),
                    });
                });
        }
        
        // 2. New exercise logs (for therapists/admins)
        if(user.role !== UserRole.ESTAGIARIO) {
            exerciseLogs.forEach(log => {
                const patient = patients.find(p => p.id === log.patientId);
                allNotifications.push({
                    date: new Date(log.date),
                    component: (
                         <NotificationItem
                            icon={<IconActivity size={18} />}
                            text={<><strong>{patient?.name || 'Um paciente'}</strong> registrou um novo progresso de exercício.</>}
                            time={formatDistanceToNow(new Date(log.date))}
                        />
                    )
                })
            });
        }
        
        // 3. Overdue tasks for the current user
        tasks
            .filter(t => t.assigneeId === user.id && t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now)
            .forEach(t => {
                allNotifications.push({
                    date: new Date(t.dueDate!),
                     component: (
                        <NotificationItem
                            icon={<IconClock size={18} />}
                            text={<>A tarefa <strong>"{t.title}"</strong> está atrasada.</>}
                            time={`Venceu em ${new Date(t.dueDate!).toLocaleDateString('pt-BR')}`}
                        />
                    )
                })
            });

        return allNotifications
            .sort((a,b) => b.date.getTime() - a.date.getTime())
            .slice(0, 10); // Show latest 10 notifications
    }, [user, tasks, exerciseLogs, users, patients]);

    return (
        <div 
            className="absolute top-full right-0 mt-2 w-80 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50 text-white animate-fade-in-down"
            onClick={closeDropdown}
        >
            <div className="p-3 border-b border-slate-700">
                <h3 className="font-semibold text-slate-100">Notificações</h3>
            </div>
            {notifications.length > 0 ? (
                <ul className="p-2 max-h-96 overflow-y-auto">
                    {notifications.map((n, index) => <React.Fragment key={index}>{n.component}</React.Fragment>)}
                </ul>
            ) : (
                <div className="p-8 text-center text-slate-400">
                    <IconBell className="mx-auto mb-2 text-slate-500" size={24}/>
                    <p>Você não tem novas notificações.</p>
                </div>
            )}
        </div>
    );
};

export default NotificationDropdown;