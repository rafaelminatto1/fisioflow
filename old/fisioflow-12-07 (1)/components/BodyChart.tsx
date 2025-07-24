import React, { useState, useRef } from 'react';
import { BodyChartMarking, PainType } from '../types';
import { IconTrash } from './icons/IconComponents';

interface BodyChartProps {
    markings: BodyChartMarking[];
    onUpdateMarkings?: (markings: BodyChartMarking[]) => void;
    readOnly?: boolean;
    heatmap?: boolean;
}

const painTypes: Record<PainType, { color: string; label: string }> = {
    sharp: { color: '#ef4444', label: 'Aguda/Pontada' },
    dull: { color: '#f59e0b', label: 'Incômodo/Surda' },
    tingling: { color: '#3b82f6', label: 'Formigamento' },
    burning: { color: '#f97316', label: 'Queimação' },
    numbness: { color: '#8b5cf6', label: 'Dormência' },
};

const BodySvg = ({ viewBox = "0 0 200 400", children, ...props }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} {...props} className="w-full h-auto drop-shadow-lg">
        <path fill="#475569" d="M100 60c11 0 20-9 20-20S111 20 100 20s-20 9-20 20 9 20 20 20zm0 5c-16 0-30 11.2-30 25v50h-5c-6 0-10 4-10 10v120c0 4.4 3.6 8 8 8h2s0 50 25 50 25-50 25-50h2c4.4 0 8-3.6 8-8V150c0-6-4-10-10-10h-5V90c0-13.8-14-25-30-25z" />
        {children}
    </svg>
);

const BodyChart: React.FC<BodyChartProps> = ({ markings, onUpdateMarkings, readOnly = false, heatmap = false }) => {
    const [activeView, setActiveView] = useState<'front' | 'back'>('front');
    const [selectedPainType, setSelectedPainType] = useState<PainType>('sharp');
    const svgContainerRef = useRef<HTMLDivElement>(null);

    const handleChartClick = (e: React.MouseEvent<SVGSVGElement>) => {
        if (readOnly || !svgContainerRef.current || !onUpdateMarkings) return;
        const svg = svgContainerRef.current.querySelector('svg');
        if(!svg) return;
        
        const rect = svg.getBoundingClientRect();
        const viewBox = svg.viewBox.baseVal;
        
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const svgX = (x / rect.width) * viewBox.width;
        const svgY = (y / rect.height) * viewBox.height;

        const newMarking: BodyChartMarking = {
            id: `mark-${crypto.randomUUID()}`,
            x: (svgX / viewBox.width) * 100,
            y: (svgY / viewBox.height) * 100,
            painType: selectedPainType,
            view: activeView,
        };
        onUpdateMarkings([...markings, newMarking]);
    };

    const removeMarking = (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (readOnly || !onUpdateMarkings) return;
        onUpdateMarkings(markings.filter(m => m.id !== id));
    };

    const viewMarkings = markings.filter(m => m.view === activeView);

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700">
            <div className="flex justify-center mb-2">
                <div className="flex items-center bg-slate-800 p-1 rounded-lg border border-slate-700">
                    <button onClick={() => setActiveView('front')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${activeView === 'front' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Frente</button>
                    <button onClick={() => setActiveView('back')} className={`px-4 py-1.5 text-sm font-semibold rounded-md ${activeView === 'back' ? 'bg-blue-600 text-white' : 'text-slate-300'}`}>Costas</button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-[1fr_200px] gap-4">
                <div className="relative" ref={svgContainerRef}>
                    <BodySvg onClick={handleChartClick} style={{ cursor: readOnly ? 'default' : 'crosshair' }}>
                        {viewMarkings.map(mark => (
                             <circle
                                key={mark.id}
                                cx={`${mark.x}%`}
                                cy={`${mark.y}%`}
                                r={heatmap ? "8" : "4"}
                                fill={heatmap ? painTypes[mark.painType].color : "transparent"}
                                fillOpacity={heatmap ? 0.3 : 1}
                                stroke={painTypes[mark.painType].color}
                                strokeWidth={heatmap ? 0 : 2}
                                onClick={(e) => !heatmap && !readOnly && removeMarking(mark.id, e)}
                                className={readOnly ? '' : 'cursor-pointer'}
                            />
                        ))}
                    </BodySvg>
                </div>
                {!readOnly && (
                    <div className="space-y-2">
                        <h4 className="text-sm font-semibold text-slate-300">Tipo de Dor</h4>
                        {Object.entries(painTypes).map(([key, { color, label }]) => (
                            <button
                                key={key}
                                onClick={() => setSelectedPainType(key as PainType)}
                                className={`w-full flex items-center gap-3 p-2 rounded-md border-2 transition-colors ${selectedPainType === key ? 'border-white' : 'border-transparent hover:bg-slate-700'}`}
                            >
                                <span className="w-5 h-5 rounded-full" style={{ backgroundColor: color }}></span>
                                <span className="text-sm">{label}</span>
                            </button>
                        ))}
                         <div className="mt-4 pt-4 border-t border-slate-700">
                             <h4 className="text-sm font-semibold text-slate-300">Pontos Marcados</h4>
                             <ul className="text-xs space-y-1 mt-2 max-h-24 overflow-y-auto">
                                 {markings.length > 0 ? markings.map(m => (
                                     <li key={m.id} className="flex items-center justify-between p-1 hover:bg-slate-800 rounded">
                                         <div className="flex items-center gap-2">
                                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: painTypes[m.painType].color }}></span>
                                            <span>Dor {painTypes[m.painType].label.toLowerCase()} ({m.view})</span>
                                         </div>
                                         <button onClick={(e) => removeMarking(m.id, e)} className="p-0.5 text-slate-500 hover:text-red-400">
                                            <IconTrash size={12}/>
                                         </button>
                                     </li>
                                 )) : <li className="text-slate-500 italic">Nenhum ponto.</li>}
                             </ul>
                         </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default BodyChart;
