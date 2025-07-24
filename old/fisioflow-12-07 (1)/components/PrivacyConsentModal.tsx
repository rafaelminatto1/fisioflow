

import React, { useState } from 'react';
import { IconShieldCheck } from './icons/IconComponents';
import Button from './ui/Button';

interface ConsentChoices {
    analytics: boolean;
    communication: boolean;
}

interface PrivacyConsentModalProps {
    onConfirm: (choices: ConsentChoices) => void;
}

const Toggle: React.FC<{ label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean; }> = ({ label, description, checked, onChange, disabled }) => (
    <div className={`p-4 rounded-lg flex justify-between items-start gap-4 ${disabled ? 'bg-slate-700/50' : 'bg-slate-900/50'}`}>
        <div>
            <h4 className={`font-semibold ${disabled ? 'text-slate-400' : 'text-slate-200'}`}>{label}</h4>
            <p className="text-sm text-slate-400">{description}</p>
        </div>
        <div className="flex-shrink-0 pt-1">
            <label className="flex items-center cursor-pointer">
                <div className="relative">
                    <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={(e) => onChange(e.target.checked)}
                        disabled={disabled}
                    />
                    <div className={`block w-14 h-8 rounded-full transition-colors ${disabled ? 'bg-slate-600' : checked ? 'bg-blue-600' : 'bg-slate-600'}`}></div>
                    <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6' : ''}`}></div>
                </div>
            </label>
        </div>
    </div>
);


const PrivacyConsentModal: React.FC<PrivacyConsentModalProps> = ({ onConfirm }) => {
    const [consents, setConsents] = useState<ConsentChoices>({
        analytics: true,
        communication: true,
    });

    const handleToggle = (key: keyof ConsentChoices, value: boolean) => {
        setConsents(prev => ({ ...prev, [key]: value }));
    };

    const handleAcceptAll = () => {
        onConfirm({
            analytics: true,
            communication: true,
        });
    };

    const handleAcceptSelected = () => {
        onConfirm(consents);
    };

    return (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-slate-800 rounded-lg shadow-2xl w-full max-w-2xl flex flex-col border border-slate-700">
                <header className="p-6 text-center border-b border-slate-700">
                     <IconShieldCheck size={40} className="text-blue-400 mb-3 mx-auto" />
                    <h2 className="text-2xl font-bold text-slate-100">Seu Controle de Privacidade</h2>
                     <p className="text-slate-400 mt-2 text-sm max-w-lg mx-auto">Para usar o FisioFlow, precisamos do seu consentimento para processar dados de acordo com a LGPD e HIPAA. Este é um ambiente de demonstração e nenhum dado real deve ser inserido.</p>
                </header>
                
                <main className="p-6 space-y-4 max-h-[50vh] overflow-y-auto">
                    <Toggle 
                        label="Dados Essenciais para Tratamento"
                        description="Necessário para o funcionamento do sistema, como registro de sessões, avaliações e progresso. Este consentimento é obrigatório."
                        checked={true}
                        onChange={() => {}}
                        disabled={true}
                    />
                     <Toggle 
                        label="Análise de Desempenho (Anônimo)"
                        description="Permitir a coleta de dados de uso anônimos para melhorar a estabilidade e as funcionalidades do FisioFlow."
                        checked={consents.analytics}
                        onChange={(val) => handleToggle('analytics', val)}
                    />
                     <Toggle 
                        label="Comunicações e Lembretes"
                        description="Permitir o envio de notificações, lembretes de agendamento e comunicação via chat (simulados)."
                        checked={consents.communication}
                        onChange={(val) => handleToggle('communication', val)}
                    />
                </main>
                
                <footer className="p-6 border-t border-slate-700 bg-slate-800/50 space-y-3">
                     <p className="text-xs text-slate-500 text-center">
                        Ao continuar, você concorda com nossa <a href="#" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">Política de Privacidade</a> e <a href="#" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300">Termos de Serviço</a>. Você pode alterar suas preferências a qualquer momento nas configurações.
                    </p>
                     <div className="flex flex-col sm:flex-row gap-3">
                        <Button variant="secondary" size="lg" onClick={handleAcceptSelected} className="flex-1">Aceitar Selecionados</Button>
                        <Button variant="primary" size="lg" onClick={handleAcceptAll} className="flex-1">Aceitar Todos</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default PrivacyConsentModal;
