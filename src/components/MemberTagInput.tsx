/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { KeyboardEvent, useState } from 'react';
import { X } from 'lucide-react';
import { normalizeMembers } from '../types';

interface MemberTagInputProps {
  members: string[];
  onChange: (members: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  inputClassName?: string;
}

export default function MemberTagInput({
  members,
  onChange,
  placeholder = 'Felix',
  disabled = false,
  className = '',
  inputClassName = '',
}: MemberTagInputProps) {
  const [draft, setDraft] = useState('');
  const normalizedMembers = normalizeMembers(members);

  const addMembers = (value: string) => {
    const nextMembers = normalizeMembers(value);
    if (nextMembers.length === 0) return;
    onChange(normalizeMembers([...normalizedMembers, ...nextMembers]));
    setDraft('');
  };

  const removeMember = (member: string) => {
    onChange(normalizedMembers.filter(existing => existing !== member));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' || event.key === ',') {
      event.preventDefault();
      addMembers(draft);
    }
    if (event.key === 'Backspace' && !draft && normalizedMembers.length > 0) {
      onChange(normalizedMembers.slice(0, -1));
    }
  };

  return (
    <div className={`flex min-h-[48px] w-full flex-wrap items-center gap-2 ${className}`}>
      {normalizedMembers.map(member => (
        <span
          key={member}
          className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-primary/10 px-2.5 py-1.5 text-xs font-black text-primary"
        >
          <span className="truncate">{member}</span>
          <button
            type="button"
            disabled={disabled}
            onClick={() => removeMember(member)}
            className="shrink-0 rounded-full p-0.5 text-primary/60 transition-colors hover:bg-primary/10 hover:text-primary disabled:opacity-30"
            aria-label={`Remove ${member}`}
          >
            <X size={12} />
          </button>
        </span>
      ))}
      <input
        disabled={disabled}
        type="text"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={() => addMembers(draft)}
        className={`min-w-[8rem] flex-1 bg-transparent outline-none disabled:opacity-30 ${inputClassName}`}
        placeholder={normalizedMembers.length === 0 ? placeholder : 'Add member'}
      />
    </div>
  );
}
