import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { ArrowLeft, Pencil, Save, X, CheckCircle, Clock } from 'lucide-react';
import { Button } from '../../components/ui';

type Data = Record<string, unknown>;

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';
const SELECT = `${INPUT} cursor-pointer`;

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

function SelectField({ label, value, name, options, editing, draft, onChange }: {
  label: string; value: unknown; name: string; options: string[];
  editing: boolean; draft: Data; onChange: (n: string, v: string) => void;
}) {
  return (
    <div>
      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">{label}</p>
      {editing ? (
        <select value={String(draft[name] ?? '')} onChange={e => onChange(name, e.target.value)} className={SELECT}>
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : <p className="text-sm text-foreground capitalize">{String(value ?? '') || '—'}</p>}
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

export default function ParishionerDetail() {
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
    client.getParishioner(id)
      .then(r => setData((r.data as Data) ?? {}))
      .catch(err => toastApiError(err, 'Failed to load parishioner'))
      .finally(() => setLoading(false));
  }, [id, client]);

  const startEdit = () => { setDraft({ ...data }); setEditing(true); };
  const cancelEdit = () => setEditing(false);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const res = await client.updateParishioner(id, {
        first_name: draft.first_name as string,
        other_names: (draft.other_names as string) || null,
        last_name: draft.last_name as string,
        maiden_name: (draft.maiden_name as string) || null,
        gender: draft.gender as string,
        date_of_birth: (draft.date_of_birth as string) || null,
        place_of_birth: (draft.place_of_birth as string) || null,
        hometown: (draft.hometown as string) || null,
        region: (draft.region as string) || null,
        country: (draft.country as string) || null,
        marital_status: (draft.marital_status as string) || null,
        mobile_number: (draft.mobile_number as string) || null,
        whatsapp_number: (draft.whatsapp_number as string) || null,
        email_address: (draft.email_address as string) || null,
        current_residence: (draft.current_residence as string) || null,
      } as unknown as Parameters<typeof client.updateParishioner>[1]);
      setData((res.data as Data) ?? {});
      setEditing(false);
      toast.success('Parishioner updated.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;

  const d = editing ? draft : data;
  const isVerified = data.is_verified || data.verification_status === 'verified';
  const fullName = [data.first_name, data.other_names, data.last_name].filter(Boolean).join(' ') || String(data.full_name ?? 'Parishioner');

  return (
    <div className="space-y-5 max-w-3xl overflow-y-auto h-full pb-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate('/admin/parishioners')} className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-full bg-navy/10 border border-navy/15 flex items-center justify-center flex-shrink-0">
            <span className="text-navy font-bold text-sm">{String(data.full_name ?? data.first_name ?? '?').charAt(0)}</span>
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-foreground truncate">{fullName}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {!!data.church_id && <span className="text-xs text-muted-foreground">{String(data.church_id)}</span>}
              {isVerified ? (
                <span className="flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                  <CheckCircle className="w-2.5 h-2.5" /> Verified
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-full">
                  <Clock className="w-2.5 h-2.5" /> Pending
                </span>
              )}
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

      <Section title="Personal Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="First Name" value={d.first_name} name="first_name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Other Names" value={d.other_names} name="other_names" editing={editing} draft={draft} onChange={setField} />
          <Field label="Last Name" value={d.last_name} name="last_name" editing={editing} draft={draft} onChange={setField} />
          <Field label="Maiden Name" value={d.maiden_name} name="maiden_name" editing={editing} draft={draft} onChange={setField} />
          <SelectField label="Gender" value={d.gender} name="gender" options={['male', 'female', 'other']} editing={editing} draft={draft} onChange={setField} />
          <Field label="Date of Birth" value={d.date_of_birth} name="date_of_birth" type="date" editing={editing} draft={draft} onChange={setField} />
          <SelectField label="Marital Status" value={d.marital_status} name="marital_status"
            options={['single', 'married', 'widowed', 'divorced', 'separated']} editing={editing} draft={draft} onChange={setField} />
          <SelectField label="Membership Status" value={d.membership_status} name="membership_status"
            options={['active', 'deceased', 'disabled']} editing={editing} draft={draft} onChange={setField} />
        </div>
      </Section>

      <Section title="Contact Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Mobile Number" value={d.mobile_number} name="mobile_number" editing={editing} draft={draft} onChange={setField} />
          <Field label="WhatsApp Number" value={d.whatsapp_number} name="whatsapp_number" editing={editing} draft={draft} onChange={setField} />
          <div className="sm:col-span-2">
            <Field label="Email Address" value={d.email_address} name="email_address" editing={editing} draft={draft} onChange={setField} />
          </div>
        </div>
      </Section>

      <Section title="Location & Origin">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Place of Birth" value={d.place_of_birth} name="place_of_birth" editing={editing} draft={draft} onChange={setField} />
          <Field label="Hometown" value={d.hometown} name="hometown" editing={editing} draft={draft} onChange={setField} />
          <Field label="Region" value={d.region} name="region" editing={editing} draft={draft} onChange={setField} />
          <Field label="Country" value={d.country} name="country" editing={editing} draft={draft} onChange={setField} />
          <div className="sm:col-span-2">
            <Field label="Current Residence" value={d.current_residence} name="current_residence" editing={editing} draft={draft} onChange={setField} />
          </div>
        </div>
      </Section>

      {/* Sacraments (view-only) */}
      {!editing && Array.isArray(data.sacraments) && (data.sacraments as unknown[]).length > 0 && (
        <Section title="Sacraments">
          <div className="divide-y divide-border -my-2">
            {(data.sacraments as Data[]).map((s, i) => (
              <div key={i} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                <div>
                  <p className="text-sm font-medium text-foreground">{String(s.type ?? s.sacrament_type ?? '')}</p>
                  <p className="text-xs text-muted-foreground">{String(s.date_received ?? s.date ?? '')} {s.place ? `· ${s.place}` : ''}</p>
                </div>
                {!!s.minister && <p className="text-xs text-muted-foreground">{String(s.minister)}</p>}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}
