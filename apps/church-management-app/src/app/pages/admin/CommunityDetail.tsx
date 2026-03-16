import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X, Users } from 'lucide-react';
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

export default function CommunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();
  type Member = { id: string; full_name: string; role?: string; email?: string; [key: string]: unknown };

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
      client.getCommunity(nid),
      client.getCommunityMembers(nid),
    ]).then(([community, mems]) => {
      if (community.status === 'fulfilled') setData((community.value.data as Data) ?? {});
      if (mems.status === 'fulfilled') {
        const raw = mems.value.data as Member[] | { items?: Member[] } | null;
        setMembers(Array.isArray(raw) ? raw : (raw as { items?: Member[] })?.items ?? []);
      }
    }).catch(err => toastApiError(err, 'Failed to load community'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.updateCommunity(Number(id), {
        name: draft.name as string,
        description: (draft.description as string) || null,
        location: (draft.location as string) || null,
      });
      setData((res.data as Data) ?? {});
      setEditing(false);
      toast.success('Community updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;

  return (
    <div className="space-y-5 max-w-2xl overflow-y-auto h-full pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/communities')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-display text-xl font-bold text-foreground truncate">{String(data.name ?? 'Community')}</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Community · ID #{id}</p>
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
        <h2 className="text-sm font-semibold text-foreground">Community Details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Name" value={d.name} name="name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Location" value={d.location} name="location" editing={editing} draft={draft} onChange={setField} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
          {editing
            ? <textarea value={String(draft.description ?? '')} onChange={e => setField('description', e.target.value)}
                className={`${INPUT} min-h-[80px] resize-y`} />
            : <p className="text-sm text-foreground">{String(data.description ?? '') || '—'}</p>}
        </div>
      </div>

      {/* Extra info (view-only) */}
      {!editing && (
        <div className="bg-card border border-border rounded-xl p-6">
          <h2 className="text-sm font-semibold text-foreground mb-4">Additional Info</h2>
          <div className="grid grid-cols-2 gap-5">
            {['leader_name', 'church_unit_name', 'created_at'].map(key => (
              <div key={key}>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{key.replace(/_/g, ' ')}</p>
                <p className="text-sm text-foreground">{String(data[key] ?? '') || '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

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
                        <div className="w-7 h-7 rounded-full bg-[#e6f7fb] border border-[#9dd8e9] flex items-center justify-center shrink-0">
                          <span className="text-[#2d7d96] text-xs font-bold">{m.full_name?.charAt(0)?.toUpperCase() ?? '?'}</span>
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">{m.full_name}</p>
                          {m.email && <p className="text-[11px] text-muted-foreground truncate">{m.email}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground capitalize">{m.role?.replace(/_/g, ' ') || '—'}</span>
                    </td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {m.date_joined ? String(m.date_joined) : '—'}
                      </span>
                    </td>
                    <td className="px-5 py-3 hidden lg:table-cell">
                      {m.status ? (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                          m.status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-muted text-muted-foreground'
                        }`}>{String(m.status)}</span>
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
