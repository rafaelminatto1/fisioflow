import React from 'react';
import { useAuth } from '../hooks/useAuth';
import {
  IconStethoscope,
  IconClipboardList,
  IconUsers,
  IconChartPie,
} from './icons/IconComponents';

const FeatureCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
}> = ({ icon, title, description }) => (
  <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
    <div className="mb-3 flex items-center gap-4">
      <div className="text-blue-400">{icon}</div>
      <h3 className="text-xl font-bold text-slate-100">{title}</h3>
    </div>
    <p className="text-slate-300">{description}</p>
  </div>
);

const HomePage: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="animate-fade-in space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-50">
          Bem-vindo(a) ao FisioFlow, {user?.name.split(' ')[0]}!
        </h1>
        <p className="mt-2 text-lg text-slate-300">
          Sua plataforma completa para gestão de clínica de fisioterapia.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <FeatureCard
          icon={<IconClipboardList size={32} />}
          title="Gestão de Pacientes e Tarefas"
          description="Acesse e gerencie prontuários de pacientes, planos de tratamento e tarefas diárias de forma centralizada e eficiente."
        />
        <FeatureCard
          icon={<IconUsers size={32} />}
          title="Portal do Paciente e Exercícios"
          description="Ofereça aos seus pacientes um portal exclusivo para acompanhar seus exercícios, registrar progresso e comunicar-se com a clínica."
        />
        <FeatureCard
          icon={<IconStethoscope size={32} />}
          title="Mentoria com IA"
          description="Utilize o poder da IA para analisar anotações de progresso, receber feedback e aprimorar a qualidade do atendimento e dos registros clínicos."
        />
        <FeatureCard
          icon={<IconChartPie size={32} />}
          title="Relatórios e Análises"
          description="Obtenha insights valiosos sobre a produtividade da equipe, finanças da clínica e popularidade dos tratamentos com relatórios visuais."
        />
      </div>

      <div className="rounded-lg border border-dashed border-slate-700 bg-slate-800/50 p-6">
        <h3 className="text-xl font-bold text-slate-100">
          Explorando o Ambiente de Demonstração
        </h3>
        <p className="mt-2 text-slate-300">
          Este é um protótipo interativo construído com React e TypeScript,
          demonstrando os conceitos de uma aplicação de gestão clínica. Os dados
          são salvos localmente no seu navegador e não são compartilhados.
          Sinta-se à vontade para explorar as diferentes seções, como o{' '}
          <span className="font-semibold text-blue-400">Dashboard</span>,{' '}
          <span className="font-semibold text-blue-400">Projetos (Kanban)</span>
          , e a{' '}
          <span className="font-semibold text-blue-400">
            Biblioteca de Exercícios
          </span>
          .
        </p>
      </div>
    </div>
  );
};

export default HomePage;
