import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { Appointment, Patient, Task, User, UserRole, Transaction, ClinicalProtocol, Service, AppointmentType } from '../types.js';
import { IconChevronRight, IconPlus, IconAlertTriangle, IconFileText, IconDollarSign, IconCheckCircle, IconHistory, IconLock, IconBell, IconChevronLeft } from './icons/IconComponents.js';
import { useAppointments } from '../hooks/useAppointments.js';
import { usePatients } from '../hooks/usePatients.js';
import { useUsers } from '../hooks/useUsers.js';
import Skeleton from './ui/Skeleton.js';
import { useNotification } from '../hooks/useNotification.js';
import EmptyState from './ui/EmptyState.js';
import { processAppointmentsForLayout } from '../utils/calendarUtils.js';
import { useTasks } from '../hooks/useTasks.js';
import { useTransactions } from '../hooks/useTransactions.js';
import TransactionModal from './TransactionModal.js';
import { useClinicalProtocols } from '../hooks/useClinicalProtocols.js';
import { useServices } from '../hooks/useServices.js';
import AppointmentPopover from './AppointmentPopover.js';
import AppointmentModal from './AppointmentModal.js';
import ConfirmationModal from './ConfirmationModal.js';
import BlockTimeModal from './BlockTimeModal.js';
import TaskModal from './TaskModal.js';

type CalendarView = 'month' | 'week' | 'day' | 'agenda';

const STATUS_CLASSES: Record<Appointment['status'], { bg: string, border: string, text: string, hover: string }> = {
    agendado: { bg: 'bg-blue-600/90', border: 'border-blue-400', text: 'text-white', hover: 'hover:bg-blue-500' },
    confirmado: { bg: 'bg-emerald-600/90', border: 'border-emerald-400', text: 'text-white', hover: 'hover:bg-emerald-500' },
    realizado: { bg: 'bg-slate-600/90', border: 'border-slate-400', text: 'text-slate-200', hover: 'hover:bg-slate-500' },
    cancelado: { bg: 'bg-red-800/70', border: 'border-red-600', text: 'text-red-200 line-through', hover: 'hover:bg-red-700' },
    em_atendimento: { bg: 'bg-purple-600/90', border: 'border-purple-400', text: 'text-white', hover: 'hover:bg-purple-500' },
};

