import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X, Info, Users, Send } from 'lucide-react';
import { Button } from '../../components/ui';
import { MembersTable } from '../../components/admin/MembersTable';
import type { GroupMember } from '../../components/admin/MembersTable';
import { AddMemberModal } from '../../components/admin/AddMemberModal';
import { SendMessageModal } from '../../components/admin/SendMessageModal';

type Data = Record<string, unknown>;
type Tab = 'details' | 'members';

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

export default function CommunityDetail({ backPath = '/admin/communities' }: { backPath?: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();

  const [data, setData] = useState<Data>({});
  const [draft, setDraft] = useState<Data>({});
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('details');
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [msgOpen, setMsgOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    const nid = Number(id);
    Promise.allSettled([
      client.getCommunity(nid),
      client.getCommunityMembers(nid),
    ]).then(([community, mems]) => {
      if (community.status === 'fulfilled') setData((community.value.data as unknown as Data) ?? {});
      if (mems.status === 'fulfilled') {
        const raw = mems.value.data as GroupMember[] | { items?: GroupMember[] } | null;
        const list = Array.isArray(raw) ? raw : (raw as { items?: GroupMember[] })?.items ?? [];
        setMembers(list.map(m => ({ ...m, id: (m.id ?? (m as Record<string, unknown>).parishioner_id) as string })));
      }
    }).catch(err => toastApiError(err, 'Failed to load community'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const reloadMembers = () => {
    if (!id) return;
    client.getCommunityMembers(Number(id)).then(r => {
      const raw = r.data as GroupMember[] | { items?: GroupMember[] } | null;
      const list = Array.isArray(raw) ? raw : (raw as { items?: GroupMember[] })?.items ?? [];
      setMembers(list.map(m => ({ ...m, id: (m.id ?? (m as Record<string, unknown>).parishioner_id) as string })));
    }).catch(() => {});
  };

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
      setData((res.data as unknown as Data) ?? {});
      setEditing(false);
      toast.success('Community updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;

  const TABS: { id: Tab; label: string; icon: React.ElementType; count?: number }[] = [
    { id: 'details', label: 'Details', icon: Info },
    { id: 'members', label: 'Members', icon: Users, count: members.length },
  ];

  return (
    <div className="flex flex-col h-full min-h-0">

      {/* ── Fixed header ── */}
      <div className="flex-shrink-0 pb-0">
        <div className="flex items-center gap-3 pb-4">
          <button onClick={() => navigate(backPath)}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground truncate">{String(data.name ?? 'Community')}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Community · ID #{id} · {members.length} member{members.length !== 1 ? 's' : ''}
            </p>
          </div>
          {tab === 'details' && (
            editing ? (
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
                <Button size="sm" isLoading={saving} onClick={save}><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
              </div>
            ) : (
              <Button variant="outline" size="sm" onClick={startEdit}><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span></Button>
            )
          )}
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 border-b border-border">
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
                tab === t.id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              <t.icon className="w-3.5 h-3.5" />
              {t.label}
              {t.count !== undefined && (
                <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full font-medium">{t.count}</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── Tab content ── */}
      <div className="flex-1 min-h-0 flex flex-col">
        {tab === 'details' && (
          <div className="flex-1 overflow-y-auto">
            <div className="space-y-5 max-w-2xl py-5">
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
            </div>
          </div>
        )}

        {tab === 'members' && (
          <div className="flex-1 min-h-0 mt-5 flex flex-col gap-2">
            {members.length > 0 && (
              <div className="flex justify-end">
                <Button size="sm" variant="outline" onClick={() => setMsgOpen(true)}>
                  <Send className="w-3.5 h-3.5" /> Send Message
                </Button>
              </div>
            )}
            <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
              <MembersTable
                members={members}
                avatarClass="bg-[#e6f7fb] border-[#9dd8e9] text-[#2d7d96]"
                navigateTo={m => `/admin/parishioners/${m.id}`}
                onAddMember={() => setAddMemberOpen(true)}
              />
            </div>
          </div>
        )}
      </div>

      {addMemberOpen && id && (
        <AddMemberModal
          groupId={Number(id)}
          groupType="community"
          existingMemberIds={new Set(members.map(m => m.id))}
          onClose={() => setAddMemberOpen(false)}
          onAdded={reloadMembers}
        />
      )}

      {msgOpen && members.length > 0 && (
        <SendMessageModal
          parishionerIds={members.map(m => m.id)}
          onClose={() => setMsgOpen(false)}
        />
      )}
    </div>
  );
}
