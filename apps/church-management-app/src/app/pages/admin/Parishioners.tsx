import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import {
  ChevronLeft, ChevronRight, RefreshCw, Plus, Upload,
  ChevronDown, Search, X, SlidersHorizontal,
} from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal, PhoneInput } from '../../components/ui';
import { ChurchUnitSelect } from '../../components/admin/ChurchUnitSelect';
import type {
  ParishionerCreate, Parishioner, ChurchCommunity,
  Gender, MaritalStatus, MembershipStatus, VerificationStatus,
} from '@sfoacc/sdk';

// ── Extended type (includes extra API fields the backend returns) ──────────────

type P = Parishioner & {
  title?: string | null;
  baptismal_name?: string | null;
  nationality?: string | null;
  is_deceased?: boolean | null;
  date_of_death?: string | null;
  photo_url?: string | null;
  notes?: string | null;
};

// ── Filter state ───────────────────────────────────────────────────────────────

interface ParishFilters {
  search: string;
  gender: string;
  marital_status: string;
  membership_status: string;
  verification_status: string;
  church_unit_id: string;
  church_community_id: string;
  has_new_church_id: string; // '' | 'yes' | 'no' (client-side)
  date_from: string;         // created_at from (client-side)
  date_to: string;           // created_at to (client-side)
}

