import { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import { Upload, Grid3x3, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, ChevronDown, Plus, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Area } from 'react-easy-crop';
import { detectTemplate, cropImageFromRect, fitCropRectToCardAspect, trimBackground, PHOTOCARD_TEMPLATES, templateCellRects, GridTemplate } from '../lib/crop-pipeline';
import { insertPhotocard } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { Status, Condition, Photocard } from '../types';
import ImageEditor, { ImageEditorState } from '../components/ImageEditor';

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewCard {
  id: string;
  cropUrl: string;
  cropAreaPixels: Area;
  cropperState: ImageEditorState;
  member: string;
  group: string;
  album: string;
  era: string;
  cardName: string;
  version: string;
  year: number;
  status: Status;
  condition: Condition;
  isDuplicate: boolean;
  notes: string;
  selected: boolean;
}

type Step = 'upload' | 'detecting' | 'review' | 'saving' | 'done';
const DEFAULT_TEMPLATE = PHOTOCARD_TEMPLATES[5]; // 2×4 is the most reliable common fan-template layout.

// ── Helpers ────────────────────────────────────────────────────────────────

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function makeId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function rectToArea(crop: { x: number; y: number; w: number; h: number }, img: HTMLImageElement): Area {
  return {
    x: Math.round(crop.x * img.naturalWidth),
    y: Math.round(crop.y * img.naturalHeight),
    width: Math.max(1, Math.round(crop.w * img.naturalWidth)),
    height: Math.max(1, Math.round(crop.h * img.naturalHeight)),
  };
}

function emptyReviewCard(cropUrl: string, cropAreaPixels: Area): ReviewCard {
  return {
    id: makeId(),
    cropUrl,
    cropAreaPixels,
    cropperState: {
      crop: { x: 0, y: 0 },
      zoom: 1,
      rotation: 0,
      croppedAreaPixels: cropAreaPixels,
      hasUserPosition: false,
    },
    member: '',
    group: '',
    album: '',
    era: '',
    cardName: '',
    version: '',
    year: new Date().getFullYear(),
    status: 'owned',
    condition: 'mint',
    isDuplicate: false,
    notes: '',
    selected: true,
  };
}

function manualTemplate(rows: number, cols: number, selectedGrid: GridTemplate): GridTemplate {
  const safeRows = Math.max(1, Math.min(20, rows));
  const safeCols = Math.max(1, Math.min(20, cols));
  if (selectedGrid.rows === safeRows && selectedGrid.cols === safeCols) return selectedGrid;
  return {
    name: `${safeCols}×${safeRows}`,
    rows: safeRows,
    cols: safeCols,
    margin: { top: 0.02, bottom: 0.02, left: 0.02, right: 0.02 },
    gap: {
      row: safeRows > 1 ? 0.012 : 0,
      col: safeCols > 1 ? 0.012 : 0,
    },
  };
}

function fieldClass(label: string) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">
      {label}
    </label>
  );
}
void fieldClass; // used inline below

// ── Editable field ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder, required = false, invalid = false }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string; required?: boolean; invalid?: boolean;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">
        {label}{required ? ' *' : ''}
      </label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        aria-required={required}
        className={`w-full px-2 py-1.5 rounded-xl border bg-white/80 text-xs font-medium text-foreground placeholder:text-foreground/25 focus:outline-none transition-colors ${invalid ? 'border-red-200 focus:border-red-400' : 'border-gray-100 focus:border-primary/40'}`}
      />
    </div>
  );
}

// ── Bulk field (apply one value to all selected cards) ─────────────────────

