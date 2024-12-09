'use client';

import {ChangeEvent, useEffect, useState} from 'react';
import {Library} from '../lib/types.ts';
import {Input} from '@/components/ui/input.tsx';
import {Button} from '@/components/ui/button';
import {Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter} from '@/components/ui/dialog';
import Fuse from 'fuse.js';
import {ArrowUpDown} from 'lucide-react';
import semver from 'semver';
import {useQueries} from '@tanstack/react-query';

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
  library: Library;
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
  const [search, setSearch] = useState('');
  const [fuse, setFuse] = useState<Fuse<LibraryVersion>>();
  const [results, setResults] = useState<LibraryVersion[]>(library.versions);
  const [ascending, setAscending] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tempVersions, setTempVersions] = useState<{ from: string | null; to: string | null }>({ from: null, to: null });

  useEffect(() => {
    if (dialogOpen) {
      setTempVersions({ from: selectedVersions.from, to: selectedVersions.to });
    }
  }, [dialogOpen, selectedVersions]);

  useEffect(() => {
    setFuse(new Fuse(library.versions, {
      keys: ['version'],
      threshold: 0.2,
    }));
  }, [library.versions]);

  const sortVersions = (vers: typeof library.versions, asc: boolean) => {
    return [...vers].sort((a, b) => {
      const comparison = semver.compare(a.version, b.version);
      return asc ? comparison : -comparison;
    });
  };

  useEffect(() => {
    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      setResults(sortVersions(searchResults.map(result => result.item), ascending));
    } else {
      setResults(sortVersions(library.versions, ascending));
    }
  }, [search, fuse, library.versions, ascending]);

  const getVersionsInRange = (fromVersion: string, toVersion: string) => {
    const sortedVersions = library.versions
      .map(v => v.version)
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(a, b));

    const fromIndex = sortedVersions.indexOf(fromVersion);
    const toIndex = sortedVersions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) return [];

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return sortedVersions.slice(start, end + 1);
  };

  const isVersionInRange = (version: string, range: { from: string | null; to: string | null }) => {
    if (!range.from || !range.to) return false;
    const sortedVersions = library.versions
      .map(v => v.version)
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(a, b));

    const fromIndex = sortedVersions.indexOf(range.from);
    const toIndex = sortedVersions.indexOf(range.to);

    if (fromIndex === -1 || toIndex === -1) return false;

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return sortedVersions.slice(start, end + 1).includes(version);
  };

  const handleVersionSelect = (version: typeof library.versions[0]) => {
    if (!selectedVersions.from || !selectedVersions.to) {
      // Initial selection without dialog
      if (!selectedVersions.from) {
        onSelectVersions({from: version.version, to: null});
      } else if (!selectedVersions.to) {
        const comparison = semver.compare(version.version, selectedVersions.from);
        if (comparison >= 0) {
          onSelectVersions({...selectedVersions, to: version.version});
        } else {
          onSelectVersions({from: version.version, to: selectedVersions.from});
        }
      }
    } else {
      // Open dialog for changing existing selection
      setDialogOpen(true);
    }
  };

  const handleDialogVersionSelect = (version: typeof library.versions[0]) => {
    if (!tempVersions.from) {
      setTempVersions({ from: version.version, to: null });
    } else if (!tempVersions.to) {
      const comparison = semver.compare(version.version, tempVersions.from);
      if (comparison >= 0) {
        setTempVersions({ ...tempVersions, to: version.version });
      } else {
        setTempVersions({ from: version.version, to: tempVersions.from });
      }
    } else {
      setTempVersions({ from: version.version, to: null });
    }
  };

  const handleAcceptVersions = () => {
    if (tempVersions.from && tempVersions.to) {
      onSelectVersions(tempVersions);
      setDialogOpen(false);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const clearSelection = () => {
    onSelectVersions({from: null, to: null});
  };

  const getVersionsToShow = (fromVersion: string, toVersion: string): string[] => {
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

  return (
    <div className="h-full flex flex-col">
      <div className="flex gap-2 mb-4">
        <Input
          type="search"
          placeholder="Search versions..."
          value={search}
          onChange={handleSearchChange}
          className="flex-1"
        />
        <Button
          variant="outline"
          onClick={() => setAscending(!ascending)}
          title={ascending ? "Newest Last" : "Newest First"}
        >
          <ArrowUpDown
            className="w-4 h-4"
            style={{transform: ascending ? 'rotate(180deg)' : ''}}
          />
          {ascending ? "Oldest First" : "Newest First"}
        </Button>
      </div>

      {!selectedVersions.from || !selectedVersions.to ? (
        // Version selection mode
        <div className="flex flex-col flex-1">
          <div className="flex gap-2 items-center mb-2">
            <div className="text-sm">
              From: {selectedVersions.from || 'Select version'}
            </div>
            <div className="text-sm">
              To: {selectedVersions.to || 'Select version'}
            </div>
            {selectedVersions.from && (
              <button
                className="text-sm text-blue-500 hover:text-blue-700"
                onClick={clearSelection}
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            <div className="space-y-1">
              {results.map((version) => (
                <button
                  key={version.version}
                  onClick={() => handleVersionSelect(version)}
                  className={`w-full p-2 text-left rounded-md transition-colors
                    ${selectedVersions.from === version.version ? 'bg-primary text-primary-foreground' : ''}
                    ${selectedVersions.to === version.version ? 'bg-secondary text-secondary-foreground' : ''}
                    ${!selectedVersions.from && !selectedVersions.to ? 'hover:bg-accent' : ''}`}
                >
                  <div className="font-medium">{version.version}</div>
                  <div className="text-sm text-muted-foreground">
                    {version.date}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        // Changelog display mode
        <div className="flex-1 overflow-y-auto min-h-0">
          {isLoading ? (
            <div className="text-center">Loading changelogs...</div>
          ) : error ? (
            <div className="text-center text-red-500">Error loading changelogs</div>
          ) : allVersionData.length > 0 ? (
            <div className="prose max-w-none dark:prose-invert">
              <div className="flex items-center justify-between mb-4">
                <h2 className="m-0">Changes after {selectedVersions.from}</h2>
                <Button variant="outline" onClick={() => setDialogOpen(true)}>
                  Change Versions
                </Button>
              </div>

              {allVersionData.map((version, index) => (
                <div key={index} className="border-l-4 border-primary p-4 mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="m-0">Version {version.version}</h3>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      Released: {version.date}
                    </div>
                  </div>

                  {version.commitsUrl && (
                    <a
                      href={version.commitsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-500 hover:text-blue-700 mb-4 inline-block"
                    >
                      View Commits →
                    </a>
                  )}

                  <div
                    className="changelog-content"
                    dangerouslySetInnerHTML={{__html: version.changelogHtml}}
                  />
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-muted-foreground">
              No changes between selected versions
            </div>
          )}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-background border-border">
          <DialogHeader>
            <DialogTitle>Change Version Range</DialogTitle>
          </DialogHeader>
          
          <div className="py-4">
            <div className="flex gap-2 items-center mb-4">
              <div className="text-sm text-foreground">
                From: {tempVersions.from || 'Select version'}
              </div>
              <div className="text-sm text-foreground">
                To: {tempVersions.to || 'Select version'}
              </div>
              {tempVersions.from && (
                <button
                  className="text-sm text-blue-500 hover:text-blue-700"
                  onClick={() => setTempVersions({ from: null, to: null })}
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-[50vh] overflow-y-auto">
              <div className="space-y-1">
                {results.map((version) => (
                  <button
                    key={version.version}
                    onClick={() => handleDialogVersionSelect(version)}
                    className={`w-full p-2 text-left rounded-md transition-colors
                      ${tempVersions.from === version.version ? 'bg-blue-600 text-white hover:bg-blue-700' : ''}
                      ${tempVersions.to === version.version ? 'bg-green-600 text-white hover:bg-green-700' : ''}
                      ${isVersionInRange(version.version, tempVersions) && !tempVersions.to ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                      ${isVersionInRange(version.version, tempVersions) && tempVersions.to ? 'bg-blue-100 dark:bg-blue-900/40' : ''}
                      ${!tempVersions.from || (!tempVersions.to && version.version !== tempVersions.from) ? 'hover:bg-accent/50' : ''}`}
                  >
                    <div className="font-medium">{version.version}</div>
                    <div className={`text-sm ${tempVersions.from === version.version || tempVersions.to === version.version ? 'text-white/90' : 'text-muted-foreground'}`}>
                      {version.date}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAcceptVersions}
              disabled={!tempVersions.from || !tempVersions.to}
            >
              Accept
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
