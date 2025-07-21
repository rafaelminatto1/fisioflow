import React, { useState, useMemo } from 'react';
import { useData } from '../hooks/useData';
import { AuditLog } from '../types';
import {
  IconSearch,
  IconUserShield,
  IconFileText,
  IconDatabase,
} from './icons/IconComponents';

const TabButton: React.FC<{
  tabId: string;
  activeTab: string;
  label: string;
  icon: React.ReactNode;
  onClick: (tabId: string) => void;
}> = ({ tabId, activeTab, label, icon, onClick }) => (
  <button
    onClick={() => onClick(tabId)}
    className={`flex items-center gap-2 rounded-t-md border-b-2 px-4 py-2 text-sm font-medium transition-colors ${activeTab === tabId ? 'border-blue-500 text-white' : 'border-transparent text-slate-400 hover:border-slate-500 hover:text-white'}`}
  >
    {icon} {label}
  </button>
);

const AuditLogTab: React.FC<{ logs: AuditLog[] }> = ({ logs }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredLogs = useMemo(() => {
    return logs.filter(
      (log) =>
        log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.targetName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [logs, searchTerm]);

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <IconSearch
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          size={18}
        />
        <input
          type="text"
          placeholder="Buscar por usuário, ação, alvo..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-md border border-slate-600 bg-slate-900 py-2 pl-10 pr-4 text-slate-100 outline-none transition focus:ring-2 focus:ring-blue-500"
        />
      </div>
      <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-300">
            <thead className="bg-slate-900/50 text-xs uppercase text-slate-400">
              <tr>
                <th scope="col" className="px-6 py-3">
                  Data/Hora
                </th>
                <th scope="col" className="px-6 py-3">
                  Usuário
                </th>
                <th scope="col" className="px-6 py-3">
                  Ação
                </th>
                <th scope="col" className="px-6 py-3">
                  Alvo
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-700">
              {filteredLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-700/50">
                  <td className="whitespace-nowrap px-6 py-4">
                    {new Date(log.timestamp).toLocaleString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 font-medium text-slate-100">
                    {log.userName}
                  </td>
                  <td className="px-6 py-4">
                    <span className="rounded-full bg-blue-900/70 px-2 py-1 text-xs font-semibold text-blue-300">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {log.targetName || log.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredLogs.length === 0 && (
            <div className="py-10 text-center text-slate-400">
              <p>Nenhum log encontrado.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const PoliciesTab: React.FC = () => (
  <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-blue-400 max-w-none">
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3>Criptografia de Dados</h3>
      <p>
        Todos os dados no FisioFlow são criptografados tanto em trânsito (usando
        HTTPS/TLS) quanto em repouso nos servidores do Google Cloud. Isso
        garante uma linha de base de segurança robusta para todas as
        informações, incluindo Dados Pessoais Sensíveis e Informações de Saúde
        Protegidas (PHI).
      </p>
    </div>
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3>Business Associate Agreement (BAA) com Google Cloud</h3>
      <p>
        Para operar em conformidade com a HIPAA nos Estados Unidos, é{' '}
        <strong>obrigatório</strong> que a clínica assine um BAA (Business
        Associate Agreement) com o Google Cloud. Este contrato legal garante que
        o Google aplicará as salvaguardas necessárias para proteger PHI.
      </p>
      <p>
        Este acordo deve ser gerenciado através do console do Google Cloud e é
        uma responsabilidade da administração da clínica.
      </p>
    </div>
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3>Data Processing Addendum (DPA)</h3>
      <p>
        Para conformidade com a LGPD e outras regulamentações de privacidade, a
        clínica deve garantir que possui um DPA (Adendo de Processamento de
        Dados) com todos os fornecedores de serviços terceirizados que processam
        dados de pacientes. O DPA do Google Cloud já cobre os serviços
        utilizados por esta aplicação.
      </p>
    </div>
  </div>
);

const BackupTab: React.FC = () => (
  <div className="prose prose-invert prose-p:text-slate-300 prose-headings:text-slate-100 prose-a:text-blue-400 max-w-none">
    <div className="rounded-lg border border-slate-700 bg-slate-800 p-6">
      <h3>Política de Backup e Recuperação</h3>
      <p>
        A estratégia de backup do FisioFlow é projetada para garantir a
        integridade e disponibilidade dos dados, em conformidade com as melhores
        práticas de LGPD e HIPAA.
      </p>
      <h4>1. Recuperação Point-in-Time (PITR) do Firestore</h4>
      <p>
        O banco de dados principal possui o PITR ativado. Isso permite a
        restauração do banco de dados para qualquer estado de um microssegundo
        específico nos últimos 7 dias. É a nossa principal defesa contra
        exclusões ou corrupções acidentais de dados.
      </p>
      <h4>2. Exports Programados</h4>
      <p>
        Diariamente, é realizado um export completo do banco de dados para um
        bucket seguro no Google Cloud Storage. Estes backups são arquivados para
        retenção de longo prazo (ex: 1 ano) e podem ser usados para recuperação
        em caso de desastres maiores. O acesso a este bucket de armazenamento é
        restrito a administradores de sistema.
      </p>
      <button className="rounded-lg bg-blue-600 px-4 py-2 font-bold text-white no-underline transition-colors hover:bg-blue-700">
        Simular Exportação Manual
      </button>
    </div>
  </div>
);

const CompliancePage: React.FC = () => {
  const { auditLogs } = useData();
  const [activeTab, setActiveTab] = useState('audit');

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-slate-100">
        Compliance e Auditoria
      </h1>

      <div className="border-b border-slate-700">
        <nav className="-mb-px flex space-x-2">
          <TabButton
            tabId="audit"
            activeTab={activeTab}
            label="Log de Auditoria"
            icon={<IconUserShield size={16} />}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="policies"
            activeTab={activeTab}
            label="Políticas de Dados"
            icon={<IconFileText size={16} />}
            onClick={setActiveTab}
          />
          <TabButton
            tabId="backup"
            activeTab={activeTab}
            label="Backup e Recuperação"
            icon={<IconDatabase size={16} />}
            onClick={setActiveTab}
          />
        </nav>
      </div>

      <div>
        {activeTab === 'audit' && <AuditLogTab logs={auditLogs} />}
        {activeTab === 'policies' && <PoliciesTab />}
        {activeTab === 'backup' && <BackupTab />}
      </div>
    </div>
  );
};

export default CompliancePage;
