import {readdir, readFile} from 'fs/promises';
import path from 'path';
import type {PageServerLoad} from './$types';
import {FsStorage} from "../scraper/storage";

interface Version {
  version: string;
  date: string;
  changelogHtml: string;
  commitsUrl?: string | null;
}

interface LibraryInfo {
  id: string;
  groupId?: string;
  versions: Version[];
}

export const load: PageServerLoad = async () => {
  const dataDir = path.join(process.cwd(), 'data');
  const storage = new FsStorage(dataDir);

  // Load library groups
  const groups = await storage.getAllLibraryGroups();
  const groupMap = new Map(groups.map(g => [g.groupId, g]));

  // Read all release dates
  const releaseFiles = await readdir(path.join(dataDir, 'releases'));
  const releases = await Promise.all(
    releaseFiles.map(async (file) => {
      const content = await readFile(path.join(dataDir, 'releases', file), 'utf-8');
      return JSON.parse(content);
    }),
  );

  // Create a map of libraries and their versions
  const librariesMap = new Map<string, LibraryInfo>();

  // Helper function to determine group membership
  const getGroupId = (libraryId: string): string | undefined => {
    return Array.from(groupMap.values()).find(group =>
      group.artifacts.some(pattern => {
        if (pattern.endsWith('*')) {
          const prefix = pattern.slice(0, -1);
          return libraryId.startsWith(prefix);
        }
        return pattern === libraryId;
      })
    )?.groupId;
  };

  // When building librariesMap, merge artifacts that match wildcards
  const mergeWildcardArtifacts = (libraryId: string, groupId?: string) => {
    if (!groupId) return libraryId;

    const group = groupMap.get(groupId);
    if (!group) return libraryId;

    // If there's a wildcard pattern matching this artifact, use the pattern instead
    const matchingPattern = group.artifacts.find(pattern => {
      if (pattern.endsWith('*')) {
        const prefix = pattern.slice(0, -1);
        return libraryId.startsWith(prefix);
      }
      return false;
    });

    return matchingPattern || libraryId;
  };

  // Process releases to build library information
  for (const release of releases) {
    for (const lib of release.releases) {
      const groupId = getGroupId(lib.libraryId);
      const effectiveLibraryId = mergeWildcardArtifacts(lib.libraryId, groupId);

      if (!librariesMap.has(effectiveLibraryId)) {
        librariesMap.set(effectiveLibraryId, {
          id: effectiveLibraryId,
          groupId,
          versions: [],
        });
      }

      const changelog = await readFile(
        path.join(dataDir, 'changelogs', lib.libraryId, `${lib.version}.json`),
        'utf-8',
      ).catch(() => null);

      if (changelog) {
        const parsedChangelog = JSON.parse(changelog);
        const existingVersion = librariesMap.get(effectiveLibraryId)!.versions
          .find(v => v.version === lib.version);

        if (existingVersion) {
          // Merge changelog content if we already have this version
          existingVersion.changelogHtml += parsedChangelog.changelogHtml;
          existingVersion.commitsUrl = existingVersion.commitsUrl || parsedChangelog.commitsUrl;
        } else {
          librariesMap.get(effectiveLibraryId)!.versions.push({
            version: lib.version,
            date: release.releaseDate,
            changelogHtml: parsedChangelog.changelogHtml,
            commitsUrl: parsedChangelog.commitsUrl,
          });
        }
      }
    }
  }

  // Sort libraries, putting artifacts under their main library
  const sortedLibraries = Array.from(librariesMap.values())
    .sort((a, b) => {
      // If both are in the same group, sort by ID
      if (a.groupId === b.groupId) {
        return a.id.localeCompare(b.id);
      }
      // If only one is in a group, it comes after the main library
      if (a.groupId && !b.groupId) return 1;
      if (!a.groupId && b.groupId) return -1;
      // Otherwise, sort alphabetically
      return a.id.localeCompare(b.id);
    });

  return {
    libraries: sortedLibraries,
    groups: Array.from(groupMap.values()),
  };
};

