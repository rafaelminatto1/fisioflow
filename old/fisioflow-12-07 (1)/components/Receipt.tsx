
import React, { useEffect } from 'react';
import { ReceiptProps } from '../types';
import { IconStethoscope } from './icons/IconComponents';

const Receipt: React.FC<ReceiptProps> = ({ patient, transaction, settings, onClose }) => {
    
    useEffect(() => {
        // Trigger print dialog automatically when component mounts
        window.print();
        // Set up a listener for after printing to close the view
        const handleAfterPrint = () => {
            onClose();
        };
        window.addEventListener('afterprint', handleAfterPrint);
        return () => {
            window.removeEventListener('afterprint', handleAfterPrint);
        };
    }, [onClose]);

    return (
        <div className="printable-area bg-white text-slate-800 font-sans p-8 absolute top-0 left-0 w-full min-h-screen">
            <style>
                {`
                @media screen {
                    .printable-area {
                        z-index: 100;
                    }
                }
                `}
            </style>
            <div className="max-w-4xl mx-auto">
                <header className="flex justify-between items-start pb-6 border-b border-slate-300">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">{settings.clinicName}</h1>
                        <p className="text-sm text-slate-600">{settings.clinicAddress}</p>
                        <p className="text-sm text-slate-600">{settings.clinicPhone} | {settings.clinicEmail}</p>
                    </div>
                    <div className="text-right">
                         {settings.clinicLogoUrl ? (
                            <img src={settings.clinicLogoUrl} alt="Logo" className="w-20 h-20 object-contain"/>
                        ) : (
                            <IconStethoscope className="text-blue-600" size={48} />
                        )}
                    </div>
                </header>

                <main className="my-8">
                    <h2 className="text-2xl font-semibold text-center mb-6">Recibo de Pagamento</h2>
                    
                    <div className="grid grid-cols-2 gap-8 mb-8">
                        <div>
                            <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Recebemos de:</h3>
                            <p className="font-bold text-lg">{patient.name}</p>
                            <p>{patient.email}</p>
                            <p>{patient.phone}</p>
                        </div>
                        <div className="text-right">
                             <h3 className="text-sm font-semibold uppercase text-slate-500 mb-2">Detalhes da Transação</h3>
                             <p><strong className="text-slate-600">ID da Transação:</strong> {transaction.id}</p>
                             <p><strong className="text-slate-600">Data do Pagamento:</strong> {transaction.paidDate ? new Date(transaction.paidDate).toLocaleDateString('pt-BR') : 'N/D'}</p>
                        </div>
                    </div>
                    
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="p-3 font-semibold">Descrição do Serviço</th>
                                <th className="p-3 font-semibold text-right">Valor</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr className="border-b border-slate-200">
                                <td className="p-3">{transaction.description}</td>
                                <td className="p-3 text-right">R$ {transaction.amount.toFixed(2)}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr className="font-bold">
                                <td className="p-3 text-right">Total Pago:</td>
                                <td className="p-3 text-right text-xl">R$ {transaction.amount.toFixed(2)}</td>
                            </tr>
                        </tfoot>
                    </table>
                </main>

                <footer className="text-center text-sm text-slate-500 border-t border-slate-300 pt-4">
                    <p>Obrigado por sua confiança em nossos serviços!</p>
                    <p>{settings.clinicName} - {settings.clinicAddress}</p>
                </footer>
            </div>
             <button onClick={onClose} className="no-print fixed top-4 right-4 bg-slate-600 text-white px-3 py-1 rounded">Fechar</button>
        </div>
    );
};

export default Receipt;
