
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '/hooks/useAuth.js';
import { BreadcrumbItem, UserRole } from '/types.js';
import { IconChevronRight, IconBell } from '/components/icons/IconComponents.js';
import NotificationDropdown from '/components/NotificationDropdown.js';
import { useTasks } from '/hooks/useTasks.js';
import { useExerciseLogs } from '/hooks/useExerciseLogs.js';
import { useChatMessages } from '/hooks/useChatMessages.js';

const useClickOutside = (ref: React.RefObject<HTMLDivElement>, handler: () => void) => {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return;
            }
            handler();
        };
        document.addEventListener('mousedown', listener);
        document.addEventListener('touchstart', listener);
        return () => {
            document.removeEventListener('mousedown', listener);
            document.removeEventListener('touchstart', listener);
        };
    }, [ref, handler]);
};

const Header: React.FC<{ breadcrumbs: BreadcrumbItem[] }> = ({ breadcrumbs }) => {
    const { user } = useAuth();
    const { tasks = [] } = useTasks();
    const { exerciseLogs = [] } = useExerciseLogs();
    const { messages: chatMessages = [] } = useChatMessages();

    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useClickOutside(dropdownRef, () => setIsDropdownOpen(false));

    const notificationCount = useMemo(() => {
        if (!user) return 0;
        
        let count = 0;
        const now = new Date();

        // Tasks for review (for mentors)
        if (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA) {
            count += tasks.filter(t => t.status === 'review').length;
        }

        // New exercise logs from patients (for therapists)
        if (user.role !== UserRole.ESTAGIARIO) {
            const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
            count += exerciseLogs.filter(log => new Date(log.date) > oneDayAgo).length;
        }
        
        // Unread messages from patients (for therapists/admins)
        if (user.role === UserRole.ADMIN || user.role === UserRole.FISIOTERAPEUTA) {
            const myPatientIds = new Set(tasks.filter(t => t.assigneeId === user.id).map(t => t.patientId));
            // Very simplified: count recent messages from any patient if they are not the sender
            const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);
            count += chatMessages.filter(msg => msg.senderId !== user.id && new Date(msg.timestamp) > twoDaysAgo).length;
        }

        // Overdue tasks for the user
        count += tasks.filter(t => t.assigneeId === user.id && t.status !== 'done' && t.dueDate && new Date(t.dueDate) < now).length;
        
        return count;
    }, [user, tasks, exerciseLogs, chatMessages]);

    return (
        <header className="flex-shrink-0 bg-slate-900 border-b border-slate-700 px-4 md:px-6 py-3 flex items-center justify-between no-print">
            <div className="hidden md:flex items-center text-sm">
                {breadcrumbs.map((crumb, index) => (
                    <div key={index} className="flex items-center">
                        <Link to={crumb.href} className="text-slate-400 hover:text-slate-200 transition-colors">
                            {crumb.name}
                        </Link>
                        {index < breadcrumbs.length - 1 && (
                            <IconChevronRight className="h-4 w-4 text-slate-500 mx-1" />
                        )}
                    </div>
                ))}
            </div>
            <div className="md:hidden">
                {/* Placeholder for mobile menu icon if needed in the future */}
            </div>
            <div className="flex items-center space-x-4">
                <div className="relative" ref={dropdownRef}>
                    <button 
                        onClick={() => setIsDropdownOpen(prev => !prev)}
                        className="relative text-slate-400 hover:text-slate-100 transition-colors"
                    >
                        <IconBell />
                        {notificationCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                    {isDropdownOpen && <NotificationDropdown closeDropdown={() => setIsDropdownOpen(false)} />}
                </div>

                {user && (
                    <div className="flex items-center">
                        <img src={user.avatarUrl} alt={user.name} className="w-8 h-8 rounded-full mr-3" />
                        <div className="hidden md:block">
                            <p className="text-sm font-semibold text-slate-100">{user.name}</p>
                            <p className="text-xs text-slate-400 capitalize">{user.role}</p>
                        </div>
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;