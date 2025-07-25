import React, { useState, useEffect } from 'react';
import { StaffModalProps, User, UserRole } from '../types';
import { useAuth } from '../hooks/useAuth';
import { IconTrash } from './icons/IconComponents';
import BaseModal from './ui/BaseModal';
import FormField from './ui/FormField';
import { Button } from './ui/Button';

type UserErrors = {
  name?: string;
  email?: string;
};

const StaffModal: React.FC<StaffModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  user: userToEdit,
}) => {
  const { user: loggedInUser } = useAuth();
  const [editedUser, setEditedUser] = useState<Partial<User> | null>(
    userToEdit
  );
  const [errors, setErrors] = useState<UserErrors>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setEditedUser(userToEdit);
    setErrors({});
  }, [userToEdit]);

  const validate = (): boolean => {
    const newErrors: UserErrors = {};
    if (!editedUser?.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!editedUser?.email?.trim()) {
      newErrors.email = 'O email é obrigatório.';
    } else if (!/\S+@\S+\.\S+/.test(editedUser.email)) {
      newErrors.email = 'O formato do email é inválido.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setEditedUser((prev) => (prev ? { ...prev, [name]: value } : null));
    if (errors[name as keyof UserErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSave = () => {
    if (!validate()) return;
    if (editedUser) {
      setIsSaving(true);
      setTimeout(() => {
        onSave(editedUser as User);
        setIsSaving(false);
      }, 300);
    }
  };

  const handleDelete = () => {
    if (
      editedUser &&
      'id' in editedUser &&
      window.confirm(
        `Tem certeza que deseja excluir o usuário "${editedUser.name}"?`
      )
    ) {
      onDelete(editedUser.id!);
    }
  };

  const isNew = !userToEdit || !('id' in userToEdit);
  const isEditingSelf = loggedInUser?.id === editedUser?.id;

  if (!isOpen || !editedUser) return null;

  const renderFooter = () => (
    <>
      <div>
        {!isNew && !isEditingSelf && (
          <Button variant="ghost" onClick={handleDelete} icon={<IconTrash />}>
            Excluir
          </Button>
        )}
        {!isNew && isEditingSelf && (
          <p className="text-xs text-slate-500">Você não pode se excluir.</p>
        )}
      </div>
      <div className="flex items-center space-x-3">
        <Button variant="secondary" onClick={onClose}>
          Cancelar
        </Button>
        <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving}>
          {isSaving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>
    </>
  );

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={isNew ? 'Novo Membro da Equipe' : 'Editar Membro'}
      footer={renderFooter()}
    >
      <FormField
        label="Nome"
        name="name"
        id="name"
        value={editedUser.name || ''}
        onChange={handleChange}
        error={errors.name}
      />
      <FormField
        label="Email"
        name="email"
        id="email"
        type="email"
        value={editedUser.email || ''}
        onChange={handleChange}
        error={errors.email}
      />
      <FormField
        as="select"
        label="Cargo"
        name="role"
        id="role"
        value={editedUser.role}
        onChange={handleChange}
        disabled={isEditingSelf}
      >
        <option value={UserRole.ADMIN}>Administrador</option>
        <option value={UserRole.FISIOTERAPEUTA}>Fisioterapeuta</option>
        <option value={UserRole.ESTAGIARIO}>Estagiário</option>
      </FormField>
      {isEditingSelf && (
        <p className="-mt-2 text-xs text-slate-400">
          Você não pode alterar seu próprio cargo.
        </p>
      )}
    </BaseModal>
  );
};

export default StaffModal;
