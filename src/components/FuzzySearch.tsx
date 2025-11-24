import { useState, useMemo } from 'react';
import Fuse from 'fuse.js';
import { Search, X } from 'lucide-react';

interface FuzzySearchProps<T> {
  data: T[];
  keys: string[];
  placeholder?: string;
  onResultsChange: (results: T[]) => void;
  className?: string;
}

export function FuzzySearch<T>({ data, keys, placeholder = 'Search...', onResultsChange, className = '' }: FuzzySearchProps<T>) {
  const [query, setQuery] = useState('');

  const fuse = useMemo(() => {
    return new Fuse(data, {
      keys,
      threshold: 0.3,
      includeScore: true,
      minMatchCharLength: 2,
      ignoreLocation: true,
    });
  }, [data, keys]);

  const handleSearch = (searchQuery: string) => {
    setQuery(searchQuery);
    
    if (!searchQuery.trim()) {
      onResultsChange(data);
      return;
    }

    const results = fuse.search(searchQuery);
    onResultsChange(results.map(result => result.item));
  };

  const clearSearch = () => {
    setQuery('');
    onResultsChange(data);
  };

  return (
    <div className={`relative ${className}`}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2.5 border-2 border-gray-300 rounded-xl focus:border-blue-500 focus:ring-2 focus:ring-blue-200 outline-none transition-all bg-white"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-100 rounded-full transition-colors"
            aria-label="Clear search"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        )}
      </div>
      {query && (
        <div className="absolute left-0 right-0 top-full mt-1 text-xs text-gray-600 bg-blue-50 px-3 py-1 rounded-lg">
          Found {fuse.search(query).length} results for "{query}"
        </div>
      )}
    </div>
  );
}

export default FuzzySearch;
