import React, { useState, useEffect, useRef } from 'react';

import { useAuth } from '../../hooks/useAuth';
import { useData } from '../../hooks/useData';
import { Chat } from '../../types';
import BaseModal from '../ui/BaseModal';

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
  const [callStatus, setCallStatus] = useState<
    'connecting' | 'ringing' | 'active' | 'ended'
  >('connecting');

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
      setCallDuration((prev) => prev + 1);
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
    const otherParticipantId = chat.participants.find((id) => id !== user?.id);
    return users.find((u) => u.id === otherParticipantId);
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
      <div className="overflow-hidden rounded-lg bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
        {callType === 'video' && isCallActive ? (
          /* Interface de videochamada */
          <div className="relative h-96">
            {/* Vídeo remoto (principal) */}
            <video
              ref={remoteVideoRef}
              className="h-full w-full bg-slate-800 object-cover"
              autoPlay
              playsInline
            />

            {/* Avatar quando vídeo está desabilitado */}
            {!isVideoEnabled && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-24 w-24 items-center justify-center rounded-full bg-slate-600 text-2xl font-bold">
                    {otherUser?.avatarUrl ? (
                      <img
                        src={otherUser.avatarUrl}
                        alt={otherUser.name}
                        className="h-full w-full rounded-full object-cover"
                      />
                    ) : (
                      otherUser?.name.charAt(0) || '?'
                    )}
                  </div>
                  <p className="text-lg font-medium">
                    {otherUser?.name || 'Usuário'}
                  </p>
                </div>
              </div>
            )}

            {/* Vídeo local (pequeno) */}
            <div className="absolute right-4 top-4 h-24 w-32 overflow-hidden rounded-lg border-2 border-white/20 bg-slate-700">
              <video
                ref={localVideoRef}
                className="h-full w-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {!isVideoEnabled && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-700">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-500 text-xs">
                    {user?.name.charAt(0) || '?'}
                  </div>
                </div>
              )}
            </div>

            {/* Status da chamada */}
            <div className="absolute left-4 top-4 rounded-full bg-black/50 px-3 py-1">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                <span className="text-sm font-medium">
                  {formatCallDuration(callDuration)}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Interface de chamada de voz */
          <div className="py-12 text-center">
            {/* Avatar do usuário */}
            <div className="mx-auto mb-6 flex h-32 w-32 items-center justify-center rounded-full bg-white/20 text-4xl font-bold">
              {otherUser?.avatarUrl ? (
                <img
                  src={otherUser.avatarUrl}
                  alt={otherUser.name}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                otherUser?.name.charAt(0) || '?'
              )}
            </div>

            {/* Nome do usuário */}
            <h3 className="mb-2 text-2xl font-semibold">
              {otherUser?.name || 'Usuário'}
            </h3>

            {/* Status da chamada */}
            <div className="mb-6">
              {callStatus === 'connecting' && (
                <p className="text-white/80">Conectando...</p>
              )}
              {callStatus === 'ringing' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-2 w-2 animate-bounce rounded-full bg-white/60"></div>
                  <p className="text-white/80">Chamando...</p>
                </div>
              )}
              {callStatus === 'active' && (
                <div className="flex items-center justify-center space-x-2">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400"></div>
                  <p className="text-white/80">
                    {formatCallDuration(callDuration)}
                  </p>
                </div>
              )}
              {callStatus === 'ended' && (
                <p className="text-white/80">Chamada encerrada</p>
              )}
            </div>

            {/* Qualidade da chamada */}
            {isCallActive && (
              <div className="mb-4 flex items-center justify-center space-x-1 text-sm text-white/60">
                <div className="flex space-x-1">
                  {[1, 2, 3, 4].map((bar) => (
                    <div
                      key={bar}
                      className={`h-3 w-1 rounded-full ${
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
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                isMuted
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={isMuted ? 'Ativar microfone' : 'Silenciar microfone'}
            >
              {isMuted ? '🔇' : '🎤'}
            </button>

            {/* Botão de vídeo (apenas em videochamadas) */}
            {callType === 'video' && (
              <button
                onClick={toggleVideo}
                className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                  !isVideoEnabled
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
                title={isVideoEnabled ? 'Desativar vídeo' : 'Ativar vídeo'}
              >
                {isVideoEnabled ? '📹' : '📷'}
              </button>
            )}

            {/* Botão de alto-falante */}
            <button
              onClick={toggleSpeaker}
              className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
                isSpeakerOn
                  ? 'bg-blue-500 hover:bg-blue-600'
                  : 'bg-white/20 hover:bg-white/30'
              }`}
              title={
                isSpeakerOn ? 'Desativar alto-falante' : 'Ativar alto-falante'
              }
            >
              {isSpeakerOn ? '🔊' : '🔇'}
            </button>

            {/* Botão de encerrar chamada */}
            <button
              onClick={handleEndCall}
              className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 transition-colors hover:bg-red-600"
              title="Encerrar chamada"
            >
              📞
            </button>
          </div>

          {/* Informações adicionais */}
          {isCallActive && (
            <div className="mt-4 text-center text-sm text-white/60">
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
