import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import {
  ArrowLeft, Pencil, Save, X, User, Phone, MapPin, Church,
  Briefcase, Users, Heart, AlertCircle, Star, BookOpen,
  ShieldCheck, Clock, CalendarDays, Hash, ChevronDown,
  Plus, Trash2, Globe, RefreshCw, MessageSquare,
  ToggleLeft, Banknote, Copy, Check, Wand2, Download,
} from 'lucide-react';
import { Button } from '../../components/ui';
import { ChurchUnitSelect } from '../../components/admin/ChurchUnitSelect';
import { SendMessageModal } from '../../components/admin/SendMessageModal';
import type { ParishionerDetailed, ChurchCommunity } from '@sfoacc/sdk';

// ParishionerDetailed now has all the fields we need; alias for clarity
type PD = ParishionerDetailed;
type Language = { id: number; name: string; description?: string | null };

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function fmtDateTime(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  const age = Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000));
  return isNaN(age) || age < 0 ? null : age;
}

// ── Style constants ───────────────────────────────────────────────────────────

const INP = 'w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all';
const SEL = `${INP} cursor-pointer appearance-none`;
const EDIT_BTN = 'flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-muted transition-colors';

const SACRAMENT_TYPES = [
  'Baptism', 'First Communion', 'Confirmation', 'Penance',
  'Anointing of the Sick', 'Holy Orders', 'Holy Matrimony',
] as const;

const LIFE_STATUSES = ['alive', 'deceased', 'unknown'] as const;

// ── Card-level edit hook ──────────────────────────────────────────────────────

function useCardEdit() {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  return {
    editing, draft, saving, setSaving,
    startEdit: (d: Record<string, unknown>) => { setDraft({ ...d }); setEditing(true); },
    cancel: () => setEditing(false),
    done: () => setEditing(false),
    setField: (k: string, v: unknown) => setDraft(p => ({ ...p, [k]: v })),
  };
}

// ── Card component ────────────────────────────────────────────────────────────

function Card({
  title, icon: Icon, children, editing = false, editControls,
}: {
  title: string; icon: React.ElementType; children: React.ReactNode;
  editing?: boolean; editControls?: React.ReactNode;
}) {
  const [collapsed, setCollapsed] = useState(false);
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-border bg-muted/30">
        <button type="button" onClick={() => !editing && setCollapsed(c => !c)}
          className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
          <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">{title}</h3>
          {!editing && (
            <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground ml-1 transition-transform shrink-0 ${collapsed ? '-rotate-90' : ''}`} />
          )}
        </button>
        {editControls && <div className="ml-2 shrink-0">{editControls}</div>}
      </div>
      {!collapsed && <div className="px-5 py-5">{children}</div>}
    </div>
  );
}

// ── Field helpers ─────────────────────────────────────────────────────────────

function FieldRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value ?? <span className="text-muted-foreground">—</span>}</div>
    </div>
  );
}

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${color}`}>
      {children}
    </span>
  );
}

function CopyChip({ label, value, className = '' }: { label: string; value: string | null; className?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button
      type="button"
      onClick={copy}
      disabled={!value}
      className={`inline-flex items-center gap-1.5 px-2 py-1 bg-muted border border-border rounded-lg transition-colors group disabled:cursor-default enabled:hover:bg-muted/70 ${className}`}
    >
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide font-semibold w-24 shrink-0">{label}:</span>
      {value
        ? <span className="text-[11px] font-mono font-bold text-foreground">{value}</span>
        : <span className="text-[11px] font-mono text-muted-foreground/40">N/A</span>
      }
      {value && (copied
        ? <Check className="w-3 h-3 text-emerald-500 shrink-0" />
        : <Copy className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground shrink-0 transition-colors" />
      )}
    </button>
  );
}

function EditField({ label, name, draft, onChange, type = 'text' }: {
  label: string; name: string; draft: Record<string, unknown>;
  onChange: (k: string, v: string) => void; type?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
      <input type={type} value={String(draft[name] ?? '')} onChange={e => onChange(name, e.target.value)} className={INP} />
    </div>
  );
}

function EditSelect({ label, name, draft, onChange, options, placeholder = '— Select —' }: {
  label: string; name: string; draft: Record<string, unknown>;
  onChange: (k: string, v: string) => void;
  options: { label: string; value: string }[];
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">{label}</label>
      <select value={String(draft[name] ?? '')} onChange={e => onChange(name, e.target.value)} className={SEL}>
        <option value="">{placeholder}</option>
        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </div>
  );
}

function SaveCancel({ onSave, onCancel, saving }: { onSave: () => void; onCancel: () => void; saving: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      <Button variant="outline" size="sm" onClick={onCancel} disabled={saving} title="Cancel"><X className="w-3 h-3" /> <span className="hidden sm:inline">Cancel</span></Button>
      <Button size="sm" isLoading={saving} onClick={onSave} title="Save"><Save className="w-3 h-3" /> <span className="hidden sm:inline">Save</span></Button>
    </div>
  );
}

// ── Download report sub-item ──────────────────────────────────────────────────

function DownloadReportItem({ onAction, onClose }: { onAction: (action: string) => void; onClose: () => void }) {
  const [expanded, setExpanded] = useState(false);
  return expanded ? (
    <div className="px-3 py-2.5">
      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Download className="w-3.5 h-3.5" /> Select Format
      </p>
      <div className="flex gap-2">
        {(['pdf', 'csv'] as const).map(fmt => (
          <button key={fmt} type="button"
            onClick={() => { onAction(`download_report_${fmt}`); onClose(); }}
            className="flex-1 py-1.5 text-xs font-semibold uppercase tracking-wide border border-border rounded-md hover:bg-background/60 transition-colors">
            {fmt}
          </button>
        ))}
        <button type="button" onClick={() => setExpanded(false)}
          className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background/60 rounded-md transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  ) : (
    <button type="button" onClick={() => setExpanded(true)}
      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-background/60 transition-colors text-left">
      <Download className="w-4 h-4 text-muted-foreground shrink-0" />
      Download Report
      <ChevronDown className="w-3.5 h-3.5 text-muted-foreground ml-auto" />
    </button>
  );
}

// ── Actions dropdown ──────────────────────────────────────────────────────────

