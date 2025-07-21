import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { Chat, ChatMessage, User, UserRole } from '../types';
import { IconSend, IconPlus, IconMessageCircle } from './icons/IconComponents';
import PageLoader from './ui/PageLoader';

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
  const { user: currentUser } = useAuth();
  const { users, chats, chatMessages, sendChatMessage } = useData();
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, activeChatId]);

  const userChats = useMemo(() => {
    return chats
      .filter((c) => c.participants.includes(currentUser!.id))
      .sort(
        (a, b) =>
          new Date(b.lastMessageTimestamp).getTime() -
          new Date(a.lastMessageTimestamp).getTime()
      );
  }, [chats, currentUser]);

  const activeChatMessages = useMemo(() => {
    if (!activeChatId) return [];
    return chatMessages
      .filter((m) => m.chatId === activeChatId)
      .sort(
        (a, b) =>
          new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
  }, [chatMessages, activeChatId]);

  const handleSendMessage = () => {
    if (!input.trim() || !activeChatId || !currentUser) return;

    const newMessage = {
      chatId: activeChatId,
      senderId: currentUser.id,
      text: input,
      tenantId: currentUser.tenantId!,
    };

    sendChatMessage(newMessage, currentUser);
    setInput('');
  };

  const handleSelectChat = (chatId: string) => {
    setActiveChatId(chatId);
  };

  const getLastMessage = (chatId: string) => {
    return chatMessages
      .filter((m) => m.chatId === chatId)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )[0];
  };

  if (isLoading) {
    return <PageLoader message="Carregando conversas..." />;
  }

  if (!currentUser) return null;

  return (
    <div className="flex h-full max-h-[calc(100vh-140px)] gap-6">
      {/* Left Panel: Chat List */}
      <aside
        className={`flex w-full flex-col rounded-lg border border-slate-700 bg-slate-800 md:w-1/3 ${activeChatId ? 'hidden md:flex' : 'flex'}`}
      >
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">Conversas</h2>
          <button className="rounded-md p-2 hover:bg-slate-700">
            <IconPlus />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto">
          {userChats.map((chat) => (
            <ChatListItem
              key={chat.id}
              chat={chat}
              isSelected={activeChatId === chat.id}
              onSelect={() => handleSelectChat(chat.id)}
              users={users}
              lastMessage={getLastMessage(chat.id)}
            />
          ))}
        </div>
      </aside>
      {/* Right Panel: Message View */}
      <main
        className={`flex w-full flex-col rounded-lg border border-slate-700 bg-slate-800 md:w-2/3 ${activeChatId ? 'flex' : 'hidden md:flex'}`}
      >
        {activeChatId ? (
          <>
            <header className="border-b border-slate-700 p-3">
              {/* Header content with other participant's info */}
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {activeChatMessages.map((msg) => {
                const sender = users.find((u) => u.id === msg.senderId);
                return (
                  <ChatMessageItem
                    key={msg.id}
                    message={msg}
                    sender={sender}
                    isOwnMessage={msg.senderId === currentUser.id}
                  />
                );
              })}
              <div ref={messagesEndRef} />
            </div>
            <footer className="border-t border-slate-700 p-4">
              <div className="flex items-center gap-2 rounded-lg border border-slate-600 bg-slate-900 pr-2">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Digite sua mensagem..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent p-3 text-slate-100 focus:outline-none"
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!input.trim()}
                  className="rounded-full bg-blue-600 p-2 text-slate-300 transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-700"
                >
                  <IconSend size={18} />
                </button>
              </div>
            </footer>
          </>
        ) : (
          <div className="m-auto p-8 text-center text-slate-500">
            <IconMessageCircle size={48} className="mx-auto mb-4" />
            <p className="font-semibold">Selecione uma conversa</p>
            <p className="text-sm">Suas mensagens aparecerão aqui.</p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ChatPage;
