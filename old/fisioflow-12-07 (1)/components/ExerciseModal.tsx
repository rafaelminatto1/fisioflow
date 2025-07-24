
import React, { useMemo, useState } from 'react';
import { ExerciseModalProps, ExerciseImage } from '/types.js';
import { IconEye, IconVideo, IconFileText } from '/components/icons/IconComponents.js';
import VideoPlayer from '/components/VideoPlayer.js';
import { useExerciseImages } from '/hooks/useExerciseImages.js';
import ImageViewerModal from '/components/ImageViewerModal.js';
import BaseModal from '/components/ui/BaseModal.js';
import Button from '/components/ui/Button.js';

const ExerciseModal: React.FC<ExerciseModalProps> = ({ isOpen, onClose, exercise }) => {
    const { images: allImages = [] } = useExerciseImages();
    const [isImageViewerOpen, setIsImageViewerOpen] = useState(false);
    const [selectedImage, setSelectedImage] = useState<ExerciseImage | null>(null);
    const [activeTab, setActiveTab] = useState<'video' | 'description'>('video');

    const exerciseImages = useMemo(() => 
        allImages.filter(img => img.exerciseId === exercise?.id).sort((a,b) => a.order - b.order),
        [allImages, exercise?.id]
    );

    const handleOpenImage = (image: ExerciseImage) => {
        setSelectedImage(image);
        setIsImageViewerOpen(true);
    };

    if (!isOpen || !exercise) return null;

    const TabButton: React.FC<{ tabId: 'video' | 'description', label: string, icon: React.ReactNode }> = ({ tabId, label, icon }) => (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-all ${
                activeTab === tabId ? 'text-blue-400 border-blue-400' : 'text-slate-400 border-transparent hover:text-white'
            }`}
        >
            {icon}
            {label}
        </button>
    );
    
    const footer = (
        <div className="w-full flex justify-end">
            <Button onClick={onClose}>Fechar</Button>
        </div>
    );

    return (
        <>
            <BaseModal
                isOpen={isOpen}
                onClose={onClose}
                title={exercise.name}
                footer={footer}
            >
                 <div className="space-y-4">
                     <div className="border-b border-slate-700 -mt-2">
                        <nav className="flex -mb-px space-x-2">
                            <TabButton tabId="video" label="Vídeo" icon={<IconVideo size={16}/>} />
                            <TabButton tabId="description" label="Descrição" icon={<IconFileText size={16}/>} />
                        </nav>
                    </div>
                    
                    {activeTab === 'video' && <VideoPlayer exercise={exercise} />}
                    
                    {activeTab === 'description' && (
                        <div className="space-y-4 py-2">
                            <div className="space-y-1">
                                <h3 className="font-semibold text-slate-200">Descrição</h3>
                                <p className="text-slate-300 whitespace-pre-wrap">{exercise.description}</p>
                            </div>
                             {exercise.indications && (
                                 <div className="space-y-1">
                                    <h3 className="font-semibold text-emerald-300">Indicações</h3>
                                    <p className="text-slate-300 whitespace-pre-wrap">{exercise.indications}</p>
                                </div>
                            )}
                            {exercise.contraindications && (
                                 <div className="space-y-1">
                                    <h3 className="font-semibold text-red-400">Contraindicações</h3>
                                    <p className="text-slate-300 whitespace-pre-wrap">{exercise.contraindications}</p>
                                </div>
                            )}
                            {exercise.progressions && exercise.progressions.length > 0 && (
                                <div className="space-y-2 pt-2">
                                    <h3 className="font-semibold text-blue-300">Progressões</h3>
                                    <ul className="space-y-2">
                                        {exercise.progressions.map((prog, index) => (
                                            <li key={index} className="p-2 bg-slate-900/50 rounded-md border-l-2 border-slate-600">
                                                <p className="font-semibold text-slate-300 text-sm">{prog.name}</p>
                                                <p className="text-xs text-slate-400">{prog.description}</p>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}


                    {exerciseImages.length > 0 && (
                        <div className="space-y-2 pt-4 border-t border-slate-700">
                            <h3 className="font-semibold text-slate-200">Imagens e Diagramas</h3>
                            <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                                {exerciseImages.map(image => (
                                    <div key={image.id} className="relative group cursor-pointer" onClick={() => handleOpenImage(image)}>
                                        <img src={image.imageUrl} alt={image.caption || 'Imagem do exercício'} className="w-full h-24 object-cover rounded-md border-2 border-slate-600 group-hover:border-blue-500 transition-colors"/>
                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <IconEye className="text-white"/>
                                        </div>
                                        <p className="text-xs text-center text-slate-400 mt-1">{image.category}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700">
                        <span className="text-sm font-medium bg-blue-900/50 text-blue-300 px-3 py-1 rounded-full">{exercise.category}</span>
                        <span className="text-sm font-medium bg-emerald-900/50 text-emerald-300 px-3 py-1 rounded-full">{exercise.bodyPart}</span>
                        {exercise.difficulty && <span className="text-sm font-medium bg-amber-900/50 text-amber-300 px-3 py-1 rounded-full">Dificuldade: {exercise.difficulty}/5</span>}
                         {(exercise.tags || []).map(tag => (
                            <span key={tag} className="text-sm font-medium bg-slate-700/80 text-slate-300 px-3 py-1 rounded-full">#{tag}</span>
                        ))}
                    </div>
                </div>
            </BaseModal>

            {isImageViewerOpen && (
                <ImageViewerModal
                    isOpen={isImageViewerOpen}
                    onClose={() => setIsImageViewerOpen(false)}
                    image={selectedImage}
                />
            )}
        </>
    );
};

export default ExerciseModal;