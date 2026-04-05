import { Outlet } from 'react-router-dom';
import { useAppConfig } from '../contexts/AppConfigContext';
import churchLogo from '../../assets/st-francis-logo.jpg';

function ChurchWindowDecor() {
  return (
    <svg viewBox="0 0 200 300" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path d="M100 10 Q190 10 190 100 L190 290 L10 290 L10 100 Q10 10 100 10Z"
        stroke="#b8963e" strokeWidth="1.5" fill="none" />
      <path d="M100 30 Q165 30 165 108 L165 272 L35 272 L35 108 Q35 30 100 30Z"
        stroke="#b8963e" strokeWidth="1" fill="none" />
      <line x1="100" y1="10" x2="100" y2="290" stroke="#b8963e" strokeWidth="1" />
      <line x1="10" y1="150" x2="190" y2="150" stroke="#b8963e" strokeWidth="1" />
      <circle cx="100" cy="150" r="32" stroke="#b8963e" strokeWidth="1" fill="none" />
      <circle cx="100" cy="150" r="18" stroke="#b8963e" strokeWidth="0.5" fill="none" />
      <path d="M100 118 L100 88" stroke="#b8963e" strokeWidth="1.5" />
      <path d="M84 134 L60 134" stroke="#b8963e" strokeWidth="1.5" />
    </svg>
  );
}

export default function AuthLayout() {
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-navy-dark via-navy to-navy-light">

      {/* Left decorative panel */}
      <div className="hidden lg:flex lg:w-5/12 relative flex-col items-center justify-center p-16 overflow-hidden">
        {/* Pattern */}
        <div className="absolute inset-0" style={{
          backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(184,150,62,0.07) 1px, transparent 0)',
          backgroundSize: '28px 28px',
        }} />
        {/* Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-64 h-64 bg-olive/10 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 w-32 h-32 bg-golden/8 blur-2xl rounded-full pointer-events-none" />

        {/* Church window art */}
        <div className="relative z-10 w-48 h-72 opacity-20 mb-10">
          <ChurchWindowDecor />
        </div>

        <div className="relative z-10 text-center">
          <div className="w-20 h-20 rounded-2xl overflow-hidden border border-olive/30 shadow-xl shadow-olive/10 mb-6 mx-auto">
            <img src={logoSrc} alt={shortName} className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-4xl font-bold text-white tracking-wide mb-2">{shortName}</h1>
          <p className="text-white/40 text-sm mb-6 leading-relaxed max-w-xs">
            {config.description || config.name}
          </p>
          <div className="flex items-center justify-center gap-3">
            <div className="w-12 h-px bg-gradient-to-r from-transparent to-olive/40" />
            <span className="text-olive/50 text-xs tracking-widest uppercase">{config.address || 'Management System'}</span>
            <div className="w-12 h-px bg-gradient-to-l from-transparent to-olive/40" />
          </div>
          <p className="text-white/20 text-xs font-medium italic mt-8 max-w-xs mx-auto leading-relaxed">
            "For where two or three gather in my name, there am I with them."
            <span className="block mt-1 not-italic text-white/15">— Matthew 18:20</span>
          </p>
        </div>

        {/* Bottom gold line */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-olive/30 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-cream via-background to-cream-dark relative">
        {/* Subtle top accent */}
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-olive/20 to-transparent" />

        <div className="w-full max-w-md">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-8">
            <div className="w-12 h-12 rounded-xl overflow-hidden border border-olive/25 mb-3 mx-auto">
              <img src={logoSrc} alt={shortName} className="w-full h-full object-cover" />
            </div>
            <h1 className="font-display text-xl font-bold text-foreground">{shortName}</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{config.name}</p>
          </div>

          {/* Card */}
          <div className="bg-card rounded-2xl shadow-xl border border-border p-5 sm:p-8">
            <Outlet />
          </div>

          <p className="text-center text-xs text-muted-foreground/60 mt-6 italic">
            "I am the way and the truth and the life." — John 14:6
          </p>
        </div>
      </div>
    </div>
  );
}
