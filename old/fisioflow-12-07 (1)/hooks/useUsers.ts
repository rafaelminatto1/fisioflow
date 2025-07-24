

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { User } from '../types';
import { useNotification } from './useNotification';
import { useAuth } from './useAuth';

const USERS_QUERY_KEY = 'users';

export const useUsers = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();
    const { user: currentUser } = useAuth(); 

    const { data: users, isLoading, isError, error } = useQuery<User[], Error>({
        queryKey: [USERS_QUERY_KEY],
        queryFn: api.getUsers,
    });

    const saveUserMutation = useMutation<User, Error, User>({
        mutationFn: (userToSave) => {
            if (!currentUser) throw new Error("Usuário não autenticado.");
            return api.saveUser(userToSave, currentUser.id);
        },
        onSuccess: (savedUser) => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });

    const deleteUserMutation = useMutation<any, Error, { userIdToDelete: string, currentUserId: string }>({
        mutationFn: ({ userIdToDelete, currentUserId }) => {
            if (currentUserId === userIdToDelete) {
                throw new Error("Você não pode excluir a si mesmo.");
            }
            return api.deleteUser(userIdToDelete, currentUserId);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [USERS_QUERY_KEY] });
        },
    });

    const toggleFavoriteExerciseMutation = useMutation<User, Error, { userId: string; exerciseId: string }>({
        mutationFn: ({ userId, exerciseId }) => api.toggleFavoriteExercise(userId, exerciseId),
        onSuccess: (updatedUser) => {
            queryClient.setQueryData<User[]>([USERS_QUERY_KEY], (oldData) =>
                oldData?.map(u => u.id === updatedUser.id ? updatedUser : u) || []
            );
        },
        onError: (error) => {
            addNotification({type: 'error', title: 'Erro ao Favoritar', message: error.message });
        }
    });

    return {
        users,
        isLoading,
        isError,
        error,
        saveUser: saveUserMutation.mutateAsync,
        deleteUser: deleteUserMutation.mutateAsync,
        toggleFavoriteExercise: toggleFavoriteExerciseMutation.mutateAsync,
        isSaving: saveUserMutation.isPending,
    };
};
