'use client';

import { useState, useEffect, ChangeEvent } from 'react';
import Fuse from 'fuse.js';
import { Input } from './ui/input';
import { Library } from '@/lib/types';

interface LibrarySearchProps {
  libraries: Library[];
  onSelect: (library: Library) => void;
}

export default function LibrarySearch({ libraries, onSelect }: LibrarySearchProps) {
  const [search, setSearch] = useState('');
  const [fuse, setFuse] = useState<Fuse<Library>>();
  const [results, setResults] = useState(libraries);

  useEffect(() => {
    setFuse(new Fuse(libraries, {
      keys: ['id', 'groupId'],
      threshold: 0.3,
      includeScore: true
    }));
  }, [libraries]);

  useEffect(() => {
    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      setResults(searchResults.map(result => result.item));
    } else {
      setResults(libraries);
    }
  }, [search, fuse, libraries]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <div className="w-full space-y-2">
      <Input
        type="search"
        placeholder="Search libraries..."
        value={search}
        onChange={handleSearchChange}
        className="w-full"
      />

      <div className="h-[60vh] overflow-y-auto">
        <div className="space-y-1">
          {results.map((library) => (
            <button
              key={library.id}
              onClick={() => onSelect(library)}
              className="w-full p-2 text-left hover:bg-accent rounded-md transition-colors"
            >
              <div className="font-medium">{library.id}</div>
              {library.groupId && (
                <div className="text-sm text-muted-foreground">
                  {library.groupId}
                </div>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
} 