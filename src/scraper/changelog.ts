import type {CheerioAPI} from "cheerio";
import * as cheerio from 'cheerio';
import {Element} from "domhandler";
import {ProgressBar} from '@opentf/cli-pbar';
import debug from "debug";
import {format} from 'date-fns';
import {FsStorage} from "./storage";
import type {LibraryChangelog} from "./types";
import type {PageCache} from "./cache";
import {normalizeDate} from "./utils";

const log = debug('jetpack:changelog');

interface VersionInfo {
  version: string;
  date: Date;
  content: string;
  commitsUrl?: string;
}

export class ChangelogScraper {
  private progressBar: ProgressBar;
  private warnings: Array<{ library: string; message: string }> = [];

  constructor(
    private storage: FsStorage,
    private pageCache: PageCache,
  ) {
    this.progressBar = new ProgressBar({
      size: 'DEFAULT',
      color: 'cyan',
      prefix: '📚 Processing',
    });
  }

  private async fetchPage(url: string): Promise<CheerioAPI> {
    const cachedContent = await this.pageCache.get(url);
    if (cachedContent) {
      log(`Using cached content for: ${url}`);
      return cheerio.load(cachedContent);
    }

    log(`Fetching page: ${url}`);
    const response = await fetch(url, {
      headers: {
        'accept-language': 'en',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
    }

    const content = await response.text();
    await this.pageCache.set(url, content);
    return cheerio.load(content);
  }

  private extractVersionInfo($: CheerioAPI, versionSection: Element, majorVersionPrefix: string, libraryId: string): VersionInfo | null {
    const $section = $(versionSection);
    const versionText = $section.attr('id')?.replace(`${majorVersionPrefix}.`, '') || '';
    if (!versionText) {
      this.warnings.push({
        library: libraryId,
        message: `Version section found without ID attribute: "${$section.text().trim()}"`,
      });
      return null;
    }

    // Enhanced date extraction
    let dateText = '';
    let $current = $section.next();

    // Look for date in multiple possible locations
    while ($current.length && !dateText) {
      const text = $current.text().trim();

      // Common date patterns
      const datePatterns = [
        /\w+ \d{1,2}(?:st|nd|rd|th)?,? \d{4}/,  // March 13th, 2019
        /\d{4}-\d{2}-\d{2}/,                     // 2024-02-07
        /\w+ \d{1,2},? \d{4}/,                    // March 13, 2019
      ];

      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          dateText = match[0];
          break;
        }
      }

      $current = $current.next();
    }

    if (!dateText) {
      // Check if date might be in the header itself
      const headerText = $section.text().trim();
      const match = headerText.match(/\(([^)]+)\)/);  // Look for date in parentheses
      if (match) {
        dateText = match[1];
      }
    }

    // Parse the normalized date
    const normalizedDate = normalizeDate(dateText);
    const parsedDate = new Date(normalizedDate);
    if (isNaN(parsedDate.getTime())) {
      this.warnings.push({
        library: libraryId,
        message: `Invalid or missing date for version ${versionText}: "${dateText}"`,
      });
      return null;
    }

    // Improved content collection
    const content: string[] = [];
    $current = $section.next();

    // Keep track of empty sections to handle changelog structure variations
    let emptyContentCount = 0;
    const MAX_EMPTY_SECTIONS = 3;

    while ($current.length &&
    !$current.is('h2, h3') &&
    emptyContentCount < MAX_EMPTY_SECTIONS) {

      const html = $current.toString();
      const text = $current.text().trim();

      if (text) {
        content.push(html);
        emptyContentCount = 0;  // Reset counter when content found
      } else {
        emptyContentCount++;
      }

      // Check for commits link
      const $links = $current.find('a');
      $links.each((_, link) => {
        const href = $(link).attr('href');
        const text = $(link).text();
        if (href?.includes('android.googlesource.com') &&
          text.includes('contains these commits')) {
          content.push(`<p><a href="${href}">${text}</a></p>`);
        }
      });

      $current = $current.next();
    }

