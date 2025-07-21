import React from 'react';
import NotebookTree from './NotebookTree';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import {
  IconHome,
  IconDashboard,
  IconClipboardList,
  IconUsers,
  IconStethoscope,
  IconLogout,
  IconAddressBook,
  IconCalendar,
  IconActivity,
  IconDollarSign,
  IconChartPie,
  IconBriefcase,
  IconUserShield,
  IconBuilding,
  IconServer,
  IconMessageCircle,
  IconMegaphone,
  IconShoppingCart,
  IconLifeBuoy,
  IconUsersGroup,
  IconBook,
  IconScience,
  IconTrendingUp,
  IconChartBar,
} from './icons/IconComponents';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  isActive: boolean;
  onClick: () => void;
  isMobile?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({
  icon,
  label,
  isActive,
  onClick,
  isMobile,
}) => {
  if (isMobile) {
    return (
      <button
        onClick={onClick}
        className={`flex h-full w-full flex-col items-center justify-center text-xs font-medium transition-colors ${
          isActive ? 'text-blue-400' : 'text-slate-400 hover:text-white'
        }`}
      >
        {icon}
        <span className="mt-1">{label}</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={`flex w-full items-center rounded-md px-3 py-2 text-sm font-medium transition-colors ${
        isActive
          ? 'bg-blue-600 text-white'
          : 'text-slate-300 hover:bg-slate-700 hover:text-white'
      }`}
    >
      <span className="mr-3">{icon}</span>
      {label}
    </button>
  );
};

interface SidebarProps {
  activeView: string;
  setActiveView: (view: string) => void;
  handleSelectPage: (pageId: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  handleSelectPage,
}) => {
  const { user, logout } = useAuth();

  const navItems = [
    {
      id: 'home',
      label: 'Início',
      icon: <IconHome />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO],
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: <IconDashboard />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'projects',
      label: 'Projetos',
      icon: <IconClipboardList />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO],
    },
    {
      id: 'patients',
      label: 'Pacientes',
      icon: <IconAddressBook />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'calendar',
      label: 'Agenda',
      icon: <IconCalendar />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'chat',
      label: 'Chat',
      icon: <IconMessageCircle />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO],
    },
    {
      id: 'financeiro',
      label: 'Financeiro',
      icon: <IconDollarSign />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'exercises',
      label: 'Exercícios',
      icon: <IconActivity />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO],
    },
    {
      id: 'reports',
      label: 'Relatórios',
      icon: <IconChartPie />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'staff',
      label: 'Equipe',
      icon: <IconBriefcase />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'mentorship',
      label: 'Mentoria',
      icon: <IconUsers />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'clinical-cases',
      label: 'Casos Clínicos',
      icon: <IconBook />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO],
    },
    {
      id: 'clinical-protocols',
      label: 'Protocolos Clínicos',
      icon: <IconScience />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'patient-protocols',
      label: 'Protocolos dos Pacientes',
      icon: <IconTrendingUp />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'protocol-analytics',
      label: 'Analytics de Protocolos',
      icon: <IconChartBar />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'billing',
      label: 'Faturamento',
      icon: <IconBuilding />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'compliance',
      label: 'Compliance',
      icon: <IconUserShield />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'status',
      label: 'Status do Sistema',
      icon: <IconServer />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'marketing',
      label: 'Marketing',
      icon: <IconMegaphone />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'vendas',
      label: 'Vendas',
      icon: <IconShoppingCart />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'suporte',
      label: 'Suporte',
      icon: <IconLifeBuoy />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'parcerias',
      label: 'Parcerias',
      icon: <IconUsersGroup />,
      roles: [UserRole.ADMIN],
    },
    {
      id: 'operational',
      label: 'Gestão Operacional',
      icon: <IconTrendingUp />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
    {
      id: 'unified',
      label: 'Dashboard 360°',
      icon: <IconActivity />,
      roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA],
    },
  ];

  const accessibleNavItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  );

  const mobileNavOrder = ['home', 'patients', 'calendar', 'chat', 'projects'];
  const mobileNavItems = mobileNavOrder
    .map((id) => accessibleNavItems.find((item) => item.id === id))
    .filter(Boolean);

  return (
    <>
      {/* Mobile Bottom Bar */}
      <aside className="fixed bottom-0 left-0 z-40 grid h-16 w-full grid-cols-5 border-t border-slate-700 bg-slate-800 md:hidden">
        {mobileNavItems.map((item) => (
          <NavItem
            key={`${item!.id}-mobile`}
            isMobile
            icon={item!.icon}
            label={item!.label}
            isActive={activeView === item!.id}
            onClick={() => setActiveView(item!.id)}
          />
        ))}
      </aside>

      {/* Desktop Sidebar */}
      <aside className="hidden w-64 flex-shrink-0 flex-col border-r border-slate-700 bg-slate-800/50 p-4 md:flex">
        <div className="mb-6 flex items-center">
          <div className="mr-3 rounded-lg bg-blue-500 p-2">
            <IconStethoscope className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">FisioFlow</h1>
        </div>

        <nav className="flex-1 space-y-2">
          {accessibleNavItems.map((item) => (
            <NavItem
              key={item.id}
              icon={item.icon}
              label={item.label}
              isActive={activeView === item.id}
              onClick={() => setActiveView(item.id)}
            />
          ))}
          <div className="border-t border-slate-700 pt-4">
            <NotebookTree onSelectPage={handleSelectPage} />
          </div>
        </nav>

        <div className="mt-auto">
          <button
            onClick={logout}
            className="flex w-full items-center rounded-md px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-slate-700 hover:text-white"
          >
            <IconLogout className="mr-3" />
            Sair
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
