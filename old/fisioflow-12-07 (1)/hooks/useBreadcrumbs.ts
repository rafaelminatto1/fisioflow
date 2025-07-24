
import { useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import { Page, Notebook, BreadcrumbItem } from '../types';
import { useNotebooks } from './useNotebooks';
import { usePatients } from './usePatients'; // Assuming you have this hook

const mainViewToName: { [key: string]: string } = {
    '/': "Início",
    '/projects': "Projetos",
    '/patients': "Pacientes",
    '/exercises': "Exercícios",
    '/calendar': "Agenda",
    '/financeiro': "Financeiro",
    '/reports': "Gestão Operacional",
    '/mentorship': "Educação",
};

const settingsViewToName: { [key: string]: string } = {
    '/settings/services': "Serviços & Pacotes",
    '/settings/protocols': "Protocolos Clínicos",
    '/settings/forms': "Formulários",
    '/settings/assessment-templates': "Templates de Avaliação",
    '/settings/session-note-templates': "Templates de Nota",
    '/settings/automations': "Automações",
    '/settings/staff': "Equipe",
    '/settings/permissions': "Permissões & Acessos",
    '/settings/backup': "Backup & Recuperação",
    '/settings/clinic': "Configurações da Clínica",
};

export const useBreadcrumbs = (): BreadcrumbItem[] => {
    const { data: notebooksData } = useNotebooks();
    const { patients } = usePatients();
    const notebooks = notebooksData || [];
    const location = useLocation();
    const pathParts = location.pathname.split('/').filter(Boolean);

    return useMemo(() => {
        const path = location.pathname;
        const base: BreadcrumbItem[] = [{ name: "FisioFlow", href: "/" }];

        if (mainViewToName[path]) {
            if (path !== '/') {
                 base.push({ name: mainViewToName[path], href: path });
            }
        } else if (path.startsWith('/settings')) {
            base.push({ name: "Configurações", href: "/settings/clinic" }); // Default to a valid settings page
            if (settingsViewToName[path]) {
                base.push({ name: settingsViewToName[path], href: path });
            }
        } else if (path.startsWith('/notebook/')) {
            base.push({ name: "Notebooks", href: "#" });
            const pageId = pathParts[1];
            if (pageId) {
                let foundPage: Page | undefined;
                let foundNotebook: Notebook | undefined;
                for (const notebook of notebooks) {
                    const page = notebook.pages.find(p => p.id === pageId);
                    if (page) {
                        foundPage = page;
                        foundNotebook = notebook;
                        break;
                    }
                }
                if (foundNotebook) base.push({ name: foundNotebook.title, href: "#" });
                if (foundPage) base.push({ name: foundPage.title, href: `/notebook/${pageId}` });
            }
        } else if (path.startsWith('/patients/')) {
             base.push({ name: 'Pacientes', href: '/patients'});
             const patientId = pathParts[1];
             const patient = patients?.find(p => p.id === patientId);
             base.push({ name: patient?.name || 'Detalhes do Paciente', href: path });
        }
        return base;
    }, [location.pathname, pathParts, notebooks, patients]);
};