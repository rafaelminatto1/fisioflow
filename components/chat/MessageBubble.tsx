import React, { useState } from 'react';
import { ChatMessage, Exercise } from '../../types';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
  showAvatar: boolean;
  showName: boolean;
  senderName: string;
  senderAvatar?: string;
  exercise?: Exercise;
  onShareExercise: (exerciseId: string) => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isOwn,
  showAvatar,
  showName,
  senderName,
  senderAvatar,
  exercise,
  onShareExercise,
}) => {
  const [showFullImage, setShowFullImage] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderMessageContent = () => {
    switch (message.type) {
      case 'text':
        return (
          <div className="break-words">
            {message.text}
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="relative">
                    <img
                      src={attachment.url}
                      alt={attachment.name}
                      className="max-w-xs rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
                      onClick={() => setShowFullImage(true)}
                      onLoad={() => setImageLoading(false)}
                      onError={() => setImageLoading(false)}
                    />
                    
                    {imageLoading && (
                      <div className="absolute inset-0 bg-slate-200 rounded-lg flex items-center justify-center">
                        <div className="animate-spin w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                      </div>
                    )}

                    {/* Modal de imagem em tela cheia */}
                    {showFullImage && (
                      <div 
                        className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50"
                        onClick={() => setShowFullImage(false)}
                      >
                        <img
                          src={attachment.url}
                          alt={attachment.name}
                          className="max-w-full max-h-full object-contain"
                        />
                        <button
                          onClick={() => setShowFullImage(false)}
                          className="absolute top-4 right-4 text-white text-2xl hover:text-gray-300"
                        >
                          ✕
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'video':
        return (
          <div className="space-y-2">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <video
                    key={attachment.id}
                    src={attachment.url}
                    controls
                    className="max-w-xs rounded-lg"
                    poster={attachment.thumbnailUrl}
                  >
                    Seu navegador não suporta reprodução de vídeo.
                  </video>
                ))}
              </div>
            )}
          </div>
        );

      case 'audio':
        return (
          <div className="space-y-2">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-3 p-3 bg-slate-100 rounded-lg">
                    <div className="text-2xl">🎵</div>
                    <div className="flex-1">
                      <audio
                        src={attachment.url}
                        controls
                        className="w-full"
                      >
                        Seu navegador não suporta reprodução de áudio.
                      </audio>
                      <div className="text-xs text-slate-500 mt-1">
                        {attachment.name} • {Math.round(attachment.size / 1024)} KB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'file':
        return (
          <div className="space-y-2">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            {message.attachments && message.attachments.length > 0 && (
              <div className="space-y-2">
                {message.attachments.map((attachment) => (
                  <div key={attachment.id} className="flex items-center space-x-3 p-3 bg-slate-100 rounded-lg">
                    <div className="text-2xl">📎</div>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{attachment.name}</div>
                      <div className="text-xs text-slate-500">
                        {Math.round(attachment.size / 1024)} KB • {attachment.mimeType}
                      </div>
                    </div>
                    <a
                      href={attachment.url}
                      download={attachment.name}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'exercise':
        return (
          <div className="space-y-3">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            {exercise && (
              <div className="border border-slate-200 rounded-lg p-4 bg-blue-50">
                <div className="flex items-start space-x-3">
                  <div className="text-2xl">💪</div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-slate-900 mb-1">
                      {exercise.name}
                    </h4>
                    <p className="text-sm text-slate-600 line-clamp-2 mb-3">
                      {exercise.description}
                    </p>
                    
                    <div className="flex items-center space-x-2 mb-3">
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {exercise.category}
                      </span>
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded-full">
                        {exercise.bodyPart}
                      </span>
                    </div>
                    
                    <button
                      onClick={() => onShareExercise(exercise.id)}
                      className="px-3 py-1 bg-blue-500 text-white text-xs rounded hover:bg-blue-600 transition-colors"
                    >
                      Ver Exercício
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );

      case 'appointment':
        return (
          <div className="space-y-3">
            {message.text && (
              <div className="break-words">
                {message.text}
              </div>
            )}
            
            <div className="border border-slate-200 rounded-lg p-4 bg-green-50">
              <div className="flex items-start space-x-3">
                <div className="text-2xl">📅</div>
                <div className="flex-1">
                  <h4 className="font-semibold text-slate-900 mb-1">
                    Proposta de Agendamento
                  </h4>
                  <p className="text-sm text-slate-600 mb-3">
                    Nova sessão de fisioterapia proposta
                  </p>
                  
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 bg-green-500 text-white text-xs rounded hover:bg-green-600 transition-colors">
                      Aceitar
                    </button>
                    <button className="px-3 py-1 bg-slate-300 text-slate-700 text-xs rounded hover:bg-slate-400 transition-colors">
                      Reagendar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="break-words">
            {message.text || 'Mensagem não suportada'}
          </div>
        );
    }
  };

  return (
    <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} items-end space-x-2`}>
      {/* Avatar do remetente */}
      {showAvatar && (
        <div className="w-8 h-8 rounded-full bg-slate-300 flex items-center justify-center text-xs flex-shrink-0">
          {senderAvatar ? (
            <img 
              src={senderAvatar} 
              alt={senderName}
              className="w-full h-full rounded-full object-cover"
            />
          ) : (
            senderName.charAt(0)
          )}
        </div>
      )}

      {/* Espaçamento quando não há avatar */}
      {!showAvatar && !isOwn && <div className="w-8" />}

      {/* Bolha da mensagem */}
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'order-1' : ''}`}>
        {/* Nome do remetente */}
        {showName && (
          <div className="text-xs text-slate-500 mb-1 px-1">
            {senderName}
          </div>
        )}

        {/* Conteúdo da mensagem */}
        <div
          className={`px-4 py-2 rounded-2xl ${
            isOwn
              ? 'bg-blue-500 text-white rounded-br-md'
              : 'bg-slate-100 text-slate-900 rounded-bl-md'
          } ${
            message.type === 'exercise' || message.type === 'appointment' ? 'p-0 bg-transparent' : ''
          }`}
        >
          {renderMessageContent()}
        </div>

        {/* Informações da mensagem */}
        <div className={`flex items-center space-x-2 mt-1 px-1 ${
          isOwn ? 'justify-end' : 'justify-start'
        }`}>
          <span className="text-xs text-slate-400">
            {formatTime(message.timestamp)}
          </span>
          
          {/* Status de leitura para mensagens próprias */}
          {isOwn && (
            <span className="text-xs text-slate-400">
              {message.readAt ? '✓✓' : '✓'}
            </span>
          )}
          
          {/* Indicador de mensagem editada */}
          {message.editedAt && (
            <span className="text-xs text-slate-400">
              editada
            </span>
          )}

          {/* Indicador de mensagem de template */}
          {message.metadata?.isFromTemplate && (
            <span className="text-xs text-slate-400" title="Mensagem de template">
              📋
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessageBubble;