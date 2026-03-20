import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';

// ── Country list ──────────────────────────────────────────────────────────────

interface Country {
  name: string;
  flag: string;
  dialCode: string;
}

// Africa first, then rest of world. Ghana is the default.
const COUNTRIES: Country[] = [
  // ── Africa ──
  { name: 'Ghana',          flag: '🇬🇭', dialCode: '233' },
  { name: 'Nigeria',        flag: '🇳🇬', dialCode: '234' },
  { name: 'South Africa',   flag: '🇿🇦', dialCode: '27'  },
  { name: 'Kenya',          flag: '🇰🇪', dialCode: '254' },
  { name: 'Ethiopia',       flag: '🇪🇹', dialCode: '251' },
  { name: 'Tanzania',       flag: '🇹🇿', dialCode: '255' },
  { name: 'Uganda',         flag: '🇺🇬', dialCode: '256' },
  { name: 'Rwanda',         flag: '🇷🇼', dialCode: '250' },
  { name: "Côte d'Ivoire",  flag: '🇨🇮', dialCode: '225' },
  { name: 'Senegal',        flag: '🇸🇳', dialCode: '221' },
  { name: 'Cameroon',       flag: '🇨🇲', dialCode: '237' },
  { name: 'Togo',           flag: '🇹🇬', dialCode: '228' },
  { name: 'Benin',          flag: '🇧🇯', dialCode: '229' },
  { name: 'Burkina Faso',   flag: '🇧🇫', dialCode: '226' },
  { name: 'Mali',           flag: '🇲🇱', dialCode: '223' },
  { name: 'Niger',          flag: '🇳🇪', dialCode: '227' },
  { name: 'Zambia',         flag: '🇿🇲', dialCode: '260' },
  { name: 'Zimbabwe',       flag: '🇿🇼', dialCode: '263' },
  { name: 'Mozambique',     flag: '🇲🇿', dialCode: '258' },
  { name: 'Angola',         flag: '🇦🇴', dialCode: '244' },
  { name: 'DR Congo',       flag: '🇨🇩', dialCode: '243' },
  { name: 'Congo',          flag: '🇨🇬', dialCode: '242' },
  { name: 'Liberia',        flag: '🇱🇷', dialCode: '231' },
  { name: 'Sierra Leone',   flag: '🇸🇱', dialCode: '232' },
  { name: 'Gambia',         flag: '🇬🇲', dialCode: '220' },
  { name: 'Guinea',         flag: '🇬🇳', dialCode: '224' },
  { name: 'Guinea-Bissau',  flag: '🇬🇼', dialCode: '245' },
  { name: 'Gabon',          flag: '🇬🇦', dialCode: '241' },
  { name: 'Chad',           flag: '🇹🇩', dialCode: '235' },
  { name: 'Malawi',         flag: '🇲🇼', dialCode: '265' },
  { name: 'Somalia',        flag: '🇸🇴', dialCode: '252' },
  { name: 'Eritrea',        flag: '🇪🇷', dialCode: '291' },
  { name: 'Namibia',        flag: '🇳🇦', dialCode: '264' },
  { name: 'Botswana',       flag: '🇧🇼', dialCode: '267' },
  { name: 'Lesotho',        flag: '🇱🇸', dialCode: '266' },
  { name: 'Eswatini',       flag: '🇸🇿', dialCode: '268' },
  { name: 'Madagascar',     flag: '🇲🇬', dialCode: '261' },
  { name: 'Egypt',          flag: '🇪🇬', dialCode: '20'  },
  { name: 'Morocco',        flag: '🇲🇦', dialCode: '212' },
  { name: 'Tunisia',        flag: '🇹🇳', dialCode: '216' },
  { name: 'Algeria',        flag: '🇩🇿', dialCode: '213' },
  { name: 'Libya',          flag: '🇱🇾', dialCode: '218' },
  { name: 'Sudan',          flag: '🇸🇩', dialCode: '249' },
  { name: 'South Sudan',    flag: '🇸🇸', dialCode: '211' },
  // ── Europe ──
  { name: 'United Kingdom', flag: '🇬🇧', dialCode: '44'  },
  { name: 'Germany',        flag: '🇩🇪', dialCode: '49'  },
  { name: 'France',         flag: '🇫🇷', dialCode: '33'  },
  { name: 'Italy',          flag: '🇮🇹', dialCode: '39'  },
  { name: 'Spain',          flag: '🇪🇸', dialCode: '34'  },
  { name: 'Netherlands',    flag: '🇳🇱', dialCode: '31'  },
  { name: 'Belgium',        flag: '🇧🇪', dialCode: '32'  },
  { name: 'Switzerland',    flag: '🇨🇭', dialCode: '41'  },
  { name: 'Portugal',       flag: '🇵🇹', dialCode: '351' },
  { name: 'Ireland',        flag: '🇮🇪', dialCode: '353' },
  { name: 'Sweden',         flag: '🇸🇪', dialCode: '46'  },
  { name: 'Norway',         flag: '🇳🇴', dialCode: '47'  },
  { name: 'Denmark',        flag: '🇩🇰', dialCode: '45'  },
  { name: 'Finland',        flag: '🇫🇮', dialCode: '358' },
  { name: 'Poland',         flag: '🇵🇱', dialCode: '48'  },
  { name: 'Romania',        flag: '🇷🇴', dialCode: '40'  },
  // ── Americas ──
  { name: 'United States',  flag: '🇺🇸', dialCode: '1'   },
  { name: 'Canada',         flag: '🇨🇦', dialCode: '1'   },
  { name: 'Brazil',         flag: '🇧🇷', dialCode: '55'  },
  { name: 'Mexico',         flag: '🇲🇽', dialCode: '52'  },
  { name: 'Argentina',      flag: '🇦🇷', dialCode: '54'  },
  { name: 'Colombia',       flag: '🇨🇴', dialCode: '57'  },
  // ── Asia & Middle East ──
  { name: 'India',          flag: '🇮🇳', dialCode: '91'  },
  { name: 'China',          flag: '🇨🇳', dialCode: '86'  },
  { name: 'Japan',          flag: '🇯🇵', dialCode: '81'  },
  { name: 'South Korea',    flag: '🇰🇷', dialCode: '82'  },
  { name: 'Saudi Arabia',   flag: '🇸🇦', dialCode: '966' },
  { name: 'UAE',            flag: '🇦🇪', dialCode: '971' },
  { name: 'Lebanon',        flag: '🇱🇧', dialCode: '961' },
  { name: 'Israel',         flag: '🇮🇱', dialCode: '972' },
  { name: 'Turkey',         flag: '🇹🇷', dialCode: '90'  },
  { name: 'Pakistan',       flag: '🇵🇰', dialCode: '92'  },
  { name: 'Bangladesh',     flag: '🇧🇩', dialCode: '880' },
  { name: 'Philippines',    flag: '🇵🇭', dialCode: '63'  },
  { name: 'Indonesia',      flag: '🇮🇩', dialCode: '62'  },
  // ── Oceania ──
  { name: 'Australia',      flag: '🇦🇺', dialCode: '61'  },
  { name: 'New Zealand',    flag: '🇳🇿', dialCode: '64'  },
];

