import React, { useState, useEffect, useMemo } from 'react';
import { EditExerciseModalProps, Exercise, ExerciseImage, ExerciseImageCategory } from '../types.js';
import BaseModal from './ui/BaseModal.js';
import Button from './ui/Button.js';
import FormField from './ui/FormField.js';
import { IconTrash, IconUpload, IconPlus } from './icons/IconComponents.js';
import { useExerciseImages } from '../hooks/useExerciseImages.js';
import { useNotification } from '../hooks/useNotification.js';

type ExerciseErrors = {
  name?: string;
  description?: string;
  category?: string;
  bodyPart?: string;
  videoUrl?: string;
};

const exerciseCategories: Exercise['category'][] = ['Mobilização Neural', 'Cervical', 'Membros Superiores', 'Tronco', 'Membros Inferiores', 'Mobilidade Geral', 'Fortalecimento', 'Mobilidade', 'Cardio', 'Equilíbrio', 'Estabilização', 'Respiratório', 'Funcional'];
const bodyPartCategories: Exercise['bodyPart'][] = ['Nervos Periféricos', 'Pescoço', 'Ombro', 'Cotovelo', 'Punho e Mão', 'Coluna Torácica', 'Coluna Lombar', 'Abdômen', 'Quadril', 'Joelho', 'Perna', 'Tornozelo e Pé', 'Geral', 'Pulmões'];


