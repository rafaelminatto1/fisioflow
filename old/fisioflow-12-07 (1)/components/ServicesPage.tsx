import React, { useState } from 'react';
import { Service, Package } from '../types';
import { useServices } from '../hooks/useServices';
import { usePackages } from '../hooks/usePackages';
import { IconPlus, IconTag, IconPencil, IconTrash, IconDollarSign, IconPackage, IconActivity, IconAlertTriangle } from './icons/IconComponents';
import EmptyState from './ui/EmptyState';
import Button from './ui/Button';
import ServiceModal from './ServiceModal';
import PackageModal from './PackageModal';
import Skeleton from './ui/Skeleton';

const TabButton: React.FC<{ label: string; icon: React.ReactNode; isActive: boolean; onClick: () => void }> = ({ label, icon, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-t-md border-b-2 transition-all ${
        isActive
          ? 'text-blue-400 border-blue-400'
          : 'text-slate-400 border-transparent hover:text-white hover:bg-slate-700/50'
      }`}
    >
        {icon}
        {label}
    </button>
);

const ServicesPage: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'services' | 'packages'>('services');
    
    const { services = [], saveService, deleteService, isLoading: isLoadingServices, isError: isErrorServices } = useServices();
    const { packages = [], savePackage, deletePackage, isLoading: isLoadingPackages, isError: isErrorPackages } = usePackages();

    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState<Partial<Service> | null>(null);

    const [isPackageModalOpen, setIsPackageModalOpen] = useState(false);
    const [selectedPackage, setSelectedPackage] = useState<Partial<Package> | null>(null);

    const handleOpenServiceModal = (service: Partial<Service> | null) => {
        setSelectedService(service);
        setIsServiceModalOpen(true);
    };

    const handleSaveService = async (serviceToSave: Service) => {
        await saveService(serviceToSave);
        setIsServiceModalOpen(false);
    };
    
    const handleDeleteService = async (serviceId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este serviço?')) {
            await deleteService(serviceId);
        }
    };
    
    const handleOpenPackageModal = (pkg: Partial<Package> | null) => {
        setSelectedPackage(pkg);
        setIsPackageModalOpen(true);
    };

    const handleSavePackage = async (packageToSave: Package) => {
        await savePackage(packageToSave);
        setIsPackageModalOpen(false);
    };
    
    const handleDeletePackage = async (packageId: string) => {
        if (window.confirm('Tem certeza que deseja excluir este pacote?')) {
            await deletePackage(packageId);
        }
    };

    const renderServicesContent = () => {
        if (isLoadingServices) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bento-box space-y-3">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                        </div>
                    ))}
                </div>
            );
        }

        if (isErrorServices) {
            return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Serviços"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }
        
        if (services.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {services.map(service => (
                        <div key={service.id} className="bento-box group relative">
                            <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenServiceModal(service); }} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeleteService(service.id); }} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                            <IconTag className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{service.name}</h3>
                            <div className="mt-3 pt-3 border-t border-slate-700/50 flex items-center gap-2 text-sm text-slate-300">
                                <IconDollarSign size={16} className="text-emerald-400" />
                                <span>R$ {service.price.toFixed(2).replace('.', ',')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            )
        }
        
        return (
             <EmptyState
                icon={<IconTag size={32} />}
                title="Nenhum Serviço Cadastrado"
                message="Cadastre os serviços oferecidos pela sua clínica."
                action={
                    <Button onClick={() => handleOpenServiceModal({})} icon={<IconPlus />}>
                        Cadastrar Primeiro Serviço
                    </Button>
                }
            />
        );
    }
    
     const renderPackagesContent = () => {
        if (isLoadingPackages) {
            return (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="bento-box space-y-3">
                            <Skeleton className="w-8 h-8 rounded" />
                            <Skeleton className="h-5 w-3/4 rounded" />
                            <Skeleton className="h-4 w-1/2 rounded" />
                             <Skeleton className="h-4 w-1/3 rounded" />
                        </div>
                    ))}
                </div>
            );
        }

        if (isErrorPackages) {
            return (
                <EmptyState 
                    icon={<IconAlertTriangle size={32} />}
                    title="Erro ao Carregar Pacotes"
                    message="Não foi possível buscar os dados. Tente recarregar a página."
                />
            )
        }
        
        if (packages.length > 0) {
            return (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {packages.map(pkg => (
                        <div key={pkg.id} className="bento-box group relative">
                             <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={(e) => { e.stopPropagation(); handleOpenPackageModal(pkg); }} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconPencil size={14} /></button>
                                <button onClick={(e) => { e.stopPropagation(); handleDeletePackage(pkg.id); }} className="p-1.5 bg-slate-700/50 rounded-md hover:bg-slate-600"><IconTrash size={14} /></button>
                            </div>
                            <IconPackage className="text-blue-400 mb-3" size={24} />
                            <h3 className="font-semibold text-slate-100 text-base mb-2 truncate">{pkg.name}</h3>
                             <div className="mt-3 pt-3 border-t border-slate-700/50 space-y-2 text-sm text-slate-300">
                                 <div className="flex items-center gap-2">
                                    <IconDollarSign size={16} className="text-emerald-400" />
                                    <span>R$ {pkg.price.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <IconActivity size={16} className="text-amber-400" />
                                    <span>{pkg.sessionCount} sessões</span>
                                </div>
                             </div>
                        </div>
                    ))}
                </div>
            )
        }
        
        return (
             <EmptyState
                icon={<IconPackage size={32} />}
                title="Nenhum Pacote Cadastrado"
                message="Crie pacotes de sessões para oferecer aos seus pacientes."
                action={
                    <Button onClick={() => handleOpenPackageModal({})} icon={<IconPlus />}>
                        Cadastrar Primeiro Pacote
                    </Button>
                }
            />
        );
    }


    return (
        <div className="space-y-6">
            <header className="flex flex-col md:flex-row justify-between items-center gap-4">
                <h1 className="text-3xl font-bold text-slate-100">Serviços e Pacotes</h1>
                <Button 
                    onClick={activeTab === 'services' ? () => handleOpenServiceModal({}) : () => handleOpenPackageModal({})} 
                    icon={<IconPlus />}
                >
                    {activeTab === 'services' ? 'Novo Serviço' : 'Novo Pacote'}
                </Button>
            </header>

            <div className="border-b border-slate-700">
                <nav className="flex -mb-px space-x-4">
                    <TabButton label="Serviços" icon={<IconTag size={16}/>} isActive={activeTab === 'services'} onClick={() => setActiveTab('services')} />
                    <TabButton label="Pacotes" icon={<IconPackage size={16}/>} isActive={activeTab === 'packages'} onClick={() => setActiveTab('packages')} />
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'services' && renderServicesContent()}
                {activeTab === 'packages' && renderPackagesContent()}
            </div>

            {isServiceModalOpen && (
                <ServiceModal
                    isOpen={isServiceModalOpen}
                    onClose={() => setIsServiceModalOpen(false)}
                    onSave={handleSaveService}
                    service={selectedService}
                />
            )}
            {isPackageModalOpen && (
                <PackageModal
                    isOpen={isPackageModalOpen}
                    onClose={() => setIsPackageModalOpen(false)}
                    onSave={handleSavePackage}
                    pkg={selectedPackage}
                    services={services}
                />
            )}
        </div>
    );
};

export default ServicesPage;