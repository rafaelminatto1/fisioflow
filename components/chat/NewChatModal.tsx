import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import BaseModal from '../ui/BaseModal';

interface NewChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateChat: (participantIds: string[]) => void;
  users: User[];
}

const NewChatModal: React.FC<NewChatModalProps> = ({
  isOpen,
  onClose,
  onCreateChat,
  users,
}) => {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterRole, setFilterRole] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    let filtered = [...users];

    // Filtro por busca
    if (searchQuery.trim()) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por papel
    if (filterRole !== 'all') {
      filtered = filtered.filter((user) => user.role === filterRole);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchQuery, filterRole]);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((user) => user.id));
    }
  };

  const handleCreateChat = () => {
    if (selectedUsers.length === 0) return;
    onCreateChat(selectedUsers);
    setSelectedUsers([]);
    setSearchQuery('');
    setFilterRole('all');
  };

  const handleClose = () => {
    setSelectedUsers([]);
    setSearchQuery('');
    setFilterRole('all');
    onClose();
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'fisio':
        return '👨‍⚕️ Fisioterapeuta';
      case 'paciente':
        return '🧑‍🦽 Paciente';
      case 'estagiario':
        return '👩‍🎓 Estagiário';
      default:
        return '👤 Usuário';
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'fisio':
        return 'bg-blue-100 text-blue-700';
      case 'paciente':
        return 'bg-green-100 text-green-700';
      case 'estagiario':
        return 'bg-purple-100 text-purple-700';
      default:
        return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Nova Conversa"
      size="lg"
    >
      <div className="space-y-4">
        {/* Controles de busca e filtro */}
        <div className="flex space-x-3">
          {/* Barra de busca */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 pl-10 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 transform text-slate-400">
              🔍
            </div>
          </div>

          {/* Filtro por papel */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="rounded-lg border border-slate-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">Todos</option>
            <option value="fisio">Fisioterapeutas</option>
            <option value="paciente">Pacientes</option>
            <option value="estagiario">Estagiários</option>
          </select>
        </div>

        {/* Informações da seleção */}
        <div className="flex items-center justify-between rounded-lg bg-slate-50 p-3">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">
              {selectedUsers.length} usuário
              {selectedUsers.length !== 1 ? 's' : ''} selecionado
              {selectedUsers.length !== 1 ? 's' : ''}
            </span>
            {filteredUsers.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                {selectedUsers.length === filteredUsers.length
                  ? 'Desmarcar todos'
                  : 'Selecionar todos'}
              </button>
            )}
          </div>

          {selectedUsers.length > 0 && (
            <button
              onClick={() => setSelectedUsers([])}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Limpar seleção
            </button>
          )}
        </div>

        {/* Lista de usuários */}
        <div className="max-h-96 overflow-y-auto rounded-lg border border-slate-200">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="mb-2 text-4xl">👥</div>
              <p className="mb-1 font-medium">Nenhum usuário encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`cursor-pointer p-4 transition-colors hover:bg-slate-50 ${
                    selectedUsers.includes(user.id)
                      ? 'border-l-4 border-blue-500 bg-blue-50'
                      : ''
                  }`}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Checkbox */}
                      <div
                        className={`flex h-5 w-5 items-center justify-center rounded border-2 ${
                          selectedUsers.includes(user.id)
                            ? 'border-blue-500 bg-blue-500 text-white'
                            : 'border-slate-300'
                        }`}
                      >
                        {selectedUsers.includes(user.id) && '✓'}
                      </div>

                      {/* Avatar */}
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-300 text-sm font-medium">
                        {user.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.name}
                            className="h-full w-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>

                      {/* Informações do usuário */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900">
                            {user.name}
                          </h4>
                          <span
                            className={`rounded-full px-2 py-1 text-xs ${getRoleColor(user.role)}`}
                          >
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        {user.email && (
                          <p className="text-sm text-slate-500">{user.email}</p>
                        )}
                        {user.specialty && (
                          <p className="text-xs text-slate-400">
                            Especialidade: {user.specialty}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Usuários selecionados (preview) */}
        {selectedUsers.length > 0 && (
          <div className="rounded-lg bg-blue-50 p-3">
            <h4 className="mb-2 text-sm font-medium text-blue-900">
              Participantes da conversa:
            </h4>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map((userId) => {
                const user = users.find((u) => u.id === userId);
                if (!user) return null;

                return (
                  <div
                    key={userId}
                    className="flex items-center space-x-2 rounded-full bg-white px-3 py-1 text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserToggle(userId);
                      }}
                      className="text-xs text-slate-400 hover:text-red-500"
                    >
                      ✕
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="flex justify-end space-x-3 border-t border-slate-200 pt-4">
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-slate-600 transition-colors hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateChat}
            disabled={selectedUsers.length === 0}
            className="rounded-lg bg-blue-500 px-4 py-2 text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Criar Conversa{' '}
            {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default NewChatModal;
