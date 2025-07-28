import React from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Chat, UserStatus } from '../../types';

interface ChatHeaderProps {
  chat: Chat;
  onlineUsers: Map<string, UserStatus>;
  onVoiceCall: () => void;
  onVideoCall: () => void;
  onShowTemplates: () => void;
  onMinimize?: () => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
  chat,
  onlineUsers,
  onVoiceCall,
  onVideoCall,
  onShowTemplates,
  onMinimize,
}) => {
  const { user } = useAuth();
  const { users } = useData();

  const getOtherParticipant = () => {
    const otherParticipantId = chat.participants.find(id => id !== user?.id);
    return users.find(u => u.id === otherParticipantId);
  };

  const isUserOnline = (userId: string) => {
    const status = onlineUsers.get(userId);
    return status?.isOnline || false;
  };

  const getUserStatus = (userId: string) => {
    const status = onlineUsers.get(userId);
    return status?.status || 'offline';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'bg-green-500';
      case 'busy':
        return 'bg-red-500';
      case 'away':
        return 'bg-yellow-500';
      default:
        return 'bg-slate-400';
    }
  };

  const getStatusText = (status: string, isOnline: boolean) => {
    if (!isOnline) return 'Offline';
    
    switch (status) {
      case 'available':
        return 'Online';
      case 'busy':
        return 'Ocupado';
      case 'away':
        return 'Ausente';
      default:
        return 'Online';
    }
  };

  const otherUser = getOtherParticipant();
  const isOnline = otherUser ? isUserOnline(otherUser.id) : false;
  const userStatus = otherUser ? getUserStatus(otherUser.id) : 'offline';

  return (
    <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-white">
      {/* Informações do usuário */}
      <div className="flex items-center space-x-3">
        {/* Avatar */}
        <div className="relative">
          <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-sm font-medium">
            {otherUser?.avatarUrl ? (
              <img 
                src={otherUser.avatarUrl} 
                alt={otherUser.name}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              otherUser?.name.charAt(0) || '?'
            )}
          </div>
          
          {/* Indicador de status online */}
          {isOnline && (
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 ${getStatusColor(userStatus)} border-2 border-white rounded-full`}></div>
          )}
        </div>

        {/* Nome e status */}
        <div>
          <div className="flex items-center space-x-2">
            <h3 className="font-semibold text-slate-900">
              {otherUser?.name || 'Usuário'}
            </h3>
            
            {/* Badge do papel do usuário */}
            {otherUser && (
              <span className={`text-xs px-2 py-0.5 rounded-full ${
                otherUser.role === 'fisio' 
                  ? 'bg-blue-100 text-blue-700'
                  : otherUser.role === 'paciente'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-slate-100 text-slate-700'
              }`}>
                {otherUser.role === 'fisio' ? '👨‍⚕️ Fisioterapeuta' : 
                 otherUser.role === 'paciente' ? '🧑‍🦽 Paciente' : '👤 Usuário'}
              </span>
            )}
          </div>
          
          <p className={`text-sm ${
            isOnline ? 'text-green-600' : 'text-slate-500'
          }`}>
            {getStatusText(userStatus, isOnline)}
            {isOnline && userStatus === 'available' && (
              <span className="ml-1">• Disponível para chat</span>
            )}
          </p>
        </div>
      </div>

      {/* Botões de ação */}
      <div className="flex items-center space-x-2">
        {/* Botão de templates */}
        <button
          onClick={onShowTemplates}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Templates de mensagem"
        >
          📋
        </button>

        {/* Botão de chamada de voz */}
        <button
          onClick={onVoiceCall}
          disabled={!isOnline}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Chamada de voz"
        >
          📞
        </button>

        {/* Botão de videochamada */}
        <button
          onClick={onVideoCall}
          disabled={!isOnline}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          title="Videochamada"
        >
          📹
        </button>

        {/* Separador */}
        <div className="w-px h-6 bg-slate-300 mx-1"></div>

        {/* Botão de minimizar */}
        {onMinimize && (
          <button
            onClick={onMinimize}
            className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            title="Minimizar chat"
          >
            ➖
          </button>
        )}

        {/* Menu de opções */}
        <button
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          title="Mais opções"
        >
          ⋮
        </button>
      </div>
    </div>
  );
};

export default ChatHeader;