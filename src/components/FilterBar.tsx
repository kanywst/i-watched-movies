import React, { useMemo, useState } from 'react';
import { Search, SlidersHorizontal, ArrowUpDown, X } from 'lucide-react';
import { clsx } from 'clsx';
import { SORT_OPTIONS } from '../constants';
import type { SortKey } from '../types';

interface FilterBarProps {
  search: string;
  setSearch: (value: string) => void;
  sort: SortKey;
  setSort: (value: SortKey) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  clearTags: () => void;
  allTags: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  setSearch,
  sort,
  setSort,
  selectedTags,
  toggleTag,
  clearTags,
  allTags,
}) => {
  const [tagQuery, setTagQuery] = useState('');

  const visibleTags = useMemo(() => {
    if (!tagQuery) return allTags;
    const q = tagQuery.toLowerCase();
    return allTags.filter(t => t.toLowerCase().includes(q));
  }, [allTags, tagQuery]);

  return (
    <div className="flex flex-col gap-6 mb-12">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1 group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 group-focus-within:text-stone-300 transition-colors" />
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-transparent border-b border-stone-800 py-3 pl-10 pr-4 text-sm text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-500 transition-all rounded-none"
          />
        </div>

        {/* Sort */}
        <div className="relative min-w-[180px] group">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-stone-500 group-focus-within:text-stone-300 transition-colors" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="w-full bg-transparent border-b border-stone-800 py-3 pl-10 pr-8 text-sm text-stone-200 focus:outline-none focus:border-stone-500 appearance-none cursor-pointer transition-all rounded-none"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value} className="bg-dark-bg">{label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="text-xs font-medium text-stone-500 flex items-center gap-1.5 uppercase tracking-wider">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Filter</span>
            </div>
            <input
              type="text"
              value={tagQuery}
              onChange={(e) => setTagQuery(e.target.value)}
              placeholder={`Search ${allTags.length} tags...`}
              className="flex-1 min-w-[160px] max-w-xs bg-transparent border-b border-stone-800 py-1.5 px-2 text-xs text-stone-200 placeholder-stone-600 focus:outline-none focus:border-stone-500 transition-colors rounded-none"
            />
            {selectedTags.length > 0 && (
              <button
                onClick={clearTags}
                className="text-xs text-stone-500 hover:text-stone-200 transition-colors flex items-center gap-1"
              >
                <X className="h-3 w-3" />
                <span>Clear ({selectedTags.length})</span>
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={clsx(
                  'px-3 py-1 text-xs transition-all duration-200 border rounded-full',
                  selectedTags.includes(tag)
                    ? 'bg-stone-100 border-stone-100 text-stone-900 font-medium shadow-sm'
                    : 'bg-transparent border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300',
                )}
              >
                {tag}
              </button>
            ))}
            {visibleTags.length === 0 && (
              <span className="text-xs text-stone-600 italic">No tags match "{tagQuery}"</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
