
import React, { useState, useEffect } from 'react';
import { Transaction, TransactionModalProps } from '/types.js';
import { usePreventBodyScroll } from '/hooks/usePreventBodyScroll.js';
import { IconTrash } from '/components/icons/IconComponents.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';
import FormField from '/components/ui/FormField.js';

type TransactionErrors = {
  patientId?: string;
  description?: string;
  amount?: string;
  dueDate?: string;
};

const TransactionModal: React.FC<TransactionModalProps> = ({ isOpen, onClose, onSave, onDelete, transaction, patients }) => {
  usePreventBodyScroll(isOpen);
  const [editedTransaction, setEditedTransaction] = useState<Partial<Transaction> | null>(transaction);
  const [errors, setErrors] = useState<TransactionErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedTransaction(transaction);
    setErrors({});
  }, [transaction]);

  const validate = (): boolean => {
    const newErrors: TransactionErrors = {};
    if (!editedTransaction?.patientId) newErrors.patientId = 'Selecione um paciente.';
    if (!editedTransaction?.description?.trim()) newErrors.description = 'A descrição é obrigatória.';
    if (!editedTransaction?.amount || editedTransaction.amount <= 0) newErrors.amount = 'O valor deve ser positivo.';
    if (!editedTransaction?.dueDate) newErrors.dueDate = 'A data de vencimento é obrigatória.';
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const isNumeric = name === 'amount';
    setEditedTransaction(prev => prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null);
    if (errors[name as keyof TransactionErrors]) {
        setErrors(prev => ({...prev, [name]: undefined}));
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
    if (editedTransaction && 'id' in editedTransaction && window.confirm('Tem certeza que deseja excluir esta transação?')) {
      onDelete(editedTransaction.id!);
    }
  };

  const isNew = !transaction || !('id' in transaction);

  if (!isOpen || !editedTransaction) return null;
  
  const footer = (
       <>
          <div>
            {!isNew && (
                <Button variant="ghost" onClick={handleDelete} icon={<IconTrash/>}>
                    Excluir
                </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
                {isSaving ? 'Salvando...' : 'Salvar Transação'}
            </Button>
          </div>
        </>
  );

  return (
    <BaseModal 
        isOpen={isOpen} 
        onClose={onClose} 
        title={isNew ? 'Nova Transação' : 'Editar Transação'}
        footer={footer}
    >
        <FormField
            as="select"
            label="Paciente"
            name="patientId"
            id="patientId"
            value={editedTransaction.patientId || ''}
            onChange={handleChange}
            error={errors.patientId}
        >
            <option value="" disabled>Selecione um paciente...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </FormField>
        <FormField
            label="Descrição"
            name="description"
            id="description"
            value={editedTransaction.description || ''}
            onChange={handleChange}
            error={errors.description}
        />
        <div className="grid grid-cols-2 gap-4">
            <FormField
                label="Valor (R$)"
                name="amount"
                id="amount"
                type="number"
                value={String(editedTransaction.amount || '')}
                onChange={handleChange}
                min="0"
                step="0.01"
                error={errors.amount}
            />
            <FormField
                as="select"
                label="Status"
                name="status"
                id="status"
                value={editedTransaction.status}
                onChange={handleChange}
            >
                <option value="pendente">Pendente</option>
                <option value="pago">Pago</option>
            </FormField>
        </div>
        <FormField
            label="Data de Vencimento"
            name="dueDate"
            id="dueDate"
            type="date"
            value={editedTransaction.dueDate ? new Date(editedTransaction.dueDate).toISOString().split('T')[0] : ''}
            onChange={handleChange}
            error={errors.dueDate}
        />
    </BaseModal>
  );
};

export default TransactionModal;