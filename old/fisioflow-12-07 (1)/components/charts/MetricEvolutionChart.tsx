import React from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';
import { FlowsheetDataPoint } from '../../types';

interface MetricEvolutionChartProps {
  title: string;
  data: FlowsheetDataPoint[];
  dataKey: string;
  unit?: string;
  color?: string;
  domain?: [number | string, number | string];
}

const CustomTooltip = ({ active, payload, label, unit }: any) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/80 p-2 border border-slate-700 rounded-lg shadow-lg text-sm backdrop-blur-sm">
                <p className="font-bold text-slate-100">{label}</p>
                <p style={{ color: payload[0].stroke }}>
                    {`${payload[0].name}: ${payload[0].value}${unit || ''}`}
                </p>
            </div>
        );
    }
    return null;
};

export const MetricEvolutionChart: React.FC<MetricEvolutionChartProps> = ({ 
    title, 
    data, 
    dataKey, 
    unit = '',
    color = '#8884d8',
    domain,
}) => {
    if (data.length === 0) {
        return (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-[300px] flex flex-col">
                <h4 className="text-base font-semibold text-slate-300 mb-2">{title}</h4>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    Dados insuficientes para gerar o gráfico.
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-[300px] flex flex-col">
            <h4 className="text-base font-semibold text-slate-300 mb-4">{title}</h4>
            <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#475569" />
                        <XAxis dataKey="date" stroke="#cbd5e1" fontSize={12} />
                        <YAxis stroke="#cbd5e1" fontSize={12} unit={unit} domain={domain} />
                        <Tooltip content={<CustomTooltip unit={unit} />} cursor={{ stroke: '#475569', strokeWidth: 1 }}/>
                        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} name={dataKey} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
};