/**
 * PatientModal - Modal otimizado para gerenciamento de pacientes
 * Refatorado de 1323 linhas para componentes menores e especializados
 */

import { Save, X } from 'lucide-react';
import React, { useState, useCallback } from 'react';

import { useNotification } from '../../hooks/useNotification';
import { usePatients } from '../../hooks/usePatients';
import { Patient } from '../../types';
import BaseModal from '../ui/BaseModal';
import { Button } from '../ui/Button';

import PatientBasicInfo from './PatientBasicInfo';
import PatientMedicalInfo from './PatientMedicalInfo';

interface PatientModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient?: Patient | null;
  mode: 'create' | 'edit' | 'view';
}

const PatientModal: React.FC<PatientModalProps> = ({
  isOpen,
  onClose,
  patient,
  mode,
}) => {
  const { addPatient, updatePatient, loading } = usePatients();
  const { addNotification } = useNotification();

  const [activeTab, setActiveTab] = useState<'basic' | 'medical'>('basic');
  const [formData, setFormData] = useState<Partial<Patient>>(
    () => patient || {}
  );
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Atualiza form quando paciente muda
  React.useEffect(() => {
    if (patient) {
      setFormData(patient);
    } else {
      setFormData({});
    }
    setErrors({});
  }, [patient]);

  const handleFieldChange = useCallback(
    (field: keyof Patient, value: any) => {
      setFormData((prev) => ({
        ...prev,
        [field]: value,
      }));

      // Limpa erro do campo quando usuário edita
      if (errors[field]) {
        setErrors((prev) => ({
          ...prev,
          [field]: '',
        }));
      }
    },
    [errors]
  );

  const validateForm = useCallback(() => {
    const newErrors: Record<string, string> = {};

    // Validações obrigatórias
    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }

    if (
      formData.phone &&
      !/^\(\d{2}\)\s?\d{4,5}-?\d{4}$/.test(formData.phone)
    ) {
      newErrors.phone = 'Telefone deve estar no formato (11) 99999-9999';
    }

    if (formData.cpf && !/^\d{3}\.\d{3}\.\d{3}-\d{2}$/.test(formData.cpf)) {
      newErrors.cpf = 'CPF deve estar no formato 000.000.000-00';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData]);

  const handleSave = useCallback(async () => {
    if (!validateForm()) {
      addNotification({
        type: 'error',
        message: 'Corrija os erros antes de continuar',
      });
      return;
    }

    try {
      if (mode === 'create') {
        await addPatient(formData as Omit<Patient, 'id'>);
      } else if (mode === 'edit' && patient?.id) {
        await updatePatient(patient.id, formData);
      }

      onClose();
    } catch (error) {
      addNotification({
        type: 'error',
        message: 'Erro ao salvar paciente',
      });
    }
  }, [
    mode,
    formData,
    patient?.id,
    validateForm,
    addPatient,
    updatePatient,
    onClose,
    addNotification,
  ]);

  const handleClose = useCallback(() => {
    setFormData(patient || {});
    setErrors({});
    setActiveTab('basic');
    onClose();
  }, [patient, onClose]);

  const modalTitle = {
    create: 'Novo Paciente',
    edit: 'Editar Paciente',
    view: 'Visualizar Paciente',
  }[mode];

  const isReadOnly = mode === 'view';
  const canSave = (mode === 'create' || mode === 'edit') && !loading;

  const tabs = [
    { id: 'basic', label: 'Informações Básicas' },
    { id: 'medical', label: 'Informações Médicas' },
  ] as const;

  const renderContent = () => {
    switch (activeTab) {
      case 'basic':
        return (
          <PatientBasicInfo
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />
        );
      case 'medical':
        return (
          <PatientMedicalInfo
            formData={formData}
            onChange={handleFieldChange}
            errors={errors}
          />
        );
      default:
        return null;
    }
  };

  const footer = (
    <div className="flex justify-between">
      <Button variant="secondary" onClick={handleClose} disabled={loading}>
        <X size={16} className="mr-2" />
        Cancelar
      </Button>

      {canSave && (
        <Button
          variant="primary"
          onClick={handleSave}
          disabled={loading}
          isLoading={loading}
        >
          <Save size={16} className="mr-2" />
          {mode === 'create' ? 'Criar Paciente' : 'Salvar Alterações'}
        </Button>
      )}
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title={modalTitle}
      footer={footer}
      size="large"
    >
      <div className="space-y-6">
        {/* Tabs */}
        <div className="border-b border-slate-700">
          <nav className="-mb-px flex space-x-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`border-b-2 px-1 py-2 text-sm font-medium ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="min-h-[400px]">{renderContent()}</div>

        {/* Progress indicator */}
        {mode !== 'view' && (
          <div className="text-center text-xs text-slate-500">
            Aba {tabs.findIndex((t) => t.id === activeTab) + 1} de {tabs.length}
          </div>
        )}
      </div>
    </BaseModal>
  );
};

export default React.memo(PatientModal);
