import React, { useState, useMemo } from 'react';
import { User } from '../../types';
import BaseModal from '../BaseModal';

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
      filtered = filtered.filter(user => 
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Filtro por papel
    if (filterRole !== 'all') {
      filtered = filtered.filter(user => user.role === filterRole);
    }

    return filtered.sort((a, b) => a.name.localeCompare(b.name));
  }, [users, searchQuery, filterRole]);

  const handleUserToggle = (userId: string) => {
    setSelectedUsers(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(user => user.id));
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
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Buscar usuários..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 pl-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
              🔍
            </div>
          </div>

          {/* Filtro por papel */}
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">Todos</option>
            <option value="fisio">Fisioterapeutas</option>
            <option value="paciente">Pacientes</option>
            <option value="estagiario">Estagiários</option>
          </select>
        </div>

        {/* Informações da seleção */}
        <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-slate-600">
              {selectedUsers.length} usuário{selectedUsers.length !== 1 ? 's' : ''} selecionado{selectedUsers.length !== 1 ? 's' : ''}
            </span>
            {filteredUsers.length > 0 && (
              <button
                onClick={handleSelectAll}
                className="text-sm text-blue-600 hover:text-blue-700 font-medium"
              >
                {selectedUsers.length === filteredUsers.length ? 'Desmarcar todos' : 'Selecionar todos'}
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
        <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
          {filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <div className="text-4xl mb-2">👥</div>
              <p className="font-medium mb-1">Nenhum usuário encontrado</p>
              <p className="text-sm">Tente ajustar os filtros de busca</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 hover:bg-slate-50 transition-colors cursor-pointer ${
                    selectedUsers.includes(user.id) ? 'bg-blue-50 border-l-4 border-blue-500' : ''
                  }`}
                  onClick={() => handleUserToggle(user.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      {/* Checkbox */}
                      <div className={`w-5 h-5 border-2 rounded flex items-center justify-center ${
                        selectedUsers.includes(user.id)
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'border-slate-300'
                      }`}>
                        {selectedUsers.includes(user.id) && '✓'}
                      </div>

                      {/* Avatar */}
                      <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center text-sm font-medium">
                        {user.avatarUrl ? (
                          <img 
                            src={user.avatarUrl} 
                            alt={user.name}
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          user.name.charAt(0)
                        )}
                      </div>

                      {/* Informações do usuário */}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="font-medium text-slate-900">{user.name}</h4>
                          <span className={`text-xs px-2 py-1 rounded-full ${getRoleColor(user.role)}`}>
                            {getRoleLabel(user.role)}
                          </span>
                        </div>
                        {user.email && (
                          <p className="text-sm text-slate-500">{user.email}</p>
                        )}
                        {user.specialty && (
                          <p className="text-xs text-slate-400">Especialidade: {user.specialty}</p>
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
          <div className="p-3 bg-blue-50 rounded-lg">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Participantes da conversa:</h4>
            <div className="flex flex-wrap gap-2">
              {selectedUsers.map(userId => {
                const user = users.find(u => u.id === userId);
                if (!user) return null;
                
                return (
                  <div
                    key={userId}
                    className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full text-sm"
                  >
                    <span>{user.name}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleUserToggle(userId);
                      }}
                      className="text-slate-400 hover:text-red-500 text-xs"
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
        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleCreateChat}
            disabled={selectedUsers.length === 0}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Criar Conversa {selectedUsers.length > 0 && `(${selectedUsers.length})`}
          </button>
        </div>
      </div>
    </BaseModal>
  );
};

export default NewChatModal;