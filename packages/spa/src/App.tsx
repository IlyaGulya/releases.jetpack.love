import {QueryClient, QueryClientProvider} from '@tanstack/react-query';
import {useLibraryIndex} from './lib/api';
import MainContent from './components/MainContent';
import {Library} from './lib/types';
import {Navigate, Route, Routes, useNavigate, useParams} from 'react-router';
import {ThemeProvider} from './components/theme-provider';
import {ThemeToggle} from './components/theme-toggle';
import {Button} from './components/ui/button';
import {Github, Bug} from 'lucide-react';
import { getIssueUrl } from './lib/utils';
import { usePostHog } from 'posthog-js/react';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    },
  },
});

interface IssueLinkProps {
  children: React.ReactNode;
  className?: string;
  title?: string;
}

function IssueLink({ children, className, title }: IssueLinkProps) {
  const { libraryId, fromVersion, toVersion } = useParams();
  const posthog = usePostHog();

  const getContextualIssueUrl = () => {
    return getIssueUrl({
      library: libraryId,
      fromVersion,
      toVersion,
      sessionId: posthog.get_session_id(),
      recording: posthog.get_session_replay_url(),
      userAgent: navigator.userAgent,
      url: window.location.href
    });
  };

  return (
    <a
      href={getContextualIssueUrl()}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      onClick={() => {
        posthog.capture('issue_report_clicked', {
          library: libraryId,
          fromVersion,
          toVersion,
          location: window.location.href
        });
      }}
      className={className}
    >
      {children}
    </a>
  );
}

function AppContent() {
  const {data: libraryIndex, isLoading, error} = useLibraryIndex();
  const navigate = useNavigate();
  const {libraryId, fromVersion, toVersion} = useParams();

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
    <ThemeProvider defaultTheme="system" storageKey="releases-theme">
      <QueryClientProvider client={queryClient}>
        <div
          className="bg-background text-foreground min-h-screen md:h-screen flex flex-col md:overflow-hidden">
          <header className="border-b fixed md:static top-0 left-0 right-0 bg-background z-50">
            <div
              className="container mx-auto px-3 py-2 md:p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
              <h1 className="text-lg md:text-2xl font-bold">Jetpack Releases Explorer</h1>
              <div className="flex items-center gap-2 md:gap-4">
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 md:h-8"
                    asChild
                  >
                    <a href="https://gulya.me" target="_blank" rel="noopener noreferrer">
                      Author
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 md:h-8"
                    asChild
                  >
                    <a href="https://github.com/ilyagulya/releases.jetpack.love" target="_blank"
                       rel="noopener noreferrer">
                      <Github className="w-4 h-4"/>
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 md:h-8 text-muted-foreground hover:text-destructive"
                    asChild
                  >
                    <IssueLink title="Report an issue">
                      <Bug className="w-4 h-4"/>
                    </IssueLink>
                  </Button>
                </div>
                <div className="border-l pl-2">
                  <ThemeToggle/>
                </div>
              </div>
            </div>
          </header>
          <main className="pt-[72px] md:pt-0 flex-1 md:overflow-hidden"> {/* Padding top only on mobile */}
            <Routes>
              <Route path="/" element={<AppContent/>}/>
              <Route path="/:libraryId" element={<AppContent/>}/>
              <Route path="/:libraryId/:fromVersion" element={<AppContent/>}/>
              <Route path="/:libraryId/:fromVersion/:toVersion" element={<AppContent/>}/>
              <Route path="*" element={<Navigate to="/" replace/>}/>
            </Routes>
          </main>
          <div className="fixed top-2 right-2 md:top-4 md:right-4 z-[100]">
            <IssueLink
              className="
                inline-flex items-center gap-1.5
                px-2.5 py-1 rounded-full
                bg-gradient-to-r from-destructive/90 to-destructive
                text-destructive-foreground
                shadow-lg shadow-destructive/20
                border border-destructive-foreground/10
                text-xs font-semibold
                hover:from-destructive hover:to-destructive/90
                transition-all
                group
              "
            >
              <span className="relative">
                ALPHA
                <span className="absolute inset-0 animate-ping bg-white/20 rounded-full"></span>
              </span>
              <span className="text-[10px] opacity-80 group-hover:opacity-100">
                • Report Issues
              </span>
            </IssueLink>
          </div>
        </div>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
