import React, { useState } from 'react';
import { useData } from '../hooks/useData';
import { useAuth } from '../hooks/useAuth';
import { ClinicalProtocol } from '../types';
import BaseModal from './ui/BaseModal';
import { Button } from './ui/Button';
import FormField from './ui/FormField';
import { IconSave, IconPlus, IconX } from './icons/IconComponents';

interface NewProtocolModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const NewProtocolModal: React.FC<NewProtocolModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { saveClinicalProtocol } = useData();
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    specialty: 'Ortopedia',
    category: 'Conservador',
    indication: '',
    expectedDuration: '',
    inclusionCriteria: [''],
    exclusionCriteria: [''],
    expectedOutcomes: [''],
    contraindications: [''],
    precautions: [''],
    version: '1.0',
  });

  const specialties = [
    'Ortopedia',
    'Neurologia',
    'Cardio',
    'Respiratoria',
    'Pediatria',
    'Geriatria',
    'Esportiva',
    'Geral',
  ];
  const categories = [
    'Pós-Cirúrgico',
    'Conservador',
    'Preventivo',
    'Manutenção',
  ];

  const handleArrayFieldChange = (
    field: keyof typeof formData,
    index: number,
    value: string
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).map((item, i) =>
        i === index ? value : item
      ),
    }));
  };

  const addArrayField = (field: keyof typeof formData) => {
    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] as string[]), ''],
    }));
  };

  const removeArrayField = (field: keyof typeof formData, index: number) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] as string[]).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = () => {
    if (!user || !formData.name.trim() || !formData.description.trim()) return;

    const newProtocol: ClinicalProtocol = {
      id: `protocol-${crypto.randomUUID()}`,
      name: formData.name.trim(),
      description: formData.description.trim(),
      specialty: formData.specialty as any,
      category: formData.category as any,
      indication: formData.indication.trim(),
      inclusionCriteria: formData.inclusionCriteria.filter((c) => c.trim()),
      exclusionCriteria: formData.exclusionCriteria.filter((c) => c.trim()),
      expectedDuration: formData.expectedDuration.trim(),
      phases: [], // Will be added separately
      evidences: [], // Will be added separately
      expectedOutcomes: formData.expectedOutcomes.filter((o) => o.trim()),
      contraindications: formData.contraindications.filter((c) => c.trim()),
      precautions: formData.precautions.filter((p) => p.trim()),
      createdById: user.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      version: formData.version,
      tenantId: user.tenantId!,
    };

    saveClinicalProtocol(newProtocol);
    handleClose();
  };

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      specialty: 'Ortopedia',
      category: 'Conservador',
      indication: '',
      expectedDuration: '',
      inclusionCriteria: [''],
      exclusionCriteria: [''],
      expectedOutcomes: [''],
      contraindications: [''],
      precautions: [''],
      version: '1.0',
    });
    onClose();
  };

  const ArrayFieldSection: React.FC<{
    title: string;
    field: keyof typeof formData;
    placeholder: string;
  }> = ({ title, field, placeholder }) => (
    <div>
      <div className="mb-2 flex items-center justify-between">
        <label className="block text-sm font-medium text-slate-300">
          {title}
        </label>
        <Button
          variant="secondary"
          onClick={() => addArrayField(field)}
          className="flex items-center space-x-1"
        >
          <IconPlus className="h-3 w-3" />
          <span>Adicionar</span>
        </Button>
      </div>
      <div className="space-y-2">
        {(formData[field] as string[]).map((item, index) => (
          <div key={index} className="flex space-x-2">
            <input
              type="text"
              value={item}
              onChange={(e) =>
                handleArrayFieldChange(field, index, e.target.value)
              }
              placeholder={placeholder}
              className="flex-1 rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50 placeholder-slate-400"
            />
            {(formData[field] as string[]).length > 1 && (
              <Button
                variant="secondary"
                onClick={() => removeArrayField(field, index)}
                className="flex items-center"
              >
                <IconX className="h-3 w-3" />
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      title="Criar Novo Protocolo Clínico"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField
            label="Nome do Protocolo *"
            value={formData.name}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Ex: Reabilitação de LCA Pós-Cirúrgica"
          />
          <FormField
            label="Versão"
            value={formData.version}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, version: e.target.value }))
            }
            placeholder="1.0"
          />
        </div>

        <FormField
          label="Descrição *"
          value={formData.description}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, description: e.target.value }))
          }
          placeholder="Descrição detalhada do protocolo..."
          isTextArea
          rows={3}
        />

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Especialidade *
            </label>
            <select
              value={formData.specialty}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, specialty: e.target.value }))
              }
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
            >
              {specialties.map((specialty) => (
                <option key={specialty} value={specialty}>
                  {specialty}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Categoria *
            </label>
            <select
              value={formData.category}
              onChange={(e) =>
                setFormData((prev) => ({ ...prev, category: e.target.value }))
              }
              className="w-full rounded-md border border-slate-600 bg-slate-700 px-3 py-2 text-slate-50"
            >
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <FormField
            label="Duração Esperada"
            value={formData.expectedDuration}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                expectedDuration: e.target.value,
              }))
            }
            placeholder="Ex: 12 semanas"
          />
        </div>

        <FormField
          label="Indicação"
          value={formData.indication}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, indication: e.target.value }))
          }
          placeholder="Principais indicações para este protocolo..."
          isTextArea
          rows={3}
        />

        {/* Criteria Sections */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ArrayFieldSection
            title="Critérios de Inclusão"
            field="inclusionCriteria"
            placeholder="Ex: Pacientes com diagnóstico confirmado de..."
          />
          <ArrayFieldSection
            title="Critérios de Exclusão"
            field="exclusionCriteria"
            placeholder="Ex: Presença de comorbidades cardiovasculares..."
          />
        </div>

        <ArrayFieldSection
          title="Resultados Esperados"
          field="expectedOutcomes"
          placeholder="Ex: Melhora da amplitude de movimento..."
        />

        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <ArrayFieldSection
            title="Contraindicações"
            field="contraindications"
            placeholder="Ex: Infecção ativa no local..."
          />
          <ArrayFieldSection
            title="Precauções"
            field="precautions"
            placeholder="Ex: Monitorar sinais vitais durante..."
          />
        </div>

        {/* Information Note */}
        <div className="rounded-lg border border-blue-600/20 bg-blue-900/20 p-4">
          <p className="text-sm text-blue-400">
            <strong>Nota:</strong> Após criar o protocolo básico, você poderá
            adicionar as fases detalhadas, exercícios específicos e evidências
            científicas na página de visualização do protocolo.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end space-x-3 border-t border-slate-700 pt-6">
          <Button variant="secondary" onClick={handleClose}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!formData.name.trim() || !formData.description.trim()}
            className="flex items-center space-x-2"
          >
            <IconSave className="h-4 w-4" />
            <span>Criar Protocolo</span>
          </Button>
        </div>
      </div>
    </BaseModal>
  );
};

export default NewProtocolModal;
