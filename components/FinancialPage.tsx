import React, { useState, useMemo, useEffect } from 'react';

import { useAuth } from '../hooks/useAuth';
import { useData } from '../hooks/useData';
import { Transaction, Patient } from '../types';

import FinancialSummaryDashboard from './FinancialSummaryDashboard';
import {
  IconDollarSign,
  IconClock,
  IconAlertTriangle,
  IconPlus,
  IconCheckCircle,
  IconPencil,
  IconTrash,
  IconChevronRight,
} from './icons/IconComponents';
import MetricCard from './MetricCard';
import TransactionModal from './TransactionModal';
import { Button } from './ui/Button';
import PageLoader from './ui/PageLoader';
import PageShell from './ui/PageShell';

const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const PatientFinancialSummary: React.FC<{
  patient: Patient;
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transactionId: string) => void;
  onMarkAsPaid: (transaction: Transaction) => void;
  isDetailedView: boolean;
}> = ({
  patient,
  transactions,
  onEdit,
  onDelete,
  onMarkAsPaid,
  isDetailedView,
}) => {
  const summary = useMemo(() => {
    const paid = transactions
      .filter((t) => t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);
    const pending = transactions
      .filter((t) => t.status === 'pendente')
      .reduce((sum, t) => sum + t.amount, 0);
    return { paid, pending };
  }, [transactions]);

  return (
    <details
      className="group overflow-hidden rounded-lg border border-slate-700 bg-slate-800"
      open={isDetailedView}
    >
      <summary className="flex cursor-pointer items-center justify-between p-4 transition-colors hover:bg-slate-700/50">
        <div className="flex items-center gap-3">
          <img
            src={patient.avatarUrl}
            alt={patient.name}
            className="h-10 w-10 rounded-full"
          />
          <div>
            <p className="font-semibold text-slate-100">{patient.name}</p>
            <p className="text-sm text-slate-400">
              {transactions.length} transaçõe(s)
            </p>
          </div>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div className="text-right">
            <p className="text-slate-400">Pendente</p>
            <p
              className={`font-bold ${summary.pending > 0 ? 'text-amber-400' : 'text-slate-200'}`}
            >
              {formatCurrency(summary.pending)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">Pago</p>
            <p className="font-bold text-emerald-400">
              {formatCurrency(summary.paid)}
            </p>
          </div>
          <IconChevronRight className="h-5 w-5 text-slate-400 transition-transform group-open:rotate-90" />
        </div>
      </summary>
      {isDetailedView && (
        <div className="bg-slate-900/50">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-300">
              <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
                <tr>
                  <th scope="col" className="px-6 py-2">
                    Descrição
                  </th>
                  <th scope="col" className="px-6 py-2">
                    Vencimento
                  </th>
                  <th scope="col" className="px-6 py-2 text-center">
                    Status
                  </th>
                  <th scope="col" className="px-6 py-2 text-right">
                    Valor
                  </th>
                  <th scope="col" className="px-6 py-2 text-center">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {transactions.map((transaction) => {
                  const isOverdue =
                    transaction.status === 'pendente' &&
                    new Date(transaction.dueDate) < new Date();
                  return (
                    <tr
                      key={transaction.id}
                      className="group/row hover:bg-slate-700/50"
                    >
                      <td className="px-6 py-3">{transaction.description}</td>
                      <td className="px-6 py-3">
                        {new Date(transaction.dueDate).toLocaleDateString(
                          'pt-BR'
                        )}
                      </td>
                      <td className="px-6 py-3 text-center">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-semibold capitalize ${
                            transaction.status === 'pago'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isOverdue
                                ? 'bg-red-500/20 text-red-300'
                                : 'bg-amber-500/20 text-amber-300'
                          }`}
                        >
                          {isOverdue ? 'Atrasado' : transaction.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-right font-semibold">
                        {formatCurrency(transaction.amount)}
                      </td>
                      <td className="px-6 py-3">
                        <div className="flex items-center justify-center gap-1 opacity-0 transition-opacity group-hover/row:opacity-100">
                          {transaction.status === 'pendente' && (
                            <button
                              onClick={() => onMarkAsPaid(transaction)}
                              className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-emerald-400"
                              title="Marcar como Pago"
                            >
                              <IconCheckCircle size={18} />
                            </button>
                          )}
                          <button
                            onClick={() => onEdit(transaction)}
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-amber-400"
                            title="Editar"
                          >
                            <IconPencil size={18} />
                          </button>
                          <button
                            onClick={() => onDelete(transaction.id)}
                            className="rounded-md p-2 text-slate-400 hover:bg-slate-700 hover:text-red-400"
                            title="Excluir"
                          >
                            <IconTrash size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </details>
  );
};

const FinancialPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuth();
  const { transactions, patients, saveTransaction, deleteTransaction } =
    useData();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<
    Transaction | Partial<Transaction> | null
  >(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'simplified' | 'detailed'>(
    'simplified'
  );

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  const financialMetrics = useMemo(() => {
    const totalPaid = transactions
      .filter((t) => t.status === 'pago')
      .reduce((sum, t) => sum + t.amount, 0);
    const now = new Date();
    const pending = transactions
      .filter((t) => t.status === 'pendente' && new Date(t.dueDate) >= now)
      .reduce((sum, t) => sum + t.amount, 0);
    const overdue = transactions
      .filter((t) => t.status === 'pendente' && new Date(t.dueDate) < now)
      .reduce((sum, t) => sum + t.amount, 0);
    return { totalPaid, pending, overdue };
  }, [transactions]);

  const transactionsByPatient = useMemo(() => {
    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const patientMap = new Map<
      string,
      { patient: Patient; transactions: Transaction[] }
    >();

    transactions.forEach((transaction) => {
      const patient = patients.find((p) => p.id === transaction.patientId);
      if (!patient) return;

      if (!patientMap.has(patient.id)) {
        patientMap.set(patient.id, { patient, transactions: [] });
      }
      patientMap.get(patient.id)!.transactions.push(transaction);
    });

    const filteredAndSorted = Array.from(patientMap.values()).filter(
      ({ patient, transactions }) =>
        patient.name.toLowerCase().includes(lowercasedSearchTerm) ||
        transactions.some((t) =>
          t.description.toLowerCase().includes(lowercasedSearchTerm)
        )
    );

    filteredAndSorted.forEach((group) => {
      group.transactions.sort(
        (a, b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime()
      );
    });

    return filteredAndSorted.sort((a, b) =>
      a.patient.name.localeCompare(b.patient.name)
    );
  }, [transactions, patients, searchTerm]);

  const handleOpenModal = (
    transaction: Transaction | Partial<Transaction> | null
  ) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleOpenNewModal = () => {
    handleOpenModal({
      patientId: '',
      description: '',
      amount: 0,
      status: 'pendente',
      dueDate: new Date().toISOString().split('T')[0],
    });
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  };

  const handleSaveTransaction = (transactionToSave: Transaction) => {
    if (!user) return;
    saveTransaction(transactionToSave, user);
    handleCloseModal();
  };

  const handleDeleteTransaction = (transactionId: string) => {
    if (!user) return;
    deleteTransaction(transactionId, user);
    handleCloseModal();
  };

  const handleMarkAsPaid = (transaction: Transaction) => {
    if (transaction.status === 'pendente' && user) {
      saveTransaction(
        { ...transaction, status: 'pago', paidDate: new Date().toISOString() },
        user
      );
    }
  };

  if (isLoading) {
    return <PageLoader message="Carregando dados financeiros..." />;
  }

  return (
    <PageShell
      title="Visão Geral Financeira"
      action={
        <Button onClick={handleOpenNewModal} icon={<IconPlus />}>
          Nova Transação
        </Button>
      }
    >
      <FinancialSummaryDashboard
        totalPaid={financialMetrics.totalPaid}
        pending={financialMetrics.pending}
        overdue={financialMetrics.overdue}
      />

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <input
            type="text"
            placeholder="Buscar por paciente ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
          />
          <div className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800 p-1">
            <button
              onClick={() => setViewMode('simplified')}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                viewMode === 'simplified'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Simplificada
            </button>
            <button
              onClick={() => setViewMode('detailed')}
              className={`rounded-md px-3 py-1 text-sm font-semibold transition-colors ${
                viewMode === 'detailed'
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-300 hover:bg-slate-700'
              }`}
            >
              Detalhada
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {transactionsByPatient.map(({ patient, transactions }) => (
            <PatientFinancialSummary
              key={patient.id}
              patient={patient}
              transactions={transactions}
              onEdit={handleOpenModal}
              onDelete={handleDeleteTransaction}
              onMarkAsPaid={handleMarkAsPaid}
              isDetailedView={viewMode === 'detailed'}
            />
          ))}

          {transactionsByPatient.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 py-16 text-center text-slate-400">
              <p className="font-semibold">Nenhuma transação encontrada</p>
              <p className="text-sm">
                Tente ajustar sua busca ou adicione uma nova transação.
              </p>
            </div>
          )}
        </div>
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
    </PageShell>
  );
};

export default FinancialPage;
