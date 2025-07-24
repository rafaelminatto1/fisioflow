
import { useState } from 'react';

export const useModalState = <T,>(initialData: T | null = null) => {
    const [isOpen, setIsOpen] = useState(false);
    const [selectedData, setSelectedData] = useState<T | Partial<T> | null>(initialData);

    const openModal = (data?: T | Partial<T> | null) => {
        setSelectedData(data || initialData);
        setIsOpen(true);
    };

    const closeModal = () => {
        setIsOpen(false);
        setSelectedData(null);
    };

    return {
        isOpen,
        selectedData,
        openModal,
        closeModal,
        setSelectedData, // Expose setter for more complex scenarios if needed
    };
};