    if (content.length === 0) {
      this.warnings.push({
        library: libraryId,
        message: `No content found for version ${versionText}`,
      });
      return null;
    }

    return {
      version: versionText,
      date: parsedDate,
      content: content.join('\n'),
      commitsUrl: content.find(html => html.includes('android.googlesource.com'))
        ?.match(/href="([^"]+)"/)?.[1],
    };
  }

  private async processChangelog(url: string, groupId: string): Promise<void> {
    const libraryId = url.split('/').pop() || '';
    log(`Processing changelog for ${libraryId}`);

    try {
      const $ = await this.fetchPage(url);

      // Check if any version info exists in the page
      const hasVersionTable = $('table:contains("Latest Update")').length > 0;
      if (!hasVersionTable) {
        this.warnings.push({
          library: libraryId,
          message: "No version information table found",
        });
      }

      let versionsFound = 0;
      let versionsProcessed = 0;

      // Get version header sections
      $('h2').each((_, versionHeader) => {
        const $header = $(versionHeader);
        const headerText = $header.text().trim();
        const versionMatch = headerText.match(/^Version (\d+\.\d+)/);

        if (versionMatch) {
          const majorVersion = versionMatch[1];
          const versionPrefix = majorVersion.replace('.', '_');

          // Find all version subsections under this major version
          const versionSections = $header.nextUntil('h2', 'h3');
          versionsFound += versionSections.length;

          versionSections.each((_, section) => {
            const versionInfo = this.extractVersionInfo($, section, versionPrefix, libraryId);
            if (versionInfo) {
              const changelog: LibraryChangelog = {
                libraryId,
                groupId,
                version: versionInfo.version,
                releaseDate: format(versionInfo.date, 'yyyy-MM-dd'),
                changelogHtml: versionInfo.content,
                commitsUrl: versionInfo.commitsUrl,
              };

              this.storage.saveChangelog(changelog).catch(error => {
                console.error(`Error saving changelog for ${libraryId} ${versionInfo.version}:`, error);
              });

              versionsProcessed++;
              log(`Saved changelog for ${libraryId} version ${versionInfo.version}`);
            }
          });
        }
      });

      if (versionsFound === 0) {
        this.warnings.push({
          library: libraryId,
          message: "No version sections found in changelog",
        });
      } else if (versionsProcessed < versionsFound) {
        this.warnings.push({
          library: libraryId,
          message: `Only processed ${versionsProcessed} out of ${versionsFound} versions`,
        });
      }

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.warnings.push({
        library: libraryId,
        message: `Failed to process changelog: ${message}`,
      });
    }
  }

  async syncChangelogs(): Promise<void> {
    this.warnings = [];
    const urlToGroup = await this.storage.getUrlToGroupMapping();
    const urls = Object.keys(urlToGroup);

    console.log(`Found ${urls.length} changelogs to process\n`);

    this.progressBar.start({
      total: urls.length,
      value: 0,
    });

    // Process each changelog URL
    for (const url of urls) {
      try {
        const groupId = urlToGroup[url];
        await this.processChangelog(url, groupId);
      } catch (error) {
        const libraryId = url.split('/').pop() || '';
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.warnings.push({
          library: libraryId,
          message: `Failed to process changelog: ${message}`,
        });
      }
      this.progressBar.inc();
    }

    this.progressBar.stop('✨ Changelog sync completed');

    // Show warnings if any
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings found during processing:');

      // Group warnings by library
      const warningsByLibrary = this.warnings.reduce((acc, {library, message}) => {
        if (!acc[library]) {
          acc[library] = [];
        }
        acc[library].push(message);
        return acc;
      }, {} as Record<string, string[]>);

      // Print warnings grouped by library
      Object.entries(warningsByLibrary).forEach(([library, messages]) => {
        console.log(`\n${library}:`);
        messages.forEach(message => console.log(`  - ${message}`));
      });
    }
  }
}
