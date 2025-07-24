
import React, { useState, useEffect } from 'react';
import { useSettings } from '/hooks/useSettings.js';
import { ClinicSettings } from '/types.js';
import FormField from '/components/ui/FormField.js';
import Button from '/components/ui/Button.js';
import Skeleton from '/components/ui/Skeleton.js';

const ToggleSwitch: React.FC<{
    id: string;
    name: string;
    label: string;
    description: string;
    checked: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}> = ({ id, name, label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-3">
        <div>
            <label htmlFor={id} className="font-medium text-slate-300">{label}</label>
            <p className="text-sm text-slate-400 max-w-md">{description}</p>
        </div>
        <label htmlFor={id} className="flex items-center cursor-pointer">
            <div className="relative">
                <input
                    type="checkbox"
                    id={id}
                    name={name}
                    className="sr-only"
                    checked={checked}
                    onChange={onChange}
                />
                <div className="block bg-slate-600 w-14 h-8 rounded-full"></div>
                <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6 !bg-blue-500' : ''}`}></div>
            </div>
        </label>
    </div>
);


const SettingsPage: React.FC = () => {
    const { settings, saveSettings, isLoading, isSaving } = useSettings();
    const [editedSettings, setEditedSettings] = useState<Partial<ClinicSettings> | null>(null);

    useEffect(() => {
        if (settings) {
            setEditedSettings(settings);
        }
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSettings(prev => prev ? { ...prev, [e.target.name]: e.target.value } : null);
    };
    
    const handleToggleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditedSettings(prev => prev ? { ...prev, [e.target.name]: e.target.checked } : null);
    };

    const handleSave = async () => {
        if (editedSettings) {
            await saveSettings(editedSettings as ClinicSettings);
        }
    };
    
    if (isLoading || !editedSettings) {
        return (
            <div className="space-y-6 max-w-3xl mx-auto">
                <Skeleton className="h-10 w-1/2" />
                <div className="bg-slate-800 p-6 rounded-lg border border-slate-700 space-y-6">
                    <Skeleton className="h-8 w-1/3" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-3