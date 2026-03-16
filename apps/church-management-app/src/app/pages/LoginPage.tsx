import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, ChevronDown } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSDK } from '../contexts/SDKContext';
import type { User } from '@sfoacc/sdk';
import { Button } from '../components/ui';

// ── Validation helpers ────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Must start with 233 followed by exactly 9 digits (12 total)
const PHONE_RE = /^233\d{9}$/;

type IdentifierType = 'email' | 'phone' | 'invalid' | 'empty';

function detectType(val: string): IdentifierType {
  const v = val.replace(/\s/g, '');
  if (!v) return 'empty';
  if (EMAIL_RE.test(v)) return 'email';
  if (PHONE_RE.test(v)) return 'phone';
  return 'invalid';
}

// ── Password reset ────────────────────────────────────────────────────────────

function PasswordResetForm({ email, onSuccess }: { email: string; onSuccess: (token: string, user: User) => void }) {
  const client = useSDK();
  const [tempPassword, setTempPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);

  const inputCls = 'w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground text-sm';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirm) { toast.error('Passwords do not match'); return; }
    setLoading(true);
    try {
      const res = await client.resetPassword({ email, temp_password: tempPassword, new_password: newPassword });
      const data = res.data as { access_token: string; user: User } | null;
      if (data?.access_token) {
        toast.success('Password updated. Welcome!');
        onSuccess(data.access_token, data.user);
      }
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-5">
        <div className="flex items-center gap-2 bg-yellow-50 border border-yellow-200 rounded-lg px-3 py-2 mb-4">
          <AlertCircle className="w-4 h-4 text-yellow-600 flex-shrink-0" />
          <p className="text-xs text-yellow-800">Account requires a password reset before signing in.</p>
        </div>
        <h2 className="font-display text-xl font-semibold text-foreground">Set New Password</h2>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {[
          { label: 'Temporary Password', value: tempPassword, set: setTempPassword, placeholder: 'Temporary password' },
          { label: 'New Password', value: newPassword, set: setNewPassword, placeholder: 'New password' },
          { label: 'Confirm Password', value: confirm, set: setConfirm, placeholder: 'Confirm password' },
        ].map(({ label, value, set, placeholder }) => (
          <div key={label}>
            <label className="block text-xs font-medium text-foreground mb-1.5">{label}</label>
            <input type="password" value={value} onChange={e => set(e.target.value)}
              className={inputCls} placeholder={placeholder} required minLength={8} />
          </div>
        ))}
        <Button type="submit" isLoading={loading} className="w-full justify-center mt-1">Set Password</Button>
      </form>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

type Step = 'identifier' | 'otp';
type Group = { name: string; label: string };
type ChurchUnit = { id: number; name: string; type: string };

// ── Main login page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login } = useAuth();
  const client = useSDK();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('identifier');
  const [identifier, setIdentifier] = useState('');
  const [selectedRole, setSelectedRole] = useState('');
  const [selectedUnit, setSelectedUnit] = useState<number | ''>('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [units, setUnits] = useState<ChurchUnit[]>([]);
  const [configLoading, setConfigLoading] = useState(true);
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [needsReset, setNeedsReset] = useState(false);

  const trimmed = identifier.trim();
  const identifierType = detectType(trimmed);
  const isValid = identifierType === 'email' || identifierType === 'phone';
  const showHint = identifier.length > 0;

  useEffect(() => {
    client.getLoginConfig()
      .then(res => {
        const cfg = res.data;
        // Filter super_admin — that's the admin portal
        const filteredGroups = (cfg.groups ?? []).filter(g => g.name !== 'super_admin');
        setGroups(filteredGroups);
        setUnits(cfg.church_units ?? []);
        // Auto-select parish (St Francis by default)
        const parish = (cfg.church_units ?? []).find(u => u.type === 'parish');
        if (parish) setSelectedUnit(parish.id);
        // Auto-select if only one role
        if (filteredGroups.length === 1) setSelectedRole(filteredGroups[0].name);
      })
      .catch(() => {})
      .finally(() => setConfigLoading(false));
  }, [client]);

  const handleSuccess = (token: string, user: User) => {
    login(token, user);
    toast.success(`Welcome back, ${user.full_name}!`);
    navigate('/dashboard');
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) { toast.error('Enter a valid email or phone (e.g. 233543460633)'); return; }
    if (!selectedRole) { toast.error('Please select your role'); return; }
    setLoading(true);
    try {
      await client.requestOtp(trimmed);
      toast.success('OTP sent — check your email or SMS.');
      setStep('otp');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await client.verifyOtp(trimmed, otpCode);
      if (res.user.status === 'reset_required') {
        setResetEmail(trimmed); setNeedsReset(true); return;
      }
      handleSuccess(res.access_token, res.user);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  if (needsReset) return <PasswordResetForm email={resetEmail} onSuccess={handleSuccess} />;

  const inputCls = 'w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground text-sm';
  const selectCls = `${inputCls} appearance-none pr-10 cursor-pointer disabled:opacity-60`;
  const selectedRoleLabel = groups.find(r => r.name === selectedRole)?.label;
  const selectedUnitName = units.find(u => u.id === selectedUnit)?.name;

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">Welcome Back</h2>
        <p className="text-muted-foreground text-sm mt-1">Sign in to the parish management portal</p>
      </div>

      {step === 'identifier' && (
        <form onSubmit={handleSendOtp} className="space-y-4">

          {/* Church unit */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Church Unit</label>
            <div className="relative">
              <select value={selectedUnit} onChange={e => setSelectedUnit(Number(e.target.value))}
                disabled={configLoading} className={selectCls}>
                <option value="">{configLoading ? 'Loading…' : 'Select church unit'}</option>
                {units.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Role */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Sign in as</label>
            <div className="relative">
              <select value={selectedRole} onChange={e => setSelectedRole(e.target.value)}
                required disabled={configLoading} className={selectCls}>
                <option value="">{configLoading ? 'Loading…' : 'Select your role'}</option>
                {groups.map(r => <option key={r.name} value={r.name}>{r.label}</option>)}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>

          {/* Identifier */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Email or Phone Number</label>
            <div className="relative">
              <input
                type="text"
                value={identifier}
                onChange={e => setIdentifier(e.target.value)}
                className={[
                  inputCls, 'pr-10',
                  showHint && isValid ? 'border-green-400 focus:ring-green-300/50' : '',
                  showHint && identifierType === 'invalid' ? 'border-red-400 focus:ring-red-300/50' : '',
                ].filter(Boolean).join(' ')}
                placeholder="email@example.com  or  233543460633"
                autoComplete="username"
                required
              />
              {showHint && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2">
                  {isValid
                    ? <CheckCircle className="w-4 h-4 text-green-500" />
                    : <AlertCircle className="w-4 h-4 text-red-400" />}
                </span>
              )}
            </div>
            {showHint && identifierType === 'phone' && (
              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Phone detected · OTP sent via SMS
              </p>
            )}
            {showHint && identifierType === 'email' && (
              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Email detected · OTP sent to inbox
              </p>
            )}
            {showHint && identifierType === 'invalid' && (
              <p className="mt-1.5 text-[11px] text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3 flex-shrink-0" />
                Phone must start with 233 followed by 9 digits (e.g. 233543460633)
              </p>
            )}
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={!isValid || !selectedRole || configLoading}
            className="w-full justify-center !mt-5"
          >
            Continue
          </Button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3 space-y-0.5">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Signing in to</p>
            <p className="text-sm font-semibold text-foreground">{trimmed}</p>
            <div className="flex flex-wrap gap-2 mt-1.5">
              {selectedUnitName && (
                <span className="inline-flex items-center text-[11px] font-medium bg-navy/10 text-navy px-2 py-0.5 rounded-full">
                  {selectedUnitName}
                </span>
              )}
              {selectedRoleLabel && (
                <span className="inline-flex items-center text-[11px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                  {selectedRoleLabel}
                </span>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">Enter OTP Code</label>
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={8}
              value={otpCode}
              onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
              className={`${inputCls} tracking-[0.35em] text-center text-xl font-mono`}
              placeholder="· · · · · ·"
              required
              autoComplete="one-time-code"
              autoFocus
            />
            <p className="mt-1.5 text-[11px] text-muted-foreground text-center">
              Check your email inbox or SMS
            </p>
          </div>

          <Button
            type="submit"
            isLoading={loading}
            disabled={otpCode.length < 4}
            className="w-full justify-center !mt-5"
          >
            Verify & Sign In
          </Button>
          <button
            type="button"
            onClick={() => { setStep('identifier'); setOtpCode(''); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change identifier or resend
          </button>
        </form>
      )}
    </div>
  );
}
