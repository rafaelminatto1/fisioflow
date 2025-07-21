import React, { useState, useEffect } from 'react';
import { Transaction, TransactionModalProps } from '../types';
import { IconX, IconTrash } from './icons/IconComponents';

type TransactionErrors = {
  patientId?: string;
  description?: string;
  amount?: string;
  dueDate?: string;
};

const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  transaction,
  patients,
}) => {
  const [editedTransaction, setEditedTransaction] =
    useState<Partial<Transaction> | null>(transaction);
  const [errors, setErrors] = useState<TransactionErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTransaction(transaction);
    setErrors({});
  }, [transaction]);

  const validate = (): boolean => {
    const newErrors: TransactionErrors = {};
    if (!editedTransaction?.patientId)
      newErrors.patientId = 'Selecione um paciente.';
    if (!editedTransaction?.description?.trim())
      newErrors.description = 'A descrição é obrigatória.';
    if (!editedTransaction?.amount || editedTransaction.amount <= 0)
      newErrors.amount = 'O valor deve ser positivo.';
    if (!editedTransaction?.dueDate)
      newErrors.dueDate = 'A data de vencimento é obrigatória.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >
  ) => {
    const { name, value } = e.target;
    const isNumeric = name === 'amount';
    setEditedTransaction((prev) =>
      prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null
    );
    if (errors[name as keyof TransactionErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSave = () => {
    if (!validate() || !editedTransaction) return;

    setIsSaving(true);
    setTimeout(() => {
      onSave(editedTransaction as Transaction);
      setIsSaving(false);
    }, 300);
  };

  const handleDelete = () => {
    if (
      editedTransaction &&
      'id' in editedTransaction &&
      window.confirm('Tem certeza que deseja excluir esta transação?')
    ) {
      onDelete(editedTransaction.id!);
    }
  };

  const isNew = !transaction || !('id' in transaction);

  if (!isOpen || !editedTransaction) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
        <header className="flex items-center justify-between border-b border-slate-700 p-4">
          <h2 className="text-lg font-semibold text-slate-100">
            {isNew ? 'Nova Transação' : 'Editar Transação'}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
            aria-label="Fechar modal"
          >
            <IconX size={20} />
          </button>
        </header>

        <main className="space-y-4 overflow-y-auto p-6">
          <div className="space-y-2">
            <label
              htmlFor="patientId"
              className="text-sm font-medium text-slate-300"
            >
              Paciente
            </label>
            <select
              name="patientId"
              id="patientId"
              value={editedTransaction.patientId || ''}
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.patientId ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            >
              <option value="" disabled>
                Selecione um paciente...
              </option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {errors.patientId && (
              <p className="mt-1 text-xs text-red-400">{errors.patientId}</p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="description"
              className="text-sm font-medium text-slate-300"
            >
              Descrição
            </label>
            <input
              type="text"
              id="description"
              name="description"
              value={editedTransaction.description || ''}
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.description ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.description && (
              <p className="mt-1 text-xs text-red-400">{errors.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label
                htmlFor="amount"
                className="text-sm font-medium text-slate-300"
              >
                Valor (R$)
              </label>
              <input
                type="number"
                id="amount"
                name="amount"
                value={editedTransaction.amount || ''}
                onChange={handleChange}
                min="0"
                step="0.01"
                className={`w-full border bg-slate-900 ${errors.amount ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
              />
              {errors.amount && (
                <p className="mt-1 text-xs text-red-400">{errors.amount}</p>
              )}
            </div>
            <div className="space-y-2">
              <label
                htmlFor="status"
                className="text-sm font-medium text-slate-300"
              >
                Status
              </label>
              <select
                name="status"
                id="status"
                value={editedTransaction.status}
                onChange={handleChange}
                className="w-full rounded-md border border-slate-600 bg-slate-900 px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label
              htmlFor="dueDate"
              className="text-sm font-medium text-slate-300"
            >
              Data de Vencimento
            </label>
            <input
              type="date"
              id="dueDate"
              name="dueDate"
              value={
                editedTransaction.dueDate
                  ? new Date(editedTransaction.dueDate)
                      .toISOString()
                      .split('T')[0]
                  : ''
              }
              onChange={handleChange}
              className={`w-full border bg-slate-900 ${errors.dueDate ? 'border-red-500' : 'border-slate-600'} rounded-md px-3 py-2 text-slate-100 outline-none focus:ring-2 focus:ring-blue-500`}
            />
            {errors.dueDate && (
              <p className="mt-1 text-xs text-red-400">{errors.dueDate}</p>
            )}
          </div>
        </main>

        <footer className="flex items-center justify-between border-t border-slate-700 bg-slate-800 p-4">
          <div>
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center rounded-md px-3 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 hover:text-red-300"
              >
                <IconTrash className="mr-2" /> Excluir
              </button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="rounded-md bg-slate-700 px-4 py-2 text-slate-300 hover:bg-slate-600"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="rounded-md bg-blue-600 px-4 py-2 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-blue-800"
            >
              {isSaving ? 'Salvando...' : 'Salvar Transação'}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default TransactionModal;
