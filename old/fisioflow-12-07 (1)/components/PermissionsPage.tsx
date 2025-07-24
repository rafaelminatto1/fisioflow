

import React, { useState, useEffect, useMemo } from 'react';
import { RolePermissions, UserRole } from '../types';
import { usePermissions } from '../hooks/usePermissions';
import Button from './ui/Button';
import Skeleton from './ui/Skeleton';
import { IconAlertTriangle } from './icons/IconComponents';

type ResourceKey = keyof RolePermissions[UserRole.ADMIN];
type ActionKey<R extends ResourceKey> = keyof RolePermissions[UserRole.ADMIN][R];

const roleNames: Record<UserRole, string> = {
    [UserRole.ADMIN]: 'Administrador',
    [UserRole.FISIOTERAPEUTA]: 'Fisioterapeuta',
    [UserRole.ESTAGIARIO]: 'Estagiário',
    [UserRole.PACIENTE]: 'Paciente',
};

const resourceConfig: { key: ResourceKey; name: string; actions: { key: string; name: string }[] }[] = [
    {
        key: 'patients',
        name: 'Pacientes',
        actions: [
            { key: 'view_all', name: 'Ver Todos' },
            { key: 'view_assigned', name: 'Ver Atribuídos' },
            { key: 'edit', name: 'Editar' },
            { key: 'delete', name: 'Excluir' },
        ],
    },
    {
        key: 'notebooks',
        name: 'Notebooks',
        actions: [
            { key: 'view', name: 'Ver' },
            { key: 'create', name: 'Criar' },
            { key: 'edit', name: 'Editar' },
            { key: 'delete', name: 'Excluir' },
        ],
    },
];

const PermissionsPage: React.FC = () => {
    const { permissions, isLoading, isError, savePermissions, isSaving } = usePermissions();
    const [editedPermissions, setEditedPermissions] = useState<RolePermissions | null>(null);
    const [initialPermissions, setInitialPermissions] = useState<RolePermissions | null>(null);

    useEffect(() => {
        if (permissions) {
            setEditedPermissions(JSON.parse(JSON.stringify(permissions)));
            setInitialPermissions(JSON.parse(JSON.stringify(permissions)));
        }
    }, [permissions]);

    const isDirty = useMemo(() => {
        if (!initialPermissions || !editedPermissions) return false;
        return JSON.stringify(initialPermissions) !== JSON.stringify(editedPermissions);
    }, [initialPermissions, editedPermissions]);

    const handlePermissionChange = (role: UserRole, resource: ResourceKey, action: string, value: boolean) => {
        setEditedPermissions(prev => {
            if (!prev) return null;
            const newPermissions = JSON.parse(JSON.stringify(prev)); // Deep copy
            (newPermissions[role][resource] as any)[action] = value;
            return newPermissions;
        });
    };
    
    const handleSave = async () => {
        if (editedPermissions) {
            await savePermissions(editedPermissions);
            setInitialPermissions(JSON.parse(JSON.stringify(editedPermissions)));
        }
    };
    
    const handleReset = () => {
        if (initialPermissions) {
            setEditedPermissions(JSON.parse(JSON.stringify(initialPermissions)));
        }
    };
    
    if (isLoading || !editedPermissions) {
        return (
            <div className="space-y-6">
                <Skeleton className="h-10 w-1/3" />
                 <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-4">
                     <Skeleton className="h-8 w-1/4" />
                     <Skeleton className="h-20 w-full" />
                 </div>
            </div>
        )
    }

    if (isError) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-4">
                 <IconAlertTriangle size={32} className="text-red-400 mb-2" />
                 <h2 className="text-lg font-semibold text-red-300">Erro ao Carregar Permissões</h2>
                 <p className="text-slate-400">Não foi possível buscar os dados. Tente recarregar a página.</p>
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Gerenciamento de Permissões</h1>
                 <div className="flex items-center gap-3">
                    {isDirty && <Button variant="ghost" onClick={handleReset} disabled={isSaving}>Descartar Alterações</Button>}
                    <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving || isLoading || !isDirty}>
                        {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                 </div>
            </header>
            
            <div className="bg-slate-800 p-6 rounded-lg border border-slate-700">
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[700px] text-sm">
                        <thead>
                            <tr className="border-b border-slate-700">
                                <th className="text-left font-semibold text-slate-200 pb-3">Cargo</th>
                                {resourceConfig.map(res => (
                                    <th key={res.key} className="text-left font-semibold text-slate-200 pb-3 pl-4" colSpan={res.actions.length}>
                                        {res.name}
                                    </th>
                                ))}
                            </tr>
                            <tr className="border-b border-slate-600">
                                <th></th>
                                {resourceConfig.flatMap(res => res.actions.map(action => (
                                    <th key={`${res.key}-${action.key}`} className="text-center font-medium text-slate-400 py-2 text-xs">
                                        {action.name}
                                    </th>
                                )))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-700/50">
                            {Object.values(UserRole).filter(role => role !== UserRole.PACIENTE).map(role => (
                                <tr key={role}>
                                    <td className="py-3 font-semibold text-slate-300 pr-4">{roleNames[role]}</td>
                                    {resourceConfig.flatMap(res => res.actions.map(action => {
                                        const hasPermission = editedPermissions[role] && res.key in editedPermissions[role];
                                        const isChecked = hasPermission ? (editedPermissions[role][res.key as ResourceKey] as any)[action.key] : false;
                                        const isDisabled = role === UserRole.ADMIN; // Admins always have all permissions

                                        return (
                                            <td key={`${role}-${res.key}-${action.key}`} className="text-center py-2">
                                                <input
                                                    type="checkbox"
                                                    className="w-4 h-4 rounded bg-slate-600 border-slate-500 text-blue-500 focus:ring-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                                    checked={isChecked}
                                                    disabled={isDisabled}
                                                    onChange={(e) => handlePermissionChange(role, res.key as ResourceKey, action.key, e.target.checked)}
                                                />
                                            </td>
                                        );
                                    }))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                 <p className="text-xs text-slate-500 mt-4">* O cargo de Administrador sempre possui todas as permissões.</p>
            </div>
        </div>
    );
};

export default PermissionsPage;