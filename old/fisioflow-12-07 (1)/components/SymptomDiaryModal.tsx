import React, { useState, useEffect } from 'react';
import { default as ReactMarkdown } from 'react-markdown';
import { SymptomDiaryModalProps, DailyLog, Mood, BodyChartMarking } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';
import { IconFrown, IconMeh, IconSmile, IconSparkles } from './icons/IconComponents';
import FormField from './ui/FormField';
import BodyChart from './BodyChart';
import { analyzeBodyChart } from '../services/geminiService';
import { useNotification } from '../hooks/useNotification';

const Slider: React.FC<{
    label: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    minLabel: string;
    maxLabel: string;
    min: number;
    max: number;
}> = ({ label, value, onChange, minLabel, maxLabel, min, max }) => {
    const getSliderColor = (val: number, minVal: number, maxVal: number) => {
        const percentage = ((val - minVal) / (maxVal - minVal)) * 100;
        let color = '#3b82f6';
        if (label.toLowerCase().includes('dor')) {
            if (percentage <= 50) {
                 const r = Math.round(74 + (239 - 74) * (percentage/50));
                 const g = Math.round(222 - (239 - 222) * (percentage/50));
                 const b = Math.round(129 - (129-80) * (percentage/50));
                 color = `rgb(${r},${g},${b})`;
            } else {
                 const r = 239;
                 const g = Math.round(239 - (239-68) * ((percentage-50)/50));
                 const b = Math.round(80 - (80-68) * ((percentage-50)/50));
                 color = `rgb(${r},${g},${b})`;
            }
        }
        return `linear-gradient(90deg, ${color} ${percentage}%, #475569 ${percentage}%)`;
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <span className="text-sm font-bold text-slate-100 bg-slate-700 px-2 py-0.5 rounded">{value}</span>
            </div>
            <input
                type="range"
                min={min}
                max={max}
                step="1"
                value={value}
                onChange={onChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-thumb:bg-white"
                style={{ background: getSliderColor(value, min, max) }}
            />
            <div className="flex justify-between text-xs text-slate-400">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        </div>
    );
};

const MoodSelector: React.FC<{
    selectedMood: Mood;
    onSelect: (mood: Mood) => void;
}> = ({ selectedMood, onSelect }) => {
    const moods: { key: Mood, label: string, icon: React.ReactNode, color: string }[] = [
        { key: 'triste', label: 'Triste', icon: <IconFrown size={32} />, color: 'text-red-400 border-red-500' },
        { key: 'neutro', label: 'Neutro', icon: <IconMeh size={32} />, color: 'text-amber-400 border-amber-500' },
        { key: 'feliz', label: 'Feliz', icon: <IconSmile size={32} />, color: 'text-emerald-400 border-emerald-500' },
    ];

    return (
        <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Como você está se sentindo hoje?</label>
            <div className="flex justify-around gap-4">
                {moods.map(({ key, label, icon, color }) => (
                    <button
                        key={key}
                        onClick={() => onSelect(key)}
                        className={`flex-1 flex flex-col items-center p-4 rounded-lg border-2 transition-all ${selectedMood === key ? `${color} bg-white/10` : 'bg-slate-700 border-transparent hover:border-slate-500'}`}
                    >
                        <span className={`text-4xl ${selectedMood === key ? '' : 'text-slate-400'}`}>{icon}</span>
                        <span className="mt-2 font-semibold">{label}</span>
                    </button>
                ))}
            </div>
        </div>
    );
};

export const SymptomDiaryModal: React.FC<SymptomDiaryModalProps> = ({ isOpen, onClose, onSave, existingLog }) => {
    const [log, setLog] = useState<Omit<DailyLog, 'id' | 'patientId'>>({
        date: new Date().toISOString(),
        painLevel: 0,
        energyLevel: 3,
        sleepQuality: 3,
        mood: 'neutro',
        notes: '',
        bodyChartData: [],
    });
    const [aiAnalysis, setAiAnalysis] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const { addNotification } = useNotification();

    useEffect(() => {
        if (existingLog) {
            setLog(existingLog);
        } else {
            setLog({
                date: new Date().toISOString(),
                painLevel: 0, energyLevel: 3, sleepQuality: 3, mood: 'neutro', notes: '', bodyChartData: []
            });
        }
        setAiAnalysis('');
    }, [existingLog, isOpen]);

    const handleChange = (field: keyof typeof log, value: any) => {
        setLog(prev => ({ ...prev, [field]: value }));
    };

    const handleBodyChartUpdate = (markings: BodyChartMarking[]) => {
        setLog(prev => ({...prev, bodyChartData: markings}));
    };

    const handleAnalyzeChart = async () => {
        if (!log.bodyChartData || log.bodyChartData.length === 0) {
            addNotification({ type: 'info', title: 'Mapa Corporal Vazio', message: 'Adicione pelo menos um ponto de dor para obter uma análise.'});
            return;
        }
        setIsAnalyzing(true);
        setAiAnalysis('');
        try {
            const analysis = await analyzeBodyChart(log.bodyChartData);
            setAiAnalysis(analysis);
        } catch (e) {
            addNotification({ type: 'error', title: 'Erro na Análise', message: (e as Error).message });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSave = () => {
        onSave(log);
    };

    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Diário</Button>
        </div>
    );
    
    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title={existingLog ? 'Editar Diário de Hoje' : 'Registrar Diário de Hoje'}
            footer={footer}
        >
            <div className="space-y-6">
                <p className="text-sm text-slate-400">Registre como você se sentiu hoje. Isso ajuda seu fisioterapeuta a acompanhar sua evolução.</p>
                <BodyChart markings={log.bodyChartData || []} onUpdateMarkings={handleBodyChartUpdate} />
                 <div className="text-center">
                    <Button variant="ghost" onClick={handleAnalyzeChart} isLoading={isAnalyzing} icon={<IconSparkles/>}>Analisar padrão de dor com IA</Button>
                </div>
                {aiAnalysis && (
                     <div className="prose prose-sm prose-invert max-w-none p-3 bg-slate-900/70 rounded-md border border-slate-700 text-slate-300">
                        <ReactMarkdown>{aiAnalysis}</ReactMarkdown>
                    </div>
                )}
                <Slider
                    label="Nível Geral de Dor Hoje"
                    value={log.painLevel}
                    onChange={(e) => handleChange('painLevel', Number(e.target.value))}
                    min={0}
                    max={10}
                    minLabel="Sem Dor"
                    maxLabel="Dor Intensa"
                />
                <Slider
                    label="Nível de Energia"
                    value={log.energyLevel}
                    onChange={(e) => handleChange('energyLevel', Number(e.target.value))}
                    min={1}
                    max={5}
                    minLabel="Muito Baixa"
                    maxLabel="Muito Alta"
                />
                 <Slider
                    label="Qualidade do Sono"
                    value={log.sleepQuality}
                    onChange={(e) => handleChange('sleepQuality', Number(e.target.value))}
                    min={1}
                    max={5}
                    minLabel="Ruim"
                    maxLabel="Ótima"
                />
                <MoodSelector selectedMood={log.mood} onSelect={(mood) => handleChange('mood', mood)} />
                <FormField
                    as="textarea"
                    label="Anotações Adicionais (Opcional)"
                    name="notes"
                    id="notes"
                    value={log.notes || ''}
                    onChange={(e) => handleChange('notes', e.target.value)}
                    rows={3}
                    placeholder="Algum evento importante, atividade que piorou/melhorou a dor, etc."
                />
            </div>
        </BaseModal>
    );
};
