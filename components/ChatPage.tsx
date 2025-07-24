import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData.minimal';
import { Chat, ChatMessage, User, UserRole } from '../types';
import { IconSend, IconPlus, IconMessageCircle } from './icons/IconComponents';
import PageLoader from './ui/PageLoader';
import ChatInterface from './chat/ChatInterface';

const ChatListItem: React.FC<{
  chat: Chat;
  isSelected: boolean;
  onSelect: () => void;
  users: User[];
  lastMessage?: ChatMessage;
}> = ({ chat, isSelected, onSelect, users, lastMessage }) => {
  const { user: currentUser } = useAuth();
  const otherParticipantId = chat.participants.find(
    (p) => p !== currentUser?.id
  );
  const otherParticipant = users.find((u) => u.id === otherParticipantId);

  if (!otherParticipant) return null; // Or render a placeholder for unknown users

  const formatTimestamp = (isoString: string) => {
    const date = new Date(isoString);
    const today = new Date();
    if (date.toDateString() === today.toDateString()) {
      return date.toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <button
      onClick={onSelect}
      className={`flex w-full items-center gap-3 p-3 text-left transition-colors ${isSelected ? 'bg-blue-900/50' : 'hover:bg-slate-700/50'}`}
    >
      <img
        src={otherParticipant.avatarUrl}
        alt={otherParticipant.name}
        className="h-12 w-12 flex-shrink-0 rounded-full"
      />
      <div className="flex-1 overflow-hidden">
        <div className="flex items-baseline justify-between">
          <p className="truncate font-semibold text-slate-100">
            {otherParticipant.name}
          </p>
          {lastMessage && (
            <p className="flex-shrink-0 text-xs text-slate-400">
              {formatTimestamp(lastMessage.timestamp)}
            </p>
          )}
        </div>
        <p className="truncate text-sm text-slate-400">
          {lastMessage ? lastMessage.text : 'Nenhuma mensagem ainda.'}
        </p>
      </div>
    </button>
  );
};

const ChatMessageItem: React.FC<{
  message: ChatMessage;
  sender?: User;
  isOwnMessage: boolean;
}> = ({ message, sender, isOwnMessage }) => {
  return (
    <div
      className={`flex w-full items-start gap-3 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
    >
      {!isOwnMessage && (
        <img
          src={sender?.avatarUrl}
          alt={sender?.name}
          className="h-8 w-8 flex-shrink-0 rounded-full"
        />
      )}
      <div
        className={`max-w-lg rounded-lg p-3 ${isOwnMessage ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-200'}`}
      >
        <p className="whitespace-pre-wrap text-sm">{message.text}</p>
      </div>
      {isOwnMessage && (
        <img
          src={sender?.avatarUrl}
          alt={sender?.name}
          className="h-8 w-8 flex-shrink-0 rounded-full"
        />
      )}
    </div>
  );
};

const ChatPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return <PageLoader message="Carregando conversas..." />;
  }

  return (
    <div className="h-full max-h-[calc(100vh-140px)]">
      <ChatInterface className="h-full" />
    </div>
  );
};

export default ChatPage;
