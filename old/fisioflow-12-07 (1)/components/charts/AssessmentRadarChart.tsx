import React, { useMemo } from 'react';
import { ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend, Tooltip } from 'recharts';
import { Assessment } from '../../types';

interface AssessmentRadarChartProps {
  initialAssessment: Assessment | null;
  latestAssessment: Assessment | null;
}

// Function to safely parse a ROM value (e.g., "120°", "120") to a number
const parseROM = (value: string | number | undefined): number => {
    if (typeof value === 'number') return value;
    if (typeof value === 'string') {
        const num = parseFloat(value.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? 0 : num;
    }
    return 0;
}

export const AssessmentRadarChart: React.FC<AssessmentRadarChartProps> = ({ initialAssessment, latestAssessment }) => {

    const chartData = useMemo(() => {
        if (!latestAssessment) return [];
        
        const dataMap: Record<string, { subject: string, initial?: number, latest?: number, fullMark: number }> = {};
        
        const addDataPoint = (subject: string, initialValue: number, latestValue: number, fullMark: number) => {
            dataMap[subject] = { subject, initial: initialValue, latest: latestValue, fullMark };
        };
        
        // 1. Pain Level
        addDataPoint('Dor', initialAssessment?.painLevel ?? 0, latestAssessment.painLevel, 10);

        // 2. ROM - find a key movement to track, e.g., Knee Flexion
        const findMovement = (assessment: Assessment | null, joint: string, movement: string) => 
            assessment?.rangeOfMotion.find(r => r.joint.toLowerCase().includes(joint) && r.movement.toLowerCase().includes(movement));
        
        let keyROM = findMovement(latestAssessment, 'joelho', 'flexão');
        if(!keyROM) keyROM = findMovement(latestAssessment, 'ombro', 'flexão');
        if(!keyROM) keyROM = latestAssessment.rangeOfMotion[0]; // fallback to first available

        if (keyROM) {
            const initialROM = findMovement(initialAssessment, keyROM.joint, keyROM.movement);
            addDataPoint(`ADM ${keyROM.joint.split(' ')[0]}`, parseROM(initialROM?.active), parseROM(keyROM.active), 180);
        }

        // 3. Muscle Strength - find a key muscle
        const findMuscle = (assessment: Assessment | null, muscleName: string) =>
            assessment?.muscleStrength.find(m => m.muscle.toLowerCase().includes(muscleName));
            
        let keyMuscle = findMuscle(latestAssessment, 'quadríceps');
        if (!keyMuscle) keyMuscle = findMuscle(latestAssessment, 'deltoide');
        if (!keyMuscle) keyMuscle = latestAssessment.muscleStrength[0]; // fallback

        if (keyMuscle) {
             const initialMuscle = findMuscle(initialAssessment, keyMuscle.muscle);
             addDataPoint(`Força ${keyMuscle.muscle}`, parseInt(initialMuscle?.grade ?? '0'), parseInt(keyMuscle.grade), 5);
        }

        // 4. Functional Test - find a key test
        const findTest = (assessment: Assessment | null, testName: string) =>
             assessment?.functionalTests.find(t => t.testName.toLowerCase().includes(testName));
        
        let keyTest = findTest(latestAssessment, 'agachamento');
        if (!keyTest) keyTest = latestAssessment.functionalTests[0];

        if(keyTest){
            // This is tricky as result is a string. We'll assign numeric values for demonstration.
            const mapResultToValue = (result: string | undefined) => {
                if(!result) return 1;
                if(result.toLowerCase().includes('bom') || result.toLowerCase().includes('normal')) return 5;
                if(result.toLowerCase().includes('regular') || result.toLowerCase().includes('moderado')) return 3;
                return 1; // Ruim, com dor, etc.
            }
             const initialTest = findTest(initialAssessment, keyTest.testName);
             addDataPoint(`Funcional: ${keyTest.testName}`, mapResultToValue(initialTest?.result), mapResultToValue(keyTest.result), 5);
        }

        return Object.values(dataMap);

    }, [initialAssessment, latestAssessment]);
    
    if (chartData.length < 3) {
         return (
            <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-[300px] flex flex-col">
                <h4 className="text-base font-semibold text-slate-300 mb-2">Comparativo de Avaliações</h4>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    Realize ao menos uma avaliação com 3+ métricas para ver o gráfico.
                </div>
            </div>
        )
    }

    return (
        <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-700 h-[300px] flex flex-col">
            <h4 className="text-base font-semibold text-slate-300 mb-2">Comparativo de Avaliações</h4>
             <div className="flex-1">
                <ResponsiveContainer width="100%" height="100%">
                    <RadarChart cx="50%" cy="50%" outerRadius="80%" data={chartData}>
                        <PolarGrid stroke="#475569" />
                        <PolarAngleAxis dataKey="subject" stroke="#cbd5e1" fontSize={10} />
                        <PolarRadiusAxis angle={30} domain={[0, 'dataMax']} stroke="transparent" />
                        <Tooltip contentStyle={{ backgroundColor: 'rgba(30, 41, 59, 0.9)', border: '1px solid #475569', color: '#f8fafc', borderRadius: '0.5rem' }}/>
                        <Legend wrapperStyle={{fontSize: '12px'}}/>
                        {initialAssessment && <Radar name="Inicial" dataKey="initial" stroke="#f87171" fill="#f87171" fillOpacity={0.6} />}
                        <Radar name="Atual" dataKey="latest" stroke="#60a5fa" fill="#60a5fa" fillOpacity={0.6} />
                    </RadarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
};