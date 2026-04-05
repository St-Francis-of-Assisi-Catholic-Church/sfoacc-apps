import { useEffect, useState, useCallback } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import { useNavigate } from 'react-router-dom';
import { Calendar, Plus, RefreshCw, MapPin, Clock, Globe, Lock, Pencil, Trash2, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { toastApiError } from '../../utils/apiError';
import { Button, Modal } from '../../components/ui';
import type { ChurchEventRead, ChurchEventCreate, EventRecurrence, EventsPagedData } from '@sfoacc/sdk';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChurchUnitOption { id: number; name: string; type: string }

interface EventForm {
  name: string;
  description: string;
  event_date: string;
  start_time: string;
  end_time: string;
  location: string;
  is_public: boolean;
  church_unit_id: string;
  is_recurring: boolean;
  recurrence_frequency: 'daily' | 'weekly' | 'monthly';
  recurrence_day_of_week: string;
  recurrence_end_date: string;
}

const EMPTY_FORM: EventForm = {
  name: '', description: '', event_date: '', start_time: '',
  end_time: '', location: '', is_public: true, church_unit_id: '',
  is_recurring: false, recurrence_frequency: 'weekly',
  recurrence_day_of_week: '', recurrence_end_date: '',
};

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

// ── Event Modal ───────────────────────────────────────────────────────────────

function EventModal({
  open, event, churchUnits, onClose, onSaved,
}: {
  open: boolean;
  event: ChurchEventRead | null;
  churchUnits: ChurchUnitOption[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const client = useSDK();
  const [form, setForm] = useState<EventForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const isEdit = !!event;

  useEffect(() => {
    if (open) {
      setForm(event ? {
        name: event.name,
        description: event.description ?? '',
        event_date: event.event_date,
        start_time: event.start_time ?? '',
        end_time: event.end_time ?? '',
        location: event.location ?? '',
        is_public: event.is_public,
        church_unit_id: String(event.church_unit_id ?? ''),
        is_recurring: event.is_recurring ?? false,
        recurrence_frequency: (event.recurrence_frequency as EventForm['recurrence_frequency']) ?? 'weekly',
        recurrence_day_of_week: event.recurrence_day_of_week != null ? String(event.recurrence_day_of_week) : '',
        recurrence_end_date: event.recurrence_end_date ?? '',
      } : EMPTY_FORM);
    }
  }, [open, event]);

  const set = <K extends keyof EventForm>(k: K, v: EventForm[K]) =>
    setForm(prev => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.event_date) { toast.error('Name and date are required'); return; }
    setSaving(true);

    let recurrence: EventRecurrence | null = null;
    if (form.is_recurring) {
      recurrence = {
        frequency: form.recurrence_frequency,
        day_of_week: form.recurrence_day_of_week !== '' ? Number(form.recurrence_day_of_week) : null,
        recurrence_end_date: form.recurrence_end_date || null,
      };
    }

    const payload: ChurchEventCreate = {
      name: form.name.trim(),
      description: form.description || null,
      event_date: form.event_date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      is_public: form.is_public,
      church_unit_id: form.church_unit_id ? Number(form.church_unit_id) : null,
      recurrence,
    };
    try {
      if (isEdit) {
        await client.updateUnitEvent(event!.church_unit_id, event!.id, payload);
        toast.success('Event updated');
      } else {
        await client.createEvent(payload);
        toast.success('Event created');
      }
      onSaved();
    } catch (err) {
      toastApiError(err, isEdit ? 'Failed to update event' : 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const inputCls = 'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition';
  const unitGroups = [...new Set(churchUnits.map(u => u.type))].sort();

  return (
    <Modal
      open={open} onClose={onClose}
      title={isEdit ? 'Edit Event' : 'New Event'}
      description={isEdit ? 'Update event details' : 'Create a new church event'}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" isLoading={saving} onClick={handleSubmit as unknown as React.MouseEventHandler}>
            {isEdit ? 'Save Changes' : 'Create Event'}
          </Button>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Event Name <span className="text-red-500">*</span></label>
          <input value={form.name} onChange={e => set('name', e.target.value)}
            placeholder="e.g. Parish Feast Day" className={inputCls} />
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Church Unit</label>
          <select value={form.church_unit_id} onChange={e => set('church_unit_id', e.target.value)} className={inputCls}>
            <option value="">— Parish-wide —</option>
            {unitGroups.map(g => (
              <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
                {churchUnits.filter(u => u.type === g).map(u => (
                  <option key={u.id} value={String(u.id)}>{u.name}</option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Date <span className="text-red-500">*</span></label>
            <input type="date" value={form.event_date} onChange={e => set('event_date', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Location</label>
            <input value={form.location} onChange={e => set('location', e.target.value)}
              placeholder="Church hall, main grounds…" className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">Start Time</label>
            <input type="time" value={form.start_time} onChange={e => set('start_time', e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block text-xs font-medium text-foreground mb-1">End Time</label>
            <input type="time" value={form.end_time} onChange={e => set('end_time', e.target.value)} className={inputCls} />
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-foreground mb-1">Description</label>
          <textarea value={form.description} onChange={e => set('description', e.target.value)}
            rows={3} placeholder="Optional details about this event…"
            className={`${inputCls} resize-none`} />
        </div>
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input type="checkbox" checked={form.is_public} onChange={e => set('is_public', e.target.checked)}
            className="w-4 h-4 rounded border-border accent-navy" />
          <div>
            <p className="text-sm font-medium text-foreground">Public event</p>
            <p className="text-xs text-muted-foreground">Visible to all parishioners</p>
          </div>
        </label>

        {/* Recurrence */}
        <div className="border-t border-border pt-4">
          <label className="flex items-center gap-2.5 cursor-pointer select-none mb-3">
            <input type="checkbox" checked={form.is_recurring} onChange={e => set('is_recurring', e.target.checked)}
              className="w-4 h-4 rounded border-border accent-navy" />
            <div>
              <p className="text-sm font-medium text-foreground">Recurring event</p>
              <p className="text-xs text-muted-foreground">Repeats on a schedule</p>
            </div>
          </label>
          {form.is_recurring && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pl-6">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">Frequency</label>
                <select value={form.recurrence_frequency}
                  onChange={e => set('recurrence_frequency', e.target.value as EventForm['recurrence_frequency'])}
                  className={inputCls}>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {form.recurrence_frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-foreground mb-1">Day of Week</label>
                  <select value={form.recurrence_day_of_week}
                    onChange={e => set('recurrence_day_of_week', e.target.value)}
                    className={inputCls}>
                    <option value="">— Any —</option>
                    {DAY_NAMES.map((d, i) => <option key={i} value={String(i)}>{d}</option>)}
                  </select>
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-foreground mb-1">End Date</label>
                <input type="date" value={form.recurrence_end_date}
                  onChange={e => set('recurrence_end_date', e.target.value)}
                  className={inputCls} />
              </div>
            </div>
          )}
        </div>
      </form>
    </Modal>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminEvents() {
  const client = useSDK();
  const navigate = useNavigate();
  const [events, setEvents] = useState<ChurchEventRead[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [churchUnits, setChurchUnits] = useState<ChurchUnitOption[]>([]);
  const [selectedUnit, setSelectedUnit] = useState('');
  const [activeOnly, setActiveOnly] = useState(false);
  const [recurringOnly, setRecurringOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editEvent, setEditEvent] = useState<ChurchEventRead | null>(null);

  useEffect(() => {
    client.listChurchUnitsPublic()
      .then(r => { setChurchUnits((Array.isArray(r.data) ? r.data : []) as ChurchUnitOption[]); })
      .catch(() => {});
  }, [client]);

  const load = useCallback((manual = false) => {
    if (manual) setRefreshing(true); else setLoading(true);
    const params = {
      ...(selectedUnit && { church_unit_id: Number(selectedUnit) }),
      ...(activeOnly && { active_only: true }),
      ...(recurringOnly && { is_recurring: true }),
      ...(dateFrom && { date_from: dateFrom }),
      ...(dateTo && { date_to: dateTo }),
    };
    client.listEvents(params)
      .then(r => {
        const d = r.data as EventsPagedData | null;
        setEvents(d?.events ?? []);
        if (manual) toast.success('Events refreshed');
      })
      .catch(err => toastApiError(err, 'Failed to load'))
      .finally(() => { setLoading(false); setRefreshing(false); });
  }, [client, selectedUnit, activeOnly, recurringOnly, dateFrom, dateTo]);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (ev: ChurchEventRead) => {
    if (!confirm(`Delete "${ev.name}"?`)) return;
    try {
      await client.deleteUnitEvent(ev.church_unit_id, ev.id);
      toast.success('Event deleted');
      load();
    } catch (err) { toastApiError(err, 'Failed to delete event'); }
  };

  const openAdd = () => { setEditEvent(null); setModalOpen(true); };
  const openEdit = (ev: ChurchEventRead) => { setEditEvent(ev); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); load(true); };

  const unitGroups = [...new Set(churchUnits.map(u => u.type))].sort();

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 flex-shrink-0">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Church Events</h1>
          <p className="text-sm text-muted-foreground mt-0.5">{events.length} event{events.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => load(true)} disabled={refreshing} title="Refresh">
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{refreshing ? 'Refreshing…' : 'Refresh'}</span>
          </Button>
          <Button size="sm" onClick={openAdd} title="Add Event">
            <Plus className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Add Event</span>
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        <select
          value={selectedUnit}
          onChange={e => setSelectedUnit(e.target.value)}
          className="text-sm border border-border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-navy/30 transition"
        >
          <option value="">All Units</option>
          {unitGroups.map(g => (
            <optgroup key={g} label={g.charAt(0).toUpperCase() + g.slice(1) + 's'}>
              {churchUnits.filter(u => u.type === g).map(u => (
                <option key={u.id} value={String(u.id)}>{u.name}</option>
              ))}
            </optgroup>
          ))}
        </select>
        <div className="flex items-center gap-1 text-sm text-foreground border border-border rounded-lg px-3 py-2 bg-background">
          <span className="text-xs text-muted-foreground mr-1">From</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            className="text-sm bg-transparent focus:outline-none" />
        </div>
        <div className="flex items-center gap-1 text-sm text-foreground border border-border rounded-lg px-3 py-2 bg-background">
          <span className="text-xs text-muted-foreground mr-1">To</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            className="text-sm bg-transparent focus:outline-none" />
        </div>
        <label className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={activeOnly} onChange={e => setActiveOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-navy" />
          Active only
        </label>
        <label className="flex items-center gap-1.5 text-sm text-foreground cursor-pointer select-none">
          <input type="checkbox" checked={recurringOnly} onChange={e => setRecurringOnly(e.target.checked)}
            className="w-4 h-4 rounded border-border accent-navy" />
          Recurring only
        </label>
      </div>

      {/* Table */}
      <div className="flex-1 min-h-0 bg-card border border-border rounded-xl overflow-hidden flex flex-col">
        {loading ? (
          <div className="p-10 text-center text-sm text-muted-foreground animate-pulse">Loading events…</div>
        ) : events.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No events found.</p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 overflow-y-auto overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/90 backdrop-blur-sm border-b border-border z-10">
                <tr>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Event</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden md:table-cell">Time</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden lg:table-cell">Location</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide hidden sm:table-cell">Visibility</th>
                  <th className="px-5 py-3 w-20" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {events.map(ev => {
                  const dateStr = new Date(ev.event_date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                  const isPast = ev.event_date < new Date().toISOString().slice(0, 10);
                  return (
                    <tr key={ev.id}
                      className="hover:bg-muted/20 transition-colors group cursor-pointer"
                      onClick={() => navigate(`/admin/events/${ev.church_unit_id}/${ev.id}`)}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isPast ? 'bg-muted border border-border' : 'bg-[#e6f7fb] border border-[#9dd8e9]'}`}>
                            <Calendar className={`w-4 h-4 ${isPast ? 'text-muted-foreground' : 'text-[#2d7d96]'}`} />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <p className={`font-medium truncate ${isPast ? 'text-muted-foreground' : 'text-foreground'}`}>{ev.name}</p>
                              {ev.is_recurring && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded-full shrink-0">
                                  <Repeat className="w-2.5 h-2.5" /> Recurring
                                </span>
                              )}
                            </div>
                            {ev.description && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-xs">{ev.description}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-xs hidden sm:table-cell whitespace-nowrap">
                        <span className="text-muted-foreground">{dateStr}</span>
                        {isPast && <span className="ml-1.5 text-[10px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded">Past</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden md:table-cell">
                        {ev.start_time ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            {ev.start_time}{ev.end_time ? ` – ${ev.end_time}` : ''}
                          </span>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden lg:table-cell">
                        {ev.location ? (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span className="truncate max-w-[160px]">{ev.location}</span>
                          </span>
                        ) : <span className="text-muted-foreground/40 text-xs">—</span>}
                      </td>
                      <td className="px-5 py-3.5 hidden sm:table-cell">
                        {ev.is_public ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                            <Globe className="w-3 h-3" /> Public
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                            <Lock className="w-3 h-3" /> Private
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); openEdit(ev); }} title="Edit">
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={e => { e.stopPropagation(); handleDelete(ev); }} title="Delete"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <EventModal
        open={modalOpen}
        event={editEvent}
        churchUnits={churchUnits}
        onClose={() => setModalOpen(false)}
        onSaved={handleSaved}
      />
    </div>
  );
}
