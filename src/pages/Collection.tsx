import { useState, useMemo, useEffect } from 'react';
import { formatPhotocardMembers, getPhotocardCategory, getPhotocardMembers, Photocard } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import BulkEditForm from '../components/BulkEditForm';
import FilterBar, { FilterState } from '../components/FilterBar';
import { placeholderImage } from '../lib/assets';
import { Plus, CheckSquare, Trash2, X, LayoutGrid, User2, Sparkles, Calendar, ChevronLeft, Edit3, ArrowUp, Search, Filter, Users, Tags } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollectionProps {
  photocards: Photocard[];
  onDelete: (id: string) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Photocard>) => void;
  onCardClick: (pc: Photocard) => void;
  onNewCard: () => void;
}

type ViewMode = 'all' | 'group' | 'member' | 'era' | 'category' | 'year';

const GROUP_FALLBACK_LABELS = {
  era: 'No Era',
  category: 'Other',
  year: 'UnknownYear',
} as const;

const hasGroupableValue = (value: unknown) =>
  value !== null && value !== undefined && String(value).trim() !== '';

const getGroupedViewKey = (photocard: Photocard, viewMode: ViewMode): string | number => {
  switch (viewMode) {
    case 'group':
      return hasGroupableValue(photocard.group) ? photocard.group as string : 'Unknown';
    case 'member':
      return getPhotocardMembers(photocard).length > 1 ? 'Multi-member' : getPhotocardMembers(photocard)[0] || 'Unknown';
    case 'era':
      return hasGroupableValue(photocard.era) ? photocard.era as string : GROUP_FALLBACK_LABELS.era;
    case 'category':
      return hasGroupableValue(photocard.category) ? getPhotocardCategory(photocard) : GROUP_FALLBACK_LABELS.category;
    case 'year':
      return hasGroupableValue(photocard.year) ? photocard.year : GROUP_FALLBACK_LABELS.year;
    default:
      return 'All';
  }
};

interface GroupTileProps {
  name: string;
  count: number;
  imageUrl?: string;
  onClick: () => void;
}

function GroupTile({ name, count, imageUrl, onClick }: GroupTileProps) {
  return (
    <motion.div
      whileHover={{ y: -8, rotate: -1.5, scale: 1.02 }}
      onClick={onClick}
      className="glass-card rounded-[32px] shadow-xl flex flex-col relative overflow-hidden group cursor-pointer border-4 border-white transition-all hover:shadow-2xl"
    >
      <div className="w-full aspect-[650/1000] rounded-t-[28px] bg-white overflow-hidden relative ring-1 ring-black/5 shadow-inner">
        <img
          src={imageUrl || placeholderImage}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md shadow-xl border border-white/20">
          {count} CARDS
        </div>
        {!imageUrl && (
          <div className="absolute inset-0 flex items-center justify-center opacity-10">
            <LayoutGrid size={64} />
          </div>
        )}
      </div>
      <div className="px-5 py-5 text-center">
        <h3 className="text-xl font-bold text-foreground truncate tracking-tight leading-none">{name}</h3>
      </div>
    </motion.div>
  );
}

