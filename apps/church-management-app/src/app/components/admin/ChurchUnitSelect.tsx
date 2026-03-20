import { useEffect, useState } from 'react';
import { useSDK } from '../../contexts/SDKContext';
import type { ChurchUnit } from '@sfoacc/sdk';

interface ChurchUnitSelectProps {
  value: string;
  onChange: (value: string) => void;
  className?: string;
  placeholder?: string;
}

/**
 * Reusable church unit select.
 * Always shows "All units" first, then parishes, then each parish's outstations
 * indented beneath it via <optgroup>.
 */
export function ChurchUnitSelect({ value, onChange, className = '', placeholder = 'All units' }: ChurchUnitSelectProps) {
  const client = useSDK();
  const [units, setUnits] = useState<ChurchUnit[]>([]);

  useEffect(() => {
    client.listChurchUnits({ limit: 100 })
      .then(r => setUnits(r.data?.items ?? []))
      .catch(() => undefined);
  }, [client]);

  const parishes = units.filter(u => u.type === 'parish');
  const outstationsByParish = units.reduce<Record<number, ChurchUnit[]>>((acc, u) => {
    if (u.type === 'outstation' && u.parent_id) (acc[u.parent_id] ??= []).push(u);
    return acc;
  }, {});
  const orphans = units.filter(u => u.type === 'outstation' && !u.parent_id);

  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className={className}
    >
      <option value="">{placeholder}</option>

      {parishes.map(parish => (
        <optgroup key={parish.id} label={parish.name}>
          {/* The parish itself as a selectable option */}
          <option value={String(parish.id)}>{parish.name} (Parish)</option>
          {(outstationsByParish[parish.id] ?? []).map(out => (
            <option key={out.id} value={String(out.id)}>↳ {out.name}</option>
          ))}
        </optgroup>
      ))}

      {orphans.length > 0 && (
        <optgroup label="Other Outstations">
          {orphans.map(out => (
            <option key={out.id} value={String(out.id)}>{out.name}</option>
          ))}
        </optgroup>
      )}
    </select>
  );
}
