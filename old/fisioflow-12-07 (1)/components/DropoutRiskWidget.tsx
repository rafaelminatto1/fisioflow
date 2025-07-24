

import React from 'react';
import { DropoutRiskPrediction, Patient } from '../types';
import { IconShieldAlert } from './icons/IconComponents';
import Skeleton from './ui/Skeleton';

interface DropoutRiskWidgetProps {
    predictions: DropoutRiskPrediction[] | null | undefined;
    patients: Patient[] | undefined;
    isLoading: boolean;
    onSelectPatient: (patientId: string) => void;
}

const riskLevelClasses = {
    'Alto': 'bg-red-500/20 text-red-300 border-red-500/50',
    'Médio': 'bg-amber-500/20 text-amber-300 border-amber-500/50',
    'Baixo': 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
};

const DropoutRiskWidget: React.FC<DropoutRiskWidgetProps> = ({ predictions, patients, isLoading, onSelectPatient }) => {
    
    if (isLoading) {
        return (
            <div className="space-y-3 p-1">
                <Skeleton className="h-6 w-2/3 mb-2" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
            </div>
        )
    }
    
    const patientsMap = React.useMemo(() => new Map(patients?.map(p => [p.id, p])), [patients]);
    const validPredictions = React.useMemo(() => 
        predictions?.filter(p => p.riskLevel !== 'Baixo' && patientsMap.has(p.patientId)) || [],
    [predictions, patientsMap]);

    return (
        <>
            <h3 className="text-lg font-semibold text-slate-200 mb-3 flex items-center gap-2">
                <IconShieldAlert /> Risco de Evasão
            </h3>
            <div className="flex-1 overflow-y-auto -mr-3 pr-2">
                {validPredictions.length > 0 ? (
                    <ul className="space-y-2">
                        {validPredictions.map(pred => {
                            const patient = patientsMap.get(pred.patientId);
                            if (!patient) return null;
                            
                            return (
                                <li key={pred.patientId} onClick={() => onSelectPatient(pred.patientId)} className="p-2 rounded-md hover:bg-slate-700/50 transition-colors cursor-pointer group">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <img src={patient.avatarUrl} alt={patient.name} className="w-8 h-8 rounded-full" />
                                            <div>
                                                <p className="font-semibold text-slate-200 group-hover:text-blue-400">{patient.name}</p>
                                                <p className="text-xs text-slate-400">{pred.reason}</p>
                                            </div>
                                        </div>
                                         <span className={`text-xs font-bold px-2 py-1 rounded-full ${riskLevelClasses[pred.riskLevel]}`}>
                                            {pred.riskLevel}
                                        </span>
                                    </div>
                                </li>
                            )
                        })}
                    </ul>
                ) : (
                     <div className="text-slate-400 text-sm h-full flex items-center justify-center">
                        <p>Nenhum paciente com risco de evasão identificado. Ótimo trabalho!</p>
                    </div>
                )}
            </div>
        </>
    );
};

export default DropoutRiskWidget;