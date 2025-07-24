import React, { useState, useEffect } from 'react';
import { Package, PackageModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import Button from './ui/Button';

type PackageErrors = {
    name?: string;
    serviceId?: string;
    sessionCount?: string;
    price?: string;
};

const PackageModal: React.FC<PackageModalProps> = ({ isOpen, onClose, onSave, pkg, services }) => {
    const [editedPackage, setEditedPackage] = useState(pkg);
    const [errors, setErrors] = useState<PackageErrors>({});

    useEffect(() => {
        setEditedPackage(pkg);
        setErrors({});
    }, [pkg]);

    if (!isOpen || !editedPackage) return null;

    const validate = (): boolean => {
        const newErrors: PackageErrors = {};
        if (!editedPackage.name?.trim()) newErrors.name = 'O nome é obrigatório.';
        if (!editedPackage.serviceId) newErrors.serviceId = 'Selecione um serviço.';
        if (!editedPackage.sessionCount || editedPackage.sessionCount <= 0) newErrors.sessionCount = 'Deve haver ao menos 1 sessão.';
        if (editedPackage.price === undefined || isNaN(editedPackage.price) || editedPackage.price < 0) newErrors.price = 'O preço é obrigatório e deve ser positivo.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        const isNumeric = ['price', 'sessionCount'].includes(name);
        setEditedPackage(prev => prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null);
         if (errors[name as keyof PackageErrors]) {
            setErrors(prev => ({...prev, [name]: undefined}));
        }
    };

    const handleSave = () => {
        if (validate()) {
            onSave(editedPackage as Package);
        }
    };
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Pacote</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedPackage.id ? 'Editar Pacote' : 'Novo Pacote'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome do Pacote"
                    name="name"
                    id="name"
                    value={editedPackage.name || ''}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Ex: 10 Sessões de Fisioterapia"
                />
                 <FormField
                    as="select"
                    label="Serviço Incluído"
                    name="serviceId"
                    id="serviceId"
                    value={editedPackage.serviceId || ''}
                    onChange={handleChange}
                    error={errors.serviceId}
                >
                    <option value="" disabled>Selecione um serviço...</option>
                    {services.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </FormField>
                <div className="grid grid-cols-2 gap-4">
                     <FormField
                        label="Nº de Sessões"
                        name="sessionCount"
                        id="sessionCount"
                        type="number"
                        value={String(editedPackage.sessionCount || '')}
                        onChange={handleChange}
                        error={errors.sessionCount}
                        placeholder="10"
                        min="1"
                    />
                    <FormField
                        label="Preço do Pacote (R$)"
                        name="price"
                        id="price"
                        type="number"
                        value={String(editedPackage.price || '')}
                        onChange={handleChange}
                        error={errors.price}
                        placeholder="1200.00"
                        min="0"
                    />
                </div>
            </div>
        </BaseModal>
    );
};

export default PackageModal;
