import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { ExerciseImage } from '../types';
import { useNotification } from './useNotification';

const IMAGES_QUERY_KEY = 'exerciseImages';

export const useExerciseImages = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: images, isLoading, isError, error } = useQuery<ExerciseImage[], Error>({
        queryKey: [IMAGES_QUERY_KEY],
        queryFn: api.getExerciseImages,
    });
    
    const saveImageMutation = useMutation<ExerciseImage, Error, Partial<ExerciseImage>>({
        mutationFn: (image) => api.saveExerciseImage(image as ExerciseImage),
        onSuccess: (savedImage) => {
            queryClient.invalidateQueries({ queryKey: [IMAGES_QUERY_KEY] });
            // This notification can be too noisy, so it's commented out.
            // addNotification({ type: 'success', title: 'Imagem Salva', message: 'A imagem do exercício foi salva.' });
        },
        onError: (err) => {
             addNotification({ type: 'error', title: 'Erro ao Salvar Imagem', message: err.message });
        }
    });
    
    const deleteImageMutation = useMutation<{success: boolean}, Error, string>({
        mutationFn: api.deleteExerciseImage,
        onSuccess: () => {
             queryClient.invalidateQueries({ queryKey: [IMAGES_QUERY_KEY] });
             addNotification({ type: 'info', title: 'Imagem Removida', message: 'A imagem foi removida.' });
        },
        onError: (err) => {
             addNotification({ type: 'error', title: 'Erro ao Remover Imagem', message: err.message });
        }
    });


    return {
        images,
        isLoading,
        isError,
        error,
        saveImage: saveImageMutation.mutateAsync,
        deleteImage: deleteImageMutation.mutateAsync,
    };
};
