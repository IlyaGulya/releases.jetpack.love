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
    <div className="h-[100vh] overflow-hidden">
      <div className="container mx-auto p-4 h-full">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full">
          <div className="md:col-span-1 h-full overflow-hidden">
            <LibrarySearch
              libraries={libraries}
              onSelect={onSelectLibrary}
              selectedLibrary={selectedLibrary}
            />
          </div>

          <div className="md:col-span-3 h-full overflow-hidden">
            {selectedLibrary ? (
              <VersionSelector
                library={selectedLibrary}
                selectedVersions={selectedVersions}
                onSelectVersions={onSelectVersions}
              />
            ) : (
              <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                <h2 className="text-2xl font-medium">Select a library to begin</h2>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
