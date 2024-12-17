import {mkdir, readdir, readFile, stat, writeFile} from 'fs/promises';
import * as path from 'path';
import {pnpmWorkspaceRootSync} from "@node-kit/pnpm-workspace-root";
import {Library, LibraryChangelog} from '../src/lib/types';
import {parse as parseYaml} from 'yaml';
import {JSDOM} from 'jsdom';
import {ProgressBar} from '@opentf/cli-pbar';
import debug from 'debug';
import {isExpectedDateFormat, isExpectedVersionFormat} from '@jetpack.love/common';

const log = debug('jetpack:build');
const ANDROID_DOCS_BASE = 'https://developer.android.com';

interface RemovalStats {
  versionHeaders: number;
  dateParagraphs: number;
}

function cleanChangelogHtml(html: string, version: string, library: string, stats: RemovalStats): string {
  const dom = new JSDOM(html);
  const document = dom.window.document;

  // Remove version header
  document.querySelectorAll('h2, h3').forEach((header) => {
    const headerText = header.textContent?.trim() || '';
    // Only remove headers that contain our exact version
    if (headerText.includes(version)) {
      if (!isExpectedVersionFormat(headerText)) {
        log(`[${library}@${version}] Unexpected version header format: "${headerText}"`);
      }
      header.remove();
      stats.versionHeaders++;
    }
  });

  // Remove date paragraph if it's the first paragraph and contains a date
  const firstP = document.querySelector('p');
  if (firstP) {
    const paragraphText = firstP.textContent?.trim() || '';
    const hasDatePattern = /(?:[A-Z][a-z]+\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}|\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/;
    if (hasDatePattern.test(paragraphText)) {
      if (!isExpectedDateFormat(paragraphText)) {
        log(`[${library}@${version}] Unexpected date format: "${paragraphText}"`);
      }
      firstP.remove();
      stats.dateParagraphs++;
    }
  }

  return document.body.innerHTML;
}

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

function extractCommitsUrl(html: string): string | undefined {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Look for the commits link which typically follows the pattern "Version X.X.X contains these commits"
  const commitsLink = document.querySelector('a[href*="android.googlesource.com"]');
  return commitsLink?.getAttribute('href') || undefined;
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

  // Initialize progress bar
  const progressBar = new ProgressBar({
    size: 'DEFAULT',
    color: 'cyan',
    prefix: ' Building static data',
  });

  progressBar.start({
    total: changelogs.length,
    value: 0,
  });

  // Track removal statistics
  const removalStats: RemovalStats = {
    versionHeaders: 0,
    dateParagraphs: 0,
  };

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
      let processedHtml = makeUrlsAbsolute(changelog.changelogHtml);
      
      // Clean version and date from changelog HTML
      processedHtml = cleanChangelogHtml(processedHtml, changelog.version, library, removalStats);
      
      // Extract commits URL from the changelog HTML
      const commitsUrl = extractCommitsUrl(processedHtml);

      versionInfos.push({
        version: changelog.version,
        date: changelog.releaseDate,
      });

      await writeFile(
        path.join(outputDir, 'versions', `${library}-${changelog.version}.json`),
        JSON.stringify({
          version: changelog.version,
          date: changelog.releaseDate,
          changelogHtml: processedHtml,
          commitsUrl,
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

    progressBar.inc();
  }

  progressBar.stop('✨ Static data build completed');

  await writeFile(
    path.join(outputDir, 'libraries', 'index.json'),
    JSON.stringify(libraryIndex),
  );

  // Log removal statistics
  console.log('\nRemoval Statistics:');
  console.log(`- Version headers removed: ${removalStats.versionHeaders}`);
  console.log(`- Date paragraphs removed: ${removalStats.dateParagraphs}`);
  console.log('\nData generation complete!');
}

buildStaticData().catch(console.error);
