import React from 'react';
import Joyride, { Step } from 'react-joyride';

interface OnboardingTourProps {
  run: boolean;
  setRun: (run: boolean) => void;
}

const OnboardingTour: React.FC<OnboardingTourProps> = ({ run, setRun }) => {
  const steps: Step[] = [
    {
      target: '.sidebar-nav', // Adicionaremos esta classe na Sidebar
      content:
        'Esta é a barra de navegação principal, onde você pode acessar todos os módulos do sistema.',
      title: 'Navegação Principal',
      placement: 'right',
    },
    {
      target: '.header-user-menu', // Adicionaremos esta classe no Header
      content:
        'Aqui você pode ver suas notificações e acessar as informações do seu perfil.',
      title: 'Menu do Usuário',
      placement: 'bottom-end',
    },
    {
      target: '.new-patient-button', // Adicionaremos esta classe no botão
      content: 'Clique aqui para adicionar um novo paciente ao sistema.',
      title: 'Adicionar Novo Paciente',
      placement: 'bottom-start',
    },
    {
      target: '.command-palette-button', // Adicionaremos um botão/indicador
      content:
        'Pressione Ctrl+K (ou Cmd+K) a qualquer momento para abrir a paleta de comandos e navegar rapidamente.',
      title: 'Busca Rápida',
      placement: 'bottom',
    },
  ];

  return (
    <Joyride
      run={run}
      steps={steps}
      continuous
      showProgress
      showSkipButton
      callback={(data) => {
        if (data.status === 'finished' || data.status === 'skipped') {
          setRun(false);
        }
      }}
      styles={{
        options: {
          arrowColor: '#1e293b',
          backgroundColor: '#1e293b',
          primaryColor: '#3b82f6',
          textColor: '#f1f5f9',
          overlayColor: 'rgba(15, 23, 42, 0.8)',
        },
        buttonClose: {
          color: '#f1f5f9',
        },
        buttonNext: {
          backgroundColor: '#3b82f6',
        },
        buttonBack: {
          color: '#f1f5f9',
        },
      }}
    />
  );
};

export default OnboardingTour;
