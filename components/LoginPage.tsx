import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import {
  IconUsers,
  IconUserShield,
  IconUser,
  IconBuilding,
} from './icons/IconComponents';
import { Stethoscope } from 'lucide-react';

const RoleButton: React.FC<{
  role?: UserRole;
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  sublabel?: string;
}> = ({ role, label, icon, onClick, sublabel }) => (
  <button
    onClick={onClick}
    className="group flex w-full flex-col items-center justify-center rounded-lg border border-slate-700 bg-slate-800 p-6 text-center transition-all duration-300 hover:border-blue-500 hover:bg-slate-700"
  >
    <div className="mb-4 text-slate-400 transition-colors group-hover:text-blue-500">
      {icon}
    </div>
    <span className="text-lg font-semibold text-slate-200">{label}</span>
    {sublabel && (
      <span className="text-sm capitalize text-slate-400">{sublabel}</span>
    )}
  </button>
);

const LoginPage: React.FC = () => {
  const { login } = useAuth();

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
          label="Admin Clínica"
          sublabel="(Existente)"
          icon={<IconUserShield size={48} />}
          onClick={() => login(UserRole.ADMIN, '1')}
        />
        <RoleButton
          label="Nova Clínica"
          sublabel="(Onboarding)"
          icon={<IconBuilding size={48} />}
          onClick={() => login(UserRole.ADMIN, '5')}
        />
        <RoleButton
          role={UserRole.FISIOTERAPEUTA}
          label="Fisioterapeuta"
          icon={<Stethoscope size={48} />}
          onClick={() => login(UserRole.FISIOTERAPEUTA)}
          sublabel={UserRole.FISIOTERAPEUTA}
        />
        <RoleButton
          role={UserRole.ESTAGIARIO}
          label="Estagiário"
          icon={<IconUsers size={48} />}
          onClick={() => login(UserRole.ESTAGIARIO)}
          sublabel={UserRole.ESTAGIARIO}
        />
        <RoleButton
          role={UserRole.PACIENTE}
          label="Paciente"
          icon={<IconUser size={48} />}
          onClick={() => login(UserRole.PACIENTE)}
          sublabel={UserRole.PACIENTE}
        />
      </div>
      <p className="mt-12 text-sm text-slate-500">
        Este é um ambiente de demonstração. Seus dados não serão salvos.
      </p>
    </div>
  );
};

export default LoginPage;
