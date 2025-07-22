/**
 * PatientMedicalInfo - Componente para informações médicas do paciente
 * Extraído do PatientModal.tsx para melhor organização
 */

import React from 'react';
import FormField from '../ui/FormField';
import { Patient } from '../../types';

interface PatientMedicalInfoProps {
  formData: Partial<Patient>;
  onChange: (field: keyof Patient, value: any) => void;
  errors: Record<string, string>;
}

const PatientMedicalInfo: React.FC<PatientMedicalInfoProps> = ({
  formData,
  onChange,
  errors,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">Informações Médicas</h3>
      
      <FormField
        name="medicalHistory"
        label="Histórico Médico"
        as="textarea"
        rows={4}
        value={formData.medicalHistory || ''}
        onChange={(e) => onChange('medicalHistory', e.target.value)}
        placeholder="Descreva o histórico médico relevante do paciente..."
        error={errors.medicalHistory}
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          name="emergencyContact"
          label="Contato de Emergência"
          value={formData.emergencyContact || ''}
          onChange={(e) => onChange('emergencyContact', e.target.value)}
          placeholder="Nome e telefone"
          error={errors.emergencyContact}
        />

        <FormField
          name="insurance"
          label="Plano de Saúde"
          value={formData.insurance || ''}
          onChange={(e) => onChange('insurance', e.target.value)}
          placeholder="Nome do plano de saúde"
          error={errors.insurance}
        />

        <FormField
          name="allergies"
          label="Alergias"
          value={formData.allergies || ''}
          onChange={(e) => onChange('allergies', e.target.value)}
          placeholder="Liste alergias conhecidas"
          error={errors.allergies}
        />

        <FormField
          name="medications"
          label="Medicamentos em Uso"
          value={formData.medications || ''}
          onChange={(e) => onChange('medications', e.target.value)}
          placeholder="Liste medicamentos atuais"
          error={errors.medications}
        />
      </div>

      <FormField
        name="referringPhysician"
        label="Médico Encaminhante"
        value={formData.referringPhysician || ''}
        onChange={(e) => onChange('referringPhysician', e.target.value)}
        placeholder="Nome do médico que encaminhou o paciente"
        error={errors.referringPhysician}
      />

      <FormField
        name="diagnosis"
        label="Diagnóstico"
        as="textarea"
        rows={3}
        value={formData.diagnosis || ''}
        onChange={(e) => onChange('diagnosis', e.target.value)}
        placeholder="Diagnóstico médico principal..."
        error={errors.diagnosis}
      />
    </div>
  );
};

export default React.memo(PatientMedicalInfo);