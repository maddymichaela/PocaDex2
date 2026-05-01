/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Save, Layers } from 'lucide-react';
import { Status, Photocard, Condition, PHOTOCARD_CATEGORIES, PhotocardCategory, normalizePhotocardUpdates } from '../types';
import ModalShell from './ModalShell';

interface BulkEditFormProps {
  selectedCount: number;
  onSave: (updates: Partial<Photocard>) => void;
  onClose: () => void;
}

export default function BulkEditForm({ selectedCount, onSave, onClose }: BulkEditFormProps) {
  const [group, setGroup] = useState('');
  const [member, setMember] = useState('');
  const [category, setCategory] = useState<PhotocardCategory>('Album');
  const [source, setSource] = useState('');
  const [album, setAlbum] = useState('');
  const [era, setEra] = useState('');
  const [version, setVersion] = useState('');
  const [cardName, setCardName] = useState('');
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Status>('owned');
  const [condition, setCondition] = useState<Condition>('mint');
  const [isDuplicate, setIsDuplicate] = useState(false);
  const [notes, setNotes] = useState('');

  const [activeFields, setActiveFields] = useState<Set<string>>(new Set());

  const toggleField = (field: string) => {
    const newFields = new Set(activeFields);
    if (newFields.has(field)) {
      newFields.delete(field);
    } else {
      newFields.add(field);
    }
    setActiveFields(newFields);
  };

  const handleSave = () => {
    const updates: Partial<Photocard> = {};
    if (activeFields.has('group')) updates.group = group;
    if (activeFields.has('member')) updates.member = member;
    if (activeFields.has('category')) updates.category = category;
    if (activeFields.has('source')) updates.source = source;
    if (activeFields.has('album')) updates.album = album;
    if (activeFields.has('era')) updates.era = era;
    if (activeFields.has('version')) updates.version = version;
    if (activeFields.has('cardName')) updates.cardName = cardName;
    if (activeFields.has('year')) updates.year = year;
    if (activeFields.has('status')) updates.status = status;
    if (activeFields.has('condition')) updates.condition = condition;
    if (activeFields.has('isDuplicate')) updates.isDuplicate = isDuplicate;
    if (activeFields.has('notes')) updates.notes = notes;

    onSave(normalizePhotocardUpdates(updates));
  };

  const fieldClass = (field: string) => `
    flex flex-col gap-2 p-4 rounded-2xl border-2 transition-all
    ${activeFields.has(field) ? 'bg-white border-primary/20 shadow-sm' : 'bg-gray-50/50 border-transparent opacity-60'}
  `;

  const Checkbox = ({ id }: { id: string }) => (
    <div 
      onClick={() => toggleField(id)}
      className={`w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer transition-all ${
        activeFields.has(id) ? 'bg-primary border-primary text-white' : 'bg-white border-gray-200'
      }`}
    >
      {activeFields.has(id) && (
        <svg viewBox="0 0 10 8" className="w-2.5 h-2.5 fill-none stroke-current stroke-[3] stroke-linecap-round stroke-linejoin-round">
          <path d="M1 4l3 3 5-6" />
        </svg>
      )}
    </div>
  );

  return (
    <ModalShell
      title="Bulk Edit"
      subtitle={`Updating ${selectedCount} selected cards`}
      icon={<Layers size={19} />}
      onClose={onClose}
      maxWidth="md:max-w-2xl"
      bodyClassName="custom-scrollbar"
      footer={(
        <div className="flex gap-3 md:gap-4">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border-2 border-white bg-gray-50 py-3.5 text-[10px] font-black uppercase tracking-widest text-foreground/40 transition-all hover:bg-white md:rounded-2xl md:py-4 md:text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={activeFields.size === 0}
            className="btn-primary-pink flex flex-[2] items-center justify-center gap-3 rounded-xl py-3.5 text-[10px] font-black uppercase tracking-widest disabled:scale-100 disabled:opacity-30 md:rounded-2xl md:py-4 md:text-xs"
          >
            <Save size={18} />
            Apply Changes
          </button>
        </div>
      )}
    >
        <div className="space-y-6 p-5 md:p-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className={fieldClass('group')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Group</label>
                <Checkbox id="group" />
              </div>
              <input
                disabled={!activeFields.has('group')}
                type="text"
                placeholder="Stray Kids"
                onChange={(e) => setGroup(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('member')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Member</label>
                <Checkbox id="member" />
              </div>
              <input
                disabled={!activeFields.has('member')}
                type="text"
                placeholder="Felix"
                onChange={(e) => setMember(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('album')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Album</label>
                <Checkbox id="album" />
              </div>
              <input
                disabled={!activeFields.has('album')}
                type="text"
                placeholder="DO IT"
                onChange={(e) => setAlbum(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('category')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Category</label>
                <Checkbox id="category" />
              </div>
              <select
                disabled={!activeFields.has('category')}
                value={category}
                onChange={(e) => setCategory(e.target.value as PhotocardCategory)}
                className="bg-transparent text-sm font-black outline-none cursor-pointer disabled:opacity-30"
              >
                {PHOTOCARD_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
              </select>
            </div>

            <div className={fieldClass('source')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Source</label>
                <Checkbox id="source" />
              </div>
              <input
                disabled={!activeFields.has('source')}
                type="text"
                placeholder="Soundwave"
                onChange={(e) => setSource(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('era')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Era</label>
                <Checkbox id="era" />
              </div>
              <input
                disabled={!activeFields.has('era')}
                type="text"
                placeholder="DO IT"
                onChange={(e) => setEra(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('version')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Version</label>
                <Checkbox id="version" />
              </div>
              <input
                disabled={!activeFields.has('version')}
                type="text"
                placeholder="Felix Accordion ver."
                onChange={(e) => setVersion(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('year')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Year</label>
                <Checkbox id="year" />
              </div>
              <input
                disabled={!activeFields.has('year')}
                type="number"
                placeholder="2025"
                onChange={(e) => setYear(Number(e.target.value))}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('cardName')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Photocard Name</label>
                <Checkbox id="cardName" />
              </div>
              <input
                disabled={!activeFields.has('cardName')}
                type="text"
                placeholder="Felix DO IT photocard"
                onChange={(e) => setCardName(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            <div className={fieldClass('status')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Status</label>
                <Checkbox id="status" />
              </div>
              <select
                disabled={!activeFields.has('status')}
                onChange={(e) => setStatus(e.target.value as Status)}
                className="bg-transparent text-sm font-black outline-none cursor-pointer disabled:opacity-30"
              >
                <option value="owned">Owned</option>
                <option value="on_the_way">On The Way</option>
                <option value="wishlist">Wishlist</option>
              </select>
            </div>

            <div className={fieldClass('condition')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Condition</label>
                <Checkbox id="condition" />
              </div>
              <select
                disabled={!activeFields.has('condition')}
                onChange={(e) => setCondition(e.target.value as Condition)}
                className="bg-transparent text-sm font-black outline-none cursor-pointer disabled:opacity-30"
              >
                <option value="mint">Mint</option>
                <option value="near_mint">Near Mint</option>
                <option value="good">Good</option>
                <option value="fair">Fair</option>
                <option value="poor">Poor</option>
              </select>
            </div>

            <div className={fieldClass('isDuplicate')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Duplicates</label>
                <Checkbox id="isDuplicate" />
              </div>
              <select
                disabled={!activeFields.has('isDuplicate')}
                onChange={(e) => setIsDuplicate(e.target.value === 'true')}
                className="bg-transparent text-sm font-black outline-none cursor-pointer disabled:opacity-30"
              >
                <option value="false">No</option>
                <option value="true">Yes</option>
              </select>
            </div>
          </div>

          {/* Notes */}
          <div className={fieldClass('notes')}>
            <div className="flex items-center justify-between">
              <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Notes</label>
              <Checkbox id="notes" />
            </div>
            <textarea
              disabled={!activeFields.has('notes')}
              placeholder="Overwrite existing notes..."
              onChange={(e) => setNotes(e.target.value)}
              className="bg-transparent text-sm font-medium outline-none resize-none h-20 disabled:opacity-30"
            />
          </div>

          <p className="text-[9px] font-bold text-foreground/30 italic text-center uppercase tracking-wider">
            Only checked fields will be updated on all selected items.
          </p>
        </div>
    </ModalShell>
  );
}
