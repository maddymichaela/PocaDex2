/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useMemo, useEffect } from 'react';
import { Photocard } from '../types';
import { PhotocardGrid } from '../components/PhotocardGrid';
import PhotocardForm from '../components/PhotocardForm';
import BulkEditForm from '../components/BulkEditForm';
import FilterBar, { FilterState } from '../components/FilterBar';
import { Plus, CheckSquare, Trash2, X, LayoutGrid, User2, Sparkles, Disc3, Calendar, ChevronLeft, Edit3 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CollectionProps {
  photocards: Photocard[];
  onAdd: (pc: Photocard) => void;
  onUpdate: (pc: Photocard) => void;
  onDelete: (id: string) => void;
  onBulkUpdate: (ids: string[], updates: Partial<Photocard>) => void;
  onCardClick: (pc: Photocard) => void;
  triggerAdd?: number;
}

type ViewMode = 'all' | 'member' | 'era' | 'album' | 'year';

interface GroupTileProps {
  name: string;
  count: number;
  imageUrl?: string;
  onClick: () => void;
  key?: string | number; // Added to satisfy TS if needed, though React consumes it
}

function GroupTile({ name, count, imageUrl, onClick }: GroupTileProps) {
  return (
    <motion.div
      whileHover={{ y: -8, rotate: -1.5, scale: 1.02 }}
      onClick={onClick}
      className="glass-card rounded-[32px] p-5 shadow-lg flex flex-col gap-5 relative overflow-hidden group cursor-pointer border-4 border-white transition-all hover:shadow-2xl"
    >
      <div className="w-full aspect-[2/3] rounded-2xl bg-white overflow-hidden relative ring-1 ring-black/5 shadow-inner">
        <img 
          src={imageUrl || "/placeholder.png"} 
          alt={name} 
          className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
          referrerPolicy="no-referrer"
        />
        <div className="absolute bottom-4 right-4 bg-black/60 text-white text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md shadow-lg border border-white/20">
          {count} CARDS
        </div>
        
        {!imageUrl && (
           <div className="absolute inset-0 flex items-center justify-center opacity-10">
             <LayoutGrid size={64} />
           </div>
        )}
      </div>
      <div className="px-1 text-center">
        <h3 className="font-black text-xl text-foreground truncate uppercase tracking-tighter italic leading-none">{name}</h3>
      </div>
    </motion.div>
  );
}

export default function Collection({ photocards, onAdd, onUpdate, onDelete, onBulkUpdate, onCardClick, triggerAdd }: CollectionProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('all');
  const [drilldownValue, setDrilldownValue] = useState<string | null>(null);

  const [filters, setFilters] = useState<FilterState>({
    group: 'All',
    member: 'All',
    album: 'All',
    year: 'All',
    status: 'All',
    search: '',
    sortBy: 'recently-added'
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (triggerAdd) setIsAdding(true);
  }, [triggerAdd]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  // Extract unique values for filter options
  const uniqueGroups = useMemo(() => Array.from(new Set(photocards.map(pc => pc.group).filter(Boolean))), [photocards]);
  const uniqueMembers = useMemo(() => Array.from(new Set(photocards.map(pc => pc.member).filter(Boolean))), [photocards]);
  const uniqueAlbums = useMemo(() => Array.from(new Set(photocards.map(pc => pc.album).filter(Boolean))), [photocards]);
  const uniqueYears = useMemo(() => Array.from(new Set(photocards.map(pc => pc.year).filter(Boolean))), [photocards]);

  // Combinatorial filtering and sorting logic
  const filteredPhotocards = useMemo(() => {
    return photocards.filter(pc => {
      const matchGroup = filters.group === 'All' || pc.group === filters.group;
      const matchMember = filters.member === 'All' || pc.member === filters.member;
      const matchAlbum = filters.album === 'All' || pc.album === filters.album;
      const matchYear = filters.year === 'All' || pc.year === filters.year;
      const matchStatus = filters.status === 'All' || pc.status === filters.status;
      const matchSearch = filters.search === '' || 
        pc.cardName.toLowerCase().includes(filters.search.toLowerCase()) ||
        pc.version.toLowerCase().includes(filters.search.toLowerCase()) ||
        pc.member.toLowerCase().includes(filters.search.toLowerCase()) ||
        (pc.group?.toLowerCase().includes(filters.search.toLowerCase())) ||
        pc.album.toLowerCase().includes(filters.search.toLowerCase());

      // If we're drilling down, apply that extra filter
      let matchDrilldown = true;
      if (drilldownValue) {
        if (viewMode === 'member') matchDrilldown = pc.member === drilldownValue;
        if (viewMode === 'era') matchDrilldown = pc.era === drilldownValue;
        if (viewMode === 'album') matchDrilldown = pc.album === drilldownValue;
        if (viewMode === 'year') matchDrilldown = pc.year === drilldownValue;
      }

      return matchGroup && matchMember && matchAlbum && matchYear && matchStatus && matchSearch && matchDrilldown;
    });
  }, [photocards, filters, drilldownValue, viewMode]);

  const processedPhotocards = useMemo(() => {
    return [...filteredPhotocards].sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return (Number(b.year) - Number(a.year)) || (b.createdAt - a.createdAt);
        case 'oldest':
          return (Number(a.year) - Number(b.year)) || (b.createdAt - a.createdAt);
        case 'member-az':
          return a.member.localeCompare(b.member) || (b.createdAt - a.createdAt);
        case 'member-za':
          return b.member.localeCompare(a.member) || (b.createdAt - a.createdAt);
        case 'recently-added':
        default:
          return b.createdAt - a.createdAt;
      }
    });
  }, [filteredPhotocards, filters.sortBy]);

  // Grouped data for tiles
  const groupedData = useMemo(() => {
    if (viewMode === 'all' || drilldownValue) return [];
    
    const groups = new Map<string, { count: number, imageUrl?: string }>();
    filteredPhotocards.forEach(pc => {
      const key = (viewMode === 'era' ? pc.era : pc[viewMode as keyof Photocard] as string) || 'Unknown';
      const existing = groups.get(key) || { count: 0 };
      groups.set(key, {
        count: existing.count + 1,
        imageUrl: existing.imageUrl || pc.imageUrl
      });
    });
    
    return Array.from(groups.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count);
  }, [filteredPhotocards, viewMode, drilldownValue]);

  const handleCloseForm = () => {
    setIsAdding(false);
  };

  const handleCardClick = (pc: Photocard) => {
    onCardClick(pc);
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const deleteSelected = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedIds.length} photocards? This cannot be undone.`)) {
      selectedIds.forEach(id => onDelete(id));
      setSelectedIds([]);
      setSelectMode(false);
    }
  };

  const toggleSelectMode = () => {
    if (selectMode) {
      setSelectedIds([]);
    }
    setSelectMode(!selectMode);
  };

  const activeFilters = [
    { label: 'Group', value: filters.group, key: 'group' as const },
    { label: 'Member', value: filters.member, key: 'member' as const },
    { label: 'Album', value: filters.album, key: 'album' as const },
    { label: 'Year', value: filters.year, key: 'year' as const },
    { label: 'Status', value: filters.status, key: 'status' as const },
  ].filter(f => f.value !== 'All');

  const VIEW_MODES = [
    { id: 'all', label: 'View All', icon: LayoutGrid },
    { id: 'member', label: 'Member', icon: User2 },
    { id: 'era', label: 'Era', icon: Sparkles },
    { id: 'album', label: 'Album', icon: Disc3 },
    { id: 'year', label: 'Year', icon: Calendar },
  ] as const;

  return (
    <div className="flex flex-col gap-8 w-full overflow-x-hidden pb-20">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
          <div className="flex-1 w-full space-y-4">
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              uniqueGroups={uniqueGroups as string[]}
              uniqueMembers={uniqueMembers as string[]}
              uniqueAlbums={uniqueAlbums as string[]}
              uniqueYears={uniqueYears as string[]}
            />
            
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex bg-white border-gray-100 border-2 p-1 rounded-2xl shadow-sm h-13 items-center overflow-x-auto no-scrollbar max-w-full">
                <div className="flex gap-1">
                  {VIEW_MODES.map((m) => (
                    <button
                      key={m.id}
                      onClick={() => { setViewMode(m.id); setDrilldownValue(null); }}
                      className={`flex items-center gap-2 px-4 h-10 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 ${
                        viewMode === m.id ? 'bg-primary text-white shadow-md' : 'text-foreground/40 hover:text-foreground'
                      }`}
                    >
                      <m.icon size={14} />
                      <span className="hidden sm:inline">{m.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {activeFilters.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {activeFilters.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setFilters({ ...filters, [f.key]: 'All' })}
                      className="bg-primary/20 text-primary text-[9px] font-black uppercase tracking-[0.1em] px-4 py-2 rounded-xl border-2 border-white shadow-sm flex items-center gap-2 hover:bg-primary/30 transition-all hover:scale-105"
                    >
                      {f.label}: {f.value}
                      <X size={10} className="stroke-[4px]" />
                    </button>
                  ))}
                  <button 
                    onClick={() => setFilters({ group: 'All', member: 'All', album: 'All', year: 'All', status: 'All', search: '', sortBy: 'recently-added' })}
                    className="text-[9px] font-black text-foreground/40 uppercase hover:text-red-400 p-2 italic bg-white/30 rounded-xl px-3 border border-white"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex gap-2 sm:gap-3 w-full md:w-auto shrink-0 mt-auto pb-[2px]">
            <button
              onClick={toggleSelectMode}
              className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-6 h-11 rounded-[14px] text-[10px] md:text-xs font-black uppercase tracking-widest transition-all border-2 ${
                selectMode 
                  ? 'bg-secondary text-white border-white/20 shadow-lg shadow-secondary/20' 
                  : 'bg-white text-foreground/40 border-gray-100 shadow-sm hover:text-secondary'
              }`}
            >
              <CheckSquare className="w-4 h-4 md:w-4.5 md:h-4.5" />
              <span className="hidden xs:inline">{selectMode ? 'Cancel Selection' : 'Select'}</span>
              <span className="xs:hidden">{selectMode ? 'Stop' : 'Select'}</span>
            </button>
            {!selectMode && (
              <button
                onClick={() => setIsAdding(true)}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-4 sm:px-8 h-11 bg-primary text-white rounded-[14px] text-[10px] md:text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-[0.95] hover:rotate-1 transition-all whitespace-nowrap border-white/20 border-2"
              >
                <Plus className="w-4.5 h-4.5 md:w-5 md:h-5" />
                <span className="hidden xs:inline">New Card</span>
                <span className="xs:hidden">Add</span>
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {selectMode && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 12 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              className="flex flex-col sm:flex-row items-center justify-between px-6 md:px-10 py-4 md:py-5 bg-secondary/10 border-2 sm:border-4 border-white rounded-[24px] md:rounded-[32px] overflow-hidden shadow-sm gap-4"
            >
              <div className="flex items-center gap-4 md:gap-6">
                <span className="text-[11px] md:text-xs font-black text-secondary uppercase tracking-[0.1em] italic">
                  {selectedIds.length} CARD{selectedIds.length !== 1 ? 'S' : ''} SELECTED
                </span>
                <button
                  onClick={() => setSelectedIds(selectedIds.length === processedPhotocards.length ? [] : processedPhotocards.map(p => p.id))}
                  className="text-[9px] md:text-[10px] font-black text-foreground/40 uppercase tracking-widest hover:text-secondary transition-colors underline decoration-dotted"
                >
                  {selectedIds.length === processedPhotocards.length ? 'DESELECT ALL' : 'SELECT ALL FILTERED'}
                </button>
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button
                  disabled={selectedIds.length === 0}
                  onClick={() => setIsBulkEditing(true)}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-white text-secondary rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-md hover:bg-secondary hover:text-white disabled:opacity-30 transition-all border-white/20 border-2"
                >
                  <Edit3 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Bulk Edit
                </button>
                <button
                  disabled={selectedIds.length === 0}
                  onClick={deleteSelected}
                  className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 md:px-6 py-2.5 md:py-3 bg-red-500 text-white rounded-xl md:rounded-2xl text-[10px] md:text-xs font-black uppercase tracking-widest shadow-md hover:scale-105 active:scale-95 disabled:opacity-30 transition-all border-white/20 border-2"
                >
                  <Trash2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  Burn
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {drilldownValue && (
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex items-center gap-5 p-2"
        >
           <button
            onClick={() => setDrilldownValue(null)}
            className="p-4 bg-white border-4 border-white shadow-lg rounded-[24px] text-primary hover:rotate-[-10deg] transition-all hover:scale-110 active:scale-90"
          >
            <ChevronLeft size={24} className="stroke-[3px]" />
          </button>
          <div className="space-y-1">
            <h2 className="text-4xl font-black text-foreground uppercase tracking-tighter italic leading-none">{drilldownValue}</h2>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-primary rounded-full animate-pulse" />
              <p className="text-[11px] font-black text-foreground/40 uppercase tracking-widest">{processedPhotocards.length} Items Found</p>
            </div>
          </div>
        </motion.div>
      )}
      
      <div className="min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
        <AnimatePresence mode="wait">
          {viewMode !== 'all' && !drilldownValue ? (
            <motion.div 
              key="grouped-view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6"
            >
              {groupedData.map((group) => (
                <GroupTile 
                  key={group.name} 
                  name={group.name} 
                  count={group.count} 
                  imageUrl={group.imageUrl} 
                  onClick={() => setDrilldownValue(group.name)}
                />
              ))}
              {groupedData.length === 0 && (
                 <div className="col-span-full py-32 text-center text-foreground/20 font-black uppercase tracking-widest text-sm italic">
                  Nothing grouped yet in this dimension
                 </div>
              )}
            </motion.div>
          ) : processedPhotocards.length > 0 ? (
            <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              <PhotocardGrid 
                photocards={processedPhotocards} 
                onCardClick={handleCardClick}
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
              className="flex flex-col items-center justify-center py-32 glass-card border-white border-8 rounded-[48px] shadow-sm text-foreground/20"
            >
              <div className="text-8xl mb-6 grayscale opacity-30 animate-bounce">📔</div>
              <p className="font-black uppercase tracking-[0.3em] text-sm italic">Binder section is currently empty</p>
              <button 
                onClick={() => { setFilters({ group: 'All', member: 'All', album: 'All', year: 'All', status: 'All', search: '', sortBy: 'recently-added' }); setDrilldownValue(null); }}
                className="mt-8 px-8 py-4 bg-white text-primary border-2 border-primary/20 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-primary hover:text-white transition-all shadow-xl shadow-primary/10"
              >
                Return to Full View
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isAdding && (
          <PhotocardForm 
            onSubmit={onAdd} 
            onClose={handleCloseForm} 
          />
        )}
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
