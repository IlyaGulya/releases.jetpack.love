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
        className="w-full mb-2"
      />

      <div className="flex-1 overflow-y-auto">
        <div className="space-y-1">
          {results.map((library) => (
            <button
              key={library.id}
              onClick={() => onSelect(library)}
              className={`w-full p-2 text-left hover:bg-accent rounded-md transition-colors
                ${selectedLibrary?.id === library.id ? 'bg-primary text-primary-foreground' : ''}`}
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
