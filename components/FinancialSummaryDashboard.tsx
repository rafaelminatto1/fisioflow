import React from 'react';

import {
  IconDollarSign,
  IconClock,
  IconAlertTriangle,
} from './icons/IconComponents';
import MetricCard from './MetricCard';

interface FinancialSummaryDashboardProps {
  totalPaid: number;
  pending: number;
  overdue: number;
}

const formatCurrency = (value: number) => {
  return `R$ ${value.toFixed(2).replace('.', ',')}`;
};

const FinancialSummaryDashboard: React.FC<FinancialSummaryDashboardProps> = ({
  totalPaid,
  pending,
  overdue,
}) => {
  return (
    <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      <MetricCard
        icon={<IconDollarSign size={24} />}
        title="Receita Total (Pago)"
        value={formatCurrency(totalPaid)}
        change="Período completo"
      />
      <MetricCard
        icon={<IconClock />}
        title="Pendente"
        value={formatCurrency(pending)}
        change="Aguardando pagamento"
      />
      <MetricCard
        icon={<IconAlertTriangle />}
        title="Atrasado"
        value={formatCurrency(overdue)}
        change="Pagamentos vencidos"
      />
    </div>
  );
};

export default FinancialSummaryDashboard;
