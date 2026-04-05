import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Building2, ChevronRight, MapPin } from 'lucide-react';
import type { ChurchUnitSummary } from '@sfoacc/sdk';
import { useAppConfig } from '../contexts/AppConfigContext';
import churchLogo from '../../assets/st-francis-logo.jpg';

export default function SelectUnit() {
  const { accessibleUnits, selectedUnit, selectUnit, user } = useAuth();
  const { config } = useAppConfig();
  const logoSrc = config.logo_url || churchLogo;
  const shortName = config.church_code || config.name;
  const navigate = useNavigate();

  const handleSelect = (unit: ChurchUnitSummary) => {
    selectUnit(unit);
    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-navy-dark via-navy to-navy-light items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Branding */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-olive/30 shadow-xl shadow-olive/10 mx-auto mb-4">
            <img src={logoSrc} alt={shortName} className="w-full h-full object-cover" />
          </div>
          <h1 className="font-display text-xl font-bold text-white">{shortName}</h1>
        </div>

        {/* Card */}
        <div className="bg-card rounded-2xl shadow-xl border border-border p-6">
          <div className="mb-5">
            <h2 className="font-display text-xl font-semibold text-foreground">Select Church Unit</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Welcome, {user?.full_name}. Choose the unit you want to manage.
            </p>
          </div>

          <div className="space-y-2">
            {accessibleUnits.map(unit => {
              const isSelected = selectedUnit?.id === unit.id;
              return (
                <button
                  key={unit.id}
                  onClick={() => handleSelect(unit)}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-all ${
                    isSelected
                      ? 'bg-olive/10 border-olive/30 text-foreground'
                      : 'bg-background border-border hover:border-olive/20 hover:bg-olive/5'
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
                    isSelected ? 'bg-olive/20' : 'bg-muted'
                  }`}>
                    <Building2 className={`w-4 h-4 ${isSelected ? 'text-olive' : 'text-muted-foreground'}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{unit.name}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      <p className="text-[11px] text-muted-foreground capitalize truncate">
                        {unit.type}{unit.role_label ? ` · ${unit.role_label}` : ''}
                      </p>
                    </div>
                  </div>
                  <ChevronRight className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-olive' : 'text-muted-foreground/50'}`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