const EMPTY_FILTERS: ParishFilters = {
  search: '', gender: '', marital_status: '', membership_status: '',
  verification_status: '', church_unit_id: '', church_community_id: '',
  has_new_church_id: '', date_from: '', date_to: '',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

const PAGE_SIZE = 25;

function fmtDate(s: string | null | undefined) {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function calcAge(dob: string | null | undefined) {
  if (!dob) return null;
  const ms = Date.now() - new Date(dob).getTime();
  const age = Math.floor(ms / (365.25 * 24 * 3600 * 1000));
  return isNaN(age) || age < 0 ? null : age;
}

function displayName(p: P) {
  return [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ') || '—';
}

const SEL = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all cursor-pointer appearance-none pr-7';
const INP = 'px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring transition-all';

function Badge({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${color}`}>
      {children}
    </span>
  );
}

function MembershipBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = {
    active: 'bg-emerald-50 text-emerald-700',
    deceased: 'bg-gray-100 text-gray-600',
    disabled: 'bg-red-50 text-red-600',
  };
  return <Badge color={map[status] ?? 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

function VerificationBadge({ status }: { status: string | null | undefined }) {
  if (!status) return <span className="text-muted-foreground text-xs">—</span>;
  const map: Record<string, string> = {
    verified: 'bg-emerald-50 text-emerald-700',
    pending: 'bg-amber-50 text-amber-700',
    unverified: 'bg-red-50 text-red-600',
  };
  return <Badge color={map[status] ?? 'bg-muted text-muted-foreground'}>{status}</Badge>;
}

// ── Parishioner filter panel ───────────────────────────────────────────────────

function ParishionerFilterPanel({
  filters,
  communities,
  onChange,
}: {
  filters: ParishFilters;
  communities: ChurchCommunity[];
  onChange: (f: ParishFilters) => void;
}) {
  const [search, setSearch] = useState(filters.search);
  const [moreOpen, setMoreOpen] = useState(false);

  // Sync search with debounce
  useEffect(() => {
    const t = setTimeout(() => onChange({ ...filters, search }), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const set = (patch: Partial<ParishFilters>) => onChange({ ...filters, ...patch });

  const hasActive = Object.values(filters).some(v => v !== '');

  const clearAll = () => {
    setSearch('');
    onChange(EMPTY_FILTERS);
  };

  return (
    <div className="space-y-2">
      {/* Row 1: always-visible filters */}
      <div className="flex flex-wrap items-center gap-2">

        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by name, phone, email…"
            className={`${INP} w-full pl-9 pr-8`}
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Gender */}
        <div className="relative">
          <select
            value={filters.gender}
            onChange={e => set({ gender: e.target.value })}
            className={`${SEL} min-w-[110px]`}
          >
            <option value="">All genders</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Membership status */}
        <div className="relative">
          <select
            value={filters.membership_status}
            onChange={e => set({ membership_status: e.target.value })}
            className={`${SEL} min-w-[140px]`}
          >
            <option value="">All memberships</option>
            <option value="active">Active</option>
            <option value="deceased">Deceased</option>
            <option value="disabled">Disabled</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Verification */}
        <div className="relative">
          <select
            value={filters.verification_status}
            onChange={e => set({ verification_status: e.target.value })}
            className={`${SEL} min-w-[140px]`}
          >
            <option value="">All verifications</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="unverified">Unverified</option>
          </select>
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* Church unit */}
        <div className="relative">
          <ChurchUnitSelect
            value={filters.church_unit_id}
            onChange={v => set({ church_unit_id: v, church_community_id: '' })}
            className={`${SEL} min-w-[170px]`}
          />
          <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
        </div>

        {/* More filters toggle */}
        <button
          onClick={() => setMoreOpen(o => !o)}
          className={`flex items-center gap-1.5 px-3 py-2 border rounded-lg text-sm transition-all ${
            moreOpen || filters.marital_status || filters.has_new_church_id || filters.church_community_id || filters.date_from || filters.date_to
              ? 'border-navy/40 bg-navy/5 text-navy'
              : 'border-input bg-background text-muted-foreground hover:text-foreground hover:bg-muted'
          }`}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span className="hidden sm:inline text-xs font-medium">More filters</span>
          {(filters.marital_status || filters.has_new_church_id || filters.church_community_id || filters.date_from || filters.date_to) && (
            <span className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />
          )}
        </button>

        {/* Clear all */}
        {hasActive && (
          <button
            onClick={clearAll}
            className="flex items-center gap-1.5 px-3 py-2 text-sm text-muted-foreground hover:text-foreground border border-input rounded-lg hover:bg-muted transition-all"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline text-xs">Clear all</span>
          </button>
        )}
      </div>

      {/* Row 2: expanded filters */}
      {moreOpen && (
        <div className="flex flex-wrap items-center gap-2 p-3 bg-muted/30 rounded-xl border border-border">

          {/* Marital status */}
          <div className="relative">
            <select
              value={filters.marital_status}
              onChange={e => set({ marital_status: e.target.value })}
              className={`${SEL} min-w-[140px]`}
            >
              <option value="">Marital status</option>
              <option value="single">Single</option>
              <option value="married">Married</option>
              <option value="widowed">Widowed</option>
              <option value="divorced">Divorced</option>
              <option value="separated">Separated</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Has New Church ID */}
          <div className="relative">
            <select
              value={filters.has_new_church_id}
              onChange={e => set({ has_new_church_id: e.target.value })}
              className={`${SEL} min-w-[160px]`}
            >
              <option value="">New Church ID?</option>
              <option value="yes">Has new Church ID</option>
              <option value="no">No new Church ID</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
          </div>

          {/* Community */}
          {communities.length > 0 && (
            <div className="relative">
              <select
                value={filters.church_community_id}
                onChange={e => set({ church_community_id: e.target.value })}
                className={`${SEL} min-w-[160px]`}
              >
                <option value="">All communities</option>
                {communities.map(c => (
                  <option key={c.id} value={String(c.id)}>{c.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground pointer-events-none" />
            </div>
          )}

          {/* Created date range */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground font-medium">Created from</span>
            <input
              type="date"
              value={filters.date_from}
              onChange={e => set({ date_from: e.target.value })}
              className={`${INP} text-xs`}
            />
            <span className="text-xs text-muted-foreground">to</span>
            <input
              type="date"
              value={filters.date_to}
              onChange={e => set({ date_to: e.target.value })}
              className={`${INP} text-xs`}
            />
            {(filters.date_from || filters.date_to) && (
              <button
                onClick={() => set({ date_from: '', date_to: '' })}
                className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Add Parishioner Modal ─────────────────────────────────────────────────────

interface ParishionerForm {
  first_name: string;
  other_names: string;
  last_name: string;
  maiden_name: string;
  gender: 'male' | 'female' | 'other' | '';
  date_of_birth: string;
  place_of_birth: string;
  hometown: string;
  region: string;
  country: string;
  marital_status: 'single' | 'married' | 'widowed' | 'divorced' | 'separated' | '';
  mobile_number: string;
  whatsapp_number: string;
  email_address: string;
  current_residence: string;
  membership_status: 'active' | 'deceased' | 'disabled' | '';
}

const EMPTY_FORM: ParishionerForm = {
  first_name: '', other_names: '', last_name: '', maiden_name: '',
  gender: '', date_of_birth: '', place_of_birth: '', hometown: '',
  region: '', country: '', marital_status: '', mobile_number: '',
  whatsapp_number: '', email_address: '', current_residence: '',
  membership_status: '',
};

function AddParishionerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const client = useSDK();
  const [form, setForm] = useState<ParishionerForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY_FORM); }, [open]);

  const set = (k: keyof ParishionerForm, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim() || !form.gender) {
      toast.error('First name, last name, and gender are required');
      return;
    }
    setSaving(true);
    const payload: ParishionerCreate = {
      first_name: form.first_name.trim(),
      last_name: form.last_name.trim(),
      other_names: form.other_names || null,
      maiden_name: form.maiden_name || null,
      gender: form.gender as ParishionerCreate['gender'],
      date_of_birth: form.date_of_birth || null,
      place_of_birth: form.place_of_birth || null,
      hometown: form.hometown || null,
      region: form.region || null,
      country: form.country || null,
      marital_status: (form.marital_status || null) as ParishionerCreate['marital_status'],
      mobile_number: form.mobile_number || null,
      whatsapp_number: form.whatsapp_number || null,
      email_address: form.email_address || null,
      current_residence: form.current_residence || null,
      membership_status: (form.membership_status || null) as ParishionerCreate['membership_status'],
    };
    try {
      await client.createParishioner(payload);
      toast.success('Parishioner added successfully');
      onSaved();
    } catch (err) {
      toastApiError(err, 'Failed to add parishioner');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition';

  return (
    <Modal
      open={open} onClose={onClose} size="lg"
      title="Add Parishioner"
      description="Register a new parishioner in the system"
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSubmit as unknown as React.MouseEventHandler}>
            Add Parishioner
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Name</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">First Name <span className="text-red-500">*</span></label>
              <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="John" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Other Names</label>
              <input value={form.other_names} onChange={e => set('other_names', e.target.value)} placeholder="Middle name(s)" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Last Name <span className="text-red-500">*</span></label>
              <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Doe" className={inputCls} />
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-foreground mb-1">Maiden Name</label>
            <input value={form.maiden_name} onChange={e => set('maiden_name', e.target.value)} placeholder="For married women (optional)" className={inputCls} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Personal Details</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Gender <span className="text-red-500">*</span></label>
              <select value={form.gender} onChange={e => set('gender', e.target.value)} className={inputCls}>
                <option value="">Select gender…</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Date of Birth</label>
              <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Marital Status</label>
              <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="single">Single</option>
                <option value="married">Married</option>
                <option value="widowed">Widowed</option>
                <option value="divorced">Divorced</option>
                <option value="separated">Separated</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Membership Status</label>
              <select value={form.membership_status} onChange={e => set('membership_status', e.target.value)} className={inputCls}>
                <option value="">Select…</option>
                <option value="active">Active</option>
                <option value="deceased">Deceased</option>
                <option value="disabled">Disabled</option>
              </select>
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Mobile Number</label>
              <PhoneInput value={form.mobile_number} onChange={v => set('mobile_number', v)} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">WhatsApp Number</label>
              <PhoneInput value={form.whatsapp_number} onChange={v => set('whatsapp_number', v)} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
              <input type="email" value={form.email_address} onChange={e => set('email_address', e.target.value)} placeholder="john.doe@email.com" className={inputCls} />
            </div>
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Hometown</label>
              <input value={form.hometown} onChange={e => set('hometown', e.target.value)} placeholder="Hometown" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Place of Birth</label>
              <input value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} placeholder="City of birth" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Region</label>
              <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="Region / State" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Current Residence</label>
              <input value={form.current_residence} onChange={e => set('current_residence', e.target.value)} placeholder="Current address" className={inputCls} />
            </div>
          </div>
        </div>
      </form>
    </Modal>
  );
}

// ── Bulk Upload Modal ─────────────────────────────────────────────────────────

const CSV_TEMPLATE_HEADERS = [
  'first_name', 'last_name', 'other_names', 'gender', 'date_of_birth',
  'mobile_number', 'email_address', 'marital_status', 'hometown', 'region', 'country',
].join(',');

function BulkUploadModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const client = useSDK();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string[][]>([]);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ created: number; skipped: number; errors: string[] } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) { setFile(null); setPreview([]); setResult(null); }
  }, [open]);

  const handleFile = (f: File) => {
    setFile(f);
    setResult(null);
    const reader = new FileReader();
    reader.onload = e => {
      const lines = (e.target?.result as string).split('\n').filter(Boolean);
      const rows = lines.slice(0, 6).map(l => l.split(',').map(c => c.trim().replace(/^"|"$/g, '')));
      setPreview(rows);
    };
    reader.readAsText(f);
  };

  const downloadTemplate = () => {
    const blob = new Blob(
      [CSV_TEMPLATE_HEADERS + '\nJohn,Doe,,male,1990-01-15,+233200000000,john@email.com,single,Accra,Greater Accra,Ghana'],
      { type: 'text/csv' }
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'parishioners_template.csv';
    a.click(); URL.revokeObjectURL(url);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    try {
      const res = await client.uploadParishionersCsv(file);
      const data = res.data ?? (res as unknown as { created: number; skipped: number; errors: string[] });
      setResult(data);
      if (data.created > 0) {
        toast.success(`${data.created} parishioner${data.created !== 1 ? 's' : ''} imported`);
        onSaved();
      }
    } catch (err) {
      toastApiError(err, 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const previewHeaders = preview[0] ?? [];
  const previewRows = preview.slice(1);

  return (
    <Modal
      open={open} onClose={onClose} size="xl"
      title="Bulk Import Parishioners"
      description="Upload a CSV file to import multiple parishioners at once"
      footer={
        <div className="flex items-center justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="text-xs">
            Download template CSV
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={uploading}>Cancel</Button>
            <Button size="sm" isLoading={uploading} disabled={!file || !!result} onClick={handleUpload}>
              <Upload className="w-3.5 h-3.5" /> Import
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
            file ? 'border-[#4cb8d7]/60 bg-[#e6f7fb]/40' : 'border-border hover:border-navy/30 hover:bg-muted/30'
          }`}
        >
          <input ref={fileRef} type="file" accept=".csv,text/csv" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
          <Upload className={`w-8 h-8 mx-auto mb-2 ${file ? 'text-[#2d7d96]' : 'text-muted-foreground/40'}`} />
          {file ? (
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{(file.size / 1024).toFixed(1)} KB · Click to change</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-foreground">Drop a CSV file here</p>
              <p className="text-xs text-muted-foreground mt-0.5">or click to browse</p>
            </div>
          )}
        </div>

        <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Required columns</p>
          <p><span className="font-mono text-navy">first_name</span>, <span className="font-mono text-navy">last_name</span>, <span className="font-mono text-navy">gender</span> (male/female/other)</p>
          <p className="mt-0.5">Optional: <span className="font-mono">other_names, date_of_birth, mobile_number, email_address, marital_status, hometown, region, country</span></p>
        </div>

        {previewRows.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
              Preview — {previewRows.length} row{previewRows.length !== 1 ? 's' : ''} shown
            </p>
            <div className="border border-border rounded-lg overflow-hidden overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    {previewHeaders.map((h, i) => (
                      <th key={i} className="text-left px-3 py-2 font-semibold text-muted-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="hover:bg-muted/20">
                      {row.map((cell, ci) => (
                        <td key={ci} className="px-3 py-2 text-foreground whitespace-nowrap max-w-[120px] truncate">{cell || '—'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {result && (
          <div className={`rounded-lg px-4 py-3 text-sm ${result.errors.length > 0 ? 'bg-amber-50 border border-amber-200' : 'bg-emerald-50 border border-emerald-200'}`}>
            <p className="font-semibold text-foreground mb-1">Import complete</p>
            <p className="text-xs text-muted-foreground">
              <span className="text-emerald-700 font-medium">{result.created} created</span>
              {result.skipped > 0 && <> · <span className="text-amber-700 font-medium">{result.skipped} skipped</span></>}
            </p>
            {result.errors.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-red-700 list-disc list-inside">
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
                {result.errors.length > 5 && <li>…and {result.errors.length - 5} more</li>}
              </ul>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}

// ── Table header cell ─────────────────────────────────────────────────────────

function TH({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`px-4 py-3 text-left text-[11px] font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap ${className}`}>
      {children}
    </th>
  );
}

function TD({ children, className = '', title }: { children: React.ReactNode; className?: string; title?: string }) {
  return (
    <td className={`px-4 py-3 text-sm whitespace-nowrap ${className}`} title={title}>
      {children}
    </td>
  );
}

// ── Column definitions (shared between header + body tables for width sync) ───

const COLS = [
  { w: 220 }, { w: 80  }, { w: 80  }, { w: 110 }, { w: 55  },
  { w: 110 }, { w: 140 }, { w: 140 }, { w: 190 }, { w: 130 },
  { w: 120 }, { w: 100 }, { w: 160 }, { w: 110 }, { w: 130 },
  { w: 120 }, { w: 110 }, { w: 120 }, { w: 120 }, { w: 120 },
  { w: 120 }, { w: 90  }, { w: 120 }, { w: 80  },
] as const;

function TableColgroup() {
  return (
    <colgroup>
      {COLS.map((c, i) => <col key={i} style={{ minWidth: c.w, width: c.w }} />)}
    </colgroup>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminParishioners() {
  const client = useSDK();
  const navigate = useNavigate();

  const [rawItems, setRawItems] = useState<P[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<ParishFilters>(EMPTY_FILTERS);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  const [communities, setCommunities] = useState<ChurchCommunity[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  // Refs for two-table scroll sync
  const headRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);

  const onBodyScroll = useCallback(() => {
    if (headRef.current && bodyRef.current) {
      headRef.current.scrollLeft = bodyRef.current.scrollLeft;
    }
  }, []);

  // Load communities for filter dropdown
  useEffect(() => {
    client.listCommunities({ limit: 200 })
      .then(r => setCommunities(r.data?.items ?? []))
      .catch(() => undefined);
  }, [client]);

  const load = useCallback((f: ParishFilters, p: number, manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);

    const backendParams = {
      limit: PAGE_SIZE,
      skip: p * PAGE_SIZE,
      search: f.search || undefined,
      gender: (f.gender || undefined) as Gender | undefined,
      marital_status: (f.marital_status || undefined) as MaritalStatus | undefined,
      membership_status: (f.membership_status || undefined) as MembershipStatus | undefined,
      verification_status: (f.verification_status || undefined) as VerificationStatus | undefined,
      church_unit_id: f.church_unit_id ? Number(f.church_unit_id) : undefined,
      church_community_id: f.church_community_id ? Number(f.church_community_id) : undefined,
    };

    client.listParishioners(backendParams)
      .then(r => {
        setRawItems((r.data?.items ?? []) as unknown as P[]);
        setTotal(r.data?.total ?? 0);
        if (manual) toast.success('Parishioners refreshed');
      })
      .catch(err => { if (manual) toastApiError(err, 'Failed to refresh'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(filters, page); }, [filters, page, load]);

  const handleFiltersChange = (f: ParishFilters) => { setFilters(f); setPage(0); };

  // Client-side post-filter (fields not supported by backend)
  let items = [...rawItems];
  if (filters.has_new_church_id === 'yes') items = items.filter(p => !!p.new_church_id);
  if (filters.has_new_church_id === 'no') items = items.filter(p => !p.new_church_id);
  if (filters.date_from) items = items.filter(p => new Date(p.created_at) >= new Date(filters.date_from));
  if (filters.date_to) items = items.filter(p => new Date(p.created_at) <= new Date(filters.date_to + 'T23:59:59'));

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const pageStart = page * PAGE_SIZE + 1;
  const pageEnd = page * PAGE_SIZE + items.length;

  const handleSaved = () => {
    setAddOpen(false);
    setBulkOpen(false);
    load(filtersRef.current, 0, true);
    setPage(0);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">

      {/* ── Fixed: title + actions + filters ── */}
      <div className="flex-shrink-0 pb-4 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Parishioners</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {total.toLocaleString()} total records
              {items.length < rawItems.length && ` · ${items.length} shown after filter`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => load(filtersRef.current, page, true)} disabled={refreshing}>
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing…' : 'Refresh'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => setBulkOpen(true)}>
              <Upload className="w-3.5 h-3.5" /> Bulk Import
            </Button>
            <button
              onClick={() => navigate('/admin/parishioners/new')}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy/90 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Parishioner
            </button>
          </div>
        </div>

        <ParishionerFilterPanel
          filters={filters}
          communities={communities}
          onChange={handleFiltersChange}
        />
      </div>

      {/* ── Table: fixed header + scrollable body (fills remaining flex space) ── */}
      <div className="flex-1 min-h-0 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
        {/* Fixed header row — overflow-x hidden, scrollLeft synced from body */}
        <div ref={headRef} className="overflow-hidden flex-shrink-0 border-b border-border bg-muted/95">
          <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: COLS.reduce((s, c) => s + c.w, 0) }}>
            <TableColgroup />
            <thead>
              <tr>
                <TH>Name</TH>
                <TH>Title</TH>
                <TH>Gender</TH>
                <TH>Date of Birth</TH>
                <TH>Age</TH>
                <TH>Marital Status</TH>
                <TH>Mobile</TH>
                <TH>WhatsApp</TH>
                <TH>Email</TH>
                <TH>Hometown</TH>
                <TH>Region</TH>
                <TH>Country</TH>
                <TH>Residence</TH>
                <TH>Nationality</TH>
                <TH>Place of Birth</TH>
                <TH>Baptismal Name</TH>
                <TH>Maiden Name</TH>
                <TH>Old Church ID</TH>
                <TH>New Church ID</TH>
                <TH>Membership</TH>
                <TH>Verification</TH>
                <TH>Deceased</TH>
                <TH>Created</TH>
                <TH className="text-right">Actions</TH>
              </tr>
            </thead>
          </table>
        </div>

        {/* Scrollable body — flex-1 min-h-0 fills remaining space after fixed header */}
        <div
          ref={bodyRef}
          onScroll={onBodyScroll}
          className="flex-1 min-h-0 overflow-auto"
        >
          {loading ? (
            <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading parishioners…</div>
          ) : items.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">No parishioners found.</div>
          ) : (
            <table className="text-sm border-collapse" style={{ tableLayout: 'fixed', width: COLS.reduce((s, c) => s + c.w, 0) }}>
              <TableColgroup />
              <tbody className="divide-y divide-border">
                {items.map(p => {
                  const name = displayName(p);
                  const age = calcAge(p.date_of_birth);
                  const isDeceased = p.is_deceased ?? p.membership_status === 'deceased';
                  return (
                    <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                      <TD className="font-medium overflow-hidden">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-violet-600 text-[11px] font-bold">{name.charAt(0).toUpperCase()}</span>
                          </div>
                          <span className="truncate" title={name}>{name}</span>
                        </div>
                      </TD>
                      <TD className="text-muted-foreground truncate">{p.title ?? '—'}</TD>
                      <TD>
                        {p.gender ? (
                          <Badge color={p.gender === 'male' ? 'bg-blue-50 text-blue-700' : p.gender === 'female' ? 'bg-pink-50 text-pink-700' : 'bg-muted text-muted-foreground'}>
                            {p.gender}
                          </Badge>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TD>
                      <TD className="text-muted-foreground">{fmtDate(p.date_of_birth)}</TD>
                      <TD className="text-muted-foreground">{age != null ? age : '—'}</TD>
                      <TD className="text-muted-foreground capitalize">{p.marital_status ?? '—'}</TD>
                      <TD className="text-muted-foreground font-mono text-xs truncate">{p.mobile_number ?? '—'}</TD>
                      <TD className="text-muted-foreground font-mono text-xs truncate">{p.whatsapp_number ?? '—'}</TD>
                      <TD className="text-muted-foreground text-xs truncate" title={p.email_address ?? ''}>{p.email_address ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.hometown ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.region ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.country ?? '—'}</TD>
                      <TD className="text-muted-foreground text-xs truncate" title={p.current_residence ?? ''}>{p.current_residence ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.nationality ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.place_of_birth ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.baptismal_name ?? '—'}</TD>
                      <TD className="text-muted-foreground truncate">{p.maiden_name ?? '—'}</TD>
                      <TD className="font-mono text-xs text-muted-foreground truncate">{p.old_church_id ?? '—'}</TD>
                      <TD>
                        {p.new_church_id
                          ? <span className="font-mono text-xs text-emerald-700 font-medium truncate block">{p.new_church_id}</span>
                          : <span className="text-muted-foreground">—</span>
                        }
                      </TD>
                      <TD><MembershipBadge status={p.membership_status} /></TD>
                      <TD><VerificationBadge status={p.verification_status} /></TD>
                      <TD>
                        {isDeceased
                          ? <Badge color="bg-gray-100 text-gray-600">Yes</Badge>
                          : <span className="text-muted-foreground text-xs">No</span>
                        }
                      </TD>
                      <TD className="text-muted-foreground text-xs">{fmtDate(p.created_at)}</TD>
                      <TD className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/parishioners/${p.id}`)}>View</Button>
                      </TD>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── Fixed pagination ── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0 pt-4 pb-0">
          <p className="text-xs text-muted-foreground">
            Showing {pageStart}–{pageEnd} of {total.toLocaleString()}
            {items.length < rawItems.length && ` (${rawItems.length - items.length} filtered on this page)`}
          </p>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              <ChevronLeft className="w-3.5 h-3.5" />
            </Button>
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const pg = Math.max(0, Math.min(page - 2, totalPages - 5)) + i;
              return (
                <button key={pg} onClick={() => setPage(pg)}
                  className={`w-8 h-8 rounded-lg text-xs font-medium transition-colors ${
                    pg === page ? 'bg-[#0f172a] text-white' : 'text-muted-foreground hover:bg-muted'
                  }`}>{pg + 1}</button>
              );
            })}
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      <AddParishionerModal open={addOpen} onClose={() => setAddOpen(false)} onSaved={handleSaved} />
      <BulkUploadModal open={bulkOpen} onClose={() => setBulkOpen(false)} onSaved={handleSaved} />
    </div>
  );
}
