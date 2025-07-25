import React, { useState, useMemo, useEffect } from 'react';
import { useData } from '../hooks/useData.minimal';
import { useAuth } from '../hooks/useAuth';
import { User, UserRole } from '../types';
import { IconPlus, IconPencil, IconSearch } from './icons/IconComponents';
import StaffModal from './StaffModal';
import PageShell from './ui/PageShell';
import PageLoader from './ui/PageLoader';
import { Button } from './ui/Button';

const StaffPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user: actingUser } = useAuth();
  const { users, saveUser, deleteUser } = useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | Partial<User> | null>(
    null
  );
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const staffMembers = useMemo(
    () =>
      users
        .filter(
          (u) =>
            u.role !== UserRole.PACIENTE &&
            u.name.toLowerCase().includes(searchTerm.toLowerCase())
        )
        .sort((a, b) => a.name.localeCompare(b.name)),
    [users, searchTerm]
  );

  const handleOpenModal = (user: User | Partial<User> | null) => {
    setSelectedUser(user);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    handleOpenModal({
      name: '',
      email: '',
      role: UserRole.ESTAGIARIO,
      avatarUrl: `https://picsum.photos/seed/${Date.now()}/100/100`,
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedUser(null);
  };

  const handleSaveUser = (userToSave: User) => {
    if (!actingUser) return;
    saveUser(userToSave, actingUser);
    handleCloseModal();
  };

  const handleDeleteUser = (userId: string) => {
    if (!actingUser) return;
    deleteUser(userId, actingUser);
    handleCloseModal();
  };

  const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.FISIOTERAPEUTA]: 'Fisioterapeuta',
    [UserRole.ESTAGIARIO]: 'Estagiário',
    [UserRole.PACIENTE]: 'Paciente',
  };

  if (isLoading) {
    return <PageLoader message="Carregando dados da equipe..." />;
  }

  return (
    <PageShell
      title="Gestão de Equipe"
      action={
        <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
          Adicionar Membro
        </Button>
      }
    >
      <div className="rounded-lg border border-slate-700 bg-slate-800">
        <div className="border-b border-slate-700 p-4">
          <div className="relative w-full max-w-sm">
            <IconSearch
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-md border border-slate-600 bg-slate-900 py-2 pl-10 pr-4 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Nome
                </th>
                <th scope="col" className="px-6 py-3">
                  Cargo
                </th>
                <th scope="col" className="px-6 py-3">
                  Email
                </th>
                <th scope="col" className="px-6 py-3 text-center">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {staffMembers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-700/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-10 w-10 rounded-full"
                      />
                      <span className="font-medium text-slate-100">
                        {user.name}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 capitalize">
                    {roleNames[user.role] || user.role}
                  </td>
                  <td className="px-6 py-4">{user.email || 'N/A'}</td>
                  <td className="px-6 py-4 text-center">
                    <button
                      onClick={() => handleOpenModal(user)}
                      className="rounded-md p-2 text-slate-400 transition-colors hover:bg-slate-700 hover:text-amber-400"
                      title="Editar"
                    >
                      <IconPencil size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {staffMembers.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              <p>Nenhum membro da equipe encontrado.</p>
            </div>
          )}
        </div>
      </div>
      {isModalOpen && (
        <StaffModal
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onSave={handleSaveUser}
          onDelete={handleDeleteUser}
          user={selectedUser}
        />
      )}
    </PageShell>
  );
};

export default StaffPage;
