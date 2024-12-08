'use client';

import LibrarySearch from './LibrarySearch.tsx';
import VersionSelector from './VersionSelector.tsx';
import { Library } from '@/lib/types.ts';

interface MainContentProps {
  libraries: Library[];
  selectedLibrary: Library | null;
  onSelectLibrary: (library: Library | null) => void;
  selectedVersions: {
    from: string | null;
    to: string | null;
  };
  onSelectVersions: (versions: { from: string | null; to: string | null }) => void;
}

export default function MainContent({
  libraries,
  selectedLibrary,
  onSelectLibrary,
  selectedVersions,
  onSelectVersions,
}: MainContentProps) {
  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <LibrarySearch
            libraries={libraries}
            onSelect={onSelectLibrary}
            selectedLibrary={selectedLibrary}
          />
        </div>

        <div className="md:col-span-3">
          {selectedLibrary ? (
            <VersionSelector
              library={selectedLibrary}
              selectedVersions={selectedVersions}
              onSelectVersions={onSelectVersions}
            />
          ) : (
            <div className="text-center text-muted-foreground">
              Select a library to begin
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
