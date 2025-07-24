
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import NotebookTree from '/components/NotebookTree.js';
import { useAuth } from '/hooks/useAuth.js';
import { UserRole } from '/types.js';
import { IconHome, IconClipboardList, IconUsers, IconStethoscope, IconLogout, IconAddressBook, IconCalendar, IconActivity, IconDollarSign, IconChartPie, IconBriefcase, IconFileText, IconFileCheck, IconTag, IconSettings, IconFilePlus, IconShieldCheck, IconListChecks, IconZap, IconChevronRight, IconGraduationCap, IconDatabase } from '/components/icons/IconComponents.js';
import { useSettings } from '/hooks/useSettings.js';

interface NavItemProps {
    icon: React.ReactNode;
    label: string;
    isActive: boolean;
    onClick: () => void;
    isMobile?: boolean;
    isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, isActive, onClick, isMobile, isSubItem }) => {
    if (isMobile) {
        return (
             <button
                onClick={onClick}
                className={`flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
                    isActive
                        ? 'text-blue-400'
                        : 'text-slate-400 hover:text-white'
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
            className={`relative flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group ${
                isActive
                    ? 'bg-slate-700/50 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
            } ${isSubItem ? 'pl-12' : ''}`}
        >
             {isActive && <div className="absolute left-0 top-1/4 h-1/2 w-1 bg-blue-400 rounded-r-full transition-all"></div>}
            <span className={`mr-4 transition-colors group-hover:text-blue-300 ${isActive ? 'text-blue-300' : 'text-slate-400'}`}>{icon}</span>
            {label}
        </button>
    );
};


const Sidebar: React.FC = () => {
    const { user, logout } = useAuth();
    const { settings } = useSettings();
    const navigate = useNavigate();
    const location = useLocation();
    
    const [isSettingsOpen, setIsSettingsOpen] = useState(
      location.pathname.startsWith('/settings')
    );
    
    const navItems = [
        { id: '/', label: 'Início', icon: <IconHome />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO] },
        { id: '/projects', label: 'Projetos', icon: <IconClipboardList />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO] },
        { id: '/patients', label: 'Pacientes', icon: <IconAddressBook />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO] },
        { id: '/exercises', label: 'Exercícios', icon: <IconActivity />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA, UserRole.ESTAGIARIO] },
        { id: '/calendar', label: 'Agenda', icon: <IconCalendar />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/financeiro', label: 'Financeiro', icon: <IconDollarSign />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/reports', label: 'Gestão Operacional', icon: <IconChartPie />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/mentorship', label: 'Educação', icon: <IconGraduationCap />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
    ];
    
    const settingsNavItems = [
        { id: '/settings/services', label: 'Serviços & Pacotes', icon: <IconTag />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/settings/protocols', label: 'Protocolos Clínicos', icon: <IconFileText />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/settings/forms', label: 'Formulários', icon: <IconListChecks />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/settings/assessment-templates', label: 'Templates de Avaliação', icon: <IconFileCheck />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/settings/session-note-templates', label: 'Templates de Nota', icon: <IconFilePlus />, roles: [UserRole.ADMIN, UserRole.FISIOTERAPEUTA] },
        { id: '/settings/automations', label: 'Automações', icon: <IconZap />, roles: [UserRole.ADMIN] },
        { id: '/settings/staff', label: 'Equipe', icon: <IconBriefcase />, roles: [UserRole.ADMIN] },
        { id: '/settings/permissions', label: 'Permissões & Acessos', icon: <IconShieldCheck />, roles: [UserRole.ADMIN] },
        { id: '/settings/backup', label: 'Backup & Recuperação', icon: <IconDatabase />, roles: [UserRole.ADMIN] },
        { id: '/settings/clinic', label: 'Configurações da Clínica', icon: <IconSettings />, roles: [UserRole.ADMIN] },
    ];
    
    const accessibleNavItems = navItems.filter(item => user && item.roles.includes(user.role));
    const accessibleSettingsItems = settingsNavItems.filter(item => user && item.roles.includes(user.role));
    
    React.useEffect(() => {
        if(location.pathname.startsWith('/settings')) {
            setIsSettingsOpen(true);
        }
    }, [location.pathname]);

    const handleSelectPage = (pageId: string) => {
        navigate(`/notebook/${pageId}`);
    };

    return (
        <>
            {/* Mobile Bottom Bar */}
            <aside className="md:hidden fixed bottom-0 left-0 z-40 w-full h-16 bg-slate-800 border-t border-slate-700 grid grid-cols-5 no-print">
                 {accessibleNavItems.slice(0, 5).map(item => (
                    <NavItem
                        key={`${item.id}-mobile`}
                        isMobile
                        icon={item.icon}
                        label={item.label}
                        isActive={location.pathname === item.id}
                        onClick={() => navigate(item.id)}
                    />
                ))}
            </aside>

            {/* Desktop Sidebar */}
            <aside className="hidden md:flex w-64 flex-shrink-0 bg-slate-800/50 border-r border-slate-700 flex-col p-4 no-print">
                <div className="flex items-center mb-6">
                    <div className="bg-blue-500 p-2 rounded-lg mr-3 flex items-center justify-center w-10 h-10">
                         {settings?.clinicLogoUrl ? (
                            <img src={settings.clinicLogoUrl} alt="Logo" className="w-6 h-6 object-contain"/>
                        ) : (
                            <IconStethoscope className="text-white" />
                        )}
                    </div>
                    <h1 className="text-xl font-bold text-white">{settings?.clinicName || 'FisioFlow'}</h1>
                </div>

                <div className="flex-1 flex flex-col overflow-hidden">
                    <nav className="flex-1 space-y-1.5 overflow-y-auto pb-4 pr-1 -mr-3">
                        {accessibleNavItems.map(item => (
                            <NavItem
                                key={item.id}
                                icon={item.icon}
                                label={item.label}
                                isActive={location.pathname === item.id}
                                onClick={() => navigate(item.id)}
                            />
                        ))}

                         {accessibleSettingsItems.length > 0 && (
                            <div>
                                <button
                                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                                    className={`relative flex items-center w-full px-4 py-2.5 text-sm font-medium rounded-md transition-all duration-200 group text-slate-300 hover:bg-slate-700 hover:text-white`}
                                >
                                    <span className={`mr-4 transition-colors group-hover:text-blue-300 text-slate-400`}><IconSettings/></span>
                                    Configurações
                                    <IconChevronRight className={`ml-auto w-4 h-4 transform transition-transform ${isSettingsOpen ? 'rotate-90' : ''}`} />
                                </button>
                                {isSettingsOpen && (
                                    <div className="mt-1 space-y-1">
                                        {accessibleSettingsItems.map(item => (
                                            <NavItem
                                                key={item.id}
                                                icon={item.icon}
                                                label={item.label}
                                                isActive={location.pathname === item.id}
                                                onClick={() => navigate(item.id)}
                                                isSubItem={true}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                        
                        <div className="pt-4 border-t border-slate-700">
                            <NotebookTree onSelectPage={handleSelectPage} />
                        </div>
                    </nav>
                </div>


                <div className="mt-auto flex-shrink-0">
                     <button
                        onClick={logout}
                        className="flex items-center w-full px-3 py-2 text-sm font-medium rounded-md text-slate-300 hover:bg-slate-700 hover:text-white transition-colors"
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