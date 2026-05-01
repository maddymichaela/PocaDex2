/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { X, Image as ImageIcon, Upload, Trash2, Save, Trash, Edit3, Copy } from 'lucide-react';
import { Status, Photocard, Condition, PHOTOCARD_CATEGORIES, PhotocardCategory, getPhotocardCategory, normalizePhotocardForSave } from '../types';
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
  const [category, setCategory] = useState<PhotocardCategory>(initialData ? getPhotocardCategory(initialData) : 'Album');
  const [source, setSource] = useState(initialData?.source || '');
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
    const newPC: Photocard = normalizePhotocardForSave({
      id: initialData?.id || Date.now().toString(),
      group,
      member,
      category,
      source,
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
    });
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
    return createPortal(
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[220] flex items-center justify-center bg-red-500/40 p-0 backdrop-blur-md md:p-4"
      >
        <motion.div
          initial={{ scale: 0.9, rotate: -2 }}
          animate={{ scale: 1, rotate: 0 }}
          className="relative flex h-full w-full flex-col justify-center space-y-8 bg-white p-8 text-center shadow-2xl md:h-auto md:max-w-sm md:rounded-[40px] md:border-8 md:border-red-50 md:p-10"
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
      </motion.div>,
      document.body
    );
  }

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-0 backdrop-blur-sm md:p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="relative flex h-full w-full flex-col overflow-hidden bg-white shadow-2xl md:h-auto md:max-h-[90dvh] md:max-w-4xl md:rounded-[40px]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 md:px-10 py-4 md:py-6 border-b border-gray-100 bg-white sticky top-0 z-30 font-sans">
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
          <form id="photocard-form" onSubmit={handleSubmit} className="p-5 md:p-10 space-y-6 md:space-y-8 pb-24">
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(240px,0.75fr)_minmax(0,1.25fr)] gap-6 md:gap-8 xl:items-stretch">
              <div className="flex flex-col items-center gap-3 xl:h-full xl:items-stretch">
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1 text-center xl:text-left">Card Image</label>
                  <div 
                    onClick={() => !previewUrl && fileInputRef.current?.click()}
                    className={`w-full max-w-[220px] aspect-[650/1000] bg-gray-50 rounded-[28px] md:max-w-[260px] md:rounded-[32px] xl:max-w-none xl:flex-1 border-4 border-dashed flex flex-col items-center justify-center transition-all overflow-hidden relative group ${
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

              <div className="space-y-3 md:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Group *</label>
                    <input
                      required
                      type="text"
                      value={group}
                      onChange={(e) => setGroup(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="Stray Kids"
                    />
                  </div>
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Member *</label>
                    <input
                      required
                      type="text"
                      value={member}
                      onChange={(e) => setMember(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="Felix"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Category *</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as PhotocardCategory)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all"
                    >
                      {PHOTOCARD_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  {category === 'Album' ? (
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Album *</label>
                    <input
                      required
                      type="text"
                      value={album}
                      onChange={(e) => setAlbum(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="DO IT"
                    />
                  </div>
                  ) : (
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Source *</label>
                    <input
                      required
                      type="text"
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="Soundwave"
                    />
                  </div>
                  )}
                  <div className="space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Era</label>
                    <input
                      type="text"
                      value={era}
                      onChange={(e) => setEra(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="DO IT"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 md:gap-4">
                  <div className="sm:col-span-3 space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Version</label>
                    <input
                      type="text"
                      value={version}
                      onChange={(e) => setVersion(e.target.value)}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                      placeholder="Felix Accordion ver."
                    />
                  </div>
                  <div className="sm:col-span-1 space-y-0">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Year</label>
                    <input
                      type="number"
                      value={year}
                      onChange={(e) => setYear(Number(e.target.value))}
                      className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal text-center focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all appearance-none"
                      placeholder="2025"
                    />
                  </div>
                </div>

                <div className="space-y-0">
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Photocard Name *</label>
                  <input
                    required
                    type="text"
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    className="w-full px-4 md:px-6 py-3 md:py-4 bg-gray-50/50 border-gray-100 border-2 rounded-xl md:rounded-[24px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all placeholder:text-foreground/35"
                    placeholder="Felix DO IT photocard"
                  />
                </div>

                <div className="space-y-0">
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Do you have duplicates of this card?</label>
                  <button
                    type="button"
                    disabled={status === 'on_the_way' || status === 'wishlist'}
                    onClick={() => setIsDuplicate(!isDuplicate)}
                    className={`flex items-center justify-center gap-3 w-full px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-[24px] border-2 transition-all text-xs md:text-sm font-medium ${
                      isDuplicate ? 'bg-primary/10 border-primary/25 text-primary shadow-md shadow-primary/10' : 'bg-gray-50/50 border-gray-100 text-foreground/45 hover:text-foreground/60'
                    } disabled:opacity-30`}
                  >
                    <Copy size={16} />
                    {isDuplicate ? 'Yes, I have extra(s)' : "No, I don't have extras"}
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 border-t border-gray-50 pt-6 md:pt-8">
              <div className="space-y-0">
                <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Status *</label>
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

              <div className="space-y-0">
                <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Condition</label>
                <div className="grid grid-cols-3 sm:grid-cols-5 md:grid-cols-2 xl:grid-cols-5 gap-1.5 md:gap-2 bg-gray-50 p-1.5 md:p-2 rounded-2xl md:rounded-[24px]">
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

            <div className="space-y-0">
              <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-4 md:px-6 py-4 md:py-6 bg-gray-50/50 border-gray-100 border-2 rounded-2xl md:rounded-[32px] text-xs md:text-sm font-normal focus:ring-4 focus:ring-primary/10 focus:bg-white focus:border-primary/20 outline-none transition-all h-28 md:h-36 resize-none placeholder:text-foreground/35 custom-scrollbar"
                placeholder="Pulled from DO IT album, Felix Accordion ver."
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
            className="btn-primary-pink group flex h-12 flex-1 items-center justify-center gap-2 rounded-xl border-2 border-white/10 text-xs font-black uppercase tracking-widest md:h-14 md:gap-3 md:rounded-2xl md:border-4 md:text-sm"
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
    </motion.div>,
    document.body
  );
}
