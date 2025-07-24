import React, { useState, useRef, KeyboardEvent } from 'react';

interface ChatInputProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  onFileSelect: (files: File[]) => void;
  selectedFiles: File[];
  onShowTemplates: () => void;
  disabled?: boolean;
  placeholder?: string;
}

const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onFileSelect,
  selectedFiles,
  onShowTemplates,
  disabled = false,
  placeholder = "Digite sua mensagem...",
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const handleKeyPress = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && (value.trim() || selectedFiles.length > 0)) {
        onSend();
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFileSelect(files);
    }
  };

  const handleRemoveFile = (index: number) => {
    const newFiles = selectedFiles.filter((_, i) => i !== index);
    onFileSelect(newFiles);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const audioChunks: Blob[] = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunks.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
        const audioFile = new File([audioBlob], `audio-${Date.now()}.wav`, {
          type: 'audio/wav',
        });
        onFileSelect([audioFile]);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
      setRecordingTime(0);
      
      mediaRecorder.start();

      // Contador de tempo
      recordingIntervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error('Erro ao acessar microfone:', error);
      alert('Não foi possível acessar o microfone. Verifique as permissões.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setRecordingTime(0);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    return '📎';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i)) + ' ' + sizes[i];
  };

  return (
    <div className="border-t border-slate-200 bg-white">
      {/* Arquivos selecionados */}
      {selectedFiles.length > 0 && (
        <div className="p-3 border-b border-slate-100">
          <div className="flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center space-x-2 bg-slate-100 rounded-lg p-2 text-sm"
              >
                <span>{getFileIcon(file)}</span>
                <span className="max-w-32 truncate">{file.name}</span>
                <span className="text-xs text-slate-500">
                  {formatFileSize(file.size)}
                </span>
                <button
                  onClick={() => handleRemoveFile(index)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Área de input */}
      <div className="p-4">
        <div className="flex items-end space-x-3">
          {/* Botões de ação à esquerda */}
          <div className="flex space-x-1">
            {/* Botão de anexos */}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Anexar arquivo"
            >
              📎
            </button>

            {/* Botão de templates */}
            <button
              onClick={onShowTemplates}
              disabled={disabled}
              className="p-2 text-slate-500 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Templates de mensagem"
            >
              📋
            </button>

            {/* Botão de gravação de áudio */}
            <button
              onClick={isRecording ? stopRecording : startRecording}
              disabled={disabled}
              className={`p-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                isRecording 
                  ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
              title={isRecording ? 'Parar gravação' : 'Gravar áudio'}
            >
              {isRecording ? '⏹️' : '🎤'}
            </button>
          </div>

          {/* Campo de texto */}
          <div className="flex-1 relative">
            {isRecording && (
              <div className="absolute -top-8 left-0 right-0 bg-red-100 text-red-700 text-sm px-3 py-1 rounded-lg flex items-center justify-center">
                🔴 Gravando {formatRecordingTime(recordingTime)}
              </div>
            )}
            
            <textarea
              value={value}
              onChange={(e) => onChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={disabled ? "Conectando..." : placeholder}
              disabled={disabled || isRecording}
              rows={1}
              className="w-full px-4 py-3 border border-slate-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                minHeight: '44px',
                maxHeight: '120px',
                overflowY: value.split('\n').length > 3 ? 'auto' : 'hidden',
              }}
            />
          </div>

          {/* Botão de envio */}
          <button
            onClick={onSend}
            disabled={disabled || (!value.trim() && selectedFiles.length === 0) || isRecording}
            className="p-3 bg-blue-500 text-white rounded-full hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Enviar mensagem"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>

        {/* Input de arquivo oculto */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,audio/*,.pdf,.doc,.docx"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Dica de uso */}
        <div className="mt-2 text-xs text-slate-400 text-center">
          Pressione Enter para enviar, Shift+Enter para quebrar linha
        </div>
      </div>
    </div>
  );
};

export default ChatInput;