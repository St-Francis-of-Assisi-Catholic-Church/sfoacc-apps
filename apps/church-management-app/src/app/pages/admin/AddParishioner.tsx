import { useEffect, useState, useCallback, ReactNode, KeyboardEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSDK } from '../../contexts/SDKContext';
import { toast } from 'sonner';
import { extractApiError } from '../../utils/apiError';
import {
  ChevronLeft, ChevronRight, Plus, X, Check,
  User, MapPin, Briefcase, Users, Heart, BookMarked, CheckCircle, Loader2,
} from 'lucide-react';
import type { Gender } from '@sfoacc/sdk';
import { PhoneInput } from '../../components/ui';

// ── Schema type (mirrors getRegistrationSchema return) ────────────────────────

type SchemaField = {
  key: string;
  label: string;
  type: string;
  required?: boolean;
  default?: unknown;
  min_length?: number;
  max_length?: number;
  placeholder?: string;
  options?: Array<{ value: unknown; label: string; description?: string; once_only?: boolean; unit_type?: string }>;
  conditional?: { field: string; value: unknown };
  fields?: Array<{ key: string; label: string; type: string; required?: boolean; min_length?: number; max_length?: number }>;
};

type SchemaSection = {
  key: string;
  label: string;
  type: 'fields' | 'object' | 'repeatable_section' | 'tag_input' | 'multiselect';
  description?: string;
  max_items?: number;
  fields?: SchemaField[];
  field?: { key: string; label: string; type: string; required?: boolean };
  options?: Array<{ value: number; label: string }>;
  existing_options?: Array<{ value: number; label: string }>;
  submit_as?: string;
};

type Schema = {
  sections: SchemaSection[];
};

// ── Form state ────────────────────────────────────────────────────────────────

type FormData = {
  // personal_info
  title: string; first_name: string; last_name: string; other_names: string;
  maiden_name: string; baptismal_name: string; gender: string; date_of_birth: string;
  place_of_birth: string; nationality: string; hometown: string; region: string;
  country: string; marital_status: string; photo_url: string; notes: string;
  // contact_info
  mobile_number: string; whatsapp_number: string; email_address: string; current_residence: string;
  // church_placement
  church_unit_id: string; church_community_id: string; old_church_id: string;
  // status
  membership_status: string; is_deceased: boolean; date_of_death: string;
  // occupation
  occupation_enabled: boolean; occupation_role: string; occupation_employer: string;
  // family_info
  family_enabled: boolean;
  spouse_name: string; spouse_status: string; spouse_phone: string;
  father_name: string; father_status: string;
  mother_name: string; mother_status: string;
  children: Array<{ name: string }>;
  // repeatable sections
  emergency_contacts: Array<{ name: string; relationship: string; primary_phone: string; alternative_phone: string }>;
  medical_conditions: Array<{ condition: string; notes: string }>;
  sacraments: Array<{ sacrament_id: string; date_received: string; place: string; minister: string; notes: string }>;
  // skills
  skills: Array<{ name: string }>;
  skill_input: string;
  // languages
  language_ids: number[];
  // societies
  societies: Array<{ society_id: string; date_joined: string }>;
};

const EMPTY_FORM: FormData = {
  title: '', first_name: '', last_name: '', other_names: '',
  maiden_name: '', baptismal_name: '', gender: '', date_of_birth: '',
  place_of_birth: '', nationality: '', hometown: '', region: '',
  country: '', marital_status: 'single', photo_url: '', notes: '',
  mobile_number: '', whatsapp_number: '', email_address: '', current_residence: '',
  church_unit_id: '', church_community_id: '', old_church_id: '',
  membership_status: 'active', is_deceased: false, date_of_death: '',
  occupation_enabled: false, occupation_role: '', occupation_employer: '',
  family_enabled: false,
  spouse_name: '', spouse_status: '', spouse_phone: '',
  father_name: '', father_status: '',
  mother_name: '', mother_status: '',
  children: [],
  emergency_contacts: [],
  medical_conditions: [],
  sacraments: [],
  skills: [],
  skill_input: '',
  language_ids: [],
  societies: [],
};

// ── Steps ─────────────────────────────────────────────────────────────────────

const STEPS = [
  { id: 'personal',   label: 'Personal Info',       icon: User },
  { id: 'contact',    label: 'Contact & Placement',  icon: MapPin },
  { id: 'background', label: 'Background',           icon: Briefcase },
  { id: 'contacts',   label: 'Family & Contacts',    icon: Users },
  { id: 'faith',      label: 'Faith & Health',       icon: Heart },
  { id: 'community',  label: 'Skills & Societies',   icon: BookMarked },
  { id: 'review',     label: 'Review',               icon: CheckCircle },
];

// ── Shared CSS constants ──────────────────────────────────────────────────────

const INPUT_CLS = 'w-full px-3 py-2 text-sm bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 focus:border-navy/40 transition-colors';
const TEXTAREA_CLS = INPUT_CLS + ' resize-none h-20';

// ── Field wrapper component ───────────────────────────────────────────────────

