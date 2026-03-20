import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { Building2, Plus, RefreshCw, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button } from '../../components/ui';
import type { ChurchUnit } from '@sfoacc/sdk';

export default function AdminChurchUnits() {
  const client = useSDK();
  const navigate = useNavigate();
  const [items, setItems] = useState<ChurchUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    Promise.allSettled([
      client.listOutstations({ limit: 100 }),
      client.listChurchUnits({ limit: 100 }),
    ]).then(([out, units]) => {
      const combined: ChurchUnit[] = [];
      if (out.status === 'fulfilled') combined.push(...(out.value.data?.items ?? []));
      if (units.status === 'fulfilled') combined.push(...(units.value.data?.items ?? []));
      const seen = new Set<number>();
      setItems(combined.filter(u => { if (seen.has(u.id)) return false; seen.add(u.id); return true; }));
      if (manual) toast.success('Church units refreshed');
    }).catch(err => {
      if (manual) toastApiError(err, 'Failed to refresh');
    }).finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(); }, [load]);

  const parishes = items.filter(u => u.type === 'parish');
  const outstationsByParish = items.reduce<Record<number, ChurchUnit[]>>((acc, u) => {
    if (u.type === 'outstation' && u.parent_id) {
      (acc[u.parent_id] ??= []).push(u);
    }
    return acc;
  }, {});
  const orphanOutstations = items.filter(u => u.type === 'outstation' && !u.parent_id);

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Church Units</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage all parish and outstation units</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing}>
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </Button>
          <Button size="sm"><Plus className="w-3.5 h-3.5" /> Add Unit</Button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading church units…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No church units found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Location</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {parishes.map(parish => (
                  <>
                    {/* Parish row */}
                    <tr key={parish.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-navy/10 border border-navy/15 flex items-center justify-center">
                            <Building2 className="w-4 h-4 text-navy" />
                          </div>
                          <span className="font-semibold text-foreground">{parish.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-navy/10 text-navy">Parish</span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                        {parish.location_description ?? '—'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/church-units/${parish.id}`)}>View</Button>
                      </td>
                    </tr>

                    {/* Outstation children */}
                    {(outstationsByParish[parish.id] ?? []).map(out => (
                      <tr key={out.id} className="hover:bg-muted/20 transition-colors bg-muted/5">
                        <td className="px-5 py-3">
                          <div className="flex items-center gap-3 pl-8">
                            <div className="flex items-center gap-1.5 text-muted-foreground">
                              <span className="w-4 border-l-2 border-b-2 border-border h-4 rounded-bl-sm inline-block" />
                            </div>
                            <div className="w-7 h-7 rounded-md bg-muted border border-border flex items-center justify-center">
                              <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                            </div>
                            <span className="font-medium text-foreground">{out.name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Outstation</span>
                        </td>
                        <td className="px-5 py-3 text-muted-foreground hidden md:table-cell">
                          {out.location_description ?? '—'}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/church-units/${out.id}`)}>View</Button>
                        </td>
                      </tr>
                    ))}
                  </>
                ))}

                {/* Orphaned outstations with no parent */}
                {orphanOutstations.map(out => (
                  <tr key={out.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-muted border border-border flex items-center justify-center">
                          <MapPin className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{out.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">Outstation</span>
                    </td>
                    <td className="px-5 py-3.5 text-muted-foreground hidden md:table-cell">
                      {out.location_description ?? '—'}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/church-units/${out.id}`)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
