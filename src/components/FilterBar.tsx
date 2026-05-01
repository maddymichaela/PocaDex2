import { X } from 'lucide-react';
import { PHOTOCARD_CATEGORIES, Status } from '../types';

export type SortOption = 'newest' | 'oldest' | 'member-az' | 'member-za' | 'recently-added';
export type YearFilter = number | 'All';

export interface FilterState {
  group: string;
  member: string;
  category: string;
  year: YearFilter;
  status: Status | 'All';
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
}

const selectClass = 'w-full px-3 py-2 bg-gray-50 border-2 border-transparent rounded-[14px] text-[10px] md:text-xs font-semibold text-foreground focus:bg-white focus:border-primary/20 transition-all outline-none h-10 cursor-pointer';

export default function FilterBar({ filters, onFilterChange, uniqueGroups, uniqueMembers, uniqueCategories, uniqueYears }: FilterBarProps) {
  const update = <K extends keyof FilterState>(key: K, value: FilterState[K]) =>
    onFilterChange({ ...filters, [key]: value });

  const reset = () =>
    onFilterChange({ ...filters, group: 'All', member: 'All', category: 'All', year: 'All', search: '', sortBy: 'recently-added' });

  const hasActive =
    filters.group !== 'All' ||
    filters.member !== 'All' ||
    filters.category !== 'All' ||
    filters.year !== 'All' ||
    filters.sortBy !== 'recently-added';

  return (
    <div className="bg-white rounded-3xl border-2 border-gray-50 shadow-sm p-4 md:p-5 space-y-3">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 md:gap-3">
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
          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Group</label>
          <select value={filters.group} onChange={e => update('group', e.target.value)} className={selectClass}>
            <option value="All">All Groups</option>
            {[...uniqueGroups].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Member</label>
          <select value={filters.member} onChange={e => update('member', e.target.value)} className={selectClass}>
            <option value="All">All Members</option>
            {[...uniqueMembers].filter(Boolean).sort().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Category</label>
          <select value={filters.category} onChange={e => update('category', e.target.value)} className={selectClass}>
            <option value="All">All Categories</option>
            {PHOTOCARD_CATEGORIES.filter(category => uniqueCategories.includes(category)).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[9px] font-black uppercase tracking-widest text-foreground/40 ml-1">Year</label>
          <select value={String(filters.year)} onChange={e => update('year', e.target.value === 'All' ? 'All' : Number(e.target.value))} className={selectClass}>
            <option value="All">All Years</option>
            {[...uniqueYears].filter(Boolean).sort((a, b) => b - a).map(o => <option key={o} value={o}>{o}</option>)}
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
