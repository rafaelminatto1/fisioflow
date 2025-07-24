import React, { useState, useEffect } from 'react';
import { Project, ProjectModalProps, User } from '../types';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import Button from './ui/Button';

const ProjectModal: React.FC<ProjectModalProps> = ({ isOpen, onClose, onSave, project, users }) => {
    const [editedProject, setEditedProject] = useState(project);

    useEffect(() => setEditedProject(project), [project]);

    if (!isOpen || !editedProject) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setEditedProject(p => p ? ({...p, [e.target.name]: e.target.value}) : null);
    };

    const handleSave = () => {
        if (editedProject.name?.trim() && editedProject.ownerId) {
            onSave(editedProject as Project);
        }
    };

    const footer = <div className="flex justify-end gap-3 w-full"><Button variant="secondary" onClick={onClose}>Cancelar</Button><Button onClick={handleSave}>Salvar Projeto</Button></div>;

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} title={editedProject.id ? "Editar Projeto" : "Novo Projeto"} footer={footer}>
            <div className="space-y-4">
                <FormField label="Nome do Projeto" name="name" id="name" value={editedProject.name || ''} onChange={handleChange} />
                <FormField as="textarea" label="Descrição" name="description" id="description" value={editedProject.description || ''} onChange={handleChange} rows={3} />
                <FormField as="select" label="Responsável" name="ownerId" id="ownerId" value={editedProject.ownerId || ''} onChange={handleChange}>
                    <option value="">Selecione...</option>
                    {users.filter(u => u.role !== 'paciente').map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </FormField>
            </div>
        </BaseModal>
    );
};
export default ProjectModal;