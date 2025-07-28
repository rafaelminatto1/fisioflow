import React from 'react';

import { IconSparkles } from '../icons/IconComponents';

const PageLoader: React.FC<{ message?: string }> = ({
  message = 'Carregando dados...',
}) => (
  <div className="flex h-full flex-col items-center justify-center text-slate-400">
    <IconSparkles className="mb-4 animate-spin text-blue-500" size={40} />
    <p className="text-lg font-medium">{message}</p>
  </div>
);

export default PageLoader;
