import React, { useEffect, useState, useRef } from 'react';
import { Patient, Prescription, Exercise } from '../types';
import QRCode from 'qrcode';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { IconX, IconPrinter, IconShare2, IconSparkles, IconStethoscope } from './icons/IconComponents';
import Button from './ui/Button';
import { useSettings } from '../hooks/useSettings';
import { generateExercisePlanTips } from '../services/geminiService';
import { useNotification } from '../hooks/useNotification';
import ReactMarkdown from 'react-markdown';

interface ExerciseSheetModalProps {
    isOpen: boolean;
    onClose: () => void;
    patient: Patient;
    prescriptions: Prescription[];
    exercises: Exercise[];
}

const ExerciseSheetModal: React.FC<ExerciseSheetModalProps> = ({ isOpen, onClose, patient, prescriptions, exercises }) => {
    usePreventBodyScroll(isOpen);
    const { settings } = useSettings();
    const { addNotification } = useNotification();
    
    const [qrCodes, setQrCodes] = useState<Record<string, string>>({});
    const [generalNotes, setGeneralNotes] = useState('');
    const [aiTips, setAiTips] = useState('');
    const [isGeneratingTips, setIsGeneratingTips] = useState(false);

    const modalRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);
    const portalUrl = window.location.origin + window.location.pathname;

    useEffect(() => {
        if (isOpen) {
            const generateQRs = async () => {
                const codes: Record<string, string> = {};
                for (const p of prescriptions) {
                    const url = `${portalUrl}?patientId=${patient.id}&prescriptionId=${p.id}`;
                    try {
                        codes[p.id] = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', width: 80 });
                    } catch (err) {
                        console.error(err);
                    }
                }
                const patientPortalUrl = `${portalUrl}?patientId=${patient.id}`;
                codes['patientPortal'] = await QRCode.toDataURL(patientPortalUrl, { errorCorrectionLevel: 'M', width: 80 });
                setQrCodes(codes);
            };
            generateQRs();
        }
    }, [isOpen, prescriptions, patient.id, portalUrl]);

    if (!isOpen) return null;

    const handlePrint = () => {
        window.print();
    };
    
    const handleShare = async () => {
        const shareData = {
            title: `Seu plano de exercícios - FisioFlow`,
            text: `Acesse seu plano de exercícios personalizado.`,
            url: `${portalUrl}?patientId=${patient.id}`
        };
        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                navigator.clipboard.writeText(shareData.url);
                addNotification({type: 'success', title: 'Link Copiado!', message: 'O link do portal foi copiado para a área de transferência.'});
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const handleGenerateTips = async () => {
        setIsGeneratingTips(true);
        setAiTips('');
        try {
            const prescribedExercises = prescriptions.map(p => exercises.find(e => e.id === p.exerciseId)).filter(Boolean) as Exercise[];
            const tips = await generateExercisePlanTips(prescribedExercises);
            setAiTips(tips);
        } catch (err) {
            addNotification({ type: 'error', title: 'Erro da IA', message: (err as Error).message });
        } finally {
            setIsGeneratingTips(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-modal-in printable-modal" ref={modalRef}>
            <div className="bg-slate-800 rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col border border-slate-700">
                <header className="flex items-center justify-between p-4 border-b border-slate-700 flex-shrink-0 no-print">
                    <h2 className="text-lg font-semibold text-slate-100">Ficha de Exercícios - {patient.name}</h2>
                    <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-700 hover:text-white" aria-label="Fechar">
                        <IconX size={20} />
                    </button>
                </header>
                <main className="p-6 overflow-y-auto printable-area" ref={contentRef}>
                    <div className="printable-modal-content">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-dashed border-slate-400">
                             <div className="text-left">
                                <h1 className="text-2xl font-bold text-slate-900">{settings?.clinicName || 'FisioFlow'}</h1>
                                <p className="text-xs text-slate-600">{settings?.clinicAddress}</p>
                                <p className="text-xs text-slate-600">{settings?.clinicPhone} | {settings?.clinicEmail}</p>
                            </div>
                            {settings?.clinicLogoUrl ? (
                                <img src={settings.clinicLogoUrl} alt="Logo" className="w-16 h-16 object-contain" />
                            ) : (
                                <IconStethoscope className="text-slate-700" size={40} />
                            )}
                        </div>
                        <h2 className="text-xl font-bold text-slate-800 mb-1">Plano de Exercícios de {patient.name}</h2>
                        <p className="text-slate-600 mb-6">Aponte a câmera do seu celular para o QR Code para ver o vídeo do exercício.</p>
                        
                        {generalNotes && (
                            <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg printable-notes" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="font-bold text-blue-800">Observações do seu Fisioterapeuta:</h3>
                                <p className="text-sm text-blue-700 whitespace-pre-wrap">{generalNotes}</p>
                            </div>
                        )}
                        
                        {aiTips && (
                             <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-lg printable-ai-tips" style={{ pageBreakInside: 'avoid' }}>
                                <h3 className="font-bold text-emerald-800 flex items-center gap-2"><IconSparkles size={16}/> Dicas para o Sucesso:</h3>
                                <div className="text-sm text-emerald-700 whitespace-pre-wrap prose prose-sm prose-black">
                                    <ReactMarkdown>{aiTips}</ReactMarkdown>
                                </div>
                            </div>
                        )}

                        <div className="space-y-4">
                            {prescriptions.map(p => {
                                const exercise = exercises.find(ex => ex.id === p.exerciseId);
                                if (!exercise) return null;
                                return (
                                    <div key={p.id} className="bg-slate-100 p-4 rounded-lg flex justify-between items-start gap-4" style={{ pageBreakInside: 'avoid' }}>
                                        <div className="flex-1">
                                            <h3 className="font-bold text-slate-800">{exercise.name}</h3>
                                            <p className="text-sm text-slate-600 mt-1">{p.sets} séries de {p.reps} repetições</p>
                                            <p className="text-sm text-slate-600">Frequência: {p.frequency}</p>
                                            {p.notes && <p className="text-xs italic text-slate-500 mt-2">"{p.notes}"</p>}
                                        </div>
                                        <div className="text-center">
                                            {qrCodes[p.id] ? <img src={qrCodes[p.id]} alt={`QR Code para ${exercise.name}`} /> : <div className="w-20 h-20 bg-slate-200 animate-pulse rounded-md"></div>}
                                            <p className="text-xs text-slate-500 mt-1">Ver exercício</p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        <div className="mt-8 pt-4 border-t border-dashed border-slate-400 flex justify-between items-center">
                            <p className="text-sm text-slate-600">Acesse seu portal completo:</p>
                            {qrCodes['patientPortal'] ? <img src={qrCodes['patientPortal']} alt="QR Code para portal do paciente" /> : <div className="w-20 h-20 bg-slate-200 animate-pulse rounded-md"></div>}
                        </div>
                    </div>
                </main>
                <footer className="flex-shrink-0 p-4 border-t border-slate-700 flex flex-col sm:flex-row justify-between items-center gap-4 no-print">
                    <div className="w-full sm:w-auto flex-1 space-y-2">
                        <label htmlFor="generalNotes" className="text-sm font-medium text-slate-300">Observações Gerais</label>
                        <textarea
                            id="generalNotes"
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                            rows={2}
                            className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                            placeholder="Adicione uma mensagem de incentivo ou instruções gerais aqui..."
                        />
                         <Button variant="ghost" size="sm" onClick={handleGenerateTips} isLoading={isGeneratingTips} icon={<IconSparkles/>}>
                            Gerar Dicas com IA
                         </Button>
                    </div>
                     <div className="flex-shrink-0 flex items-center gap-3">
                        {navigator.share && <Button variant="secondary" onClick={handleShare} icon={<IconShare2/>}>Compartilhar</Button>}
                        <Button variant="primary" onClick={handlePrint} icon={<IconPrinter/>}>Imprimir</Button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ExerciseSheetModal;