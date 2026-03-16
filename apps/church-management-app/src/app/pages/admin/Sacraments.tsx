import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { RefreshCw } from 'lucide-react';
import { Button } from '../../components/ui';

type SacramentRecord = { id: string | number; type?: string; date?: string; place?: string; minister?: string; parishioner_name?: string; [key: string]: unknown };

const TYPE_ICONS: Record<string, string> = {
  Baptism: '💧', 'First Communion': '🍞', Confirmation: '🕊️',
  Penance: '🙏', 'Anointing of the Sick': '✝️', 'Holy Orders': '⛪', 'Holy Matrimony': '💍',
};

export default function AdminSacraments() {
  const client = useSDK();
  const navigate = useNavigate();
  const [items, setItems] = useState<SacramentRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    client.listSacraments({ limit: 100 })
      .then(r => {
        const data = r.data;
        if (Array.isArray(data)) { setItems(data as SacramentRecord[]); setTotal((data as unknown[]).length); }
        else { setItems((data?.items ?? []) as SacramentRecord[]); setTotal(data?.total ?? 0); }
        if (manual) toast.success('Sacraments refreshed');
      })
      .catch(err => { if (manual) toastApiError(err, 'Failed to refresh'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Sacraments</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{total} sacrament records</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Refreshing…' : 'Refresh'}
        </Button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading sacrament records…</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No sacrament records found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Sacrament</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Recipient</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date</th>
                <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Minister</th>
                <th className="px-5 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map(s => {
                const icon = TYPE_ICONS[String(s.type ?? '')] ?? '✝️';
                return (
                  <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="text-lg">{icon}</span>
                        <span className="font-medium text-foreground">{String(s.type ?? '—')}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden sm:table-cell">
                      {String(s.parishioner_name ?? '—')}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs hidden md:table-cell">
                      {s.date ? new Date(String(s.date)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground text-xs hidden lg:table-cell">
                      {String(s.minister ?? '—')}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/sacraments/${s.id}`)}>View</Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      </div>
    </div>
  );
}
