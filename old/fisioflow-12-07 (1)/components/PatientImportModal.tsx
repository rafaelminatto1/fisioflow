

import React, { useState } from 'react';
import { useNotification } from '../hooks/useNotification';
import { Patient, FisioNotificationSettings } from '../types';
import { IconFileText, IconUpload } from './icons/IconComponents';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

interface PatientImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (patients: Omit<Patient, 'id'>[]) => Promise<{successCount: number, errorCount: number, errors: string[]}>;
}

const PatientImportModal: React.FC<PatientImportModalProps> = ({ isOpen, onClose, onImport }) => {
    const { addNotification } = useNotification();
    const [file, setFile] = useState<File | null>(null);
    const [isImporting, setIsImporting] = useState(false);
    const [importResult, setImportResult] = useState<{successCount: number; errorCount: number, errors: string[]} | null>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setImportResult(null);
        }
    };

    const handleDownloadTemplate = () => {
        const headers = 'name,email,phone,medicalHistory';
        const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.href) {
            URL.revokeObjectURL(link.href);
        }
        const url = URL.createObjectURL(blob);
        link.href = url;
        link.setAttribute('download', 'template_pacientes.csv');
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleImportClick = () => {
        if (!file) {
            addNotification({ type: 'error', title: 'Nenhum arquivo selecionado', message: 'Por favor, selecione um arquivo CSV para importar.' });
            return;
        }

        setIsImporting(true);
        setImportResult(null);

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            if (!text) {
                setIsImporting(false);
                addNotification({ type: 'error', title: 'Arquivo Vazio', message: 'O arquivo selecionado está vazio ou não pôde ser lido.' });
                return;
            }
            
            const rows = text.split('\n').map(row => row.trim()).filter(row => row);
            const headerRow = rows.shift()?.toLowerCase();

            if (!headerRow) {
                setIsImporting(false);
                addNotification({ type: 'error', title: 'Arquivo Vazio', message: 'O arquivo CSV não contém um cabeçalho.' });
                return;
            }

            const header = headerRow.split(',').map(h => h.trim().replace(/"/g, ''));
            const expectedHeader = ['name', 'email', 'phone', 'medicalhistory'];
            
            if (JSON.stringify(header) !== JSON.stringify(expectedHeader)) {
                 setIsImporting(false);
                 addNotification({ type: 'error', title: 'Cabeçalho Inválido', message: 'O cabeçalho do CSV deve ser: name,email,phone,medicalHistory' });
                 return;
            }

            const defaultNotificationSettings: FisioNotificationSettings = {
                appointmentReminders: { enabled: true, beforeMinutes: [60, 1440], channels: [{channel: 'in_app', enabled: true}] },
                exerciseReminders: { enabled: true, times: ["09:00"], channels: [{channel: 'in_app', enabled: true}] },
                medicationReminders: { enabled: true, channels: [{channel: 'in_app', enabled: true}] },
            };

            const newPatients: Omit<Patient, 'id'>[] = rows.map((row, index) => {
                // Simple CSV parsing, not robust for commas in fields
                const values = row.split(',');
                const patientData = {
                    name: values[0]?.trim().replace(/"/g, '') || '',
                    email: values[1]?.trim().replace(/"/g, '') || '',
                    phone: values[2]?.trim().replace(/"/g, '') || '',
                    medicalHistory: values[3]?.trim().replace(/"/g, '') || '',
                    avatarUrl: `https://picsum.photos/seed/${Date.now() + index}/100/100`,
                    gamification: { points: 0, level: 1, streak: 0, lastLogDate: null },
                    unlockedAchievements: [],
                    personalGoals: [],
                    notificationSettings: defaultNotificationSettings,
                };
                return patientData;
            });
            
            const result = await onImport(newPatients);
            setImportResult(result);
            setIsImporting(false);
        };

        reader.readAsText(file);
    };
    
    const handleClose = () => {
        setFile(null);
        setImportResult(null);
        setIsImporting(false);
        onClose();
    }
    
    const footer = (
         <div className="flex justify-end w-full">
            <Button 
                onClick={handleImportClick} 
                disabled={isImporting || !file}
                isLoading={isImporting}
            >
                {isImporting ? 'Importando...' : 'Importar Arquivo'}
            </Button>
         </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={handleClose}
            title="Importar Pacientes via CSV"
            footer={footer}
        >
            <div className="space-y-6">
                <div className="p-4 bg-slate-900/50 border border-slate-700 rounded-lg">
                    <h3 className="font-semibold text-slate-200">Instruções</h3>
                    <ol className="list-decimal list-inside text-sm text-slate-400 mt-2 space-y-1">
                        <li>Baixe o nosso template para garantir o formato correto.</li>
                        <li>Abra o arquivo em um editor de planilhas (Excel, Google Sheets).</li>
                        <li>Preencha as colunas com os dados dos seus pacientes.</li>
                        <li>Salve o arquivo no formato CSV.</li>
                        <li>Faça o upload do arquivo CSV preenchido abaixo.</li>
                    </ol>
                    <button onClick={handleDownloadTemplate} className="mt-4 inline-flex items-center gap-2 text-sm text-blue-300 bg-blue-900/50 px-3 py-1.5 rounded-md hover:bg-blue-900/80 transition-colors">
                        <IconFileText size={16}/> Baixar Template
                    </button>
                </div>
                
                <div className="space-y-2">
                    <label htmlFor="csv-upload" className="block text-sm font-medium text-slate-300">Selecione o arquivo CSV</label>
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-slate-600 border-dashed rounded-md">
                        <div className="space-y-1 text-center">
                            <IconUpload className="mx-auto h-12 w-12 text-slate-400" />
                            <div className="flex text-sm text-slate-400">
                            <label htmlFor="csv-upload" className="relative cursor-pointer bg-slate-800 rounded-md font-medium text-blue-400 hover:text-blue-300 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-offset-slate-800 focus-within:ring-blue-500">
                                <span>Clique para selecionar</span>
                                <input id="csv-upload" name="csv-upload" type="file" className="sr-only" accept=".csv" onChange={handleFileChange} />
                            </label>
                            <p className="pl-1">ou arraste e solte</p>
                            </div>
                            {file ? (
                                <p className="text-sm text-slate-200 pt-2">{file.name}</p>
                            ) : (
                                <p className="text-xs text-slate-500">Arquivo CSV, até 10MB</p>
                            )}
                        </div>
                    </div>
                </div>
                {importResult && (
                    <div className={`p-4 rounded-lg border ${importResult.errorCount > 0 ? 'bg-red-900/20 border-red-500/30' : 'bg-emerald-900/20 border-emerald-500/30'}`}>
                        <h4 className={`font-semibold ${importResult.errorCount > 0 ? 'text-red-300' : 'text-emerald-300'}`}>Resultado da Importação</h4>
                        <p className="text-sm text-slate-300">
                            {importResult.successCount} pacientes importados com sucesso.
                        </p>
                            {importResult.errorCount > 0 && (
                            <p className="text-sm text-slate-300">
                                {importResult.errorCount} linhas com erros.
                            </p>
                        )}
                        {importResult.errors.length > 0 && (
                            <ul className="list-disc list-inside text-xs text-red-300/80 mt-2 max-h-24 overflow-y-auto">
                                {importResult.errors.map((err, i) => <li key={i}>{err}</li>)}
                            </ul>
                        )}
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default PatientImportModal;