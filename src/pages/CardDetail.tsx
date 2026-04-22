/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, Image as ImageIcon, Save, Trash2, Edit3, Copy, Sparkles, Calendar, Disc, User, Heart, Truck } from 'lucide-react';
import { Status, Photocard, Condition } from '../types';
import { useImageUpload } from '../hooks/useImageUpload';
import ImageEditor from '../components/ImageEditor';

interface CardDetailProps {
  photocard: Photocard;
  onUpdate: (pc: Photocard) => void;
  onDelete: (id: string) => void;
  onBack: () => void;
}

export default function CardDetail({ photocard, onUpdate, onDelete, onBack }: CardDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [group, setGroup] = useState(photocard.group || '');
  const [member, setMember] = useState(photocard.member || '');
  const [album, setAlbum] = useState(photocard.album || '');
  const [era, setEra] = useState(photocard.era || '');
  const [year, setYear] = useState<number>(Number(photocard.year) || new Date().getFullYear());
  const [cardName, setCardName] = useState(photocard.cardName || '');
  const [version, setVersion] = useState(photocard.version || '');
  const [notes, setNotes] = useState(photocard.notes || '');
  const [status, setStatus] = useState<Status>(photocard.status || 'owned');
  const [condition, setCondition] = useState<Condition>(photocard.condition || 'mint');
  const [isDuplicate, setIsDuplicate] = useState(!!photocard.isDuplicate);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);

  const {
    previewUrl,
    removeImage,
    updatePreview,
    uploadError
  } = useImageUpload(photocard.imageUrl || null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setEditingImage(reader.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleSaveEditedImage = (croppedImage: string) => {
    updatePreview(croppedImage);
    setIsEditorOpen(false);
    setEditingImage(null);
  };

  const handleSave = (e: FormEvent) => {
    e.preventDefault();
    const updatedPC: Photocard = {
      ...photocard,
      group,
      member,
      album,
      era,
      year: Number(year),
      cardName,
      version,
      status,
      condition,
      isDuplicate,
      notes,
      imageUrl: previewUrl || undefined,
    };
    onUpdate(updatedPC);
    setIsEditing(false);
  };

  const statusOptions: { value: Status; label: string; color: string; icon: any }[] = [
    { value: 'owned', label: 'Owned', color: 'bg-accent-green', icon: Sparkles },
    { value: 'on_the_way', label: 'On Way', color: 'bg-accent-blue', icon: Truck },
    { value: 'wishlist', label: 'Wishlist', color: 'bg-secondary', icon: Heart },
  ];

  return (
    <div className="min-h-screen bg-gray-50/30 overflow-x-hidden">
      {/* Header rail */}
      <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 md:px-8 py-4 flex items-center justify-between shadow-sm">
        <button
          onClick={onBack}
          className="flex items-center gap-2 group px-4 py-2 hover:bg-gray-100 rounded-2xl transition-all"
        >
          <ChevronLeft className="text-foreground/40 group-hover:text-primary transition-colors" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground">Back to Binder</span>
        </button>

        <div className="flex items-center gap-3">
          {!isEditing ? (
            <button
              onClick={() => setIsEditing(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-white border-2 border-primary/20 text-primary rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-sm"
            >
              <Edit3 size={14} />
              Edit Card
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(false)}
                className="px-5 py-2.5 bg-gray-50 text-foreground/40 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-foreground transition-all"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 transition-all hover:scale-105"
              >
                <Save size={14} />
                Save Changes
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-12">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-20 items-start">

          {/* Left Column: Image Display */}
          <div className="lg:col-span-5 space-y-6 sticky lg:top-32">
            <div className={`relative aspect-[1/1.5] w-full rounded-[48px] overflow-hidden shadow-2xl border-[12px] border-white ring-1 ring-black/5 group ${isEditing ? 'cursor-pointer' : ''}`}
              onClick={() => isEditing && fileInputRef.current?.click()}>
              <img
                src={previewUrl || "/placeholder.png"}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />

              {isEditing && (
                <div className="absolute inset-0 bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-all flex flex-col items-center justify-center text-white gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/30">
                    <ImageIcon size={32} />
                  </div>
                  <span className="font-black uppercase text-xs tracking-widest">Swap Image</span>
                </div>
              )}

              {!previewUrl && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <span className="font-heading text-2xl font-black italic uppercase tracking-tighter text-primary/30">No Photo Yet</span>
                </div>
              )}

              {/* Status Badge Over Image */}
              <div className="absolute top-8 right-8">
                {statusOptions.map(opt => opt.value === status && (
                  <div key={opt.value} className={`${opt.color} text-white p-3 rounded-full shadow-2xl animate-in zoom-in duration-500`}>
                    <opt.icon size={20} />
                  </div>
                ))}
              </div>
            </div>

            {/* Image edit secondary controls */}
            {isEditing && previewUrl && (
              <div className="flex gap-4">
                <button onClick={() => setEditingImage(previewUrl)} className="flex-1 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2">
                  <Edit3 size={14} /> Refine Crop
                </button>
                <button onClick={removeImage} className="flex-1 py-3 bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2">
                  <Trash2 size={14} /> Remove Image
                </button>
              </div>
            )}

            <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageFileSelect} />
          </div>

          {/* Right Column: Card Details */}
          <div className="lg:col-span-7 space-y-12">

            {/* Title Section */}
            <div className="space-y-4">
              {isEditing ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">K-Pop Group</label>
                    <input
                      type="text"
                      value={group}
                      onChange={e => setGroup(e.target.value)}
                      className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-[20px] text-lg font-black text-primary focus:border-primary/30 outline-none transition-all"
                      placeholder="Group Name"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/30 ml-1">Idol / Member</label>
                    <input
                      type="text"
                      value={member}
                      onChange={e => setMember(e.target.value)}
                      className="w-full px-6 py-4 bg-white border-2 border-gray-100 rounded-[20px] text-lg font-black text-foreground focus:border-primary/30 outline-none transition-all"
                      placeholder="Member Name"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 font-black text-primary uppercase text-sm tracking-[0.2em]">
                    {group || "SOLOIST"}
                    <span className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
                    {year}
                  </div>
                  <h1 className="text-5xl md:text-5xl font-black text-foreground uppercase tracking-tight leading-none">{member}</h1>
                  <div className="h-1.5 w-24 bg-primary rounded-full mt-4" />
                </div>
              )}
            </div>

            {/* Status & Quick Info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div className="bg-white p-6 rounded-[32px] border-2 border-gray-50 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/30">
                  <Sparkles size={14} /> Status
                </div>
                {isEditing ? (
                  <select
                    value={status}
                    onChange={e => setStatus(e.target.value as Status)}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl text-xs font-black uppercase outline-none"
                  >
                    <option value="owned">Owned</option>
                    <option value="on_the_way">On The Way</option>
                    <option value="wishlist">Wishlist</option>
                  </select>
                ) : (
                  <div className="text-lg font-black uppercase tracking-tight text-foreground">{status.replace(/_/g, ' ')}</div>
                )}
              </div>

              <div className="bg-white p-6 rounded-[32px] border-2 border-gray-50 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/30">
                  <Sparkles size={14} /> Condition
                </div>
                {isEditing ? (
                  <select
                    value={condition}
                    onChange={e => setCondition(e.target.value as Condition)}
                    className="w-full bg-gray-50 px-3 py-2 rounded-xl text-xs font-black uppercase outline-none"
                  >
                    <option value="mint">Mint</option>
                    <option value="near_mint">Near Mint</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                ) : (
                  <div className="text-lg font-black uppercase tracking-tight text-foreground">{condition.replace(/_/g, ' ')}</div>
                )}
              </div>

              <div className="bg-white p-6 rounded-[32px] border-2 border-gray-50 space-y-3 shadow-sm">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.15em] text-foreground/30">
                  <Copy size={14} /> Duplicate?
                </div>
                {isEditing ? (
                  <div className="flex items-center gap-3 pt-1">
                    <button
                      onClick={() => setIsDuplicate(!isDuplicate)}
                      className={`w-12 h-6 rounded-full transition-all relative ${isDuplicate ? 'bg-primary' : 'bg-gray-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isDuplicate ? 'left-7' : 'left-1'}`} />
                    </button>
                  </div>
                ) : (
                  <div className="text-lg font-black uppercase tracking-tight text-foreground">{isDuplicate ? 'Yes (Multi)' : 'No (Unique)'}</div>
                )}
              </div>
            </div>

            {/* Detail Content */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 border-t border-gray-100">
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    <Disc size={14} /> Album
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={album}
                      onChange={e => setAlbum(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold uppercase text-sm focus:bg-white focus:border-primary/30 outline-none"
                      placeholder="Album Title"
                    />
                  ) : (
                    <p className="font-heading text-xl font-black text-foreground uppercase italic">{album}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    <Sparkles size={14} /> Era
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={era}
                      onChange={e => setEra(e.target.value)}
                      className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold uppercase text-sm focus:bg-white focus:border-primary/30 outline-none"
                      placeholder="e.g. Backdoor"
                    />
                  ) : (
                    <p className="font-heading text-xl font-black text-foreground uppercase italic">{era || "Backdoor"}</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    <ImageIcon size={14} /> Card Details
                  </div>
                  {isEditing ? (
                    <div className="space-y-3">
                      <input
                        type="text"
                        value={cardName}
                        onChange={e => setCardName(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold uppercase text-sm focus:bg-white focus:border-primary/30 outline-none"
                        placeholder="Card Description"
                      />
                      <input
                        type="text"
                        value={version}
                        onChange={e => setVersion(e.target.value)}
                        className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl font-bold uppercase text-sm focus:bg-white focus:border-primary/30 outline-none"
                        placeholder="Version (e.g. Ltd Edition)"
                      />
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <p className="font-heading text-lg font-black text-foreground uppercase leading-none">{cardName}</p>
                      {version && <p className="text-sm font-black text-primary uppercase tracking-wider">{version}</p>}
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                    <Calendar size={14} /> Acquired
                  </div>
                  <p className="text-lg font-black text-foreground/60 uppercase">{new Date(photocard.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            </div>

            {/* Notes Section */}
            <div className="space-y-4 border-t border-gray-100">
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/30">
                Notes
              </div>
              {isEditing ? (
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full p-6 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-[32px] text-sm font-medium resize-none h-48 outline-none transition-all placeholder:italic"
                  placeholder="Describe condition of card, where/when it's acquired, etc."
                />
              ) : (
                <div className="bg-white p-5 rounded-[20px] border-2 border-gray-50 shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 pointer-events-none" />
                  <p className="relative z-10 text-md md:text-md text-foreground/80 leading-relaxed">
                    {notes || "No extra memories recorded for this photocard yet. Click edit to start journaling."}
                  </p>
                </div>
              )}
            </div>

            {/* Danger Zone */}
            {isEditing && (
              <div className="pt-10 space-y-6">
                <div className="h-px bg-red-100 w-full" />
                <div className="flex items-center shadow-inner justify-between bg-red-50 p-8 rounded-[40px] border-2 border-white">
                  <div className="space-y-1">
                    <h4 className="text-lg font-black uppercase text-red-500 tracking-tight leading-none">Delete Photocard?</h4>
                    <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest opacity-60">Irreversibly remove from collection</p>
                  </div>
                  {showConfirmDelete ? (
                    <div className="flex gap-3">
                      <button onClick={() => setShowConfirmDelete(false)} className="px-6 py-3 bg-white text-foreground/40 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100">Stop</button>
                      <button onClick={() => onDelete(photocard.id)} className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">Goodbye</button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowConfirmDelete(true)}
                      className="p-4 bg-red-100 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all shadow-sm"
                    >
                      <Trash2 size={24} />
                    </button>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <AnimatePresence>
        {isEditorOpen && editingImage && (
          <ImageEditor
            image={editingImage}
            onSave={handleSaveEditedImage}
            onCancel={() => { setIsEditorOpen(false); setEditingImage(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
