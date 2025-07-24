import React, { useState, useEffect, useRef } from 'react';
import { Chat } from '../../types';
import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData.minimal';
import BaseModal from '../BaseModal';

interface CallInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
  chat: Chat | null;
  callType?: 'voice' | 'video';
}

const CallInterface: React.FC<CallInterfaceProps> = ({
  isOpen,
  onClose,
  chat,
  callType = 'voice',
}) => {
  const { user } = useAuth();
  const { users } = useData();
  
  const [isCallActive, setIsCallActive] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(callType === 'video');
  const [isSpeakerOn, setIsSpeakerOn] = useState(false);
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'active' | 'ended'>('connecting');
  
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const callTimerRef = useRef<NodeJS.Timeout>();

  // Simula o processo de chamada
  useEffect(() => {
    if (!isOpen) return;

    // Simula conexão
    const connectTimer = setTimeout(() => {
      setCallStatus('ringing');
      
      // Simula atendimento após 3 segundos
      const answerTimer = setTimeout(() => {
        setCallStatus('active');
        setIsCallActive(true);
        startCallTimer();
      }, 3000);

      return () => clearTimeout(answerTimer);
    }, 1000);

    return () => clearTimeout(connectTimer);
  }, [isOpen]);

  // Timer da chamada
  const startCallTimer = () => {
    callTimerRef.current = setInterval(() => {
      setCallDuration(prev => prev + 1);
    }, 1000);
  };

  const stopCallTimer = () => {
    if (callTimerRef.current) {
      clearInterval(callTimerRef.current);
      callTimerRef.current = undefined;
    }
  };

  const formatCallDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getOtherParticipant = () => {
    if (!chat) return null;
    const otherParticipantId = chat.participants.find(id => id !== user?.id);
    return users.find(u => u.id === otherParticipantId);
  };

  const handleEndCall = () => {
    setCallStatus('ended');
    setIsCallActive(false);
    stopCallTimer();
    
    setTimeout(() => {
      onClose();
      // Reset states
      setCallDuration(0);
      setIsMuted(false);
      setIsVideoEnabled(callType === 'video');
      setIsSpeakerOn(false);
      setCallStatus('connecting');
    }, 1000);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
  };

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn);
  };

  const otherUser = getOtherParticipant();

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="lg"
      hideCloseButton
    >
      <div className="bg-gradient-to-br from-blue-900 to-indigo-900 text-white rounded-lg overflow-hidden">
        {callType === 'video' && isCallActive ? (
          /* Interface de videochamada */
          <div className="relative h-96">
            {/* Vídeo remoto (principal) */}
            <video
              ref={remoteVideoRef}
              className="w-full h-full object-cover bg-slate-800"
              autoPlay
              playsInline
            />
            
            {/* Avatar quando vídeo está desabilitado */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <div className="w-24 h-24 bg-slate-600 rounded-full flex items-center justify-center text-2xl font-bold mb-4 mx-auto">
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
                  <p className="text-lg font-medium">{otherUser?.name || 'Usuário'}</p>
                </div>
              </div>
            )}

            {/* Vídeo local (pequeno) */}
            <div className="absolute top-4 right-4 w-32 h-24 bg-slate-700 rounded-lg overflow-hidden border-2 border-white/20">
              <video
                ref={localVideoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
                  <div className="w-8 h-8 bg-slate-500 rounded-full flex items-center justify-center text-xs">
                    {user?.name.charAt(0) || '?'}
                  </div>
                </div>
              )}
            </div>

            {/* Status da chamada */}
            <div className="absolute top-4 left-4 bg-black/50 px-3 py-1 rounded-full">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Interface de chamada de voz */
          <div className="text-center py-12">
            {/* Avatar do usuário */}
            <div className="w-32 h-32 bg-white/20 rounded-full flex items-center justify-center text-4xl font-bold mb-6 mx-auto">
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

            {/* Nome do usuário */}
            <h3 className="text-2xl font-semibold mb-2">
              {otherUser?.name || 'Usuário'}
            </h3>

            {/* Status da chamada */}
            <div className="mb-6">
              {callStatus === 'connecting' && (
                <p className="text-white/80">Conectando...</p>
              )}
              {callStatus === 'ringing' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                  <p className="text-white/80">Chamando...</p>
                </div>
              )}
              {callStatus === 'active' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <p className="text-white/80">{formatCallDuration(callDuration)}</p>
                </div>
              )}
              {callStatus === 'ended' && (
                <p className="text-white/80">Chamada encerrada</p>
              )}
            </div>

            {/* Qualidade da chamada */}
            {isCallActive && (
              <div className="flex items-center justify-center space-x-1 text-white/60 text-sm mb-4">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map(bar => (
                    <div
                      key={bar}
                      className={`w-1 h-3 rounded-full ${
                        bar <= 3 ? 'bg-green-400' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2">Boa qualidade</span>
              </div>
            )}
          </div>
        )}

        {/* Controles da chamada */}
        <div className="px-8 pb-8">
          <div className="flex justify-center space-x-4">
            {/* Botão de mute */}
            <button
              onClick={toggleMute}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isMuted ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>

            {/* Botão de vídeo (apenas em videochamadas) */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                  !isVideoEnabled ? 'bg-red-500 hover:bg-red-600' : 'bg-white/20 hover:bg-white/30'
                }`}
                title={isVideoEnabled ? 'Desativar vídeo' : 'Ativar vídeo'}
              >
                {isVideoEnabled ? '📹' : '📷'}
              </button>
            )}

            {/* Botão de alto-falante */}
            <button
              onClick={toggleSpeaker}
              className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${
                isSpeakerOn ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isSpeakerOn ? 'Desativar alto-falante' : 'Ativar alto-falante'}
            >
              {isSpeakerOn ? '🔊' : '🔇'}
            </button>

            {/* Botão de encerrar chamada */}
            <button
              onClick={handleEndCall}
              className="w-12 h-12 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors"
              title="Encerrar chamada"
            >
              📞
            </button>
          </div>

          {/* Informações adicionais */}
          {isCallActive && (
            <div className="text-center mt-4 text-white/60 text-sm">
              <p>
                {callType === 'video' ? 'Videochamada' : 'Chamada de voz'} • 
                Qualidade: {isSpeakerOn ? 'Alto-falante' : 'Fone'} • 
                {isMuted ? 'Microfone desativado' : 'Microfone ativo'}
              </p>
            </div>
          )}
        </div>
      </div>
    </BaseModal>
  );
};

export default CallInterface;