import React, { useState, useMemo, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { getTaskSummary } from '../services/geminiService';
import {
  Task,
  User,
  Patient,
  UserRole,
  Course,
  StudentProgress,
  MentorshipSession,
} from '../types';

import {
  IconSparkles,
  IconCheckCircle,
  IconArrowLeft,
  IconUser,
  IconAddressBook,
  IconGraduationCap,
  IconChartLine,
  IconCalendar,
  IconBook,
  IconPlay,
  IconFileText,
  IconClock,
  IconStar,
} from './icons/IconComponents';


const MentorshipPage: React.FC = () => {
  const { user: actingUser } = useAuth();
  const {
    tasks,
    users,
    patients,
    saveTask,
    courses = [],
    studentProgress = [],
    mentorshipSessions = [],
  } = useData();
  const [activeTab, setActiveTab] = useState('reviews');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [mentorFeedback, setMentorFeedback] = useState('');
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [aiSummary, setAiSummary] = useState('');

  const tabs = [
    { id: 'reviews', label: 'Revisões', icon: <IconCheckCircle size={18} /> },
    { id: 'courses', label: 'Cursos', icon: <IconGraduationCap size={18} /> },
    { id: 'progress', label: 'Progresso', icon: <IconChartLine size={18} /> },
    { id: 'sessions', label: 'Sessões', icon: <IconCalendar size={18} /> },
  ];

  const tasksForReview = useMemo(() => {
    return tasks.filter((t) => t.status === 'review');
  }, [tasks]);

  const selectedTask = useMemo(() => {
    return tasks.find((t) => t.id === selectedTaskId) || null;
  }, [tasks, selectedTaskId]);

  const taskSubmitter = useMemo(() => {
    if (!selectedTask?.assigneeId) return null;
    return users.find((u) => u.id === selectedTask.assigneeId);
  }, [users, selectedTask]);

  const taskPatient = useMemo(() => {
    if (!selectedTask?.patientId) return null;
    return patients.find((p) => p.id === selectedTask.patientId);
  }, [patients, selectedTask]);

  const studentsData = useMemo(() => {
    const students = users.filter((u) => u.role === UserRole.ESTAGIARIO);
    return students.map((student) => {
      const progress = studentProgress.filter(
        (p) => p.studentId === student.id
      );
      const sessions = mentorshipSessions.filter(
        (s) => s.studentId === student.id
      );
      const completedCourses = progress.filter(
        (p) => p.certificateIssued
      ).length;
      const totalTimeSpent = progress.reduce(
        (sum, p) => sum + p.totalTimeSpent,
        0
      );
      const avgRating =
        sessions
          .filter((s) => s.rating)
          .reduce((sum, s) => sum + (s.rating || 0), 0) /
          sessions.filter((s) => s.rating).length || 0;

      return {
        student,
        completedCourses,
        totalTimeSpent,
        avgRating: isNaN(avgRating) ? 0 : avgRating,
        activeCourses: progress.filter((p) => !p.certificateIssued).length,
        lastSession: sessions.sort(
          (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
        )[0]?.date,
      };
    });
  }, [users, studentProgress, mentorshipSessions]);

  useEffect(() => {
    const handleGetSummary = async () => {
      if (!selectedTask?.description) {
        setAiSummary('');
        return;
      }
      setIsLoadingAi(true);
      setAiSummary('');
      try {
        const summary = await getTaskSummary(selectedTask.description);
        setAiSummary(summary);
      } catch (error) {
        console.error(error);
        setAiSummary('Erro ao gerar a análise da IA.');
      } finally {
        setIsLoadingAi(false);
      }
    };

    if (selectedTask) {
      handleGetSummary();
      setMentorFeedback('');
    }
  }, [selectedTask]);

  const handleSelectTask = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleApprove = () => {
    if (!selectedTask || !actingUser) return;
    saveTask({ ...selectedTask, status: 'done' }, actingUser);
    setSelectedTaskId(null);
  };

  const handleRequestChanges = () => {
    if (!selectedTask || !mentorFeedback.trim() || !actingUser) return;
    const newDescription = `${selectedTask.description || ''}\n\n[Feedback do Mentor - ${new Date().toLocaleDateString('pt-BR')}]:\n${mentorFeedback}`;
    saveTask(
      { ...selectedTask, status: 'in_progress', description: newDescription },
      actingUser
    );
    setSelectedTaskId(null);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'reviews':
        return (
          <div className="flex h-full gap-6">
            <aside
              className={`w-full flex-col rounded-lg border border-slate-700 bg-slate-800/50 md:w-1/3 ${selectedTaskId ? 'hidden md:flex' : 'flex'}`}
            >
              <header className="border-b border-slate-700 p-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Tarefas para Revisão
                </h2>
                <p className="text-sm text-slate-400">
                  {tasksForReview.length} tarefas aguardando.
                </p>
              </header>
              <div className="flex-1 overflow-y-auto">
                {tasksForReview.length > 0 ? (
                  <ul className="divide-y divide-slate-700">
                    {tasksForReview.map((task) => {
                      const submitter = users.find(
                        (u) => u.id === task.assigneeId
                      );
                      return (
                        <li key={task.id}>
                          <button
                            onClick={() => handleSelectTask(task.id)}
                            className="w-full p-4 text-left transition-colors hover:bg-slate-700/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <h3 className="font-semibold text-slate-200">
                              {task.title}
                            </h3>
                            {submitter && (
                              <p className="text-xs text-slate-400">
                                Enviado por: {submitter.name}
                              </p>
                            )}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <div className="p-8 text-center text-slate-500">
                    <IconCheckCircle className="mx-auto mb-2" size={32} />
                    <p>Nenhuma tarefa para revisar no momento.</p>
                  </div>
                )}
              </div>
            </aside>

            <main
              className={`w-full flex-col rounded-lg border border-slate-700 bg-slate-800 md:w-2/3 ${selectedTaskId ? 'flex' : 'hidden md:flex'}`}
            >
              {selectedTask ? (
                <>
                  <header className="border-b border-slate-700 p-4">
                    <button
                      onClick={() => setSelectedTaskId(null)}
                      className="mb-2 flex items-center text-sm text-blue-400 md:hidden"
                    >
                      <IconArrowLeft className="mr-1" /> Voltar para a lista
                    </button>
                    <h2 className="text-xl font-bold text-slate-100">
                      {selectedTask.title}
                    </h2>
                    <div className="mt-1 flex items-center gap-4 text-sm text-slate-400">
                      {taskSubmitter && (
                        <span className="flex items-center gap-1.5">
                          <IconUser size={14} /> {taskSubmitter.name}
                        </span>
                      )}
                      {taskPatient && (
                        <span className="flex items-center gap-1.5">
                          <IconAddressBook size={14} /> {taskPatient.name}
                        </span>
                      )}
                    </div>
                  </header>
                  <div className="flex-1 space-y-4 overflow-y-auto p-4">
                    <div>
                      <h3 className="mb-1 font-semibold text-slate-300">
                        Descrição/Nota do Estagiário
                      </h3>
                      <div className="whitespace-pre-wrap rounded-md border border-slate-700 bg-slate-900/70 p-3 text-sm text-slate-300">
                        {selectedTask.description || (
                          <span className="italic text-slate-500">
                            Nenhuma descrição fornecida.
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 flex items-center font-semibold text-slate-300">
                        <IconSparkles className="mr-2 text-blue-400" /> Análise
                        da IA
                      </h3>
                      <div className="min-h-[80px] whitespace-pre-wrap rounded-md border border-blue-500/30 bg-blue-900/20 p-3 text-sm text-blue-200">
                        {isLoadingAi ? 'Analisando...' : aiSummary}
                      </div>
                    </div>
                    <div>
                      <h3 className="mb-1 font-semibold text-slate-300">
                        Seu Feedback
                      </h3>
                      <textarea
                        value={mentorFeedback}
                        onChange={(e) => setMentorFeedback(e.target.value)}
                        rows={5}
                        className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
                        placeholder="Escreva seu feedback aqui para solicitar ajustes..."
                      />
                    </div>
                  </div>
                  <footer className="flex flex-col justify-end gap-3 border-t border-slate-700 p-4 sm:flex-row">
                    <button
                      onClick={handleRequestChanges}
                      disabled={!mentorFeedback.trim()}
                      className="flex w-full items-center justify-center rounded-md bg-amber-500/10 px-4 py-2 text-sm font-semibold text-amber-300 transition-colors hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                    >
                      <IconArrowLeft className="mr-2" size={16} />
                      Solicitar Ajustes
                    </button>
                    <button
                      onClick={handleApprove}
                      className="flex w-full items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-emerald-700 sm:w-auto"
                    >
                      <IconCheckCircle className="mr-2" size={16} />
                      Aprovar Tarefa
                    </button>
                  </footer>
                </>
              ) : (
                <div className="m-auto p-8 text-center text-slate-500">
                  <p className="font-semibold">
                    Selecione uma tarefa para revisar
                  </p>
                  <p className="text-sm">
                    Os detalhes da tarefa e as opções de feedback aparecerão
                    aqui.
                  </p>
                </div>
              )}
            </main>
          </div>
        );

      case 'courses':
        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {courses.length > 0 ? (
              courses.map((course) => (
                <div
                  key={course.id}
                  className="rounded-lg border border-slate-700 bg-slate-800 p-6"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="mb-2 text-lg font-semibold text-slate-100">
                        {course.title}
                      </h3>
                      <p className="mb-3 text-sm text-slate-400">
                        {course.description}
                      </p>
                      <div className="mb-3 flex flex-wrap gap-2">
                        <span className="rounded bg-blue-500/20 px-2 py-1 text-xs text-blue-300">
                          {course.category}
                        </span>
                        <span className="rounded bg-purple-500/20 px-2 py-1 text-xs text-purple-300">
                          {course.difficulty}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
                    <span className="flex items-center gap-1">
                      <IconClock size={14} />
                      {course.estimatedHours}h
                    </span>
                    <span className="flex items-center gap-1">
                      <IconUser size={14} />
                      {course.enrolledStudents.length} alunos
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                      Ver Curso
                    </button>
                    <button className="rounded bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600">
                      Editar
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full py-12 text-center">
                <IconBook className="mx-auto mb-4 text-slate-500" size={48} />
                <h3 className="mb-2 text-lg font-semibold text-slate-300">
                  Nenhum curso criado
                </h3>
                <p className="mb-4 text-slate-500">
                  Crie cursos para compartilhar conhecimento com os estagiários
                </p>
                <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                  Criar Primeiro Curso
                </button>
              </div>
            )}
          </div>
        );

      case 'progress':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-400">
                    Total de Estagiários
                  </h3>
                  <IconUser className="text-blue-400" size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-100">
                  {studentsData.length}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-400">
                    Cursos Concluídos
                  </h3>
                  <IconGraduationCap className="text-emerald-400" size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-100">
                  {studentsData.reduce((sum, s) => sum + s.completedCourses, 0)}
                </p>
              </div>
              <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-medium text-slate-400">
                    Horas de Estudo
                  </h3>
                  <IconClock className="text-purple-400" size={20} />
                </div>
                <p className="text-2xl font-bold text-slate-100">
                  {Math.round(
                    studentsData.reduce((sum, s) => sum + s.totalTimeSpent, 0) /
                      60
                  )}
                  h
                </p>
              </div>
            </div>

            <div className="rounded-lg border border-slate-700 bg-slate-800">
              <div className="border-b border-slate-700 p-4">
                <h2 className="text-lg font-semibold text-slate-100">
                  Progresso dos Estagiários
                </h2>
              </div>
              <div className="divide-y divide-slate-700">
                {studentsData.map((data, index) => (
                  <div key={data.student.id} className="p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <img
                          src={data.student.avatarUrl}
                          alt={data.student.name}
                          className="h-10 w-10 rounded-full"
                        />
                        <div>
                          <h3 className="font-medium text-slate-100">
                            {data.student.name}
                          </h3>
                          <p className="text-sm text-slate-400">
                            {data.lastSession
                              ? `Última sessão: ${new Date(data.lastSession).toLocaleDateString('pt-BR')}`
                              : 'Nenhuma sessão registrada'}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <span className="text-slate-400">
                          {data.completedCourses} cursos concluídos
                        </span>
                        <span className="text-slate-400">
                          {data.activeCourses} em andamento
                        </span>
                        {data.avgRating > 0 && (
                          <div className="flex items-center gap-1">
                            <IconStar className="text-yellow-400" size={14} />
                            <span className="text-slate-300">
                              {data.avgRating.toFixed(1)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="mb-2 h-2 rounded-full bg-slate-700">
                      <div
                        className="h-2 rounded-full bg-blue-500 transition-all"
                        style={{
                          width: `${Math.min((data.completedCourses / Math.max(courses.length, 1)) * 100, 100)}%`,
                        }}
                      ></div>
                    </div>
                    <p className="text-xs text-slate-500">
                      {Math.round(data.totalTimeSpent / 60)}h de estudo total
                    </p>
                  </div>
                ))}
                {studentsData.length === 0 && (
                  <div className="p-8 text-center text-slate-500">
                    <IconUser className="mx-auto mb-2" size={32} />
                    <p>Nenhum estagiário cadastrado no sistema.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'sessions':
        return (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-slate-100">
                Sessões de Mentoria
              </h2>
              <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                Agendar Sessão
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {mentorshipSessions.length > 0 ? (
                mentorshipSessions.map((session) => {
                  const student = users.find((u) => u.id === session.studentId);
                  return (
                    <div
                      key={session.id}
                      className="rounded-lg border border-slate-700 bg-slate-800 p-6"
                    >
                      <div className="mb-4 flex items-start justify-between">
                        <div>
                          <h3 className="mb-1 font-semibold text-slate-100">
                            {session.title}
                          </h3>
                          <p className="text-sm text-slate-400">
                            com {student?.name || 'Usuário desconhecido'}
                          </p>
                        </div>
                        {session.rating && (
                          <div className="flex items-center gap-1">
                            <IconStar className="text-yellow-400" size={16} />
                            <span className="text-slate-300">
                              {session.rating}
                            </span>
                          </div>
                        )}
                      </div>

                      <div className="mb-4 space-y-2">
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <IconCalendar size={14} />
                          {new Date(session.date).toLocaleDateString('pt-BR')}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-400">
                          <IconClock size={14} />
                          {session.duration} minutos
                        </div>
                      </div>

                      {session.topics.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 text-sm font-medium text-slate-300">
                            Tópicos abordados:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {session.topics.map((topic, index) => (
                              <span
                                key={index}
                                className="rounded bg-slate-700 px-2 py-1 text-xs text-slate-300"
                              >
                                {topic}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {session.notes && (
                        <div className="mb-4">
                          <p className="mb-1 text-sm font-medium text-slate-300">
                            Observações:
                          </p>
                          <p className="text-sm text-slate-400">
                            {session.notes}
                          </p>
                        </div>
                      )}

                      <div className="flex gap-2">
                        <button className="flex-1 rounded bg-slate-700 px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-600">
                          Ver Detalhes
                        </button>
                        <button className="rounded bg-blue-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          Editar
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="col-span-full py-12 text-center">
                  <IconCalendar
                    className="mx-auto mb-4 text-slate-500"
                    size={48}
                  />
                  <h3 className="mb-2 text-lg font-semibold text-slate-300">
                    Nenhuma sessão agendada
                  </h3>
                  <p className="mb-4 text-slate-500">
                    Agende sessões de mentoria para acompanhar o desenvolvimento
                    dos estagiários
                  </p>
                  <button className="rounded bg-blue-600 px-4 py-2 font-medium text-white transition-colors hover:bg-blue-700">
                    Agendar Primeira Sessão
                  </button>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6">
        <div className="flex border-b border-slate-700">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-300'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-hidden">{renderTabContent()}</div>
    </div>
  );
};

export default MentorshipPage;
