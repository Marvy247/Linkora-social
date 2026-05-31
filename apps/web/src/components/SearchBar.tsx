'use client';

import { useState } from 'react';
import { validateSearchQuery } from '@/lib/validate';
import { FieldError } from './forms/FieldError';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function SearchBar({ onSearch, placeholder = 'Search posts…' }: SearchBarProps) {
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | undefined>();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const result = validateSearchQuery(query);
    if (!result.valid) {
      setError(result.error);
      return;
    }
    setError(undefined);
    onSearch(query.trim());
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="w-full max-w-md" aria-label="Search posts">
      <div className="relative">
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (error) setError(undefined);
          }}
          placeholder={placeholder}
          aria-label="Search query"
          aria-describedby={error ? 'search-error' : undefined}
          aria-invalid={!!error}
          className={`w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            error ? 'border-red-500' : 'border-gray-300'
          }`}
        />
        <button
          type="submit"
          disabled={!query.trim()}
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Search
        </button>
      </div>
      <FieldError id="search-error" message={error} />
    </form>
  );
}
