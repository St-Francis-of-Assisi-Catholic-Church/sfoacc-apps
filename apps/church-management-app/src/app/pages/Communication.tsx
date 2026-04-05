import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSDK } from '../contexts/SDKContext';
import { useAuth } from '../contexts/AuthContext';
import type { Parishioner, ParishionerFilters, MessageTemplate } from '@sfoacc/sdk';
import {
  MessageSquare, Mail, Phone, Send, Users, RefreshCw,
  ChevronDown, ChevronUp, Search, Filter, X, Settings,
  Plus, Pencil, Trash2, CheckCircle2, AlertCircle,
} from 'lucide-react';
import { Button, Badge } from '../components/ui';
import { toast } from 'sonner';
import { toastApiError } from '../utils/apiError';

type Channel = 'email' | 'sms' | 'both';

const DAYS_OF_WEEK = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

type Community = { id: number; name: string };
type Society   = { id: number; name: string };

function fullName(p: Parishioner) {
  return [p.first_name, p.other_names, p.last_name].filter(Boolean).join(' ');
}

function getDayOfWeek(dob?: string | null): number | null {
  if (!dob) return null;
  const d = new Date(dob);
  return isNaN(d.getTime()) ? null : d.getDay();
}

function hasEventVars(content: string | null) {
  return !!(content && (content.includes('{event_name}') || content.includes('{event_date}') || content.includes('{event_time}')));
}

// ── Template management modal ──────────────────────────────────────────────

