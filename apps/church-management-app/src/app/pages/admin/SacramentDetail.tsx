import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X } from 'lucide-react';
import { Button } from '../../components/ui';

type Data = Record<string, unknown>;

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const SELECT = `${INPUT} cursor-pointer`;

const SACRAMENT_TYPES = [
  'Baptism', 'First Communion', 'Confirmation', 'Penance',
  'Anointing of the Sick', 'Holy Orders', 'Holy Matrimony',
];

const TYPE_ICONS: Record<string, string> = {
  Baptism: '💧', 'First Communion': '🍞', Confirmation: '🕊️',
  Penance: '🙏', 'Anointing of the Sick': '✝️', 'Holy Orders': '⛪', 'Holy Matrimony': '💍',
};

export default function SacramentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();
  const [data, setData] = useState<Data>({});
  const [draft, setDraft] = useState<Data>({});
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    client.getSacrament(id)
      .then(r => setData((r.data as Data) ?? {}))
      .catch(err => toastApiError(err, 'Failed to load sacrament record'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.updateSacrament(id, {
        type: draft.type as string,
        date: (draft.date as string) || null,
        place: (draft.place as string) || null,
        minister: (draft.minister as string) || null,
      });
      setData((res.data as Data) ?? {});
      setEditing(false);
      toast.success('Sacrament record updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;
  const sacramentType = String(data.type ?? '');
  const icon = TYPE_ICONS[sacramentType] ?? '✝️';

  return (
    <div className="space-y-5 max-w-2xl overflow-y-auto h-full pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/sacraments')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <span className="text-2xl">{icon}</span>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground truncate">{sacramentType || 'Sacrament Record'}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Record · ID #{id}</p>
          </div>
        </div>
        {editing ? (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-3.5 h-3.5" /> Cancel</Button>
            <Button size="sm" isLoading={saving} onClick={save}><Save className="w-3.5 h-3.5" /> Save</Button>
          </div>
        ) : (
          <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="w-3.5 h-3.5" /> Edit</Button>
        )}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Sacrament Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">

          {/* Type */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Sacrament Type</p>
            {editing ? (
              <select value={String(draft.type ?? '')} onChange={e => setField('type', e.target.value)} className={SELECT}>
                <option value="">Select type…</option>
                {SACRAMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            ) : <p className="text-sm text-foreground">{sacramentType || '—'}</p>}
          </div>

          {/* Date */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Date</p>
            {editing
              ? <input type="date" value={String(draft.date ?? '')} onChange={e => setField('date', e.target.value)} className={INPUT} />
              : <p className="text-sm text-foreground">{d.date ? new Date(String(d.date)).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '—'}</p>}
          </div>

          {/* Place */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Place</p>
            {editing
              ? <input value={String(draft.place ?? '')} onChange={e => setField('place', e.target.value)} className={INPUT} />
              : <p className="text-sm text-foreground">{String(d.place ?? '') || '—'}</p>}
          </div>

          {/* Minister */}
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Minister</p>
            {editing
              ? <input value={String(draft.minister ?? '')} onChange={e => setField('minister', e.target.value)} className={INPUT} />
              : <p className="text-sm text-foreground">{String(d.minister ?? '') || '—'}</p>}
          </div>
        </div>

        {/* Parishioner (view-only) */}
        {!!data.parishioner_name && (
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Recipient</p>
            <p className="text-sm text-foreground">{String(data.parishioner_name)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
