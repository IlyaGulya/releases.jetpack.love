import {mkdir, readdir, readFile, writeFile} from 'fs/promises';
import path from 'path';
import type {LibraryChangelog, LibraryInfo} from "@jetpack.love/common";
import {pnpmWorkspaceRootSync} from "@node-kit/pnpm-workspace-root";

async function ensureDir(dir: string) {
  await mkdir(dir, {recursive: true});
}

export async function buildStaticData(outDir: string) {
  const sourceDir = path.join(pnpmWorkspaceRootSync()!, 'data');
  const outputDir = path.join(outDir, 'data');

  // Ensure output directories exist
  await ensureDir(path.join(outputDir, 'libraries'));
  await ensureDir(path.join(outputDir, 'versions'));

  // Read all changelogs
  const changelogs = await readdir(path.join(sourceDir, 'changelogs'));

  // Build library index
  const libraryIndex: Record<string, LibraryInfo> = {};

  for (const library of changelogs) {
    const versions = await readdir(path.join(sourceDir, 'changelogs', library));
    const versionInfos = [];

    for (const version of versions) {
      const content = await readFile(
        path.join(sourceDir, 'changelogs', library, version),
        'utf-8',
      );
      const changelog: LibraryChangelog = JSON.parse(content);

      // Add to version index
      versionInfos.push({
        version: changelog.version,
        date: changelog.releaseDate,
      });

      // Write individual version file
      await writeFile(
        path.join(outputDir, 'versions', `${library}-${changelog.version}.json`),
        JSON.stringify({
          version: changelog.version,
          date: changelog.releaseDate,
          changelogHtml: changelog.changelogHtml,
          commitsUrl: changelog.commitsUrl,
        }),
      );
    }

    // Add to library index
    libraryIndex[library] = {
      id: library,
      groupId: versionInfos[0]?.groupId,
      versions: versionInfos.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };
  }

  // Write library index
  await writeFile(
    path.join(outputDir, 'libraries', 'index.json'),
    JSON.stringify(libraryIndex),
  );

  return libraryIndex;
}
