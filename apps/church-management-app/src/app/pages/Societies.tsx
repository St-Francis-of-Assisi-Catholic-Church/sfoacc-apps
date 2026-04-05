import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../contexts/SDKContext';
import { useAuth } from '../contexts/AuthContext';
import { BookMarked, RefreshCw, Users, ShieldAlert } from 'lucide-react';
import { Button } from '../components/ui';
import { toast } from 'sonner';
import { toastApiError, extractApiError } from '../utils/apiError';
import type { Society } from '@sfoacc/sdk';

export default function Societies() {
  const client = useSDK();
  const navigate = useNavigate();
  const { selectedUnit } = useAuth();
  const [items, setItems] = useState<Society[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    setErrorMsg(null);
    client.listSocieties({ limit: 100, church_unit_id: selectedUnit?.id })
      .then(r => {
        setItems(r.data?.items ?? []);
        if (manual) toast.success('Societies refreshed');
      })
      .catch(err => {
        const msg = extractApiError(err, 'Failed to load societies');
        setErrorMsg(msg);
        toastApiError(err, 'Failed to load societies');
      })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, selectedUnit?.id]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Societies</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {items.length > 0 ? `${items.length} societies in ${selectedUnit?.name ?? 'this unit'}` : 'Manage parish societies'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} title="Refresh">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-xl px-4 py-3.5">
          <ShieldAlert className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-red-700">Unable to load societies</p>
            <p className="text-xs text-red-500 mt-0.5">{errorMsg}</p>
          </div>
          <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-100 flex-shrink-0" onClick={() => load(true)} disabled={refreshing}>
            Retry
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 animate-pulse h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-12 text-center">
          <BookMarked className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">No societies found for this unit.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map(s => (
            <div key={s.id} className="bg-card border border-border rounded-xl p-5 hover:shadow-md hover:border-navy/20 transition-all group flex flex-col">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#fef3c7] border border-[#f0d070] flex items-center justify-center flex-shrink-0">
                  <BookMarked className="w-4 h-4 text-[#9a6c00]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-foreground text-sm truncate">{s.name}</h3>
                  <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                    <Users className="w-3 h-3" />
                    <span>{Number((s as unknown as Record<string, unknown>).member_count ?? 0)} members</span>
                    {s.date_inaugurated && (
                      <span className="ml-auto text-[10px] bg-muted px-1.5 py-0.5 rounded">
                        Est. {new Date(String(s.date_inaugurated)).getFullYear()}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              {s.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 flex-1">{s.description}</p>
              )}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border">
                <Button variant="ghost" size="sm" className="flex-1 justify-center" onClick={() => navigate(`/societies/${s.id}`)}>
                  View
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
