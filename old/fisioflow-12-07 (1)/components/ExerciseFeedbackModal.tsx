
import React, { useState } from 'react';
import { ExerciseFeedbackModalProps, ExerciseLog, Mood } from '/types.js';
import { IconSmile, IconMeh, IconFrown } from '/components/icons/IconComponents.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';

const Slider: React.FC<{
    label: string;
    value: number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    minLabel: string;
    maxLabel: string;
}> = ({ label, value, onChange, minLabel, maxLabel }) => {
    const getSliderColor = (value: number) => {
        const percentage = value * 10;
        let colorFrom = '#3b82f6';
        let colorTo = '#ef4444';
        
        // Green to Yellow to Red for Pain
        if (label.toLowerCase().includes('dor')) {
            if (percentage <= 50) {
                const r = Math.round(74 + (239 - 74) * (percentage/50)); // 4a -> ef
                const g = Math.round(222 - (239 - 222) * (percentage/50)); // de -> af
                const b = Math.round(129 - (129-80) * (percentage/50)); // 81 -> 50
                colorFrom = `rgb(${r},${g},${b})`;
            } else {
                 const r = 239;
                 const g = Math.round(239 - (239-68) * ((percentage-50)/50));
                 const b = Math.round(80 - (80-68) * ((percentage-50)/50));
                 colorFrom = `rgb(${r},${g},${b})`;
            }
             return `linear-gradient(90deg, ${colorFrom} ${percentage}%, #475569 ${percentage}%)`;
        }

        return `linear-gradient(90deg, #3b82f6 ${percentage}%, #475569 ${percentage}%)`;
    };

    return (
        <div className="space-y-2">
            <div className="flex justify-between items-center">
                <label className="text-sm font-medium text-slate-300">{label}</label>
                <span className="text-sm font-bold text-slate-100 bg-slate-700 px-2 py-0.5 rounded">{value}</span>
            </div>
            <input
                type="range"
                min="0"
                max="10"
                step="1"
                value={value}
                onChange={onChange}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer range-thumb:bg-white"
                style={{ background: getSliderColor(value) }}
            />
            <div className="flex justify-between text-xs text-slate-400">
                <span>{minLabel}</span>
                <span>{maxLabel}</span>
            </div>
        </div>
    );
};

const ratingMap = {
    easy: { value: 2, label: 'Fácil', icon: <IconSmile size={32} /> },
    medium: { value: 5, label: 'Médio', icon: <IconMeh size={32} /> },
    hard: { value: 8, label: 'Difícil', icon: <IconFrown size={32} /> },
};
type DifficultyRating = keyof typeof ratingMap;


const ExerciseFeedbackModal: React.FC<ExerciseFeedbackModalProps> = ({ isOpen, onClose, onSave, prescription, exercise }) => {
    const [painLevel, setPainLevel] = useState(0);
    const [difficultyRating, setDifficultyRating] = useState<DifficultyRating | null>(null);
    const [notes, setNotes] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    if (!isOpen) return null;

    const handleSave = () => {
        if (difficultyRating === null) {
            alert("Por favor, selecione um nível de dificuldade.");
            return;
        }

        setIsSaving(true);
        const newLog: Omit<ExerciseLog, 'id'> = {
            prescriptionId: prescription.id,
            patientId: prescription.patientId,
            date: new Date().toISOString(),
            painLevel,
            difficultyLevel: ratingMap[difficultyRating].value,
            notes,
        };
        setTimeout(() => {
            onSave(newLog);
            setIsSaving(false);
            onClose(); 
        }, 300);
    };
    
    const footer = (
         <div className="flex items-center justify-end w-full space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button
                onClick={handleSave}
                disabled={isSaving || difficultyRating === null}
                isLoading={isSaving}
            >
                {isSaving ? 'Salvando...' : 'Salvar Progresso'}
            </Button>
        </div>
    );

    return (
        <BaseModal
            isOpen={isOpen}
            onClose={onClose}
            title="Registrar Progresso"
            footer={footer}
        >
             <div className="space-y-6">
                <div>
                    <p className="text-sm text-slate-400">Exercício:</p>
                    <p className="font-semibold text-slate-200 text-lg">{exercise.name}</p>
                </div>
                
                <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-300">Como foi a dificuldade?</label>
                    <div className="flex justify-around gap-4">
                        {Object.entries(ratingMap).map(([key, { label, icon }]) => (
                            <button
                                key={key}
                                onClick={() => setDifficultyRating(key as DifficultyRating)}
                                className={`flex-1 flex flex-col items-center p-4 rounded-lg border-2 transition-all ${difficultyRating === key ? 'bg-blue-500/20 border-blue-500' : 'bg-slate-700 border-transparent hover:border-slate-500'}`}
                            >
                                <span className={`text-4xl ${difficultyRating === key ? 'text-blue-400' : 'text-slate-400'}`}>{icon}</span>
                                <span className="mt-2 font-semibold">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                <Slider
                    label="Nível de Dor durante o exercício"
                    value={painLevel}
                    onChange={(e) => setPainLevel(Number(e.target.value))}
                    minLabel="Sem Dor"
                    maxLabel="Dor Máxima"
                />
                
                <div className="space-y-2">
                    <label htmlFor="notes" className="text-sm font-medium text-slate-300">Comentários (Opcional)</label>
                    <textarea
                        id="notes"
                        name="notes"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={4}
                        className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                        placeholder="Ex: Senti um estalo no ombro, consegui completar todas as séries, etc."
                    />
                </div>
            </div>
        </BaseModal>
    );
};

export default ExerciseFeedbackModal;