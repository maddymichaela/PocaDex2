/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Search, X } from 'lucide-react';
import { Status } from '../types';

export type SortOption = 'newest' | 'oldest' | 'member-az' | 'member-za' | 'recently-added';

export interface FilterState {
  group: string;
  member: string;
  album: string;
  year: string;
  status: Status | 'All';
  search: string;
  sortBy: SortOption;
}

interface FilterBarProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  uniqueGroups: string[];
  uniqueMembers: string[];
  uniqueAlbums: string[];
  uniqueYears: string[];
}

// Shared classes for all filter selects/inputs — uses semantic tokens, not hardcoded grays
const fieldCls =
  'w-full px-3 py-2 bg-muted border-2 border-border rounded-[14px] text-[10px] md:text-xs font-semibold text-foreground ' +
  'focus:ring-4 focus:ring-primary/10 focus:bg-card focus:border-primary/20 transition-all outline-none h-11 ' +
  'appearance-none cursor-pointer';

export default function FilterBar({
  filters,
  onFilterChange,
  uniqueGroups,
  uniqueMembers,
  uniqueAlbums,
  uniqueYears,
}: FilterBarProps) {
  const updateFilter = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const resetFilters = () => {
    onFilterChange({
      group: 'All',
      member: 'All',
      album: 'All',
      year: 'All',
      status: 'All',
      search: '',
      sortBy: 'recently-added',
    });
  };

  const hasActiveFilters =
    filters.group !== 'All' ||
    filters.member !== 'All' ||
    filters.album !== 'All' ||
    filters.year !== 'All' ||
    filters.status !== 'All' ||
    filters.search !== '' ||
    filters.sortBy !== 'recently-added';

  return (
    <div className="bg-card p-3 md:px-6 md:py-4 rounded-3xl border-2 border-border shadow-sm space-y-3 w-full relative overflow-hidden">
      <div className="flex flex-wrap lg:flex-nowrap gap-3 md:gap-4 items-end relative z-10 w-full">

        {/* Search */}
        <div className="w-full lg:flex-1 min-w-0 md:min-w-[200px] space-y-1.5">
          <label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
            Search
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-primary" size={14} />
            <input
              type="text"
              value={filters.search}
              onChange={(e) => updateFilter('search', e.target.value)}
              placeholder="Search Binder..."
              className={`${fieldCls} pl-9 pr-4`}
            />
          </div>
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap gap-2 md:gap-3 w-full lg:w-auto">

          {/* Sort */}
          <div className="flex-1 sm:flex-none space-y-1.5">
            <label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
              Sort
            </label>
            <select
              value={filters.sortBy}
              onChange={(e) => updateFilter('sortBy', e.target.value)}
              className={fieldCls}
            >
              <option value="recently-added">Recent</option>
              <option value="newest">Newest Year</option>
              <option value="oldest">Oldest Year</option>
              <option value="member-az">A–Z</option>
              <option value="member-za">Z–A</option>
            </select>
          </div>

          {[
            { id: 'group',  label: 'Group',  options: uniqueGroups,  defaultLabel: 'All Groups' },
            { id: 'member', label: 'Member', options: uniqueMembers, defaultLabel: 'All Members' },
            { id: 'album',  label: 'Album',  options: uniqueAlbums,  defaultLabel: 'All Eras' },
            { id: 'year',   label: 'Year',   options: uniqueYears,   defaultLabel: 'All Years', sort: 'desc' },
            { id: 'status', label: 'Status', options: ['owned', 'on_the_way', 'wishlist'], defaultLabel: 'All Status' },
          ].map((item) => (
            <div key={item.id} className="flex-1 sm:flex-none space-y-1.5 min-w-[80px]">
              <label className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground ml-1">
                {item.label}
              </label>
              <select
                value={filters[item.id as keyof FilterState]}
                onChange={(e) => updateFilter(item.id as keyof FilterState, e.target.value)}
                className={fieldCls}
              >
                <option value="All">{item.defaultLabel}</option>
                {item.id === 'status'
                  ? item.options.map((o) => (
                      <option key={o} value={o}>
                        {o.replace(/_/g, ' ').toUpperCase()}
                      </option>
                    ))
                  : (item.sort === 'desc'
                      ? [...item.options].filter(Boolean).sort((a, b) => String(b).localeCompare(String(a)))
                      : [...item.options].filter(Boolean).sort()
                    ).map((o) => (
                      <option key={`${item.id}-${o}`} value={o}>
                        {o}
                      </option>
                    ))}
              </select>
            </div>
          ))}

          {/* Reset */}
          {hasActiveFilters && (
            <button
              onClick={resetFilters}
              className="flex items-center justify-center w-11 h-11 text-muted-foreground hover:text-destructive transition-colors bg-muted rounded-[14px] border border-border self-end"
              title="Reset Filters"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
