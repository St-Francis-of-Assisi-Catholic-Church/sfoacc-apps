import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X, Building2 } from 'lucide-react';
import { Button } from '../../components/ui';

type Data = Record<string, unknown>;

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function Field({ label, value, name, editing, draft, onChange }: {
  label: string; value: unknown; name: string;
  editing: boolean; draft: Data; onChange: (n: string, v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {editing
        ? <input value={String(draft[name] ?? '')} onChange={e => onChange(name, e.target.value)} className={INPUT} />
        : <p className="text-sm text-foreground">{String(value ?? '') || '—'}</p>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl p-6 space-y-5">
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function ChurchUnitDetail() {
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
    client.getChurchUnit(Number(id))
      .then(r => setData((r.data as Data) ?? {}))
      .catch(err => toastApiError(err, 'Failed to load church unit'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.updateChurchUnit(Number(id), {
        name: draft.name as string,
        diocese: (draft.diocese as string) || null,
        address: (draft.address as string) || null,
        phone: (draft.phone as string) || null,
        email: (draft.email as string) || null,
        website: (draft.website as string) || null,
        pastor_name: (draft.pastor_name as string) || null,
        pastor_email: (draft.pastor_email as string) || null,
        pastor_phone: (draft.pastor_phone as string) || null,
        established_date: (draft.established_date as string) || null,
        location_description: (draft.location_description as string) || null,
      } as unknown as Parameters<typeof client.updateChurchUnit>[1]);
      setData((res.data as Data) ?? {});
      setEditing(false);
      toast.success('Church unit updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;
  const isParish = data.type === 'parish';

  return (
    <div className="space-y-5 max-w-3xl overflow-y-auto h-full pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/church-units')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${isParish ? 'bg-navy/10' : 'bg-muted'}`}>
            <Building2 className={`w-4 h-4 ${isParish ? 'text-navy' : 'text-muted-foreground'}`} />
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground truncate">{String(data.name ?? 'Church Unit')}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${isParish ? 'bg-navy/10 text-navy' : 'bg-muted text-muted-foreground'}`}>
                {String(data.type ?? '')}
              </span>
              {!!data.diocese && <span className="text-xs text-muted-foreground">{String(data.diocese)}</span>}
            </div>
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

      <Section title="General Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Name" value={d.name} name="name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Diocese" value={d.diocese} name="diocese" editing={editing} draft={draft} onChange={setField} />
          <Field label="Established Date" value={d.established_date} name="established_date" editing={editing} draft={draft} onChange={setField} />
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Type</p>
            <p className="text-sm text-foreground capitalize">{String(data.type ?? '') || '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Location Description</p>
          {editing
            ? <textarea value={String(draft.location_description ?? '')} onChange={e => setField('location_description', e.target.value)}
                className={`${INPUT} min-h-[80px] resize-y`} />
            : <p className="text-sm text-foreground">{String(data.location_description ?? '') || '—'}</p>}
        </div>
      </Section>

      <Section title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Address" value={d.address} name="address" editing={editing} draft={draft} onChange={setField} />
          <Field label="Phone" value={d.phone} name="phone" editing={editing} draft={draft} onChange={setField} />
          <Field label="Email" value={d.email} name="email" editing={editing} draft={draft} onChange={setField} />
          <Field label="Website" value={d.website} name="website" editing={editing} draft={draft} onChange={setField} />
        </div>
      </Section>

      <Section title="Pastor / Priest in Charge">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Name" value={d.pastor_name} name="pastor_name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Phone" value={d.pastor_phone} name="pastor_phone" editing={editing} draft={draft} onChange={setField} />
          <div className="sm:col-span-2">
            <Field label="Email" value={d.pastor_email} name="pastor_email" editing={editing} draft={draft} onChange={setField} />
          </div>
        </div>
      </Section>
    </div>
  );
}
