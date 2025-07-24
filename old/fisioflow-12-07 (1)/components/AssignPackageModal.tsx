import React, { useState, useEffect } from 'react';
import { AssignPackageModalProps } from '../types';
import BaseModal from './ui/BaseModal';
import Button from './ui/Button';

const AssignPackageModal: React.FC<AssignPackageModalProps> = ({ isOpen, onClose, onAssign, packages, patientName }) => {
    const [selectedPackageId, setSelectedPackageId] = useState<string>('');

    useEffect(() => {
        if (packages.length > 0) {
            setSelectedPackageId(packages[0].id);
        }
    }, [packages]);

    if (!isOpen) return null;

    const handleAssign = () => {
        if (selectedPackageId) {
            onAssign(selectedPackageId);
        }
    };
    
    const footer = (
        <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleAssign} disabled={!selectedPackageId}>Vender Pacote</Button>
        </div>
    );
    
    const selectedPackage = packages.find(p => p.id === selectedPackageId);

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={`Vender Pacote para ${patientName}`} footer={footer}>
            <div className="space-y-4">
                <p className="text-sm text-slate-400">Selecione o pacote que deseja vender para o paciente. Uma transação financeira pendente será criada automaticamente.</p>
                
                <label htmlFor="packageId" className="block text-sm font-medium text-slate-300">Pacotes Disponíveis</label>
                <select 
                    id="packageId" 
                    value={selectedPackageId} 
                    onChange={e => setSelectedPackageId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-600 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                     {packages.map(pkg => (
                        <option key={pkg.id} value={pkg.id}>
                            {pkg.name} ({pkg.sessionCount} sessões) - R$ {pkg.price.toFixed(2)}
                        </option>
                    ))}
                </select>
                
                {selectedPackage && (
                    <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-md text-sm">
                        <p><strong className="text-slate-400">Preço:</strong> R$ {selectedPackage.price.toFixed(2)}</p>
                        <p><strong className="text-slate-400">Sessões:</strong> {selectedPackage.sessionCount}</p>
                    </div>
                )}
            </div>
        </BaseModal>
    );
};

export default AssignPackageModal;
