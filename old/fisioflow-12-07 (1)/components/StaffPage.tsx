
import React, { useState, useMemo } from 'react';
import { User, UserRole } from '../types';
import { IconPlus, IconPencil, IconSearch, IconBriefcase, IconUsers, IconCheckCircle, IconClock, IconAlertTriangle } from './icons/IconComponents';
import StaffModal from './StaffModal';
import EmptyState from './ui/EmptyState';
import { useUsers } from '../hooks/useUsers';
import { useTasks } from '../hooks/useTasks';
import { useNotification } from '../hooks/useNotification';
import Skeleton from './ui/Skeleton';
import { useAuth } from '../hooks/useAuth';

const StaffPage: React.FC = () => {
    const { user: currentUser } = useAuth();
    const { users = [], saveUser, deleteUser, isLoading, isError } = useUsers();
    const { tasks = [] } = useTasks();
    const { addNotification } = useNotification();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | Partial<User> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');

    const staffMembers = useMemo(() =>
        users.filter(u => u.role !== UserRole.PACIENTE && u.name.toLowerCase().includes(searchTerm.toLowerCase()))
             .sort((a,b) => a.name.localeCompare(b.name)),
    [users, searchTerm]);

    const handleOpenModal = (user: User | Partial<User> | null) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleOpenNewModal = () => {
        handleOpenModal({
            name: '',
            email: '',
            role: UserRole.ESTAGIARIO,
            avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedUser(null);
    };

    const handleSaveUser = async (userToSave: User) => {
        try {
            await saveUser(userToSave);
            addNotification({ type: 'success', title: 'Usuário Salvo', message: `O usuário "${userToSave.name}" foi salvo.` });
            handleCloseModal();
        } catch(error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
        }
    };

    const handleDeleteUser = async (userId: string) => {
        if (!currentUser) {
            addNotification({ type: 'error', title: 'Erro de Autenticação', message: 'Você precisa estar logado para realizar esta ação.' });
            return;
        }
        try {
            const userName = users.find(u => u.id === userId)?.name || 'Usuário';
            await deleteUser({ userIdToDelete: userId, currentUserId: currentUser.id });
            addNotification({ type: 'info', title: 'Usuário Excluído', message: `"${userName}" foi excluído.` });
            handleCloseModal();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: (error as Error).message });
        }
    };

    const roleNames: Record<UserRole, string> = {
        [UserRole.ADMIN]: 'Administrador',
        [UserRole.FISIOTERAPEUTA]: 'Fisioterapeuta',
        [UserRole.ESTAGIARIO]: 'Estagiário',
        [UserRole.PACIENTE]: 'Paciente',
    };
    
    const Stat: React.FC<{ icon: React.ReactNode; value: number; label: string }> = ({ icon, value, label }) => (
        <div className="text-center">
            <div className="mx-auto w-10 h-10 flex items-center justify-center bg-slate-700/50 rounded-full text-blue-400 mb-1">{icon}</div>
            <p className="text-xl font-bold text-slate-50">{value}</p>
            <p className="text-xs text-slate-400">{label}</p>
        </div>
    );

    const renderContent = () => {
        if (isLoading) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({length: 3}).map((_, i) => (
                        <div key={i} className="bg-slate-800 p-5 rounded-lg border border-slate-700 space-y-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="w-14 h-14 rounded-full"/>
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32"/>
                                    <Skeleton className="h-4 w-24"/>
                                </div>
                            </div>
                            <Skeleton className="h-20 w-full"/>
                        </div>
                    ))}
                </div>
            )
        }

        if (isError) {
             return (
                <EmptyState
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Equipe"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }

        if (staffMembers.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staffMembers.map(user => {
                        const assignedPatientIds = new Set(tasks.filter(t => t.assigneeId === user.id && t.patientId).map(t => t.patientId));
                        const patientsAssigned = assignedPatientIds.size;
                        const tasksCompleted = tasks.filter(t => t.assigneeId === user.id && t.status === 'done').length;
                        const tasksPending = tasks.filter(t => t.assigneeId === user.id && t.status !== 'done').length;
                        
                        return (
                            <div key={user.id} className="bg-slate-800 p-5 rounded-lg border border-slate-700 flex flex-col justify-between">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-4">
                                        <img src={user.avatarUrl} alt={user.name} className="w-14 h-14 rounded-full"/>
                                        <div>
                                            <h3 className="text-lg font-bold text-slate-100">{user.name}</h3>
                                            <p className="text-sm text-blue-400 font-medium">{roleNames[user.role]}</p>
                                        </div>
                                    </div>
                                    <button onClick={() => handleOpenModal(user)} className="p-2 text-slate-400 hover:text-amber-400 rounded-md hover:bg-slate-700/50 transition-colors" title="Editar Membro">
                                        <IconPencil size={16}/>
                                    </button>
                                </div>

                                <div className="grid grid-cols-3 gap-4 pt-4 border-t border-slate-700/50">
                                    <Stat icon={<IconUsers size={20}/>} value={patientsAssigned} label="Pacientes"/>
                                    <Stat icon={<IconCheckCircle size={20}/>} value={tasksCompleted} label="Concluídas"/>
                                    <Stat icon={<IconClock size={20}/>} value={tasksPending} label="Pendentes"/>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )
        }

        return (
            <EmptyState
                icon={<IconBriefcase size={32} />}
                title="Nenhum Membro da Equipe Encontrado"
                message="Não há membros da equipe que correspondam à sua busca."
            />
        )
    }

    return (
        <div className="space-y-6">
             <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Gestão de Equipe</h1>
                <button onClick={handleOpenNewModal} className="w-full md:w-auto flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                    <IconPlus className="mr-2" />
                    Adicionar Membro
                </button>
            </header>

            <div className="relative w-full max-w-sm">
                <IconSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input
                    type="text"
                    placeholder="Buscar por nome..."
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-md pl-10 pr-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                />
            </div>

            {renderContent()}

            {isModalOpen && (
                <StaffModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveUser}
                    onDelete={handleDeleteUser}
                    user={selectedUser}
                />
            )}
        </div>
    );
};

export default StaffPage;
