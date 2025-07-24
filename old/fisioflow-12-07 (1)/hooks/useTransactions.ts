


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { Transaction } from '../types';
import { useNotification } from './useNotification';
import { useAuth } from './useAuth';

const TRANSACTIONS_QUERY_KEY = 'transactions';

export const useTransactions = () => {
    const queryClient = useQueryClient();
    const { addNotification } = useNotification();
    const { user } = useAuth();

    const { data: transactions, isLoading, isError, error } = useQuery<Transaction[], Error>({
        queryKey: [TRANSACTIONS_QUERY_KEY],
        queryFn: api.getTransactions,
    });

    const saveTransactionMutation = useMutation<Transaction, Error, Transaction>({
        mutationFn: (transaction) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.saveTransaction(transaction, user.id)
        },
        onSuccess: (savedTransaction) => {
            queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] });
            addNotification({ type: 'success', title: 'Transação Salva', message: `A transação "${savedTransaction.description}" foi salva.` });
        },
    });

    const deleteTransactionMutation = useMutation<any, Error, string>({
        mutationFn: (transactionId) => {
            if (!user) throw new Error("Usuário não autenticado.");
            return api.deleteTransaction(transactionId, user.id);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_QUERY_KEY] });
            addNotification({ type: 'info', title: 'Transação Excluída', message: 'A transação foi excluída.' });
        },
    });

    return {
        transactions,
        isLoading,
        isError,
        error,
        saveTransaction: saveTransactionMutation.mutateAsync,
        deleteTransaction: deleteTransactionMutation.mutateAsync,
    };
};
