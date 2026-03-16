import { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { CheckCircle, Clock, ChevronLeft, ChevronRight, RefreshCw, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal } from '../../components/ui';
import { FilterBar, EMPTY_FILTERS } from '../../components/admin/FilterBar';
import type { FilterState } from '../../components/admin/FilterBar';
import type { ParishionerCreate } from '@sfoacc/sdk';

// ── Types ─────────────────────────────────────────────────────────────────────

type Parishioner = { id: string; full_name?: string; first_name?: string; last_name?: string; church_id?: string; is_verified?: boolean; [key: string]: unknown };

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { label: 'Verified', value: 'true' },
  { label: 'Pending', value: 'false' },
];

const SORT_OPTIONS = [
  { label: 'Name', value: 'full_name' },
  { label: 'Church ID', value: 'church_id' },
];

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

const EMPTY_PARISHIONER: ParishionerForm = {
  first_name: '', other_names: '', last_name: '', maiden_name: '',
  gender: '', date_of_birth: '', place_of_birth: '', hometown: '',
  region: '', country: '', marital_status: '', mobile_number: '',
  whatsapp_number: '', email_address: '', current_residence: '',
  membership_status: '',
};

function AddParishionerModal({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const client = useSDK();
  const [form, setForm] = useState<ParishionerForm>(EMPTY_PARISHIONER);
  const [saving, setSaving] = useState(false);

  useEffect(() => { if (open) setForm(EMPTY_PARISHIONER); }, [open]);

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
        {/* Name */}
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
            <input value={form.maiden_name} onChange={e => set('maiden_name', e.target.value)}
              placeholder="For married women (optional)" className={inputCls} />
          </div>
        </div>

        {/* Personal Details */}
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

        {/* Contact */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Contact</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Mobile Number</label>
              <input type="tel" value={form.mobile_number} onChange={e => set('mobile_number', e.target.value)}
                placeholder="+233 20 000 0000" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">WhatsApp Number</label>
              <input type="tel" value={form.whatsapp_number} onChange={e => set('whatsapp_number', e.target.value)}
                placeholder="+233 20 000 0000" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Email Address</label>
              <input type="email" value={form.email_address} onChange={e => set('email_address', e.target.value)}
                placeholder="john.doe@email.com" className={inputCls} />
            </div>
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Location</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Hometown</label>
              <input value={form.hometown} onChange={e => set('hometown', e.target.value)}
                placeholder="Hometown" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Place of Birth</label>
              <input value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)}
                placeholder="City of birth" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Region</label>
              <input value={form.region} onChange={e => set('region', e.target.value)}
                placeholder="Region / State" className={inputCls} />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1">Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)}
                placeholder="Country" className={inputCls} />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-foreground mb-1">Current Residence</label>
              <input value={form.current_residence} onChange={e => set('current_residence', e.target.value)}
                placeholder="Current address" className={inputCls} />
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
        {/* Drop / click zone */}
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

        {/* Format hint */}
        <div className="bg-muted/40 rounded-lg px-4 py-3 text-xs text-muted-foreground">
          <p className="font-medium text-foreground mb-1">Required columns</p>
          <p><span className="font-mono text-navy">first_name</span>, <span className="font-mono text-navy">last_name</span>, <span className="font-mono text-navy">gender</span> (male/female/other)</p>
          <p className="mt-0.5">Optional: <span className="font-mono">other_names, date_of_birth, mobile_number, email_address, marital_status, hometown, region, country</span></p>
        </div>

        {/* Preview */}
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

        {/* Result */}
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

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminParishioners() {
  const client = useSDK();
  const navigate = useNavigate();
  const [allPageItems, setAllPageItems] = useState<Parishioner[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [churchUnitOptions, setChurchUnitOptions] = useState<{ label: string; value: string }[]>([]);
  const [addOpen, setAddOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);

  useEffect(() => {
    client.listChurchUnitsPublic()
      .then(r => setChurchUnitOptions((r.data ?? []).map(u => ({ label: u.name, value: String(u.id) }))))
      .catch(() => {});
  }, [client]);

  const load = useCallback((f: FilterState, p: number, manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    client.listParishioners({ limit: PAGE_SIZE, skip: p * PAGE_SIZE, search: f.search || undefined, church_unit_id: f.churchUnit ? Number(f.churchUnit) : undefined })
      .then(r => {
        setAllPageItems((r.data?.items ?? []) as Parishioner[]);
        setTotal(r.data?.total ?? 0);
        if (manual) toast.success('Parishioners refreshed');
      })
      .catch(err => { if (manual) toastApiError(err, 'Failed to refresh'); })
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client]);

  useEffect(() => { load(filters, page); }, [filters, page, load]);

  const handleFiltersChange = (f: FilterState) => { setFilters(f); setPage(0); };

  // Client-side status filter + sort
  let items = [...allPageItems];
  if (filters.status) {
    const wantVerified = filters.status === 'true';
    items = items.filter(p => Boolean(p.is_verified) === wantVerified);
  }
  if (filters.sortBy) {
    items.sort((a, b) => {
      const va = String(a[filters.sortBy] ?? '').toLowerCase();
      const vb = String(b[filters.sortBy] ?? '').toLowerCase();
      const cmp = va.localeCompare(vb);
      return filters.sortDir === 'asc' ? cmp : -cmp;
    });
  }

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const handleSaved = () => { setAddOpen(false); setBulkOpen(false); load(filtersRef.current, 0, true); setPage(0); };

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Parishioners</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length !== total
              ? `${items.length} shown · ${total.toLocaleString()} total`
              : `${total.toLocaleString()} total records`}
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
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5" /> Add Parishioner
          </Button>
        </div>
      </div>

      <FilterBar
        onChange={handleFiltersChange}
        statusOptions={STATUS_OPTIONS}
        churchUnitOptions={churchUnitOptions}
        sortOptions={SORT_OPTIONS}
        searchPlaceholder="Search parishioners…"
      />

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="bg-card border border-border rounded-xl overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-sm text-muted-foreground animate-pulse">Loading parishioners…</div>
          ) : items.length === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">No parishioners found.</div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Name</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Church ID</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Phone</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map(p => (
                  <tr key={p.id} className="hover:bg-muted/20 transition-colors">
                    <td className="px-5 py-3">
                      {(() => {
                        const displayName = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || '—';
                        return (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-violet-50 border border-violet-100 flex items-center justify-center flex-shrink-0">
                              <span className="text-violet-600 text-xs font-bold">{displayName.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium text-foreground">{displayName}</p>
                              <p className="text-[11px] text-muted-foreground sm:hidden">{p.church_id ?? '—'}</p>
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden sm:table-cell">{p.church_id ?? '—'}</td>
                    <td className="px-5 py-3 hidden md:table-cell">
                      {p.is_verified ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                          <CheckCircle className="w-3 h-3" /> Verified
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                          <Clock className="w-3 h-3" /> Pending
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-muted-foreground hidden lg:table-cell text-xs">
                      {(p as Record<string, unknown>).phone_number as string ?? '—'}
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/admin/parishioners/${p.id}`)}>View</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between flex-shrink-0">
          <p className="text-xs text-muted-foreground">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} of {total.toLocaleString()}
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
