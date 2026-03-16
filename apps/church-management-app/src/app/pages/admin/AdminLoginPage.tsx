import { useState, useMemo, useEffect, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { CheckCircle, AlertCircle, ShieldCheck, KeyRound, MessageSquare } from 'lucide-react';
import { SFOACCClient } from '@sfoacc/sdk';
import { useAppConfig } from '../../contexts/AppConfigContext';
import type { User } from '@sfoacc/sdk';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import { Button } from '../../components/ui';

// ── Validation ────────────────────────────────────────────────────────────────

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^233\d{9}$/;

type IdentifierType = 'email' | 'phone' | 'invalid' | 'empty';

function detectType(val: string): IdentifierType {
  const v = val.replace(/\s/g, '');
  if (!v) return 'empty';
  if (EMAIL_RE.test(v)) return 'email';
  if (PHONE_RE.test(v)) return 'phone';
  return 'invalid';
}

type Step = 'identifier' | 'otp';
type LoginMethod = 'otp' | 'password';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export default function AdminLoginPage() {
  const { login: adminLogin } = useAdminAuth();
  const { config } = useAppConfig();
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();

  const client = useMemo(() => new SFOACCClient({ baseUrl: API_BASE_URL }), []);

  const [step, setStep] = useState<Step>('identifier');
  const [loginMethod, setLoginMethod] = useState<LoginMethod>('otp');
  const [hasOtp, setHasOtp] = useState(true);
  const [hasPassword, setHasPassword] = useState(false);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [loading, setLoading] = useState(false);

  const trimmed = identifier.trim();
  const idType = detectType(trimmed);
  const isValid = idType === 'email' || idType === 'phone';
  const showHint = identifier.length > 0;

  useEffect(() => {
    client.getLoginConfig()
      .then(res => {
        const m = res.data.login_methods;
        const otp = m.otp_email || m.otp_sms;
        setHasOtp(otp);
        setHasPassword(m.password);
        setLoginMethod(otp ? 'otp' : 'password');
      })
      .catch(() => { /* empty */ });
  }, [client]);

  const handleSuccess = (token: string, user: User) => {
    adminLogin(token, user);
    toast.success(`Welcome, ${user.full_name}.`);
    navigate('/admin/dashboard');
  };

  const handleSendOtp = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid) { toast.error('Enter a valid email or phone (e.g. 233543460633)'); return; }
    setLoading(true);
    try {
      await client.requestOtp(trimmed);
      toast.success('OTP sent.');
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
      handleSuccess(res.access_token, res.user);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: FormEvent) => {
    e.preventDefault();
    if (!isValid || !password) return;
    setLoading(true);
    try {
      const res = await client.login(trimmed, password);
      handleSuccess(res.access_token, res.user);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Invalid credentials');
    } finally {
      setLoading(false);
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-muted/50 transition-all text-white placeholder:text-white/30 text-sm';

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e1b4b] to-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">

      {/* Background dot texture */}
      <div className="absolute inset-0 pointer-events-none opacity-40" style={{
        backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(148,163,184,0.06) 1px, transparent 0)',
        backgroundSize: '28px 28px',
      }} />
      <div className="absolute top-1/3 left-1/3 w-80 h-80 bg-violet-500/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-1/3 right-1/3 w-60 h-60 bg-indigo-600/10 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />
      <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/5 to-transparent" />

      <div className="relative z-10 w-full max-w-sm">

        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center mx-auto mb-4 shadow-xl">
            <ShieldCheck className="w-7 h-7 text-violet-300" />
          </div>
          <h1 className="font-display text-sm font-semibold text-violet-300 tracking-widest uppercase mb-1">Super Admin</h1>
          <p className="text-white/40 text-xs">{shortName} · Management System</p>
        </div>

        {/* Card */}
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/10 rounded-2xl p-7 shadow-2xl shadow-black/50 space-y-5">

          {/* ── Always-visible heading + method toggle ── */}
          <div>
            <h2 className="text-white font-display font-semibold text-lg">Admin Portal</h2>
            <p className="text-white/25 text-xs mt-0.5">Restricted access · Authorised personnel only</p>
          </div>

          {/* Method toggle — always visible when both methods are enabled */}
          {hasOtp && hasPassword && step === 'identifier' && (
            <div className="flex gap-1 bg-white/5 rounded-lg p-1">
              <button
                type="button"
                onClick={() => setLoginMethod('otp')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'otp' ? 'bg-white/10 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                OTP
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('password')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all ${
                  loginMethod === 'password' ? 'bg-white/10 text-white shadow-sm' : 'text-white/35 hover:text-white/60'
                }`}
              >
                <KeyRound className="w-3.5 h-3.5" />
                Password
              </button>
            </div>
          )}

          {/* ── Identifier input (shared by both OTP + password) ── */}
          {step === 'identifier' && (
            <div>
              <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">
                Email or Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={identifier}
                  onChange={e => setIdentifier(e.target.value)}
                  className={[
                    inputCls, 'pr-10',
                    showHint && isValid ? 'border-green-500/40' : '',
                    showHint && idType === 'invalid' ? 'border-red-500/40' : '',
                  ].filter(Boolean).join(' ')}
                  placeholder="admin@sfoacc.org  or  233543460633"
                  autoComplete="username"
                />
                {showHint && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2">
                    {isValid
                      ? <CheckCircle className="w-4 h-4 text-green-400/70" />
                      : <AlertCircle className="w-4 h-4 text-red-400/70" />}
                  </span>
                )}
              </div>
              {showHint && idType === 'invalid' && (
                <p className="mt-1.5 text-[11px] text-red-400/80">
                  Phone must start with 233 followed by 9 digits (e.g. 233543460633)
                </p>
              )}
            </div>
          )}

          {/* ── Password field (only for password method) ── */}
          {step === 'identifier' && loginMethod === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">Password</label>
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
              <Button type="submit" isLoading={loading} disabled={!isValid || !password} className="w-full justify-center">
                Sign In
              </Button>
            </form>
          )}

          {/* ── OTP: send button ── */}
          {step === 'identifier' && loginMethod === 'otp' && (
            <form onSubmit={handleSendOtp}>
              <Button type="submit" isLoading={loading} disabled={!isValid} className="w-full justify-center">
                Send OTP
              </Button>
            </form>
          )}

          {/* ── OTP: verify step ── */}
          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="bg-white/5 border border-white/10 rounded-lg px-4 py-2.5">
                <p className="text-[11px] text-white/30 uppercase tracking-wide mb-0.5">OTP sent to</p>
                <p className="text-sm text-white/70 font-medium">{trimmed}</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-white/40 mb-1.5 uppercase tracking-wide">OTP Code</label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={8}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} tracking-[0.4em] text-center text-xl font-mono`}
                  placeholder="· · · · · ·"
                  required
                  autoComplete="one-time-code"
                  autoFocus
                />
              </div>
              <Button type="submit" isLoading={loading} disabled={otpCode.length < 4} className="w-full justify-center">
                Verify & Enter
              </Button>
              <button
                type="button"
                onClick={() => { setStep('identifier'); setOtpCode(''); }}
                className="w-full text-center text-xs text-white/25 hover:text-white/50 transition-colors"
              >
                ← Change identifier or resend
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-[11px] text-white/15 mt-5">
          Not an admin?{' '}
          <a href="/login" className="text-violet-400/60 hover:text-violet-300 transition-colors">
            Return to regular sign in
          </a>
        </p>
      </div>
    </div>
  );
}
