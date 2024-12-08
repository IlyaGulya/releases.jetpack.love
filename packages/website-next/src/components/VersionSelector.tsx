'use client';

import { useState } from 'react';
import { Library } from '@/lib/types';

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
  const [fromVersion, setFromVersion] = useState('');
  const [toVersion, setToVersion] = useState('');
  const [ascending, setAscending] = useState(true);
  const [loading, setLoading] = useState(false);
  const [changelogData, setChangelogData] = useState<Version[]>([]);

  const versions = library.versions.map(v => v.version);

  const loadVersionChangelog = async (version: string) => {
    const response = await fetch(`/data/versions/${library.id}-${version}.json`);
    return await response.json();
  };

  const handleCompare = async () => {
    if (!fromVersion || !toVersion) return;

    setLoading(true);
    try {
      const fromIndex = versions.indexOf(fromVersion);
      const toIndex = versions.indexOf(toVersion);
      const [start, end] = fromIndex < toIndex ? [fromIndex, toIndex] : [toIndex, fromIndex];
      
      const versionsToLoad = versions.slice(start, end + 1);
      const changelogs = await Promise.all(
        versionsToLoad.map(version => loadVersionChangelog(version))
      );

      setChangelogData(ascending ? changelogs : changelogs.reverse());
    } catch (error) {
      console.error('Error loading changelogs:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row gap-4">
        <select
          value={fromVersion}
          onChange={(e) => setFromVersion(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md"
        >
          <option value="">Select from version</option>
          {versions.map(version => (
            <option key={version} value={version}>{version}</option>
          ))}
        </select>

        <select
          value={toVersion}
          onChange={(e) => setToVersion(e.target.value)}
          className="flex-1 px-4 py-2 border rounded-md"
        >
          <option value="">Select to version</option>
          {versions.map(version => (
            <option key={version} value={version}>{version}</option>
          ))}
        </select>

        <button
          onClick={() => setAscending(!ascending)}
          className="px-4 py-2 border rounded-md hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          {ascending ? '↑ Ascending' : '↓ Descending'}
        </button>

        <button
          onClick={handleCompare}
          disabled={!fromVersion || !toVersion}
          className="px-4 py-2 bg-primary text-white rounded-md hover:bg-primary/90 disabled:opacity-50"
        >
          Compare
        </button>
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