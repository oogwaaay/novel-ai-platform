import { useState, FormEvent } from 'react';

interface SearchBarProps {
  placeholder?: string;
  onSearch: (query: string) => void;
  className?: string;
  variant?: 'default' | 'compact';
  autoFocus?: boolean;
}

const SearchBar: React.FC<SearchBarProps> = ({ 
  placeholder = 'Search projects, knowledge, and more...', 
  onSearch, 
  className, 
  variant = 'default',
  autoFocus = false 
}) => {
  const [query, setQuery] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    onSearch(query.trim());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    // Debounce search for better performance
    setTimeout(() => {
      if (e.target.value.trim().length > 1) {
        onSearch(e.target.value.trim());
      }
    }, 300);
  };

  const handleClear = () => {
    setQuery('');
    onSearch('');
  };

  return (
    <form 
      onSubmit={handleSubmit}
      className={`relative flex items-center ${variant === 'compact' ? 'w-full' : 'w-full max-w-md'} ${className || ''}`}
    >
      <div className={`relative w-full ${variant === 'compact' ? 'h-8' : 'h-10'}`}>
        <input
          type="text"
          value={query}
          onChange={handleInputChange}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={`w-full ${variant === 'compact' ? 'h-8 px-3 pl-8 text-sm' : 'h-10 px-4 pl-10 text-base'} 
            rounded-full border border-slate-200 dark:border-slate-700 
            bg-white dark:bg-slate-800 
            text-slate-900 dark:text-white 
            placeholder:text-slate-400 dark:placeholder:text-slate-500 
            focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-blue-500 
            transition-all duration-200`}
        />
        
        {/* Search icon */}
        <div className={`absolute left-0 inset-y-0 flex items-center ${variant === 'compact' ? 'pl-3' : 'pl-4'}`}>
          <svg width={18} height={18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M11 19C15.4183 19 19 15.4183 19 11C19 6.58172 15.4183 3 11 3C6.58172 3 3 6.58172 3 11C3 15.4183 6.58172 19 11 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M21 21L16.65 16.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        
        {/* Clear button */}
        {query && (
          <button
            type="button"
            onClick={handleClear}
            className={`absolute right-0 inset-y-0 flex items-center ${variant === 'compact' ? 'pr-3' : 'pr-4'}`}
            aria-label="Clear search"
          >
            <svg width={16} height={16} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        )}
      </div>
      
      {/* Submit button (only in default variant) */}
      {variant === 'default' && (
        <button
          type="submit"
          className={`ml-2 ${variant === 'compact' ? 'h-8 px-3 text-sm' : 'h-10 px-4 text-base'} 
            rounded-full bg-slate-800 dark:bg-blue-600 
            text-white 
            hover:bg-slate-700 dark:hover:bg-blue-700 
            focus:outline-none focus:ring-2 focus:ring-slate-800 dark:focus:ring-blue-500 
            transition-all duration-200`}
        >
          Search
        </button>
      )}
    </form>
  );
};

export default SearchBar;