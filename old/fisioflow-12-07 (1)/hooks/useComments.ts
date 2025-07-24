
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Comment } from '../types';
import { useNotification } from './useNotification';

const COMMENTS_QUERY_KEY = 'comments';

export const useComments = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: comments, isLoading, isError, error } = useQuery<Comment[], Error>({
        queryKey: [COMMENTS_QUERY_KEY],
        queryFn: api.getComments,
    });

    const saveCommentMutation = useMutation<Comment, Error, Omit<Comment, 'id' | 'timestamp'>>({
        mutationFn: (comment) => api.saveComment(comment),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY] });
        },
        onError: (error) => {
            addNotification({ type: 'error', title: 'Erro ao Comentar', message: error.message });
        }
    });

    const deleteCommentMutation = useMutation<any, Error, string>({
        mutationFn: (commentId) => api.deleteComment(commentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [COMMENTS_QUERY_KEY] });
        },
         onError: (error) => {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: error.message });
        }
    });

    return {
        comments,
        isLoading,
        isError,
        error,
        saveComment: saveCommentMutation.mutateAsync,
        deleteComment: deleteCommentMutation.mutateAsync,
    };
};