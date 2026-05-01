import { useState, useRef, FormEvent, ChangeEvent } from 'react';
import { AnimatePresence } from 'motion/react';
import { ChevronLeft, Image as ImageIcon, Save, Upload, Trash2, Edit3 } from 'lucide-react';
import { Status, Photocard, Condition, PHOTOCARD_CATEGORIES, PhotocardCategory, getPhotocardCategory, getPhotocardMembers, getPhotocardTemplateId, normalizePhotocardForSave } from '../types';
import { useImageUpload } from '../hooks/useImageUpload';
import ImageEditor from '../components/ImageEditor';
import MemberTagInput from '../components/MemberTagInput';
import { placeholderImage } from '../lib/assets';

interface CardFormProps {
  initialData?: Photocard | null;
  onSubmit: (pc: Photocard) => void;
  onDelete?: (id: string) => void;
  onBack: () => void;
}

export default function CardForm({ initialData, onSubmit, onDelete, onBack }: CardFormProps) {
  const isEditing = !!initialData;

  const [group, setGroup] = useState(initialData?.group || '');
  const [members, setMembers] = useState<string[]>(initialData ? getPhotocardMembers(initialData) : []);
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

  const { previewUrl, removeImage, updatePreview } = useImageUpload(initialData?.imageUrl || null);
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

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (members.length === 0) return;
    onSubmit(normalizePhotocardForSave({
      id: initialData?.id || Date.now().toString(),
      cardTemplateId: initialData ? getPhotocardTemplateId(initialData) : undefined,
      ownerUserId: initialData?.ownerUserId,
      group,
      members,
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
    }));
  };

  return (
    <div className="min-h-full bg-gray-50/30">
      <div className="sticky top-0 z-40 border-b border-gray-100 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-6">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-2 rounded-2xl px-4 py-2 transition-all hover:bg-gray-100"
          >
            <ChevronLeft className="text-foreground/40 transition-colors group-hover:text-primary" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-foreground/40 group-hover:text-foreground">
              {isEditing ? 'Back to Card' : 'Back to Binder'}
            </span>
          </button>
          <div className={`${isEditing ? 'hidden md:block' : ''} min-w-0 text-center`}>
            <h2 className="truncate text-xl font-bold tracking-tight text-foreground md:text-2xl">
              {isEditing ? 'Edit Card' : 'New Photocard'}
            </h2>
            <p className="hidden text-[9px] font-black uppercase tracking-[0.2em] text-foreground/30 sm:block">
              {isEditing ? 'Updating entry' : 'Adding to binder'}
            </p>
          </div>
          <button
            type="submit"
            form="card-form"
            className="btn-primary-pink flex items-center gap-2 rounded-xl px-4 py-2.5 text-[10px] font-black uppercase tracking-widest md:px-6"
          >
            {isEditing ? <Save size={14} /> : <Upload size={14} />}
            {isEditing ? 'Save Changes' : 'Add to Collection'}
          </button>
        </div>
      </div>

      <form id="card-form" onSubmit={handleSubmit}>
        <div className="max-w-6xl mx-auto p-4 pb-8 md:px-6 md:py-5 xl:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 md:gap-5 xl:gap-8 items-start">

            {/* Left Column: Image */}
            <div className="mx-auto w-full max-w-[320px] space-y-3 md:sticky md:top-5 md:col-span-4 md:max-w-[300px] xl:max-w-[340px]">
              <div
                className={`relative aspect-[650/1000] w-full rounded-[48px] overflow-hidden shadow-md border-[6px] border-white ring-1 ring-black/5 ${!previewUrl ? 'cursor-pointer' : ''}`}
                onClick={() => !previewUrl && fileInputRef.current?.click()}
              >
                <img
                  src={previewUrl || placeholderImage}
                  className={`w-full h-full object-cover transition-all duration-500 ${!previewUrl ? 'scale-[1.02] opacity-20 blur-[1px]' : ''}`}
                  referrerPolicy="no-referrer"
                />

                {!previewUrl && (
                  <div className="absolute inset-2 flex flex-col items-center justify-center gap-5 rounded-[40px] border-[3px] border-dashed border-primary/25 bg-primary/[0.04]">
                    <div className="flex h-20 w-20 items-center justify-center rounded-[28px] bg-white shadow-xl shadow-primary/10 ring-1 ring-primary/10">
                      <ImageIcon size={34} className="text-primary" />
                    </div>
                    <div className="space-y-2 text-center">
                      <p className="font-heading text-2xl font-bold tracking-tight text-primary/45">Upload Photo</p>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-foreground/35">Click to add an image</p>
                    </div>
                  </div>
                )}
              </div>

              {previewUrl ? (
                <div className="flex flex-col gap-2">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => { setEditingImage(previewUrl); setIsEditorOpen(true); }}
                      className="flex-1 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-primary hover:bg-primary/5 transition-all flex items-center justify-center gap-2"
                    >
                      <Edit3 size={13} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1 py-3 bg-white border border-gray-100 rounded-2xl text-[10px] font-black uppercase tracking-widest text-foreground/60 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
                    >
                      <ImageIcon size={13} /> Change
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="w-full py-3 bg-red-50 rounded-2xl text-[10px] font-black uppercase tracking-widest text-red-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 size={13} /> Remove Image
                  </button>
                </div>
              ) : null}

              <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleImageFileSelect} />
            </div>

            {/* Right Column: Form Fields */}
            <div className="md:col-span-8 flex flex-col gap-6 md:pt-4">

              {/* Group + Member */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Group</label>
                  <input
                    type="text"
                    value={group}
                    onChange={e => setGroup(e.target.value)}
                    className="w-full rounded-[16px] border-2 border-gray-100 bg-white px-4 py-3 text-base font-semibold text-primary outline-none transition-all focus:border-primary/30 md:rounded-[20px] md:px-6 md:py-4 md:text-xl"
                    placeholder="Group Name"
                  />
                </div>
                <div>
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40 ml-1">Member *</label>
                  <MemberTagInput
                    members={members}
                    onChange={setMembers}
                    className="rounded-[16px] border-2 border-gray-100 bg-white px-4 py-2 text-base font-semibold text-foreground transition-all focus-within:border-primary/30 md:rounded-[20px] md:px-6 md:py-3 md:text-xl"
                    inputClassName="placeholder:text-foreground/35"
                    placeholder="Member Name"
                  />
                </div>
              </div>

              {/* Details */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Category *</label>
                    <select value={category} onChange={e => setCategory(e.target.value as PhotocardCategory)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all">
                      {PHOTOCARD_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                    </select>
                  </div>
                  {category === 'Album' ? (
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Album *</label>
                    <input required type="text" value={album} onChange={e => setAlbum(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all" placeholder="Album Title" />
                  </div>
                  ) : (
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Source *</label>
                    <input required type="text" value={source} onChange={e => setSource(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all" placeholder="Soundwave, Withmuu, Fanmeeting" />
                  </div>
                  )}
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Era</label>
                    <input type="text" value={era} onChange={e => setEra(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all" placeholder="Era" />
                  </div>
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Version</label>
                    <input type="text" value={version} onChange={e => setVersion(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all" placeholder="Version" />
                  </div>
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Year</label>
                    <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all appearance-none" placeholder="2025" />
                  </div>
                  <div className="xl:col-span-2">
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Photocard Name</label>
                    <input type="text" value={cardName} onChange={e => setCardName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border-2 border-transparent rounded-xl text-sm focus:bg-white focus:border-primary/30 outline-none transition-all" placeholder="Photocard Name" />
                  </div>
                </div>
              </div>

              {/* Status / Condition / Duplicate */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6 space-y-5">
                {/* Status + Duplicates row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Status *</label>
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl h-10">
                      {([['owned', 'Owned'], ['on_the_way', 'On the Way'], ['wishlist', 'Wishlist']] as const).map(([val, label]) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setStatus(val)}
                          className={`flex-1 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${status === val ? 'bg-white shadow-sm text-primary' : 'text-foreground/30 hover:text-foreground/60'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Duplicates</label>
                    <div className="flex gap-1 bg-gray-50 p-1 rounded-xl h-10">
                      <button
                        type="button"
                        onClick={() => setIsDuplicate(false)}
                        className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${!isDuplicate ? 'bg-white shadow-sm text-foreground' : 'text-foreground/30 hover:text-foreground/60'}`}
                      >
                        No
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsDuplicate(true)}
                        className={`flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${isDuplicate ? 'bg-primary shadow-sm text-white' : 'text-foreground/30 hover:text-foreground/60'}`}
                      >
                        Yes
                      </button>
                    </div>
                  </div>
                </div>

                {/* Condition — full width button group */}
                <div className={status !== 'owned' ? 'opacity-30 pointer-events-none' : ''}>
                  <label className="block mb-[5px] text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Condition</label>
                  <div className="flex gap-1 bg-gray-50 p-1 rounded-xl">
                    {(['mint', 'near_mint', 'good', 'fair', 'poor'] as Condition[]).map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCondition(c)}
                        className={`flex-1 py-2 rounded-lg text-[9px] font-black uppercase tracking-tighter transition-all ${condition === c ? 'bg-white shadow-sm text-primary' : 'text-foreground/30 hover:text-foreground/60'}`}
                      >
                        {c.replace('_', ' ')}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-6">
                <label className="block mb-3 text-[9px] md:text-[10px] font-black uppercase tracking-widest text-foreground/40">Notes</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  className="w-full px-5 py-4 bg-gray-50 border-2 border-transparent focus:border-primary/30 focus:bg-white rounded-2xl text-sm font-medium resize-none h-36 outline-none transition-all placeholder:italic placeholder:text-foreground/30"
                  placeholder="Describe condition, where/when acquired, etc."
                />
              </div>

              {/* Delete section — editing only */}
              {isEditing && onDelete && (
                <div className="pt-4 space-y-4">
                  <div className="h-px bg-red-100 w-full" />
                  <div className="flex items-center shadow-inner justify-between bg-red-50 p-8 rounded-[40px] border-2 border-white">
                    <div className="space-y-1">
                      <h4 className="text-xl font-bold text-red-500 tracking-tight leading-none">Delete Photocard?</h4>
                      <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest opacity-60">Irreversibly remove from collection</p>
                    </div>
                    {showConfirmDelete ? (
                      <div className="flex gap-3">
                        <button type="button" onClick={() => setShowConfirmDelete(false)} className="px-6 py-3 bg-white text-foreground/40 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100">Stop</button>
                        <button type="button" onClick={() => onDelete(initialData!.id)} className="px-6 py-3 bg-red-500 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest animate-pulse">Goodbye</button>
                      </div>
                    ) : (
                      <button
                        type="button"
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
      </form>

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
