/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Upload, Trash2, Save, Trash, Edit3, Copy } from 'lucide-react';
import { Status, Photocard, Condition } from '../types';
import { useImageUpload } from '../hooks/useImageUpload';
import ImageEditor from './ImageEditor';

interface PhotocardFormProps {
  initialData?: Photocard | null;
  onSubmit: (pc: Photocard) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

export default function PhotocardForm({ initialData, onSubmit, onDelete, onClose }: PhotocardFormProps) {
  const [group, setGroup] = useState(initialData?.group || '');
  const [member, setMember] = useState(initialData?.member || '');
  const [album, setAlbum] = useState(initialData?.album || '');
  const [era, setEra] = useState(initialData?.era || '');
  const [year, setYear] = useState<number>(Number(initialData?.year) || new Date().getFullYear());
  const [cardName, setCardName] = useState(initialData?.cardName || '');
  const [version, setVersion] = useState(initialData?.version || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [status, setStatus] = useState<Status>(initialData?.status || 'owned');
  const [condition, setCondition] = useState<Condition>(initialData?.condition || 'mint');
  const [isDuplicate, setIsDuplicate] = useState(!!initialData?.isDuplicate);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  
  const { 
    previewUrl, 
    removeImage, 
    updatePreview,
    uploadError 
  } = useImageUpload(initialData?.imageUrl || null);

  const handleImageFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setEditingImage(reader.result as string);
      setIsEditorOpen(true);
    };
    reader.readAsDataURL(file);
    
    // Reset file input so same file can be picked again
    e.target.value = '';
  };

