import React, { useState, useRef, useEffect } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useChat } from '../../hooks/useChat';
import { useData } from '../../hooks/useData';
import { ChatMessage, MessageType, User, UserRole } from '../../types';

import CallInterface from './CallInterface';
import ChatHeader from './ChatHeader';
import ChatInput from './ChatInput';
import ChatSidebar from './ChatSidebar';
import ChatWindow from './ChatWindow';
import NewChatModal from './NewChatModal';
import TemplatesModal from './TemplatesModal';

interface ChatInterfaceProps {
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
  className?: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  isMinimized = false,
  onToggleMinimize,
  className = '',
}) => {
  const { user } = useAuth();
  const { 
    chats, 
    currentChat, 
    messages, 
    isConnected, 
    onlineUsers, 
    typingUsers,
    selectChat,
    sendMessage,
    sendTyping,
    shareExercise,
    templates,
    useTemplate,
    searchMessages,
    startVoiceCall,
    startVideoCall,
    createChat
  } = useChat();
  
  const { users, exercises } = useData();

  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [showCallInterface, setShowCallInterface] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ChatMessage[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [messageText, setMessageText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  // Auto scroll para última mensagem
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Gerencia status de digitação
  useEffect(() => {
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    if (isTyping) {
      sendTyping(true);
      
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false);
        sendTyping(false);
      }, 2000);
    } else {
      sendTyping(false);
    }

    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
    };
  }, [isTyping, sendTyping]);

  const handleSendMessage = async () => {
    if (!messageText.trim() && selectedFiles.length === 0) return;

    let messageType: MessageType = 'text';
    
    // Determina tipo da mensagem baseado nos arquivos
    if (selectedFiles.length > 0) {
      const firstFile = selectedFiles[0];
      if (firstFile.type.startsWith('image/')) messageType = 'image';
      else if (firstFile.type.startsWith('video/')) messageType = 'video';
      else if (firstFile.type.startsWith('audio/')) messageType = 'audio';
    }

    await sendMessage(messageText, messageType, selectedFiles);
    
    setMessageText('');
    setSelectedFiles([]);
    setIsTyping(false);
  };

  const handleInputChange = (text: string) => {
    setMessageText(text);
    
    if (text.length > 0 && !isTyping) {
      setIsTyping(true);
    } else if (text.length === 0 && isTyping) {
      setIsTyping(false);
    }
  };

  const handleFileSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    
    if (query.trim().length > 2) {
      setIsSearching(true);
      try {
        const results = await searchMessages(query);
        setSearchResults(results);
      } catch (error) {
        console.error('Erro na busca:', error);
      } finally {
        setIsSearching(false);
      }
    } else {
      setSearchResults([]);
    }
  };

  const handleShareExercise = async (exerciseId: string) => {
    const exercise = exercises.find(ex => ex.id === exerciseId);
    if (exercise) {
      await shareExercise(exerciseId, `Compartilhando exercício: ${exercise.name}`);
    }
  };

  const handleUseTemplate = async (templateId: string) => {
    await useTemplate(templateId);
    setShowTemplatesModal(false);
  };

  const handleStartVoiceCall = async () => {
    await startVoiceCall();
    setShowCallInterface(true);
  };

  const handleStartVideoCall = async () => {
    await startVideoCall();
    setShowCallInterface(true);
  };

  const handleCreateNewChat = async (participantIds: string[]) => {
    const participantRoles: Record<string, UserRole> = {};
    
    // Define roles dos participantes
    participantIds.forEach(id => {
      const participant = users.find(u => u.id === id);
      if (participant) {
        participantRoles[id] = participant.role;
      }
    });

    // Adiciona o usuário atual
    if (user) {
      participantRoles[user.id] = user.role;
      const allParticipants = [...participantIds, user.id];
      
      const newChat = await createChat(allParticipants, participantRoles);
      selectChat(newChat.id);
    }
    
    setShowNewChatModal(false);
  };

  const getTypingIndicator = () => {
    if (!currentChat) return null;
    
    const typingInThisChat = typingUsers.get(currentChat.id) || [];
    const othersTyping = typingInThisChat.filter(userId => userId !== user?.id);
    
    if (othersTyping.length === 0) return null;
    
    const typingUserNames = othersTyping.map(userId => {
      const typingUser = users.find(u => u.id === userId);
      return typingUser?.name || 'Usuário';
    });

    return (
      <div className="flex items-center space-x-2 p-3 text-sm text-slate-500">
        <div className="flex space-x-1">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
        </div>
        <span>
          {typingUserNames.join(', ')} {typingUserNames.length === 1 ? 'está' : 'estão'} digitando...
        </span>
      </div>
    );
  };

  if (isMinimized) {
    return (
      <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
        <button
          onClick={onToggleMinimize}
          className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-lg transition-colors"
        >
          💬
          {chats.some(chat => Object.values(chat.unreadCount).some(count => count > 0)) && (
            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></div>
          )}
        </button>
      </div>
    );
  }

  return (
    <div className={`flex h-full bg-white border border-slate-200 rounded-lg shadow-lg ${className}`}>
      {/* Sidebar com lista de chats */}
      <div className="w-80 border-r border-slate-200 flex flex-col">
        <ChatSidebar
          chats={chats}
          currentChat={currentChat}
          onSelectChat={selectChat}
          onNewChat={() => setShowNewChatModal(true)}
          onSearch={handleSearch}
          searchQuery={searchQuery}
          searchResults={searchResults}
          isSearching={isSearching}
          isConnected={isConnected}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Área principal do chat */}
      <div className="flex-1 flex flex-col">
        {currentChat ? (
          <>
            {/* Header do chat */}
            <ChatHeader
              chat={currentChat}
              onlineUsers={onlineUsers}
              onVoiceCall={handleStartVoiceCall}
              onVideoCall={handleStartVideoCall}
              onShowTemplates={() => setShowTemplatesModal(true)}
              onMinimize={onToggleMinimize}
            />

            {/* Janela de mensagens */}
            <div className="flex-1 overflow-hidden">
              <ChatWindow
                messages={messages}
                currentUserId={user?.id || ''}
                onShareExercise={handleShareExercise}
                exercises={exercises}
                users={users}
              />
              
              {/* Indicador de digitação */}
              {getTypingIndicator()}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input de mensagem */}
            <ChatInput
              value={messageText}
              onChange={handleInputChange}
              onSend={handleSendMessage}
              onFileSelect={handleFileSelect}
              selectedFiles={selectedFiles}
              onShowTemplates={() => setShowTemplatesModal(true)}
              disabled={!isConnected}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <div className="text-6xl mb-4">💬</div>
              <h3 className="text-lg font-semibold mb-2">Selecione um chat</h3>
              <p className="text-sm">Escolha uma conversa para começar a trocar mensagens</p>
              <button
                onClick={() => setShowNewChatModal(true)}
                className="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              >
                Iniciar Nova Conversa
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modais */}
      {showNewChatModal && (
        <NewChatModal
          isOpen={showNewChatModal}
          onClose={() => setShowNewChatModal(false)}
          onCreateChat={handleCreateNewChat}
          users={users.filter(u => u.id !== user?.id)}
        />
      )}

      {showTemplatesModal && (
        <TemplatesModal
          isOpen={showTemplatesModal}
          onClose={() => setShowTemplatesModal(false)}
          templates={templates}
          onUseTemplate={handleUseTemplate}
        />
      )}

      {showCallInterface && (
        <CallInterface
          isOpen={showCallInterface}
          onClose={() => setShowCallInterface(false)}
          chat={currentChat}
        />
      )}
    </div>
  );
};

export default ChatInterface;