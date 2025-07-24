
import React, { useState, useEffect } from 'react';
import { Service, ServiceModalProps } from '/types.js';
import BaseModal from '/components/ui/BaseModal.js';
import FormField from '/components/ui/FormField.js';
import Button from '/components/ui/Button.js';

type ServiceErrors = {
    name?: string;
    price?: string;
};

const ServiceModal: React.FC<ServiceModalProps> = ({ isOpen, onClose, onSave, service }) => {
    const [editedService, setEditedService] = useState(service);
    const [errors, setErrors] = useState<ServiceErrors>({});

    useEffect(() => {
        setEditedService(service);
        setErrors({});
    }, [service]);

    if (!isOpen || !editedService) return null;

    const validate = (): boolean => {
        const newErrors: ServiceErrors = {};
        if (!editedService.name?.trim()) newErrors.name = 'O nome é obrigatório.';
        if (editedService.price === undefined || isNaN(editedService.price) || editedService.price < 0) newErrors.price = 'O preço é obrigatório e deve ser positivo.';
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };
    
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const isNumeric = name === 'price';
        setEditedService(prev => prev ? { ...prev, [name]: isNumeric ? parseFloat(value) || 0 : value } : null);
         if (errors[name as keyof ServiceErrors]) {
            setErrors(prev => ({...prev, [name]: undefined}));
        }
    };

    const handleSave = () => {
        if (validate()) {
            onSave(editedService as Service);
        }
    };
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar Serviço</Button>
        </div>
    );

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedService.id ? 'Editar Serviço' : 'Novo Serviço'} footer={footer}>
            <div className="space-y-4">
                <FormField
                    label="Nome do Serviço"
                    name="name"
                    id="name"
                    value={editedService.name || ''}
                    onChange={handleChange}
                    error={errors.name}
                    placeholder="Ex: Sessão de Fisioterapia Ortopédica"
                />
                <FormField
                    label="Preço (R$)"
                    name="price"
                    id="price"
                    type="number"
                    value={String(editedService.price || '')}
                    onChange={handleChange}
                    error={errors.price}
                    placeholder="150.00"
                    min="0"
                />
            </div>
        </BaseModal>
    );
};

export default ServiceModal;