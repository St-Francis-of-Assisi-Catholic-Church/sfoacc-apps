import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import {
  ArrowLeft, Pencil, Save, X, Building2, MapPin,
  ChevronDown, Phone, Mail, Globe, Users, BookMarked,
  Users2, CalendarDays, ChurchIcon, Plus, Trash2, UserCheck, Clock,
} from 'lucide-react';
import { Button } from '../../components/ui';
import type { ParishDetail, OutstationDetail, ChurchUnit, LeadershipRead, LeadershipRole, MassSchedule, DayOfWeek, MassType } from '@sfoacc/sdk';

const DAYS: { value: DayOfWeek; label: string }[] = [
  { value: 'sunday', label: 'Sunday' },
  { value: 'monday', label: 'Monday' },
  { value: 'tuesday', label: 'Tuesday' },
  { value: 'wednesday', label: 'Wednesday' },
  { value: 'thursday', label: 'Thursday' },
  { value: 'friday', label: 'Friday' },
  { value: 'saturday', label: 'Saturday' },
];
const MASS_TYPES: { value: MassType; label: string }[] = [
  { value: 'sunday', label: 'Sunday Mass' },
  { value: 'weekday', label: 'Weekday Mass' },
  { value: 'saturday', label: 'Saturday Mass' },
  { value: 'holy_day', label: 'Holy Day' },
  { value: 'special', label: 'Special' },
];

type ScheduleDraft = { day_of_week: DayOfWeek; time: string; mass_type: MassType; language: string; description: string };
const EMPTY_SCHEDULE: ScheduleDraft = { day_of_week: 'sunday', time: '08:00', mass_type: 'sunday', language: 'English', description: '' };

type DetailData = ParishDetail | OutstationDetail;

const INPUT = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring';

