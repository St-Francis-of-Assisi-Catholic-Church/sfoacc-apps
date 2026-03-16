import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X, Users } from 'lucide-react';
import { Button } from '../../components/ui';

type Data = Record<string, unknown>;

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const SELECT = `${INPUT} cursor-pointer`;

type Member = { id: string; full_name: string; role?: string; [key: string]: unknown };

function Field({ label, value, name, editing, draft, onChange, type = 'text' }: {
  label: string; value: unknown; name: string;
  editing: boolean; draft: Data; onChange: (n: string, v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {editing
        ? <input type={type} value={String(draft[name] ?? '')} onChange={e => onChange(name, e.target.value)} className={INPUT} />
        : <p className="text-sm text-foreground">{String(value ?? '') || '—'}</p>}
    </div>
  );
}

const FREQ_OPTIONS = ['weekly', 'biweekly', 'monthly', 'quarterly', 'custom'];

export default function SocietyDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();
  const [data, setData] = useState<Data>({});
  const [draft, setDraft] = useState<Data>({});
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    const nid = Number(id);
    Promise.allSettled([
      client.getSociety(nid),
      client.getSocietyMembers(nid),
    ]).then(([society, mems]) => {
      if (society.status === 'fulfilled') setData((society.value.data as Data) ?? {});
      if (mems.status === 'fulfilled') {
        const raw = mems.value.data as Member[] | { items?: Member[] } | null;
        setMembers(Array.isArray(raw) ? raw : (raw as { items?: Member[] })?.items ?? []);
      }
    }).catch(err => toastApiError(err, 'Failed to load society'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.updateSociety(Number(id), {
        name: draft.name as string,
        description: (draft.description as string) || null,
        date_inaugurated: (draft.date_inaugurated as string) || null,
        meeting_frequency: draft.meeting_frequency as string,
        meeting_day: (draft.meeting_day as string) || null,
        meeting_time: (draft.meeting_time as string) || null,
        meeting_venue: (draft.meeting_venue as string) || null,
      } as unknown as Parameters<typeof client.updateSociety>[1]);
      setData((res.data as Data) ?? {});
      setEditing(false);
      toast.success('Society updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;

  return (
    <div className="space-y-5 max-w-3xl overflow-y-auto h-full pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/societies')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground truncate">{String(data.name ?? 'Society')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Society · ID #{id} · {members.length} members</p>
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

      {/* Basic info */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Basic Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Name" value={d.name} name="name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Date Inaugurated" value={d.date_inaugurated} name="date_inaugurated" type="date" editing={editing} draft={draft} onChange={setField} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
          {editing
            ? <textarea value={String(draft.description ?? '')} onChange={e => setField('description', e.target.value)}
                className={`${INPUT} min-h-[80px] resize-y`} />
            : <p className="text-sm text-foreground">{String(data.description ?? '') || '—'}</p>}
        </div>
      </div>

      {/* Meetings */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <h2 className="text-sm font-semibold text-foreground">Meeting Schedule</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Frequency</p>
            {editing ? (
              <select value={String(draft.meeting_frequency ?? '')} onChange={e => setField('meeting_frequency', e.target.value)} className={SELECT}>
                <option value="">Select frequency</option>
                {FREQ_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
              </select>
            ) : <p className="text-sm text-foreground capitalize">{String(data.meeting_frequency ?? '') || '—'}</p>}
          </div>
          <Field label="Meeting Day" value={d.meeting_day} name="meeting_day" editing={editing} draft={draft} onChange={setField} />
          <Field label="Meeting Time" value={d.meeting_time} name="meeting_time" type="time" editing={editing} draft={draft} onChange={setField} />
          <Field label="Venue" value={d.meeting_venue} name="meeting_venue" editing={editing} draft={draft} onChange={setField} />
        </div>
      </div>

      {/* Members */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Members</h2>
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{members.length}</span>
        </div>
        {members.length === 0 ? (
          <div className="p-6 text-sm text-muted-foreground text-center">No members found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/30 border-b border-border">
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Member</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Role</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Date Joined</th>
                  <th className="text-left px-5 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map(m => (
                  <tr key={m.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-full bg-[#fef3c7] border border-[#f0d070] flex items-center justify-center shrink-0">
                          <span className="text-[#9a6c00] text-xs font-bold">{m.full_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{m.full_name}</p>
                          {!!m.email && <p className="text-[11px] text-muted-foreground truncate">{String(m.email)}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{m.role?.replace(/_/g, ' ') || '—'}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {(m as Record<string, unknown>).date_joined ? String((m as Record<string, unknown>).date_joined) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {(m as Record<string, unknown>).status ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          (m as Record<string, unknown>).status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}>{String((m as Record<string, unknown>).status)}</span>
                      ) : <span className="text-xs text-muted-foreground">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