  const handleSaveEditedImage = (croppedImage: string) => {
    updatePreview(croppedImage);
    setIsEditorOpen(false);
    setEditingImage(null);
  };
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const newPC: Photocard = {
      id: initialData?.id || Date.now().toString(),
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
      createdAt: initialData?.createdAt || Date.now(),
    };
    onSubmit(newPC);
    onClose();
  };

  const isEditing = !!initialData;

  const statusOptions: { value: Status; label: string; color: string }[] = [
    { value: 'owned', label: 'Owned', color: 'text-accent-green' },
    { value: 'on_the_way', label: 'On the Way', color: 'text-accent-blue' },
    { value: 'wishlist', label: 'Wishlist', color: 'text-secondary' },
  ];

  if (showConfirmDelete) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-red-500/40 backdrop-blur-md z-[150] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, rotate: -2 }}
          animate={{ scale: 1, rotate: 0 }}
          className="bg-white rounded-[40px] p-8 md:p-10 max-w-sm w-full text-center space-y-8 shadow-2xl relative border-8 border-red-50"
        >
          <div className="w-20 h-20 bg-red-50 text-red-500 rounded-3xl flex items-center justify-center mx-auto shadow-inner border-2 border-white/50 animate-bounce">
            <Trash size={32} />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-bold tracking-tight text-foreground">Delete Photocard?</h3>
            <p className="text-sm text-foreground/60 font-medium">This action cannot be undone. Are you sure you want to remove this card from your precious collection?</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={() => setShowConfirmDelete(false)}
              className="flex-1 py-4 bg-gray-50 text-foreground/40 rounded-[20px] font-black text-xs uppercase tracking-widest border-2 border-white transition-all hover:bg-white hover:text-foreground"
            >
              Wait!
            </button>
            <button
              onClick={() => initialData && onDelete && onDelete(initialData.id)}
              className="flex-1 py-4 bg-red-500 text-white rounded-[20px] font-black text-xs uppercase tracking-widest shadow-xl shadow-red-500/20 transition-all hover:scale-105 active:scale-95"
            >
              Goodbye
            </button>
          </div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-0 md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full h-full md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-[48px] overflow-hidden shadow-2xl relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-6 md:px-10 py-5 md:py-6 border-b border-gray-100 bg-white sticky top-0 z-30 font-sans">
          <div className="space-y-1">
            <h2 className="text-xl md:text-2xl font-bold text-foreground tracking-tight leading-tight">
              {isEditing ? 'Edit Card' : 'New Photocard'}
            </h2>
            <div className="flex items-center gap-2">
               <span className="w-1.5 h-1.5 bg-primary rounded-full" />
               <p className="text-[9px] font-black text-foreground/30 uppercase tracking-[0.2em]">{isEditing ? 'Updating Entry' : 'Adding to Binder'}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 md:p-3 bg-gray-50 hover:bg-white border-2 border-white hover:border-primary/20 rounded-xl md:rounded-2xl transition-all text-foreground/20 hover:text-primary shadow-sm hover:shadow-md"
          >
            <X className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar bg-white">
          <form id="photocard-form" onSubmit={handleSubmit} className="p-6 md:p-10 space-y-8 md:space-y-10 pb-24">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 md:gap-10">
              <div className="space-y-6 md:space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">K-Pop Group</label>
                    <input
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                      placeholder="e.g. aespa"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Idol / Member</label>
                    <input
                      required
                      type="text"
                      value={member}
                      onChange={(e) => setMember(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                      placeholder="e.g. Karina"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Album Name</label>
                    <input
                      required
                      type="text"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                      placeholder="e.g. Drama"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Era / Version</label>
                    <input
                      type="text"
                      value={era}
                      onChange={(e) => setEra(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                      placeholder="e.g. Scene Ver."
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 md:gap-6">
                  <div className="sm:col-span-3 space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Card Name</label>
                    <input
                      required
                      type="text"
                      value={cardName}
                      onChange={(e) => setCardName(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                      placeholder="e.g. Intro Selfie"
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-1.5">
                    <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Year</label>
                    <input
                      required
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-black text-center focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all appearance-none"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                  <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 text-center lg:text-left">Card Image</label>
                  <div 
                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                    className={`flex-1 min-h-[280px] md:min-h-[320px] bg-gray-50 rounded-[32px] md:rounded-[40px] border-4 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative group ${
                      previewUrl ? 'border-transparent shadow-inner' : 'border-gray-100 hover:border-primary/30 cursor-pointer'
                    }`}
                  >
                    {previewUrl ? (
                      <>
                       <img src={previewUrl} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                       <div className="absolute top-4 right-4 flex flex-col gap-3">
                         <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); setEditingImage(previewUrl); setIsEditorOpen(true); }}
                           className="bg-white/90 backdrop-blur shadow-xl text-primary p-2 md:p-3 rounded-xl md:rounded-2xl hover:scale-110 active:scale-95 transition-all border border-white/50"
                           title="Edit Image"
                         >
                           <Edit3 className="w-4.5 h-4.5 md:w-5 md:h-5" />
                         </button>
                         <button
                           type="button"
                           onClick={(e) => { e.stopPropagation(); removeImage(); }}
                           className="bg-white/90 backdrop-blur shadow-xl text-red-500 p-2 md:p-3 rounded-xl md:rounded-2xl hover:scale-110 active:scale-95 transition-all border border-white/50"
                           title="Remove Image"
                         >
                           <Trash2 className="w-4.5 h-4.5 md:w-5 md:h-5" />
                         </button>
                       </div>
                      </>
                    ) : (
                      <>
                        <div className="relative z-10 flex flex-col items-center gap-4">
                          <div className="w-12 h-12 md:w-16 md:h-16 bg-white rounded-xl md:rounded-2xl flex items-center justify-center shadow-xl shadow-primary/5 transition-all group-hover:scale-110 group-hover:rotate-6 border border-gray-50">
                            <ImageIcon className="text-primary w-6 h-6 md:w-7 md:h-7" />
                          </div>
                          <div className="text-center space-y-1">
                             <span className="block text-[10px] md:text-[11px] font-black text-foreground uppercase tracking-widest">Select Image</span>
                             <span className="block text-[9px] font-medium text-foreground/20 italic">PNG, JPG, etc.</span>
                          </div>
                        </div>
                      </>
                    )}
                    <input 
                      type="file" 
                      hidden 
                      ref={fileInputRef} 
                      accept="image/*" 
                      onChange={handleImageFileSelect}
                    />
                  </div>
                 <AnimatePresence>
                  {uploadError && (
                    <motion.p 
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-[9px] md:text-[10px] font-bold text-red-500 uppercase text-center mt-2"
                    >
                      {uploadError}
                    </motion.p>
                  )}
                 </AnimatePresence>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 border-t border-gray-50 pt-8 md:pt-10">
              <div className="space-y-4">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Binder Status</label>
                <div className="flex bg-gray-50 p-1.5 md:p-2 rounded-2xl md:rounded-[24px] gap-1.5 md:gap-2">
                  {statusOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className={`flex-1 py-2.5 md:py-3 rounded-xl md:rounded-[18px] text-[9px] font-black transition-all uppercase tracking-tighter ${
                        status === opt.value ? `bg-white shadow-xl shadow-black/5 ${opt.color}` : 'text-foreground/30 hover:text-foreground hover:bg-white/50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Card Condition</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-2 lg:grid-cols-5 gap-1.5 md:gap-2 bg-gray-50 p-1.5 md:p-2 rounded-2xl md:rounded-[24px]">
                  {(['mint', 'near_mint', 'good', 'fair', 'poor'] as Condition[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      disabled={status === 'on_the_way' || status === 'wishlist'}
                      onClick={() => setCondition(c)}
                      className={`py-2.5 md:py-3 rounded-xl md:rounded-[18px] text-[9px] font-black transition-all uppercase tracking-tighter ${
                        condition === c ? 'bg-white shadow-xl shadow-black/5 text-primary' : 'text-foreground/30 hover:text-foreground hover:bg-white/50'
                      } disabled:opacity-20 disabled:cursor-not-allowed`}
                    >
                      {c.replace('_', ' ')}
                    </button>
                  ))}
                </div>
                {(status === 'on_the_way' || status === 'wishlist') && (
                  <p className="text-[8px] md:text-[9px] font-bold text-primary italic uppercase tracking-wider ml-1">Condition hidden until card arrives</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10 items-start">
              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Version / Variant</label>
                <input
                  required
                  type="text"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/10"
                  placeholder="e.g. Rare holo"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Inventory Rules</label>
                <button
                  type="button"
                  disabled={status === 'on_the_way' || status === 'wishlist'}
                  onClick={() => setIsDuplicate(!isDuplicate)}
                  className={`flex items-center justify-center gap-3 w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-[24px] border-2 transition-all font-black text-[9px] md:text-[10px] uppercase tracking-widest ${
                    isDuplicate ? 'bg-purple-500 border-purple-400 text-white shadow-xl shadow-purple-500/20 scale-[1.01]' : 'bg-gray-50/50 border-gray-100 text-foreground/20 hover:text-foreground/30'
                  } disabled:opacity-30`}
                >
                  <Copy size={16} />
                  Duplicate (Have Multiples)
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Personal Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 md:px-6 py-4 md:py-6 bg-gray-50/50 border-gray-100 border-2 rounded-2xl md:rounded-[32px] text-xs md:text-sm font-bold focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all h-28 md:h-36 resize-none placeholder:text-foreground/10 custom-scrollbar"
                placeholder="Where you got it, price, trade plans..."
              />
            </div>
          </form>
        </div>

        <div className="shrink-0 flex gap-3 md:gap-4 p-4 md:px-10 md:pb-6 md:pt-4 bg-white border-t border-gray-50 z-30 shadow-[0_-10px_20px_-10px_rgba(0,0,0,0.05)]">
          {isEditing && (
            <button
              type="button"
              onClick={() => setShowConfirmDelete(true)}
              className="h-12 md:h-14 w-12 md:w-14 bg-red-50 text-red-500 rounded-xl md:rounded-2xl font-black flex items-center justify-center hover:bg-red-500 hover:text-white transition-all border-white border-2 md:border-4 shadow-sm group shrink-0"
            >
              <Trash2 className="w-5 h-5 md:w-6 md:h-6" />
            </button>
          )}
          <button
            type="submit"
            form="photocard-form"
            className="flex-1 h-12 md:h-14 bg-primary text-white rounded-xl md:rounded-2xl font-black uppercase tracking-widest text-xs md:text-sm shadow-lg shadow-primary/30 hover:scale-[1.01] active:scale-[0.98] transition-all flex items-center justify-center gap-2 md:gap-3 group border-white/10 border-2 md:border-4"
          >
            {isEditing ? <Save size={20} /> : <Upload size={20} className="group-hover:translate-y-[-2px] transition-transform" />}
            {isEditing ? 'Save Changes' : 'Add to Collection'}
          </button>
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
      </motion.div>
    </motion.div>
  );
}
