import { createContext, useContext, ReactNode, useMemo } from 'react';
import { SFOACCClient } from '@sfoacc/sdk';

const SDKContext = createContext<SFOACCClient | null>(null);

interface SDKProviderProps {
  baseUrl: string;
  tokenKey?: string;
  unitId?: number;
  onUnauthorized?: () => void;
  children: ReactNode;
}

export function SDKProvider({ baseUrl, tokenKey = 'auth_token', unitId, onUnauthorized, children }: SDKProviderProps) {
  const client = useMemo(() => {
    const token = localStorage.getItem(tokenKey);
    return new SFOACCClient({ baseUrl, token: token ?? undefined, unitId, onUnauthorized });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseUrl, tokenKey, unitId, onUnauthorized]);

  return <SDKContext.Provider value={client}>{children}</SDKContext.Provider>;
}

export function useSDK(): SFOACCClient {
  const client = useContext(SDKContext);
  if (!client) throw new Error('useSDK must be used within SDKProvider');
  return client;
}
