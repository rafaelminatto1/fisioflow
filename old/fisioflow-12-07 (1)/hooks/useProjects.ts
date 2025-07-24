import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Project } from '../types';
import { useNotification } from './useNotification';

const PROJECTS_QUERY_KEY = 'projects';

export const useProjects = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();

    const { data: projects, isLoading, isError, error } = useQuery<Project[], Error>({
        queryKey: [PROJECTS_QUERY_KEY],
        queryFn: api.getProjects,
    });

    const saveProjectMutation = useMutation<Project, Error, Project>({
        mutationFn: (project) => api.saveProject(project),
        onSuccess: (savedProject) => {
            queryClient.invalidateQueries({ queryKey: [PROJECTS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Projeto Salvo', message: `O projeto "${savedProject.name}" foi salvo.` });
        },
        onError: (err) => {
             addNotification({ type: 'error', title: 'Erro ao Salvar Projeto', message: err.message });
        }
    });

    // Placeholder for deletion
    const deleteProject = async (projectId: string) => {
        addNotification({ type: 'info', title: 'Ação não implementada', message: 'A exclusão de projetos será implementada em breve.'});
        return Promise.resolve({success: false});
    };

    return {
        projects,
        isLoading,
        isError,
        error,
        saveProject: saveProjectMutation.mutateAsync,
        deleteProject,
    };
};
