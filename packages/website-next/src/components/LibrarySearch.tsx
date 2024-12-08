'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface Library {
  id: string;
  name?: string;
  versions: Array<{
    version: string;
    date: string;
  }>;
}

interface LibrarySearchProps {
  libraries: Library[];
}

export default function LibrarySearch({ libraries = [] }: LibrarySearchProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const router = useRouter();

  const filteredLibraries = libraries.filter(library =>
    library.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLibrarySelect = (library: Library) => {
    router.push(`/library/${library.id}`);
  };

  return (
    <div className="space-y-4">
      <input
        type="text"
        placeholder="Search libraries..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
      />
      
      <div className="space-y-2">
        {filteredLibraries.map(library => (
          <button
            key={library.id}
            onClick={() => handleLibrarySelect(library)}
            className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
          >
            {library.id}
          </button>
        ))}
      </div>
    </div>
  );
} 