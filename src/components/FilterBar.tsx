import { Lock, X } from 'lucide-react';
import { Condition, PHOTOCARD_CATEGORIES, Status } from '../types';

export type SortOption = 'newest' | 'oldest' | 'member-az' | 'member-za' | 'recently-added';
export type YearFilter = number | 'All';
export type DuplicateFilter = 'All' | 'duplicates' | 'non_duplicates';

export interface FilterState {
  group: string;
  member: string;
  category: string;
  year: YearFilter;
  status: Status | 'All';
  condition: Condition | 'All';
  duplicate: DuplicateFilter;
  era: string;
  search: string;
  sortBy: SortOption;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  uniqueGroups: string[];
  uniqueMembers: string[];
  uniqueCategories: string[];
  uniqueYears: number[];
  uniqueConditions: Condition[];
  uniqueEras: string[];
  canUseAdvancedFilters?: boolean;
  onUpgradeRequired?: (reason: string) => void;
}

const selectClass = 'w-full px-3 py-2 bg-gray-50 border-2 border-transparent rounded-[14px] text-[10px] md:text-xs font-semibold text-foreground focus:bg-white focus:border-primary/20 transition-all outline-none h-10 cursor-pointer';
const lockedControlClass = 'opacity-55 cursor-pointer';

export function getDefaultFilterState(): FilterState {
  return {
    group: 'All',
    member: 'All',
    category: 'All',
    year: 'All',
    status: 'All',
    condition: 'All',
    duplicate: 'All',
    era: 'All',
    search: '',
    sortBy: 'recently-added',
  };
}

export function getBasicFilterState(filters: FilterState): FilterState {
  return {
    ...getDefaultFilterState(),
    status: filters.status,
    search: filters.search,
    sortBy: filters.sortBy,
  };
}

export default function FilterBar({
  filters,
  onFilterChange,
  uniqueGroups,
  uniqueMembers,
  uniqueCategories,
  uniqueYears,
  uniqueConditions,
  uniqueEras,
  canUseAdvancedFilters = true,
  onUpgradeRequired,
}: FilterBarProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onFilterChange({ ...filters, [key]: value });

  const updateAdvanced = <K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    if (!canUseAdvancedFilters) {
      showAdvancedUpgrade();
      return;
    }
    update(key, value);
  };

  const reset = () =>
    onFilterChange({
      ...filters,
      group: 'All',
      member: 'All',
      category: 'All',
      year: 'All',
      condition: 'All',
      duplicate: 'All',
      era: 'All',
      search: '',
      sortBy: 'recently-added',
    });

  const hasActiveAdvanced =
    filters.group !== 'All' ||
    filters.member !== 'All' ||
    filters.category !== 'All' ||
    filters.year !== 'All' ||
    filters.condition !== 'All' ||
    filters.duplicate !== 'All' ||
    filters.era !== 'All';

  const hasActive =
    (canUseAdvancedFilters && hasActiveAdvanced) ||
    filters.sortBy !== 'recently-added';

  const showAdvancedUpgrade = () => onUpgradeRequired?.('Advanced filters are Pro.');

  const ProBadge = () => (
    <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-1.5 py-0.5 text-[8px] font-black uppercase tracking-widest text-primary">
      <Lock size={9} />
      Pro
    </span>
  );

  const AdvancedLabel = ({ children }: { children: string }) => (
    <div className="ml-1 flex items-center justify-between gap-2">
      <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40">{children}</label>
      {!canUseAdvancedFilters && <ProBadge />}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-50 shadow-sm p-4 md:p-5 space-y-3">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5 md:gap-3">
        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Sort</label>
          <select value={filters.sortBy} onChange={e => update('sortBy', e.target.value as SortOption)} className={selectClass}>
            <option value="recently-added">Recent</option>
            <option value="newest">Newest Year</option>
            <option value="oldest">Oldest Year</option>
            <option value="member-az">A–Z</option>
            <option value="member-za">Z–A</option>
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Group</AdvancedLabel>
          <select value={filters.group} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('group', e.target.value)} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Groups</option>
            {[...uniqueGroups].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Member</AdvancedLabel>
          <select value={filters.member} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('member', e.target.value)} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Members</option>
            {[...uniqueMembers].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Category</AdvancedLabel>
          <select value={filters.category} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('category', e.target.value)} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Categories</option>
            {PHOTOCARD_CATEGORIES.filter(category => uniqueCategories.includes(category)).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Year</AdvancedLabel>
          <select value={String(filters.year)} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('year', e.target.value === 'All' ? 'All' : Number(e.target.value))} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Years</option>
            {[...uniqueYears].filter(Boolean).sort((a, b) => b - a).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Condition</AdvancedLabel>
          <select value={filters.condition} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('condition', e.target.value as FilterState['condition'])} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Conditions</option>
            {uniqueConditions.map(o => <option key={o} value={o}>{o.replace('_', ' ')}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Duplicates</AdvancedLabel>
          <select value={filters.duplicate} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('duplicate', e.target.value as DuplicateFilter)} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Cards</option>
            <option value="duplicates">Duplicates</option>
            <option value="non_duplicates">No Duplicates</option>
          </select>
        </div>

        <div className="space-y-1">
          <AdvancedLabel>Era</AdvancedLabel>
          <select value={filters.era} onClick={!canUseAdvancedFilters ? showAdvancedUpgrade : undefined} onChange={e => updateAdvanced('era', e.target.value)} className={`${selectClass} ${!canUseAdvancedFilters ? lockedControlClass : ''}`}>
            <option value="All">All Eras</option>
            {uniqueEras.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>

      {hasActive && (
        <button
          onClick={reset}
          className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-500 transition-colors"
        >
          <X size={11} className="stroke-[3px]" /> Reset all filters
        </button>
      )}
    </div>
  );
}
