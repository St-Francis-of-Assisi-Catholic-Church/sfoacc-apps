import { StrictMode, useEffect } from 'react';
import { BrowserRouter, useLocation } from 'react-router-dom';
import * as ReactDOM from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster as SonnerToaster } from 'sonner';

import './tailwind.css';
import App from './app/app';
import { AuthProvider } from './app/contexts/AuthContext';
import { AdminAuthProvider } from './app/contexts/AdminAuthContext';
import { SDKProvider } from './app/contexts/SDKContext';
import { AppConfigProvider } from './app/contexts/AppConfigContext';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// In dev the Vite proxy forwards /api/* to the backend — no CORS.
// In production VITE_API_URL must be set to the full backend URL.
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: 1,
    },
  },
});

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <StrictMode>
    <AppConfigProvider>
      <QueryClientProvider client={queryClient}>
        <SDKProvider baseUrl={API_BASE_URL}>
          <BrowserRouter>
            <ScrollToTop />
            <AdminAuthProvider>
              <AuthProvider>
              <SonnerToaster
                expand={false}
                position="top-right"
                richColors
                closeButton
              />
              <App />
              </AuthProvider>
            </AdminAuthProvider>
          </BrowserRouter>
        </SDKProvider>
      </QueryClientProvider>
    </AppConfigProvider>
  </StrictMode>
);
