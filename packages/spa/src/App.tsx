import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { useLibraryIndex } from './lib/api';
import MainContent from './components/MainContent';
import { Library } from './lib/types';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

function AppContent() {
  const { data: libraryIndex, isLoading, error } = useLibraryIndex();
  const [selectedLibrary, setSelectedLibrary] = useState<Library | null>(null);
  const [selectedVersions, setSelectedVersions] = useState<{
    from: string | null;
    to: string | null;
  }>({ from: null, to: null });

  // Handle URL state
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && libraryIndex) {
      const [libraryId, versions] = hash.split('/');
      const library = libraryIndex[libraryId];
      if (library) {
        setSelectedLibrary(library);
        if (versions) {
          const [from, to] = versions.split('-');
          setSelectedVersions({ from, to });
        }
      }
    }
  }, [libraryIndex]);

  // Update URL when selection changes
  useEffect(() => {
    let hash = '';
    if (selectedLibrary) {
      hash = selectedLibrary.id;
      if (selectedVersions.from && selectedVersions.to) {
        hash += `/${selectedVersions.from}-${selectedVersions.to}`;
      }
    }
    window.location.hash = hash;
  }, [selectedLibrary, selectedVersions]);

  if (isLoading) {
    return <div className="text-center p-8">Loading...</div>;
  }

  if (error) {
    return <div className="text-center p-8 text-red-500">Error loading libraries</div>;
  }

  return (
    <MainContent
      libraries={libraryIndex ? Object.values(libraryIndex) : []}
      selectedLibrary={selectedLibrary}
      onSelectLibrary={setSelectedLibrary}
      selectedVersions={selectedVersions}
      onSelectVersions={setSelectedVersions}
    />
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="dark bg-background text-foreground min-h-screen">
        <header className="border-b">
          <div className="container mx-auto p-4">
            <h1 className="text-2xl font-bold">Releases.Jetpack.Love</h1>
          </div>
        </header>
        <AppContent />
      </div>
    </QueryClientProvider>
  );
}