const CalendarPage: React.FC = () => {
    const { user } = useAuth();
    const { appointments = [], saveAppointment, deleteAppointment, deleteAppointmentSeries, isLoading: isLoadingAppointments, isError: isErrorAppointments } = useAppointments();
    const { patients = [], savePatient, isLoading: isLoadingPatients } = usePatients();
    const { users = [], isLoading: isLoadingUsers } = useUsers();
    const { tasks = [], saveTask: saveTaskHook, deleteTask: deleteTaskFromHook, isLoading: isLoadingTasks } = useTasks();
    const { saveTransaction } = useTransactions();
    const { protocols = [] } = useClinicalProtocols();
    const { services = [] } = useServices();
    const { addNotification } = useNotification();
    
    const [currentDate, setCurrentDate] = useState(new Date());
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [view, setView] = useState<CalendarView>(window.innerWidth < 768 ? 'agenda' : 'week');

    // Modals
    const [isApptModalOpen, setIsApptModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [isBlockTimeModalOpen, setIsBlockTimeModalOpen] = useState(false);
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);

    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | Partial<Appointment> | null>(null);
    const [selectedTask, setSelectedTask] = useState<Task | Partial<Task> | null>(null);

    const [initialModalDate, setInitialModalDate] = useState<string | undefined>();
    const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);

    const [now, setNow] = useState(new Date());
    const [therapistFilter, setTherapistFilter] = useState('all');
    const timerRef = useRef<number | null>(null);
    
    const isLoading = isLoadingAppointments || isLoadingPatients || isLoadingUsers || isLoadingTasks;

    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    const gridStartHour = 7;
    const gridEndHour = 20;
    const dynamicWidth = '(100% - 4rem)';

    useEffect(() => {
        timerRef.current = window.setInterval(() => setNow(new Date()), 60000);
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            if(mobile !== isMobile) {
                setIsMobile(mobile);
                setView(mobile ? 'agenda' : 'week');
            }
        }
        window.addEventListener('resize', handleResize);
        return () => {
            if (timerRef.current) window.clearInterval(timerRef.current);
            window.removeEventListener('resize', handleResize);
        };
    }, [isMobile]);

    const filteredAppointments = useMemo(() => {
        if (therapistFilter === 'all') return appointments;
        return appointments.filter(appt => appt.therapistId === therapistFilter);
    }, [appointments, therapistFilter]);

    const getAppointmentsForDay = useCallback((day: Date) => {
        return filteredAppointments.filter(appt => new Date(appt.start).toDateString() === day.toDateString()).sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    }, [filteredAppointments]);
    
    const getRemindersForDay = useCallback((day: Date) => {
        const dayString = day.toISOString().split('T')[0];
        return tasks.filter(t => t.isReminder && t.dueDate && t.dueDate.toISOString().split('T')[0] === dayString);
    }, [tasks]);

    const calendarGrid = useMemo(() => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const firstDayOfMonth = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const grid: ({ day: number; isCurrentMonth: boolean; date: Date })[] = [];
        const daysInPrevMonth = new Date(year, month, 0).getDate();
        for (let i = firstDayOfMonth - 1; i >= 0; i--) {
            grid.push({ day: daysInPrevMonth - i, isCurrentMonth: false, date: new Date(year, month - 1, daysInPrevMonth - i) });
        }
        for (let i = 1; i <= daysInMonth; i++) {
            grid.push({ day: i, isCurrentMonth: true, date: new Date(year, month, i) });
        }
        const gridEnd = 42 - grid.length;
        for (let i = 1; i <= gridEnd; i++) {
            grid.push({ day: i, isCurrentMonth: false, date: new Date(year, month + 1, i) });
        }
        return grid;
    }, [currentDate]);

    const weekGrid = useMemo(() => {
        const startOfWeek = new Date(currentDate);
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
        const dates = Array.from({ length: 7 }).map((_, i) => {
            const d = new Date(startOfWeek);
            d.setDate(d.getDate() + i);
            return d;
        });
        const gridAppointments = dates.map(date => ({
            date,
            appointments: processAppointmentsForLayout(getAppointmentsForDay(date), gridStartHour, gridEndHour),
            reminders: getRemindersForDay(date),
        }));
        return { dates, gridAppointments };
    }, [currentDate, getAppointmentsForDay, getRemindersForDay]);
    
    const agendaAppointments = useMemo(() => {
        const today = new Date();
        today.setHours(0,0,0,0);
        return filteredAppointments
            .filter(a => new Date(a.start).getTime() >= today.getTime())
            .sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .reduce((acc: Record<string, Appointment[]>, appt) => {
                const dateKey = new Date(appt.start).toLocaleDateString('pt-BR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
                if (!acc[dateKey]) {
                    acc[dateKey] = [];
                }
                acc[dateKey].push(appt);
                return acc;
            }, {} as Record<string, Appointment[]>);
    }, [filteredAppointments]);

    const handlePrev = useCallback(() => {
        setCurrentDate(prevDate => {
            const newDate = new Date(prevDate);
            if (view === 'month') newDate.setMonth(newDate.getMonth() - 1);
            else if (view === 'week') newDate.setDate(newDate.getDate() - 7);
            else if (view === 'day') newDate.setDate(newDate.getDate() - 1);
            return newDate;
        });
    }, [view]);

    const handleNext = useCallback(() => {
        setCurrentDate(prevDate => {
             const newDate = new Date(prevDate);
            if (view === 'month') newDate.setMonth(newDate.getMonth() + 1);
            else if (view === 'week') newDate.setDate(newDate.getDate() + 7);
            else if (view === 'day') newDate.setDate(newDate.getDate() + 1);
            return newDate;
        });
    }, [view]);

    const handleTimeSlotClick = (date: Date, hour: number) => {
        const start = new Date(date);
        start.setHours(hour, 0, 0, 0);
        setInitialModalDate(start.toISOString().split('T')[0]);
        setSelectedAppointment({ therapistId: user?.id, start: start.toISOString() });
        setIsApptModalOpen(true);
    };

    const handleOpenApptModal = (appointment: Appointment | Partial<Appointment> | null) => {
        setSelectedAppointment(appointment);
        setIsApptModalOpen(true);
    };

    const handleOpenTaskModal = (task: Task) => {
        setSelectedTask(task);
        setIsTaskModalOpen(true);
    };

    const handleCloseModals = () => {
        setIsApptModalOpen(false);
        setIsConfirmModalOpen(false);
        setIsBlockTimeModalOpen(false);
        setIsTaskModalOpen(false);
        setSelectedAppointment(null);
        setAppointmentToDelete(null);
        setSelectedTask(null);
        setInitialModalDate(undefined);
    };

    const handleSaveAppointment = async (appt: Partial<Appointment>) => {
        if (!user) return;
        try {
            await saveAppointment(appt);
            handleCloseModals();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
        }
    };
    
    const handleDeleteAppointment = async (scope: 'single' | 'all') => {
        if (!appointmentToDelete) return;
        try {
            if (scope === 'all' && appointmentToDelete.recurringId) {
                await deleteAppointmentSeries(appointmentToDelete.id);
            } else {
                await deleteAppointment(appointmentToDelete.id);
            }
            handleCloseModals();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: (error as Error).message });
        }
    };

    const renderHeader = () => {
        const headerText = {
            month: `${monthNames[currentDate.getMonth()]} ${currentDate.getFullYear()}`,
            week: `Semana de ${weekGrid.dates[0].toLocaleDateString('pt-BR')} a ${weekGrid.dates[6].toLocaleDateString('pt-BR')}`,
            day: `${currentDate.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'})}`,
            agenda: 'Agenda Futura'
        };

        return (
            <header className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2">
                    {view !== 'agenda' && (
                        <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700">
                            <button onClick={handlePrev} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-l-md"><IconChevronLeft /></button>
                            <button onClick={() => setCurrentDate(new Date())} className="px-4 py-1.5 text-sm font-semibold border-x border-slate-700 hover:bg-slate-700/50">Hoje</button>
                            <button onClick={handleNext} className="p-2 text-slate-400 hover:text-white hover:bg-slate-700/50 rounded-r-md"><IconChevronRight /></button>
                        </div>
                    )}
                    <h1 className="text-xl font-bold text-slate-100">{headerText[view]}</h1>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto">
                     {users.filter(u => u.role !== UserRole.PACIENTE).length > 1 && (
                        <select
                            value={therapistFilter}
                            onChange={(e) => setTherapistFilter(e.target.value)}
                            className="w-full md:w-auto bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                        >
                            <option value="all">Todos Terapeutas</option>
                            {users.filter(u => u.role !== UserRole.PACIENTE).map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                     )}
                    <div className="hidden md:flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                        {(['day', 'week', 'month', 'agenda'] as CalendarView[]).map(v => (
                            <button key={v} onClick={() => setView(v)} className={`px-3 py-1 text-sm font-semibold rounded-md transition-colors capitalize ${view === v ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-600'}`}>{v}</button>
                        ))}
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setIsBlockTimeModalOpen(true)} className="flex-shrink-0 p-2 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-lg transition-colors" title="Bloquear Horário"><IconLock/></button>
                        <button onClick={() => handleOpenApptModal({})} className="w-full md:w-auto flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"><IconPlus /> Agendamento</button>
                    </div>
                </div>
            </header>
        );
    }
    
    const renderWeekView = () => (
         <div className="flex-1 flex flex-col bg-slate-800 border border-slate-700 rounded-lg">
            <div className="grid grid-cols-[4rem_1fr] flex-1">
                {/* Hours Column */}
                <div className="border-r border-slate-700">
                    <div className="h-10"></div> {/* Placeholder for day header */}
                     {Array.from({ length: gridEndHour - gridStartHour }).map((_, i) => (
                        <div key={i} className="h-20 text-right pr-2 text-xs text-slate-400 border-t border-slate-700 pt-1">
                            {`${gridStartHour + i}:00`}
                        </div>
                    ))}
                </div>
                {/* Days Columns */}
                <div className="grid grid-cols-7 flex-1">
                    {weekGrid.dates.map((date, dayIndex) => (
                        <div key={dayIndex} className="relative border-r border-slate-700 last:border-r-0">
                            <div className="h-10 sticky top-0 bg-slate-800/80 backdrop-blur-sm z-10 flex items-center justify-center text-center p-1 border-b border-slate-700">
                                <span className="text-xs text-slate-400">{weekDays[date.getDay()]}</span>
                                <span className={`ml-2 text-lg font-semibold ${new Date().toDateString() === date.toDateString() ? 'text-blue-400' : 'text-slate-200'}`}>{date.getDate()}</span>
                            </div>
                            
                            {/* Time Slots for clicking */}
                             {Array.from({ length: gridEndHour - gridStartHour }).map((_, i) => (
                                <div key={i} className="h-20 border-t border-slate-700/50" onClick={() => handleTimeSlotClick(date, gridStartHour + i)}></div>
                            ))}
                            
                            {/* Appointments */}
                             <div className="absolute top-10 left-0 right-0 bottom-0">
                                 {weekGrid.gridAppointments[dayIndex]?.appointments.map(appt => (
                                     <AppointmentPopover key={appt.id} appointment={appt}>
                                        <div
                                            onClick={() => handleOpenApptModal(appt)}
                                            className={`absolute p-1 rounded-md text-xs cursor-pointer overflow-hidden ${STATUS_CLASSES[appt.status].bg} ${STATUS_CLASSES[appt.status].hover} border-l-4 ${STATUS_CLASSES[appt.status].border}`}
                                            style={{ top: `${appt.top}%`, height: `${appt.height}%`, left: `${appt.left}%`, width: `calc(${dynamicWidth} / ${appt.columns} - 2px)` }}
                                        >
                                            <p className={`font-semibold truncate ${STATUS_CLASSES[appt.status].text}`}>{appt.title}</p>
                                            <p className={`truncate ${STATUS_CLASSES[appt.status].text}`}>{patients.find(p => p.id === appt.patientId)?.name || 'Bloqueio'}</p>
                                        </div>
                                    </AppointmentPopover>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
    
    const renderMonthView = () => (
        <div className="p-4 text-slate-400">Month view not fully implemented in provided code.</div>
    );
    const renderDayView = () => (
        <div className="p-4 text-slate-400">Day view not fully implemented in provided code.</div>
    );

    const renderAgendaView = () => (
        <div className="space-y-6">
            {Object.keys(agendaAppointments).map(dateKey => (
                <div key={dateKey}>
                    <h2 className="font-bold text-slate-200 mb-2">{dateKey}</h2>
                    <div className="space-y-2">
                        {agendaAppointments[dateKey].map(appt => (
                            <div key={appt.id} onClick={() => handleOpenApptModal(appt)} className={`p-3 rounded-lg flex items-center gap-4 cursor-pointer border-l-4 ${STATUS_CLASSES[appt.status].border} ${STATUS_CLASSES[appt.status].bg}`}>
                                <div className="font-semibold">{new Date(appt.start).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}</div>
                                <div className="flex-1">
                                    <p className="font-bold">{appt.title}</p>
                                    <p className="text-sm">{patients.find(p => p.id === appt.patientId)?.name || 'Bloqueio'}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex flex-col h-full">
            {renderHeader()}
            <div className="flex-1 overflow-auto">
                {isLoading ? (
                     <div className="flex-1 flex items-center justify-center">
                        <Skeleton className="w-full h-full" />
                    </div>
                ): isErrorAppointments ? (
                     <div className="flex-1 flex items-center justify-center p-4">
                        <EmptyState icon={<IconAlertTriangle/>} title="Erro ao Carregar Agendamentos" message="Não foi possível buscar os dados. Tente novamente."/>
                    </div>
                ) : (
                    <>
                        {view === 'week' && renderWeekView()}
                        {view === 'month' && renderMonthView()}
                        {view === 'day' && renderDayView()}
                        {view === 'agenda' && renderAgendaView()}
                    </>
                )}
            </div>

            {isApptModalOpen && (
                <AppointmentModal
                    isOpen={isApptModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveAppointment}
                    onDelete={(id) => {
                        const appt = appointments.find(a => a.id === id);
                        if (appt?.recurringId) {
                            setAppointmentToDelete(appt);
                            setIsConfirmModalOpen(true);
                        } else if (appt) {
                            setAppointmentToDelete(appt);
                            handleDeleteAppointment('single');
                        }
                    }}
                    onAddNewPatient={async (name: string): Promise<Patient | null> => {
                        if (!user) return null;
                        return savePatient({
                            name,
                            email: '',
                            phone: '',
                            medicalHistory: 'Novo paciente cadastrado via agenda.',
                            avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
                        } as Patient);
                    }}
                    appointment={selectedAppointment}
                    users={users}
                    patients={patients}
                    services={services}
                    protocols={protocols}
                    initialDate={initialModalDate}
                />
            )}

            {isConfirmModalOpen && appointmentToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={handleCloseModals}
                    onConfirm={handleDeleteAppointment}
                    title="Excluir Agendamento Recorrente"
                    message="Este agendamento faz parte de uma série. Você deseja excluir apenas este evento ou toda a série futura?"
                />
            )}

            {isBlockTimeModalOpen && (
                <BlockTimeModal
                    isOpen={isBlockTimeModalOpen}
                    onClose={handleCloseModals}
                    onSave={handleSaveAppointment}
                    initialDate={initialModalDate}
                />
            )}

            {isTaskModalOpen && user && (
                <TaskModal
                    isOpen={isTaskModalOpen}
                    onClose={handleCloseModals}
                    onSave={async (task) => { await saveTaskHook(task); }}
                    onDelete={async (taskId) => { await deleteTaskFromHook({taskId, userId: user.id}); }}
                    task={selectedTask}
                    users={users}
                    patients={patients}
                />
            )}
        </div>
    );
};

export default CalendarPage;