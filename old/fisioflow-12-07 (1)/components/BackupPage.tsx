import React, { useState } from 'react';
import { useBackups } from '../hooks/useBackups';
import { IconAlertTriangle, IconCheckCircle, IconClock, IconDatabase, IconPlus, IconRefresh, IconTrash } from './icons/IconComponents';
import Button from './ui/Button';
import ConfirmationModal from './ConfirmationModal';
import Skeleton from './ui/Skeleton';
import { Backup } from '../types';
import DestructiveConfirmationModal from './DestructiveConfirmationModal';

const StatusCard: React.FC<{ icon: React.ReactNode; label: string; value: string; status?: 'success' | 'warn' | 'default' }> = ({ icon, label, value, status = 'default' }) => {
    const statusColor = {
        success: 'text-emerald-400',
        warn: 'text-amber-400',
        default: 'text-blue-400',
    };
    return (
        <div className="bg-slate-800/80 p-4 rounded-lg flex items-center gap-4">
            <div className={`w-12 h-12 rounded-full bg-slate-700/50 flex items-center justify-center ${statusColor[status]}`}>
                {icon}
            </div>
            <div>
                <p className="text-sm text-slate-400">{label}</p>
                <p className="text-xl font-bold text-slate-50">{value}</p>
            </div>
        </div>
    );
};

