
import React, { useState, useCallback } from 'react';
import { Appointment } from '/types.js';
import { usePatientPopoverData } from '/hooks/usePatientPopoverData.js';
import { IconAlertTriangle, IconCrosshair, IconClipboardCheck, IconLoader } from '/components/icons/IconComponents.js';

interface AppointmentPopoverProps {
    appointment: Appointment;
    children: React.ReactNode;
}

const AppointmentPopover: React.FC<AppointmentPopoverProps> = ({ appointment, children }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { data, isLoading } = usePatientPopoverData(appointment.patientId, isOpen);
    
    const handleMouseEnter = useCallback(() => {
        const timer = window.setTimeout(() => {
           setIsOpen(true);
        }, 300); // 300ms delay before showing
        
        const popoverElement = document.getElementById(`popover-${appointment.id}`);
        if(popoverElement){
            popoverElement.dataset.timer = String(timer);
        }
    }, [appointment.id]);

    const handleMouseLeave = useCallback(() => {
        const popoverElement = document.getElementById(`popover-${appointment.id}`);
        if(popoverElement && popoverElement.dataset.timer) {
            clearTimeout(Number(popoverElement.dataset.timer));
        }
        setIsOpen(false);
    }, [appointment.id]);

    return (
        <div id={`popover-${appointment.id}`} className="relative" onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
            {children}
            {isOpen && (
                <div 
                    className="absolute z-20 w-64 bg-slate-900 border border-slate-700 rounded-lg shadow-2xl p-3 text-sm left-full ml-2 top-0 animate-fade-in"
                    // Add logic here to prevent it from going off-screen
                >
                    {isLoading ? (
                        <div className="flex items-center justify-center p-4">
                            <IconLoader className="animate-spin" />
                        </div>
                    ) : (
                        <div className="space-y-2">
                             <h4 className="font-bold text-slate-100">{data?.patientName}</h4>
                             {data?.diagnosticHypothesis && (
                                <div className="flex items-start gap-2">
                                    <IconClipboardCheck size={16} className="text-blue-400 mt-0.5"/>
                                    <p className="text-slate-300">{data.diagnosticHypothesis}</p>
                                </div>
                             )}
                             {data?.lastPainLevel !== null && (
                                <div className="flex items-start gap-2">
                                    <IconAlertTriangle size={16} className="text-amber-400 mt-0.5"/>
                                    <p className="text-slate-300">Última dor reportada: <span className="font-bold">{data?.lastPainLevel}/10</span></p>
                                </div>
                             )}
                             {data?.mainGoal && (
                                <div className="flex items-start gap-2">
                                    <IconCrosshair size={16} className="text-emerald-400 mt-0.5"/>
                                    <p className="text-slate-300">{data.mainGoal}</p>
                                </div>
                             )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AppointmentPopover;