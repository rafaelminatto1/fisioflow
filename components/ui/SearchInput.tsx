import React from 'react';

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  placeholder = 'Buscar...',
  className = '',
}) => {
  return (
    <input
      type="text"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full max-w-sm rounded-md border border-slate-700 bg-slate-800 px-4 py-2 text-slate-100 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500 ${className}`}
    />
  );
};

export default SearchInput;
