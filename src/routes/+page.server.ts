import { readdir, readFile } from 'fs/promises';
import path from 'path';
import type { PageServerLoad } from './$types';

interface LibraryInfo {
  id: string;
  versions: Version[];
}

interface Version {
  version: string;
  date: string;
  changelogHtml: string;
  commitsUrl?: string | null;  // Add this field
}

export const load: PageServerLoad = async () => {
  const dataDir = path.join(process.cwd(), 'data');
  const changelogsDir = path.join(dataDir, 'changelogs');
  const releasesDir = path.join(dataDir, 'releases');

  // Read all release dates
  const releaseFiles = await readdir(releasesDir);
  const releases = await Promise.all(
    releaseFiles.map(async (file) => {
      const content = await readFile(path.join(releasesDir, file), 'utf-8');
      return JSON.parse(content);
    }),
  );

  // Create a map of libraries and their versions
  const librariesMap = new Map<string, LibraryInfo>();

  // Process releases to build library information
  for (const release of releases) {
    for (const lib of release.releases) {
      if (!librariesMap.has(lib.libraryId)) {
        librariesMap.set(lib.libraryId, {
          id: lib.libraryId,
          versions: [],
        });
      }

      const changelog = await readFile(
        path.join(changelogsDir, lib.libraryId, `${lib.version}.json`),
        'utf-8',
      ).catch(() => null);

      if (changelog) {
        const parsedChangelog = JSON.parse(changelog);
        librariesMap.get(lib.libraryId)!.versions.push({
          version: lib.version,
          date: release.releaseDate,
          changelogHtml: parsedChangelog.changelogHtml,
        });
      }
    }
  }

  return {
    libraries: Array.from(librariesMap.values())
      .sort((a, b) => a.id.localeCompare(b.id)),
  };
};

