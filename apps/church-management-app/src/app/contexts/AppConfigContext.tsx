import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { SFOACCClient } from '@sfoacc/sdk';

export interface AppConfig {
  name: string;
  description: string;
  version: string;
  church_code: string;
  currency_symbol: string;
  currency_code: string;
  contact_email: string;
  contact_phone: string;
  website: string;
  address: string;
  logo_url: string;
  support_email: string;
}

const DEFAULTS: AppConfig = {
  name: 'Church Management System',
  description: '',
  version: '',
  church_code: '',
  currency_symbol: '¢',
  currency_code: 'GHS',
  contact_email: '',
  contact_phone: '',
  website: '',
  address: '',
  logo_url: '',
  support_email: '',
};

const AppConfigContext = createContext<{ config: AppConfig; loading: boolean }>({
  config: DEFAULTS,
  loading: true,
});

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

// Standalone client — no auth token needed (public endpoint)
const configClient = new SFOACCClient({ baseUrl: API_BASE_URL });

export function AppConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<AppConfig>(DEFAULTS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    configClient.getAppConfig()
      .then(res => {
        if (res.data) setConfig({ ...DEFAULTS, ...res.data });
      })
      .catch(() => {
        // Keep defaults on failure — app still works
      })
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppConfigContext.Provider value={{ config, loading }}>
      {children}
    </AppConfigContext.Provider>
  );
}

export function useAppConfig() {
  return useContext(AppConfigContext);
}
