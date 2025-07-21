import React, { useState, useEffect } from 'react';
import { Equipment, User } from '../types';
import { IconX, IconTrash } from './icons/IconComponents';
import BaseModal from './ui/BaseModal';

interface EquipmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (equipment: Equipment) => void;
  onDelete: (equipmentId: string) => void;
  equipment: Equipment | Partial<Equipment> | null;
}

const EquipmentModal: React.FC<EquipmentModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  equipment,
}) => {
  const [formData, setFormData] = useState<Partial<Equipment>>({
    name: '',
    type: 'therapeutic',
    brand: '',
    model: '',
    serialNumber: '',
    purchaseDate: '',
    warrantyExpiry: '',
    status: 'active',
    location: '',
    condition: 'excellent',
    maintenanceSchedule: '',
    usageHours: 0,
    cost: 0,
    depreciationRate: 0,
    responsibleId: '',
    notes: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (equipment) {
      setFormData({
        ...equipment,
        purchaseDate: equipment.purchaseDate
          ? new Date(equipment.purchaseDate).toISOString().split('T')[0]
          : '',
        warrantyExpiry: equipment.warrantyExpiry
          ? new Date(equipment.warrantyExpiry).toISOString().split('T')[0]
          : '',
        maintenanceSchedule: equipment.maintenanceSchedule
          ? new Date(equipment.maintenanceSchedule).toISOString().split('T')[0]
          : '',
      });
    } else {
      setFormData({
        name: '',
        type: 'therapeutic',
        brand: '',
        model: '',
        serialNumber: '',
        purchaseDate: '',
        warrantyExpiry: '',
        status: 'active',
        location: '',
        condition: 'excellent',
        maintenanceSchedule: '',
        usageHours: 0,
        cost: 0,
        depreciationRate: 0,
        responsibleId: '',
        notes: '',
      });
    }
    setErrors({});
  }, [equipment, isOpen]);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Nome é obrigatório';
    }
    if (!formData.brand?.trim()) {
      newErrors.brand = 'Marca é obrigatória';
    }
    if (!formData.model?.trim()) {
      newErrors.model = 'Modelo é obrigatório';
    }
    if (!formData.serialNumber?.trim()) {
      newErrors.serialNumber = 'Número de série é obrigatório';
    }
    if (!formData.location?.trim()) {
      newErrors.location = 'Localização é obrigatória';
    }
    if (!formData.purchaseDate) {
      newErrors.purchaseDate = 'Data de compra é obrigatória';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const equipmentData: Equipment = {
      id: formData.id || crypto.randomUUID(),
      name: formData.name!,
      type: formData.type!,
      brand: formData.brand!,
      model: formData.model!,
      serialNumber: formData.serialNumber!,
      purchaseDate: formData.purchaseDate!,
      warrantyExpiry: formData.warrantyExpiry,
      status: formData.status!,
      location: formData.location!,
      condition: formData.condition!,
      maintenanceSchedule: formData.maintenanceSchedule!,
      usageHours: formData.usageHours || 0,
      cost: formData.cost || 0,
      depreciationRate: formData.depreciationRate,
      responsibleId: formData.responsibleId,
      notes: formData.notes,
      tenantId: formData.tenantId || '',
    };

    onSave(equipmentData);
    onClose();
  };

  const handleDelete = () => {
    if (equipment?.id && window.confirm('Tem certeza que deseja excluir este equipamento?')) {
      onDelete(equipment.id);
      onClose();
    }
  };

  const isEditing = !!equipment?.id;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={isEditing ? 'Editar Equipamento' : 'Novo Equipamento'}>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Nome *
            </label>
            <input
              type="text"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.name ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              placeholder="Ex: Aparelho de Ultrassom"
            />
            {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Tipo
            </label>
            <select
              value={formData.type || 'therapeutic'}
              onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="therapeutic">Terapêutico</option>
              <option value="diagnostic">Diagnóstico</option>
              <option value="support">Suporte</option>
              <option value="technology">Tecnologia</option>
            </select>
          </div>

          {/* Marca */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Marca *
            </label>
            <input
              type="text"
              value={formData.brand || ''}
              onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.brand ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              placeholder="Ex: Philips"
            />
            {errors.brand && <p className="mt-1 text-sm text-red-500">{errors.brand}</p>}
          </div>

          {/* Modelo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Modelo *
            </label>
            <input
              type="text"
              value={formData.model || ''}
              onChange={(e) => setFormData({ ...formData, model: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.model ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              placeholder="Ex: HDI 5000"
            />
            {errors.model && <p className="mt-1 text-sm text-red-500">{errors.model}</p>}
          </div>

          {/* Número de Série */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Número de Série *
            </label>
            <input
              type="text"
              value={formData.serialNumber || ''}
              onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.serialNumber ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              placeholder="Ex: SN123456789"
            />
            {errors.serialNumber && <p className="mt-1 text-sm text-red-500">{errors.serialNumber}</p>}
          </div>

          {/* Localização */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Localização *
            </label>
            <input
              type="text"
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.location ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
              placeholder="Ex: Sala 1"
            />
            {errors.location && <p className="mt-1 text-sm text-red-500">{errors.location}</p>}
          </div>

          {/* Data de Compra */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Data de Compra *
            </label>
            <input
              type="date"
              value={formData.purchaseDate || ''}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className={`w-full bg-slate-800 border ${
                errors.purchaseDate ? 'border-red-500' : 'border-slate-700'
              } rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none`}
            />
            {errors.purchaseDate && <p className="mt-1 text-sm text-red-500">{errors.purchaseDate}</p>}
          </div>

          {/* Garantia */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Vencimento da Garantia
            </label>
            <input
              type="date"
              value={formData.warrantyExpiry || ''}
              onChange={(e) => setFormData({ ...formData, warrantyExpiry: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Status
            </label>
            <select
              value={formData.status || 'active'}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="active">Ativo</option>
              <option value="maintenance">Manutenção</option>
              <option value="repair">Reparo</option>
              <option value="inactive">Inativo</option>
              <option value="disposed">Descartado</option>
            </select>
          </div>

          {/* Condição */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Condição
            </label>
            <select
              value={formData.condition || 'excellent'}
              onChange={(e) => setFormData({ ...formData, condition: e.target.value as any })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="excellent">Excelente</option>
              <option value="good">Boa</option>
              <option value="fair">Regular</option>
              <option value="poor">Ruim</option>
              <option value="critical">Crítica</option>
            </select>
          </div>

          {/* Próxima Manutenção */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Próxima Manutenção
            </label>
            <input
              type="date"
              value={formData.maintenanceSchedule || ''}
              onChange={(e) => setFormData({ ...formData, maintenanceSchedule: e.target.value })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            />
          </div>

          {/* Custo */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Custo (R$)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.cost || ''}
              onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0.00"
            />
          </div>

          {/* Horas de Uso */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Horas de Uso
            </label>
            <input
              type="number"
              value={formData.usageHours || ''}
              onChange={(e) => setFormData({ ...formData, usageHours: parseInt(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="0"
            />
          </div>

          {/* Taxa de Depreciação */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Taxa de Depreciação (% ao ano)
            </label>
            <input
              type="number"
              step="0.1"
              value={formData.depreciationRate || ''}
              onChange={(e) => setFormData({ ...formData, depreciationRate: parseFloat(e.target.value) || 0 })}
              className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="10.0"
            />
          </div>
        </div>

        {/* Observações */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1">
            Observações
          </label>
          <textarea
            value={formData.notes || ''}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
            className="w-full bg-slate-800 border border-slate-700 rounded-md px-3 py-2 text-slate-100 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
            placeholder="Observações adicionais sobre o equipamento..."
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-700">
          <div>
            {isEditing && (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
              >
                <IconTrash size={16} />
                Excluir
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-600 text-slate-300 rounded-md hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {isEditing ? 'Atualizar' : 'Criar'}
            </button>
          </div>
        </div>
      </form>
    </BaseModal>
  );
};

export default EquipmentModal;