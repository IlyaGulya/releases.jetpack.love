'use client';

import {ChangeEvent, useEffect, useState} from 'react';
import Fuse from 'fuse.js';
import {Input} from '@/components/ui/input';
import {Library} from '@/lib/types.ts';

interface LibrarySearchProps {
  libraries: Library[];
  onSelect: (library: Library | null) => void;
  selectedLibrary: Library | null;
}

export default function LibrarySearch({
                                        libraries,
                                        onSelect,
                                        selectedLibrary,
                                      }: LibrarySearchProps) {
  const [search, setSearch] = useState('');
  const [fuse, setFuse] = useState<Fuse<Library>>();
  const [results, setResults] = useState(libraries);

  useEffect(() => {
    setFuse(new Fuse(libraries, {
      keys: ['id', 'groupId'],
      threshold: 0.3,
      includeScore: true,
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
    <div className="w-full h-full flex flex-col">
      <Input
        type="search"
        placeholder="Search libraries..."
        value={search}
        onChange={handleSearchChange}
        className="w-full mb-4 flex-shrink-0"
      />

      <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2">
          {results.map((library) => (
            <button
              key={library.id}
              onClick={() => onSelect(library)}
              className={`w-full p-3 text-left rounded-md transition-colors border
                ${selectedLibrary?.id === library.id ? 'bg-primary text-primary-foreground border-primary' : 'border-border hover:bg-accent'}`}
            >
              <div className="font-medium truncate">{library.id}</div>
              {library.groupId && (
                <div className="text-sm text-muted-foreground truncate">
                  {library.groupId}
                </div>
              )}
              <div className="text-xs text-muted-foreground mt-1">
                {library.versions.length} versions
              </div>
            </button>
          ))}
        </div>

        {results.length === 0 && (
          <div className="text-center text-muted-foreground p-8">
            No libraries found matching "{search}"
          </div>
        )}
      </div>
    </div>
  );
}
