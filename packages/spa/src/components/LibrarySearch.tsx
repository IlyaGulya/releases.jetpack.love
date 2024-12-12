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
    <div className="w-full flex flex-col h-full">
      <Input
        type="search"
        placeholder="Search libraries..."
        value={search}
        onChange={handleSearchChange}
        className="w-full flex-shrink-0"
      />

      <div className="flex-1 overflow-hidden">
        <div
          className="h-full overflow-y-auto md:custom-scrollbar md:pr-2 scroll-pt-4 scroll-pb-4">
          <div
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 lg:grid-cols-2 gap-2 pt-4 pb-4">
            {results.map((library) => (
              <button
                key={library.id}
                onClick={() => onSelect(library)}
                className={`w-full p-3 text-left rounded-md transition-colors border
                  ${selectedLibrary?.id === library.id
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-input bg-background hover:bg-accent hover:text-accent-foreground'}`}
              >
                <div className="font-semibold truncate">{library.id}</div>
                {library.groupId && (
                  <div className="text-sm text-foreground/70 dark:text-foreground/80 truncate">
                    {library.groupId}
                  </div>
                )}
                <div className="text-xs mt-1">
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
    </div>
  );
}
