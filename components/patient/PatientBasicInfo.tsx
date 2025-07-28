/**
 * PatientBasicInfo - Componente para informações básicas do paciente
 * Extraído do PatientModal.tsx (1323 linhas) para melhor manutenibilidade
 */

import React from 'react';

import { Patient } from '../../types';
import FormField from '../ui/FormField';

interface PatientBasicInfoProps {
  formData: Partial<Patient>;
  onChange: (field: keyof Patient, value: any) => void;
  errors: Record<string, string>;
}

const PatientBasicInfo: React.FC<PatientBasicInfoProps> = ({
  formData,
  onChange,
  errors,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-slate-200">Informações Básicas</h3>
      
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <FormField
          name="name"
          label="Nome Completo"
          value={formData.name || ''}
          onChange={(e) => onChange('name', e.target.value)}
          placeholder="Digite o nome completo"
          error={errors.name}
          required
        />

        <FormField
          name="email"
          label="Email"
          type="email"
          value={formData.email || ''}
          onChange={(e) => onChange('email', e.target.value)}
          placeholder="email@exemplo.com"
          error={errors.email}
        />

        <FormField
          name="phone"
          label="Telefone"
          value={formData.phone || ''}
          onChange={(e) => onChange('phone', e.target.value)}
          placeholder="(11) 99999-9999"
          error={errors.phone}
        />

        <FormField
          name="birthDate"
          label="Data de Nascimento"
          type="date"
          value={formData.birthDate || ''}
          onChange={(e) => onChange('birthDate', e.target.value)}
          error={errors.birthDate}
        />

        <FormField
          name="gender"
          label="Gênero"
          as="select"
          value={formData.gender || ''}
          onChange={(e) => onChange('gender', e.target.value)}
          error={errors.gender}
        >
          <option value="">Selecione...</option>
          <option value="male">Masculino</option>
          <option value="female">Feminino</option>
          <option value="other">Outro</option>
        </FormField>

        <FormField
          name="cpf"
          label="CPF"
          value={formData.cpf || ''}
          onChange={(e) => onChange('cpf', e.target.value)}
          placeholder="000.000.000-00"
          error={errors.cpf}
        />
      </div>

      <FormField
        name="address"
        label="Endereço"
        value={formData.address || ''}
        onChange={(e) => onChange('address', e.target.value)}
        placeholder="Rua, número, bairro, cidade"
        error={errors.address}
      />
    </div>
  );
};

export default React.memo(PatientBasicInfo);