/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { motion } from 'motion/react';
import { X, Save, Edit3, Layers } from 'lucide-react';
import { Status, Photocard, Condition } from '../types';

interface BulkEditFormProps {
  selectedCount: number;
  onSave: (updates: Partial<Photocard>) => void;
  onClose: () => void;
}

export default function BulkEditForm({ selectedCount, onSave, onClose }: BulkEditFormProps) {
  const [group, setGroup] = useState<string | undefined>(undefined);
  const [member, setMember] = useState<string | undefined>(undefined);
  const [album, setAlbum] = useState<string | undefined>(undefined);
  const [era, setEra] = useState<string | undefined>(undefined);
  const [year, setYear] = useState<number | undefined>(undefined);
  const [status, setStatus] = useState<Status | undefined>(undefined);
  const [condition, setCondition] = useState<Condition | undefined>(undefined);
  const [isDuplicate, setIsDuplicate] = useState<boolean | undefined>(undefined);
  const [notes, setNotes] = useState<string | undefined>(undefined);

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
    if (activeFields.has('album')) updates.album = album;
    if (activeFields.has('era')) updates.era = era;
    if (activeFields.has('year')) updates.year = year;
    if (activeFields.has('status')) updates.status = status;
    if (activeFields.has('condition')) updates.condition = condition;
    if (activeFields.has('isDuplicate')) updates.isDuplicate = isDuplicate;
    if (activeFields.has('notes')) updates.notes = notes;

    onSave(updates);
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
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-white w-full max-w-2xl rounded-[40px] overflow-hidden shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-8 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-foreground uppercase tracking-tight italic flex items-center gap-3">
              <Layers className="text-primary" size={28} />
              Bulk Edit
            </h2>
            <p className="text-[10px] font-black text-foreground/30 uppercase tracking-widest ml-1">
              Updating {selectedCount} selected cards
            </p>
          </div>
          <button onClick={onClose} className="p-3 bg-gray-50 rounded-2xl text-foreground/20 hover:text-primary transition-all">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Group */}
            <div className={fieldClass('group')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Group</label>
                <Checkbox id="group" />
              </div>
              <input
                disabled={!activeFields.has('group')}
                type="text"
                placeholder="New group name..."
                onChange={(e) => setGroup(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            {/* Member */}
            <div className={fieldClass('member')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Member</label>
                <Checkbox id="member" />
              </div>
              <input
                disabled={!activeFields.has('member')}
                type="text"
                placeholder="New member name..."
                onChange={(e) => setMember(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            {/* Album */}
            <div className={fieldClass('album')}>
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40">Album</label>
                <Checkbox id="album" />
              </div>
              <input
                disabled={!activeFields.has('album')}
                type="text"
                placeholder="New album..."
                onChange={(e) => setAlbum(e.target.value)}
                className="bg-transparent text-sm font-bold outline-none border-b border-black/5 pb-1 disabled:opacity-30"
              />
            </div>

            {/* Status */}
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

        <div className="p-8 border-t border-gray-100 flex gap-4 shrink-0">
          <button
            onClick={onClose}
            className="flex-1 py-4 bg-gray-50 text-foreground/40 rounded-2xl font-black text-xs uppercase tracking-widest border-2 border-white hover:bg-white transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={activeFields.size === 0}
            className="flex-2 py-4 bg-primary text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-30 disabled:scale-100"
          >
            <Save size={18} />
            Apply Changes
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
