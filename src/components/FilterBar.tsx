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
            onChange={(e) => setSort(e.target.value)}
            className="w-full bg-transparent border-b border-stone-800 py-3 pl-10 pr-8 text-sm text-stone-200 focus:outline-none focus:border-stone-500 appearance-none cursor-pointer transition-all rounded-none"
          >
            <option value="watch_date_desc" className="bg-dark-bg">Watch Date (Newest)</option>
            <option value="watch_date_asc" className="bg-dark-bg">Watch Date (Oldest)</option>
            <option value="point_desc" className="bg-dark-bg">Score (High to Low)</option>
            <option value="point_asc" className="bg-dark-bg">Score (Low to High)</option>
            <option value="release_date_desc" className="bg-dark-bg">Release Date (Newest)</option>
            <option value="release_date_asc" className="bg-dark-bg">Release Date (Oldest)</option>
          </select>
        </div>
      </div>

      {/* Tags */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          <div className="text-xs font-medium text-stone-500 flex items-center gap-1.5 mr-2 uppercase tracking-wider">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <span>Filter</span>
          </div>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={clsx(
                "px-3 py-1 text-xs transition-all duration-200 border rounded-full",
                selectedTags.includes(tag)
                  ? "bg-stone-100 border-stone-100 text-stone-900 font-medium shadow-sm"
                  : "bg-transparent border-stone-800 text-stone-500 hover:border-stone-600 hover:text-stone-300"
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