export default function Collection({ photocards, onDelete, onBulkUpdate, onCardClick, onNewCard }: CollectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [drilldownValue, setDrilldownValue] = useState<string | number | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterState>({
    group: 'All',
    member: 'All',
    category: 'All',
    year: 'All',
    status: 'All',
    search: '',
    sortBy: 'recently-added',
  });

  const [showBackToTop, setShowBackToTop] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  useEffect(() => {
    const scrollRoot = document.querySelector('main');
    if (!scrollRoot) return;
    const update = () => setShowBackToTop(scrollRoot.scrollTop >= scrollRoot.clientHeight);
    update();
    scrollRoot.addEventListener('scroll', update, { passive: true });
    return () => scrollRoot.removeEventListener('scroll', update);
  }, []);

  const uniqueGroups = useMemo(() => Array.from(new Set(photocards.map(pc => pc.group).filter(Boolean))) as string[], [photocards]);
  const uniqueMembers = useMemo(() => Array.from(new Set(photocards.flatMap(pc => getPhotocardMembers(pc)))).sort((a, b) => a.localeCompare(b)), [photocards]);
  const uniqueCategories = useMemo(() => Array.from(new Set(photocards.map(pc => getPhotocardCategory(pc)))), [photocards]);
  const uniqueYears = useMemo(() => Array.from(new Set(photocards.map(pc => pc.year))), [photocards]);

  const filteredPhotocards = useMemo(() => {
    return photocards.filter(pc => {
      const matchGroup = filters.group === 'All' || pc.group === filters.group;
      const members = getPhotocardMembers(pc);
      const memberLabel = formatPhotocardMembers(pc);
      const matchMember = filters.member === 'All' || members.includes(filters.member);
      const matchCategory = filters.category === 'All' || getPhotocardCategory(pc) === filters.category;
      const matchYear = filters.year === 'All' || pc.year === filters.year;
      const matchStatus = filters.status === 'All' || pc.status === filters.status;
      const q = filters.search.toLowerCase();
      const matchSearch = !q ||
        pc.cardName.toLowerCase().includes(q) ||
        pc.version.toLowerCase().includes(q) ||
        memberLabel.toLowerCase().includes(q) ||
        (pc.group?.toLowerCase().includes(q)) ||
        (pc.album?.toLowerCase().includes(q)) ||
        (pc.source?.toLowerCase().includes(q)) ||
        getPhotocardCategory(pc).toLowerCase().includes(q);

      let matchDrilldown = true;
      if (drilldownValue) {
        matchDrilldown = getGroupedViewKey(pc, viewMode) === drilldownValue;
      }

      return matchGroup && matchMember && matchCategory && matchYear && matchStatus && matchSearch && matchDrilldown;
    });
  }, [photocards, filters, drilldownValue, viewMode]);

  const processedPhotocards = useMemo(() => {
    return [...filteredPhotocards].sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest': return (Number(b.year) - Number(a.year)) || (b.createdAt - a.createdAt);
        case 'oldest': return (Number(a.year) - Number(b.year)) || (b.createdAt - a.createdAt);
        case 'member-az': return formatPhotocardMembers(a).localeCompare(formatPhotocardMembers(b)) || (b.createdAt - a.createdAt);
        case 'member-za': return formatPhotocardMembers(b).localeCompare(formatPhotocardMembers(a)) || (b.createdAt - a.createdAt);
        default: return b.createdAt - a.createdAt;
      }
    });
  }, [filteredPhotocards, filters.sortBy]);

  const groupedData = useMemo(() => {
    if (viewMode === 'all' || drilldownValue) return [];
    const groups = new Map<string | number, { count: number; imageUrl?: string }>();
    filteredPhotocards.forEach(pc => {
      const key = getGroupedViewKey(pc, viewMode);
      const existing = groups.get(key) || { count: 0 };
      groups.set(key, { count: existing.count + 1, imageUrl: existing.imageUrl || pc.imageUrl });
    });
    return Array.from(groups.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPhotocards, viewMode, drilldownValue]);

  const toggleSelect = (id: string) =>
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const deleteSelected = () => {
    if (window.confirm(`Delete ${selectedIds.length} photocard${selectedIds.length !== 1 ? 's' : ''}? This cannot be undone.`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds([]);
      setSelectMode(false);
    }
  };

  const toggleSelectMode = () => {
    if (selectMode) setSelectedIds([]);
    setSelectMode(!selectMode);
  };

  const scrollToTop = () => document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' });

  const hasActiveFilters =
    filters.group !== 'All' ||
    filters.member !== 'All' ||
    filters.category !== 'All' ||
    filters.year !== 'All' ||
    filters.status !== 'All' ||
    filters.sortBy !== 'recently-added';

  const activeFilterChips = [
    { label: 'Group', value: filters.group, key: 'group' as const },
    { label: 'Member', value: filters.member, key: 'member' as const },
    { label: 'Category', value: filters.category, key: 'category' as const },
    { label: 'Year', value: String(filters.year), key: 'year' as const },
    { label: 'Status', value: filters.status, key: 'status' as const },
  ].filter(f => f.value !== 'All');

  const VIEW_MODES = [
    { id: 'all', label: 'View All', icon: LayoutGrid },
    { id: 'group', label: 'Group', icon: Users },
    { id: 'member', label: 'Member', icon: User2 },
    { id: 'era', label: 'Era', icon: Sparkles },
    { id: 'category', label: 'Category', icon: Tags },
    { id: 'year', label: 'Year', icon: Calendar },
  ] as const;

  const selectedViewLabel = VIEW_MODES.find(mode => mode.id === viewMode)?.label ?? 'Dimension';
  const showReturnToFullView = !(photocards.length === 0 && viewMode === 'all' && !drilldownValue);

  return (
    <div className="flex flex-col gap-6 w-full overflow-x-hidden pb-20">

      {/* H1 + description */}
      <div className="space-y-1">
        <h1 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">My Binder</h1>
        <p className="text-sm text-foreground/45 font-medium">
          {photocards.length} {photocards.length === 1 ? 'photocard' : 'photocards'}
          {uniqueGroups.length > 0 && ` · ${uniqueGroups.length} ${uniqueGroups.length === 1 ? 'artist' : 'artists'}`}
        </p>
      </div>

      {/* View mode + Search + Filter toggle */}
      <div className="flex w-full min-w-0 flex-col gap-2 xl:flex-row xl:items-center">
        {/* View mode tabs */}
        <div className="w-full min-w-0 overflow-x-auto rounded-2xl pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden xl:w-auto xl:shrink-0 xl:pb-0">
          <div className="inline-flex min-w-max items-center gap-0.5 rounded-2xl border-2 border-gray-100 bg-white p-1 shadow-sm">
            {VIEW_MODES.map((m) => (
              <button
                key={m.id}
                onClick={() => { setViewMode(m.id); setDrilldownValue(null); }}
                className={`flex h-9 items-center justify-center gap-2 whitespace-nowrap rounded-xl px-3 text-[10px] font-black uppercase tracking-widest transition-all md:px-4 ${viewMode === m.id ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground'
                  }`}
              >
                <m.icon size={14} />
                <span>{m.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search + Filter button (flushed right) */}
        <div className="flex w-full min-w-0 items-center gap-2 xl:ml-auto xl:w-auto">
          <div className="relative min-w-0 flex-1 xl:flex-none">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-primary pointer-events-none" />
            <input
              type="text"
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              placeholder="Search..."
              className="h-11 w-full min-w-0 rounded-[14px] border-2 border-gray-100 bg-white py-2 pl-8 pr-3 text-xs outline-none transition-all focus:border-primary/30 xl:w-56"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`h-11 w-11 rounded-[14px] border-2 flex items-center justify-center shrink-0 transition-all ${showFilters || hasActiveFilters
                ? 'bg-primary text-white border-primary shadow-md'
                : 'bg-white text-foreground/50 border-gray-100 hover:border-primary/30 hover:text-primary'
              }`}
            aria-label="Toggle filters"
          >
            <Filter size={15} />
          </button>
        </div>
      </div>

      {/* Collapsible filter panel */}
      <AnimatePresence>
        {showFilters && (
          <motion.div
            key="filter-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              uniqueGroups={uniqueGroups}
              uniqueMembers={uniqueMembers}
              uniqueCategories={uniqueCategories}
              uniqueYears={uniqueYears}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active filter chips */}
      {activeFilterChips.length > 0 && (
        <div className="flex flex-wrap gap-2 -mt-2">
          {activeFilterChips.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilters(prev => ({ ...prev, [f.key]: 'All' }))}
              className="bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl border-2 border-white shadow-sm flex items-center gap-2 hover:bg-primary/30 transition-all hover:scale-105"
            >
              {f.label}: {f.value}
              <X size={10} className="stroke-[4px]" />
            </button>
          ))}
          <button
            onClick={() => setFilters({ group: 'All', member: 'All', category: 'All', year: 'All', status: 'All', search: '', sortBy: 'recently-added' })}
            className="text-[9px] font-black text-foreground/40 uppercase hover:text-red-400 p-2 italic bg-white/30 rounded-xl px-3 border border-white"
          >
            Clear All
          </button>
        </div>
      )}

      {/* Select mode toolbar */}
      <AnimatePresence>
        {selectMode && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col md:flex-row items-center justify-between px-6 md:px-10 py-4 md:py-5 bg-secondary/10 border-2 md:border-4 border-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-sm gap-4"
          >
            <div className="flex items-center gap-4 md:gap-6">
              <span className="text-[11px] md:text-xs font-black text-secondary uppercase tracking-[0.1em] italic">
                {selectedIds.length} CARD{selectedIds.length !== 1 ? 'S' : ''} SELECTED
              </span>
              <button
                onClick={() => setSelectedIds(processedPhotocards.map(p => p.id))}
                className="text-[9px] md:text-[10px] font-black text-foreground/40 uppercase tracking-widest hover:text-secondary transition-colors underline decoration-dotted"
              >
                Select all
              </button>
              {selectedIds.length > 0 && (
                <button
                  onClick={() => setSelectedIds([])}
                  className="text-[9px] md:text-[10px] font-black text-foreground/40 uppercase tracking-widest hover:text-red-400 transition-colors underline decoration-dotted"
                >
                  Deselect all
                </button>
              )}
            </div>
            <div className="flex gap-2 w-full md:w-auto">
              <button
                disabled={selectedIds.length === 0}
                onClick={() => setIsBulkEditing(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white text-secondary rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-md hover:bg-secondary hover:text-white disabled:opacity-30 transition-all border-white/20 border-2"
              >
                <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Bulk Edit
              </button>
              <button
                disabled={selectedIds.length === 0}
                onClick={deleteSelected}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-red-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 disabled:opacity-30 transition-all border-white/20 border-2"
              >
                <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                Burn
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drilldown header */}
      {drilldownValue && (
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5 p-2"
        >
          <button
            onClick={() => setDrilldownValue(null)}
            className="p-4 bg-white border-4 border-white shadow-xl rounded-[24px] text-primary hover:rotate-[-10deg] transition-all hover:scale-110 active:scale-90"
          >
            <ChevronLeft size={24} className="stroke-[3px]" />
          </button>
          <div className="space-y-1">
            <h2 className="text-4xl font-bold text-foreground tracking-tight leading-none">{drilldownValue}</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">{processedPhotocards.length} Items Found</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Card grid / group tiles */}
      <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AnimatePresence mode="wait">
          {viewMode !== 'all' && !drilldownValue ? (
            <motion.div
              key="grouped-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-5 gap-6 md:max-lg:gap-4"
            >
              {groupedData.map((group) => (
                <GroupTile
                  key={group.name}
                  name={String(group.name)}
                  count={group.count}
                  imageUrl={group.imageUrl}
                  onClick={() => setDrilldownValue(group.name)}
                />
              ))}
              {groupedData.length === 0 && (
                <div className="col-span-full py-32 text-center text-foreground/20 font-black uppercase tracking-widest text-sm italic">
                  Nothing grouped yet in {selectedViewLabel}
                </div>
              )}
            </motion.div>
          ) : processedPhotocards.length > 0 ? (
            <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PhotocardGrid
                photocards={processedPhotocards}
                onCardClick={onCardClick}
                selectMode={selectMode}
                selectedIds={selectedIds}
                onToggle={toggleSelect}
              />
            </motion.div>
          ) : (
            <motion.div
              key="empty-view"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center justify-center px-6 py-32 text-center md:px-10 glass-card border-white border-8 rounded-[48px] shadow-sm text-foreground/20"
            >
              <div className="text-8xl mb-6 grayscale opacity-30 animate-bounce">📔</div>
              <p className="font-black uppercase tracking-[0.3em] text-sm italic">Binder section is currently empty</p>
              {showReturnToFullView && (
                <button
                  onClick={() => setFilters({ group: 'All', member: 'All', category: 'All', year: 'All', status: 'All', search: '', sortBy: 'recently-added' })}
                  className="mt-8 px-8 py-4 bg-white text-primary border-2 border-primary/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/10"
                >
                  Return to Full View
                </button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating action buttons */}
      <div className="fixed bottom-5 right-4 z-40 flex flex-col items-end gap-2">
        <button
          onClick={toggleSelectMode}
          aria-label={selectMode ? 'Cancel selection' : 'Select cards'}
          className={`flex h-12 w-12 items-center justify-center rounded-full border-2 shadow-xl transition-all ${selectMode
              ? 'bg-secondary text-white border-white/20 shadow-xl shadow-secondary/20'
              : 'bg-white text-foreground/40 border-gray-100 shadow-sm hover:text-secondary'
            }`}
        >
          <CheckSquare className="w-5 h-5" />
        </button>
        {!selectMode && (
          <button
            onClick={onNewCard}
            aria-label="Add card"
            className="btn-primary-pink flex h-12 w-12 items-center justify-center rounded-full border-2 border-white/20 shadow-xl"
          >
            <Plus className="w-5 h-5" />
          </button>
        )}
        <AnimatePresence>
          {showBackToTop && (
            <motion.button
              initial={{ opacity: 0, scale: 0.85, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.85, y: 8 }}
              onClick={scrollToTop}
              aria-label="Back to top"
              className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-gray-100 bg-white text-foreground/40 shadow-xl transition-all hover:text-primary"
            >
              <ArrowUp className="w-5 h-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk edit modal */}
      <AnimatePresence>
        {isBulkEditing && (
          <BulkEditForm
            selectedCount={selectedIds.length}
            onClose={() => setIsBulkEditing(false)}
            onSave={(updates) => {
              onBulkUpdate(selectedIds, updates);
              setIsBulkEditing(false);
              setSelectMode(false);
              setSelectedIds([]);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
