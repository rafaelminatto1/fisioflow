
import React from 'react';
import { IconLoader } from '../icons/IconComponents';

const PageLoader: React.FC = () => (
    <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
            <IconLoader size={32} className="animate-spin text-blue-400" />
            <p className="mt-2 text-slate-400">Carregando...</p>
        </div>
    </div>
);

export default PageLoader;
