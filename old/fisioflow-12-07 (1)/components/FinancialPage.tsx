
import React, { useState, useMemo } from 'react';
import { Transaction, Patient, Task, AutomationTriggerType, AutomationActionType } from '/types.js';
import { IconDollarSign, IconClock, IconAlertTriangle, IconPlus, IconCheckCircle, IconPencil, IconTrash, IconZap } from '/components/icons/IconComponents.js';
import MetricCard from '/components/MetricCard.js';
import TransactionModal from '/components/TransactionModal.js';
import EmptyState from '/components/ui/EmptyState.js';
import { useTransactions } from '/hooks/useTransactions.js';
import { usePatients } from '/hooks/usePatients.js';
import { useNotification } from '/hooks/useNotification.js';
import Skeleton from '/components/ui/Skeleton.js';
import Button from '/components/ui/Button.js';
import { useAutomations } from '/hooks/useAutomations.js';
import { useTasks } from '/hooks/useTasks.js';

const FinancialPage: React.FC = () => {
    const { transactions = [], saveTransaction, deleteTransaction, isLoading, isError } = useTransactions();
    const { patients = [] } = usePatients();
    const { addNotification } = useNotification();
    const { automations } = useAutomations();
    const { saveTask } = useTasks();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTransaction, setSelectedTransaction] = useState<Transaction | Partial<Transaction> | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [isCheckingAutomations, setIsCheckingAutomations] = useState(false);

    const financialMetrics = useMemo(() => {
        const totalPaid = transactions.filter(t => t.status === 'pago').reduce((sum, t) => sum + t.amount, 0);
        const now = new Date();
        const pending = transactions.filter(t => t.status === 'pendente' && new Date(t.dueDate) >= now).reduce((sum, t) => sum + t.amount, 0);
        const overdue = transactions.filter(t => t.status === 'pendente' && new Date(t.dueDate) < now).reduce((sum, t) => sum + t.amount, 0);
        return { totalPaid, pending, overdue };
    }, [transactions]);
    
    const filteredTransactions = useMemo(() => {
        const lowercasedSearchTerm = searchTerm.toLowerCase();
        return transactions.filter(transaction => {
            const patient = patients.find(p => p.id === transaction.patientId);
            const patientName = patient ? patient.name.toLowerCase() : '';
            const description = transaction.description.toLowerCase();
            return patientName.includes(lowercasedSearchTerm) || description.includes(lowercasedSearchTerm);
        }).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());
    }, [transactions, patients, searchTerm]);

    const handleOpenModal = (transaction: Transaction | Partial<Transaction> | null) => {
        setSelectedTransaction(transaction);
        setIsModalOpen(true);
    };

    const handleOpenNewModal = () => {
        handleOpenModal({
            patientId: '',
            description: '',
            amount: 0,
            status: 'pendente',
            dueDate: new Date().toISOString().split('T')[0]
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedTransaction(null);
    };
    
    const handleSaveTransaction = async (transactionToSave: Transaction) => {
        try {
            await saveTransaction(transactionToSave);
            handleCloseModal();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Salvar', message: (error as Error).message });
        }
    };

    const handleDeleteTransaction = async (transactionId: string) => {
        try {
            await deleteTransaction(transactionId);
            handleCloseModal();
        } catch (error) {
            addNotification({ type: 'error', title: 'Erro ao Excluir', message: (error as Error).message });
        }
    };
    
    const handleMarkAsPaid = async (transaction: Transaction) => {
        if(transaction.status === 'pendente') {
            await handleSaveTransaction({ ...transaction, status: 'pago', paidDate: new Date().toISOString() });
        }
    };

    const handleRunOverdueAutomations = async () => {
        if (!automations) {
            addNotification({ type: 'error', title: 'Erro', message: 'Regras de automação não carregadas.' });
            return;
        }
        setIsCheckingAutomations(true);
        const now = new Date();
        const overdueAutomations = automations.filter(a => a.trigger.type === AutomationTriggerType.PAYMENT_OVERDUE);
        const pendingTransactions = transactions.filter(t => t.status === 'pendente' && new Date(t.dueDate) < now);
        let actionsTaken = 0;

        for (const t of pendingTransactions) {
            const daysOverdue = Math.floor((now.getTime() - new Date(t.dueDate).getTime()) / (1000 * 3600 * 24));
            for (const auto of overdueAutomations) {
                if (daysOverdue >= (auto.trigger.value || 0)) {
                    if (auto.action.type === AutomationActionType.CREATE_TASK) {
                        await saveTask({
                            projectId: 'proj-1',
                            title: auto.action.value,
                            patientId: t.patientId,
                            assigneeId: auto.action.assigneeId,
                            status: 'todo',
                            priority: 'high',
                            description: `Referente à cobrança de R$ ${t.amount.toFixed(2)} (${t.description}) vencida em ${new Date(t.dueDate).toLocaleDateString()}.`
                        } as Task);
                        actionsTaken++;
                        break; 
                    }
                }
            }
        }
        addNotification({ type: 'info', title: 'Verificação Concluída', message: `${actionsTaken} ações de automação para pagamentos atrasados foram executadas.` });
        setIsCheckingAutomations(false);
    };
    
    const formatCurrency = (value: number) => {
        return `R$ ${value.toFixed(2).replace('.', ',')}`;
    };

    const renderContent = () => {
        if (isLoading) {
            return (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                             <tr>
                                {Array.from({length: 6}).map((_, i) => <th key={i} className="px-6 py-3"><Skeleton className="h-4 w-20"/></th>)}
                             </tr>
                        </thead>
                        <tbody>
                            {Array.from({length: 5}).map((_, i) => (
                                <tr key={i}>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-32"/></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-40"/></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-24"/></td>
                                    <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-20 rounded-full mx-auto"/></td>
                                    <td className="px-6 py-4 text-right"><Skeleton className="h-5 w-20 ml-auto"/></td>
                                    <td className="px-6 py-4 text-center"><Skeleton className="h-6 w-24 mx-auto"/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            );
        }

        if (isError) {
            return (
                <div className="p-4">
                    <EmptyState
                        icon={<IconAlertTriangle size={32} />}
                        title="Erro ao Carregar Transações"
                        message="Não foi possível buscar os dados financeiros. Tente novamente mais tarde."
                    />
                </div>
            );
        }

        if (filteredTransactions.length === 0) {
            return (
                <div className="p-4">
                    <EmptyState 
                        icon={<IconDollarSign size={32}/>}
                        title="Nenhuma Transação Encontrada"
                        message="Não foram encontradas transações para a sua busca ou nenhuma foi criada ainda."
                    />
                </div>
            );
        }

        return (
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Paciente</th>
                            <th scope="col" className="px-6 py-3">Descrição</th>
                            <th scope="col" className="px-6 py-3">Vencimento</th>
                            <th scope="col" className="px-6 py-3 text-center">Status</th>
                            <th scope="col" className="px-6 py-3 text-right">Valor</th>
                            <th scope="col" className="px-6 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {filteredTransactions.map(transaction => {
                            const patient = patients.find(p => p.id === transaction.patientId);
                            const isOverdue = transaction.status === 'pendente' && new Date(transaction.dueDate) < new Date();
                            return (
                                <tr key={transaction.id} className="hover:bg-slate-700/50">
                                    <td className="px-6 py-4 font-medium text-slate-100">{patient?.name || 'N/A'}</td>
                                    <td className="px-6 py-4">{transaction.description}</td>
                                    <td className="px-6 py-4">{new Date(transaction.dueDate).toLocaleDateString('pt-BR')}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${
                                            transaction.status === 'pago' ? 'bg-emerald-500/20 text-emerald-300' :
                                            isOverdue ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'
                                        }`}>
                                            {isOverdue ? 'Atrasado' : transaction.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-mono">{formatCurrency(transaction.amount)}</td>
                                    <td className="px-6 py-4 text-center">
                                        <div className="flex items-center justify-center gap-2">
                                            {transaction.status === 'pendente' && (
                                                <button onClick={() => handleMarkAsPaid(transaction)} className="p-2 text-slate-400 hover:text-emerald-400 rounded-md hover:bg-slate-700 transition-colors" title="Marcar como Pago"><IconCheckCircle size={18} /></button>
                                            )}
                                            <button onClick={() => handleOpenModal(transaction)} className="p-2 text-slate-400 hover:text-amber-400 rounded-md hover:bg-slate-700 transition-colors" title="Editar"><IconPencil size={18} /></button>
                                            <button onClick={() => handleDeleteTransaction(transaction.id)} className="p-2 text-slate-400 hover:text-red-400 rounded-md hover:bg-slate-700 transition-colors" title="Excluir"><IconTrash size={18} /></button>
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Visão Geral Financeira</h1>
                <div className="flex items-center gap-2">
                     <Button 
                        variant="secondary" 
                        onClick={handleRunOverdueAutomations}
                        isLoading={isCheckingAutomations}
                        icon={<IconZap />}
                    >
                        Verificar Atrasos
                    </Button>
                    <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
                        Nova Transação
                    </Button>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <MetricCard icon={<IconDollarSign size={24}/>} title="Receita Total (Pago)" value={formatCurrency(financialMetrics.totalPaid)} change="Período completo" />
                <MetricCard icon={<IconClock />} title="Pendente" value={formatCurrency(financialMetrics.pending)} change="Aguardando pagamento" />
                <MetricCard icon={<IconAlertTriangle />} title="Atrasado" value={formatCurrency(financialMetrics.overdue)} change="Pagamentos vencidos" />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-lg">
                 <div className="p-4">
                    <input
                        type="text"
                        placeholder="Buscar por paciente ou descrição..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full max-w-sm bg-slate-900 border border-slate-600 rounded-md px-4 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none transition"
                    />
                </div>
                {renderContent()}
            </div>
            
            {isModalOpen && (
                <TransactionModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveTransaction}
                    onDelete={handleDeleteTransaction}
                    transaction={selectedTransaction}
                    patients={patients}
                />
            )}
        </div>
    );
};

export default FinancialPage;