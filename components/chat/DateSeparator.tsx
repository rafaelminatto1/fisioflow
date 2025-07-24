import React from 'react';

interface DateSeparatorProps {
  date: string;
}

const DateSeparator: React.FC<DateSeparatorProps> = ({ date }) => {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    // Normalizar datas para comparação (remover hora)
    const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
    
    const normalizedDate = normalizeDate(date);
    const normalizedToday = normalizeDate(today);
    const normalizedYesterday = normalizeDate(yesterday);

    if (normalizedDate.getTime() === normalizedToday.getTime()) {
      return 'Hoje';
    } else if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
      return 'Ontem';
    } else {
      // Verifica se é desta semana
      const daysDiff = Math.floor((normalizedToday.getTime() - normalizedDate.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysDiff <= 7 && daysDiff > 0) {
        return date.toLocaleDateString('pt-BR', { weekday: 'long' });
      } else {
        // Verifica se é deste ano
        if (date.getFullYear() === today.getFullYear()) {
          return date.toLocaleDateString('pt-BR', { 
            day: 'numeric', 
            month: 'long' 
          });
        } else {
          return date.toLocaleDateString('pt-BR', { 
            day: 'numeric', 
            month: 'long', 
            year: 'numeric' 
          });
        }
      }
    }
  };

  return (
    <div className="flex items-center justify-center my-4">
      <div className="flex items-center space-x-4 text-slate-400">
        <div className="flex-1 h-px bg-slate-200"></div>
        <div className="px-3 py-1 bg-slate-100 rounded-full text-xs font-medium text-slate-600">
          {formatDate(date)}
        </div>
        <div className="flex-1 h-px bg-slate-200"></div>
      </div>
    </div>
  );
};

export default DateSeparator;