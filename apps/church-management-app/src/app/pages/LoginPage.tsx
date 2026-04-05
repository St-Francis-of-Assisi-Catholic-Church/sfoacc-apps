import { useState, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, KeyRound, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAdminAuth } from '../contexts/AdminAuthContext';
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
type LoginMethod = 'otp' | 'password';

// ── Main login page ───────────────────────────────────────────────────────────

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const { login: adminLogin, isAuthenticated: isAdminAuthenticated } = useAdminAuth();
  const client = useSDK();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAdminAuthenticated) navigate('/admin/dashboard', { replace: true });
    else if (isAuthenticated) navigate('/dashboard', { replace: true });
  }, [isAuthenticated, isAdminAuthenticated, navigate]);

  const [step, setStep] = useState<Step>('identifier');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');
  const [hasOtp, setHasOtp] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resetEmail, setResetEmail] = useState('');
  const [needsReset, setNeedsReset] = useState(false);

  const trimmed = identifier.trim();
  const identifierType = detectType(trimmed);
  const isValid = identifierType === 'email' || identifierType === 'phone';
  const showHint = identifier.length > 0;

  useEffect(() => {
    client.getLoginConfig()
      .then(res => {
        const m = res.data.login_methods ?? {};
        const otp = m.otp_email || m.otp_sms;
        setHasOtp(!!otp);
        setHasPassword(!!m.password);
        setLoginMethod(otp ? 'otp' : 'password');
      })
      .catch(() => {});
  }, [client]);

  const handleSuccess = (res: { access_token: string; user: User; routing?: string; accessible_units?: import('@sfoacc/sdk').ChurchUnitSummary[]; default_unit?: import('@sfoacc/sdk').ChurchUnitSummary | null }) => {
    const { access_token: token, user, routing, accessible_units = [], default_unit } = res;

    if (routing === 'super_admin') {
      adminLogin(token, user);
      toast.success(`Welcome, ${user.full_name}.`);
      navigate('/admin/dashboard');
      return;
    }

    if (routing === 'no_access') {
      setError('Your account has no access to any church unit. Contact an administrator.');
      return;
    }

    if (routing === 'unit_dashboard') {
      login(token, user, accessible_units, default_unit ?? null);
      toast.success(`Welcome back, ${user.full_name}!`);
      navigate('/dashboard');
      return;
    }

    if (routing === 'unit_selection') {
      login(token, user, accessible_units, null);
      navigate('/select-unit');
      return;
    }

    // Fallback — treat as single-unit login
    login(token, user, accessible_units, default_unit ?? null);
    toast.success(`Welcome back, ${user.full_name}!`);
    navigate('/dashboard');
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) { setError('Enter a valid email or phone (e.g. 233543460633)'); return; }
    setError('');
    setLoading(true);
    try {
      await client.requestOtp(trimmed);
      toast.success('OTP sent — check your email or SMS.');
      setStep('otp');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await client.verifyOtp(trimmed, otpCode);
      if (res.user.status === 'reset_required') {
        setResetEmail(trimmed); setNeedsReset(true); return;
      }
      handleSuccess(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || !password) return;
    setError('');
    setLoading(true);
    try {
      const res = await client.login(trimmed, password);
      if (res.user.status === 'reset_required') {
        setResetEmail(trimmed); setNeedsReset(true); return;
      }
      handleSuccess(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  if (needsReset) return (
    <PasswordResetForm
      email={resetEmail}
      onSuccess={(token, user) => {
        login(token, user, [], null);
        toast.success('Password updated. Welcome!');
        navigate('/dashboard');
      }}
    />
  );

  const inputCls = 'w-full px-4 py-2.5 bg-background border border-input rounded-lg focus:outline-none focus:ring-2 focus:ring-ring transition-all text-foreground placeholder:text-muted-foreground text-sm';

  return (
    <div>
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">Welcome Back</h2>
        <p className="text-muted-foreground text-sm mt-1">Sign in to the parish management portal</p>
      </div>

      {step === 'identifier' && (
        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Login method toggle — shown when both are enabled */}
          {hasOtp && hasPassword && (
            <div className="flex gap-1 bg-muted rounded-lg p-1">
              <button
                type="button"
                onClick={() => { setLoginMethod('otp'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'otp' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                OTP
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('password'); setError(''); }}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'password' ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Password
              </button>
            </div>
          )}

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
            {showHint && identifierType === 'phone' && loginMethod === 'otp' && (
              <p className="mt-1.5 text-[11px] text-muted-foreground flex items-center gap-1">
                <CheckCircle className="w-3 h-3 text-green-500 flex-shrink-0" /> Phone detected · OTP sent via SMS
              </p>
            )}
            {showHint && identifierType === 'email' && loginMethod === 'otp' && (
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

          {/* Password field */}
          {loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground mb-1.5">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className={inputCls}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                />
              </div>
              <Button
                type="submit"
                isLoading={loading}
                disabled={!isValid || !password}
                className="w-full justify-center !mt-5"
              >
                Sign In
              </Button>
            </form>
          )}

          {/* OTP send button */}
          {loginMethod === 'otp' && (
            <form onSubmit={handleSendOtp}>
              <Button
                type="submit"
                isLoading={loading}
                disabled={!isValid}
                className="w-full justify-center !mt-5"
              >
                Continue
              </Button>
            </form>
          )}
        </div>
      )}

      {step === 'otp' && (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2.5">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          <div className="bg-muted/50 border border-border rounded-xl px-4 py-3">
            <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Signing in to</p>
            <p className="text-sm font-semibold text-foreground mt-0.5">{trimmed}</p>
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
            onClick={() => { setStep('identifier'); setOtpCode(''); setError(''); }}
            className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Change identifier or resend
          </button>
        </form>
      )}
    </div>
  );
}
