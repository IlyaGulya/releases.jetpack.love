import {mkdir, readdir, readFile, stat, writeFile} from 'fs/promises';
import * as path from 'path';
import {pnpmWorkspaceRootSync} from "@node-kit/pnpm-workspace-root";
import {Library, LibraryChangelog} from '../src/lib/types';
import {parse as parseYaml} from 'yaml';
import {JSDOM} from 'jsdom';

const ANDROID_DOCS_BASE = 'https://developer.android.com';

function makeUrlsAbsolute(html: string): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  ['href', 'src'].forEach(attr => {
    document.querySelectorAll(`[${attr}]`).forEach((element) => {
      const value = element.getAttribute(attr);
      if (value && 
          !value.startsWith('http') && 
          !value.startsWith('mailto:') && 
          !value.startsWith('#')) {  // Skip anchor links
        const absoluteUrl = value.startsWith('/') 
          ? `${ANDROID_DOCS_BASE}${value}`
          : `${ANDROID_DOCS_BASE}/${value}`;
        element.setAttribute(attr, absoluteUrl);
      }
    });
  });

  return document.body.innerHTML;
}

async function ensureDir(dir: string) {
  await mkdir(dir, {recursive: true});
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
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
    const versions =
      (await readdir(path.join(sourceDir, 'changelogs', library)))
        .filter((versionFile) => versionFile.endsWith('.yaml'));
    const versionInfos: Array<{ version: string; date: string }> = [];

    for (const version of versions) {
      const content = await readFile(
        path.join(sourceDir, 'changelogs', library, version),
        'utf-8',
      );
      // Parse YAML instead of JSON
      const changelog: LibraryChangelog = parseYaml(content);

      // Convert relative URLs to absolute in changelog HTML
      const processedHtml = makeUrlsAbsolute(changelog.changelogHtml);

      versionInfos.push({
        version: changelog.version,
        date: changelog.releaseDate,
      });

      await writeFile(
        path.join(outputDir, 'versions', `${library}-${changelog.version}.json`),
        JSON.stringify({
          version: changelog.version,
          date: changelog.releaseDate,
          changelogHtml: processedHtml, // Use processed HTML with absolute URLs
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
      JSON.stringify(libraryIndex[library]),
    );
  }

  await writeFile(
    path.join(outputDir, 'libraries', 'index.json'),
    JSON.stringify(libraryIndex),
  );

  console.log('Data generation complete!');
}

buildStaticData().catch(console.error);
