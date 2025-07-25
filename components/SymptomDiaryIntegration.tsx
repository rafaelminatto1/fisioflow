import React, { useState } from 'react';
import { Patient } from '../types';
import { SymptomDiary } from './SymptomDiary';

interface SymptomDiaryIntegrationProps {
  patient: Patient;
}

/**
 * Componente de integração para o Diário de Sintomas
 * Este componente pode ser usado em qualquer lugar do sistema para abrir o diário de sintomas
 */
export const SymptomDiaryIntegration: React.FC<
  SymptomDiaryIntegrationProps
> = ({ patient }) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenDiary = () => {
    setIsOpen(true);
  };

  const handleCloseDiary = () => {
    setIsOpen(false);
  };

  return (
    <>
      {/* Botão para abrir o diário - pode ser personalizado conforme necessário */}
      <button
        onClick={handleOpenDiary}
        className="flex items-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
      >
        <span className="text-lg">📊</span>
        <span className="font-medium">Diário de Sintomas</span>
      </button>

      {/* Modal do Diário de Sintomas */}
      <SymptomDiary
        patient={patient}
        isOpen={isOpen}
        onClose={handleCloseDiary}
      />
    </>
  );
};

export default SymptomDiaryIntegration;

/**
 * EXEMPLO DE USO:
 *
 * // Em qualquer componente onde você tenha um paciente
 * import { SymptomDiaryIntegration } from './components/SymptomDiaryIntegration';
 *
 * const PatientDetailsPage = ({ patient }) => {
 *   return (
 *     <div>
 *       <h1>{patient.name}</h1>
 *
 *       // ... outros componentes do paciente
 *
 *       <SymptomDiaryIntegration patient={patient} />
 *     </div>
 *   );
 * };
 *
 *
 * FUNCIONALIDADES IMPLEMENTADAS:
 *
 * ✅ REGISTRO DIÁRIO:
 * - Escala de dor (0-10) com localização anatômica
 * - Nível de energia/fadiga (1-5)
 * - Qualidade do sono (1-5)
 * - Humor/bem-estar (1-5)
 * - Medicamentos tomados
 * - Exercícios realizados
 *
 * ✅ INTERFACE DE REGISTRO:
 * - Formulário rápido (menos de 2 minutos)
 * - Escalas visuais (emojis, barras)
 * - Mapa corporal para localizar dor
 * - Fotos de evolução (suporte básico)
 * - Notas em texto livre
 *
 * ✅ VISUALIZAÇÃO DE DADOS:
 * - Gráficos de tendência por métrica
 * - Correlações entre variáveis
 * - Relatórios semanais/mensais
 * - Comparação com períodos anteriores
 * - Alertas para piora significativa
 *
 * ✅ INSIGHTS AUTOMÁTICOS:
 * - Identificação de padrões
 * - Sugestões baseadas nos dados
 * - Alertas para fisioterapeuta
 * - Recomendações personalizadas
 *
 * ✅ ESPECIFICAÇÕES TÉCNICAS:
 * - Persistência em localStorage
 * - Gráficos interativos (componentes próprios)
 * - Algoritmos de análise de tendência
 * - Interface mobile-first
 * - Sistema multi-tenant
 * - Auditoria completa
 *
 *
 * ESTRUTURA DE COMPONENTES:
 *
 * SymptomDiary (Principal)
 * ├── SymptomDiaryEntry (Modal de registro)
 * ├── AnatomicalBodyMap (Mapa corporal)
 * ├── SymptomDataVisualization (Gráficos)
 * ├── SymptomInsightsPanel (Insights automáticos)
 * └── SymptomReports (Relatórios)
 *
 * Serviços:
 * ├── SymptomAnalysisService (Análise de tendências)
 * └── useData hooks (Persistência)
 *
 *
 * COMO USAR OS DIFERENTES MODOS:
 *
 * 1. REGISTRO RÁPIDO (< 2 minutos):
 *    - Apenas métricas essenciais
 *    - Interface simplificada
 *    - Ideal para uso diário
 *
 * 2. REGISTRO COMPLETO:
 *    - Todas as funcionalidades
 *    - Mapa corporal detalhado
 *    - Medicamentos e exercícios
 *    - Notas detalhadas
 *
 * 3. VISUALIZAÇÃO:
 *    - Gráficos de linha temporais
 *    - Mapas de calor por horário
 *    - Matriz de correlação
 *    - Estatísticas resumidas
 *
 * 4. INSIGHTS:
 *    - Análise automática de padrões
 *    - Tendências significativas
 *    - Alertas personalizados
 *    - Recomendações baseadas em dados
 *
 * 5. RELATÓRIOS:
 *    - Relatórios semanais/mensais
 *    - Comparação de períodos
 *    - Análise detalhada
 *    - Exportação em PDF/Excel/CSV
 */
