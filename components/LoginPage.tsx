import { Stethoscope } from 'lucide-react';
import React, { useState } from 'react';
import { toast } from 'sonner';

import { useAuth } from '../src/hooks/useAuthSimple';
import { UserRole } from '../types';

import {
  IconUsers,
  IconUserShield,
  IconUser,
  IconBuilding,
} from './icons/IconComponents';
import { Button } from './ui/Button'; // Importando o novo botão

const RoleButton: React.FC<{
  role?: UserRole | 'new_clinic';
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  sublabel?: string;
  isLoading: boolean;
}> = ({ role, label, icon, onClick, sublabel, isLoading }) => (
  <Button
    onClick={onClick}
    isLoading={isLoading}
    variant="secondary"
    className="group flex h-auto flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-6 text-center transition-all duration-300 hover:border-blue-500 hover:bg-slate-700"
  >
    <div className="mb-4 text-slate-400 transition-colors group-hover:text-blue-500">
      {icon}
    </div>
    <span className="text-lg font-semibold text-slate-200">{label}</span>
    {sublabel && (
      <span className="text-sm capitalize text-slate-400">{sublabel}</span>
    )}
  </Button>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [loadingRole, setLoadingRole] = useState<
    UserRole | 'new_clinic' | null
  >(null);

  const handleLogin = async (role: UserRole, tenantId?: string) => {
    setLoadingRole(tenantId ? 'new_clinic' : role);

    // Simula uma chamada de API
    await new Promise((resolve) => setTimeout(resolve, 750));

    try {
      login(role, tenantId);
      toast.success(`Login como ${role} realizado com sucesso!`);
    } catch (error) {
      toast.error('Ocorreu um erro ao tentar fazer login.');
      console.error(error);
    }
    // O setLoadingRole(null) não é necessário porque o componente será desmontado
  };

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center bg-slate-900 p-4">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-bold text-slate-50">FisioFlow</h1>
        <p className="mt-2 text-slate-300">
          Selecione seu perfil para continuar
        </p>
      </div>
      <div className="grid w-full max-w-5xl grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-5">
        <RoleButton
          role={UserRole.ADMIN}
          label="Admin Clínica"
          sublabel="(Existente)"
          icon={<IconUserShield size={48} />}
          onClick={() => handleLogin(UserRole.ADMIN, '1')}
          isLoading={loadingRole === UserRole.ADMIN}
        />
        <RoleButton
          role="new_clinic"
          label="Nova Clínica"
          sublabel="(Onboarding)"
          icon={<IconBuilding size={48} />}
          onClick={() => handleLogin(UserRole.ADMIN, '5')}
          isLoading={loadingRole === 'new_clinic'}
        />
        <RoleButton
          role={UserRole.FISIOTERAPEUTA}
          label="Fisioterapeuta"
          icon={<Stethoscope size={48} />}
          onClick={() => handleLogin(UserRole.FISIOTERAPEUTA)}
          sublabel={UserRole.FISIOTERAPEUTA}
          isLoading={loadingRole === UserRole.FISIOTERAPEUTA}
        />
        <RoleButton
          role={UserRole.ESTAGIARIO}
          label="Estagiário"
          icon={<IconUsers size={48} />}
          onClick={() => handleLogin(UserRole.ESTAGIARIO)}
          sublabel={UserRole.ESTAGIARIO}
          isLoading={loadingRole === UserRole.ESTAGIARIO}
        />
        <RoleButton
          role={UserRole.PACIENTE}
          label="Paciente"
          icon={<IconUser size={48} />}
          onClick={() => handleLogin(UserRole.PACIENTE)}
          sublabel={UserRole.PACIENTE}
          isLoading={loadingRole === UserRole.PACIENTE}
        />
      </div>
      <p className="mt-12 text-sm text-slate-500">
        Este é um ambiente de demonstração. Seus dados não serão salvos.
      </p>
    </div>
  );
};

export default LoginPage;