export const EditExerciseModal: React.FC<EditExerciseModalProps> = ({ isOpen, onClose, onSave, onDelete, exercise }) => {
  const [editedExercise, setEditedExercise] = useState<Partial<Exercise> | null>(exercise);
  const [errors, setErrors] = useState<ExerciseErrors>({});
  const [isSaving, setIsSaving] = useState(false);
  const [urlType, setUrlType] = useState<'link' | 'upload'>('link');

  const { images: allImages = [], saveImage, deleteImage } = useExerciseImages();
  const { addNotification } = useNotification();
  
  const exerciseImages = useMemo(() => 
    (allImages || []).filter(img => img.exerciseId === exercise?.id).sort((a,b) => a.order - b.order),
  [allImages, exercise?.id]);

  useEffect(() => {
    setEditedExercise(exercise);
    if (exercise?.videoUrl && exercise.videoUrl.startsWith('blob:')) {
        setUrlType('upload');
    } else {
        setUrlType('link');
    }
    setErrors({});
  }, [exercise]);
  
  const videoPreviewKey = useMemo(() => {
      return editedExercise?.videoUrl ? editedExercise.videoUrl : 'no-video';
  }, [editedExercise?.videoUrl]);

  const isNew = !exercise || !('id' in exercise);

  const validate = (): boolean => {
    const newErrors: ExerciseErrors = {};
    if (!editedExercise?.name?.trim()) newErrors.name = 'O nome é obrigatório.';
    if (!editedExercise?.description?.trim()) newErrors.description = 'A descrição é obrigatória.';
    if (!editedExercise?.videoUrl?.trim()) {
        newErrors.videoUrl = 'A URL ou o upload do vídeo é obrigatório.';
    } else if (urlType === 'link' && !editedExercise.videoUrl.startsWith('blob:')) {
        try {
            const url = new URL(editedExercise.videoUrl);
            if (!url.protocol.startsWith('http')) throw new Error();
        } catch (_) {
            newErrors.videoUrl = 'URL do vídeo inválida.';
        }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    const isNumeric = ['difficulty', 'duration'].includes(name);
    setEditedExercise(prev => prev ? { ...prev, [name]: isNumeric ? Number(value) : value } : null);
    if (errors[name as keyof ExerciseErrors]) {
        setErrors(prev => ({...prev, [name]: undefined}));
    }
  };

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean);
    setEditedExercise(prev => prev ? { ...prev, tags } : null);
  };
  
    const handleAddProgression = () => {
        setEditedExercise(prev => {
            if (!prev) return null;
            const newProgression = { name: '', description: '' };
            return { ...prev, progressions: [...(prev.progressions || []), newProgression] };
        });
    };
    const handleProgressionChange = (index: number, field: 'name' | 'description', value: string) => {
        setEditedExercise(prev => {
            if (!prev) return null;
            const newProgressions = [...(prev.progressions || [])];
            newProgressions[index] = { ...newProgressions[index], [field]: value };
            return { ...prev, progressions: newProgressions };
        });
    };
    const handleRemoveProgression = (index: number) => {
        setEditedExercise(prev => {
            if (!prev) return null;
            return { ...prev, progressions: (prev.progressions || []).filter((_, i) => i !== index) };
        });
    };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) { // 50MB limit
        addNotification({type: 'error', title: 'Arquivo Grande', message: 'O arquivo de vídeo deve ter no máximo 50MB.'});
        return;
      }
      const objectURL = URL.createObjectURL(file);
      const videoElem = document.createElement('video');
      videoElem.src = objectURL;
      videoElem.onloadedmetadata = () => {
        setEditedExercise(prev => prev ? {
            ...prev,
            videoUrl: objectURL,
            duration: Math.round(videoElem.duration)
        } : null);
        // Do not revoke, let the browser handle it
      };
      videoElem.onerror = () => {
          setErrors(prev => ({...prev, videoUrl: 'Arquivo de vídeo inválido ou corrompido.'}));
      }
    }
  };
  
   const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isNew || !exercise.id) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        await saveImage({
          exerciseId: exercise.id!,
          imageUrl: reader.result as string,
          category: 'Execução',
          order: (exerciseImages.length || 0) + 1,
          caption: ''
        } as ExerciseImage);
      } catch (err) {
        // notification is handled by the hook
      }
    };
    reader.readAsDataURL(file);
  };

  const handleImageUpdate = (updatedImage: ExerciseImage) => {
    saveImage(updatedImage);
  };

  const handleImageDelete = (imageId: string) => {
    if(window.confirm('Tem certeza que deseja remover esta imagem?')) {
        deleteImage(imageId);
    }
  };


  const handleSave = async () => {
    if (!validate()) return;
    if (editedExercise) {
      setIsSaving(true);
      await onSave(editedExercise as Exercise);
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (editedExercise && 'id' in editedExercise && window.confirm(`Tem certeza que deseja excluir o exercício "${editedExercise.name}"? Esta ação removerá todas as prescrições e logs associados.`)) {
      onDelete(editedExercise.id!);
    }
  };

  const isFormInvalid = Object.values(errors).some(Boolean);

  if (!isOpen || !editedExercise) return null;
  
  const footer = (
       <>
          <div>
            {!isNew && (
              <Button variant="ghost" onClick={handleDelete} icon={<IconTrash/>}>
                Excluir
              </Button>
            )}
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} isLoading={isSaving} disabled={isSaving || isFormInvalid}>
              {isSaving ? 'Salvando...' : 'Salvar Exercício'}
            </Button>
          </div>
        </>
  );
  
  const imageCategories: ExerciseImageCategory[] = ['Posição Inicial', 'Execução', 'Posição Final', 'Anatomia', 'Equipamentos'];

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} title={isNew ? 'Novo Exercício' : 'Editar Exercício'} footer={footer}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
             <FormField
                label="Nome do Exercício" name="name" id="name"
                value={editedExercise.name || ''} onChange={handleChange}
                error={errors.name} containerClassName="md:col-span-2"
            />
             <FormField
                as="textarea" label="Descrição" name="description" id="description"
                value={editedExercise.description || ''} onChange={handleChange}
                rows={4} error={errors.description} containerClassName="md:col-span-2"
            />
            
            <FormField as="select" label="Categoria" name="category" id="category" value={editedExercise.category} onChange={handleChange}>
                {exerciseCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
            </FormField>
            <FormField as="select" label="Parte do Corpo" name="bodyPart" id="bodyPart" value={editedExercise.bodyPart} onChange={handleChange}>
                {bodyPartCategories.map(part => <option key={part} value={part}>{part}</option>)}
            </FormField>

            <div className="md:col-span-2 space-y-2">
                <label className="text-sm font-medium text-slate-300">Fonte do Vídeo</label>
                <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-slate-300"><input type="radio" name="urlType" value="link" checked={urlType === 'link'} onChange={() => setUrlType('link')} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-500"/> Link (YouTube)</label>
                    <label className="flex items-center gap-2 text-slate-300"><input type="radio" name="urlType" value="upload" checked={urlType === 'upload'} onChange={() => setUrlType('upload')} className="w-4 h-4 text-blue-600 bg-slate-700 border-slate-500"/> Upload</label>
                </div>
                {urlType === 'link' ? (
                     <FormField
                        label="URL do Vídeo (YouTube Embed)" name="videoUrl" id="videoUrl"
                        value={editedExercise.videoUrl?.startsWith('blob:') ? '' : editedExercise.videoUrl || ''} onChange={handleChange}
                        error={errors.videoUrl} placeholder="https://www.youtube.com/embed/VIDEO_ID"
                    />
                ) : (
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-slate-300">Arquivo de Vídeo</label>
                        <input type="file" accept="video/*" onChange={handleFileChange} className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-200 hover:file:bg-blue-600/40"/>
                        {errors.videoUrl && <p className="text-xs text-red-400 mt-1">{errors.videoUrl}</p>}
                    </div>
                )}
                 {editedExercise.videoUrl && (
                    <div key={videoPreviewKey} className="w-full aspect-video bg-black rounded-md overflow-hidden mt-2">
                        <video src={editedExercise.videoUrl} controls className="w-full h-full"></video>
                    </div>
                )}
            </div>
             <FormField
                label="Indicações" name="indications" id="indications"
                value={editedExercise.indications || ''} onChange={handleChange}
            />
             <FormField
                label="Contraindicações" name="contraindications" id="contraindications"
                value={editedExercise.contraindications || ''} onChange={handleChange}
            />
            
             <FormField
                label="Tags (separadas por vírgula)" name="tags" id="tags"
                value={(editedExercise.tags || []).join(', ')} onChange={handleTagsChange}
                placeholder="Ex: ciático, lombar, neurodinâmica"
            />
            <FormField as="select" label="Dificuldade" name="difficulty" id="difficulty" value={editedExercise.difficulty || 1} onChange={handleChange}>
                {[1,2,3,4,5].map(d => <option key={d} value={d}>{d}</option>)}
            </FormField>
             
            <div className="md:col-span-2 space-y-3">
                 <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Progressões</h3>
                {(editedExercise.progressions || []).map((prog, index) => (
                    <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-2 items-start">
                        <FormField label="" name={`prog-name-${index}`} id={`prog-name-${index}`} value={prog.name} onChange={e => handleProgressionChange(index, 'name', e.target.value)} placeholder="Nome da Progressão"/>
                        <FormField label="" name={`prog-desc-${index}`} id={`prog-desc-${index}`} value={prog.description} onChange={e => handleProgressionChange(index, 'description', e.target.value)} placeholder="Descrição"/>
                        <button onClick={() => handleRemoveProgression(index)} className="p-2 text-red-400 mt-6"><IconTrash size={16}/></button>
                    </div>
                ))}
                 <Button variant="ghost" size="sm" onClick={handleAddProgression} icon={<IconPlus/>}>Adicionar Progressão</Button>
            </div>
             {!isNew && (
                <div className="md:col-span-2 space-y-3">
                    <h3 className="text-sm font-semibold text-slate-300 pt-2 border-t border-slate-700">Imagens do Exercício</h3>
                     <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {exerciseImages.map(img => (
                            <div key={img.id} className="relative group">
                                 <img src={img.imageUrl} alt={img.caption || 'Exercise image'} className="w-full h-24 object-cover rounded-md border-2 border-slate-600"/>
                                <button onClick={() => handleImageDelete(img.id)} className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"><IconTrash size={12}/></button>
                                 <select 
                                    value={img.category} 
                                    onChange={(e) => handleImageUpdate({...img, category: e.target.value as ExerciseImageCategory})}
                                    className="absolute bottom-1 left-1 text-xs bg-black/60 text-white rounded px-1 py-0.5 border border-transparent focus:border-blue-500 focus:outline-none"
                                >
                                    {imageCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                </select>
                            </div>
                        ))}
                    </div>
                    <div>
                         <label htmlFor="image-upload" className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 cursor-pointer">
                            <IconUpload size={16}/> Adicionar Imagem
                         </label>
                         <input id="image-upload" type="file" accept="image/*" className="sr-only" onChange={handleAddImage}/>
                    </div>
                </div>
            )}
        </div>
    </BaseModal>
  );
};
