import React, { useMemo } from 'react';
import { ChatMessage, Exercise, User } from '../../types';
import MessageBubble from './MessageBubble';
import DateSeparator from './DateSeparator';

interface ChatWindowProps {
  messages: ChatMessage[];
  currentUserId: string;
  onShareExercise: (exerciseId: string) => void;
  exercises: Exercise[];
  users: User[];
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  messages,
  currentUserId,
  onShareExercise,
  exercises,
  users,
}) => {
  
  const messagesWithDateSeparators = useMemo(() => {
    const result: (ChatMessage | { type: 'date_separator'; date: string })[] = [];
    let lastDate = '';

    messages.forEach((message) => {
      const messageDate = new Date(message.timestamp).toDateString();
      
      if (messageDate !== lastDate) {
        result.push({
          type: 'date_separator',
          date: messageDate,
        });
        lastDate = messageDate;
      }
      
      result.push(message);
    });

    return result;
  }, [messages]);

  const getUserName = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.name || 'Usuário';
  };

  const getUserAvatar = (userId: string) => {
    const user = users.find(u => u.id === userId);
    return user?.avatarUrl;
  };

  const getExercise = (exerciseId: string) => {
    return exercises.find(ex => ex.id === exerciseId);
  };

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="text-center text-slate-400">
          <div className="text-4xl mb-4">💬</div>
          <p className="text-lg font-medium mb-2">Nenhuma mensagem ainda</p>
          <p className="text-sm">Seja o primeiro a enviar uma mensagem nesta conversa</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {messagesWithDateSeparators.map((item, index) => {
        if ('type' in item && item.type === 'date_separator') {
          return (
            <DateSeparator 
              key={`date-${item.date}`} 
              date={item.date} 
            />
          );
        }

        const message = item as ChatMessage;
        const isOwn = message.senderId === currentUserId;
        const showAvatar = !isOwn;
        
        // Verifica se deve mostrar o nome (primeira mensagem do remetente em sequência)
        const prevMessage = index > 0 ? messagesWithDateSeparators[index - 1] : null;
        const showName = !isOwn && (
          !prevMessage || 
          'type' in prevMessage ||
          (prevMessage as ChatMessage).senderId !== message.senderId
        );

        return (
          <MessageBubble
            key={message.id}
            message={message}
            isOwn={isOwn}
            showAvatar={showAvatar}
            showName={showName}
            senderName={getUserName(message.senderId)}
            senderAvatar={getUserAvatar(message.senderId)}
            exercise={message.metadata?.exerciseId ? getExercise(message.metadata.exerciseId) : undefined}
            onShareExercise={onShareExercise}
          />
        );
      })}
    </div>
  );
};

export default ChatWindow;