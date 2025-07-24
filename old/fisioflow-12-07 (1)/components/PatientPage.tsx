

import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Patient, Task, Appointment, UserRole, ClinicalProtocol, Service, PatientPermissionSet } from '../types.js';
import { IconPlus, IconUsers, IconUpload, IconSearch, IconClipboardList, IconAlertTriangle, IconArrowLeft } from './icons/IconComponents.js';
import EmptyState from './ui/EmptyState.js';
import { usePatients } from '../hooks/usePatients.js';
import { useNotification } from '../hooks/useNotification.js';
import PatientListItemSkeleton from './ui/PatientListItemSkeleton.js';
import { useTasks } from '../hooks/useTasks.js';
import { useAppointments } from '../hooks/useAppointments.js';
import { useExercises } from '../hooks/useExercises.js';
import { usePrescriptions } from '../hooks/usePrescriptions.js';
import { useExerciseLogs } from '../hooks/useExerciseLogs.js';
import { useAssessments } from '../hooks/useAssessments.js';
import { useTransactions } from '../hooks/useTransactions.js';
import { useChatMessages } from '../hooks/useChatMessages.js';
import { useTherapistGoals } from '../hooks/useTherapistGoals.js';
import PatientImportModal from './PatientImportModal.js';
import { PatientDetailPanel } from './PatientDetailPanel.js';
import PatientCard from './PatientCard.js';
import { useUsers } from '../hooks/useUsers.js';
import { useAuth } from '../hooks/useAuth.js';
import { useSessionNotes } from '../hooks/useSessionNotes.js';
import AppointmentModal from './AppointmentModal.js';
import { useClinicalProtocols } from '../hooks/useClinicalProtocols.js';
import { useServices } from '../hooks/useServices.js';
import { usePackages } from '../hooks/usePackages.js';
import { usePatientPackages } from '../hooks/usePatientPackages.js';
import { usePermissions } from '../hooks/usePermissions.js';
import { useDailyLogs } from '../hooks/useDailyLogs.js';

