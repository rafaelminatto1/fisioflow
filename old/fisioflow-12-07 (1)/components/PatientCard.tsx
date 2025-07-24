

import React from 'react';
import { PatientCardProps } from '../types';
import { IconAlertTriangle, IconCalendar } from './icons/IconComponents';

const PatientCard: React.FC<PatientCardProps> = ({ patient, isSelected, onClick, appointmentCount, overdueTaskCount, isChecked, onCheckboxChange, isSelectionMode }) => {
    const baseClasses = "group w-full flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all duration-200";
    const selectedClasses = "bg-slate-700/50 border-blue-500/50 shadow-lg";
    const unselectedClasses = "bg-slate-800/60 border-slate-700 hover:bg-slate-700/50 hover:border-blue-500/30";

    return (
        <div
            onClick={onClick}
            className={`${baseClasses} ${isSelected ? selectedClasses : unselectedClasses}`}
        >
            <div className="flex items-center gap-4 truncate">
                {isSelectionMode && (
                    <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={onCheckboxChange}
                        onClick={e => e.stopPropagation()}
                        className="w-5 h-5 bg-slate-700 border-slate-500 rounded text-blue-500 focus:ring-blue-600 cursor-pointer flex-shrink-0"
                    />
                )}
                <img
                    src={patient.avatarUrl}
                    alt={patient.name}
                    className={`w-12 h-12 rounded-full border-2 transition-colors ${isSelected ? 'border-blue-400' : 'border-slate-600 group-hover:border-blue-500'}`}
                />
                <div className="truncate">
                    <p className={`font-semibold truncate transition-colors ${isSelected ? 'text-blue-300' : 'text-slate-100 group-hover:text-white'}`}>
                        {patient.name}
                    </p>
                    <p className="text-sm text-slate-400 truncate">{patient.email}</p>
                </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0 ml-2">
                {appointmentCount > 0 && (
                     <div className="flex items-center gap-1.5 text-xs text-slate-300" title={`${appointmentCount} agendamentos futuros`}>
                        <IconCalendar size={14} className="text-blue-400"/>
                        <span>{appointmentCount}</span>
                    </div>
                )}
                 {overdueTaskCount > 0 && (
                     <div className="flex items-center gap-1.5 text-xs text-red-400" title={`${overdueTaskCount} tarefas atrasadas`}>
                        <IconAlertTriangle size={14}/>
                        <span>{overdueTaskCount}</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientCard;