const DEFAULT_COUNTRY = COUNTRIES[0]; // Ghana

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Detect which country best matches a full number string (longest prefix wins). */
function detectCountry(fullNumber: string): Country {
  if (!fullNumber) return DEFAULT_COUNTRY;
  const sorted = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
  return sorted.find(c => fullNumber.startsWith(c.dialCode)) ?? DEFAULT_COUNTRY;
}

/** Extract the local part of a full number given a dial code. */
function getLocalPart(fullNumber: string, dialCode: string): string {
  if (!fullNumber) return '';
  if (fullNumber.startsWith(dialCode)) return fullNumber.slice(dialCode.length);
  return fullNumber;
}

/** Strip non-digits and remove any leading zeros (trunk prefix). */
function sanitize(raw: string): string {
  return raw.replace(/\D/g, '').replace(/^0+/, '');
}

// ── Component ─────────────────────────────────────────────────────────────────

export interface PhoneInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

export function PhoneInput({
  value,
  onChange,
  placeholder = 'Phone number',
  disabled = false,
  id,
  className = '',
}: PhoneInputProps) {
  const [selectedCountry, setSelectedCountry] = useState<Country>(() => detectCountry(value));
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // When the external value changes significantly (e.g. form pre-population),
  // auto-detect and update the selected country.
  useEffect(() => {
    if (!value) return;
    const detected = detectCountry(value);
    if (detected.dialCode !== selectedCountry.dialCode) {
      setSelectedCountry(detected);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  // Close dropdown on outside click.
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Focus search input when dropdown opens.
  useEffect(() => {
    if (open) setTimeout(() => searchRef.current?.focus(), 50);
  }, [open]);

  const localPart = getLocalPart(value, selectedCountry.dialCode);

  const filteredCountries = search.trim()
    ? COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.dialCode.includes(search.replace(/\D/g, ''))
      )
    : COUNTRIES;

  function handleLocalChange(raw: string) {
    const digits = sanitize(raw);
    onChange(digits ? selectedCountry.dialCode + digits : '');
  }

  function handleCountrySelect(country: Country) {
    // Carry over the existing local number with the new country code.
    const local = getLocalPart(value, selectedCountry.dialCode);
    onChange(local ? country.dialCode + local : '');
    setSelectedCountry(country);
    setOpen(false);
    setSearch('');
  }

  function handleClear() {
    onChange('');
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      {/* ── Input group ── */}
      <div className={`flex items-stretch border border-border rounded-lg bg-background overflow-hidden transition-all focus-within:ring-2 focus-within:ring-navy/20 focus-within:border-navy/40 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>

        {/* Country selector button */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => setOpen(prev => !prev)}
          className="flex items-center gap-1 px-2.5 py-2 bg-muted/50 border-r border-border hover:bg-muted transition-colors shrink-0 focus:outline-none"
          aria-label="Select country"
        >
          <span className="text-base leading-none">{selectedCountry.flag}</span>
          <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`} />
        </button>

        {/* Local number input */}
        <input
          id={id}
          type="tel"
          inputMode="numeric"
          disabled={disabled}
          value={localPart}
          onChange={e => handleLocalChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 px-3 py-2 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/60 min-w-0"
        />

        {/* Clear button — only shown when there's a value */}
        {value && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="px-2 text-muted-foreground hover:text-foreground transition-colors focus:outline-none shrink-0"
            aria-label="Clear"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ── Dropdown ── */}
      {open && (
        <div className="absolute z-50 mt-1 w-60 bg-card border border-border rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-border">
            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-muted/50 rounded-lg">
              <Search className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search country or dial code…"
                className="flex-1 text-xs bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground/60"
              />
              {search && (
                <button type="button" onClick={() => setSearch('')} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          {/* Country list */}
          <div className="overflow-y-auto max-h-56">
            {filteredCountries.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">No countries found</p>
            ) : (
              filteredCountries.map(country => {
                const isSelected = country.name === selectedCountry.name;
                return (
                  <button
                    key={`${country.name}-${country.dialCode}`}
                    type="button"
                    onClick={() => handleCountrySelect(country)}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-muted transition-colors ${isSelected ? 'bg-navy/10' : 'bg-card'}`}
                  >
                    <span className="text-base leading-none w-6 text-center shrink-0">{country.flag}</span>
                    <span className={`flex-1 text-xs ${isSelected ? 'font-semibold text-foreground' : 'text-foreground'} truncate`}>{country.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">+{country.dialCode}</span>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-navy shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