function ActionsMenu({ onAction, currentMembership, currentVerification }: {
  onAction: (action: string, value?: string) => void;
  currentMembership?: string | null;
  currentVerification?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const [membershipVal, setMembershipVal] = useState(currentMembership ?? '');
  const [verificationVal, setVerificationVal] = useState(currentVerification ?? '');
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const simpleItems = [
    { id: 'send_message', label: 'Send Message',              icon: MessageSquare },
    { id: 'verify',       label: 'Send Verification Message', icon: ShieldCheck },
  ];

  const selCls = 'flex-1 text-xs bg-background border border-input rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring';

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-border rounded-lg hover:bg-muted transition-colors"
      >
        Actions <ChevronDown className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-64 bg-muted/95 backdrop-blur-sm border border-border rounded-xl shadow-xl z-20 py-1">

          {/* Membership status */}
          <div className="px-3 py-2.5 border-b border-border/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ToggleLeft className="w-3.5 h-3.5" /> Membership Status
            </p>
            <div className="flex items-center gap-1.5">
              <select value={membershipVal} onChange={e => setMembershipVal(e.target.value)} className={selCls}>
                <option value="">— select —</option>
                {['active', 'disabled', 'deceased'].map(v => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!membershipVal}
                onClick={() => { onAction('set_membership', membershipVal); setMembershipVal(''); setOpen(false); }}
                className="text-xs px-2.5 py-1.5 bg-navy text-white rounded-md hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Verification status */}
          <div className="px-3 py-2.5 border-b border-border/60">
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Verification Status
            </p>
            <div className="flex items-center gap-1.5">
              <select value={verificationVal} onChange={e => setVerificationVal(e.target.value)} className={selCls}>
                <option value="">— select —</option>
                {['verified', 'pending', 'unverified'].map(v => (
                  <option key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!verificationVal}
                onClick={() => { onAction('set_verification', verificationVal); setVerificationVal(''); setOpen(false); }}
                className="text-xs px-2.5 py-1.5 bg-navy text-white rounded-md hover:bg-navy/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Simple actions */}
          {simpleItems.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button"
              onClick={() => { onAction(id); setOpen(false); }}
              className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-foreground hover:bg-background/60 transition-colors text-left">
              <Icon className="w-4 h-4 text-muted-foreground shrink-0" />
              {label}
            </button>
          ))}

          {/* Download Report */}
          <div className="border-t border-border/60">
            <DownloadReportItem onAction={onAction} onClose={() => setOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}


// ── Page ──────────────────────────────────────────────────────────────────────

export default function ParishionerDetail({ backPath = '/admin/parishioners', canEdit = true }: { backPath?: string; canEdit?: boolean }) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const client = useSDK();

  // ── Core data ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState<PD | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [communities, setCommunities] = useState<ChurchCommunity[]>([]);
  const [allSocieties, setAllSocieties] = useState<Array<{ id: number; name: string }>>([]);
  const [allLanguages, setAllLanguages] = useState<Language[]>([]);

  // ── Tab ───────────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState<'bio' | 'societies' | 'financials'>('bio');

  // ── Modal ─────────────────────────────────────────────────────────────────────
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [actionSaving, setActionSaving] = useState(false);

  // ── Card edits ────────────────────────────────────────────────────────────────
  const personal = useCardEdit();
  const contact = useCardEdit();
  const location = useCardEdit();
  const church = useCardEdit();
  const churchIds = useCardEdit();

  // Occupation
  const [generateIdSaving, setGenerateIdSaving] = useState(false);
  const [occEditing, setOccEditing] = useState(false);
  const [occDraft, setOccDraft] = useState({ role: '', employer: '' });
  const [occSaving, setOccSaving] = useState(false);

  // Family
  const [famEditing, setFamEditing] = useState(false);
  const [famDraft, setFamDraft] = useState<Record<string, string>>({});
  const [famChildren, setFamChildren] = useState<string[]>([]);
  const [newChild, setNewChild] = useState('');
  const [famSaving, setFamSaving] = useState(false);

  // Skills
  const [skillsEditing, setSkillsEditing] = useState(false);
  const [newSkill, setNewSkill] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [deletingSkillId, setDeletingSkillId] = useState<number | null>(null);

  // Sacraments
  const [sacEditing, setSacEditing] = useState(false);
  const [editSacId, setEditSacId] = useState<number | null>(null);
  const [sacDraft, setSacDraft] = useState<Record<string, string>>({});
  const [showAddSac, setShowAddSac] = useState(false);
  const [newSacDraft, setNewSacDraft] = useState<Record<string, string>>({ sacrament_id: '' });
  const [sacSaving, setSacSaving] = useState(false);

  // Societies
  const [socEditing, setSocEditing] = useState(false);
  const [socToAdd, setSocToAdd] = useState('');
  const [socSaving, setSocSaving] = useState(false);

  // Languages
  const [langEditing, setLangEditing] = useState(false);
  const [langSaving, setLangSaving] = useState(false);

  // Emergency Contacts
  const [ecEditing, setEcEditing] = useState(false);
  const [editEcId, setEditEcId] = useState<number | null>(null);
  const [ecDraft, setEcDraft] = useState<Record<string, string>>({});
  const [showAddEc, setShowAddEc] = useState(false);
  const [newEcDraft, setNewEcDraft] = useState({ name: '', relationship: '', primary_phone: '', alternative_phone: '' });
  const [ecSaving, setEcSaving] = useState(false);

  // medical conditions
  const [mcEditing, setMcEditing] = useState(false);
  const [editMcId, setEditMcId] = useState<number | null>(null);
  const [mcDraft, setMcDraft] = useState<{ condition: string; notes: string }>({ condition: '', notes: '' });
  const [showAddMc, setShowAddMc] = useState(false);
  const [newMcDraft, setNewMcDraft] = useState({ condition: '', notes: '' });
  const [mcSaving, setMcSaving] = useState(false);

  // ── Effects ───────────────────────────────────────────────────────────────────

  const loadData = useCallback((showRefreshSpinner = false) => {
    if (!id) return;
    if (showRefreshSpinner) setRefreshing(true);
    client.getParishioner(id)
      .then(r => setData(r.data as unknown as PD))
      .catch(err => toastApiError(err, 'Failed to load parishioner'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [id, client]);

  useEffect(() => { loadData(); }, [loadData]);

  useEffect(() => {
    client.listCommunities({ limit: 100 })
      .then(r => setCommunities(r.data?.items ?? []))
      .catch(() => undefined);
    client.listSocieties({ limit: 100 })
      .then(r => setAllSocieties(r.data?.items?.map(s => ({ id: s.id, name: s.name })) ?? []))
      .catch(() => undefined);
    client.listAvailableLanguages()
      .then(r => setAllLanguages(r.data ?? []))
      .catch(() => undefined);
  }, [client]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  const handleAction = async (action: string, value?: string) => {
    if (!id || !data) return;

    if (action === 'send_message') { setShowMessageModal(true); return; }

    if (action === 'download_report_pdf' || action === 'download_report_csv') {
      const format = action === 'download_report_pdf' ? 'pdf' : 'csv';
      try {
        const blob = await client.downloadParishionerReport(id, format);
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `parishioner-${id}-report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
      } catch (err) {
        toastApiError(err, 'Failed to download report');
      }
      return;
    }

    if (action === 'verify') {
      setActionSaving(true);
      try {
        await client.sendVerification(id, 'both');
        toast.success('Verification message sent.');
      } catch (err) {
        toastApiError(err, 'Failed to send verification');
      } finally {
        setActionSaving(false);
      }
      return;
    }

    if (action === 'set_membership' && value) {
      setActionSaving(true);
      try {
        const res = await client.updateParishioner(id, { membership_status: value } as Parameters<typeof client.updateParishioner>[1]);
        setData(prev => prev ? { ...prev, ...(res.data as unknown as PD) } : prev);
        toast.success(`Membership set to ${value}.`);
      } catch (err) {
        toastApiError(err, 'Failed to update membership status');
      } finally {
        setActionSaving(false);
      }
      return;
    }

    if (action === 'set_verification' && value) {
      setActionSaving(true);
      try {
        const res = await client.updateParishioner(id, { verification_status: value } as Parameters<typeof client.updateParishioner>[1]);
        setData(prev => prev ? { ...prev, ...(res.data as unknown as PD) } : prev);
        toast.success(`Verification status set to ${value}.`);
      } catch (err) {
        toastApiError(err, 'Failed to update verification status');
      } finally {
        setActionSaving(false);
      }
      return;
    }

    if (action === 'toggle_active') {
      const next = data.membership_status === 'active' ? 'disabled' : 'active';
      setActionSaving(true);
      try {
        const res = await client.updateParishioner(id, { membership_status: next } as Parameters<typeof client.updateParishioner>[1]);
        setData(prev => prev ? { ...prev, ...(res.data as unknown as PD) } : prev);
        toast.success(`Membership set to ${next}.`);
      } catch (err) {
        toastApiError(err, 'Failed to update membership');
      } finally {
        setActionSaving(false);
      }
    }
  };

  // ── Save: core fields ─────────────────────────────────────────────────────────

  const saveFields = useCallback(async (fields: Record<string, unknown>) => {
    if (!id) return;
    const res = await client.updateParishioner(id, fields as Parameters<typeof client.updateParishioner>[1]);
    setData(prev => prev ? { ...prev, ...(res.data as unknown as PD) } : prev);
    toast.success('Saved.');
    loadData();
  }, [id, client, loadData]);

  const savePersonal = async () => saveFields({
    first_name: personal.draft.first_name || undefined,
    last_name: personal.draft.last_name || undefined,
    other_names: (personal.draft.other_names as string) || null,
    maiden_name: (personal.draft.maiden_name as string) || null,
    gender: personal.draft.gender || null,
    date_of_birth: (personal.draft.date_of_birth as string) || null,
    marital_status: personal.draft.marital_status || null,
  });

  const saveContact = async () => saveFields({
    mobile_number: (contact.draft.mobile_number as string) || null,
    whatsapp_number: (contact.draft.whatsapp_number as string) || null,
    email_address: (contact.draft.email_address as string) || null,
  });

  const saveLocation = async () => saveFields({
    place_of_birth: (location.draft.place_of_birth as string) || null,
    hometown: (location.draft.hometown as string) || null,
    region: (location.draft.region as string) || null,
    country: (location.draft.country as string) || null,
    current_residence: (location.draft.current_residence as string) || null,
  });

  const saveChurch = async () => saveFields({
    church_unit_id: church.draft.church_unit_id ? Number(church.draft.church_unit_id) : null,
    church_community_id: (church.draft.church_community_id as string) || null,
  });

  const saveChurchIds = async () => saveFields({
    old_church_id: (churchIds.draft.old_church_id as string) || null,
  });

  // ── Generate Church ID ────────────────────────────────────────────────────────

  const handleGenerateChurchId = async (oldId: string) => {
    if (!id) return;
    setGenerateIdSaving(true);
    try {
      const res = await client.generateChurchId(id, oldId);
      setData(prev => prev ? { ...prev, old_church_id: res.data?.old_church_id ?? prev.old_church_id, new_church_id: res.data?.new_church_id ?? prev.new_church_id } : prev);
      toast.success('Church ID generated successfully.');
    } catch (err) {
      toastApiError(err, 'Failed to generate church ID');
    } finally {
      setGenerateIdSaving(false);
    }
  };

  // ── Save: occupation ──────────────────────────────────────────────────────────

  const saveOccupation = async () => {
    if (!id) return;
    setOccSaving(true);
    try {
      const res = data?.occupation
        ? await client.updateParishionerOccupation(id, { role: occDraft.role, employer: occDraft.employer })
        : await client.createParishionerOccupation(id, { role: occDraft.role, employer: occDraft.employer });
      setData(prev => prev ? { ...prev, occupation: res.data as PD['occupation'] } : prev);
      setOccEditing(false);
      toast.success('Occupation saved.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to save occupation');
    } finally {
      setOccSaving(false);
    }
  };

  // ── Save: family ──────────────────────────────────────────────────────────────

  const startFamilyEdit = () => {
    if (!data) return;
    setFamDraft({
      marital_status: data.marital_status ?? '',
      spouse_name: data.family_info?.spouse_name ?? '',
      spouse_status: data.family_info?.spouse_status ?? '',
      spouse_phone: data.family_info?.spouse_phone ?? '',
      father_name: data.family_info?.father_name ?? '',
      father_status: data.family_info?.father_status ?? '',
      mother_name: data.family_info?.mother_name ?? '',
      mother_status: data.family_info?.mother_status ?? '',
    });
    setFamChildren(data.family_info?.children?.map(c => c.name) ?? []);
    setFamEditing(true);
  };

  const saveFamily = async () => {
    if (!id) return;
    setFamSaving(true);
    try {
      const [famRes, parishRes] = await Promise.all([
        client.updateParishionerFamily(id, {
          spouse_name: famDraft.spouse_name || null,
          spouse_status: famDraft.spouse_status || null,
          spouse_phone: famDraft.spouse_phone || null,
          father_name: famDraft.father_name || null,
          father_status: famDraft.father_status || null,
          mother_name: famDraft.mother_name || null,
          mother_status: famDraft.mother_status || null,
          children: famChildren.filter(Boolean).map(n => ({ name: n })),
        }),
        client.updateParishioner(id, { marital_status: famDraft.marital_status || null } as Parameters<typeof client.updateParishioner>[1]),
      ]);
      setData(prev => prev ? {
        ...prev,
        family_info: famRes.data as PD['family_info'],
        ...(parishRes.data as unknown as PD),
      } : prev);
      setFamEditing(false);
      toast.success('Family info saved.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to save family info');
    } finally {
      setFamSaving(false);
    }
  };

  // ── Save: sacraments ──────────────────────────────────────────────────────────

  const updateSacrament = async (sacId: number) => {
    if (!id) return;
    setSacSaving(true);
    try {
      await client.updateParishionerSacrament(id, sacId, {
        type: sacDraft.type || null,
        date: sacDraft.date_received || null,
        place: sacDraft.place || null,
        minister: sacDraft.minister || null,
      });
      setData(prev => prev ? {
        ...prev,
        sacraments: prev.sacraments.map(s =>
          s.id === sacId
            ? { ...s, sacrament: { ...s.sacrament, name: sacDraft.type || s.sacrament.name }, date_received: sacDraft.date_received || s.date_received, place: sacDraft.place || null, minister: sacDraft.minister || null }
            : s
        ),
      } : prev);
      setEditSacId(null);
      toast.success('Sacrament updated.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to update sacrament');
    } finally {
      setSacSaving(false);
    }
  };

  const deleteSacrament = async (sacId: number) => {
    if (!id) return;
    setSacSaving(true);
    try {
      await client.deleteParishionerSacrament(id, sacId);
      setData(prev => prev ? { ...prev, sacraments: prev.sacraments.filter(s => s.id !== sacId) } : prev);
      toast.success('Sacrament removed.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to remove sacrament');
    } finally {
      setSacSaving(false);
    }
  };

  const addSacrament = async () => {
    if (!id || !newSacDraft.sacrament_id) return;
    setSacSaving(true);
    try {
      const res = await client.addParishionerSacrament(id, {
        sacrament_id: newSacDraft.sacrament_id,
        date_received: newSacDraft.date_received || null,
        place: newSacDraft.place || null,
        minister: newSacDraft.minister || null,
        notes: newSacDraft.notes || null,
      });
      setData(prev => prev ? { ...prev, sacraments: [...prev.sacraments, res.data as PD['sacraments'][number]] } : prev);
      setShowAddSac(false);
      setNewSacDraft({ sacrament_id: '' });
      toast.success('Sacrament added.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to add sacrament');
    } finally {
      setSacSaving(false);
    }
  };

  // ── Save: skills ──────────────────────────────────────────────────────────────

  const addSkill = async () => {
    if (!id || !newSkill.trim()) return;
    setAddingSkill(true);
    try {
      const res = await client.addParishionerSkill(id, newSkill.trim());
      setData(prev => prev ? { ...prev, skills: [...prev.skills, res.data as { id: number; name: string }] } : prev);
      setNewSkill('');
    } catch (err) {
      toastApiError(err, 'Failed to add skill');
    } finally {
      setAddingSkill(false);
    }
  };

  const removeSkill = async (skillId: number) => {
    if (!id) return;
    setDeletingSkillId(skillId);
    try {
      await client.removeParishionerSkill(id, skillId);
      setData(prev => prev ? { ...prev, skills: prev.skills.filter(s => s.id !== skillId) } : prev);
    } catch (err) {
      toastApiError(err, 'Failed to remove skill');
    } finally {
      setDeletingSkillId(null);
    }
  };

  // ── Save: societies ───────────────────────────────────────────────────────────

  const joinSociety = async () => {
    if (!id || !socToAdd) return;
    setSocSaving(true);
    try {
      const societyId = Number(socToAdd);
      await client.addSocietyMembers(societyId, [{ parishioner_id: id }]);
      const found = allSocieties.find(s => s.id === societyId);
      if (found) {
        setData(prev => prev ? {
          ...prev,
          societies: [...prev.societies, { id: societyId, name: found.name, date_joined: null }],
        } : prev);
      }
      setSocToAdd('');
      toast.success(`Joined ${found?.name ?? 'society'}.`);
    } catch (err) {
      toastApiError(err, 'Failed to join society');
    } finally {
      setSocSaving(false);
    }
  };

  const leaveSociety = async (societyId: number, societyName: string) => {
    if (!id) return;
    setSocSaving(true);
    try {
      await client.removeSocietyMembers(societyId, [id]);
      setData(prev => prev ? { ...prev, societies: prev.societies.filter(s => s.id !== societyId) } : prev);
      toast.success(`Removed from ${societyName}.`);
    } catch (err) {
      toastApiError(err, 'Failed to remove from society');
    } finally {
      setSocSaving(false);
    }
  };

  // ── Save: languages ───────────────────────────────────────────────────────────

  const toggleLanguage = async (lang: Language) => {
    if (!id) return;
    const spoken = data?.languages_spoken ?? [];
    const hasIt = spoken.some(l => l.id === lang.id);
    setLangSaving(true);
    try {
      if (hasIt) {
        await client.removeParishionerLanguages(id, [lang.id]);
        setData(prev => prev ? { ...prev, languages_spoken: spoken.filter(l => l.id !== lang.id) } : prev);
      } else {
        await client.assignParishionerLanguages(id, [lang.id]);
        setData(prev => prev ? { ...prev, languages_spoken: [...spoken, lang] } : prev);
      }
    } catch (err) {
      toastApiError(err, 'Failed to update languages');
    } finally {
      setLangSaving(false);
    }
  };

  // ── Save: emergency contacts ─────────────────────────────────────────────────

  const addEmergencyContact = async () => {
    if (!id || !newEcDraft.name.trim() || !newEcDraft.primary_phone.trim()) return;
    setEcSaving(true);
    try {
      const res = await client.addParishionerEmergencyContact(id, {
        name: newEcDraft.name.trim(),
        relationship: newEcDraft.relationship.trim(),
        primary_phone: newEcDraft.primary_phone.trim(),
        alternative_phone: newEcDraft.alternative_phone.trim() || null,
      });
      const newContact = {
        id: (res.data as { id: number }).id,
        name: newEcDraft.name.trim(),
        relationship: newEcDraft.relationship.trim(),
        primary_phone: newEcDraft.primary_phone.trim(),
        alternative_phone: newEcDraft.alternative_phone.trim() || null,
      };
      setData(prev => prev ? { ...prev, emergency_contacts: [...prev.emergency_contacts, newContact] } : prev);
      setNewEcDraft({ name: '', relationship: '', primary_phone: '', alternative_phone: '' });
      setShowAddEc(false);
      toast.success('Emergency contact added.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to add emergency contact');
    } finally {
      setEcSaving(false);
    }
  };

  const updateEmergencyContact = async (contactId: number) => {
    if (!id) return;
    setEcSaving(true);
    try {
      await client.updateParishionerEmergencyContact(id, contactId, {
        name: ecDraft.name || null,
        relationship: ecDraft.relationship || null,
        primary_phone: ecDraft.primary_phone || null,
        alternative_phone: ecDraft.alternative_phone || null,
      });
      setData(prev => prev ? {
        ...prev,
        emergency_contacts: prev.emergency_contacts.map(c =>
          c.id === contactId
            ? { ...c, name: ecDraft.name || c.name, relationship: ecDraft.relationship || c.relationship, primary_phone: ecDraft.primary_phone || c.primary_phone, alternative_phone: ecDraft.alternative_phone || null }
            : c
        ),
      } : prev);
      setEditEcId(null);
      toast.success('Contact updated.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to update emergency contact');
    } finally {
      setEcSaving(false);
    }
  };

  const deleteEmergencyContact = async (contactId: number) => {
    if (!id) return;
    setEcSaving(true);
    try {
      await client.deleteParishionerEmergencyContact(id, contactId);
      setData(prev => prev ? { ...prev, emergency_contacts: prev.emergency_contacts.filter(c => c.id !== contactId) } : prev);
      toast.success('Contact removed.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to delete emergency contact');
    } finally {
      setEcSaving(false);
    }
  };

  // ── Save: medical conditions ──────────────────────────────────────────────────

  const addMedicalCondition = async () => {
    if (!id || !newMcDraft.condition.trim()) return;
    setMcSaving(true);
    try {
      const res = await client.addParishionerMedicalCondition(id, {
        condition: newMcDraft.condition.trim(),
        notes: newMcDraft.notes.trim() || null,
      });
      const newMc = {
        id: (res.data as { id: number }).id,
        condition: newMcDraft.condition.trim(),
        notes: newMcDraft.notes.trim() || null,
      };
      setData(prev => prev ? { ...prev, medical_conditions: [...prev.medical_conditions, newMc] } : prev);
      setNewMcDraft({ condition: '', notes: '' });
      setShowAddMc(false);
      toast.success('Condition added.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to add medical condition');
    } finally {
      setMcSaving(false);
    }
  };

  const updateMedicalCondition = async (conditionId: number) => {
    if (!id) return;
    setMcSaving(true);
    try {
      await client.updateParishionerMedicalCondition(id, conditionId, {
        condition: mcDraft.condition || null,
        notes: mcDraft.notes || null,
      });
      setData(prev => prev ? {
        ...prev,
        medical_conditions: prev.medical_conditions.map(m =>
          m.id === conditionId
            ? { ...m, condition: mcDraft.condition || m.condition, notes: mcDraft.notes || null }
            : m
        ),
      } : prev);
      setEditMcId(null);
      toast.success('Condition updated.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to update medical condition');
    } finally {
      setMcSaving(false);
    }
  };

  const deleteMedicalCondition = async (conditionId: number) => {
    if (!id) return;
    setMcSaving(true);
    try {
      await client.deleteParishionerMedicalCondition(id, conditionId);
      setData(prev => prev ? { ...prev, medical_conditions: prev.medical_conditions.filter(m => m.id !== conditionId) } : prev);
      toast.success('Condition removed.');
      loadData();
    } catch (err) {
      toastApiError(err, 'Failed to delete medical condition');
    } finally {
      setMcSaving(false);
    }
  };

  // ── Loading / not found ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground animate-pulse">Loading…</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Parishioner not found.</p>
      </div>
    );
  }

  // ── Derived ───────────────────────────────────────────────────────────────────

  const fullName = [data.first_name, data.other_names, data.last_name].filter(Boolean).join(' ') || '—';
  const initials = [data.first_name?.[0], data.last_name?.[0]].filter(Boolean).join('').toUpperCase() || '?';
  const age = calcAge(data.date_of_birth);
  const isDeceased = data.is_deceased ?? data.membership_status === 'deceased';
  const joinedSocietyIds = new Set((data.societies ?? []).map(s => s.id));
  const availableSocieties = allSocieties.filter(s => !joinedSocietyIds.has(s.id));
  const spokenLangIds = new Set((data.languages_spoken ?? []).map(l => l.id));

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Fixed header ── */}
      <div className="flex-shrink-0 pb-5 space-y-2">

        {/* Row 1: back + avatar + name + actions */}
        <div className="flex items-start gap-3">
          <button onClick={() => navigate(backPath)}
            className="mt-1 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors flex-shrink-0">
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-4 flex-1 min-w-0">
            {data.photo_url ? (
              <img src={data.photo_url} alt={fullName} className="w-12 h-12 rounded-full object-cover border-2 border-border flex-shrink-0" />
            ) : (
              <div className="w-12 h-12 rounded-full bg-navy/10 border-2 border-navy/15 flex items-center justify-center flex-shrink-0">
                <span className="text-navy font-bold text-base">{initials}</span>
              </div>
            )}
            <div className="flex-1 min-w-0">
              {data.title && <span className="text-xs text-muted-foreground">{data.title}</span>}
              <h1 className="font-display text-xl font-bold text-foreground truncate leading-tight">{fullName}</h1>
              {/* Membership + verification on same line */}
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                {data.membership_status && (
                  <Badge color={data.membership_status === 'active' ? 'bg-emerald-50 text-emerald-700' : data.membership_status === 'deceased' ? 'bg-gray-100 text-gray-600' : 'bg-red-50 text-red-600'}>
                    <Users className="w-2.5 h-2.5" />
                    <span className="text-muted-foreground/60 font-normal">Member:</span> <span className="capitalize">{data.membership_status}</span>
                  </Badge>
                )}
                {data.verification_status && (
                  <Badge color={
                    data.verification_status === 'verified' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : data.verification_status === 'pending' ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-100 text-gray-500 border border-gray-200'
                  }>
                    <ShieldCheck className="w-2.5 h-2.5" />
                    <span className="text-muted-foreground/60 font-normal">Verified:</span> <span className="capitalize">{data.verification_status}</span>
                  </Badge>
                )}
                {isDeceased && <Badge color="bg-gray-100 text-gray-600">Deceased</Badge>}
              </div>
            </div>

            {/* Right: actions */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => loadData(true)}
                disabled={refreshing || actionSaving}
                title="Refresh"
                className="p-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              </button>
              {canEdit && <ActionsMenu onAction={handleAction} currentMembership={data.membership_status} currentVerification={data.verification_status} />}
            </div>
          </div>
        </div>

        {/* Row 2: IDs vertical stack + dates */}
      
       
          <div className="ml-14 flex items-center gap-3 ">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <CalendarDays className="w-3 h-3" /> Added {fmtDate(data.created_at)}
            </span>
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Updated {fmtDateTime(data.updated_at)}
            </span>
          </div>
       

      </div>

      {/* ── Tabs ── */}
      <div className="flex-shrink-0 border-b border-border mb-5">
        <div className="flex gap-1">
          {([
            { id: 'bio',         label: 'Bio & Profile',    icon: User },
            { id: 'societies',   label: 'Societies',         icon: Users },
            { id: 'financials',  label: 'Dues & Financials', icon: Banknote },
          ] as const).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-navy text-navy'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable cards ── */}
      <div className="flex-1 min-h-0 overflow-y-auto pb-8 pr-3">
        {activeTab === 'bio' && <div className="grid grid-cols-1 gap-4">

          {/* ── 1. Personal Info ── */}
          <Card title="Personal Information" icon={User} editing={personal.editing}
            editControls={canEdit ? (personal.editing ? (
              <SaveCancel saving={personal.saving} onCancel={personal.cancel} onSave={async () => {
                personal.setSaving(true);
                try { await savePersonal(); personal.done(); } catch { /* toasted */ } finally { personal.setSaving(false); }
              }} />
            ) : (
              <button className={EDIT_BTN} onClick={() => personal.startEdit(data as unknown as Record<string, unknown>)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {personal.editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField label="First Name" name="first_name" draft={personal.draft} onChange={personal.setField} />
                <EditField label="Other Names" name="other_names" draft={personal.draft} onChange={personal.setField} />
                <EditField label="Last Name" name="last_name" draft={personal.draft} onChange={personal.setField} />
                <EditField label="Maiden Name" name="maiden_name" draft={personal.draft} onChange={personal.setField} />
                <EditSelect label="Gender" name="gender" draft={personal.draft} onChange={personal.setField}
                  options={[{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }, { label: 'Other', value: 'other' }]} />
                <EditField label="Date of Birth" name="date_of_birth" type="date" draft={personal.draft} onChange={personal.setField} />
                <EditSelect label="Marital Status" name="marital_status" draft={personal.draft} onChange={personal.setField}
                  options={['single','married','widowed','divorced','separated'].map(v => ({ label: v.charAt(0).toUpperCase()+v.slice(1), value: v }))} />
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <FieldRow label="First Name" value={data.first_name} />
                <FieldRow label="Last Name" value={data.last_name} />
                {data.other_names && <FieldRow label="Other Names" value={data.other_names} />}
                {data.maiden_name && <FieldRow label="Maiden Name" value={data.maiden_name} />}
                {data.baptismal_name && <FieldRow label="Baptismal Name" value={data.baptismal_name} />}
                {data.title && <FieldRow label="Title" value={data.title} />}
                <FieldRow label="Gender" value={data.gender ? <span className="capitalize">{data.gender}</span> : null} />
                <FieldRow label="Date of Birth" value={data.date_of_birth
                  ? <>{fmtDate(data.date_of_birth)}{age != null && <span className="ml-1.5 text-muted-foreground text-xs">({age} yrs)</span>}</>
                  : null}
                />
                <FieldRow label="Marital Status" value={data.marital_status ? <span className="capitalize">{data.marital_status}</span> : null} />
                {data.nationality && <FieldRow label="Nationality" value={data.nationality} />}
                {isDeceased && <FieldRow label="Date of Death" value={data.date_of_death ? fmtDate(data.date_of_death) : 'Unknown'} />}
              </div>
            )}
          </Card>

          {/* ── 2. Contact ── */}
          <Card title="Contact Information" icon={Phone} editing={contact.editing}
            editControls={canEdit ? (contact.editing ? (
              <SaveCancel saving={contact.saving} onCancel={contact.cancel} onSave={async () => {
                contact.setSaving(true);
                try { await saveContact(); contact.done(); } catch { /* toasted */ } finally { contact.setSaving(false); }
              }} />
            ) : (
              <button className={EDIT_BTN} onClick={() => contact.startEdit(data as unknown as Record<string, unknown>)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {contact.editing ? (
              <div className="space-y-4">
                <EditField label="Mobile Number" name="mobile_number" draft={contact.draft} onChange={contact.setField} />
                <EditField label="WhatsApp Number" name="whatsapp_number" draft={contact.draft} onChange={contact.setField} />
                <EditField label="Email Address" name="email_address" type="email" draft={contact.draft} onChange={contact.setField} />
              </div>
            ) : (
              <div className="space-y-4">
                <FieldRow label="Mobile Number" value={data.mobile_number
                  ? <a href={`tel:${data.mobile_number}`} className="text-navy hover:underline font-mono">{data.mobile_number}</a>
                  : null}
                />
                <FieldRow label="WhatsApp" value={data.whatsapp_number
                  ? <a href={`https://wa.me/${data.whatsapp_number}`} target="_blank" rel="noopener noreferrer" className="text-navy hover:underline font-mono">{data.whatsapp_number}</a>
                  : null}
                />
                <FieldRow label="Email" value={data.email_address
                  ? <a href={`mailto:${data.email_address}`} className="text-navy hover:underline">{data.email_address}</a>
                  : null}
                />
              </div>
            )}
          </Card>

          {/* ── 3. Origin & Location ── */}
          <Card title="Origin & Location" icon={MapPin} editing={location.editing}
            editControls={canEdit ? (location.editing ? (
              <SaveCancel saving={location.saving} onCancel={location.cancel} onSave={async () => {
                location.setSaving(true);
                try { await saveLocation(); location.done(); } catch { /* toasted */ } finally { location.setSaving(false); }
              }} />
            ) : (
              <button className={EDIT_BTN} onClick={() => location.startEdit(data as unknown as Record<string, unknown>)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {location.editing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <EditField label="Place of Birth" name="place_of_birth" draft={location.draft} onChange={location.setField} />
                <EditField label="Hometown" name="hometown" draft={location.draft} onChange={location.setField} />
                <EditField label="Region / State" name="region" draft={location.draft} onChange={location.setField} />
                <EditField label="Country" name="country" draft={location.draft} onChange={location.setField} />
                <div className="sm:col-span-2">
                  <EditField label="Current Residence" name="current_residence" draft={location.draft} onChange={location.setField} />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <FieldRow label="Place of Birth" value={data.place_of_birth} />
                <FieldRow label="Hometown" value={data.hometown} />
                <FieldRow label="Region" value={data.region} />
                <FieldRow label="Country" value={data.country} />
                <div className="col-span-2">
                  <FieldRow label="Current Residence" value={data.current_residence} />
                </div>
              </div>
            )}
          </Card>

          {/* ── 4. Church IDs ── */}
          <Card title="Church IDs" icon={Hash} editing={churchIds.editing}
            editControls={canEdit ? (churchIds.editing ? (
              <SaveCancel saving={churchIds.saving} onCancel={churchIds.cancel} onSave={async () => {
                churchIds.setSaving(true);
                try { await saveChurchIds(); churchIds.done(); } catch { /* toasted */ } finally { churchIds.setSaving(false); }
              }} />
            ) : (
              <button className={EDIT_BTN} onClick={() => churchIds.startEdit(data as unknown as Record<string, unknown>)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {churchIds.editing ? (
              <div className="space-y-4">
                <EditField label="Old Church ID" name="old_church_id" draft={churchIds.draft} onChange={churchIds.setField} />
              </div>
            ) : (
              <div className="space-y-2">
                <CopyChip label="System ID"     value={data.id ?? null}           className="w-full justify-between" />
                <CopyChip label="Old Church ID" value={data.old_church_id ?? null} className="w-full justify-between" />
                <CopyChip label="New Church ID" value={data.new_church_id ?? null} className="w-full justify-between" />
                {canEdit && !data.new_church_id && (
                  <div className="pt-1">
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={generateIdSaving}
                      disabled={!data.old_church_id}
                      onClick={() => handleGenerateChurchId(data.old_church_id ?? '')}
                      className="w-full justify-center"
                    >
                      <Wand2 className="w-3 h-3" /> Generate New Church ID
                    </Button>
                    {!data.old_church_id && (
                      <p className="text-[10px] text-amber-600 text-center mt-1.5">Old Church ID required — edit to add one first.</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>

          {/* ── 5. Church Information ── */}
          <Card title="Church Information" icon={Church} editing={church.editing}
            editControls={canEdit ? (church.editing ? (
              <SaveCancel saving={church.saving} onCancel={church.cancel} onSave={async () => {
                church.setSaving(true);
                try { await saveChurch(); church.done(); } catch { /* toasted */ } finally { church.setSaving(false); }
              }} />
            ) : (
              <button className={EDIT_BTN} onClick={() => church.startEdit(data as unknown as Record<string, unknown>)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {church.editing ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Church Unit</label>
                  <ChurchUnitSelect
                    value={String(church.draft.church_unit_id ?? '')}
                    onChange={v => church.setField('church_unit_id', v)}
                    className={`${SEL} w-full`}
                  />
                </div>
                {communities.length > 0 && (
                  <div>
                    <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Community</label>
                    <select
                      value={String(church.draft.church_community_id ?? '')}
                      onChange={e => church.setField('church_community_id', e.target.value)}
                      className={`${SEL} w-full`}
                    >
                      <option value="">— None —</option>
                      {communities.map(c => <option key={c.id} value={String(c.id)}>{c.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                <FieldRow label="Church Unit" value={data.church_unit?.name ?? (data.church_unit_id ? `Unit #${data.church_unit_id}` : null)} />
                <FieldRow label="Community" value={data.church_community?.name ?? (data.church_community_id ? `Community #${data.church_community_id}` : null)} />
              </div>
            )}
          </Card>

          {/* ── 5. Occupation ── */}
          <Card title="Occupation" icon={Briefcase} editing={occEditing}
            editControls={canEdit ? (occEditing ? (
              <SaveCancel saving={occSaving} onCancel={() => setOccEditing(false)} onSave={saveOccupation} />
            ) : (
              <button className={EDIT_BTN} onClick={() => {
                setOccDraft({ role: data.occupation?.role ?? '', employer: data.occupation?.employer ?? '' });
                setOccEditing(true);
              }}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">{data.occupation ? 'Edit' : 'Add'}</span>
              </button>
            )) : undefined}
          >
            {occEditing ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Role / Position</label>
                  <input value={occDraft.role} onChange={e => setOccDraft(d => ({ ...d, role: e.target.value }))} className={INP} placeholder="e.g. Engineer" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Employer</label>
                  <input value={occDraft.employer} onChange={e => setOccDraft(d => ({ ...d, employer: e.target.value }))} className={INP} placeholder="e.g. Company Ltd." />
                </div>
              </div>
            ) : data.occupation ? (
              <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                <FieldRow label="Role / Position" value={data.occupation.role} />
                <FieldRow label="Employer" value={data.occupation.employer} />
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No occupation recorded.</p>
            )}
          </Card>

          {/* ── 6. Family ── */}
          <Card title="Family" icon={Heart} editing={famEditing}
            editControls={canEdit ? (famEditing ? (
              <SaveCancel saving={famSaving} onCancel={() => setFamEditing(false)} onSave={saveFamily} />
            ) : (
              <button className={EDIT_BTN} onClick={startFamilyEdit}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {famEditing ? (
              <div className="space-y-5">
                {/* Marital Status */}
                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Marital Status</label>
                  <select value={famDraft.marital_status ?? ''} onChange={e => setFamDraft(d => ({ ...d, marital_status: e.target.value }))} className={SEL}>
                    <option value="">— Select —</option>
                    {['single', 'married', 'widowed', 'divorced', 'separated'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                    ))}
                  </select>
                </div>

                {/* Spouse — only when not single */}
                {famDraft.marital_status !== 'single' && (
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Spouse</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name</label>
                      <input value={famDraft.spouse_name ?? ''} onChange={e => setFamDraft(d => ({ ...d, spouse_name: e.target.value }))} className={INP} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Phone</label>
                      <input value={famDraft.spouse_phone ?? ''} onChange={e => setFamDraft(d => ({ ...d, spouse_phone: e.target.value }))} className={INP} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Status</label>
                      <select value={famDraft.spouse_status ?? ''} onChange={e => setFamDraft(d => ({ ...d, spouse_status: e.target.value }))} className={SEL}>
                        <option value="">— Select —</option>
                        {LIFE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">Parents</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Father's Name</label>
                      <input value={famDraft.father_name ?? ''} onChange={e => setFamDraft(d => ({ ...d, father_name: e.target.value }))} className={INP} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Father's Status</label>
                      <select value={famDraft.father_status ?? ''} onChange={e => setFamDraft(d => ({ ...d, father_status: e.target.value }))} className={SEL}>
                        <option value="">— Select —</option>
                        {LIFE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mother's Name</label>
                      <input value={famDraft.mother_name ?? ''} onChange={e => setFamDraft(d => ({ ...d, mother_name: e.target.value }))} className={INP} />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Mother's Status</label>
                      <select value={famDraft.mother_status ?? ''} onChange={e => setFamDraft(d => ({ ...d, mother_status: e.target.value }))} className={SEL}>
                        <option value="">— Select —</option>
                        {LIFE_STATUSES.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Children</p>
                  <div className="space-y-2 mb-2">
                    {famChildren.map((name, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <input value={name}
                          onChange={e => setFamChildren(c => c.map((v, j) => j === i ? e.target.value : v))}
                          className={`${INP} flex-1`} placeholder={`Child ${i + 1}`}
                        />
                        <button type="button" onClick={() => setFamChildren(c => c.filter((_, j) => j !== i))}
                          className="text-destructive hover:text-destructive/70 p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <input value={newChild} onChange={e => setNewChild(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && newChild.trim()) { setFamChildren(c => [...c, newChild.trim()]); setNewChild(''); } }}
                      className={`${INP} flex-1`} placeholder="Add a child's name…"
                    />
                    <button type="button"
                      onClick={() => { if (newChild.trim()) { setFamChildren(c => [...c, newChild.trim()]); setNewChild(''); } }}
                      className="px-3 py-2 bg-muted hover:bg-muted/80 rounded-lg text-sm transition-colors">
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-5">
                {data.marital_status && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Marital Status</p>
                    <span className="text-sm text-foreground capitalize">{data.marital_status}</span>
                  </div>
                )}
                {data.family_info?.spouse_name && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Spouse</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      <FieldRow label="Name" value={data.family_info.spouse_name} />
                      {data.family_info.spouse_status && <FieldRow label="Status" value={<span className="capitalize">{data.family_info.spouse_status}</span>} />}
                      {data.family_info.spouse_phone && (
                        <FieldRow label="Phone" value={<a href={`tel:${data.family_info.spouse_phone}`} className="text-navy hover:underline font-mono">{data.family_info.spouse_phone}</a>} />
                      )}
                    </div>
                  </div>
                )}
                {(data.family_info?.father_name || data.family_info?.mother_name) && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Parents</p>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                      {data.family_info?.father_name && <FieldRow label="Father" value={data.family_info.father_name} />}
                      {data.family_info?.father_status && <FieldRow label="Father Status" value={<span className="capitalize">{data.family_info.father_status}</span>} />}
                      {data.family_info?.mother_name && <FieldRow label="Mother" value={data.family_info.mother_name} />}
                      {data.family_info?.mother_status && <FieldRow label="Mother Status" value={<span className="capitalize">{data.family_info.mother_status}</span>} />}
                    </div>
                  </div>
                )}
                {data.family_info?.children && data.family_info.children.length > 0 && (
                  <div>
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Children ({data.family_info.children.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {data.family_info.children.map((c, i) => (
                        <span key={i} className="px-2.5 py-1 bg-muted rounded-full text-sm text-foreground">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}
                {!data.marital_status && !data.family_info?.spouse_name && !data.family_info?.father_name && !data.family_info?.mother_name && (
                  <p className="text-sm text-muted-foreground">No family details recorded.</p>
                )}
              </div>
            )}
          </Card>

          {/* ── 7. Sacraments ── */}
          <Card
            title={`Sacraments${data.sacraments?.length ? ` (${data.sacraments.length})` : ''}`}
            icon={BookOpen} editing={sacEditing}
            editControls={canEdit ? (sacEditing ? (
              <button className={EDIT_BTN} onClick={() => { setSacEditing(false); setEditSacId(null); setShowAddSac(false); }}>
                <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button className={EDIT_BTN} onClick={() => setSacEditing(true)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {/* Edit mode: inline per-row editing */}
            {sacEditing && (
              <div className="divide-y divide-border -my-1">
                {(data.sacraments ?? []).map(s => (
                  <div key={s.id} className="py-3 first:pt-0 last:pb-0">
                    {editSacId === s.id ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Type</label>
                            <select value={sacDraft.type ?? s.sacrament.name} onChange={e => setSacDraft(d => ({ ...d, type: e.target.value }))} className={SEL}>
                              {SACRAMENT_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Minister</label>
                            <input value={sacDraft.minister ?? (s.minister ?? '')} onChange={e => setSacDraft(d => ({ ...d, minister: e.target.value }))} className={INP} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date Received</label>
                            <input type="date" value={sacDraft.date_received ?? (s.date_received?.split('T')[0] ?? '')} onChange={e => setSacDraft(d => ({ ...d, date_received: e.target.value }))} className={INP} />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Place</label>
                            <input value={sacDraft.place ?? (s.place ?? '')} onChange={e => setSacDraft(d => ({ ...d, place: e.target.value }))} className={INP} />
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" isLoading={sacSaving} onClick={() => updateSacrament(s.id)}><Save className="w-3 h-3" /> <span className="hidden sm:inline">Save</span></Button>
                          <Button size="sm" variant="outline" onClick={() => setEditSacId(null)} disabled={sacSaving}>Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-foreground">{s.sacrament?.name ?? '—'}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">{fmtDate(s.date_received)} · {s.place && s.place !== 'Not specified' ? s.place : 'N/A'} · {s.minister && s.minister !== 'Not specified' ? s.minister : 'N/A'}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button type="button"
                            onClick={() => { setEditSacId(s.id); setSacDraft({ type: s.sacrament.name, date_received: s.date_received?.split('T')[0] ?? '', place: s.place ?? '', minister: s.minister ?? '' }); }}
                            className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button type="button" onClick={() => deleteSacrament(s.id)} disabled={sacSaving}
                            className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* View mode: table */}
            {!sacEditing && (
              (data.sacraments && data.sacraments.length > 0) ? (
                <div className="overflow-x-auto -mx-5">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border bg-muted/20">
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-5 py-2.5">Sacrament</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Date Received</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Place</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5">Minister</th>
                        <th className="text-left text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-3 py-2.5 pr-5">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {data.sacraments.map(s => (
                        <tr key={s.id} className="hover:bg-muted/20 transition-colors">
                          <td className="px-5 py-3 font-medium text-foreground">{s.sacrament?.name ?? 'N/A'}</td>
                          <td className="px-3 py-3 text-muted-foreground">{s.date_received ? fmtDate(s.date_received) : 'N/A'}</td>
                          <td className="px-3 py-3 text-muted-foreground">{s.place && s.place !== 'Not specified' ? s.place : 'N/A'}</td>
                          <td className="px-3 py-3 text-muted-foreground">{s.minister && s.minister !== 'Not specified' ? s.minister : 'N/A'}</td>
                          <td className="px-3 py-3 pr-5 text-muted-foreground italic">{s.notes || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No sacraments recorded.</p>
              )
            )}

            {/* Add sacrament form (edit mode) */}
            {sacEditing && (
              <div className="mt-3">
                {showAddSac ? (
                  <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                    <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">New Sacrament</p>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Type *</label>
                        <select value={newSacDraft.sacrament_id ?? ''} onChange={e => setNewSacDraft(d => ({ ...d, sacrament_id: e.target.value }))} className={SEL}>
                          <option value="">— Select type —</option>
                          {SACRAMENT_TYPES.filter(t => {
                            const existing = (data.sacraments ?? []).find(s => s.sacrament.name === t);
                            return !existing || !existing.sacrament.once_only;
                          }).map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Minister</label>
                        <input value={newSacDraft.minister ?? ''} onChange={e => setNewSacDraft(d => ({ ...d, minister: e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Date Received</label>
                        <input type="date" value={newSacDraft.date_received ?? ''} onChange={e => setNewSacDraft(d => ({ ...d, date_received: e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Place</label>
                        <input value={newSacDraft.place ?? ''} onChange={e => setNewSacDraft(d => ({ ...d, place: e.target.value }))} className={INP} />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" isLoading={sacSaving} onClick={addSacrament} title="Add"><Plus className="w-3 h-3" /> <span className="hidden sm:inline">Add</span></Button>
                      <Button size="sm" variant="outline" onClick={() => { setShowAddSac(false); setNewSacDraft({ sacrament_id: '' }); }} disabled={sacSaving}>Cancel</Button>
                    </div>
                  </div>
                ) : (
                  <button type="button" onClick={() => setShowAddSac(true)}
                    className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors w-full">
                    <Plus className="w-3.5 h-3.5" /> Add Sacrament
                  </button>
                )}
              </div>
            )}
          </Card>

          {/* ── 9. Languages ── */}
          <Card
            title={`Languages${data.languages_spoken?.length ? ` (${data.languages_spoken.length})` : ''}`}
            icon={Globe} editing={langEditing}
            editControls={canEdit ? (langEditing ? (
              <button className={EDIT_BTN} onClick={() => setLangEditing(false)}>
                <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button className={EDIT_BTN} onClick={() => setLangEditing(true)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            {langEditing ? (
              <div>
                <p className="text-xs text-muted-foreground mb-3">Click to toggle languages spoken by this parishioner.</p>
                {langSaving && <p className="text-xs text-muted-foreground mb-2 animate-pulse">Saving…</p>}
                <div className="flex flex-wrap gap-2">
                  {allLanguages.map(lang => {
                    const active = spokenLangIds.has(lang.id);
                    return (
                      <button key={lang.id} type="button"
                        onClick={() => toggleLanguage(lang)}
                        disabled={langSaving}
                        className={`px-2.5 py-1 rounded-full text-sm font-medium border transition-colors ${
                          active
                            ? 'bg-navy/10 border-navy/20 text-navy'
                            : 'bg-muted border-border text-muted-foreground hover:border-navy/30 hover:text-foreground'
                        }`}
                      >
                        {active && <span className="mr-1">✓</span>}{lang.name}
                      </button>
                    );
                  })}
                  {allLanguages.length === 0 && <p className="text-sm text-muted-foreground">No languages available.</p>}
                </div>
              </div>
            ) : (data.languages_spoken && data.languages_spoken.length > 0) ? (
              <div className="flex flex-wrap gap-2">
                {data.languages_spoken.map(l => (
                  <span key={l.id} className="px-2.5 py-1 bg-muted rounded-full text-sm text-foreground">{l.name}</span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No languages recorded.</p>
            )}
          </Card>

          {/* ── 10. Emergency Contacts ── */}
          <Card
            title={`Emergency Contacts${data.emergency_contacts?.length ? ` (${data.emergency_contacts.length})` : ''}`}
            icon={AlertCircle}
            editing={ecEditing}
            editControls={canEdit ? (ecEditing ? (
              <button className={EDIT_BTN} onClick={() => { setEcEditing(false); setEditEcId(null); setShowAddEc(false); }}>
                <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button className={EDIT_BTN} onClick={() => setEcEditing(true)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            <div className="divide-y divide-border -my-1">
              {(data.emergency_contacts ?? []).map(c => (
                <div key={c.id} className="py-3 first:pt-0 last:pb-0">
                  {ecEditing && editEcId === c.id ? (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name *</label>
                          <input value={ecDraft.name ?? c.name} onChange={e => setEcDraft(d => ({ ...d, name: e.target.value }))} className={INP} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Relationship</label>
                          <input value={ecDraft.relationship ?? c.relationship} onChange={e => setEcDraft(d => ({ ...d, relationship: e.target.value }))} className={INP} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Primary Phone *</label>
                          <input value={ecDraft.primary_phone ?? c.primary_phone} onChange={e => setEcDraft(d => ({ ...d, primary_phone: e.target.value }))} className={INP} />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alt. Phone</label>
                          <input value={ecDraft.alternative_phone ?? (c.alternative_phone ?? '')} onChange={e => setEcDraft(d => ({ ...d, alternative_phone: e.target.value }))} className={INP} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" isLoading={ecSaving} onClick={() => updateEmergencyContact(c.id)}><Save className="w-3 h-3" /> <span className="hidden sm:inline">Save</span></Button>
                        <Button size="sm" variant="outline" onClick={() => setEditEcId(null)} disabled={ecSaving}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-foreground">{c.name}</p>
                        <p className="text-xs text-muted-foreground capitalize mt-0.5">{c.relationship}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right space-y-0.5">
                          <a href={`tel:${c.primary_phone}`} className="block text-xs text-navy hover:underline font-mono">{c.primary_phone}</a>
                          {c.alternative_phone && (
                            <a href={`tel:${c.alternative_phone}`} className="block text-xs text-muted-foreground hover:underline font-mono">{c.alternative_phone}</a>
                          )}
                        </div>
                        {ecEditing && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button type="button"
                              onClick={() => { setEditEcId(c.id); setEcDraft({ name: c.name, relationship: c.relationship, primary_phone: c.primary_phone, alternative_phone: c.alternative_phone ?? '' }); }}
                              className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors">
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button type="button" onClick={() => deleteEmergencyContact(c.id)} disabled={ecSaving}
                              className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Add new contact */}
              {ecEditing && (
                <div className="pt-3 first:pt-0">
                  {showAddEc ? (
                    <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">New Contact</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Name *</label>
                          <input value={newEcDraft.name} onChange={e => setNewEcDraft(d => ({ ...d, name: e.target.value }))} className={INP} placeholder="Full name" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Relationship</label>
                          <input value={newEcDraft.relationship} onChange={e => setNewEcDraft(d => ({ ...d, relationship: e.target.value }))} className={INP} placeholder="e.g. Spouse" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Primary Phone *</label>
                          <input value={newEcDraft.primary_phone} onChange={e => setNewEcDraft(d => ({ ...d, primary_phone: e.target.value }))} className={INP} placeholder="233…" />
                        </div>
                        <div>
                          <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Alt. Phone</label>
                          <input value={newEcDraft.alternative_phone} onChange={e => setNewEcDraft(d => ({ ...d, alternative_phone: e.target.value }))} className={INP} placeholder="Optional" />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" isLoading={ecSaving} onClick={addEmergencyContact}
                          disabled={!newEcDraft.name.trim() || !newEcDraft.primary_phone.trim()}>
                          <Plus className="w-3 h-3" /> Add
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowAddEc(false); setNewEcDraft({ name: '', relationship: '', primary_phone: '', alternative_phone: '' }); }} disabled={ecSaving}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowAddEc(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors w-full">
                      <Plus className="w-3.5 h-3.5" /> Add Contact
                    </button>
                  )}
                </div>
              )}

              {!ecEditing && (!data.emergency_contacts || data.emergency_contacts.length === 0) && (
                <p className="text-sm text-muted-foreground">No emergency contacts recorded.</p>
              )}
            </div>
          </Card>

          {/* ── 11. Medical Conditions ── */}
          <Card
            title={`Medical Conditions${data.medical_conditions?.length ? ` (${data.medical_conditions.length})` : ''}`}
            icon={AlertCircle}
            editing={mcEditing}
            editControls={canEdit ? (mcEditing ? (
              <button className={EDIT_BTN} onClick={() => { setMcEditing(false); setEditMcId(null); setShowAddMc(false); setNewMcDraft({ condition: '', notes: '' }); }}>
                <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button className={EDIT_BTN} onClick={() => setMcEditing(true)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            <div className="space-y-3">
              {(data.medical_conditions ?? []).map(m => (
                <div key={m.id} className={`flex items-start gap-3 p-3 border rounded-lg ${mcEditing ? 'bg-muted/10 border-border' : 'bg-red-50/50 border-red-100'}`}>
                  {mcEditing && editMcId === m.id ? (
                    <div className="flex-1 space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Condition</label>
                        <input value={mcDraft.condition} onChange={e => setMcDraft(d => ({ ...d, condition: e.target.value }))} className={INP} />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
                        <textarea value={mcDraft.notes} onChange={e => setMcDraft(d => ({ ...d, notes: e.target.value }))} rows={2} className={`${INP} resize-none`} />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" isLoading={mcSaving} onClick={() => updateMedicalCondition(m.id)}><Save className="w-3 h-3" /> <span className="hidden sm:inline">Save</span></Button>
                        <Button size="sm" variant="outline" onClick={() => setEditMcId(null)} disabled={mcSaving}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <AlertCircle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">{m.condition}</p>
                        {m.notes && <p className="text-xs text-muted-foreground mt-0.5">{m.notes}</p>}
                      </div>
                      {mcEditing && (
                        <div className="flex gap-1 shrink-0">
                          <button type="button" onClick={() => { setEditMcId(m.id); setMcDraft({ condition: m.condition, notes: m.notes ?? '' }); }}
                            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors">
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button type="button" onClick={() => deleteMedicalCondition(m.id)} disabled={mcSaving}
                            className="p-1 rounded hover:bg-red-50 text-muted-foreground hover:text-red-500 transition-colors">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              {mcEditing && (
                <div>
                  {showAddMc ? (
                    <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Condition <span className="text-destructive">*</span></label>
                        <input value={newMcDraft.condition} onChange={e => setNewMcDraft(d => ({ ...d, condition: e.target.value }))} className={INP} placeholder="e.g. Diabetes, Hypertension" />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Notes</label>
                        <textarea value={newMcDraft.notes} onChange={e => setNewMcDraft(d => ({ ...d, notes: e.target.value }))} rows={2} className={`${INP} resize-none`} placeholder="Optional notes…" />
                      </div>
                      <div className="flex gap-2 pt-1">
                        <Button size="sm" isLoading={mcSaving} onClick={addMedicalCondition} disabled={!newMcDraft.condition.trim()} title="Add"><Plus className="w-3 h-3" /> <span className="hidden sm:inline">Add</span></Button>
                        <Button size="sm" variant="outline" onClick={() => { setShowAddMc(false); setNewMcDraft({ condition: '', notes: '' }); }} disabled={mcSaving}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <button type="button" onClick={() => setShowAddMc(true)}
                      className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground px-2 py-2 rounded-lg hover:bg-muted transition-colors w-full">
                      <Plus className="w-3.5 h-3.5" /> Add Condition
                    </button>
                  )}
                </div>
              )}

              {!mcEditing && (!data.medical_conditions || data.medical_conditions.length === 0) && (
                <p className="text-sm text-muted-foreground">No medical conditions recorded.</p>
              )}
            </div>
          </Card>

          {/* ── 12. Skills ── */}
          <Card
            title={`Skills${data.skills?.length ? ` (${data.skills.length})` : ''}`}
            icon={Star} editing={skillsEditing}
            editControls={canEdit ? (skillsEditing ? (
              <button className={EDIT_BTN} onClick={() => { setSkillsEditing(false); setNewSkill(''); }}>
                <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
              </button>
            ) : (
              <button className={EDIT_BTN} onClick={() => setSkillsEditing(true)}>
                <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
              </button>
            )) : undefined}
          >
            <div className="flex flex-wrap gap-2">
              {(data.skills ?? []).map(s => (
                <span key={s.id} className={`inline-flex items-center gap-1 px-2.5 py-1 bg-navy/5 border border-navy/10 text-navy text-xs font-medium rounded-full`}>
                  <Star className="w-2.5 h-2.5 shrink-0" />
                  {s.name}
                  {skillsEditing && (
                    <button type="button" onClick={() => removeSkill(s.id)} disabled={deletingSkillId === s.id}
                      className="ml-0.5 text-navy/50 hover:text-destructive transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ))}
              {(!data.skills || data.skills.length === 0) && !skillsEditing && (
                <p className="text-sm text-muted-foreground">No skills recorded.</p>
              )}
            </div>
            {skillsEditing && (
              <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border">
                <input value={newSkill} onChange={e => setNewSkill(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') addSkill(); }}
                  className={`${INP} flex-1`} placeholder="Add a skill…"
                />
                <Button size="sm" onClick={addSkill} isLoading={addingSkill} disabled={!newSkill.trim()}>
                  <Plus className="w-3 h-3" /> Add
                </Button>
              </div>
            )}
          </Card>

          {/* ── 13. Notes ── */}
          {data.notes && (
            <Card title="Notes" icon={Hash}>
              <p className="text-sm text-foreground whitespace-pre-wrap">{data.notes}</p>
            </Card>
          )}

          {/* ── 14. Record ── */}
          <Card title="Record" icon={Hash}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              <FieldRow label="Record ID" value={<span className="font-mono text-xs break-all">{data.id}</span>} />
              <div />
              <FieldRow label="Created" value={fmtDateTime(data.created_at)} />
              <FieldRow label="Last Updated" value={fmtDateTime(data.updated_at)} />
            </div>
          </Card>

        </div>}

        {activeTab === 'societies' && (
          <div className="grid grid-cols-1 gap-4">
            <Card
              title={`Societies${data.societies?.length ? ` (${data.societies.length})` : ''}`}
              icon={Users} editing={socEditing}
              editControls={canEdit ? (socEditing ? (
                <button className={EDIT_BTN} onClick={() => { setSocEditing(false); setSocToAdd(''); }}>
                  <X className="w-3 h-3" /> <span className="hidden sm:inline">Done</span>
                </button>
              ) : (
                <button className={EDIT_BTN} onClick={() => setSocEditing(true)}>
                  <Pencil className="w-3 h-3" /> <span className="hidden sm:inline">Edit</span>
                </button>
              )) : undefined}
            >
              <div className="space-y-1">
                {(data.societies ?? []).map(s => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/40 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-foreground">{s.name}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {s.date_joined && <p className="text-xs text-muted-foreground">Joined {fmtDate(s.date_joined)}</p>}
                        {s.membership_status && (
                          <Badge color={s.membership_status === 'active' ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}>
                            {s.membership_status}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {socEditing && (
                      <button type="button" onClick={() => leaveSociety(s.id, s.name)} disabled={socSaving}
                        className="p-1.5 text-destructive/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                ))}
                {(!data.societies || data.societies.length === 0) && !socEditing && (
                  <p className="text-sm text-muted-foreground">No societies.</p>
                )}
                {socEditing && availableSocieties.length > 0 && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border mt-2">
                    <select value={socToAdd} onChange={e => setSocToAdd(e.target.value)} className={`${SEL} flex-1`}>
                      <option value="">— Join a society —</option>
                      {availableSocieties.map(s => <option key={s.id} value={String(s.id)}>{s.name}</option>)}
                    </select>
                    <Button size="sm" onClick={joinSociety} disabled={!socToAdd} isLoading={socSaving}>
                      <Plus className="w-3 h-3" /> Join
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {activeTab === 'financials' && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Banknote className="w-6 h-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Dues & Financials</h3>
            <p className="text-sm text-muted-foreground max-w-xs">Church dues and financial records for this parishioner will appear here once the feature is available.</p>
          </div>
        )}
      </div>

      {/* ── Message modal ── */}
      {showMessageModal && id && (
        <SendMessageModal
          parishionerIds={[id]}
          onClose={() => setShowMessageModal(false)}
        />
      )}

    </div>
  );
}
