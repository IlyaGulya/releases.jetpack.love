'use client';

import { useState } from 'react';
import LibrarySearch from '@/components/LibrarySearch';
import VersionSelector from '@/components/VersionSelector';
import { Library } from '@/lib/types';

interface MainContentProps {
  libraries: Library[];
}

export default function MainContent({ libraries }: MainContentProps) {
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="md:col-span-1">
          <LibrarySearch
            libraries={libraries}
            onSelect={setSelectedLibrary}
          />
        </div>

        <div className="md:col-span-3">
          {selectedLibrary ? (
            <VersionSelector library={selectedLibrary} />
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