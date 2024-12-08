import { mkdir, readdir, readFile, writeFile, stat } from 'fs/promises';
import path from 'path';
import { pnpmWorkspaceRootSync } from "@node-kit/pnpm-workspace-root";
import { Library, LibraryChangelog } from '../src/lib/types';

async function ensureDir(dir: string) {
  await mkdir(dir, { recursive: true });
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch(error) {
    console.error(error);
    return false;
  }
}

async function buildStaticData() {
  const outputDir = path.join(process.cwd(), 'public', 'data');
  
  // Always try to get the workspace root first
  const workspaceRoot = pnpmWorkspaceRootSync(process.cwd());
  if (!workspaceRoot) {
    throw new Error('Could not find workspace root');
  }
  const sourceDir = path.join(workspaceRoot, 'data');

  console.log('Workspace root:', workspaceRoot);
  console.log('Source directory:', sourceDir);
  console.log('Output directory:', outputDir);

  // Ensure output directories exist
  await ensureDir(outputDir);
  await ensureDir(path.join(outputDir, 'libraries'));
  await ensureDir(path.join(outputDir, 'versions'));

  // Check if source directory exists
  const sourceExists = await fileExists(path.join(sourceDir, 'changelogs'));

  if (!sourceExists) {
    throw new Error(`Data directory not found at: ${sourceDir}`);
  }

  // Build library index from real data
  const changelogs = await readdir(path.join(sourceDir, 'changelogs'));
  const libraryIndex: Record<string, Library> = {};

  for (const library of changelogs) {
    const versions = await readdir(path.join(sourceDir, 'changelogs', library));
    const versionInfos: Array<{ version: string; date: string }> = [];

    for (const version of versions) {
      const content = await readFile(
        path.join(sourceDir, 'changelogs', library, version),
        'utf-8',
      );
      const changelog: LibraryChangelog = JSON.parse(content);

      versionInfos.push({
        version: changelog.version,
        date: changelog.releaseDate,
      });

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

    libraryIndex[library] = {
      id: library,
      versions: versionInfos.sort((a, b) =>
        new Date(b.date).getTime() - new Date(a.date).getTime(),
      ),
    };

    await writeFile(
      path.join(outputDir, 'libraries', `${library}.json`),
      JSON.stringify(libraryIndex[library])
    );
  }

  await writeFile(
    path.join(outputDir, 'libraries', 'index.json'),
    JSON.stringify(libraryIndex),
  );

  console.log('Data generation complete!');
}

buildStaticData().catch(console.error); 