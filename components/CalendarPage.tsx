import React, { useState, useMemo, useCallback } from 'react';

import { useAuth } from '../src/hooks/useAuthSimple';
import { useData } from '../hooks/useData';
import { Appointment, TimeBlock, UserRole } from '../types';

import AppointmentModal from './AppointmentModal';
import {
  IconChevronRight,
  IconPlus,
  IconLayoutGrid,
  IconList,
  IconClock,
} from './icons/IconComponents';
import TimeBlockModal from './TimeBlockModal';

const CalendarPage: React.FC = () => {
  const { user } = useAuth();
  const {
    appointments,
    timeBlocks,
    patients,
    users,
    saveAppointment,
    deleteAppointment,
    saveTimeBlock,
    deleteTimeBlock,
  } = useData();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('week');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<
    Appointment | Partial<Appointment> | null
  >(null);
  const [initialDateForModal, setInitialDateForModal] = useState<
    string | undefined
  >(undefined);

  // Time block modal states
  const [isTimeBlockModalOpen, setIsTimeBlockModalOpen] = useState(false);
  const [selectedTimeBlock, setSelectedTimeBlock] = useState<
    TimeBlock | Partial<TimeBlock> | null
  >(null);

  // Therapist filter
  const [selectedTherapist, setSelectedTherapist] = useState<string>('');

  const handleOpenNewModal = (date: Date, time?: string) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const initialDateStr = `${yyyy}-${mm}-${dd}`;

    const startISO = time
      ? new Date(`${initialDateStr}T${time}`).toISOString()
      : new Date(initialDateStr).toISOString();
    const endISO = time
      ? new Date(new Date(startISO).getTime() + 50 * 60000).toISOString()
      : new Date(new Date(startISO).getTime() + 50 * 60000).toISOString();

    setInitialDateForModal(initialDateStr);
    setSelectedAppointment({
      title: '',
      therapistId: user?.id,
      start: startISO,
      end: endISO,
      notes: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (appointment: Appointment) => {
    setInitialDateForModal(undefined);
    setSelectedAppointment(appointment);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedAppointment(null);
    setInitialDateForModal(undefined);
  };

  const handleSave = (appointment: Appointment) => {
    if (!user) return;
    saveAppointment(appointment, user);
    handleCloseModal();
  };

  const handleDelete = (appointmentId: string) => {
    if (!user) return;
    deleteAppointment(appointmentId, user);
    handleCloseModal();
  };

  // Time block handlers
  const handleOpenNewTimeBlockModal = (date: Date, time?: string) => {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const initialDateStr = `${yyyy}-${mm}-${dd}`;

    const startISO = time
      ? new Date(`${initialDateStr}T${time}`).toISOString()
      : new Date(initialDateStr).toISOString();
    const endISO = time
      ? new Date(new Date(startISO).getTime() + 50 * 60000).toISOString()
      : new Date(new Date(startISO).getTime() + 50 * 60000).toISOString();

    setSelectedTimeBlock({
      title: '',
      therapistId: user?.id,
      start: startISO,
      end: endISO,
      type: 'break',
      description: '',
    });
    setIsTimeBlockModalOpen(true);
  };

  const handleOpenEditTimeBlockModal = (timeBlock: TimeBlock) => {
    setSelectedTimeBlock(timeBlock);
    setIsTimeBlockModalOpen(true);
  };

  const handleCloseTimeBlockModal = () => {
    setIsTimeBlockModalOpen(false);
    setSelectedTimeBlock(null);
  };

  const handleSaveTimeBlock = (timeBlock: TimeBlock) => {
    if (!user) return;
    saveTimeBlock(timeBlock, user);
    handleCloseTimeBlockModal();
  };

  const handleDeleteTimeBlock = (timeBlockId: string) => {
    if (!user) return;
    deleteTimeBlock(timeBlockId, user);
    handleCloseTimeBlockModal();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>, newDate: Date) => {
    e.preventDefault();
    const appointmentId = e.dataTransfer.getData('appointmentId');
    const originalAppointment = appointments.find(
      (a) => a.id === appointmentId
    );

    if (originalAppointment && user) {
      const originalStartDate = new Date(originalAppointment.start);
      const originalEndDate = new Date(originalAppointment.end);
      const duration = originalEndDate.getTime() - originalStartDate.getTime();

      const newStartDate = new Date(newDate);
      const newEndDate = new Date(newStartDate.getTime() + duration);

      saveAppointment(
        {
          ...originalAppointment,
          start: newStartDate.toISOString(),
          end: newEndDate.toISOString(),
        },
        user
      );
    }
    e.currentTarget.classList.remove('bg-blue-900/50');
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.currentTarget.classList.add('bg-blue-900/50');
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.currentTarget.classList.remove('bg-blue-900/50');
  };

  // Filter appointments and time blocks by selected therapist
  const filteredAppointments = useMemo(() => {
    return selectedTherapist
      ? appointments.filter((appt) => appt.therapistId === selectedTherapist)
      : appointments;
  }, [appointments, selectedTherapist]);

  const filteredTimeBlocks = useMemo(() => {
    return selectedTherapist
      ? timeBlocks.filter((tb) => tb.therapistId === selectedTherapist)
      : timeBlocks;
  }, [timeBlocks, selectedTherapist]);

  return (
    <div className="flex h-full flex-col">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
        onNewAppointment={() => handleOpenNewModal(new Date())}
        onNewTimeBlock={() => handleOpenNewTimeBlockModal(new Date())}
        selectedTherapist={selectedTherapist}
        onTherapistChange={setSelectedTherapist}
        therapists={users.filter((u) => u.role !== UserRole.PACIENTE)}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {view === 'month' ? (
          <MonthView
            currentDate={currentDate}
            appointments={filteredAppointments}
            timeBlocks={filteredTimeBlocks}
            patients={patients}
            onOpenNewModal={handleOpenNewModal}
            onOpenEditModal={handleOpenEditModal}
            onOpenEditTimeBlockModal={handleOpenEditTimeBlockModal}
          />
        ) : (
          <WeekView
            currentDate={currentDate}
            appointments={filteredAppointments}
            timeBlocks={filteredTimeBlocks}
            patients={patients}
            onOpenNewModal={handleOpenNewModal}
            onOpenEditModal={handleOpenEditModal}
            onOpenEditTimeBlockModal={handleOpenEditTimeBlockModal}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
          />
        )}
      </div>
      {isModalOpen && (
        <AppointmentModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSave}
          onDelete={handleDelete}
          appointment={selectedAppointment}
          users={users.filter((u) => u.role !== UserRole.PACIENTE)}
          patients={patients}
          initialDate={initialDateForModal}
        />
      )}

      {isTimeBlockModalOpen && (
        <TimeBlockModal
          isOpen={isTimeBlockModalOpen}
          onClose={handleCloseTimeBlockModal}
          onSave={handleSaveTimeBlock}
          onDelete={handleDeleteTimeBlock}
          timeBlock={selectedTimeBlock}
          users={users.filter((u) => u.role !== UserRole.PACIENTE)}
        />
      )}
    </div>
  );
};

const CalendarHeader: React.FC<{
  currentDate: Date;
  setCurrentDate: React.Dispatch<React.SetStateAction<Date>>;
  view: 'week' | 'month';
  setView: (view: 'week' | 'month') => void;
  onNewAppointment: () => void;
  onNewTimeBlock: () => void;
  selectedTherapist: string;
  onTherapistChange: (therapistId: string) => void;
  therapists: any[];
}> = ({
  currentDate,
  setCurrentDate,
  view,
  setView,
  onNewAppointment,
  onNewTimeBlock,
  selectedTherapist,
  onTherapistChange,
  therapists,
}) => {
  const monthNames = [
    'Janeiro',
    'Fevereiro',
    'Março',
    'Abril',
    'Maio',
    'Junho',
    'Julho',
    'Agosto',
    'Setembro',
    'Outubro',
    'Novembro',
    'Dezembro',
  ];

  const handlePrev = () => {
    if (view === 'month') {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1)
      );
    } else {
      setCurrentDate((prev) => new Date(prev.setDate(prev.getDate() - 7)));
    }
  };

  const handleNext = () => {
    if (view === 'month') {
      setCurrentDate(
        (prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1)
      );
    } else {
      setCurrentDate((prev) => new Date(prev.setDate(prev.getDate() + 7)));
    }
  };

  const handleGoToToday = () => {
    setCurrentDate(new Date());
  };

  const ViewToggle = () => (
    <div className="flex items-center rounded-lg bg-slate-800 p-1">
      <button
        onClick={() => setView('week')}
        className={`rounded-md px-3 py-1 text-sm transition-colors ${view === 'week' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
      >
        <IconList />
      </button>
      <button
        onClick={() => setView('month')}
        className={`rounded-md px-3 py-1 text-sm transition-colors ${view === 'month' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
      >
        <IconLayoutGrid />
      </button>
    </div>
  );

  return (
    <header className="mb-6 flex flex-col items-center justify-between gap-4 md:flex-row">
      <div className="flex items-center space-x-4">
        <h1 className="text-xl font-bold text-slate-100 md:text-3xl">
          {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h1>
        <div className="flex items-center">
          <button
            onClick={handlePrev}
            className="rounded-md p-2 transition-colors hover:bg-slate-700"
          >
            <IconChevronRight className="h-5 w-5 rotate-180 transform" />
          </button>
          <button
            onClick={handleGoToToday}
            className="rounded-md px-4 py-2 text-sm font-semibold transition-colors hover:bg-slate-700"
          >
            Hoje
          </button>
          <button
            onClick={handleNext}
            className="rounded-md p-2 transition-colors hover:bg-slate-700"
          >
            <IconChevronRight className="h-5 w-5" />
          </button>
        </div>
        <ViewToggle />

        {/* Therapist Filter */}
        <select
          value={selectedTherapist}
          onChange={(e) => onTherapistChange(e.target.value)}
          className="rounded-md border border-slate-700 bg-slate-800 px-3 py-2 text-slate-100 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
        >
          <option value="">Todos os terapeutas</option>
          {therapists.map((therapist) => (
            <option key={therapist.id} value={therapist.id}>
              {therapist.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex space-x-2">
        <button
          onClick={onNewTimeBlock}
          className="flex w-full items-center justify-center rounded-lg bg-orange-600 px-4 py-2 font-bold text-white transition-colors hover:bg-orange-700 md:w-auto"
        >
          <IconClock className="mr-2" />
          Novo Bloqueio
        </button>
        <button
          onClick={onNewAppointment}
          className="flex w-full items-center justify-center rounded-lg bg-blue-600 px-4 py-2 font-bold text-white transition-colors hover:bg-blue-700 md:w-auto"
        >
          <IconPlus className="mr-2" />
          Novo Agendamento
        </button>
      </div>
    </header>
  );
};

// --- MONTH VIEW ---
const MonthView: React.FC<{
  currentDate: Date;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  patients: any[];
  onOpenNewModal: (date: Date) => void;
  onOpenEditModal: (appt: Appointment) => void;
  onOpenEditTimeBlockModal: (timeBlock: TimeBlock) => void;
}> = ({
  currentDate,
  appointments,
  timeBlocks,
  patients,
  onOpenNewModal,
  onOpenEditModal,
  onOpenEditTimeBlockModal,
}) => {
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const calendarGrid = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const grid: { day: number; isCurrentMonth: boolean; date: Date }[] = [];
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    for (let i = firstDayOfMonth - 1; i >= 0; i--) {
      grid.push({
        day: daysInPrevMonth - i,
        isCurrentMonth: false,
        date: new Date(year, month - 1, daysInPrevMonth - i),
      });
    }
    for (let i = 1; i <= daysInMonth; i++) {
      grid.push({
        day: i,
        isCurrentMonth: true,
        date: new Date(year, month, i),
      });
    }
    const gridEnd = 42 - grid.length;
    for (let i = 1; i <= gridEnd; i++) {
      grid.push({
        day: i,
        isCurrentMonth: false,
        date: new Date(year, month + 1, i),
      });
    }
    return grid;
  }, [currentDate]);

  const getAppointmentsForDay = useCallback(
    (day: Date) => {
      return appointments
        .filter(
          (appt) => new Date(appt.start).toDateString() === day.toDateString()
        )
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
    },
    [appointments]
  );

  const getTimeBlocksForDay = useCallback(
    (day: Date) => {
      return timeBlocks
        .filter(
          (tb) => new Date(tb.start).toDateString() === day.toDateString()
        )
        .sort(
          (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
        );
    },
    [timeBlocks]
  );

  return (
    <>
      <div className="grid grid-cols-7 border-x border-t border-slate-700 text-center font-semibold text-slate-300">
        {weekDays.map((day) => (
          <div
            key={day}
            className="border-r border-slate-700 py-2 last:border-r-0"
          >
            {day}
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-auto">
        <div className="grid h-full min-w-[700px] grid-cols-7 grid-rows-6 border border-slate-700">
          {calendarGrid.map(({ day, isCurrentMonth, date }, index) => {
            const dailyAppointments = getAppointmentsForDay(date);
            const dailyTimeBlocks = getTimeBlocksForDay(date);
            const isToday = new Date().toDateString() === date.toDateString();
            return (
              <div
                key={index}
                onClick={() => onOpenNewModal(date)}
                className={`relative flex flex-col border-b border-r border-slate-700 p-2 transition-colors ${isCurrentMonth ? 'bg-slate-800/80 hover:bg-slate-800' : 'bg-slate-800/30 text-slate-500'} cursor-pointer`}
              >
                <span
                  className={`self-end font-medium ${isToday ? 'flex h-7 w-7 items-center justify-center rounded-full bg-blue-500 text-white' : 'text-sm'}`}
                >
                  {day}
                </span>
                <div className="mt-1 flex-1 space-y-1 overflow-y-auto text-left">
                  {dailyAppointments.map((appt) => (
                    <div
                      key={appt.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenEditModal(appt);
                      }}
                      className="cursor-pointer truncate rounded-md bg-blue-600/80 p-1 text-xs text-white hover:bg-blue-500"
                      title={`${new Date(appt.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${patients.find((p) => p.id === appt.patientId)?.name}`}
                    >
                      {`${new Date(appt.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${patients.find((p) => p.id === appt.patientId)?.name}`}
                    </div>
                  ))}
                  {dailyTimeBlocks.map((timeBlock) => {
                    const typeColors = {
                      break: 'bg-yellow-600/80 hover:bg-yellow-500',
                      lunch: 'bg-green-600/80 hover:bg-green-500',
                      unavailable: 'bg-red-600/80 hover:bg-red-500',
                    };
                    return (
                      <div
                        key={timeBlock.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditTimeBlockModal(timeBlock);
                        }}
                        className={`${typeColors[timeBlock.type]} cursor-pointer truncate rounded-md p-1 text-xs text-white transition-colors`}
                        title={`${new Date(timeBlock.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - ${timeBlock.title}`}
                      >
                        {`${new Date(timeBlock.start).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} ${timeBlock.title}`}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
};

// --- WEEK VIEW ---
const WeekView: React.FC<{
  currentDate: Date;
  appointments: Appointment[];
  timeBlocks: TimeBlock[];
  patients: any[];
  onOpenNewModal: (date: Date, time: string) => void;
  onOpenEditModal: (appt: Appointment) => void;
  onOpenEditTimeBlockModal: (timeBlock: TimeBlock) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>, newDate: Date) => void;
  onDragOver: (e: React.DragEvent<HTMLDivElement>) => void;
  onDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
}> = ({
  currentDate,
  appointments,
  timeBlocks,
  patients,
  onOpenNewModal,
  onOpenEditModal,
  onOpenEditTimeBlockModal,
  onDrop,
  onDragOver,
  onDragLeave,
}) => {
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const currentWeek = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    return Array.from({ length: 7 }).map((_, i) => {
      const day = new Date(startOfWeek);
      day.setDate(day.getDate() + i);
      return day;
    });
  }, [currentDate]);

  const timeSlots = useMemo(() => {
    return Array.from({ length: 12 * 2 }).map((_, i) => {
      // 8am to 8pm, 30 min intervals
      const hour = 8 + Math.floor(i / 2);
      const minute = (i % 2) * 30;
      return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    });
  }, []);

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid h-full min-w-[1000px] grid-cols-[auto,1fr]">
        {/* Time Gutter */}
        <div className="flex flex-col border-l border-t border-slate-700">
          <div className="h-16 border-b border-slate-700 bg-slate-800"></div>
          {timeSlots.map((time) => (
            <div key={time} className="relative h-12 border-b border-slate-700">
              <span className="absolute -top-2 left-2 bg-slate-900 px-1 text-xs text-slate-400">
                {time}
              </span>
            </div>
          ))}
        </div>
        {/* Day Columns */}
        <div className="grid grid-cols-7">
          {currentWeek.map((day) => {
            const isToday = new Date().toDateString() === day.toDateString();
            const dailyAppointments = appointments.filter(
              (a) => new Date(a.start).toDateString() === day.toDateString()
            );

            const dailyTimeBlocks = timeBlocks.filter(
              (tb) => new Date(tb.start).toDateString() === day.toDateString()
            );

            return (
              <div
                key={day.toISOString()}
                className="border-r border-t border-slate-700"
              >
                {/* Header */}
                <div
                  className={`border-b border-slate-700 bg-slate-800 py-2 text-center ${isToday ? 'text-blue-400' : ''}`}
                >
                  <p className="font-semibold">{weekDays[day.getDay()]}</p>
                  <p className="text-2xl font-bold">{day.getDate()}</p>
                </div>
                {/* Time Slots */}
                <div className="relative">
                  {timeSlots.map((time) => (
                    <div
                      key={time}
                      className="h-12 border-b border-slate-700"
                      onClick={() => onOpenNewModal(day, time)}
                      onDrop={(e) => {
                        const newDate = new Date(
                          `${day.toISOString().split('T')[0]}T${time}:00.000Z`
                        );
                        onDrop(e, newDate);
                      }}
                      onDragOver={onDragOver}
                      onDragLeave={onDragLeave}
                    />
                  ))}
                  {/* Render Appointments */}
                  {dailyAppointments.map((appt) => {
                    const start = new Date(appt.start);
                    const end = new Date(appt.end);
                    const top =
                      (((start.getHours() - 8) * 60 + start.getMinutes()) /
                        30) *
                      3; // 3rem (h-12) per 30 mins
                    const height =
                      ((end.getTime() - start.getTime()) / (1000 * 60) / 30) *
                      3;
                    const patientName =
                      patients.find((p) => p.id === appt.patientId)?.name ||
                      'Paciente';

                    return (
                      <div
                        key={appt.id}
                        draggable
                        onDragStart={(e) =>
                          e.dataTransfer.setData('appointmentId', appt.id)
                        }
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditModal(appt);
                        }}
                        className="absolute z-10 w-full px-1"
                        style={{ top: `${top}rem`, height: `${height}rem` }}
                      >
                        <div className="h-full cursor-grab overflow-hidden rounded-md bg-blue-600 p-1 text-xs text-white hover:bg-blue-500 active:cursor-grabbing">
                          <p className="truncate font-semibold">
                            {patientName}
                          </p>
                          <p className="truncate">{appt.title}</p>
                        </div>
                      </div>
                    );
                  })}

                  {/* Render Time Blocks */}
                  {dailyTimeBlocks.map((timeBlock) => {
                    const start = new Date(timeBlock.start);
                    const end = new Date(timeBlock.end);
                    const top =
                      (((start.getHours() - 8) * 60 + start.getMinutes()) /
                        30) *
                      3; // 3rem (h-12) per 30 mins
                    const height =
                      ((end.getTime() - start.getTime()) / (1000 * 60) / 30) *
                      3;

                    const typeColors = {
                      break: 'bg-yellow-600 hover:bg-yellow-500',
                      lunch: 'bg-green-600 hover:bg-green-500',
                      unavailable: 'bg-red-600 hover:bg-red-500',
                    };

                    return (
                      <div
                        key={timeBlock.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenEditTimeBlockModal(timeBlock);
                        }}
                        className="absolute z-10 w-full px-1"
                        style={{ top: `${top}rem`, height: `${height}rem` }}
                      >
                        <div
                          className={`${typeColors[timeBlock.type]} h-full cursor-pointer overflow-hidden rounded-md p-1 text-xs text-white opacity-80 transition-colors`}
                        >
                          <p className="truncate font-semibold">
                            {timeBlock.title}
                          </p>
                          <p className="truncate">{timeBlock.type}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarPage;
