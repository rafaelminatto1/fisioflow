import React, { useState, useMemo } from 'react';
import { Chat, ChatMessage, UserStatus } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';

interface ChatSidebarProps {
  chats: Chat[];
  currentChat: Chat | null;
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  onSearch: (query: string) => void;
  searchQuery: string;
  searchResults: ChatMessage[];
  isSearching: boolean;
  isConnected: boolean;
  onlineUsers: Map<string, UserStatus>;
}

const ChatSidebar: React.FC<ChatSidebarProps> = ({
  chats,
  currentChat,
  onSelectChat,
  onNewChat,
  onSearch,
  searchQuery,
  searchResults,
  isSearching,
  isConnected,
  onlineUsers,
}) => {
  const { user } = useAuth();
  const { users } = useData();
  const [showSearchResults, setShowSearchResults] = useState(false);

  const sortedChats = useMemo(() => {
    return [...chats].sort((a, b) => 
      new Date(b.lastMessageTimestamp).getTime() - new Date(a.lastMessageTimestamp).getTime()
    );
  }, [chats]);

  const getOtherParticipant = (chat: Chat) => {
    const otherParticipantId = chat.participants.find(id => id !== user?.id);
    return users.find(u => u.id === otherParticipantId);
  };

  const getUnreadCount = (chat: Chat) => {
    return user?.id ? chat.unreadCount[user.id] || 0 : 0;
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) { // < 1 minuto
      return 'agora';
    } else if (diff < 3600000) { // < 1 hora
      return `${Math.floor(diff / 60000)}m`;
    } else if (diff < 86400000) { // < 1 dia
      return `${Math.floor(diff / 3600000)}h`;
    } else if (diff < 604800000) { // < 1 semana
      const days = Math.floor(diff / 86400000);
      return `${days}d`;
    } else {
      return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    }
  };

  const getMessagePreview = (message?: ChatMessage) => {
    if (!message) return 'Nenhuma mensagem';
    
    switch (message.type) {
      case 'text':
        return message.text || '';
      case 'image':
        return '📷 Imagem';
      case 'video':
        return '🎥 Vídeo';
      case 'audio':
        return '🎵 Áudio';
      case 'exercise':
        return '💪 Exercício';
      case 'appointment':
        return '📅 Agendamento';
      case 'file':
        return '📎 Arquivo';
      default:
        return 'Mensagem';
    }
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

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    onSearch(query);
    setShowSearchResults(query.length > 0);
  };

  const highlightSearchTerm = (text: string, term: string) => {
    if (!term) return text;
    
    const regex = new RegExp(`(${term})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} className="bg-yellow-200 px-1 rounded">
          {part}
        </mark>
      ) : part
    );
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header da sidebar */}
      <div className="p-4 border-b border-slate-200">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-slate-900">Conversas</h2>
          <div className="flex items-center space-x-2">
            {/* Indicador de conexão */}
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} 
                 title={isConnected ? 'Conectado' : 'Desconectado'} />
            
            {/* Botão nova conversa */}
            <button
              onClick={onNewChat}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              title="Nova conversa"
            >
              ✏️
            </button>
          </div>
        </div>

        {/* Barra de busca */}
        <div className="relative">
          <input
            type="text"
            placeholder="Buscar conversas..."
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full px-3 py-2 pl-10 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400">
            🔍
          </div>
          
          {isSearching && (
            <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
            </div>
          )}
        </div>
      </div>

      {/* Lista de chats ou resultados de busca */}
      <div className="flex-1 overflow-y-auto">
        {showSearchResults && searchQuery ? (
          /* Resultados da busca */
          <div className="p-2">
            <div className="text-xs text-slate-500 mb-2 px-2">
              {searchResults.length} resultado{searchResults.length !== 1 ? 's' : ''} encontrado{searchResults.length !== 1 ? 's' : ''}
            </div>
            
            {searchResults.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-2xl mb-2">🔍</div>
                <p className="text-sm">Nenhuma mensagem encontrada</p>
              </div>
            ) : (
              <div className="space-y-1">
                {searchResults.map((message) => {
                  const chat = chats.find(c => c.id === message.chatId);
                  const otherUser = chat ? getOtherParticipant(chat) : null;
                  
                  return (
                    <button
                      key={message.id}
                      onClick={() => {
                        onSelectChat(message.chatId);
                        setShowSearchResults(false);
                      }}
                      className="w-full text-left p-3 hover:bg-slate-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-slate-300 rounded-full flex items-center justify-center text-sm">
                          {otherUser?.name.charAt(0) || '?'}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-slate-900 truncate">
                              {otherUser?.name || 'Usuário'}
                            </p>
                            <span className="text-xs text-slate-500">
                              {formatTimestamp(message.timestamp)}
                            </span>
                          </div>
                          
                          <p className="text-sm text-slate-600 truncate">
                            {message.type === 'text' ? 
                              highlightSearchTerm(message.text || '', searchQuery) :
                              getMessagePreview(message)
                            }
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Lista de chats */
          <div className="p-2">
            {sortedChats.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <div className="text-4xl mb-4">💬</div>
                <p className="text-sm font-medium mb-2">Nenhuma conversa ainda</p>
                <p className="text-xs">Inicie uma nova conversa para começar</p>
                <button
                  onClick={onNewChat}
                  className="mt-3 px-4 py-2 bg-blue-500 text-white text-sm rounded-lg hover:bg-blue-600 transition-colors"
                >
                  Iniciar Conversa
                </button>
              </div>
            ) : (
              <div className="space-y-1">
                {sortedChats.map((chat) => {
                  const otherUser = getOtherParticipant(chat);
                  const unreadCount = getUnreadCount(chat);
                  const isSelected = currentChat?.id === chat.id;
                  const isOnline = otherUser ? isUserOnline(otherUser.id) : false;
                  const userStatus = otherUser ? getUserStatus(otherUser.id) : 'offline';
                  
                  return (
                    <button
                      key={chat.id}
                      onClick={() => onSelectChat(chat.id)}
                      className={`w-full text-left p-3 rounded-lg transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border border-blue-200' 
                          : 'hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        {/* Avatar com status online */}
                        <div className="relative">
                          <div className="w-12 h-12 bg-slate-300 rounded-full flex items-center justify-center text-sm font-medium">
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
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${getStatusColor(userStatus)} border-2 border-white rounded-full`}></div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <p className="text-sm font-medium text-slate-900 truncate">
                                {otherUser?.name || 'Usuário'}
                              </p>
                              
                              {/* Badge do papel do usuário */}
                              {otherUser && (
                                <span className={`text-xs px-2 py-0.5 rounded-full ${
                                  otherUser.role === 'fisio' 
                                    ? 'bg-blue-100 text-blue-700'
                                    : otherUser.role === 'paciente'
                                    ? 'bg-green-100 text-green-700'
                                    : 'bg-slate-100 text-slate-700'
                                }`}>
                                  {otherUser.role === 'fisio' ? '👨‍⚕️' : 
                                   otherUser.role === 'paciente' ? '🧑‍🦽' : '👤'}
                                </span>
                              )}
                            </div>
                            
                            <div className="flex items-center space-x-1">
                              <span className="text-xs text-slate-500">
                                {formatTimestamp(chat.lastMessageTimestamp)}
                              </span>
                              
                              {/* Contador de mensagens não lidas */}
                              {unreadCount > 0 && (
                                <div className="bg-blue-500 text-white text-xs rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center justify-between mt-1">
                            <p className={`text-sm truncate ${
                              unreadCount > 0 ? 'font-medium text-slate-900' : 'text-slate-600'
                            }`}>
                              {getMessagePreview(chat.lastMessage)}
                            </p>
                            
                            {/* Indicadores de status da mensagem */}
                            {chat.lastMessage?.senderId === user?.id && (
                              <div className="text-slate-400 ml-2">
                                {chat.lastMessage.readAt ? '✓✓' : '✓'}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer com status do usuário */}
      <div className="p-3 border-t border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="relative">
            <div className="w-8 h-8 bg-slate-300 rounded-full flex items-center justify-center text-xs">
              {user?.avatarUrl ? (
                <img 
                  src={user.avatarUrl} 
                  alt={user.name}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                user?.name.charAt(0) || '?'
              )}
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border border-white rounded-full"></div>
          </div>
          
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-900 truncate">{user?.name}</p>
            <p className="text-xs text-green-600">Online</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;