const BackupPage: React.FC = () => {
    const { backups = [], isLoading, isError, createBackup, isCreating, restoreBackup, isRestoring, deleteBackup, isDeleting } = useBackups();
    const [backupToRestore, setBackupToRestore] = useState<Backup | null>(null);
    const [backupToDelete, setBackupToDelete] = useState<Backup | null>(null);

    const handleRestoreClick = (backup: Backup) => {
        setBackupToRestore(backup);
    };
    
    const handleConfirmRestore = async () => {
        if (backupToRestore) {
            await restoreBackup(backupToRestore.id);
        }
        setBackupToRestore(null);
    };

    const handleDeleteClick = (backup: Backup) => {
        setBackupToDelete(backup);
    };

    const handleConfirmDelete = async () => {
        if (backupToDelete) {
            await deleteBackup(backupToDelete.id);
        }
        setBackupToDelete(null);
    };

    const latestBackup = backups?.find(b => b.status === 'success');
    const actionInProgress = isCreating || isRestoring || isDeleting;
    const actionText = isCreating ? 'Criando backup...' : isRestoring ? 'Restaurando sistema...' : isDeleting ? 'Excluindo backup...' : '';


    const renderBackupHistory = () => {
        if (isLoading) {
            return (
                 <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <tbody>
                            {Array.from({length: 5}).map((_, i) => (
                                <tr key={i} className="border-b border-slate-700">
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-32"/></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-24"/></td>
                                    <td className="px-6 py-4"><Skeleton className="h-5 w-20"/></td>
                                    <td className="px-6 py-4"><Skeleton className="h-6 w-24 rounded-full"/></td>
                                    <td className="px-6 py-4 text-right"><Skeleton className="h-8 w-40 ml-auto"/></td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                 </div>
            )
        }
        
        if (isError) {
             return (
                <div className="flex flex-col items-center justify-center h-full text-center p-8 bg-slate-800/50 rounded-lg">
                    <IconAlertTriangle size={32} className="text-red-400 mb-2" />
                    <h2 className="text-lg font-semibold text-red-300">Erro ao Carregar Backups</h2>
                    <p className="text-slate-400">Não foi possível buscar os dados. Tente recarregar a página.</p>
                </div>
            );
        }
        
        const statusConfig: Record<Backup['status'], {icon: React.ReactNode, text: string, color: string}> = {
            success: { icon: <IconCheckCircle/>, text: 'Sucesso', color: 'text-emerald-400' },
            failed: { icon: <IconAlertTriangle/>, text: 'Falhou', color: 'text-red-400' },
            in_progress: { icon: <IconClock className="animate-spin"/>, text: 'Em Progresso', color: 'text-blue-400' },
        };

        return (
             <div className="overflow-x-auto">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-6 py-3">Data</th>
                            <th scope="col" className="px-6 py-3">Versão</th>
                            <th scope="col" className="px-6 py-3">Tamanho</th>
                            <th scope="col" className="px-6 py-3">Status</th>
                            <th scope="col" className="px-6 py-3 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                         {backups.map((backup) => {
                            const { icon, text, color } = statusConfig[backup.status];
                            const canInteract = backup.status === 'success' && !actionInProgress;
                            return (
                                <tr key={backup.id}>
                                    <td className="px-6 py-4">{new Date(backup.timestamp).toLocaleString('pt-BR')}</td>
                                    <td className="px-6 py-4 font-mono">{backup.version}</td>
                                    <td className="px-6 py-4">{backup.size || '-'}</td>
                                    <td className="px-6 py-4">
                                        <div className={`flex items-center gap-2 font-semibold ${color}`}>
                                            {icon}
                                            <span>{text}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <div className="flex justify-end items-center gap-2">
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleRestoreClick(backup)}
                                                disabled={!canInteract}
                                                icon={<IconRefresh size={16}/>}
                                            >
                                                Restaurar
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDeleteClick(backup)}
                                                disabled={!canInteract}
                                                className="text-red-400 hover:bg-red-500/10"
                                                icon={<IconTrash size={16}/>}
                                            />
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
             </div>
        )
    }

    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Backup e Recuperação</h1>
                <Button onClick={() => createBackup()} isLoading={isCreating} disabled={actionInProgress} icon={<IconPlus />}>
                    Criar Backup Agora
                </Button>
            </header>

            {actionInProgress && (
                <div className="bg-blue-900/30 border border-blue-500/50 p-3 rounded-lg flex items-center gap-3 mb-4 animate-pulse">
                    <IconClock className="animate-spin text-blue-300" />
                    <p className="text-sm font-semibold text-blue-200">{actionText}</p>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                 <StatusCard 
                    label="Último Backup" 
                    value={latestBackup ? new Date(latestBackup.timestamp).toLocaleDateString('pt-BR') : 'N/A'} 
                    icon={latestBackup?.status === 'success' ? <IconCheckCircle size={24} /> : <IconAlertTriangle size={24} />}
                    status={latestBackup?.status === 'success' ? 'success' : 'warn'}
                 />
                 <StatusCard 
                    label="Próximo Backup Agendado" 
                    value="Amanhã às 02:00" 
                    icon={<IconClock size={24} />} 
                 />
                 <StatusCard 
                    label="Integridade do Último Backup" 
                    value={latestBackup?.status === 'success' ? 'Verificado' : 'Falhou'}
                    icon={<IconDatabase size={24} />}
                    status={latestBackup?.status === 'success' ? 'success' : 'warn'}
                 />
            </div>
            
             <div className="bg-slate-800 border border-slate-700 rounded-lg">
                 <div className="p-4 border-b border-slate-700">
                    <h2 className="text-lg font-semibold">Histórico de Backups</h2>
                </div>
                {renderBackupHistory()}
            </div>
            
            {backupToRestore && (
                <DestructiveConfirmationModal
                    isOpen={!!backupToRestore}
                    onClose={() => setBackupToRestore(null)}
                    onConfirm={handleConfirmRestore}
                    title="Confirmar Restauração do Sistema"
                    message={`Esta ação é PERMANENTE e substituirá TODOS os dados atuais pelos dados do backup de ${new Date(backupToRestore.timestamp).toLocaleString('pt-BR')}. Todos os dados inseridos após esta data serão perdidos.`}
                    confirmationWord="RESTAURAR"
                />
            )}
            
            {backupToDelete && (
                 <ConfirmationModal
                    isOpen={!!backupToDelete}
                    onClose={() => setBackupToDelete(null)}
                    onConfirm={() => handleConfirmDelete()}
                    title="Excluir Backup"
                    message={`Tem certeza que deseja excluir permanentemente o backup de ${new Date(backupToDelete.timestamp).toLocaleString('pt-BR')}? Esta ação não pode ser desfeita.`}
                    confirmTextSingle="Excluir"
                />
            )}
        </div>
    );
};

export default BackupPage;