export const PatientPage: React.FC = () => {
    const { patientId: patientIdFromUrl } = useParams<{ patientId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { permissions } = usePermissions();

    // Data Hooks
    const { patients, isLoading: isLoadingPatients, isError: isErrorPatients, savePatient, deletePatient } = usePatients();
    const { tasks = [], saveTask } = useTasks();
    const { appointments = [], saveAppointment, deleteAppointment } = useAppointments();
    const { exercises = [] } = useExercises();
    const { prescriptions = [] } = usePrescriptions();
    const { exerciseLogs = [] } = useExerciseLogs();
    const { dailyLogs = [] } = useDailyLogs();
    const { assessments = [] } = useAssessments();
    const { transactions = [] } = useTransactions();
    const { messages: chatMessages = [] } = useChatMessages();
    const { goals: therapistGoals = [] } = useTherapistGoals();
    const { users = [] } = useUsers();
    const { sessionNotes = [] } = useSessionNotes();
    const { protocols = [] } = useClinicalProtocols();
    const { services = [] } = useServices();
    const { packages = [] } = usePackages();
    const { patientPackages = [] } = usePatientPackages();
    
    const { addNotification } = useNotification();

    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
    const [isDetailPanelOpen, setIsDetailPanelOpen] = useState(false);
    const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [isSchedulingNext, setIsSchedulingNext] = useState(false);
    const [patientForNextAppointment, setPatientForNextAppointment] = useState<Patient | null>(null);

    const userPermissions: PatientPermissionSet = useMemo(() => {
        if (!user || !permissions) {
            return { view_all: false, view_assigned: false, edit: false, delete: false };
        }
        return permissions[user.role].patients;
    }, [user, permissions]);
    
    // Select patient from URL on initial render
    useEffect(() => {
        if (patientIdFromUrl) {
            setSelectedPatientId(patientIdFromUrl);
            setIsDetailPanelOpen(true);
        } else {
            setIsDetailPanelOpen(false);
            setSelectedPatientId(null);
        }
    }, [patientIdFromUrl]);


    const patientsWithStats = useMemo(() => {
        if (!patients) return [];
        return (patients || []).map(p => {
            const patientTasks = tasks.filter(t => t.patientId === p.id);
            const overdueTaskCount = patientTasks.filter(t => t.status !== 'done' && t.dueDate && new Date(t.dueDate) < new Date()).length;
            const appointmentCount = appointments.filter(a => a.patientId === p.id && new Date(a.start) > new Date()).length;
            return { ...p, overdueTaskCount, appointmentCount };
        });
    }, [patients, tasks, appointments]);

    const filteredPatients = useMemo(() => {
        if (!patientsWithStats) return [];
        return patientsWithStats.filter(p => p.name.toLowerCase().includes(searchTerm.toLowerCase()));
    }, [patientsWithStats, searchTerm]);

    const selectedPatient = useMemo(() => {
        if (!selectedPatientId || !patients) return null;
        return patients.find(p => p.id === selectedPatientId) || null;
    }, [selectedPatientId, patients]);

    const handleSelectPatient = (patientId: string) => {
        navigate(`/patients/${patientId}`);
    };

    const handleCloseDetailPanel = () => {
        navigate('/patients');
    };

    const handleSavePatient = async (patientToSave: Patient) => {
        if (!user) return;
        try {
            await savePatient(patientToSave);
            addNotification({ type: 'success', title: 'Paciente Salvo', message: 'Os dados do paciente foram salvos.' });
        } catch (e) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (e as Error).message });
        }
    };

    const handleImportPatients = async (newPatients: Omit<Patient, 'id'>[]): Promise<{successCount: number, errorCount: number, errors: string[]}> => {
        if(!user) return { successCount: 0, errorCount: newPatients.length, errors: ['Usuário não autenticado.'] };

        let successCount = 0;
        let errorCount = 0;
        const errors: string[] = [];

        for(const newPatient of newPatients) {
            try {
                await savePatient(newPatient as Patient);
                successCount++;
            } catch(e) {
                errorCount++;
                errors.push(`Erro ao importar ${newPatient.name}: ${(e as Error).message}`);
            }
        }
        addNotification({type: 'info', title: 'Importação Concluída', message: `${successCount} pacientes importados, ${errorCount} falhas.`});
        return { successCount, errorCount, errors };
    }
    
    const handleDeletePatient = async (patientId: string) => {
        if (!user) return;
        try {
            await deletePatient(patientId);
            addNotification({ type: 'info', title: 'Paciente Excluído', message: 'O paciente foi excluído.' });
            handleCloseDetailPanel();
        } catch (e) {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: (e as Error).message });
        }
    };
    
    const handleOpenNewPatientModal = () => {
        // This would typically open a modal to create a new patient
        // For simplicity, let's just log it. A proper implementation would use a modal.
        console.log("Open new patient modal");
    };
    
    const handleScheduleNextAppointment = (patientId: string) => {
        const patient = patients.find(p => p.id === patientId);
        setPatientForNextAppointment(patient || null);
        setIsAppointmentModalOpen(true);
        setIsSchedulingNext(true);
    }
    
    const handleSaveAppointment = async (appt: Appointment | Partial<Appointment>) => {
        await saveAppointment(appt);
        setIsAppointmentModalOpen(false);
        setIsSchedulingNext(false);
        setPatientForNextAppointment(null);
    }

    const renderPatientList = () => {
        if (isLoadingPatients) {
            return (
                <ul className="space-y-3">
                    {Array.from({ length: 5 }).map((_, i) => <PatientListItemSkeleton key={i} />)}
                </ul>
            );
        }
        if (isErrorPatients) {
            return <EmptyState icon={<IconAlertTriangle/>} title="Erro ao carregar pacientes" message="Não foi possível buscar os dados dos pacientes. Por favor, tente novamente." />;
        }
        if (filteredPatients.length === 0) {
            return <EmptyState icon={<IconUsers/>} title="Nenhum paciente encontrado" message="Adicione um novo paciente para começar." />;
        }

        return (
            <ul className="space-y-3">
                {filteredPatients.map(p => (
                    <li key={p.id}>
                        <PatientCard
                            patient={p}
                            isSelected={selectedPatientId === p.id}
                            onClick={() => handleSelectPatient(p.id)}
                            appointmentCount={p.appointmentCount}
                            overdueTaskCount={p.overdueTaskCount}
                            isChecked={false} // Selection mode not fully implemented here
                            onCheckboxChange={() => {}}
                            isSelectionMode={false}
                        />
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="flex h-full">
            <aside className={`flex-shrink-0 w-full md:w-96 bg-slate-800/50 border-r border-slate-700 flex flex-col transition-all duration-300 ${isDetailPanelOpen ? 'hidden md:flex' : 'flex'}`}>
                <header className="p-4 border-b border-slate-700 flex-shrink-0">
                    <h2 className="text-xl font-bold text-slate-100">Pacientes ({filteredPatients.length})</h2>
                    <div className="relative mt-2">
                        <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar paciente..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            className="w-full bg-slate-800 border border-slate-600 rounded-md pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                        />
                    </div>
                </header>
                <div className="flex-1 overflow-y-auto p-4">
                    {renderPatientList()}
                </div>
                <footer className="p-4 border-t border-slate-700 flex-shrink-0 flex gap-2">
                    <button onClick={handleOpenNewPatientModal} className="flex-1 flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"><IconPlus /> Novo Paciente</button>
                    <button onClick={() => setIsImportModalOpen(true)} className="p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors" title="Importar Pacientes"><IconUpload /></button>
                </footer>
            </aside>
            <main className="flex-1 bg-slate-900/50 overflow-y-auto">
                {isDetailPanelOpen && selectedPatient ? (
                    <PatientDetailPanel
                        onClose={handleCloseDetailPanel}
                        onSave={handleSavePatient}
                        onDelete={handleDeletePatient}
                        onScheduleNext={handleScheduleNextAppointment}
                        patient={selectedPatient}
                        tasks={tasks.filter(t => t.patientId === selectedPatient.id)}
                        appointments={appointments.filter(a => a.patientId === selectedPatient.id)}
                        prescribedExercises={prescriptions.filter(p => p.patientId === selectedPatient.id)}
                        exercises={exercises}
                        exerciseLogs={exerciseLogs.filter(l => l.patientId === selectedPatient.id)}
                        dailyLogs={dailyLogs.filter(l => l.patientId === selectedPatient.id)}
                        assessments={assessments.filter(a => a.patientId === selectedPatient.id)}
                        transactions={transactions.filter(t => t.patientId === selectedPatient.id)}
                        chatMessages={chatMessages.filter(m => m.patientId === selectedPatient.id)}
                        therapistGoals={therapistGoals.filter(g => g.patientId === selectedPatient.id)}
                        sessionNotes={sessionNotes.filter(sn => sn.patientId === selectedPatient.id)}
                        packages={packages}
                        patientPackages={patientPackages.filter(pp => pp.patientId === selectedPatient.id)}
                        permissions={userPermissions}
                    />
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-center text-slate-500 p-8">
                        <IconArrowLeft size={32} className="mb-4" />
                        <h3 className="text-xl font-semibold text-slate-300">Selecione um paciente</h3>
                        <p>Os detalhes do paciente selecionado aparecerão aqui.</p>
                    </div>
                )}
            </main>

            {isImportModalOpen && <PatientImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} onImport={handleImportPatients} />}
            
            {isAppointmentModalOpen && (
                 <AppointmentModal
                    isOpen={isAppointmentModalOpen}
                    onClose={() => setIsAppointmentModalOpen(false)}
                    onSave={handleSaveAppointment}
                    onDelete={async (id) => { await deleteAppointment(id); }}
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
                    appointment={isSchedulingNext && patientForNextAppointment ? { patientId: patientForNextAppointment.id } : {}}
                    users={users}
                    patients={patients}
                    services={services}
                    protocols={protocols}
                    isSchedulingNext={isSchedulingNext}
                />
            )}
        </div>
    );
};