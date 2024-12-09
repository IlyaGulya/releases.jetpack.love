import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useLibraryIndex } from './lib/api';
import MainContent from './components/MainContent';
import { Library } from './lib/types';
import { Routes, Route, useNavigate, useParams, Navigate } from 'react-router';

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
  const navigate = useNavigate();
  const { libraryId, fromVersion, toVersion } = useParams();

  const selectedLibrary = libraryId && libraryIndex ? libraryIndex[libraryId] : null;
  const selectedVersions = {
    from: fromVersion || null,
    to: toVersion || null,
  };

  const handleSelectLibrary = (library: Library | null) => {
    if (library) {
      navigate(`/${library.id}`);
    } else {
      navigate('/');
    }
  };

  const handleSelectVersions = (versions: { from: string | null; to: string | null }) => {
    if (versions.from && versions.to) {
      navigate(`/${selectedLibrary?.id}/${versions.from}/${versions.to}`);
    } else if (versions.from) {
      navigate(`/${selectedLibrary?.id}/${versions.from}`);
    } else {
      navigate(`/${selectedLibrary?.id}`);
    }
  };

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
      onSelectLibrary={handleSelectLibrary}
      selectedVersions={selectedVersions}
      onSelectVersions={handleSelectVersions}
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
        <Routes>
          <Route path="/" element={<AppContent />} />
          <Route path="/:libraryId" element={<AppContent />} />
          <Route path="/:libraryId/:fromVersion" element={<AppContent />} />
          <Route path="/:libraryId/:fromVersion/:toVersion" element={<AppContent />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </QueryClientProvider>
  );
}
