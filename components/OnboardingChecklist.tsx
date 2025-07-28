import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

import { IconCheckCircle, IconCircle, IconX } from './icons/IconComponents';

const checklistItems = [
  {
    id: 'add_patient',
    text: 'Cadastre seu primeiro paciente',
    link: '/pacientes',
  },
  {
    id: 'add_exercise',
    text: 'Crie seu primeiro exercício personalizado',
    link: '/exercicios',
  },
  {
    id: 'explore_protocols',
    text: 'Explore a biblioteca de Protocolos Clínicos',
    link: '/protocolos',
  },
  {
    id: 'create_task',
    text: 'Organize seu dia criando uma tarefa',
    link: '/projetos',
  },
];

const OnboardingChecklist: React.FC = () => {
  const [completedItems, setCompletedItems] = useState<string[]>([]);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const storedCompleted = localStorage.getItem(
      'onboardingChecklistCompleted'
    );
    if (storedCompleted) {
      setCompletedItems(JSON.parse(storedCompleted));
    }
    const storedVisibility = localStorage.getItem('onboardingChecklistVisible');
    if (storedVisibility === 'false') {
      setIsVisible(false);
    }
  }, []);

  const handleToggleItem = (id: string) => {
    const newCompletedItems = completedItems.includes(id)
      ? completedItems.filter((item) => item !== id)
      : [...completedItems, id];
    setCompletedItems(newCompletedItems);
    localStorage.setItem(
      'onboardingChecklistCompleted',
      JSON.stringify(newCompletedItems)
    );
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('onboardingChecklistVisible', 'false');
  };

  const progress = (completedItems.length / checklistItems.length) * 100;

  if (!isVisible) {
    return null;
  }

  return (
    <div className="animate-fade-in-down mb-6 rounded-lg border border-slate-700 bg-slate-800 p-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-100">
            Primeiros Passos no FisioFlow
          </h2>
          <p className="mt-1 text-slate-300">
            Siga este guia para começar a usar os recursos mais importantes.
          </p>
        </div>
        <button
          onClick={handleDismiss}
          className="text-slate-400 transition-colors hover:text-slate-200"
        >
          <IconX size={20} />
        </button>
      </div>

      <div className="mt-4">
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-300">
            {completedItems.length} de {checklistItems.length} concluídos
          </span>
          <span className="text-sm font-semibold text-blue-400">
            {Math.round(progress)}%
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-slate-700">
          <div
            className="h-2 rounded-full bg-blue-500"
            style={{
              width: `${progress}%`,
              transition: 'width 0.3s ease-in-out',
            }}
          ></div>
        </div>
      </div>

      <ul className="mt-5 space-y-3">
        {checklistItems.map((item) => (
          <li key={item.id} className="flex items-center gap-3">
            <button
              onClick={() => handleToggleItem(item.id)}
              className="flex-shrink-0"
            >
              {completedItems.includes(item.id) ? (
                <IconCheckCircle className="text-emerald-400" size={22} />
              ) : (
                <IconCircle className="text-slate-500" size={22} />
              )}
            </button>
            <Link
              to={item.link}
              className={`text-slate-200 transition-colors hover:text-blue-400 ${completedItems.includes(item.id) ? 'text-slate-400 line-through' : ''}`}
            >
              {item.text}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default OnboardingChecklist;
