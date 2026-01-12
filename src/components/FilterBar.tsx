import React from 'react';
import { Search, SlidersHorizontal, ArrowUpDown } from 'lucide-react';
import { clsx } from 'clsx';

interface FilterBarProps {
  search: string;
  setSearch: (value: string) => void;
  sort: string;
  setSort: (value: string) => void;
  selectedTags: string[];
  toggleTag: (tag: string) => void;
  allTags: string[];
}

export const FilterBar: React.FC<FilterBarProps> = ({
  search,
  setSearch,
  sort,
  setSort,
  selectedTags,
  toggleTag,
  allTags,
}) => {
  return (
    <div className="flex flex-col gap-4 mb-8">
      <div className="flex flex-col md:flex-row gap-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
          <input
            type="text"
            placeholder="Search movies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white placeholder-dark-muted focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all"
          />
        </div>

        {/* Sort */}
        <div className="relative min-w-[160px]">
          <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-dark-muted" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="w-full bg-dark-card border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 appearance-none cursor-pointer"
          >
            <option value="watch_date_desc">Watch Date (Newest)</option>
            <option value="watch_date_asc">Watch Date (Oldest)</option>
            <option value="point_desc">Score (High to Low)</option>
            <option value="point_asc">Score (Low to High)</option>
            <option value="release_date_desc">Release Date (Newest)</option>
            <option value="release_date_asc">Release Date (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="text-xs font-medium text-dark-muted flex items-center gap-1.5 mr-2">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter by:</span>
          </div>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={clsx(
                "px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border",
                selectedTags.includes(tag)
                  ? "bg-purple-500/20 border-purple-500/30 text-purple-300 hover:bg-purple-500/30"
                  : "bg-white/5 border-white/5 text-dark-muted hover:bg-white/10 hover:text-white"
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