function BulkField({ label, placeholder, onApply, required = false }: {
  label: string; placeholder?: string; onApply: (v: string) => void; required?: boolean;
}) {
  const [val, setVal] = useState('');
  return (
    <div className="flex w-full min-w-0 items-end gap-2">
      <div className="min-w-0 flex-1">
        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">
          {label}{required ? ' *' : ''}
        </label>
        <input
          value={val}
          onChange={e => setVal(e.target.value)}
          placeholder={placeholder ?? label}
          className="w-full px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40"
        />
      </div>
      <button
        onClick={() => { if (val.trim()) { onApply(val.trim()); setVal(''); } }}
        className="px-2.5 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-tight hover:bg-primary hover:text-white transition-all"
      >
        Fill
      </button>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Scan({ onDone, onImported }: { onDone: () => void; onImported?: (cards: Photocard[]) => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [selectedGrid, setSelectedGrid] = useState(DEFAULT_TEMPLATE);
  const [manualRows, setManualRows] = useState(DEFAULT_TEMPLATE.rows);
  const [manualCols, setManualCols] = useState(DEFAULT_TEMPLATE.cols);
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);
  const [isAddingManualCrop, setIsAddingManualCrop] = useState(false);

  const selectedCards = cards.filter(c => c.selected);
  const missingRequiredCount = selectedCards.filter(c => !c.group.trim() || !c.member.trim() || !c.cardName.trim()).length;
  const canSaveSelectedCards = selectedCards.length > 0 && missingRequiredCount === 0;

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Image must be under 15MB.'); return; }
    setError(null);
    setCards([]);
    setSavedCount(0);
    setEditingCropId(null);
    setIsAddingManualCrop(false);
    setStep('upload');
    const reader = new FileReader();
    reader.onload = e => setTemplateUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  // ── Grid Detection ────────────────────────────────────────────────────────

  const makeReviewCardFromCrop = useCallback(async (img: HTMLImageElement, crop: { x: number; y: number; w: number; h: number }) => {
    const trimmed = await trimBackground(img, crop);
    const fitted = fitCropRectToCardAspect(img, trimmed);
    const cropUrl = cropImageFromRect(img, fitted);
    return emptyReviewCard(cropUrl, rectToArea(fitted, img));
  }, []);

  const runGridDetect = useCallback(async () => {
    if (!templateUrl) return;
    setStep('detecting');
    setError(null);
    try {
      const img = await loadImage(templateUrl);
      const result = detectTemplate(img);
      const cells = result?.cells ?? [];
      if (result) {
        setSelectedGrid(result.template);
        setManualRows(result.detectedRows);
        setManualCols(result.detectedCols);
      }

      const reviewCards: ReviewCard[] = await Promise.all(
        cells.flat().map(cell => makeReviewCardFromCrop(img, cell))
      );

      setCards(reviewCards);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grid detection failed.');
      setStep('upload');
    }
  }, [makeReviewCardFromCrop, templateUrl]);

  // ── Manual grid (no image analysis) ──────────────────────────────────────

  const runManualGrid = useCallback(async () => {
    if (!templateUrl) return;
    setStep('detecting');
    setError(null);
    try {
      const img = await loadImage(templateUrl);
      const template = manualTemplate(manualRows, manualCols, selectedGrid);
      const cells = templateCellRects(template);
      const reviewCards: ReviewCard[] = [];

      for (const row of cells) {
        for (const box of row) {
          reviewCards.push(await makeReviewCardFromCrop(img, box));
        }
      }

      setCards(reviewCards);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to splice grid.');
      setStep('upload');
    }
  }, [makeReviewCardFromCrop, templateUrl, manualRows, manualCols, selectedGrid]);

  // ── Card field update ─────────────────────────────────────────────────────

  const updateCard = (id: string, patch: Partial<ReviewCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const toggleAll = () => {
    const allSelected = cards.every(c => c.selected);
    setCards(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  const handleSaveEditedCrop = (croppedImage: string, editorState?: ImageEditorState) => {
    if (!editingCropId) return;
    updateCard(editingCropId, {
      cropUrl: croppedImage,
      ...(editorState ? { cropperState: editorState } : {}),
      ...(editorState?.croppedAreaPixels ? { cropAreaPixels: editorState.croppedAreaPixels } : {}),
    });
    setEditingCropId(null);
  };

  const handleCancelCropEdit = (editorState?: ImageEditorState) => {
    if (editingCropId && editorState) {
      updateCard(editingCropId, {
        cropperState: editorState,
        ...(editorState.croppedAreaPixels ? { cropAreaPixels: editorState.croppedAreaPixels } : {}),
      });
    }
    setEditingCropId(null);
  };

  const handleSaveManualCrop = (croppedImage: string, editorState?: ImageEditorState) => {
    const cropAreaPixels = editorState?.croppedAreaPixels;
    if (!cropAreaPixels) {
      setIsAddingManualCrop(false);
      return;
    }
    setCards(prev => [...prev, emptyReviewCard(croppedImage, cropAreaPixels)]);
    setStep('review');
    setIsAddingManualCrop(false);
  };

  const handleCancelManualCrop = () => {
    setIsAddingManualCrop(false);
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || !canSaveSelectedCards) return;
    setStep('saving');
    let count = 0;
    const savedCards: Photocard[] = [];
    for (const card of selectedCards) {
      try {
        const saved = await insertPhotocard(user.id, {
          id: card.id,
          group: card.group || undefined,
          member: card.member,
          album: card.album,
          era: card.era || undefined,
          year: card.year,
          cardName: card.cardName,
          version: card.version || '',
          status: card.status,
          condition: card.status === 'owned' ? card.condition : undefined as Condition | undefined,
          isDuplicate: card.isDuplicate,
          notes: card.notes || undefined,
          imageUrl: card.cropUrl,
          createdAt: Date.now(),
        });
        savedCards.push(saved);
        count++;
      } catch (err) {
        console.error('Failed to save card:', err);
      }
    }
    if (savedCards.length > 0) onImported?.(savedCards);
    setSavedCount(count);
    setStep('done');
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const resetDetection = () => {
    setStep('upload');
    setCards([]);
    setError(null);
    setSavedCount(0);
    setEditingCropId(null);
    setIsAddingManualCrop(false);
  };

  const uploadNewTemplate = () => {
    resetDetection();
    setTemplateUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-foreground tracking-tight">Scan Template</h2>
          <p className="text-sm text-foreground/40 font-medium mt-1">Upload a fan template to auto-splice and import photocards</p>
        </div>
      </div>

      {/* Error banner */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 p-4 rounded-2xl bg-red-50 border border-red-100">
            <AlertCircle size={16} className="text-red-400 shrink-0 mt-0.5" />
            <p className="text-sm font-medium text-red-600">{error}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── STEP: Upload ── */}
      {step === 'upload' && (
        <div className="space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={onDrop}
            onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            className={`relative flex flex-col items-center justify-center gap-4 p-16 rounded-3xl border-2 border-dashed cursor-pointer transition-all ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-primary/2'}`}
          >
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-colors ${isDragging ? 'bg-primary text-white' : 'bg-accent text-primary'}`}>
              <Upload size={28} />
            </div>
            <div className="text-center">
              <p className="font-black text-foreground uppercase tracking-tight">Drop template image here</p>
              <p className="text-sm text-foreground/40 font-medium mt-1">or click to browse · PNG, JPG, WEBP · max 15MB</p>
            </div>
            <p className="text-xs text-foreground/30 font-medium">Works with fan templates from Twitter/X, Discord, etc.</p>
          </div>

          {/* Preview + detection options */}
          {templateUrl && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-card rounded-3xl p-4 border border-white/60">
                <img src={templateUrl} alt="Template preview" className="w-full max-h-72 object-contain rounded-2xl" />
              </div>

              {/* Detection controls */}
              <div className="glass-card rounded-3xl p-6 border border-white/60 space-y-4">
                <div className="space-y-3">
                  <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Grid splicing</p>
                  <p className="text-xs text-foreground/40 font-medium">
                    Auto-detects white separator lines, or pick the grid manually. You'll fill in card info after.
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-black uppercase tracking-widest text-foreground/40">Preset:</span>
                    <div className="relative">
                      <select
                        value={selectedGrid.name}
                        onChange={e => {
                          const next = PHOTOCARD_TEMPLATES.find(t => t.name === e.target.value)!;
                          setSelectedGrid(next);
                          setManualRows(next.rows);
                          setManualCols(next.cols);
                        }}
                        className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                      >
                        {PHOTOCARD_TEMPLATES.map(t => (
                          <option key={t.name} value={t.name}>{t.name} ({t.rows * t.cols} cards)</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                    </div>
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/40">
                      Rows
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={manualRows}
                        onChange={e => setManualRows(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                        className="w-16 rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-foreground outline-none focus:border-primary/50"
                      />
                    </label>
                    <label className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/40">
                      Columns
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={manualCols}
                        onChange={e => setManualCols(Math.max(1, Math.min(20, Number(e.target.value) || 1)))}
                        className="w-16 rounded-xl border border-gray-200 bg-white px-2 py-2 text-xs font-bold text-foreground outline-none focus:border-primary/50"
                      />
                    </label>
                    <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                      {manualRows * manualCols} cards
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <button onClick={runGridDetect}
                    className="btn-primary-pink flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-tight">
                    <Grid3x3 size={14} /> Auto-detect Grid
                  </button>
                  <button onClick={runManualGrid}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-foreground font-black text-sm uppercase tracking-tight hover:bg-gray-200 transition-all">
                    Use {manualCols}×{manualRows} Grid
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      )}

      {/* ── STEP: Detecting ── */}
      {step === 'detecting' && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
          <div className="text-center">
            <p className="font-black text-foreground uppercase tracking-tight text-xl">
              Splicing template…
            </p>
            <p className="text-sm text-foreground/40 font-medium mt-1">
              Detecting grid lines and cropping cards
            </p>
          </div>
        </div>
      )}

      {/* ── STEP: Review ── */}
      {step === 'review' && (
        <div className="space-y-5">
          {templateUrl && (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(260px,0.75fr)_minmax(0,1.25fr)]">
              <div className="glass-card rounded-2xl border border-white/60 p-4">
                <img src={templateUrl} alt="Template preview" className="max-h-80 w-full rounded-xl object-contain" />
              </div>
              <div className="glass-card rounded-2xl border border-white/60 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingManualCrop(true)}
                    className="btn-primary-pink flex items-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-tight"
                  >
                    <Plus size={14} /> Add Card Manually
                  </button>
                  <button
                    type="button"
                    onClick={runGridDetect}
                    className="flex items-center gap-2 rounded-2xl bg-primary/10 px-5 py-3 text-sm font-black uppercase tracking-tight text-primary transition-all hover:bg-primary hover:text-white"
                  >
                    <Grid3x3 size={14} /> Auto-detect Again
                  </button>
                  <button
                    type="button"
                    onClick={resetDetection}
                    className="flex items-center gap-2 rounded-2xl bg-gray-100 px-5 py-3 text-sm font-black uppercase tracking-tight text-foreground transition-all hover:bg-gray-200"
                  >
                    <RotateCcw size={14} /> Start Over
                  </button>
                  <button
                    type="button"
                    onClick={uploadNewTemplate}
                    className="flex items-center gap-2 rounded-2xl border border-gray-200 bg-white px-5 py-3 text-sm font-black uppercase tracking-tight text-foreground/55 transition-all hover:border-primary/30 hover:text-primary"
                  >
                    <Upload size={14} /> Upload New Template
                  </button>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary">
                    {cards.length} crop{cards.length !== 1 ? 's' : ''}
                  </div>
                  <div className="rounded-full bg-gray-100 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground/45">
                    Output 650×1000
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="glass-card rounded-2xl px-5 py-4 border border-white/60 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors">
                {cards.every(c => c.selected) ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
                {cards.every(c => c.selected) ? 'Deselect all' : 'Select all'}
              </button>
              <span className="text-xs font-bold text-foreground/40">
                {selectedCards.length} / {cards.length} selected
              </span>
            </div>

            {/* Bulk fill row */}
            <div className="border-t border-gray-100 pt-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-2">Fill selected cards:</p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <BulkField label="Group" placeholder="Stray Kids" required onApply={v => setCards(prev => prev.map(c => c.selected ? { ...c, group: v } : c))} />
                <BulkField label="Album" placeholder="DO IT" onApply={v => setCards(prev => prev.map(c => c.selected ? { ...c, album: v } : c))} />
                <BulkField label="Era" placeholder="DO IT" onApply={v => setCards(prev => prev.map(c => c.selected ? { ...c, era: v } : c))} />
                <BulkField label="Year" placeholder="2025" onApply={v => { const y = parseInt(v); if (!isNaN(y)) setCards(prev => prev.map(c => c.selected ? { ...c, year: y } : c)); }} />
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Status *</label>
                  <select
                    onChange={e => setCards(prev => prev.map(c => c.selected ? { ...c, status: e.target.value as Status } : c))}
                    className="w-full px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-foreground focus:outline-none focus:border-primary/40"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose</option>
                    <option value="owned">Owned</option>
                    <option value="wishlist">Wishlist</option>
                    <option value="on_the_way">On the way</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Condition</label>
                  <select
                    onChange={e => setCards(prev => prev.map(c => c.selected ? { ...c, condition: e.target.value as Condition } : c))}
                    className="w-full px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-foreground focus:outline-none focus:border-primary/40"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose</option>
                    <option value="mint">Mint</option>
                    <option value="near_mint">Near mint</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div className="min-w-0">
                  <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Duplicates</label>
                  <select
                    onChange={e => setCards(prev => prev.map(c => c.selected ? { ...c, isDuplicate: e.target.value === 'true' } : c))}
                    className="w-full px-2 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-medium text-foreground focus:outline-none focus:border-primary/40"
                    defaultValue=""
                  >
                    <option value="" disabled>Choose</option>
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
            {cards.map(card => (
              <motion.div key={card.id} layout
                className={`glass-card rounded-2xl border-2 overflow-hidden transition-all ${card.selected ? 'border-primary/40 shadow-md' : 'border-white/40 opacity-50'}`}>
                {/* Crop preview */}
                <div
                  className="relative aspect-[650/1000] bg-gray-50 overflow-hidden"
                  onClick={() => updateCard(card.id, { selected: !card.selected })}
                >
                  <img src={card.cropUrl} alt="" className="w-full h-full object-cover" />
                  <div className="absolute inset-0 flex flex-col justify-between p-2">
                    <div className="flex justify-end">
                      <button
                        onClick={(e) => { e.stopPropagation(); updateCard(card.id, { selected: !card.selected }); }}
                        aria-label={card.selected ? 'Deselect card' : 'Select card'}
                        className="flex h-6 w-6 items-center justify-center rounded-full bg-white shadow"
                      >
                        {card.selected
                          ? <CheckSquare size={13} className="text-primary" />
                          : <Square size={13} className="text-foreground/30" />}
                      </button>
                    </div>
                    {templateUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingCropId(card.id); }}
                        className="rounded-xl bg-white/90 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary shadow transition-all hover:bg-primary hover:text-white"
                      >
                        Edit Crop
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable fields */}
                <div className="p-3 space-y-2">
                  <Field label="Member" required invalid={card.selected && !card.member.trim()} value={card.member} onChange={v => updateCard(card.id, { member: v })} placeholder="Felix" />
                  <Field label="Version" value={card.version} onChange={v => updateCard(card.id, { version: v })} placeholder="Felix Accordion ver." />
                  <Field label="Photocard Name" required invalid={card.selected && !card.cardName.trim()} value={card.cardName} onChange={v => updateCard(card.id, { cardName: v })} placeholder="Felix DO IT photocard" />
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Status *</label>
                    <select value={card.status} onChange={e => updateCard(card.id, { status: e.target.value as Status })}
                      className="w-full px-2 py-1.5 rounded-xl border border-gray-100 bg-white/80 text-xs font-medium text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
                      <option value="owned">Owned</option>
                      <option value="wishlist">Wishlist</option>
                      <option value="on_the_way">On the way</option>
                    </select>
                  </div>
                  <div className={card.status !== 'owned' ? 'opacity-40 pointer-events-none' : ''}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Condition</label>
                    <select value={card.condition} onChange={e => updateCard(card.id, { condition: e.target.value as Condition })}
                      className="w-full px-2 py-1.5 rounded-xl border border-gray-100 bg-white/80 text-xs font-medium text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
                      <option value="mint">Mint</option>
                      <option value="near_mint">Near mint</option>
                      <option value="good">Good</option>
                      <option value="fair">Fair</option>
                      <option value="poor">Poor</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => updateCard(card.id, { isDuplicate: !card.isDuplicate })}
                    className={`w-full rounded-xl border px-2 py-1.5 text-xs font-medium transition-all ${card.isDuplicate ? 'border-primary/25 bg-primary/10 text-primary' : 'border-gray-100 bg-white/80 text-foreground/45'}`}
                  >
                    {card.isDuplicate ? 'Duplicate: Yes' : 'Duplicate: No'}
                  </button>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Notes</label>
                    <textarea
                      value={card.notes}
                      onChange={e => updateCard(card.id, { notes: e.target.value })}
                      placeholder="Pulled from DO IT album, Felix Accordion ver."
                      className="h-16 w-full resize-none rounded-xl border border-gray-100 bg-white/80 px-2 py-1.5 text-xs font-medium text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Save button */}
          <div className="sticky bottom-4">
            <div className="glass-card rounded-2xl px-6 py-4 border border-white/60 flex items-center justify-between shadow-xl">
              <p className="text-sm font-bold text-foreground/60">
                {missingRequiredCount > 0 ? (
                  <span className="text-red-500">
                    Fill required fields on <span className="font-black">{missingRequiredCount}</span> selected card{missingRequiredCount !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <>
                    Adding <span className="text-foreground font-black">{selectedCards.length}</span> card{selectedCards.length !== 1 ? 's' : ''} to your collection
                  </>
                )}
              </p>
              <button
                onClick={handleSave}
                disabled={!canSaveSelectedCards}
                className="btn-primary-pink flex items-center gap-2 rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-tight disabled:cursor-not-allowed disabled:opacity-40">
                Add to Collection →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP: Saving ── */}
      {step === 'saving' && (
        <div className="flex flex-col items-center justify-center py-24 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Loader2 size={28} className="text-primary animate-spin" />
          </div>
          <p className="font-black text-foreground uppercase tracking-tight">Saving to your collection…</p>
        </div>
      )}

      {/* ── STEP: Done ── */}
      {step === 'done' && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center justify-center py-24 gap-6 text-center">
          <div className="w-20 h-20 rounded-3xl bg-green-50 flex items-center justify-center">
            <CheckCircle2 size={36} className="text-green-500" />
          </div>
          <div>
            <p className="font-heading text-2xl font-bold text-foreground tracking-tight">All done!</p>
            <p className="text-sm text-foreground/50 font-medium mt-2">
              Added <span className="font-black text-foreground">{savedCount}</span> photocard{savedCount !== 1 ? 's' : ''} to your collection.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onDone}
              className="btn-primary-pink rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-tight">
              View Collection
            </button>
            <button onClick={uploadNewTemplate}
              className="px-6 py-3 rounded-2xl bg-gray-100 text-foreground font-black text-sm uppercase tracking-tight hover:bg-gray-200 transition-all">
              Scan Another
            </button>
          </div>
        </motion.div>
      )}

      <AnimatePresence>
        {editingCropId && templateUrl && (
          <ImageEditor
            image={templateUrl}
            initialState={cards.find(card => card.id === editingCropId)?.cropperState}
            onSave={handleSaveEditedCrop}
            onCancel={handleCancelCropEdit}
          />
        )}
        {isAddingManualCrop && templateUrl && (
          <ImageEditor
            image={templateUrl}
            onSave={handleSaveManualCrop}
            onCancel={handleCancelManualCrop}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
