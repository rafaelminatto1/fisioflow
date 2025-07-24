import React from 'react';
import { Transaction, Patient, ReceiptProps, ClinicSettings } from '../../types';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';
import { IconDollarSign, IconPackage, IconPrinter } from '../icons/IconComponents';

interface PatientFinanceTabProps {
    transactions: Transaction[];
    patient: Patient;
    settings: ClinicSettings | null;
    onAssignPackage: () => void;
    setViewingReceipt: (receiptProps: ReceiptProps | null) => void;
}

export const PatientFinanceTab: React.FC<PatientFinanceTabProps> = ({
    transactions,
    patient,
    settings,
    onAssignPackage,
    setViewingReceipt,
}) => (
    <div className="space-y-4">
        <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-slate-200">Financeiro</h3>
            <Button onClick={onAssignPackage} icon={<IconPackage />}>Vender Pacote</Button>
        </div>
        {transactions.length > 0 ? (
            <div className="overflow-x-auto rounded-lg border border-slate-700">
                <table className="w-full text-sm text-left text-slate-300">
                    <thead className="text-xs text-slate-400 uppercase bg-slate-900/50">
                        <tr>
                            <th scope="col" className="px-4 py-3">Descrição</th>
                            <th scope="col" className="px-4 py-3">Vencimento</th>
                            <th scope="col" className="px-4 py-3">Status</th>
                            <th scope="col" className="px-4 py-3 text-right">Valor</th>
                            <th scope="col" className="px-4 py-3 text-center">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-700">
                        {transactions.map(t => (
                            <tr key={t.id}>
                                <td className="px-4 py-3">{t.description}</td>
                                <td className="px-4 py-3">{new Date(t.dueDate).toLocaleDateString('pt-BR')}</td>
                                <td className="px-4 py-3">
                                    <span className={`text-xs font-semibold px-2 py-1 rounded-full capitalize ${t.status === 'pago' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>{t.status}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-mono">R$ {t.amount.toFixed(2)}</td>
                                <td className="px-4 py-3 text-center">
                                    {t.status === 'pago' && settings && (
                                        <Button variant="ghost" size="sm" onClick={() => setViewingReceipt({ patient, transaction: t, settings, onClose: () => setViewingReceipt(null) })} icon={<IconPrinter />} />
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        ) : <EmptyState icon={<IconDollarSign />} title="Nenhum Lançamento" message="Nenhuma transação financeira foi registrada para este paciente." />}
    </div>
);