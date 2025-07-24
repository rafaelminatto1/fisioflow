
import React from 'react';
import { useAuth } from '/hooks/useAuth.js';
import { UserRole } from '/types.js';
import { IconStethoscope, IconUsers, IconUserShield, IconUser } from '/components/icons/IconComponents.js';

const RoleButton: React.FC<{
    role: UserRole;
    label: string;
    icon: React.ReactNode;
    onClick: (role: UserRole) => void;
}> = ({ role, label, icon, onClick }) => (
    <button
        onClick={() => onClick(role)}
        className="interactive-card group w-full flex flex-col items-center justify-center p-8 text-center"
    >
        <div className="mb-4 text-slate-400 group-hover:text-blue-400 transition-colors duration-300">
            {icon}
        </div>
        <span className="text-lg font-semibold text-slate-100">{label}</span>
        <span className="text-sm text-slate-400 capitalize">{role}</span>
    </button>
);

const LoginPage: React.FC = () => {
    const { login } = useAuth();

    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 p-4">
            <div className="text-center mb-12">
                <h1 className="text-5xl font-bold text-slate-50">FisioFlow</h1>
                <p className="text-slate-300 mt-2">Selecione seu perfil para continuar</p>
            </div>
            <div className="max-w-4xl w-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <RoleButton
                    role={UserRole.ADMIN}
                    label="Administrador"
                    icon={<IconUserShield size={48} />}
                    onClick={login}
                />
                <RoleButton
                    role={UserRole.FISIOTERAPEUTA}
                    label="Fisioterapeuta"
                    icon={<IconStethoscope size={48} />}
                    onClick={login}
                />
                <RoleButton
                    role={UserRole.ESTAGIARIO}
                    label="Estagiário"
                    icon={<IconUsers size={48} />}
                    onClick={login}
                />
                 <RoleButton
                    role={UserRole.PACIENTE}
                    label="Paciente"
                    icon={<IconUser size={48} />}
                    onClick={login}
                />
            </div>
            <p className="mt-12 text-slate-500 text-sm">
                Este é um ambiente de demonstração. Seus dados não serão salvos.
            </p>
        </div>
    );
};

export default LoginPage;