import React from 'react';
import { FixedSizeList as List } from 'react-window';
import { Patient } from '../../types';
import { IconClipboardList } from '../icons/IconComponents';

interface VirtualizedPatientListProps {
  patients: Patient[];
  onPatientClick: (patient: Patient) => void;
  getTasksCount: (patientId: string) => number;
  height: number;
}

interface PatientRowProps {
  index: number;
  style: React.CSSProperties;
  data: {
    patients: Patient[];
    onPatientClick: (patient: Patient) => void;
    getTasksCount: (patientId: string) => number;
  };
}

const PatientRow: React.FC<PatientRowProps> = ({ index, style, data }) => {
  const { patients, onPatientClick, getTasksCount } = data;
  const patient = patients[index];

  if (!patient) return null;

  return (
    <div style={style}>
      <div
        onClick={() => onPatientClick(patient)}
        className="flex cursor-pointer items-center justify-between border-b border-slate-700 p-4 transition-colors last:border-b-0 hover:bg-slate-700/50"
      >
        <div className="flex items-center">
          <img
            src={patient.avatarUrl}
            alt={patient.name}
            className="mr-4 h-12 w-12 rounded-full border-2 border-slate-600"
          />
          <div>
            <p className="text-lg font-semibold text-slate-100">
              {patient.name}
            </p>
            <p className="text-sm text-slate-400">{patient.email}</p>
          </div>
        </div>
        <div className="hidden items-center text-slate-400 sm:flex">
          <IconClipboardList className="mr-2 h-5 w-5" />
          <span>{getTasksCount(patient.id)} tarefas</span>
        </div>
      </div>
    </div>
  );
};

const VirtualizedPatientList: React.FC<VirtualizedPatientListProps> = ({
  patients,
  onPatientClick,
  getTasksCount,
  height,
}) => {
  const itemData = {
    patients,
    onPatientClick,
    getTasksCount,
  };

  return (
    <div className="overflow-hidden rounded-lg border border-slate-700 bg-slate-800">
      {patients.length === 0 ? (
        <div className="p-6 text-center text-slate-400">
          Nenhum paciente encontrado.
        </div>
      ) : (
        <List
          height={height}
          itemCount={patients.length}
          itemSize={80} // Height of each patient row
          itemData={itemData}
        >
          {PatientRow}
        </List>
      )}
    </div>
  );
};

export default VirtualizedPatientList;
