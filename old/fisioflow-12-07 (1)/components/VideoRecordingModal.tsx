
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { VideoRecordingModalProps } from '/types.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import { IconPlayerRecord, IconPlayerStop, IconRefresh, IconSend, IconVideo, IconAlertTriangle } from '/components/icons/IconComponents.js';

const VideoRecordingModal: React.FC<VideoRecordingModalProps> = ({ isOpen, onClose, onSave, exercise }) => {
    const [status, setStatus] = useState<'idle' | 'recording' | 'recorded' | 'denied' | 'error' | 'starting'>('starting');
    const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const recordedChunksRef = useRef<Blob[]>([]);

    const stopStream = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const handleClose = useCallback(() => {
        stopStream();
        onClose();
    }, [stopStream, onClose]);

    const startCamera = useCallback(async () => {
        if (streamRef.current) {
            stopStream();
        }
        setStatus('starting');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            streamRef.current = stream;
            if (videoRef.current) {
                videoRef.current.src = "";
                videoRef.current.srcObject = stream;
                videoRef.current.muted = true; // prevent feedback loop
                videoRef.current.play().catch(console.error);
            }
            setStatus('idle');
        } catch (err) {
            console.error("Camera access error:", err);
            setStatus('denied');
        }
    }, [stopStream]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        }
        return () => {
            stopStream();
        };
    }, [isOpen, startCamera, stopStream]);

    const handleStartRecording = () => {
        if (!streamRef.current) return;
        recordedChunksRef.current = [];
        try {
            const options = { mimeType: 'video/webm; codecs=vp9' };
            mediaRecorderRef.current = new MediaRecorder(streamRef.current, options);
        } catch (e) {
            console.warn("vp9 not supported, falling back", e);
            mediaRecorderRef.current = new MediaRecorder(streamRef.current);
        }

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) {
                recordedChunksRef.current.push(event.data);
            }
        };
        mediaRecorderRef.current.onstop = () => {
            const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
            const url = URL.createObjectURL(blob);
            setRecordedBlobUrl(url);
            setStatus('recorded');
            stopStream();
        };
        mediaRecorderRef.current.start();
        setStatus('recording');
    };

    const handleStopRecording = () => {
        mediaRecorderRef.current?.stop();
    };
    
    const handleRetake = () => {
        if (recordedBlobUrl) URL.revokeObjectURL(recordedBlobUrl);
        setRecordedBlobUrl(null);
        recordedChunksRef.current = [];
        startCamera();
    };

    const handleSave = async () => {
        if (recordedBlobUrl) {
            const blob = await fetch(recordedBlobUrl).then(r => r.blob());
            onSave(blob);
        }
    };
    
    const renderContent = () => {
        switch (status) {
            case 'starting':
                return <div className="aspect-video w-full bg-slate-900 flex items-center justify-center text-slate-400">Iniciando câmera...</div>;
            case 'denied':
                return (
                    <div className="aspect-video w-full bg-slate-900 flex flex-col items-center justify-center text-center text-red-400 p-4">
                        <IconAlertTriangle size={32} className="mb-2" />
                        <h3 className="font-semibold">Acesso à Câmera Negado</h3>
                        <p className="text-sm text-red-300">Você precisa permitir o acesso à câmera e ao microfone no seu navegador para gravar um vídeo.</p>
                    </div>
                );
            case 'recorded':
                return <video src={recordedBlobUrl!} className="aspect-video w-full bg-black rounded-lg" controls autoPlay playsInline />;
            default: // idle, recording
                return <video ref={videoRef} className="aspect-video w-full bg-black rounded-lg" muted playsInline />;
        }
    };

    const renderFooter = () => {
        switch (status) {
            case 'recording':
                return <div className="flex justify-center"><Button variant="danger" onClick={handleStopRecording} icon={<IconPlayerStop />}>Parar Gravação</Button></div>;
            case 'recorded':
                return (
                    <div className="flex justify-end gap-3">
                        <Button variant="secondary" onClick={handleRetake} icon={<IconRefresh />}>Gravar Novamente</Button>
                        <Button onClick={handleSave} icon={<IconSend />}>Enviar Vídeo</Button>
                    </div>
                );
            case 'idle':
                return <div className="flex justify-center"><Button onClick={handleStartRecording} icon={<IconPlayerRecord className="text-red-500" />}>Iniciar Gravação</Button></div>;
            case 'denied':
                return <div className="flex justify-end"><Button variant="secondary" onClick={onClose}>Fechar</Button></div>;
            default:
                return <div className="h-[42px]"></div>; // Placeholder for consistent height
        }
    };

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title={`Gravar Exercício: ${exercise.name}`}
            footer={renderFooter()}
        >
            <div className="space-y-4">
                {renderContent()}
                {status === 'recording' && <div className="text-center font-semibold text-red-400 animate-pulse">Gravando...</div>}
            </div>
        </BaseModal>
    );
};

export default VideoRecordingModal;