function Field({ label, value, name, editing, draft, onChange }: {
  label: string; value: unknown; name: string;
  editing: boolean; draft: Record<string, unknown>; onChange: (n: string, v: string) => void;
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

function StatTile({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: number | string; color: string;
}) {
  return (
    <div className="bg-card border border-border rounded-xl p-4 py-6 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <p className="text-xl font-bold text-foreground leading-tight">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
      </div>
    </div>
  );
}

function CollapsibleCard({ title, expanded, onToggle, headerAction, children }: {
  title: string; expanded: boolean;
  onToggle: () => void;
  headerAction?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60">
        <button onClick={onToggle} className="flex items-center gap-2 flex-1 text-left">
          <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? '' : '-rotate-90'}`} />
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </button>
        {headerAction}
      </div>
      {expanded && <div className="p-5 space-y-5">{children}</div>}
    </div>
  );
}

function ScheduleForm({ draft, onChange, saving, onSave, onCancel }: {
  draft: ScheduleDraft;
  onChange: (d: ScheduleDraft) => void;
  saving: boolean; onSave: () => void; onCancel: () => void;
}) {
  const set = (k: keyof ScheduleDraft, v: string) => onChange({ ...draft, [k]: v });
  return (
    <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3 mb-2">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Day *</p>
          <select value={draft.day_of_week} onChange={e => set('day_of_week', e.target.value)} className={INPUT}>
            {DAYS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Time *</p>
          <input type="time" value={draft.time} onChange={e => set('time', e.target.value)} className={INPUT} />
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Type</p>
          <select value={draft.mass_type} onChange={e => set('mass_type', e.target.value)} className={INPUT}>
            {MASS_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Language</p>
          <input value={draft.language} onChange={e => set('language', e.target.value)} className={INPUT} placeholder="English" />
        </div>
      </div>
      <div>
        <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Description</p>
        <input value={draft.description} onChange={e => set('description', e.target.value)} className={INPUT} placeholder="Optional note…" />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" isLoading={saving} onClick={onSave}><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
        <Button variant="outline" size="sm" onClick={onCancel}><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
      </div>
    </div>
  );
}

type PriestDraft = { name: string; phone: string; email: string; role?: string };
const EMPTY_PRIEST: PriestDraft = { name: '', phone: '', email: '', role: 'assistant_priest' };

export default function ChurchUnitDetail({
  backPath = '/admin/church-units',
  basePath = '/admin/church-units',
}: { backPath?: string; basePath?: string }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();

  const [data, setData] = useState<DetailData | null>(null);
  const [parentParish, setParentParish] = useState<ChurchUnit | null>(null);
  const [parishionerCount, setParishionerCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Collapsible state
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['general', 'contact', 'leadership', 'schedules']));

  // Unit field editing
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);

  // Church leadership (all roles)
  const [leadership, setLeadership] = useState<LeadershipRead[]>([]);
  const [editingPriestId, setEditingPriestId] = useState<number | 'new' | null>(null);
  const [priestDraft, setPriestDraft] = useState<PriestDraft>(EMPTY_PRIEST);
  const [priestSaving, setPriestSaving] = useState(false);

  // Mass schedules
  const [schedules, setSchedules] = useState<MassSchedule[]>([]);
  const [editingScheduleId, setEditingScheduleId] = useState<number | 'new' | null>(null);
  const [scheduleDraft, setScheduleDraft] = useState<ScheduleDraft>(EMPTY_SCHEDULE);
  const [scheduleSaving, setScheduleSaving] = useState(false);

  const toggleCard = (cardId: string) =>
    setExpanded(prev => { const n = new Set(prev); n.has(cardId) ? n.delete(cardId) : n.add(cardId); return n; });

  const startEdit = (cardId: string) => {
    setDraft({ ...(data as unknown as Record<string, unknown>) });
    setEditingCard(cardId);
  };
  const cancelEdit = () => setEditingCard(null);
  const setField = (n: string, v: string) => setDraft(p => ({ ...p, [n]: v }));

  const save = useCallback(async () => {
    if (!id || !data) return;
    setSaving(true);
    try {
      const res = await client.updateChurchUnit(Number(id), {
        name: draft.name as string,
        diocese: (draft.diocese as string) || null,
        address: (draft.address as string) || null,
        phone: (draft.phone as string) || null,
        email: (draft.email as string) || null,
        website: (draft.website as string) || null,
        established_date: (draft.established_date as string) || null,
        location_description: (draft.location_description as string) || null,
      } as unknown as Parameters<typeof client.updateChurchUnit>[1]);
      setData((res.data as DetailData) ?? data);
      setEditingCard(null);
      toast.success('Saved.');
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setSaving(false); }
  }, [id, data, draft, client]);

  // ── Leadership actions ──
  const saveLeadership = useCallback(async () => {
    if (!id || !priestDraft.name.trim()) return;
    setPriestSaving(true);
    try {
      if (editingPriestId === 'new') {
        const res = await client.createUnitLeadership(Number(id), {
          role: (priestDraft.role || 'assistant_priest') as LeadershipRole,
          name: priestDraft.name,
          phone: priestDraft.phone || null,
          email: priestDraft.email || null,
          is_current: true,
        });
        setLeadership(prev => [...prev, res.data as LeadershipRead]);
        toast.success('Leadership member added.');
      } else if (editingPriestId !== null) {
        const res = await client.updateUnitLeadership(Number(id), editingPriestId, {
          name: priestDraft.name,
          phone: priestDraft.phone || null,
          email: priestDraft.email || null,
        });
        setLeadership(prev => prev.map(p => p.id === editingPriestId ? (res.data as LeadershipRead) : p));
        toast.success('Updated.');
      }
      setEditingPriestId(null);
      setPriestDraft(EMPTY_PRIEST);
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setPriestSaving(false); }
  }, [id, editingPriestId, priestDraft, client]);

  const deleteLeadershipMember = useCallback(async (priestId: number) => {
    if (!id) return;
    try {
      await client.deleteUnitLeadership(Number(id), priestId);
      setLeadership(prev => prev.filter(p => p.id !== priestId));
      toast.success('Removed.');
    } catch (err) { toastApiError(err, 'Failed to remove.'); }
  }, [id, client]);

  // ── Mass schedule actions ──
  const saveSchedule = useCallback(async () => {
    if (!id || !data) return;
    setScheduleSaving(true);
    const unitId = Number(id);
    try {
      if (editingScheduleId === 'new') {
        const payload = {
          day_of_week: scheduleDraft.day_of_week,
          time: scheduleDraft.time,
          mass_type: scheduleDraft.mass_type,
          language: scheduleDraft.language || 'English',
          description: scheduleDraft.description || null,
        };
        const res = data.type === 'parish'
          ? await client.createParishSchedule(payload)
          : await client.createOutstationSchedule(unitId, payload);
        setSchedules(prev => [...prev, res.data as MassSchedule]);
        toast.success('Mass schedule added.');
      } else if (editingScheduleId !== null) {
        const payload = {
          day_of_week: scheduleDraft.day_of_week,
          mass_type: scheduleDraft.mass_type,
          language: scheduleDraft.language || 'English',
          description: scheduleDraft.description || null,
        };
        const res = data.type === 'parish'
          ? await client.updateParishSchedule(editingScheduleId, payload)
          : await client.updateOutstationSchedule(unitId, editingScheduleId, payload);
        setSchedules(prev => prev.map(s => s.id === editingScheduleId ? (res.data as MassSchedule) : s));
        toast.success('Updated.');
      }
      setEditingScheduleId(null);
      setScheduleDraft(EMPTY_SCHEDULE);
    } catch (err) { toastApiError(err, 'Failed to save.'); }
    finally { setScheduleSaving(false); }
  }, [id, data, editingScheduleId, scheduleDraft, client]);

  const deleteSchedule = useCallback(async (scheduleId: number) => {
    if (!id || !data) return;
    const unitId = Number(id);
    try {
      if (data.type === 'parish') {
        await client.deleteParishSchedule(scheduleId);
      } else {
        await client.deleteOutstationSchedule(unitId, scheduleId);
      }
      setSchedules(prev => prev.filter(s => s.id !== scheduleId));
      toast.success('Removed.');
    } catch (err) { toastApiError(err, 'Failed to remove.'); }
  }, [id, data, client]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    client.getChurchUnit(Number(id))
      .then(r => {
        const unit = r.data as DetailData;
        setData(unit);
        setSchedules(unit.mass_schedules ?? []);
        if (unit.type === 'outstation' && unit.parent_id) {
          client.getChurchUnit(unit.parent_id)
            .then(p => setParentParish(p.data as ChurchUnit))
            .catch(() => undefined);
        }
        client.listParishioners({ church_unit_id: Number(id), limit: 1 } as Parameters<typeof client.listParishioners>[0])
          .then(p => setParishionerCount(p.data?.total ?? p.data?.items?.length ?? 0))
          .catch(() => undefined);
        client.listUnitLeadership(Number(id))
          .then(r2 => setLeadership(r2.data as LeadershipRead[] ?? []))
          .catch(() => undefined);
      })
      .catch(err => toastApiError(err, 'Failed to load church unit'))
      .finally(() => setLoading(false));
  }, [id, client]);

  if (loading) return <div className="p-8 text-sm text-muted-foreground animate-pulse text-center">Loading…</div>;
  if (!data) return null;

  const isParish = data.type === 'parish';
  const parish = data as ParishDetail;
  const d = editingCard ? draft : (data as unknown as Record<string, unknown>);

  const editSaveCancel = (cardId: string) => ({
    headerAction: editingCard === cardId ? (
      <div className="flex items-center gap-1.5">
        <Button variant="outline" size="sm" onClick={cancelEdit}><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
        <Button size="sm" isLoading={saving} onClick={save}><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
      </div>
    ) : (
      <Button variant="ghost" size="sm" onClick={() => startEdit(cardId)}><Pencil className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Edit</span></Button>
    ),
  });

  return (
    <div className="space-y-5 pb-10">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 -mx-6 -mt-6 px-6 pt-5 pb-4 bg-background/95 backdrop-blur-sm border-b border-border/60">
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(backPath)}
            className="mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            {!isParish && (
              <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                <Building2 className="w-3 h-3" />
                <span>{parentParish?.name ?? 'Parish'}</span>
                <span>/</span>
                <MapPin className="w-3 h-3" />
                <span className="text-foreground font-medium">{data.name}</span>
              </div>
            )}
            <h1 className="font-display text-xl font-bold text-foreground leading-tight truncate">{data.name}</h1>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide ${
                isParish ? 'bg-navy/10 text-navy' : 'bg-muted text-muted-foreground'
              }`}>{data.type}</span>
              {data.diocese && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ChurchIcon className="w-3 h-3" />Diocese of {data.diocese}
                </span>
              )}
              {!isParish && parentParish?.diocese && !data.diocese && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <ChurchIcon className="w-3 h-3" />Diocese of {parentParish.diocese}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <StatTile icon={Users} label="Parishioners" value={parishionerCount ?? '—'} color="bg-violet-50 text-violet-600" />
        <StatTile icon={BookMarked} label="Societies" value={data.societies?.length ?? 0} color="bg-sky-50 text-sky-600" />
        <StatTile icon={Users2} label="Communities" value={data.communities?.length ?? 0} color="bg-emerald-50 text-emerald-600" />
        <StatTile icon={CalendarDays} label="Mass Schedules" value={data.mass_schedules?.length ?? 0} color="bg-amber-50 text-amber-600" />
        {isParish && (
          <StatTile icon={Building2} label="Outstations" value={parish.outstations?.length ?? 0} color="bg-navy/8 text-navy" />
        )}
      </div>

      {/* ── General Information ── */}
      <CollapsibleCard
        title="General Information"
        expanded={expanded.has('general')} onToggle={() => toggleCard('general')}
        {...editSaveCancel('general')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <Field label="Name" value={d.name} name="name" editing={editingCard === 'general'} draft={draft} onChange={setField} />
          <Field label="Diocese" value={d.diocese} name="diocese" editing={editingCard === 'general'} draft={draft} onChange={setField} />
          <Field label="Established Date" value={d.established_date} name="established_date" editing={editingCard === 'general'} draft={draft} onChange={setField} />
          <div>
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Type</p>
            <p className="text-sm text-foreground capitalize">{String(data.type ?? '') || '—'}</p>
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Location Description</p>
          {editingCard === 'general'
            ? <textarea value={String(draft.location_description ?? '')} onChange={e => setField('location_description', e.target.value)}
                className={`${INPUT} min-h-[80px] resize-y`} />
            : <p className="text-sm text-foreground">{String(data.location_description ?? '') || '—'}</p>}
        </div>
      </CollapsibleCard>

      {/* ── Contact ── */}
      <CollapsibleCard
        title="Contact Information"
        expanded={expanded.has('contact')} onToggle={() => toggleCard('contact')}
        {...editSaveCancel('contact')}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="flex items-start gap-2">
            <MapPin className="w-3.5 h-3.5 text-muted-foreground mt-2.5 flex-shrink-0" />
            <Field label="Address" value={d.address} name="address" editing={editingCard === 'contact'} draft={draft} onChange={setField} />
          </div>
          <div className="flex items-start gap-2">
            <Phone className="w-3.5 h-3.5 text-muted-foreground mt-2.5 flex-shrink-0" />
            <Field label="Phone" value={d.phone} name="phone" editing={editingCard === 'contact'} draft={draft} onChange={setField} />
          </div>
          <div className="flex items-start gap-2">
            <Mail className="w-3.5 h-3.5 text-muted-foreground mt-2.5 flex-shrink-0" />
            <Field label="Email" value={d.email} name="email" editing={editingCard === 'contact'} draft={draft} onChange={setField} />
          </div>
          <div className="flex items-start gap-2">
            <Globe className="w-3.5 h-3.5 text-muted-foreground mt-2.5 flex-shrink-0" />
            <Field label="Website" value={d.website} name="website" editing={editingCard === 'contact'} draft={draft} onChange={setField} />
          </div>
        </div>
      </CollapsibleCard>

      {/* ── Church Leadership ── */}
      <CollapsibleCard
        title={`Church Leadership (${leadership.length})`}
        expanded={expanded.has('leadership')} onToggle={() => toggleCard('leadership')}
        headerAction={
          editingPriestId === null ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setPriestDraft(EMPTY_PRIEST);
              setEditingPriestId('new');
              setExpanded(prev => new Set([...prev, 'leadership']));
            }}>
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-3">
          {leadership.map(priest => (
            <div key={priest.id}>
              {editingPriestId === priest.id ? (
                <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Name *</p>
                      <input value={priestDraft.name} onChange={e => setPriestDraft(p => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="Full name" />
                    </div>
                    <div>
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                      <input value={priestDraft.phone} onChange={e => setPriestDraft(p => ({ ...p, phone: e.target.value }))} className={INPUT} placeholder="+1 234 567 8900" />
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                      <input value={priestDraft.email} onChange={e => setPriestDraft(p => ({ ...p, email: e.target.value }))} className={INPUT} placeholder="email@example.com" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <Button size="sm" isLoading={priestSaving} onClick={saveLeadership}><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
                    <Button variant="outline" size="sm" onClick={() => { setEditingPriestId(null); setPriestDraft(EMPTY_PRIEST); }}><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 py-2.5 border-b border-border/50 last:border-0">
                  <div className="w-8 h-8 rounded-full bg-muted border border-border flex items-center justify-center flex-shrink-0">
                    <UserCheck className="w-3.5 h-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{priest.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[11px] text-olive capitalize">{(priest.custom_role || priest.role).replace(/_/g, ' ')}</span>
                      {priest.phone && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Phone className="w-2.5 h-2.5" />{priest.phone}</span>}
                      {priest.email && <span className="text-[11px] text-muted-foreground flex items-center gap-1"><Mail className="w-2.5 h-2.5" />{priest.email}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" onClick={() => { setPriestDraft({ name: priest.name, phone: priest.phone ?? '', email: priest.email ?? '' }); setEditingPriestId(priest.id); }}>
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => deleteLeadershipMember(priest.id)} className="text-destructive hover:text-destructive">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {/* Add new form */}
          {editingPriestId === 'new' && (
            <div className="bg-muted/40 border border-border rounded-lg p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Name *</p>
                  <input value={priestDraft.name} onChange={e => setPriestDraft(p => ({ ...p, name: e.target.value }))} className={INPUT} placeholder="Full name" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Role *</p>
                  <select
                    value={priestDraft.role || 'assistant_priest'}
                    onChange={e => setPriestDraft(p => ({ ...p, role: e.target.value }))}
                    className={INPUT}
                  >
                    <option value="priest_in_charge">Priest in Charge</option>
                    <option value="assistant_priest">Assistant Priest</option>
                    <option value="deacon">Deacon</option>
                    <option value="church_administrator">Church Administrator</option>
                    <option value="church_secretary">Church Secretary</option>
                    <option value="ppc_chairman">PPC Chairman</option>
                    <option value="ppc_vice_chairman">PPC Vice Chairman</option>
                    <option value="ppc_secretary">PPC Secretary</option>
                    <option value="ppc_treasurer">PPC Treasurer</option>
                    <option value="ppc_member">PPC Member</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Phone</p>
                  <input value={priestDraft.phone} onChange={e => setPriestDraft(p => ({ ...p, phone: e.target.value }))} className={INPUT} placeholder="+1 234 567 8900" />
                </div>
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Email</p>
                  <input value={priestDraft.email} onChange={e => setPriestDraft(p => ({ ...p, email: e.target.value }))} className={INPUT} placeholder="email@example.com" />
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Button size="sm" isLoading={priestSaving} onClick={saveLeadership}><Save className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Save</span></Button>
                <Button variant="outline" size="sm" onClick={() => { setEditingPriestId(null); setPriestDraft(EMPTY_PRIEST); }}><X className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Cancel</span></Button>
              </div>
            </div>
          )}

          {leadership.length === 0 && editingPriestId !== 'new' && (
            <p className="text-sm text-muted-foreground">No leadership members added yet.</p>
          )}
        </div>
      </CollapsibleCard>

      {/* ── Mass Schedules ── */}
      <CollapsibleCard
        title={`Mass Schedules (${schedules.length})`}
        expanded={expanded.has('schedules')} onToggle={() => toggleCard('schedules')}
        headerAction={
          editingScheduleId === null ? (
            <Button variant="ghost" size="sm" onClick={() => {
              setScheduleDraft(EMPTY_SCHEDULE);
              setEditingScheduleId('new');
              setExpanded(prev => new Set([...prev, 'schedules']));
            }}>
              <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add</span>
            </Button>
          ) : undefined
        }
      >
        <div className="space-y-2">
          {/* Add new form */}
          {editingScheduleId === 'new' && (
            <ScheduleForm
              draft={scheduleDraft} onChange={setScheduleDraft}
              saving={scheduleSaving} onSave={saveSchedule}
              onCancel={() => { setEditingScheduleId(null); setScheduleDraft(EMPTY_SCHEDULE); }}
            />
          )}

          {/* Group by day */}
          {DAYS.map(({ value: day, label: dayLabel }) => {
            const daySchedules = schedules.filter(s => s.day_of_week === day);
            if (daySchedules.length === 0 && editingScheduleId !== 'new') return null;
            return (
              <div key={day}>
                {daySchedules.map(s => (
                  <div key={s.id}>
                    {editingScheduleId === s.id ? (
                      <ScheduleForm
                        draft={scheduleDraft} onChange={setScheduleDraft}
                        saving={scheduleSaving} onSave={saveSchedule}
                        onCancel={() => { setEditingScheduleId(null); setScheduleDraft(EMPTY_SCHEDULE); }}
                      />
                    ) : (
                      <div className="flex items-center gap-3 py-2.5 border-b border-border/40 last:border-0">
                        <div className="w-20 flex-shrink-0">
                          <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{dayLabel}</span>
                        </div>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                        <span className="text-sm font-medium text-foreground">{s.time}</span>
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">
                          {MASS_TYPES.find(t => t.value === s.mass_type)?.label ?? s.mass_type}
                        </span>
                        {s.language && s.language !== 'English' && (
                          <span className="text-[11px] text-muted-foreground">{s.language}</span>
                        )}
                        {s.description && (
                          <span className="text-[11px] text-muted-foreground flex-1 truncate">{s.description}</span>
                        )}
                        <div className="flex items-center gap-1 ml-auto">
                          <Button variant="ghost" size="sm" onClick={() => {
                            setScheduleDraft({ day_of_week: s.day_of_week, time: s.time, mass_type: s.mass_type, language: s.language ?? 'English', description: s.description ?? '' });
                            setEditingScheduleId(s.id);
                          }}><Pencil className="w-3.5 h-3.5" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => deleteSchedule(s.id)} className="text-destructive hover:text-destructive">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            );
          })}

          {schedules.length === 0 && editingScheduleId !== 'new' && (
            <p className="text-sm text-muted-foreground">No mass schedules configured.</p>
          )}
        </div>
      </CollapsibleCard>

      {/* ── Outstations (parish only) ── */}
      {isParish && (
        <CollapsibleCard
          title={`Outstations (${parish.outstations?.length ?? 0})`}
          expanded={expanded.has('outstations')} onToggle={() => toggleCard('outstations')}
        >
          {(parish.outstations?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">No outstations.</p>
          ) : (
            <div className="divide-y divide-border">
              {parish.outstations.map(o => (
                <div key={o.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <MapPin className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
                  <span className="text-sm text-foreground flex-1">{o.name}</span>
                  <Button variant="ghost" size="sm" onClick={() => navigate(`${basePath}/${o.id}`)}>View</Button>
                </div>
              ))}
            </div>
          )}
        </CollapsibleCard>
      )}
    </div>
  );
}
