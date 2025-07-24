import React from 'react';
import { ImageViewerModalProps } from '../types';
import { usePreventBodyScroll } from '../hooks/usePreventBodyScroll';
import { IconX } from './icons/IconComponents';

const ImageViewerModal: React.FC<ImageViewerModalProps> = ({ isOpen, onClose, image }) => {
    usePreventBodyScroll(isOpen);
    if (!isOpen || !image) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
            <div className="relative max-w-4xl max-h-[90vh]" onClick={e => e.stopPropagation()}>
                <img src={image.imageUrl} alt={image.caption || 'Imagem do exercício'} className="block max-h-[80vh] w-auto rounded-lg shadow-2xl" />
                {image.caption && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 p-4 text-center text-white">
                        <p>{image.caption}</p>
                    </div>
                )}
                 <button onClick={onClose} className="absolute -top-3 -right-3 p-1 rounded-full bg-slate-700 text-white hover:bg-slate-600 transition-colors" aria-label="Fechar imagem">
                    <IconX size={20} />
                </button>
            </div>
        </div>
    );
};

export default ImageViewerModal;