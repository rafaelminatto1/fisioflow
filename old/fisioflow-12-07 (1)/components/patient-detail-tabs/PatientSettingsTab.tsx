import React, { useState, useEffect } from 'react';
import { Patient, FisioNotificationSettings } from '../../types';
import Button from '../ui/Button';

interface PatientSettingsTabProps {
    patient: Patient;
    onSave: (updatedPatient: Patient) => void;
}

const ToggleSwitch: React.FC<{ label: string; checked: boolean; onChange: (checked: boolean) => void; }> = ({ label, checked, onChange }) => (
    <div className="flex items-center justify-between py-2">
        <span className="text-sm font-medium text-slate-300">{label}</span>
        <label className="flex items-center cursor-pointer">
            <div className="relative">
                <input type="checkbox" className="sr-only" checked={checked} onChange={e => onChange(e.target.checked)} />
                <div className="block bg-slate-600 w-14 h-8 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6 !bg-blue-500' : ''}`}></div>
            </div>
        </label>
    </div>
);

const ChannelSelector: React.FC<{
    channels: { channel: 'in_app' | 'email' | 'sms', enabled: boolean }[];
    onChange: (channel: 'in_app' | 'email' | 'sms', enabled: boolean) => void;
}> = ({ channels, onChange }) => (
    <div className="flex items-center gap-4">
        {channels.map(({ channel, enabled }) => (
            <label key={channel} className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                <input
                    type="checkbox"
                    checked={enabled}
                    onChange={(e) => onChange(channel, e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-700 border-slate-500 text-blue-500 focus:ring-blue-600"
                />
                {channel === 'in_app' ? 'No App' : channel === 'email' ? 'Email' : 'SMS'}
            </label>
        ))}
    </div>
);

export const PatientSettingsTab: React.FC<PatientSettingsTabProps> = ({ patient, onSave }) => {
    const [settings, setSettings] = useState<FisioNotificationSettings>(patient.notificationSettings);

    useEffect(() => {
        setSettings(patient.notificationSettings);
    }, [patient]);

    const handleSettingChange = <T extends keyof FisioNotificationSettings>(
        section: T,
        field: keyof FisioNotificationSettings[T],
        value: any
    ) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [field]: value
            }
        }));
    };
    
    const handleChannelChange = (section: 'appointmentReminders' | 'exerciseReminders' | 'medicationReminders', channel: 'in_app' | 'email' | 'sms', enabled: boolean) => {
         setSettings(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                channels: prev[section].channels.map(c => c.channel === channel ? {...c, enabled} : c)
            }
        }));
    };
    
     const addReminderTime = () => {
        const newTimes = [...settings.exerciseReminders.times, '09:00'];
        handleSettingChange('exerciseReminders', 'times', newTimes);
    };

    const removeReminderTime = (index: number) => {
        const newTimes = settings.exerciseReminders.times.filter((_, i) => i !== index);
        handleSettingChange('exerciseReminders', 'times', newTimes);
    };

    const handleReminderTimeChange = (index: number, value: string) => {
        const newTimes = [...settings.exerciseReminders.times];
        newTimes[index] = value;
        handleSettingChange('exerciseReminders', 'times', newTimes);
    };

    const handleSaveSettings = () => {
        onSave({ ...patient, notificationSettings: settings });
    };

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <ToggleSwitch
                    label="Lembretes de Consultas"
                    checked={settings.appointmentReminders.enabled}
                    onChange={checked => handleSettingChange('appointmentReminders', 'enabled', checked)}
                />
                {settings.appointmentReminders.enabled && (
                    <div className="pl-4 mt-2 space-y-2">
                        <p className="text-sm text-slate-400">Enviar lembretes 24 horas e 1 hora antes da consulta.</p>
                        <ChannelSelector channels={settings.appointmentReminders.channels} onChange={(ch, en) => handleChannelChange('appointmentReminders', ch, en)}/>
                    </div>
                )}
            </div>

             <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <ToggleSwitch
                    label="Lembretes de Exercícios"
                    checked={settings.exerciseReminders.enabled}
                    onChange={checked => handleSettingChange('exerciseReminders', 'enabled', checked)}
                />
                 {settings.exerciseReminders.enabled && (
                    <div className="pl-4 mt-2 space-y-3">
                         <div className="space-y-2">
                             {settings.exerciseReminders.times.map((time, index) => (
                                <div key={index} className="flex items-center gap-2">
                                    <input
                                        type="time"
                                        value={time}
                                        onChange={e => handleReminderTimeChange(index, e.target.value)}
                                        className="bg-slate-700 border border-slate-600 rounded-md px-2 py-1 text-slate-100"
                                    />
                                     <button onClick={() => removeReminderTime(index)} className="text-red-400 text-xs">Remover</button>
                                </div>
                            ))}
                            <Button variant="ghost" size="sm" onClick={addReminderTime}>Adicionar horário</Button>
                         </div>
                        <ChannelSelector channels={settings.exerciseReminders.channels} onChange={(ch, en) => handleChannelChange('exerciseReminders', ch, en)}/>
                    </div>
                )}
            </div>

            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
                <ToggleSwitch
                    label="Lembretes de Medicação"
                    checked={settings.medicationReminders.enabled}
                    onChange={checked => handleSettingChange('medicationReminders', 'enabled', checked)}
                />
                {settings.medicationReminders.enabled && (
                    <div className="pl-4 mt-2 space-y-2">
                         <p className="text-sm text-slate-400">Os lembretes serão enviados nos horários definidos em cada medicação.</p>
                         <ChannelSelector channels={settings.medicationReminders.channels} onChange={(ch, en) => handleChannelChange('medicationReminders', ch, en)}/>
                    </div>
                )}
            </div>

            <div className="flex justify-end mt-4">
                <Button onClick={handleSaveSettings}>Salvar Configurações</Button>
            </div>
        </div>
    );
};