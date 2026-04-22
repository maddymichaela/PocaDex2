import { useState, useRef, useCallback, useEffect, ChangeEvent, DragEvent } from 'react';
import { Upload, Sparkles, Grid3x3, CheckSquare, Square, Loader2, AlertCircle, CheckCircle2, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { detectPhotocardsInTemplate, GeminiCard } from '../lib/gemini';
import { detectTemplate, cropImageFromRect, trimBackground, PHOTOCARD_TEMPLATES } from '../lib/crop-pipeline';
import { insertPhotocard } from '../lib/db';
import { useAuth } from '../contexts/AuthContext';
import { Status, Condition } from '../types';

// ── Types ──────────────────────────────────────────────────────────────────

interface ReviewCard {
  id: string;
  cropUrl: string;
  member: string;
  group: string;
  album: string;
  era: string;
  version: string;
  year: number;
  status: Status;
  selected: boolean;
}

type Step = 'upload' | 'detecting' | 'review' | 'saving' | 'done';
type DetectMode = 'ai' | 'grid';

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

function fieldClass(label: string) {
  return (
    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">
      {label}
    </label>
  );
}
void fieldClass; // used inline below

// ── Editable field ─────────────────────────────────────────────────────────

function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">{label}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder ?? label}
        className="w-full px-2 py-1.5 rounded-lg border border-gray-100 bg-white/80 text-xs font-medium text-foreground placeholder:text-foreground/25 focus:outline-none focus:border-primary/40 transition-colors"
      />
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function Scan({ onDone }: { onDone: () => void }) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('upload');
  const [templateUrl, setTemplateUrl] = useState<string | null>(null);
  const [detectMode, setDetectMode] = useState<DetectMode>('ai');
  const [selectedGrid, setSelectedGrid] = useState(PHOTOCARD_TEMPLATES[4]); // 2×3 default
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [savedCount, setSavedCount] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [globalStatus, setGlobalStatus] = useState<Status>('owned');

  const selectedCards = cards.filter(c => c.selected);

  // ── File handling ────────────────────────────────────────────────────────

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) { setError('Please upload an image file.'); return; }
    if (file.size > 15 * 1024 * 1024) { setError('Image must be under 15MB.'); return; }
    setError(null);
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

  // ── AI Detection ─────────────────────────────────────────────────────────

  const runAiDetect = useCallback(async () => {
    if (!templateUrl) return;
    setStep('detecting');
    setError(null);
    try {
      const geminiCards: GeminiCard[] = await detectPhotocardsInTemplate(templateUrl);
      const img = await loadImage(templateUrl);

      const reviewCards: ReviewCard[] = await Promise.all(
        geminiCards.map(async (gc) => {
          const box = gc.boundingBox;
          const trimmed = await trimBackground(img, box);
          const cropUrl = cropImageFromRect(img, trimmed);
          return {
            id: makeId(),
            cropUrl,
            member: gc.member ?? '',
            group: gc.group ?? '',
            album: gc.album ?? '',
            era: gc.era ?? gc.album ?? '',
            version: gc.version ?? '',
            year: new Date().getFullYear(),
            status: 'owned' as Status,
            selected: true,
          };
        })
      );

      setCards(reviewCards);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Detection failed. Try again.');
      setStep('upload');
    }
  }, [templateUrl]);

  // ── Grid Detection ────────────────────────────────────────────────────────

  const runGridDetect = useCallback(async () => {
    if (!templateUrl) return;
    setStep('detecting');
    setError(null);
    try {
      const img = await loadImage(templateUrl);
      const result = detectTemplate(img);
      const cells = result?.cells ?? [];

      const reviewCards: ReviewCard[] = await Promise.all(
        cells.flat().map(async (cell) => {
          const trimmed = await trimBackground(img, cell);
          const cropUrl = cropImageFromRect(img, trimmed);
          return {
            id: makeId(),
            cropUrl,
            member: '',
            group: '',
            album: '',
            era: '',
            version: '',
            year: new Date().getFullYear(),
            status: 'owned' as Status,
            selected: true,
          };
        })
      );

      setCards(reviewCards);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Grid detection failed.');
      setStep('upload');
    }
  }, [templateUrl]);

  // ── Manual grid (no image analysis) ──────────────────────────────────────

  const runManualGrid = useCallback(async () => {
    if (!templateUrl) return;
    setStep('detecting');
    setError(null);
    try {
      const img = await loadImage(templateUrl);
      const { rows, cols } = selectedGrid;
      const cellW = 1 / cols;
      const cellH = 1 / rows;
      const reviewCards: ReviewCard[] = [];

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const box = { x: c * cellW, y: r * cellH, w: cellW, h: cellH };
          const trimmed = await trimBackground(img, box);
          const cropUrl = cropImageFromRect(img, trimmed);
          reviewCards.push({
            id: makeId(), cropUrl, member: '', group: '', album: '', era: '', version: '',
            year: new Date().getFullYear(), status: 'owned', selected: true,
          });
        }
      }

      setCards(reviewCards);
      setStep('review');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to splice grid.');
      setStep('upload');
    }
  }, [templateUrl, selectedGrid]);

  // ── Apply global status ───────────────────────────────────────────────────

  useEffect(() => {
    setCards(prev => prev.map(c => ({ ...c, status: globalStatus })));
  }, [globalStatus]);

  // ── Card field update ─────────────────────────────────────────────────────

  const updateCard = (id: string, patch: Partial<ReviewCard>) => {
    setCards(prev => prev.map(c => c.id === id ? { ...c, ...patch } : c));
  };

  const toggleAll = () => {
    const allSelected = cards.every(c => c.selected);
    setCards(prev => prev.map(c => ({ ...c, selected: !allSelected })));
  };

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!user || selectedCards.length === 0) return;
    setStep('saving');
    let count = 0;
    for (const card of selectedCards) {
      try {
        await insertPhotocard(user.id, {
          id: card.id,
          group: card.group || undefined,
          member: card.member || 'Unknown',
          album: card.album || 'Unknown',
          era: card.era || undefined,
          year: card.year,
          cardName: `${card.member} ${card.album}`.trim(),
          version: card.version || '',
          status: card.status,
          condition: undefined as Condition | undefined,
          isDuplicate: false,
          notes: undefined,
          imageUrl: card.cropUrl,
          createdAt: Date.now(),
        });
        count++;
      } catch (err) {
        console.error('Failed to save card:', err);
      }
    }
    setSavedCount(count);
    setStep('done');
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const reset = () => {
    setStep('upload');
    setTemplateUrl(null);
    setCards([]);
    setError(null);
    setSavedCount(0);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-black text-foreground uppercase tracking-tighter italic">Scan Template</h2>
          <p className="text-sm text-foreground/40 font-medium mt-1">Upload a fan template to auto-splice and import photocards</p>
        </div>
        {step !== 'upload' && step !== 'done' && (
          <button onClick={reset} className="text-xs font-bold text-foreground/40 hover:text-foreground uppercase tracking-widest transition-colors">
            ← Start over
          </button>
        )}
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
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={onFileInput} />
          </div>

          {/* Preview + detection options */}
          {templateUrl && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              <div className="glass-card rounded-3xl p-4 border border-white/60">
                <img src={templateUrl} alt="Template preview" className="w-full max-h-72 object-contain rounded-2xl" />
              </div>

              {/* Detection mode tabs */}
              <div className="glass-card rounded-3xl p-6 border border-white/60 space-y-4">
                <p className="text-xs font-black uppercase tracking-widest text-foreground/40">Detection method</p>
                <div className="flex gap-2">
                  {(['ai', 'grid'] as DetectMode[]).map(mode => (
                    <button key={mode} onClick={() => setDetectMode(mode)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-tight transition-all ${detectMode === mode ? 'bg-primary text-white shadow-md' : 'bg-gray-100 text-foreground/50 hover:bg-gray-200'}`}>
                      {mode === 'ai' ? <><Sparkles size={13} /> AI Auto-detect</> : <><Grid3x3 size={13} /> Manual Grid</>}
                    </button>
                  ))}
                </div>

                {detectMode === 'ai' && (
                  <p className="text-xs text-foreground/40 font-medium">
                    Gemini AI will identify each photocard and auto-fill member names, group, album, and version.
                    Requires a Gemini API key in your <code className="bg-gray-100 px-1 rounded text-[10px]">.env.local</code>.
                  </p>
                )}

                {detectMode === 'grid' && (
                  <div className="space-y-3">
                    <p className="text-xs text-foreground/40 font-medium">
                      Auto-detects white separator lines, or pick the grid manually. You'll fill in card info after.
                    </p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xs font-black uppercase tracking-widest text-foreground/40">Grid size:</span>
                      <div className="relative">
                        <select
                          value={selectedGrid.name}
                          onChange={e => setSelectedGrid(PHOTOCARD_TEMPLATES.find(t => t.name === e.target.value)!)}
                          className="appearance-none pl-3 pr-8 py-2 rounded-xl border border-gray-200 bg-white text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer"
                        >
                          {PHOTOCARD_TEMPLATES.map(t => (
                            <option key={t.name} value={t.name}>{t.name} ({t.rows * t.cols} cards)</option>
                          ))}
                        </select>
                        <ChevronDown size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-foreground/40 pointer-events-none" />
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-2 pt-1">
                  {detectMode === 'ai' ? (
                    <button onClick={runAiDetect}
                      className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-tight shadow-lg hover:opacity-90 active:scale-[0.98] transition-all">
                      <Sparkles size={15} /> Detect with AI
                    </button>
                  ) : (
                    <>
                      <button onClick={runGridDetect}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-tight shadow-md hover:opacity-90 transition-all">
                        <Grid3x3 size={14} /> Auto-detect Grid
                      </button>
                      <button onClick={runManualGrid}
                        className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-foreground font-black text-sm uppercase tracking-tight hover:bg-gray-200 transition-all">
                        Use {selectedGrid.name} Grid
                      </button>
                    </>
                  )}
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
            <p className="font-black text-foreground uppercase tracking-tight text-lg">
              {detectMode === 'ai' ? 'Analyzing with Gemini AI…' : 'Splicing template…'}
            </p>
            <p className="text-sm text-foreground/40 font-medium mt-1">
              {detectMode === 'ai' ? 'Detecting photocards and reading metadata' : 'Detecting grid lines and cropping cards'}
            </p>
          </div>
        </div>
      )}

      {/* ── STEP: Review ── */}
      {step === 'review' && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="glass-card rounded-2xl px-5 py-4 border border-white/60 flex flex-wrap items-center gap-4">
            <button onClick={toggleAll} className="flex items-center gap-2 text-xs font-black uppercase tracking-widest text-foreground/50 hover:text-foreground transition-colors">
              {cards.every(c => c.selected) ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} />}
              {cards.every(c => c.selected) ? 'Deselect all' : 'Select all'}
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs font-black uppercase tracking-widest text-foreground/40">Status:</span>
              <select value={globalStatus} onChange={e => setGlobalStatus(e.target.value as Status)}
                className="appearance-none px-3 py-1.5 rounded-xl border border-gray-200 bg-white text-xs font-bold text-foreground focus:outline-none focus:border-primary/50 cursor-pointer">
                <option value="owned">Owned</option>
                <option value="wishlist">Wishlist</option>
                <option value="on_the_way">On the way</option>
              </select>
            </div>

            <span className="text-xs font-bold text-foreground/40">
              {selectedCards.length} / {cards.length} selected
            </span>
          </div>

          {/* Card grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {cards.map(card => (
              <motion.div key={card.id} layout
                className={`glass-card rounded-2xl border-2 overflow-hidden transition-all ${card.selected ? 'border-primary/40 shadow-md' : 'border-white/40 opacity-50'}`}>
                {/* Crop preview */}
                <div className="relative aspect-[54/86] bg-gray-50 overflow-hidden">
                  <img src={card.cropUrl} alt="" className="w-full h-full object-cover" />
                  <button
                    onClick={() => updateCard(card.id, { selected: !card.selected })}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white shadow flex items-center justify-center">
                    {card.selected
                      ? <CheckSquare size={13} className="text-primary" />
                      : <Square size={13} className="text-foreground/30" />}
                  </button>
                </div>

                {/* Editable fields */}
                <div className="p-3 space-y-2">
                  <Field label="Member" value={card.member} onChange={v => updateCard(card.id, { member: v })} />
                  <Field label="Group" value={card.group} onChange={v => updateCard(card.id, { group: v })} />
                  <Field label="Album/Era" value={card.album} onChange={v => updateCard(card.id, { album: v, era: v })} />
                  <Field label="Version" value={card.version} onChange={v => updateCard(card.id, { version: v })} placeholder="e.g. A ver." />
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-foreground/40 mb-0.5 block">Status</label>
                    <select value={card.status} onChange={e => updateCard(card.id, { status: e.target.value as Status })}
                      className="w-full px-2 py-1.5 rounded-lg border border-gray-100 bg-white/80 text-xs font-medium text-foreground focus:outline-none focus:border-primary/40 transition-colors cursor-pointer">
                      <option value="owned">Owned</option>
                      <option value="wishlist">Wishlist</option>
                      <option value="on_the_way">On the way</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Save button */}
          <div className="sticky bottom-4">
            <div className="glass-card rounded-2xl px-6 py-4 border border-white/60 flex items-center justify-between shadow-lg">
              <p className="text-sm font-bold text-foreground/60">
                Adding <span className="text-foreground font-black">{selectedCards.length}</span> card{selectedCards.length !== 1 ? 's' : ''} to your collection
              </p>
              <button
                onClick={handleSave}
                disabled={selectedCards.length === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-tight shadow-md hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed">
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
            <p className="font-black text-2xl text-foreground uppercase tracking-tighter italic">All done!</p>
            <p className="text-sm text-foreground/50 font-medium mt-2">
              Added <span className="font-black text-foreground">{savedCount}</span> photocard{savedCount !== 1 ? 's' : ''} to your collection.
            </p>
          </div>
          <div className="flex gap-3">
            <button onClick={onDone}
              className="px-6 py-3 rounded-2xl bg-primary text-white font-black text-sm uppercase tracking-tight shadow-md hover:opacity-90 transition-all">
              View Collection
            </button>
            <button onClick={reset}
              className="px-6 py-3 rounded-2xl bg-gray-100 text-foreground font-black text-sm uppercase tracking-tight hover:bg-gray-200 transition-all">
              Scan Another
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}