function Field({ label, required, children, hint, error, className = '' }: {
  label: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  error?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs font-medium text-foreground mb-1">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="text-[10px] text-red-500 mt-1">{error}</p>}
      {!error && hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

// ── Section header ────────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <div className="mb-1">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && <p className="text-xs text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="h-px bg-border" />
    </div>
  );
}

// ── Step progress indicator ───────────────────────────────────────────────────

function StepIndicator({ currentStep, onStepClick }: { currentStep: number; onStepClick: (i: number) => void }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const isActive = i === currentStep;
        const isDone = i < currentStep;
        const isFuture = i > currentStep;
        return (
          <div key={step.id} className="flex items-center">
            <button
              onClick={() => isDone && onStepClick(i)}
              disabled={isFuture}
              className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-colors min-w-[72px] ${
                isActive ? 'text-navy' :
                isDone ? 'text-navy/60 hover:text-navy cursor-pointer' :
                'text-muted-foreground/40 cursor-not-allowed'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-colors ${
                isActive ? 'border-navy bg-navy text-white' :
                isDone ? 'border-navy/60 bg-navy/10 text-navy' :
                'border-border bg-background text-muted-foreground/40'
              }`}>
                {isDone ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span className={`text-[10px] font-medium text-center leading-tight whitespace-nowrap ${
                isActive ? 'text-navy' : isDone ? 'text-navy/60' : 'text-muted-foreground/40'
              }`}>{step.label}</span>
            </button>
            {i < STEPS.length - 1 && (
              <div className={`h-px w-6 flex-shrink-0 mx-1 transition-colors ${i < currentStep ? 'bg-navy/40' : 'bg-border'}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Review section card ───────────────────────────────────────────────────────

function ReviewCard({ title, items }: { title: string; items: Array<{ label: string; value: string | number | boolean | null | undefined }> }) {
  const filled = items.filter(i => i.value !== '' && i.value !== null && i.value !== undefined && i.value !== false);
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {filled.length === 0 ? (
        <p className="text-xs text-muted-foreground italic">Not provided</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
          {filled.map((item, i) => (
            <div key={i} className="flex gap-2">
              <span className="text-xs text-muted-foreground shrink-0 min-w-[110px]">{item.label}</span>
              <span className="text-xs text-foreground font-medium">{String(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────────

export default function AddParishioner() {
  const client = useSDK();
  const navigate = useNavigate();

  const [schema, setSchema] = useState<Schema | null>(null);
  const [schemaLoading, setSchemaLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [form, setForm] = useState<FormData>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Map a field key to the step index where it lives
  const FIELD_STEP_MAP: Record<string, number> = {
    title: 0, first_name: 0, last_name: 0, other_names: 0, maiden_name: 0,
    baptismal_name: 0, gender: 0, date_of_birth: 0, place_of_birth: 0,
    nationality: 0, hometown: 0, region: 0, country: 0, marital_status: 0,
    photo_url: 0, notes: 0,
    mobile_number: 1, whatsapp_number: 1, email_address: 1, current_residence: 1,
    church_unit_id: 1, church_community_id: 1, old_church_id: 1,
    membership_status: 2, is_deceased: 2, date_of_death: 2,
    occupation_role: 2, occupation_employer: 2,
    spouse_name: 2, spouse_status: 2, spouse_phone: 2,
    father_name: 2, father_status: 2, mother_name: 2, mother_status: 2,
    emergency_contacts: 3, medical_conditions: 3,
    sacraments: 4,
    skills: 5, language_ids: 5, societies: 5,
  };

  // Fetch schema on mount
  useEffect(() => {
    client.getRegistrationSchema()
      .then(res => setSchema(res.data))
      .catch(() => {
        toast.error('Failed to load registration form. Some options may be unavailable.');
        setSchema({ sections: [] });
      })
      .finally(() => setSchemaLoading(false));
  }, [client]);

  const set = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  }, []);

  const getSection = (key: string): SchemaSection | undefined =>
    schema?.sections.find(s => s.key === key);

  const getFields = (key: string): SchemaField[] =>
    getSection(key)?.fields ?? [];

  // ── Step 0: Personal Info ──────────────────────────────────────────────────

  function renderPersonalStep() {
    const fields = getFields('personal_info');

    // Map form field keys to their values
    const fieldValue = (key: string): string => {
      const k = key as keyof FormData;
      const v = form[k];
      return typeof v === 'string' ? v : '';
    };

    const fullWidthKeys = new Set(['notes', 'photo_url', 'current_residence']);

    return (
      <div>
        <SectionHeader title="Personal Information" description="Basic identity details for this parishioner" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(field => {
            const isFullWidth = fullWidthKeys.has(field.key);
            const val = fieldValue(field.key);
            return (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={fieldErrors[field.key]}
                className={isFullWidth ? 'sm:col-span-2' : ''}
              >
                {field.type === 'select' ? (
                  <select
                    value={val}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    className={INPUT_CLS}
                  >
                    <option value="">Select…</option>
                    {(field.options ?? []).map(opt => (
                      <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={val}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    className={INPUT_CLS}
                  />
                ) : field.type === 'textarea' ? (
                  <textarea
                    value={val}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    placeholder={field.placeholder ?? ''}
                    className={TEXTAREA_CLS}
                  />
                ) : (
                  <input
                    type={field.type === 'email' ? 'email' : field.type === 'url' ? 'url' : 'text'}
                    value={val}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    placeholder={field.placeholder ?? ''}
                    className={INPUT_CLS}
                  />
                )}
              </Field>
            );
          })}

          {/* Fallback if no schema fields — render core fields manually */}
          {fields.length === 0 && (
            <>
              <Field label="Title" error={fieldErrors.title}>
                <input value={form.title} onChange={e => set('title', e.target.value)} placeholder="Mr, Mrs, Dr…" className={INPUT_CLS} />
              </Field>
              <Field label="First Name" required error={fieldErrors.first_name}>
                <input value={form.first_name} onChange={e => set('first_name', e.target.value)} placeholder="First name" className={INPUT_CLS} />
              </Field>
              <Field label="Last Name" required error={fieldErrors.last_name}>
                <input value={form.last_name} onChange={e => set('last_name', e.target.value)} placeholder="Last name" className={INPUT_CLS} />
              </Field>
              <Field label="Other Names">
                <input value={form.other_names} onChange={e => set('other_names', e.target.value)} placeholder="Middle name(s)" className={INPUT_CLS} />
              </Field>
              <Field label="Maiden Name">
                <input value={form.maiden_name} onChange={e => set('maiden_name', e.target.value)} placeholder="For married women" className={INPUT_CLS} />
              </Field>
              <Field label="Baptismal Name">
                <input value={form.baptismal_name} onChange={e => set('baptismal_name', e.target.value)} placeholder="Baptismal / Christian name" className={INPUT_CLS} />
              </Field>
              <Field label="Gender" required>
                <select value={form.gender} onChange={e => set('gender', e.target.value)} className={INPUT_CLS}>
                  <option value="">Select…</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </Field>
              <Field label="Date of Birth">
                <input type="date" value={form.date_of_birth} onChange={e => set('date_of_birth', e.target.value)} className={INPUT_CLS} />
              </Field>
              <Field label="Marital Status">
                <select value={form.marital_status} onChange={e => set('marital_status', e.target.value)} className={INPUT_CLS}>
                  <option value="">Select…</option>
                  <option value="single">Single</option>
                  <option value="married">Married</option>
                  <option value="widowed">Widowed</option>
                  <option value="divorced">Divorced</option>
                  <option value="separated">Separated</option>
                </select>
              </Field>
              <Field label="Nationality">
                <input value={form.nationality} onChange={e => set('nationality', e.target.value)} placeholder="Nationality" className={INPUT_CLS} />
              </Field>
              <Field label="Hometown">
                <input value={form.hometown} onChange={e => set('hometown', e.target.value)} placeholder="Hometown" className={INPUT_CLS} />
              </Field>
              <Field label="Place of Birth">
                <input value={form.place_of_birth} onChange={e => set('place_of_birth', e.target.value)} placeholder="City of birth" className={INPUT_CLS} />
              </Field>
              <Field label="Region">
                <input value={form.region} onChange={e => set('region', e.target.value)} placeholder="Region / State" className={INPUT_CLS} />
              </Field>
              <Field label="Country">
                <input value={form.country} onChange={e => set('country', e.target.value)} placeholder="Country" className={INPUT_CLS} />
              </Field>
              <Field label="Notes" className="sm:col-span-2">
                <textarea value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional notes…" className={TEXTAREA_CLS} />
              </Field>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Step 1: Contact & Placement ────────────────────────────────────────────

  function renderContactStep() {
    const contactFields = getFields('contact_info');
    const placementFields = getFields('church_placement');

    const fieldValue = (key: string): string => {
      const k = key as keyof FormData;
      const v = form[k];
      return typeof v === 'string' ? v : '';
    };

    const fullWidthKeys = new Set(['current_residence', 'email_address']);

    return (
      <div className="space-y-6">
        <div>
          <SectionHeader title="Contact Information" description="How to reach this parishioner" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {contactFields.length > 0 ? contactFields.map(field => (
              <Field
                key={field.key}
                label={field.label}
                required={field.required}
                error={fieldErrors[field.key]}
                className={fullWidthKeys.has(field.key) ? 'sm:col-span-2' : ''}
              >
                {field.type === 'textarea' ? (
                  <textarea
                    value={fieldValue(field.key)}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    placeholder={field.placeholder ?? ''}
                    className={TEXTAREA_CLS}
                  />
                ) : field.type === 'tel' ? (
                  <PhoneInput
                    value={fieldValue(field.key)}
                    onChange={v => set(field.key as keyof FormData, v as FormData[keyof FormData])}
                    placeholder={field.placeholder ?? 'Phone number'}
                  />
                ) : (
                  <input
                    type={field.type === 'email' ? 'email' : 'text'}
                    value={fieldValue(field.key)}
                    onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                    placeholder={field.placeholder ?? ''}
                    className={INPUT_CLS}
                  />
                )}
              </Field>
            )) : (
              <>
                <Field label="Mobile Number" error={fieldErrors.mobile_number}>
                  <PhoneInput value={form.mobile_number} onChange={v => set('mobile_number', v)} />
                </Field>
                <Field label="WhatsApp Number" error={fieldErrors.whatsapp_number}>
                  <PhoneInput value={form.whatsapp_number} onChange={v => set('whatsapp_number', v)} />
                </Field>
                <Field label="Email Address" className="sm:col-span-2" error={fieldErrors.email_address}>
                  <input type="email" value={form.email_address} onChange={e => set('email_address', e.target.value)} placeholder="john.doe@email.com" className={INPUT_CLS} />
                </Field>
                <Field label="Current Residence" className="sm:col-span-2" error={fieldErrors.current_residence}>
                  <input value={form.current_residence} onChange={e => set('current_residence', e.target.value)} placeholder="Current home address" className={INPUT_CLS} />
                </Field>
              </>
            )}
          </div>
        </div>

        <div>
          <SectionHeader title="Church Placement" description="Assign this parishioner to a church unit and community" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {placementFields.length > 0 ? placementFields.map(field => {
              const val = fieldValue(field.key);
              return (
                <Field key={field.key} label={field.label} required={field.required}>
                  {field.options && field.options.length > 0 ? (
                    <select
                      value={val}
                      onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                      className={INPUT_CLS}
                    >
                      <option value="">Select…</option>
                      {field.options.map(opt => (
                        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={val}
                      onChange={e => set(field.key as keyof FormData, e.target.value as FormData[keyof FormData])}
                      placeholder={field.placeholder ?? ''}
                      className={INPUT_CLS}
                    />
                  )}
                </Field>
              );
            }) : (
              <>
                <Field label="Church Unit">
                  <input value={form.church_unit_id} onChange={e => set('church_unit_id', e.target.value)} placeholder="Church unit ID" className={INPUT_CLS} />
                </Field>
                <Field label="Church Community">
                  <input value={form.church_community_id} onChange={e => set('church_community_id', e.target.value)} placeholder="Community ID" className={INPUT_CLS} />
                </Field>
                <Field label="Old Church ID">
                  <input value={form.old_church_id} onChange={e => set('old_church_id', e.target.value)} placeholder="Previous church membership ID" className={INPUT_CLS} />
                </Field>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 2: Background ─────────────────────────────────────────────────────

  function renderBackgroundStep() {
    const statusSection = getSection('status');
    const statusFields = statusSection?.fields ?? [];

    const membershipField = statusFields.find(f => f.key === 'membership_status');
    const isDeceasedField = statusFields.find(f => f.key === 'is_deceased');
    const dateOfDeathField = statusFields.find(f => f.key === 'date_of_death');

    return (
      <div className="space-y-6">
        {/* Membership & Status */}
        <div>
          <SectionHeader title="Membership & Status" description={statusSection?.description} />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field label={membershipField?.label ?? 'Membership Status'}>
              <select value={form.membership_status} onChange={e => set('membership_status', e.target.value)} className={INPUT_CLS}>
                <option value="">Select…</option>
                {(membershipField?.options ?? [
                  { value: 'active', label: 'Active' },
                  { value: 'deceased', label: 'Deceased' },
                  { value: 'disabled', label: 'Disabled' },
                ]).map(opt => (
                  <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                ))}
              </select>
            </Field>
            <div className="flex flex-col gap-2">
              <label className="block text-xs font-medium text-foreground">{isDeceasedField?.label ?? 'Is Deceased'}</label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.is_deceased}
                  onChange={e => set('is_deceased', e.target.checked)}
                  className="w-4 h-4 rounded border-border accent-navy"
                />
                <span className="text-sm text-foreground">Mark as deceased</span>
              </label>
            </div>
            {form.is_deceased && (
              <Field label={dateOfDeathField?.label ?? 'Date of Death'} className="sm:col-span-2">
                <input type="date" value={form.date_of_death} onChange={e => set('date_of_death', e.target.value)} className={INPUT_CLS} />
              </Field>
            )}
          </div>
        </div>

        {/* Occupation */}
        <div>
          <SectionHeader title="Occupation" description="Employment details (optional)" />
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.occupation_enabled}
                onChange={e => set('occupation_enabled', e.target.checked)}
                className="w-4 h-4 rounded border-border accent-navy"
              />
              <span className="text-sm text-foreground font-medium">Add occupation details</span>
            </label>
          </div>
          {form.occupation_enabled && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Role / Job Title" required>
                <input value={form.occupation_role} onChange={e => set('occupation_role', e.target.value)} placeholder="e.g. Teacher, Engineer" className={INPUT_CLS} />
              </Field>
              <Field label="Employer / Organisation" required>
                <input value={form.occupation_employer} onChange={e => set('occupation_employer', e.target.value)} placeholder="e.g. Ghana Education Service" className={INPUT_CLS} />
              </Field>
            </div>
          )}
        </div>

        {/* Family Info */}
        <div>
          <SectionHeader title="Family Information" description="Spouse, parents, and children (optional)" />
          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={form.family_enabled}
                onChange={e => set('family_enabled', e.target.checked)}
                className="w-4 h-4 rounded border-border accent-navy"
              />
              <span className="text-sm text-foreground font-medium">Add family information</span>
            </label>
          </div>
          {form.family_enabled && (
            <div className="space-y-5">
              {/* Spouse */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Spouse</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field label="Spouse Name">
                    <input value={form.spouse_name} onChange={e => set('spouse_name', e.target.value)} placeholder="Full name" className={INPUT_CLS} />
                  </Field>
                  <Field label="Spouse Status">
                    <select value={form.spouse_status} onChange={e => set('spouse_status', e.target.value)} className={INPUT_CLS}>
                      <option value="">Select…</option>
                      <option value="alive">Alive</option>
                      <option value="deceased">Deceased</option>
                      <option value="separated">Separated</option>
                    </select>
                  </Field>
                  <Field label="Spouse Phone" error={fieldErrors.spouse_phone}>
                    <PhoneInput value={form.spouse_phone} onChange={v => set('spouse_phone', v)} />
                  </Field>
                </div>
              </div>
              {/* Parents */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Parents</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Father's Name">
                    <input value={form.father_name} onChange={e => set('father_name', e.target.value)} placeholder="Full name" className={INPUT_CLS} />
                  </Field>
                  <Field label="Father's Status">
                    <select value={form.father_status} onChange={e => set('father_status', e.target.value)} className={INPUT_CLS}>
                      <option value="">Select…</option>
                      <option value="alive">Alive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </Field>
                  <Field label="Mother's Name">
                    <input value={form.mother_name} onChange={e => set('mother_name', e.target.value)} placeholder="Full name" className={INPUT_CLS} />
                  </Field>
                  <Field label="Mother's Status">
                    <select value={form.mother_status} onChange={e => set('mother_status', e.target.value)} className={INPUT_CLS}>
                      <option value="">Select…</option>
                      <option value="alive">Alive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </Field>
                </div>
              </div>
              {/* Children */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">Children</p>
                <div className="space-y-2">
                  {form.children.map((child, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <input
                        value={child.name}
                        onChange={e => {
                          const updated = [...form.children];
                          updated[i] = { name: e.target.value };
                          set('children', updated);
                        }}
                        placeholder={`Child ${i + 1} name`}
                        className={INPUT_CLS}
                      />
                      <button
                        onClick={() => set('children', form.children.filter((_, j) => j !== i))}
                        className="p-1.5 text-muted-foreground hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => set('children', [...form.children, { name: '' }])}
                    className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/80 font-medium mt-1 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Child
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Step 3: Family & Contacts ──────────────────────────────────────────────

  function renderContactsStep() {
    const ecSection = getSection('emergency_contacts');
    const mcSection = getSection('medical_conditions');
    const ecMax = ecSection?.max_items ?? 3;
    const mcMax = mcSection?.max_items ?? 5;

    return (
      <div className="space-y-6">
        {/* Emergency Contacts */}
        <div>
          <SectionHeader
            title={ecSection?.label ?? 'Emergency Contacts'}
            description={ecSection?.description ?? `Add up to ${ecMax} emergency contacts`}
          />
          <div className="space-y-4">
            {form.emergency_contacts.map((ec, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border relative">
                <button
                  onClick={() => set('emergency_contacts', form.emergency_contacts.filter((_, j) => j !== i))}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs font-medium text-muted-foreground mb-3">Contact {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Name" required>
                    <input
                      value={ec.name}
                      onChange={e => {
                        const updated = [...form.emergency_contacts];
                        updated[i] = { ...updated[i], name: e.target.value };
                        set('emergency_contacts', updated);
                      }}
                      placeholder="Full name"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Relationship" required>
                    <input
                      value={ec.relationship}
                      onChange={e => {
                        const updated = [...form.emergency_contacts];
                        updated[i] = { ...updated[i], relationship: e.target.value };
                        set('emergency_contacts', updated);
                      }}
                      placeholder="e.g. Spouse, Sibling"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Primary Phone" required>
                    <PhoneInput
                      value={ec.primary_phone}
                      onChange={v => {
                        const updated = [...form.emergency_contacts];
                        updated[i] = { ...updated[i], primary_phone: v };
                        set('emergency_contacts', updated);
                      }}
                    />
                  </Field>
                  <Field label="Alternative Phone">
                    <PhoneInput
                      value={ec.alternative_phone}
                      onChange={v => {
                        const updated = [...form.emergency_contacts];
                        updated[i] = { ...updated[i], alternative_phone: v };
                        set('emergency_contacts', updated);
                      }}
                    />
                  </Field>
                </div>
              </div>
            ))}
            {form.emergency_contacts.length < ecMax && (
              <button
                onClick={() => set('emergency_contacts', [...form.emergency_contacts, { name: '', relationship: '', primary_phone: '', alternative_phone: '' }])}
                className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Emergency Contact
              </button>
            )}
            {form.emergency_contacts.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No emergency contacts added yet.</p>
            )}
          </div>
        </div>

        {/* Medical Conditions */}
        <div>
          <SectionHeader
            title={mcSection?.label ?? 'Medical Conditions'}
            description={mcSection?.description ?? `Add up to ${mcMax} medical conditions`}
          />
          <div className="space-y-4">
            {form.medical_conditions.map((mc, i) => (
              <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border relative">
                <button
                  onClick={() => set('medical_conditions', form.medical_conditions.filter((_, j) => j !== i))}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs font-medium text-muted-foreground mb-3">Condition {i + 1}</p>
                <div className="grid grid-cols-1 gap-3">
                  <Field label="Condition" required>
                    <input
                      value={mc.condition}
                      onChange={e => {
                        const updated = [...form.medical_conditions];
                        updated[i] = { ...updated[i], condition: e.target.value };
                        set('medical_conditions', updated);
                      }}
                      placeholder="e.g. Diabetes, Hypertension"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Notes">
                    <textarea
                      value={mc.notes}
                      onChange={e => {
                        const updated = [...form.medical_conditions];
                        updated[i] = { ...updated[i], notes: e.target.value };
                        set('medical_conditions', updated);
                      }}
                      placeholder="Additional details…"
                      className={TEXTAREA_CLS}
                    />
                  </Field>
                </div>
              </div>
            ))}
            {form.medical_conditions.length < mcMax && (
              <button
                onClick={() => set('medical_conditions', [...form.medical_conditions, { condition: '', notes: '' }])}
                className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/80 font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Medical Condition
              </button>
            )}
            {form.medical_conditions.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No medical conditions added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 4: Faith & Health ─────────────────────────────────────────────────

  function renderFaithStep() {
    const sacSection = getSection('sacraments');
    // Sacrament options from schema
    const sacFields = sacSection?.fields ?? [];
    const sacIdField = sacFields.find(f => f.key === 'sacrament_id');
    const sacOptions = sacIdField?.options ?? [];

    return (
      <div>
        <SectionHeader
          title={sacSection?.label ?? 'Sacraments'}
          description={sacSection?.description ?? 'Record sacraments received by this parishioner'}
        />
        <div className="space-y-4">
          {form.sacraments.map((sac, i) => {
            const selectedOpt = sacOptions.find(o => String(o.value) === sac.sacrament_id);
            return (
              <div key={i} className="p-4 bg-muted/30 rounded-xl border border-border relative">
                <button
                  onClick={() => set('sacraments', form.sacraments.filter((_, j) => j !== i))}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-xs font-medium text-muted-foreground mb-3">Sacrament {i + 1}</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field
                    label="Sacrament"
                    required
                    hint={selectedOpt && (selectedOpt as { once_only?: boolean }).once_only ? 'This sacrament can only be received once' : undefined}
                  >
                    <select
                      value={sac.sacrament_id}
                      onChange={e => {
                        const updated = [...form.sacraments];
                        updated[i] = { ...updated[i], sacrament_id: e.target.value };
                        set('sacraments', updated);
                      }}
                      className={INPUT_CLS}
                    >
                      <option value="">Select sacrament…</option>
                      {sacOptions.map(opt => (
                        <option key={String(opt.value)} value={String(opt.value)}>
                          {opt.label}{(opt as { once_only?: boolean }).once_only ? ' (once only)' : ''}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Date Received">
                    <input
                      type="date"
                      value={sac.date_received}
                      onChange={e => {
                        const updated = [...form.sacraments];
                        updated[i] = { ...updated[i], date_received: e.target.value };
                        set('sacraments', updated);
                      }}
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Place">
                    <input
                      value={sac.place}
                      onChange={e => {
                        const updated = [...form.sacraments];
                        updated[i] = { ...updated[i], place: e.target.value };
                        set('sacraments', updated);
                      }}
                      placeholder="Where it was received"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Minister">
                    <input
                      value={sac.minister}
                      onChange={e => {
                        const updated = [...form.sacraments];
                        updated[i] = { ...updated[i], minister: e.target.value };
                        set('sacraments', updated);
                      }}
                      placeholder="Officiating minister"
                      className={INPUT_CLS}
                    />
                  </Field>
                  <Field label="Notes" className="sm:col-span-2">
                    <textarea
                      value={sac.notes}
                      onChange={e => {
                        const updated = [...form.sacraments];
                        updated[i] = { ...updated[i], notes: e.target.value };
                        set('sacraments', updated);
                      }}
                      placeholder="Additional notes…"
                      className={TEXTAREA_CLS}
                    />
                  </Field>
                </div>
              </div>
            );
          })}
          <button
            onClick={() => set('sacraments', [...form.sacraments, { sacrament_id: '', date_received: '', place: '', minister: '', notes: '' }])}
            className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/80 font-medium transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Add Sacrament
          </button>
          {form.sacraments.length === 0 && (
            <p className="text-xs text-muted-foreground italic">No sacraments added yet.</p>
          )}
        </div>
      </div>
    );
  }

  // ── Step 5: Skills & Societies ─────────────────────────────────────────────

  function renderCommunityStep() {
    const langSection = getSection('languages');
    const skillsSection = getSection('skills');
    const societiesSection = getSection('societies');

    const langOptions = langSection?.options ?? [];
    const skillExistingOptions = skillsSection?.existing_options ?? [];
    const societyFields = societiesSection?.fields ?? [];
    const societyIdField = societyFields.find(f => f.key === 'society_id');
    const societyOptions = societyIdField?.options ?? [];

    // Filtered skill suggestions
    const filteredSuggestions = form.skill_input.trim().length > 0
      ? skillExistingOptions.filter(o =>
          o.label.toLowerCase().includes(form.skill_input.toLowerCase()) &&
          !form.skills.some(s => s.name.toLowerCase() === o.label.toLowerCase())
        ).slice(0, 8)
      : [];

    const addSkill = (name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return;
      if (form.skills.some(s => s.name.toLowerCase() === trimmed.toLowerCase())) {
        toast.error('Skill already added');
        return;
      }
      set('skills', [...form.skills, { name: trimmed }]);
      set('skill_input', '');
    };

    const handleSkillKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addSkill(form.skill_input);
      }
    };

    return (
      <div className="space-y-6">
        {/* Languages */}
        <div>
          <SectionHeader
            title={langSection?.label ?? 'Languages'}
            description="Select all languages this parishioner speaks"
          />
          {langOptions.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {langOptions.map(opt => {
                const selected = form.language_ids.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    onClick={() => {
                      if (selected) {
                        set('language_ids', form.language_ids.filter(id => id !== opt.value));
                      } else {
                        set('language_ids', [...form.language_ids, opt.value]);
                      }
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                      selected
                        ? 'bg-navy text-white border-navy'
                        : 'bg-background text-foreground border-border hover:border-navy/40 hover:bg-navy/5'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 inline mr-1" />}
                    {opt.label}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground italic">No languages available in schema.</p>
          )}
        </div>

        {/* Skills */}
        <div>
          <SectionHeader
            title={skillsSection?.label ?? 'Skills'}
            description="Add skills this parishioner has"
          />
          <div className="space-y-3">
            <div className="relative">
              <div className="flex gap-2">
                <input
                  value={form.skill_input}
                  onChange={e => {
                    set('skill_input', e.target.value);
                  }}
                  onKeyDown={handleSkillKeyDown}
                  placeholder="Type a skill and press Enter…"
                  className={INPUT_CLS}
                />
                <button
                  onClick={() => addSkill(form.skill_input)}
                  className="px-3 py-2 bg-navy text-white text-xs font-medium rounded-lg hover:bg-navy/90 transition-colors flex-shrink-0"
                >
                  Add
                </button>
              </div>
              {filteredSuggestions.length > 0 && form.skill_input.trim().length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-popover border border-border rounded-lg shadow-lg z-10 overflow-hidden">
                  {filteredSuggestions.map(s => (
                    <button
                      key={s.value}
                      onClick={() => addSkill(s.label)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            {form.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {form.skills.map((skill, i) => (
                  <span key={i} className="inline-flex items-center gap-1 px-2.5 py-1 bg-navy/10 text-navy text-xs font-medium rounded-full">
                    {skill.name}
                    <button onClick={() => set('skills', form.skills.filter((_, j) => j !== i))} className="hover:text-red-500 transition-colors">
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
            {form.skills.length === 0 && <p className="text-xs text-muted-foreground italic">No skills added yet.</p>}
          </div>
        </div>

        {/* Societies */}
        <div>
          <SectionHeader
            title={societiesSection?.label ?? 'Society Memberships'}
            description="Add this parishioner to church societies"
          />
          <div className="space-y-4">
            {form.societies.map((soc, i) => (
              <div key={i} className="flex items-end gap-3 p-3 bg-muted/30 rounded-xl border border-border relative">
                <button
                  onClick={() => set('societies', form.societies.filter((_, j) => j !== i))}
                  className="absolute top-3 right-3 p-1 text-muted-foreground hover:text-red-500 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <Field label="Society" required className="flex-1">
                  {societyOptions.length > 0 ? (
                    <select
                      value={soc.society_id}
                      onChange={e => {
                        const updated = [...form.societies];
                        updated[i] = { ...updated[i], society_id: e.target.value };
                        set('societies', updated);
                      }}
                      className={INPUT_CLS}
                    >
                      <option value="">Select society…</option>
                      {societyOptions.map(opt => (
                        <option key={String(opt.value)} value={String(opt.value)}>{opt.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      value={soc.society_id}
                      onChange={e => {
                        const updated = [...form.societies];
                        updated[i] = { ...updated[i], society_id: e.target.value };
                        set('societies', updated);
                      }}
                      placeholder="Society ID"
                      className={INPUT_CLS}
                    />
                  )}
                </Field>
                <Field label="Date Joined" className="w-40">
                  <input
                    type="date"
                    value={soc.date_joined}
                    onChange={e => {
                      const updated = [...form.societies];
                      updated[i] = { ...updated[i], date_joined: e.target.value };
                      set('societies', updated);
                    }}
                    className={INPUT_CLS}
                  />
                </Field>
              </div>
            ))}
            <button
              onClick={() => set('societies', [...form.societies, { society_id: '', date_joined: '' }])}
              className="flex items-center gap-1.5 text-xs text-navy hover:text-navy/80 font-medium transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Add Society
            </button>
            {form.societies.length === 0 && (
              <p className="text-xs text-muted-foreground italic">No societies added yet.</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Step 6: Review ─────────────────────────────────────────────────────────

  function renderReviewStep() {
    const langSection = getSection('languages');
    const langOptions = langSection?.options ?? [];
    const selectedLangNames = form.language_ids
      .map(id => langOptions.find(o => o.value === id)?.label ?? String(id))
      .join(', ');

    const sacSection = getSection('sacraments');
    const sacFields = sacSection?.fields ?? [];
    const sacIdField = sacFields.find(f => f.key === 'sacrament_id');
    const sacOptions = sacIdField?.options ?? [];

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
          Please review all information before creating the parishioner record. You can go back to any step to make changes.
        </div>

        <ReviewCard title="Personal Information" items={[
          { label: 'Title', value: form.title },
          { label: 'First Name', value: form.first_name },
          { label: 'Last Name', value: form.last_name },
          { label: 'Other Names', value: form.other_names },
          { label: 'Maiden Name', value: form.maiden_name },
          { label: 'Baptismal Name', value: form.baptismal_name },
          { label: 'Gender', value: form.gender },
          { label: 'Date of Birth', value: form.date_of_birth },
          { label: 'Place of Birth', value: form.place_of_birth },
          { label: 'Nationality', value: form.nationality },
          { label: 'Hometown', value: form.hometown },
          { label: 'Region', value: form.region },
          { label: 'Country', value: form.country },
          { label: 'Marital Status', value: form.marital_status },
          { label: 'Photo URL', value: form.photo_url },
          { label: 'Notes', value: form.notes },
        ]} />

        <ReviewCard title="Contact & Placement" items={[
          { label: 'Mobile', value: form.mobile_number },
          { label: 'WhatsApp', value: form.whatsapp_number },
          { label: 'Email', value: form.email_address },
          { label: 'Residence', value: form.current_residence },
          { label: 'Church Unit', value: form.church_unit_id },
          { label: 'Community', value: form.church_community_id },
          { label: 'Old Church ID', value: form.old_church_id },
        ]} />

        <ReviewCard title="Membership & Status" items={[
          { label: 'Membership', value: form.membership_status },
          { label: 'Deceased', value: form.is_deceased ? 'Yes' : null },
          { label: 'Date of Death', value: form.is_deceased ? form.date_of_death : null },
        ]} />

        {form.occupation_enabled && (
          <ReviewCard title="Occupation" items={[
            { label: 'Role', value: form.occupation_role },
            { label: 'Employer', value: form.occupation_employer },
          ]} />
        )}

        {form.family_enabled && (
          <ReviewCard title="Family Information" items={[
            { label: 'Spouse Name', value: form.spouse_name },
            { label: 'Spouse Status', value: form.spouse_status },
            { label: 'Spouse Phone', value: form.spouse_phone },
            { label: 'Father', value: form.father_name },
            { label: 'Father Status', value: form.father_status },
            { label: 'Mother', value: form.mother_name },
            { label: 'Mother Status', value: form.mother_status },
            { label: 'Children', value: form.children.length > 0 ? form.children.map(c => c.name).join(', ') : null },
          ]} />
        )}

        {form.emergency_contacts.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Emergency Contacts</h3>
            <div className="space-y-2">
              {form.emergency_contacts.map((ec, i) => (
                <div key={i} className="text-xs text-foreground">
                  <span className="font-medium">{ec.name}</span>
                  <span className="text-muted-foreground"> · {ec.relationship} · {ec.primary_phone}</span>
                  {ec.alternative_phone && <span className="text-muted-foreground"> / {ec.alternative_phone}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {form.medical_conditions.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Medical Conditions</h3>
            <div className="space-y-2">
              {form.medical_conditions.map((mc, i) => (
                <div key={i} className="text-xs text-foreground">
                  <span className="font-medium">{mc.condition}</span>
                  {mc.notes && <span className="text-muted-foreground"> — {mc.notes}</span>}
                </div>
              ))}
            </div>
          </div>
        )}

        {form.sacraments.length > 0 && (
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-semibold text-foreground mb-3">Sacraments</h3>
            <div className="space-y-2">
              {form.sacraments.map((sac, i) => {
                const name = sacOptions.find(o => String(o.value) === sac.sacrament_id)?.label ?? sac.sacrament_id;
                return (
                  <div key={i} className="text-xs text-foreground">
                    <span className="font-medium">{name}</span>
                    {sac.date_received && <span className="text-muted-foreground"> · {sac.date_received}</span>}
                    {sac.place && <span className="text-muted-foreground"> · {sac.place}</span>}
                    {sac.minister && <span className="text-muted-foreground"> · {sac.minister}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {(form.language_ids.length > 0 || form.skills.length > 0 || form.societies.length > 0) && (
          <ReviewCard title="Skills & Community" items={[
            { label: 'Languages', value: selectedLangNames || null },
            { label: 'Skills', value: form.skills.length > 0 ? form.skills.map(s => s.name).join(', ') : null },
            { label: 'Societies', value: form.societies.length > 0 ? form.societies.filter(s => s.society_id).length + ' selected' : null },
          ]} />
        )}
      </div>
    );
  }

  // ── Submission ─────────────────────────────────────────────────────────────

  async function handleSubmit() {
    if (!form.first_name.trim() || !form.last_name.trim() || !form.gender) {
      toast.error('First name, last name, and gender are required');
      setCurrentStep(0);
      return;
    }

    setSubmitting(true);
    try {
      // 1. Create core parishioner
      const corePayload: Parameters<typeof client.createParishioner>[0] = {
        first_name: form.first_name.trim(),
        last_name: form.last_name.trim(),
        gender: form.gender as Gender,
        ...(form.other_names && { other_names: form.other_names }),
        ...(form.maiden_name && { maiden_name: form.maiden_name }),
        ...(form.date_of_birth && { date_of_birth: form.date_of_birth }),
        ...(form.place_of_birth && { place_of_birth: form.place_of_birth }),
        ...(form.hometown && { hometown: form.hometown }),
        ...(form.region && { region: form.region }),
        ...(form.country && { country: form.country }),
        ...(form.marital_status && { marital_status: form.marital_status as Parameters<typeof client.createParishioner>[0]['marital_status'] }),
        ...(form.mobile_number && { mobile_number: form.mobile_number }),
        ...(form.whatsapp_number && { whatsapp_number: form.whatsapp_number }),
        ...(form.email_address && { email_address: form.email_address }),
        ...(form.current_residence && { current_residence: form.current_residence }),
        ...(form.membership_status && { membership_status: form.membership_status as Parameters<typeof client.createParishioner>[0]['membership_status'] }),
        ...(form.old_church_id && { old_church_id: form.old_church_id }),
      };

      setFieldErrors({});
      const core = await client.createParishioner(corePayload);
      const id = core.data!.id;

      // 2. Run all sub-resource creates in parallel
      const subs: Promise<unknown>[] = [];

      if (form.occupation_enabled && form.occupation_role && form.occupation_employer) {
        subs.push(client.createParishionerOccupation(id, { role: form.occupation_role, employer: form.occupation_employer }));
      }

      const hasFamily = form.family_enabled && (form.spouse_name || form.father_name || form.mother_name || form.children.length > 0);
      if (hasFamily) {
        subs.push(client.updateParishionerFamily(id, {
          spouse_name: form.spouse_name || null,
          spouse_status: form.spouse_status || null,
          spouse_phone: form.spouse_phone || null,
          father_name: form.father_name || null,
          father_status: form.father_status || null,
          mother_name: form.mother_name || null,
          mother_status: form.mother_status || null,
          children: form.children.length > 0 ? form.children : null,
        }));
      }

      if (form.emergency_contacts.length > 0) {
        subs.push(client.batchAddParishionerEmergencyContacts(id, form.emergency_contacts.map(c => ({
          ...c,
          alternative_phone: c.alternative_phone || null,
        }))));
      }

      if (form.medical_conditions.length > 0) {
        subs.push(client.batchAddParishionerMedicalConditions(id, form.medical_conditions.map(c => ({
          ...c,
          notes: c.notes || null,
        }))));
      }

      if (form.sacraments.length > 0) {
        subs.push(client.batchAddParishionerSacraments(id, form.sacraments.map(s => ({
          sacrament_id: Number(s.sacrament_id),
          date_received: s.date_received || null,
          place: s.place || null,
          minister: s.minister || null,
          notes: s.notes || null,
        }))));
      }

      if (form.skills.length > 0) {
        subs.push(client.batchAddParishionerSkills(id, form.skills));
      }

      if (form.language_ids.length > 0) {
        subs.push(client.assignParishionerLanguages(id, form.language_ids));
      }

      for (const s of form.societies) {
        if (s.society_id) {
          subs.push(client.addSocietyMembers(Number(s.society_id), [{ parishioner_id: id, date_joined: s.date_joined || undefined }]));
        }
      }

      await Promise.allSettled(subs);

      toast.success('Parishioner created successfully');
      navigate(`/admin/parishioners/${id}`);
    } catch (err) {
      // Try to extract field-level validation errors
      const body =
        (err as Record<string, unknown>)?.data ??
        ((err as Record<string, unknown>)?.response as Record<string, unknown> | undefined)?.data ??
        err;
      const b = body as Record<string, unknown>;
      if (Array.isArray(b?.errors) && b.errors.length > 0) {
        const errors: Record<string, string> = {};
        let firstFieldStep: number | null = null;
        for (const e of b.errors as Array<Record<string, unknown>>) {
          const loc = Array.isArray(e.loc) ? e.loc.filter((s: unknown) => s !== 'body' && s !== 'query') : [];
          const fieldKey = loc.length > 0 ? String(loc[loc.length - 1]) : null;
          if (fieldKey) {
            errors[fieldKey] = String(e.msg ?? 'Invalid value');
            const stepIdx = FIELD_STEP_MAP[fieldKey] ?? null;
            if (stepIdx !== null && (firstFieldStep === null || stepIdx < firstFieldStep)) {
              firstFieldStep = stepIdx;
            }
          }
        }
        setFieldErrors(errors);
        if (firstFieldStep !== null) setCurrentStep(firstFieldStep);
        toast.error('Please fix the highlighted fields and try again.');
      } else {
        toast.error(extractApiError(err, 'Failed to create parishioner'));
      }
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render step content ────────────────────────────────────────────────────

  function renderStepContent() {
    if (schemaLoading) {
      return (
        <div className="flex items-center justify-center py-16 gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading registration form…</span>
        </div>
      );
    }
    switch (currentStep) {
      case 0: return renderPersonalStep();
      case 1: return renderContactStep();
      case 2: return renderBackgroundStep();
      case 3: return renderContactsStep();
      case 4: return renderFaithStep();
      case 5: return renderCommunityStep();
      case 6: return renderReviewStep();
      default: return null;
    }
  }

  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      {/* Back link */}
      <button
        onClick={() => navigate('/admin/parishioners')}
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ChevronLeft className="w-4 h-4" />
        Back to Parishioners
      </button>

      {/* Page header */}
      <div>
        <h1 className="font-display text-xl font-bold text-foreground">Add New Parishioner</h1>
        <p className="text-sm text-muted-foreground mt-0.5">Complete the form below to register a new parishioner in the system</p>
      </div>

      {/* Step indicator */}
      <div className="bg-card border border-border rounded-xl p-4">
        <StepIndicator currentStep={currentStep} onStepClick={setCurrentStep} />
      </div>

      {/* Step content */}
      <div className="bg-card border border-border rounded-xl p-6">
        <div className="mb-5 flex items-center gap-2">
          {(() => {
            const StepIcon = STEPS[currentStep].icon;
            return (
              <>
                <div className="w-8 h-8 rounded-full bg-navy/10 text-navy flex items-center justify-center">
                  <StepIcon className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-foreground">{STEPS[currentStep].label}</h2>
                  <p className="text-xs text-muted-foreground">Step {currentStep + 1} of {STEPS.length}</p>
                </div>
              </>
            );
          })()}
        </div>

        {renderStepContent()}
      </div>

      {/* Navigation buttons */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCurrentStep(s => s - 1)}
          disabled={isFirstStep}
          className="flex items-center gap-1.5 px-4 py-2 border border-border text-sm font-medium rounded-lg hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-foreground"
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        {isLastStep ? (
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex items-center gap-2 px-5 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Create Parishioner
              </>
            )}
          </button>
        ) : (
          <button
            onClick={() => setCurrentStep(s => s + 1)}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white text-sm font-medium rounded-lg hover:bg-navy/90 transition-colors"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
