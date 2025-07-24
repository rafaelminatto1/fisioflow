import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api.ts';
import { SessionNote } from '../types.ts';
import { useNotification } from './useNotification.tsx';
import { useAuth } from './useAuth.tsx';

const SESSION_NOTES_QUERY_KEY = 'sessionNotes';

export const useSessionNotes = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();
    const { user } = useAuth();

    const { data: sessionNotes, isLoading, isError, error } = useQuery<SessionNote[], Error>({
        queryKey: [SESSION_NOTES_QUERY_KEY],
        queryFn: api.getSessionNotes,
    });

    const saveSessionNoteMutation = useMutation<SessionNote, Error, { note: SessionNote; userId: string }>({
        mutationFn: ({ note, userId }) => api.saveSessionNote(note, userId),
        onSuccess: (savedNote) => {
            queryClient.invalidateQueries({ queryKey: [SESSION_NOTES_QUERY_KEY] });
            // Invalidate appointments as well to update the sessionNoteId link
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            addNotification({ type: 'success', title: 'Nota Salva', message: 'A nota da sessão foi salva com sucesso.' });
        },
        onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: err.message });
        }
    });

    const deleteSessionNoteMutation = useMutation<any, Error, { noteId: string; userId: string }>({
        mutationFn: ({ noteId, userId }) => api.deleteSessionNote(noteId, userId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [SESSION_NOTES_QUERY_KEY] });
            queryClient.invalidateQueries({ queryKey: ['appointments'] });
            addNotification({ type: 'info', title: 'Nota Excluída', message: 'A nota da sessão foi excluída.' });
        },
         onError: (err) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: err.message });
        }
    });

    return {
        sessionNotes,
        isLoading,
        isError,
        error,
        saveSessionNote: saveSessionNoteMutation.mutateAsync,
        deleteSessionNote: deleteSessionNoteMutation.mutateAsync,
    };
};
