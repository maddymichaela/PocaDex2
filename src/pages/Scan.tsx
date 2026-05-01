import { useState, useRef, useCallback, ChangeEvent, DragEvent } from 'react';
import { Upload, Grid3x3, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, ChevronDown, Plus, Crop, RotateCcw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Area } from 'react-easy-crop';
import { detectTemplate, cropImageFromRect, fitCropRectToCardAspect, trimBackground, PHOTOCARD_TEMPLATES, templateCellRects, GridTemplate } from '../lib/crop-pipeline';
import { insertPhotocard } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { Status, Condition, Photocard, PHOTOCARD_CATEGORIES, PhotocardCategory } from '../types';
import ImageEditor, { ImageEditorState } from '../components/ImageEditor';

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewCard {
  id: string;
  cropUrl: string;
  cropAreaPixels: Area;
  cropperState: ImageEditorState;
  member: string;
  group: string;
  category: PhotocardCategory;
  source: string;
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

type BulkDraft = {
  group: string;
  category: '' | PhotocardCategory;
  album: string;
  source: string;
  era: string;
  year: string;
  status: '' | Status;
  condition: '' | Condition;
  isDuplicate: '' | 'true' | 'false';
};

const emptyBulkDraft: BulkDraft = {
  group: '',
  category: '',
  album: '',
  source: '',
  era: '',
  year: '',
  status: '',
  condition: '',
  isDuplicate: '',
};

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
    category: 'Album',
    source: '',
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
        className={`w-full rounded-xl border bg-white/70 px-2.5 py-2 text-xs font-medium text-foreground placeholder:text-foreground/25 shadow-sm shadow-primary/0 transition-colors focus:outline-none ${invalid ? 'border-red-200 focus:border-red-400' : 'border-primary/10 focus:border-primary/40'}`}
      />
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
  const [bulkDraft, setBulkDraft] = useState<BulkDraft>(emptyBulkDraft);

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

  const updateBulkDraft = (patch: Partial<BulkDraft>) => {
    setBulkDraft(prev => ({ ...prev, ...patch }));
  };

  const hasBulkDraftValues = Object.values(bulkDraft).some(value => String(value).trim() !== '');
  const bulkCategoryForFields = bulkDraft.category || 'Album';

  const applyBulkDraft = () => {
    if (!selectedCards.length || !hasBulkDraftValues) return;
    const parsedYear = parseInt(bulkDraft.year, 10);

    setCards(prev => prev.map(card => {
      if (!card.selected) return card;
      const nextCategory = bulkDraft.category || card.category;
      return {
        ...card,
        ...(bulkDraft.group.trim() ? { group: bulkDraft.group.trim() } : {}),
        ...(bulkDraft.category ? { category: bulkDraft.category } : {}),
        ...(nextCategory === 'Album' && bulkDraft.album.trim() ? { album: bulkDraft.album.trim() } : {}),
        ...(nextCategory !== 'Album' && bulkDraft.source.trim() ? { source: bulkDraft.source.trim() } : {}),
        ...(bulkDraft.era.trim() ? { era: bulkDraft.era.trim() } : {}),
        ...(!isNaN(parsedYear) ? { year: parsedYear } : {}),
        ...(bulkDraft.status ? { status: bulkDraft.status } : {}),
        ...(bulkDraft.condition ? { condition: bulkDraft.condition } : {}),
        ...(bulkDraft.isDuplicate ? { isDuplicate: bulkDraft.isDuplicate === 'true' } : {}),
      };
    }));
    setBulkDraft(emptyBulkDraft);
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
          category: card.category,
          source: card.category === 'Album' ? undefined : card.source || undefined,
          album: card.category === 'Album' ? card.album : '',
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

  const startOver = () => {
    setStep('upload');
    setTemplateUrl(null);
    setCards([]);
    setError(null);
    setSavedCount(0);
    setEditingCropId(null);
    setIsAddingManualCrop(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const uploadNewTemplate = () => {
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const softSelectClass = 'w-full cursor-pointer rounded-xl border border-primary/10 bg-white/70 px-2.5 py-2 text-xs font-medium text-foreground shadow-sm transition-colors focus:border-primary/40 focus:outline-none';
  const bulkInputClass = 'w-full rounded-xl border border-primary/10 bg-white/70 px-3 py-2 text-xs font-semibold text-foreground placeholder:text-foreground/25 transition-colors focus:border-primary/40 focus:outline-none';
  const primaryButtonClass = 'btn-primary-pink inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-tight disabled:cursor-not-allowed disabled:opacity-40';
  const secondaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl bg-primary/10 px-5 py-3 text-sm font-black uppercase tracking-tight text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40';
  const tertiaryButtonClass = 'inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-black uppercase tracking-tight text-foreground/45 transition-all hover:bg-primary/5 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40';

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
          {!templateUrl && (
            <div
              onClick={() => fileInputRef.current?.click()}
              onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              className={`relative flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed px-5 py-14 cursor-pointer transition-all sm:px-8 lg:px-16 ${isDragging ? 'border-primary bg-primary/5 scale-[1.01]' : 'border-gray-200 hover:border-primary/40 hover:bg-primary/2'}`}
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
          )}

          {/* Preview + detection options */}
          {templateUrl && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div>
                <div className="glass-card rounded-3xl p-4 border border-white/60 space-y-3">
                  <img src={templateUrl} alt="Template preview" className="mx-auto w-full max-h-72 object-contain rounded-2xl" />
                  <div className="flex justify-center">
                    <button
                      type="button"
                      onClick={uploadNewTemplate}
                      className={tertiaryButtonClass}
                    >
                      <Upload size={14} /> Upload New Image
                    </button>
                  </div>
                </div>
              </div>

              {/* Detection controls */}
              <div className="glass-card rounded-3xl p-6 border border-white/60 space-y-4">


                <div className="grid gap-5 lg:grid-cols-[minmax(0,2fr)_auto_minmax(0,3fr)] lg:items-start">
                  <div className="space-y-3">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Auto Grid Splicing</p>
                    <p className="text-xs text-foreground/40 font-medium">
                      Automatically detect rows and columns from your template
                    </p>
                    <button onClick={runGridDetect}
                      className={secondaryButtonClass}>
                      <Grid3x3 size={14} /> Auto-detect Grid
                    </button>

                  </div>

                  <div className="hidden h-full w-px bg-gray-100 lg:block" />

                  <div className="border-t border-gray-100 pt-5 space-y-3 lg:border-t-0 lg:pt-0">
                    <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Manual Grid Splicing</p>
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
                      <div className="rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary/70">
                        {manualRows * manualCols} cards
                      </div>
                    </div>
                    <button onClick={runManualGrid}
                      className={secondaryButtonClass}>
                      Use Grid
                    </button>
                  </div>
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
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={() => setIsAddingManualCrop(true)}
                    className={`${primaryButtonClass} w-full sm:w-auto`}
                  >
                    <Plus size={14} /> Add Card Manually
                  </button>
                  <div className="flex flex-col gap-2 border-t border-gray-100 pt-3 sm:flex-row sm:flex-wrap sm:items-center">
                    <button
                      type="button"
                      onClick={runGridDetect}
                      className={`${secondaryButtonClass} w-full sm:w-auto`}
                    >
                      <Grid3x3 size={14} /> Auto-detect Again
                    </button>
                    <button
                      type="button"
                      onClick={startOver}
                      className={`${tertiaryButtonClass} w-full sm:w-auto`}
                    >
                      <RotateCcw size={14} /> Start Over
                    </button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <div className="rounded-full bg-primary/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-primary/70">
                    {cards.length} crop{cards.length !== 1 ? 's' : ''}
                  </div>
                  <div className="rounded-full bg-foreground/5 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-foreground/40">
                    Output 650×1000
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="glass-card rounded-2xl border border-white/70 bg-white/75 px-4 py-4 shadow-sm">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <button onClick={toggleAll} className={tertiaryButtonClass}>
                  {cards.every(c => c.selected) ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
                  {cards.every(c => c.selected) ? 'Deselect all' : 'Select all'}
                </button>
                <span className="rounded-full bg-primary/5 px-3 py-2 text-[10px] font-black uppercase tracking-widest text-primary/70">
                  {selectedCards.length} / {cards.length} selected
                </span>
              </div>
              <button
                type="button"
                onClick={applyBulkDraft}
                disabled={!selectedCards.length || !hasBulkDraftValues}
                className="hidden items-center justify-center gap-2 rounded-2xl bg-primary/10 px-5 py-3 text-sm font-black uppercase tracking-tight text-primary transition-all hover:bg-primary/15 disabled:cursor-not-allowed disabled:opacity-40 md:inline-flex"
              >
                Apply to selected
              </button>
            </div>

            <div className="min-w-0">
              <div className="mb-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-foreground/45">Batch edit selected</p>
                <p className="text-xs font-medium text-foreground/40">Fill any fields here, then apply them together.</p>
              </div>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                <input value={bulkDraft.group} onChange={e => updateBulkDraft({ group: e.target.value })} placeholder="Group" className={bulkInputClass} />
                <select value={bulkDraft.category} onChange={e => updateBulkDraft({ category: e.target.value as BulkDraft['category'] })} className={softSelectClass}>
                  <option value="">Category</option>
                  {PHOTOCARD_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                </select>
                {bulkCategoryForFields === 'Album' ? (
                  <input value={bulkDraft.album} onChange={e => updateBulkDraft({ album: e.target.value })} placeholder="Album" className={bulkInputClass} />
                ) : (
                  <input value={bulkDraft.source} onChange={e => updateBulkDraft({ source: e.target.value })} placeholder="Source" className={bulkInputClass} />
                )}
                <input value={bulkDraft.era} onChange={e => updateBulkDraft({ era: e.target.value })} placeholder="Era" className={bulkInputClass} />
                <input value={bulkDraft.year} onChange={e => updateBulkDraft({ year: e.target.value })} placeholder="Year" inputMode="numeric" className={bulkInputClass} />
                <select value={bulkDraft.status} onChange={e => updateBulkDraft({ status: e.target.value as BulkDraft['status'] })} className={softSelectClass}>
                  <option value="">Status</option>
                  <option value="owned">Owned</option>
                  <option value="wishlist">Wishlist</option>
                  <option value="on_the_way">On the way</option>
                </select>
                <select value={bulkDraft.condition} onChange={e => updateBulkDraft({ condition: e.target.value as BulkDraft['condition'] })} className={softSelectClass}>
                  <option value="">Condition</option>
                  <option value="mint">Mint</option>
                  <option value="near_mint">Near mint</option>
                  <option value="good">Good</option>
                  <option value="fair">Fair</option>
                  <option value="poor">Poor</option>
                </select>
                <select value={bulkDraft.isDuplicate} onChange={e => updateBulkDraft({ isDuplicate: e.target.value as BulkDraft['isDuplicate'] })} className={softSelectClass}>
                  <option value="">Duplicate</option>
                  <option value="false">Not duplicate</option>
                  <option value="true">Duplicate</option>
                </select>
              </div>
              <div className="mt-3 md:hidden">
                <button
                  type="button"
                  onClick={applyBulkDraft}
                  disabled={!selectedCards.length || !hasBulkDraftValues}
                  className={`${secondaryButtonClass} w-full`}
                >
                  Apply to selected
                </button>
              </div>
            </div>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-2 gap-4 pb-32 md:grid-cols-3 xl:grid-cols-4">
            {cards.map(card => (
              <motion.div key={card.id} layout
                className={`overflow-hidden rounded-2xl border-2 bg-white/70 shadow-sm transition-all ${card.selected ? 'border-primary ring-4 ring-primary/10' : 'border-white/50'}`}>
                {/* Crop preview */}
                <div
                  className="relative aspect-[650/1000] overflow-hidden bg-accent/30"
                  onClick={() => updateCard(card.id, { selected: !card.selected })}
                >
                  <img src={card.cropUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); updateCard(card.id, { selected: !card.selected }); }}
                    aria-label={card.selected ? 'Deselect card' : 'Select card'}
                    className={`absolute top-4 left-4 z-20 w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${card.selected ? 'bg-primary border-primary text-white shadow-xl shadow-primary/20 scale-110' : 'bg-white/80 border-white'}`}
                  >
                    {card.selected && (
                      <svg viewBox="0 0 10 8" className="w-3 h-3 fill-none stroke-current stroke-[2] stroke-linecap-round stroke-linejoin-round">
                        <path d="M1 4l3 3 5-6" />
                      </svg>
                    )}
                  </button>
                  <div className="absolute right-3 top-3 z-10 flex items-start">
                    {templateUrl && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditingCropId(card.id); }}
                        className={`${tertiaryButtonClass} bg-white/90 px-3 py-2 text-xs shadow-sm backdrop-blur`}
                        aria-label="Edit crop"
                      >
                        <Crop size={12} /> Crop
                      </button>
                    )}
                  </div>
                </div>

                {/* Editable fields */}
                <div className="space-y-3 p-3">
                  <div className="grid grid-cols-1 gap-2">
                    <Field label="Member" required invalid={card.selected && !card.member.trim()} value={card.member} onChange={v => updateCard(card.id, { member: v })} placeholder="Felix" />
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Category *</label>
                      <select value={card.category} onChange={e => updateCard(card.id, { category: e.target.value as PhotocardCategory })} className={softSelectClass}>
                        {PHOTOCARD_CATEGORIES.map(option => <option key={option} value={option}>{option}</option>)}
                      </select>
                    </div>
                    {card.category === 'Album' ? (
                      <Field label="Album" value={card.album} onChange={v => updateCard(card.id, { album: v })} placeholder="DO IT" />
                    ) : (
                      <Field label="Source" value={card.source} onChange={v => updateCard(card.id, { source: v })} placeholder="Soundwave" />
                    )}
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Status *</label>
                      <select value={card.status} onChange={e => updateCard(card.id, { status: e.target.value as Status })} className={softSelectClass}>
                        <option value="owned">Owned</option>
                        <option value="wishlist">Wishlist</option>
                        <option value="on_the_way">On the way</option>
                      </select>
                    </div>
                  </div>

                  <details className="group rounded-xl border border-primary/10 bg-white/55 px-3 py-2" open={card.selected && (!card.group.trim() || !card.cardName.trim())}>
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-2 text-[10px] font-black uppercase tracking-widest text-foreground/45">
                      More details
                      <ChevronDown size={13} className="transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-3 space-y-2">
                      <Field label="Group" required invalid={card.selected && !card.group.trim()} value={card.group} onChange={v => updateCard(card.id, { group: v })} placeholder="Stray Kids" />
                      <Field label="Era" value={card.era} onChange={v => updateCard(card.id, { era: v })} placeholder="DO IT" />
                      <Field label="Year" value={String(card.year)} onChange={v => { const y = parseInt(v, 10); updateCard(card.id, { year: isNaN(y) ? card.year : y }); }} placeholder="2025" />
                      <Field label="Version" value={card.version} onChange={v => updateCard(card.id, { version: v })} placeholder="Accordion ver." />
                      <Field label="Photocard Name" required invalid={card.selected && !card.cardName.trim()} value={card.cardName} onChange={v => updateCard(card.id, { cardName: v })} placeholder="Felix DO IT photocard" />
                      <div className={card.status !== 'owned' ? 'opacity-45 pointer-events-none' : ''}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Condition</label>
                        <select value={card.condition} onChange={e => updateCard(card.id, { condition: e.target.value as Condition })} className={softSelectClass}>
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
                        className={`${tertiaryButtonClass} w-full ${card.isDuplicate ? 'bg-primary/10 text-primary' : ''}`}
                      >
                        {card.isDuplicate ? 'Duplicate: Yes' : 'Duplicate: No'}
                      </button>
                      <div>
                        <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Notes</label>
                        <textarea
                          value={card.notes}
                          onChange={e => updateCard(card.id, { notes: e.target.value })}
                          placeholder="Pulled from DO IT album, Felix Accordion ver."
                          className="h-16 w-full resize-none rounded-xl border border-primary/10 bg-white/70 px-2.5 py-2 text-xs font-medium text-foreground placeholder:text-foreground/25 focus:border-primary/40 focus:outline-none"
                        />
                      </div>
                    </div>
                  </details>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Save button */}
          <div className="sticky bottom-4 z-30">
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
                className={primaryButtonClass}>
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
              className={primaryButtonClass}>
              View Collection
            </button>
            <button onClick={uploadNewTemplate}
              className={secondaryButtonClass}>
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
