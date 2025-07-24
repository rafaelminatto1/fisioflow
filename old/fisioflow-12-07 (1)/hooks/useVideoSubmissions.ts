import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { VideoSubmission } from '../types';
import { useNotification } from './useNotification';

const VIDEO_SUBMISSIONS_QUERY_KEY = 'videoSubmissions';

export const useVideoSubmissions = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: videoSubmissions, isLoading, isError, error } = useQuery<VideoSubmission[], Error>({
        queryKey: [VIDEO_SUBMISSIONS_QUERY_KEY],
        queryFn: api.getVideoSubmissions,
    });

    const saveVideoSubmissionMutation = useMutation<VideoSubmission, Error, Omit<VideoSubmission, 'id' | 'timestamp' | 'status'>>({
        mutationFn: api.saveVideoSubmission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [VIDEO_SUBMISSIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Vídeo Enviado', message: 'Seu vídeo foi enviado para análise do fisioterapeuta.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro no Envio', message: err.message });
        }
    });
    
    const updateVideoSubmissionMutation = useMutation<VideoSubmission, Error, { submissionId: string, status: VideoSubmission['status'], therapistNotes?: string }>({
        mutationFn: api.updateVideoSubmission,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [VIDEO_SUBMISSIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Feedback Enviado', message: 'O feedback da submissão foi salvo.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar Feedback', message: err.message });
        }
    });

    return {
        videoSubmissions,
        isLoading,
        isError,
        error,
        saveVideoSubmission: saveVideoSubmissionMutation.mutateAsync,
        updateVideoSubmission: updateVideoSubmissionMutation.mutateAsync,
    };
};