'use client';

import {ChangeEvent, useEffect, useState} from 'react';
import {Library} from '../lib/types.ts';
import {Input} from '@/components/ui/input.tsx';
import {Button} from '@/components/ui/button';
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

    // Only include versions after and including "from" up to and including "to"
    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);
    return sortedVersions.slice(start, end + 1);
  };

  const isVersionInRange = (version: string) => {
    if (!selectedVersions.from || !selectedVersions.to) return false;
    const range = getVersionsInRange(selectedVersions.from, selectedVersions.to);
    return range.includes(version);
  };

  const handleVersionSelect = (version: typeof library.versions[0]) => {
    if (!selectedVersions.from) {
      onSelectVersions({from: version.version, to: null});
    } else if (!selectedVersions.to) {
      // Ensure "to" is always the newer version
      const comparison = semver.compare(version.version, selectedVersions.from);
      if (comparison >= 0) {
        onSelectVersions({...selectedVersions, to: version.version});
      } else {
        onSelectVersions({from: version.version, to: selectedVersions.from});
      }
    } else {
      onSelectVersions({from: version.version, to: null});
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const clearSelection = () => {
    onSelectVersions({from: null, to: null});
  };

  // Get all versions between two versions
  const getVersionsToShow = (fromVersion: string, toVersion: string): string[] => {
    const sortedVersions = library.versions
      .map(v => v.version)
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(a, b));

    const fromIndex = sortedVersions.indexOf(fromVersion);
    const toIndex = sortedVersions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) return [];

    // Only include versions after "from" up to and including "to"
    if (fromIndex <= toIndex) {
      return sortedVersions.slice(fromIndex + 1, toIndex + 1);
    } else {
      return sortedVersions.slice(toIndex, fromIndex).reverse();
    }
  };

  // Add queries for versions to show
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
    <div className="space-y-4">
      <div className="flex gap-2">
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

      <div className="flex gap-2 items-center">
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

      <div className="h-[40vh] overflow-y-auto">
        <div className="space-y-1">
          {results.map((version) => {
            const isSelectedVersion = selectedVersions.from === version.version || selectedVersions.to === version.version;
            const isInRange = isVersionInRange(version.version);
            return (
              <button
                key={version.version}
                onClick={() => handleVersionSelect(version)}
                className={`w-full p-2 text-left rounded-md transition-colors
                  ${selectedVersions.from === version.version ? 'bg-primary text-primary-foreground' : ''}
                  ${selectedVersions.to === version.version ? 'bg-secondary text-secondary-foreground' : ''}
                  ${isInRange && !isSelectedVersion ? 'bg-accent text-accent-foreground' : ''}
                  ${!isSelectedVersion && !isInRange ? 'hover:bg-accent' : ''}`}
              >
                <div className="font-medium">{version.version}</div>
                <div className="text-sm text-muted-foreground">
                  {version.date}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center">Loading changelogs...</div>
      ) : error ? (
        <div className="text-center text-red-500">Error loading changelogs</div>
      ) : selectedVersions.from && selectedVersions.to && allVersionData.length > 0 ? (
        <div className="space-y-8">
          <div className="prose max-w-none dark:prose-invert">
            <h2>Changes after {selectedVersions.from}</h2>

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
        </div>
      ) : (
        <div className="text-center text-muted-foreground">
          Select two versions to compare changelogs
        </div>
      )}
    </div>
  );
}