interface TemplateMgmtModalProps {
  templates: MessageTemplate[];
  accentClass: string;
  onClose: () => void;
  onSave: (id: string | null, data: { name: string; content: string; description: string }) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

function TemplateMgmtModal({ templates, accentClass, onClose, onSave, onDelete }: TemplateMgmtModalProps) {
  const [editing, setEditing] = useState<MessageTemplate | 'new' | null>(null);
  const [form, setForm] = useState({ name: '', content: '', description: '' });
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const openEdit = (t: MessageTemplate) => {
    setForm({ name: t.name, content: t.content ?? '', description: t.description ?? '' });
    setEditing(t);
  };

  const openNew = () => {
    setForm({ name: '', content: '', description: '' });
    setEditing('new');
  };

  const handleSave = async () => {
    if (!form.name.trim() || !form.content.trim()) {
      toast.error('Name and content are required.');
      return;
    }
    setSaving(true);
    try {
      await onSave(editing === 'new' ? null : (editing as MessageTemplate).id, form);
      setEditing(null);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try { await onDelete(id); } finally { setDeleting(null); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">Manage Templates</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {editing ? (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {editing === 'new' ? 'New Template' : `Edit: ${(editing as MessageTemplate).name}`}
            </h3>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Name</p>
              <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="Template name"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Description</p>
              <input value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Brief description (optional)"
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-1">Content</p>
              <textarea value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))}
                placeholder="Message content. Use {parishioner_name}, {church_name}, {event_name}, {event_date}, {event_time}…"
                rows={6}
                className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
              />
              <p className="text-[11px] text-muted-foreground mt-1">
                Variables: {'{parishioner_name}'} · {'{church_name}'} · {'{church_contact}'} · {'{event_name}'} · {'{event_date}'} · {'{event_time}'}
              </p>
            </div>
            <div className="flex gap-2 pt-1">
              <Button onClick={handleSave} isLoading={saving} className="flex-1">
                <CheckCircle2 className="w-4 h-4" />
                Save Template
              </Button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-2 text-sm border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto divide-y divide-border">
              {templates.map(t => (
                <div key={t.id} className="flex items-start gap-3 px-5 py-3.5">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground">{t.name}</p>
                      {t.is_system && (
                        <span className="text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">system</span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    {t.content && (
                      <p className="text-xs text-foreground/60 mt-1 line-clamp-2 font-mono bg-muted/40 rounded px-2 py-1">{t.content}</p>
                    )}
                  </div>
                  {!t.is_system && (
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button onClick={() => openEdit(t)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors">
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors">
                        {deleting === t.id
                          ? <span className="inline-block animate-spin h-3.5 w-3.5 border border-red-500 border-t-transparent rounded-full" />
                          : <Trash2 className="w-3.5 h-3.5" />
                        }
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="px-5 py-3 border-t border-border">
              <button onClick={openNew} title="New Template"
                className={`flex items-center gap-2 text-sm font-medium ${accentClass} transition-colors`}>
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">New Template</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function Communication() {
  const client = useSDK();
  const { selectedUnit } = useAuth();

  // ── Templates ──
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState(true);
  const [templateMgmtOpen, setTemplateMgmtOpen] = useState(false);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('custom_message');

  // ── Compose state ──
  const [channel, setChannel] = useState<Channel>('both');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [eventName, setEventName] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [sending, setSending] = useState(false);

  // ── Recipients ──
  const [allRecipients, setAllRecipients] = useState<Parishioner[]>([]);
  const [loadingRecipients, setLoadingRecipients] = useState(true);

  // ── Filter state ──
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filterCommunity, setFilterCommunity] = useState('');
  const [filterSociety, setFilterSociety] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [filterMarital, setFilterMarital] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterDayOfBirth, setFilterDayOfBirth] = useState('');

  const [communities, setCommunities] = useState<Community[]>([]);
  const [societies, setSocieties] = useState<Society[]>([]);
  const [societyMemberIds, setSocietyMemberIds] = useState<Set<string> | null>(null);
  const [loadingSocietyMembers, setLoadingSocietyMembers] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Load templates
  const loadTemplates = useCallback(() => {
    setLoadingTemplates(true);
    client.listMessageTemplates()
      .then(r => setTemplates(r.data?.templates ?? []))
      .catch(() => { /* empty */ })
      .finally(() => setLoadingTemplates(false));
  }, [client]);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  // Load communities & societies
  useEffect(() => {
    client.listCommunities({ limit: 100, church_unit_id: selectedUnit?.id })
      .then(r => setCommunities((r.data?.items ?? []) as Community[]))
      .catch(() => { /* empty */ });
    client.listSocieties({ limit: 100, church_unit_id: selectedUnit?.id })
      .then(r => setSocieties((r.data?.items ?? []) as Society[]))
      .catch(() => { /* empty */ });
  }, [client, selectedUnit?.id]);

  // Load society members when filter changes
  useEffect(() => {
    if (!filterSociety) { setSocietyMemberIds(null); return; }
    setLoadingSocietyMembers(true);
    client.getSocietyMembers(Number(filterSociety))
      .then(r => {
        const raw = r.data as { id: string }[] | { items?: { id: string }[] } | null;
        const members = Array.isArray(raw) ? raw : (raw as { items?: { id: string }[] })?.items ?? [];
        setSocietyMemberIds(new Set(members.map(m => m.id)));
      })
      .catch(() => setSocietyMemberIds(null))
      .finally(() => setLoadingSocietyMembers(false));
  }, [filterSociety, client]);

  const loadRecipients = useCallback(async () => {
    setLoadingRecipients(true);
    const PAGE_SIZE = 200;
    const baseFilters: ParishionerFilters = {
      limit: PAGE_SIZE,
      church_unit_id: selectedUnit?.id,
      church_community_id: filterCommunity ? Number(filterCommunity) : undefined,
      gender: filterGender as ParishionerFilters['gender'] || undefined,
      marital_status: filterMarital as ParishionerFilters['marital_status'] || undefined,
      membership_status: filterStatus as ParishionerFilters['membership_status'] || undefined,
    };
    try {
      const first = await client.listParishioners({ ...baseFilters, skip: 0 });
      const data = first.data;
      if (!data) { setAllRecipients([]); return; }
      const all = [...data.items];
      const pages = Math.ceil(data.total / PAGE_SIZE);
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) =>
            client.listParishioners({ ...baseFilters, skip: (i + 1) * PAGE_SIZE })
          )
        );
        for (const r of rest) all.push(...(r.data?.items ?? []));
      }
      setAllRecipients(all);
    } catch {
      setAllRecipients([]);
    } finally {
      setLoadingRecipients(false);
    }
  }, [client, selectedUnit?.id, filterCommunity, filterGender, filterMarital, filterStatus]);

  useEffect(() => { loadRecipients(); }, [loadRecipients]);

  const filteredRecipients = useMemo(() => {
    let list = allRecipients;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(r => fullName(r).toLowerCase().includes(q));
    }
    if (societyMemberIds !== null) list = list.filter(r => societyMemberIds.has(r.id));
    if (filterDayOfBirth !== '') {
      const dow = Number(filterDayOfBirth);
      list = list.filter(r => getDayOfWeek(r.date_of_birth) === dow);
    }
    return list;
  }, [allRecipients, search, societyMemberIds, filterDayOfBirth]);

  useEffect(() => {
    setSelectedIds(new Set(filteredRecipients.map(r => r.id)));
  }, [filteredRecipients]);

  const activeFilterCount = [filterCommunity, filterSociety, filterGender, filterMarital, filterStatus, filterDayOfBirth].filter(Boolean).length;

  const clearFilters = () => {
    setFilterCommunity(''); setFilterSociety(''); setFilterGender('');
    setFilterMarital(''); setFilterStatus(''); setFilterDayOfBirth('');
    setSearch('');
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredRecipients.length && filteredRecipients.length > 0) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredRecipients.map(r => r.id)));
    }
  };

  const toggleRecipient = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  };

  const selectedTemplate = templates.find(t => t.id === selectedTemplateId);
  const isCustom = selectedTemplateId === 'custom_message' || !selectedTemplate || selectedTemplate.id === 'custom_message';
  const needsEventVars = !isCustom && hasEventVars(selectedTemplate?.content ?? null);

  const applyTemplate = (t: MessageTemplate) => {
    setSelectedTemplateId(t.id);
    if (t.id === 'custom_message') { setMessage(''); }
    setTemplatePickerOpen(false);
  };

  const handleSend = async () => {
    if (isCustom && !message.trim()) { toast.error('Please enter a message.'); return; }
    if (selectedIds.size === 0) { toast.error('Please select at least one recipient.'); return; }
    setSending(true);
    try {
      await client.sendBulkMessage({
        parishioner_ids: Array.from(selectedIds),
        channel,
        subject: subject.trim() || undefined,
        ...(isCustom
          ? { custom_message: message.trim() }
          : {
              template: selectedTemplateId,
              event_name: eventName.trim() || undefined,
              event_date: eventDate || undefined,
              event_time: eventTime || undefined,
            }
        ),
      });
      toast.success(`Message sent to ${selectedIds.size} recipient${selectedIds.size !== 1 ? 's' : ''}`);
      setMessage(''); setSubject(''); setEventName(''); setEventDate(''); setEventTime('');
    } catch (err) {
      toastApiError(err, 'Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleTemplateSave = async (id: string | null, data: { name: string; content: string; description: string }) => {
    try {
      if (id) {
        await client.updateMessageTemplate(id, data);
        toast.success('Template updated');
      } else {
        await client.createMessageTemplate(data);
        toast.success('Template created');
      }
      loadTemplates();
    } catch (err) { toastApiError(err, 'Failed to save template'); throw err; }
  };

  const handleTemplateDelete = async (id: string) => {
    try {
      await client.deleteMessageTemplate(id);
      toast.success('Template deleted');
      if (selectedTemplateId === id) setSelectedTemplateId('custom_message');
      loadTemplates();
    } catch (err) { toastApiError(err, 'Failed to delete template'); throw err; }
  };

  const channelIcon = (c: Channel) => c === 'email' ? Mail : c === 'sms' ? Phone : MessageSquare;
  const allSelected = filteredRecipients.length > 0 && selectedIds.size === filteredRecipients.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-display font-bold text-foreground">Communication</h1>
          <p className="text-sm text-muted-foreground mt-1">Send messages to parishioners via email, SMS, or both</p>
        </div>
        <button onClick={() => setTemplateMgmtOpen(true)}
          className="flex items-center gap-2 text-xs font-medium px-3 py-2 border border-border rounded-lg text-foreground hover:bg-muted transition-colors">
          <Settings className="w-3.5 h-3.5" />
          Manage Templates
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

        {/* ── Compose ── */}
        <div className="lg:col-span-3 space-y-4">
          <div className="bg-card border border-border rounded-xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-foreground">Compose Message</h2>

            {/* Channel */}
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Channel</p>
              <div className="flex gap-2">
                {(['both', 'email', 'sms'] as Channel[]).map(c => {
                  const Icon = channelIcon(c);
                  return (
                    <button key={c} onClick={() => setChannel(c)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                        channel === c ? 'bg-olive text-white border-olive' : 'bg-background border-border text-foreground hover:bg-muted'
                      }`}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {c === 'both' ? 'Both' : c === 'email' ? 'Email' : 'SMS'}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Template picker */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Template</p>
              </div>
              <button onClick={() => setTemplatePickerOpen(o => !o)}
                className="w-full flex items-center justify-between px-3 py-2.5 bg-background border border-input rounded-lg text-sm hover:bg-muted transition-colors"
              >
                <span className="font-medium text-foreground">
                  {loadingTemplates ? 'Loading templates…' : (selectedTemplate?.name ?? 'Custom Message')}
                </span>
                {templatePickerOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {templatePickerOpen && (
                <div className="mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                  {templates.map(t => (
                    <button key={t.id} onClick={() => applyTemplate(t)}
                      className={`w-full text-left px-4 py-3 text-sm hover:bg-muted transition-colors border-b border-border last:border-0 ${
                        selectedTemplateId === t.id ? 'bg-olive/5' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-foreground flex-1">{t.name}</p>
                        {selectedTemplateId === t.id && <CheckCircle2 className="w-3.5 h-3.5 text-olive flex-shrink-0" />}
                      </div>
                      {t.description && <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* System template preview */}
            {!isCustom && selectedTemplate?.content && (
              <div className="bg-muted/40 border border-border rounded-lg p-3">
                <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">Template Preview</p>
                <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap">{selectedTemplate.content}</p>
                {selectedTemplate.is_system && (
                  <p className="text-[10px] text-muted-foreground mt-2 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> System template — variables filled automatically by server
                  </p>
                )}
              </div>
            )}

            {/* Event fields (when template uses event variables) */}
            {needsEventVars && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Event Name</p>
                  <input value={eventName} onChange={e => setEventName(e.target.value)}
                    placeholder="e.g. Parish Bazaar"
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Event Date</p>
                  <input type="date" value={eventDate} onChange={e => setEventDate(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Event Time</p>
                  <input type="time" value={eventTime} onChange={e => setEventTime(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            )}

            {/* Subject */}
            {(channel === 'email' || channel === 'both') && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Subject</p>
                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                  placeholder="Email subject line…"
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            )}

            {/* Message body (custom only) */}
            {isCustom && (
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">Message</p>
                <textarea value={message} onChange={e => setMessage(e.target.value)}
                  placeholder="Type your message here…" rows={6}
                  className="w-full px-3 py-2 bg-background border border-input rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-y"
                />
                <p className="text-[11px] text-muted-foreground mt-1">{message.length} characters · Variables: {'{parishioner_name}'} · {'{church_name}'}</p>
              </div>
            )}

            <Button onClick={handleSend} isLoading={sending}
              disabled={(isCustom && !message.trim()) || selectedIds.size === 0}
              title={`Send to ${selectedIds.size} recipient${selectedIds.size !== 1 ? 's' : ''}`}>
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Send to {selectedIds.size} recipient{selectedIds.size !== 1 ? 's' : ''}</span>
            </Button>
          </div>
        </div>

        {/* ── Recipients ── */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden self-start flex flex-col">

          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/20">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-foreground">Recipients</h2>
              <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                {selectedIds.size}/{filteredRecipients.length}
                {filteredRecipients.length !== allRecipients.length && ` of ${allRecipients.length}`}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {activeFilterCount > 0 && (
                <button onClick={clearFilters}
                  className="text-[10px] font-medium text-olive hover:text-olive-light flex items-center gap-1">
                  <X className="w-3 h-3" /> Clear
                </button>
              )}
              <button onClick={() => setFiltersOpen(o => !o)}
                className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-lg transition-colors ${
                  filtersOpen || activeFilterCount > 0 ? 'bg-olive/10 text-olive' : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                <Filter className="w-3 h-3" />
                Filter
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 bg-olive text-white rounded-full text-[9px] flex items-center justify-center font-bold">
                    {activeFilterCount}
                  </span>
                )}
              </button>
              <button onClick={loadRecipients} className="text-muted-foreground hover:text-foreground transition-colors p-1">
                <RefreshCw className={`w-3.5 h-3.5 ${loadingRecipients ? 'animate-spin' : ''}`} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2.5 border-b border-border">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search by name…"
                className="w-full pl-8 pr-3 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {search && (
                <button onClick={() => setSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Filters panel */}
          {filtersOpen && (
            <div className="px-3 py-3 border-b border-border bg-muted/20 space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Community</p>
                  <select value={filterCommunity} onChange={e => setFilterCommunity(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    {communities.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Society</p>
                  <select value={filterSociety} onChange={e => setFilterSociety(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    {societies.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Gender</p>
                  <select value={filterGender} onChange={e => setFilterGender(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Marital Status</p>
                  <select value={filterMarital} onChange={e => setFilterMarital(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="widowed">Widowed</option>
                    <option value="divorced">Divorced</option>
                    <option value="separated">Separated</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Member Status</p>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">All</option>
                    <option value="active">Active</option>
                    <option value="deceased">Deceased</option>
                    <option value="disabled">Disabled</option>
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Birthday (Day)</p>
                  <select value={filterDayOfBirth} onChange={e => setFilterDayOfBirth(e.target.value)}
                    className="w-full px-2 py-1.5 bg-background border border-input rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">Any day</option>
                    {DAYS_OF_WEEK.map((d, i) => <option key={i} value={i}>{d}</option>)}
                  </select>
                </div>
              </div>
              {loadingSocietyMembers && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <span className="inline-block animate-spin h-2.5 w-2.5 border border-olive border-t-transparent rounded-full" />
                  Loading society members…
                </p>
              )}
            </div>
          )}

          {/* Select all row */}
          <div className="px-4 py-2.5 border-b border-border">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="rounded border-border" />
              <span className="text-xs font-medium text-foreground">
                {allSelected ? 'Deselect all' : `Select all ${filteredRecipients.length}`}
              </span>
            </label>
          </div>

          {/* Recipient list */}
          <div className="h-[420px] overflow-y-auto divide-y divide-border">
            {loadingRecipients ? (
              <div className="p-6 text-center">
                <div className="inline-block animate-spin h-4 w-4 border-2 border-olive border-t-transparent rounded-full" />
              </div>
            ) : filteredRecipients.length === 0 ? (
              <div className="p-6 text-center text-sm text-muted-foreground">
                {activeFilterCount > 0 || search ? 'No parishioners match these filters.' : 'No parishioners found.'}
              </div>
            ) : (
              filteredRecipients.map(r => (
                <label key={r.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/30 cursor-pointer transition-colors">
                  <input type="checkbox" checked={selectedIds.has(r.id)}
                    onChange={() => toggleRecipient(r.id)} className="rounded border-border flex-shrink-0" />
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <div className="w-6 h-6 rounded-full bg-olive/10 border border-olive/20 flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] font-semibold text-olive">{r.first_name?.charAt(0) ?? '?'}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-foreground truncate">{fullName(r)}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {r.email_address && <Badge variant="default" className="text-[9px] px-1 py-0">email</Badge>}
                        {r.mobile_number && <Badge variant="secondary" className="text-[9px] px-1 py-0">sms</Badge>}
                        {r.date_of_birth && (
                          <span className="text-[9px] text-muted-foreground">
                            {DAYS_OF_WEEK[getDayOfWeek(r.date_of_birth) ?? 0]}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </label>
              ))
            )}
          </div>
        </div>
      </div>

      {templateMgmtOpen && (
        <TemplateMgmtModal
          templates={templates}
          accentClass="text-olive hover:text-olive-light"
          onClose={() => setTemplateMgmtOpen(false)}
          onSave={handleTemplateSave}
          onDelete={handleTemplateDelete}
        />
      )}
    </div>
  );
}
