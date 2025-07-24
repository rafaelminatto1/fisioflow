

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IconCompass } from './icons/IconComponents';
import Button from './ui/Button';

const NotFoundPage: React.FC = () => {
    const navigate = useNavigate();

    const goHome = () => {
        navigate('/');
    };

    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <IconCompass size={64} className="text-blue-500 mb-6" />
            <h1 className="text-4xl font-bold text-slate-100 mb-2">404 - Página Não Encontrada</h1>
            <p className="text-lg text-slate-400 mb-6">Oops! Parece que esta página fez uma sessão de alongamento e... sumiu.</p>
            <Button onClick={goHome} size="lg">
                Voltar para o Início
            </Button>
        </div>
    );
};

export default NotFoundPage;