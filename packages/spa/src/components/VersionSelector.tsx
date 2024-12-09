'use client';

import {ChangeEvent, useEffect, useState} from 'react';
import {Library} from '../lib/types.ts';
import {Input} from '@/components/ui/input.tsx';
import {Button} from '@/components/ui/button';
import {ArrowUpDown} from 'lucide-react';
import Fuse from 'fuse.js';
import semver from 'semver';
import {useQueries} from '@tanstack/react-query';
import {useNavigate} from 'react-router';
import { usePostHog } from 'posthog-js/react'

interface Version {
  version: string;
  date: string;
  changelogHtml: string;
  commitsUrl?: string;
}

interface LibraryVersion {
  version: string;
  date: string;
}

interface VersionSelectorProps {
  library: Library | null;
  selectedVersions: {
    from: string | null;
    to: string | null;
  };
  onSelectVersions: (versions: { from: string | null; to: string | null }) => void;
}

export default function VersionSelector({
  library,
  selectedVersions,
  onSelectVersions,
}: VersionSelectorProps) {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [ascending, setAscending] = useState(false);
  const [results, setResults] = useState<LibraryVersion[]>([]);
  const [fuse] = useState(() =>
    library ? new Fuse(library.versions, {
      keys: ['version'],
      threshold: 0.2,
    }) : null
  );
  const posthog = usePostHog()

  useEffect(() => {
    if (!library) {
      navigate('/');
    }
  }, [library, navigate]);

  useEffect(() => {
    if (library) {
      setResults(library.versions);
    }
  }, [library?.versions]);

  useEffect(() => {
    if (!library) return;

    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      setResults(sortVersions(searchResults.map(result => result.item), ascending));
    } else {
      setResults(sortVersions(library.versions, ascending));
    }
  }, [search, fuse, library?.versions, ascending]);

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const sortVersions = (versions: LibraryVersion[], asc: boolean) => {
    return [...versions].sort((a, b) => {
      const comparison = semver.compare(a.version, b.version);
      return asc ? comparison : -comparison;
    });
  };

  const handleVersionSelect = (version: LibraryVersion) => {
    if (!selectedVersions.from || !selectedVersions.to) {
      // If clicking the already selected "from" version, deselect it
      if (selectedVersions.from === version.version) {
        posthog?.capture('deselect_version', {
          library: library?.id,
          version: version.version
        })
        onSelectVersions({ from: null, to: null });
        return;
      }

      // Initial selection without dialog
      if (!selectedVersions.from) {
        posthog?.capture('select_from_version', {
          library: library?.id,
          version: version.version
        })
        onSelectVersions({from: version.version, to: null});
      } else if (!selectedVersions.to) {
        // If selecting the same version as "from", deselect "from"
        if (version.version === selectedVersions.from) {
          onSelectVersions({from: null, to: null});
          return;
        }

        const comparison = semver.compare(version.version, selectedVersions.from);
        if (comparison >= 0) {
          posthog?.capture('select_to_version', {
            library: library?.id,
            from_version: selectedVersions.from,
            to_version: version.version
          })
          onSelectVersions({...selectedVersions, to: version.version});
        } else {
          onSelectVersions({from: version.version, to: selectedVersions.from});
        }
      }
    } else {
      posthog?.capture('clear_version_selection', {
        library: library?.id
      })
      clearSelection();
    }
  };

  const clearSelection = () => {
    onSelectVersions({from: null, to: null});
  };

  const getVersionsToShow = (fromVersion: string, toVersion: string): string[] => {
    if (!library) return [];
    const sortedVersions = library.versions
      .map(v => v.version)
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(a, b));

    const fromIndex = sortedVersions.indexOf(fromVersion);
    const toIndex = sortedVersions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) return [];

    if (fromIndex <= toIndex) {
      return sortedVersions.slice(fromIndex + 1, toIndex + 1);
    } else {
      return sortedVersions.slice(toIndex, fromIndex).reverse();
    }
  };

  const versionsToShowQuery = useQueries({
    queries: selectedVersions.from && selectedVersions.to
      ? getVersionsToShow(selectedVersions.from, selectedVersions.to).map(version => ({
        queryKey: ['changelog', library?.id, version],
        queryFn: async () => {
          const response = await fetch(`/data/versions/${library?.id}-${version}.json`);
          if (!response.ok) throw new Error('Failed to fetch changelog');
          return response.json() as Promise<Version>;
        },
        enabled: !!library?.id,
      }))
      : [],
  });

  const isLoading = versionsToShowQuery.some((q) => q.isLoading);
  const error = versionsToShowQuery.some((q) => q.error);
  const allVersionData = versionsToShowQuery
    .filter((q) => q.data)
    .map((q) => q.data as Version)
    .sort((a, b) => (ascending ? 1 : -1) * semver.compare(a.version, b.version));

  // When changelog data is loaded successfully
  useEffect(() => {
    if (allVersionData.length > 0) {
      posthog?.capture('view_changelog', {
        library: library?.id,
        from_version: selectedVersions.from,
        to_version: selectedVersions.to,
        versions_count: allVersionData.length
      })
    }
  }, [allVersionData.length, library?.id, selectedVersions.from, selectedVersions.to])

  if (!library) return null;

  return (
    <div className="h-full flex flex-col">
      {!selectedVersions.from || !selectedVersions.to ? (
        <div className="flex flex-col flex-1 overflow-hidden">
          <div className="flex gap-2 mb-4 flex-shrink-0 flex-wrap">
            <Input
              type="search"
              placeholder="Search versions..."
              value={search}
              onChange={handleSearchChange}
              className="flex-1 min-w-[200px]"
            />
            <Button
              variant="outline"
              onClick={() => setAscending(!ascending)}
              title={ascending ? "Newest Last" : "Newest First"}
              className="whitespace-nowrap"
            >
              <ArrowUpDown
                className="w-4 h-4 md:mr-2"
                style={{transform: ascending ? 'rotate(180deg)' : ''}}
              />
              <span className="hidden md:inline">
                {ascending ? "Oldest First" : "Newest First"}
              </span>
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 items-center mb-2 flex-shrink-0">
            <div className="text-sm bg-muted px-2 py-1 rounded-md">
              From: <span className="font-medium">{selectedVersions.from || 'Select version'}</span>
            </div>
            <div className="text-sm bg-muted px-2 py-1 rounded-md">
              To: <span className="font-medium">{selectedVersions.to || 'Select version'}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              disabled={!selectedVersions.from}
              className={`text-sm ${selectedVersions.from ? 'text-destructive hover:text-destructive' : 'text-muted-foreground'}`}
            >
              Clear
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-1 gap-2">
              {results.map((version) => (
                <button
                  key={version.version}
                  onClick={() => handleVersionSelect(version)}
                  className={`w-full p-3 text-left rounded-md transition-colors border
                    ${selectedVersions.from === version.version ? 'bg-primary text-primary-foreground border-primary hover:bg-primary/90' : ''}
                    ${selectedVersions.to === version.version ? 'bg-secondary text-secondary-foreground border-secondary hover:bg-secondary/90' : ''}
                    ${!selectedVersions.from && !selectedVersions.to 
                      ? 'border-input bg-background hover:bg-accent' 
                      : 'border-input bg-background hover:bg-accent'}`}
                >
                  <div className="font-semibold">{version.version}</div>
                  <div className="text-sm">
                    {version.date}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Changelog display mode
        <div className="flex-1 overflow-y-auto min-h-0 pr-2 custom-scrollbar">
          {isLoading ? (
            <div className="text-center p-8">
              <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
              Loading changelogs...
            </div>
          ) : error ? (
            <div className="text-center text-destructive p-8">
              <div className="mb-2">Error loading changelogs</div>
              <Button variant="outline" onClick={clearSelection}>
                Try Different Versions
              </Button>
            </div>
          ) : allVersionData.length > 0 ? (
            <div className="prose max-w-none dark:prose-invert">
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                <h2 className="m-0 text-lg md:text-xl font-semibold">Changes after {selectedVersions.from}</h2>
                <Button variant="outline" onClick={clearSelection}>
                  Change Versions
                </Button>
              </div>

              {allVersionData.map((version, index) => (
                <div key={index} className="border-l-4 border-primary/80 rounded-r-lg p-6 mb-8 bg-card shadow-sm">
                  <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                    <h3 className="m-0 text-base md:text-lg font-semibold text-primary">{version.version}</h3>
                    <div className="text-sm text-muted-foreground">
                      {version.date}
                    </div>
                  </div>

                  {version.commitsUrl && (
                    <a
                      href={version.commitsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:text-primary/90 mb-4 inline-flex items-center gap-1 no-underline"
                    >
                      View Commits
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M7 17L17 7M17 7H7M17 7V17" />
                      </svg>
                    </a>
                  )}

                  <div
                    className="prose dark:prose-invert
                      prose-h3:text-lg prose-h3:text-primary/90 prose-h3:mt-0 prose-h3:border-b prose-h3:border-border/40 prose-h3:pb-2
                      prose-h2:text-xl prose-h2:text-primary
                      prose-ul:space-y-2 
                      prose-li:marker:text-muted-foreground
                      [&_ul_ul]:mt-2 [&_ul_ul]:mb-0 [&_ul_ul]:ml-4
                      max-w-none"
                    dangerouslySetInnerHTML={{__html: version.changelogHtml}}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground p-8">
              <div className="mb-4">No changes between selected versions</div>
              <Button variant="outline" onClick={clearSelection}>
                Try Different Versions
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
