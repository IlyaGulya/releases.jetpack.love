'use client';

import { useState, useEffect, ChangeEvent, useCallback } from 'react';
import { Library } from '@/lib/types';
import { Input } from './ui/input';
import Fuse from 'fuse.js';
import { ArrowUpDown } from 'lucide-react';
import semver from 'semver';

interface Version {
  version: string;
  date: string;
  commitsUrl?: string;
  changelogHtml: string;
}

interface VersionSelectorProps {
  library: Library;
}

export default function VersionSelector({ library }: VersionSelectorProps) {
  const [search, setSearch] = useState('');
  const [fuse, setFuse] = useState<Fuse<typeof library.versions[0]>>();
  const [results, setResults] = useState(library.versions);
  const [ascending, setAscending] = useState(false);
  const [selected, setSelected] = useState<{
    from: typeof library.versions[0] | null;
    to: typeof library.versions[0] | null;
  }>({ from: null, to: null });
  const [loading, setLoading] = useState(false);
  const [changelogData, setChangelogData] = useState<Version[]>([]);

  useEffect(() => {
    setFuse(new Fuse(library.versions, {
      keys: ['version'],
      threshold: 0.2
    }));
  }, [library.versions]);

  const sortVersions = useCallback((vers: typeof library.versions, asc: boolean) => {
    return [...vers].sort((a, b) => {
      const comparison = semver.compare(a.version, b.version);
      return asc ? comparison : -comparison;
    });
  }, []);

  useEffect(() => {
    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      setResults(sortVersions(searchResults.map(result => result.item), ascending));
    } else {
      setResults(sortVersions(library.versions, ascending));
    }
  }, [search, fuse, library.versions, ascending, sortVersions]);

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

  const isVersionInRange = (version: string) => {
    if (!selected.from || !selected.to) return false;
    const range = getVersionsInRange(selected.from.version, selected.to.version);
    return range.includes(version);
  };

  const loadVersionChangelog = async (version: string) => {
    const response = await fetch(`/data/versions/${library.id}-${version}.json`);
    return await response.json();
  };

  const handleVersionSelect = async (version: typeof library.versions[0]) => {
    if (!selected.from) {
      setSelected({ from: version, to: null });
    } else if (!selected.to) {
      setSelected(prev => ({ ...prev, to: version }));
      setLoading(true);
      try {
        const versionsInRange = getVersionsInRange(selected.from.version, version.version);
        const changelogs = await Promise.all(
          versionsInRange.map(v => loadVersionChangelog(v))
        );
        setChangelogData(ascending ? changelogs : changelogs.reverse());
      } catch (error) {
        console.error('Error loading changelogs:', error);
      } finally {
        setLoading(false);
      }
    } else {
      setSelected({ from: version, to: null });
      setChangelogData([]);
    }
  };

  const handleSearchChange = (e: ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  const clearSelection = () => {
    setSelected({ from: null, to: null });
    setChangelogData([]);
  };

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
        <button
          className="px-3 py-2 border rounded-md hover:bg-accent transition-colors flex items-center gap-2"
          onClick={() => setAscending(!ascending)}
          title={ascending ? "Newest Last" : "Newest First"}
        >
          <ArrowUpDown
            className="w-4 h-4"
            style={{ transform: ascending ? 'rotate(180deg)' : '' }}
          />
          {ascending ? "Oldest First" : "Newest First"}
        </button>
      </div>

      <div className="flex gap-2 items-center">
        <div className="text-sm">
          From: {selected.from?.version || 'Select version'}
        </div>
        <div className="text-sm">
          To: {selected.to?.version || 'Select version'}
        </div>
        {selected.from && (
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
            const isSelectedVersion = selected.from?.version === version.version || selected.to?.version === version.version;
            const isInRange = isVersionInRange(version.version);
            return (
              <button
                key={version.version}
                onClick={() => handleVersionSelect(version)}
                className={`w-full p-2 text-left rounded-md transition-colors
                  ${selected.from?.version === version.version ? 'bg-primary text-primary-foreground' : ''}
                  ${selected.to?.version === version.version ? 'bg-secondary text-secondary-foreground' : ''}
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

      {loading ? (
        <div className="text-center">Loading changelogs...</div>
      ) : changelogData.length > 0 ? (
        <div className="space-y-8">
          <div className="prose max-w-none dark:prose-invert">
            <h2>Changes between versions</h2>

            {changelogData.map((version, index) => (
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
                  dangerouslySetInnerHTML={{ __html: version.changelogHtml }}
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