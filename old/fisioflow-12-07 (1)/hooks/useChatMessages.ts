import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { ChatMessage } from '../types';

const CHAT_MESSAGES_QUERY_KEY = 'chatMessages';

export const useChatMessages = () => {
    const queryClient = useQueryClient();

    const { data: messages, isLoading, isError, error } = useQuery<ChatMessage[], Error>({
        queryKey: [CHAT_MESSAGES_QUERY_KEY],
        queryFn: api.getChatMessages,
        refetchInterval: 2000, // Refetch every 2 seconds to simulate real-time chat
    });

    const sendMessageMutation = useMutation<ChatMessage, Error, Partial<ChatMessage>>({
        mutationFn: (msg) => api.sendMessage(msg as Omit<ChatMessage, 'id' | 'timestamp'>),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [CHAT_MESSAGES_QUERY_KEY] });
        },
    });

    return {
        messages,
        isLoading,
        isError,
        error,
        sendMessage: sendMessageMutation.mutateAsync,
    };
};
