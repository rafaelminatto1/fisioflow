import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import {
  IconCheckCircle,
  IconServer,
  IconAlertTriangle,
} from './icons/IconComponents';

const generateMetricData = (base: number, variance: number) => {
  return Array.from({ length: 10 }, (_, i) => ({
    name: `${9 - i}m ago`,
    value: parseFloat((base + (Math.random() - 0.5) * variance).toFixed(2)),
  })).reverse();
};

const StatusMetricCard: React.FC<{
  title: string;
  value: string;
  unit: string;
  status: 'ok' | 'warning' | 'error';
  children: React.ReactNode;
}> = ({ title, value, unit, status, children }) => {
  const statusConfig = {
    ok: { color: 'text-emerald-400', icon: <IconCheckCircle /> },
    warning: { color: 'text-amber-400', icon: <IconAlertTriangle /> },
    error: { color: 'text-red-400', icon: <IconAlertTriangle /> },
  };
  const currentStatus = statusConfig[status];
  return (
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-4">
      <div className="mb-2 flex items-start justify-between">
        <h3 className="font-semibold text-slate-200">{title}</h3>
        <div
          className={`flex items-center gap-1 text-sm font-bold ${currentStatus.color}`}
        >
          {currentStatus.icon}
          <span>
            {status === 'ok'
              ? 'Operacional'
              : status === 'warning'
                ? 'Atenção'
                : 'Falha'}
          </span>
        </div>
      </div>
      <p className="mb-4 text-3xl font-bold text-white">
        {value} <span className="text-lg text-slate-400">{unit}</span>
      </p>
      <div style={{ width: '100%', height: 150 }}>{children}</div>
    </div>
  );
};

const SystemStatusPage: React.FC = () => {
  const [latencyData, setLatencyData] = useState(generateMetricData(80, 20));
  const [errorData, setErrorData] = useState(generateMetricData(0.1, 0.1));
  const [cpuData, setCpuData] = useState(generateMetricData(30, 15));

  useEffect(() => {
    const interval = setInterval(() => {
      setLatencyData((prev) => [
        ...prev.slice(1),
        {
          name: 'now',
          value: parseFloat((80 + (Math.random() - 0.5) * 20).toFixed(2)),
        },
      ]);
      setErrorData((prev) => [
        ...prev.slice(1),
        {
          name: 'now',
          value: Math.max(
            0,
            parseFloat((0.1 + (Math.random() - 0.5) * 0.15).toFixed(2))
          ),
        },
      ]);
      setCpuData((prev) => [
        ...prev.slice(1),
        {
          name: 'now',
          value: parseFloat((30 + (Math.random() - 0.5) * 15).toFixed(2)),
        },
      ]);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="rounded-lg border border-slate-700 bg-slate-900/80 p-2 text-xs shadow-lg backdrop-blur-sm">
          <p className="font-bold text-slate-100">{`${payload[0].value}${payload[0].unit}`}</p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="flex items-center gap-3 text-3xl font-bold text-slate-100">
          <IconServer /> Status do Sistema
        </h1>
        <p className="mt-1 text-slate-400">
          Monitoramento em tempo real (simulado) da saúde da aplicação.
        </p>
      </header>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <StatusMetricCard
          title="Latência da API"
          value={latencyData[latencyData.length - 1].value.toString()}
          unit="ms"
          status="ok"
        >
          <ResponsiveContainer>
            <LineChart data={latencyData}>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#3b82f6"
                strokeWidth={2}
                dot={false}
                unit="ms"
              />
            </LineChart>
          </ResponsiveContainer>
        </StatusMetricCard>
        <StatusMetricCard
          title="Taxa de Erro"
          value={errorData[errorData.length - 1].value.toString()}
          unit="%"
          status="ok"
        >
          <ResponsiveContainer>
            <LineChart data={errorData}>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#10b981"
                strokeWidth={2}
                dot={false}
                unit="%"
              />
            </LineChart>
          </ResponsiveContainer>
        </StatusMetricCard>
        <StatusMetricCard
          title="Uso de CPU do Servidor"
          value={cpuData[cpuData.length - 1].value.toString()}
          unit="%"
          status="ok"
        >
          <ResponsiveContainer>
            <LineChart data={cpuData}>
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ stroke: '#475569', strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#f59e0b"
                strokeWidth={2}
                dot={false}
                unit="%"
              />
            </LineChart>
          </ResponsiveContainer>
        </StatusMetricCard>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="prose prose-sm prose-invert max-w-none rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-slate-100">Monitoramento Proativo e Alertas</h3>
          <p className="text-slate-300">
            Em um ambiente de produção real, esta página seria alimentada pelo{' '}
            <strong>Google Cloud Monitoring</strong>. Configuraríamos painéis
            personalizados para visualizar métricas chave em tempo real.
          </p>
          <p className="text-slate-300">
            Além disso, políticas de alerta seriam criadas para notificar a
            equipe de desenvolvimento proativamente via Email, Slack ou
            PagerDuty se qualquer métrica exceder um limiar crítico, como:
          </p>
          <ul>
            <li className="text-slate-300">
              Latência da API acima de 500ms por mais de 5 minutos.
            </li>
            <li className="text-slate-300">
              Taxa de erro (status 5xx) acima de 1%.
            </li>
            <li className="text-slate-300">
              Uso de CPU consistentemente acima de 80%.
            </li>
          </ul>
          <p className="text-slate-300">
            Isso nos permite identificar e resolver problemas antes que eles
            afetem um grande número de usuários, garantindo a estabilidade do
            sistema.
          </p>
        </div>
        <div className="prose prose-sm prose-invert max-w-none rounded-lg border border-slate-700 bg-slate-800 p-6">
          <h3 className="text-slate-100">Escalabilidade com Cloud Run</h3>
          <p className="text-slate-300">
            Para garantir que o FisioFlow possa lidar com picos de uso (por
            exemplo, no início da manhã quando várias clínicas fazem login), o
            backend da aplicação seria implantado no{' '}
            <strong>Google Cloud Run</strong>, uma plataforma de computação sem
            servidor (serverless).
          </p>
          <p className="text-slate-300">As principais vantagens são:</p>
          <ul>
            <li className="text-slate-300">
              <strong>Auto-scaling:</strong> O Cloud Run aumenta ou diminui
              automaticamente o número de instâncias da aplicação com base no
              tráfego de entrada. Se 100 usuários entrarem ao mesmo tempo, ele
              provisiona mais contêineres. Se ninguém estiver usando durante a
              noite, ele pode escalar para zero, economizando custos.
            </li>
            <li className="text-slate-300">
              <strong>Custo-Benefício:</strong> Você paga apenas pelo tempo de
              CPU e memória que seu código realmente usa, tornando-o
              extremamente eficiente para aplicações com padrões de uso
              variáveis.
            </li>
            <li className="text-slate-300">
              <strong>Foco no Código:</strong> A equipe de desenvolvimento pode
              se concentrar em criar novas funcionalidades, em vez de gerenciar
              servidores e infraestrutura.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default SystemStatusPage;
