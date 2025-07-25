import { Toaster as SonnerToaster } from 'sonner';

const Toaster = () => {
  return (
    <SonnerToaster
      position="top-right"
      richColors
      toastOptions={{
        style: {
          background: '#1e293b',
          borderColor: '#334155',
          color: '#f1f5f9',
        },
        closeButton: true,
      }}
    />
  );
};

export default Toaster;
