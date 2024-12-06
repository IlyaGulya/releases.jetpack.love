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
import exp from "node:constants";

const log = debug('jetpack:changelog');

interface VersionInfo {
  version: string;
  date: Date;
  content: string;
  commitsUrl?: string;
}

const expectedMissingChangelogs = new Set<string>([
  "car",
  "cardview",
  "compose", // umbrella page
  "contentpager",
  "credentials.registry",
  "cursoradapter",
  "databinding",
]);

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

  private extractVersionFromId(id: string): string | null {
    // Try various version patterns from most specific to least
    const patterns = [
      // Pattern for prefixed versions like "input-motionprediction-1.0.0-beta05"
      /[-.](\d+\.\d+\.\d+(?:[-+].+)?)$/,
      // Pattern for simple versions like "1.0.0-beta05"
      /^(\d+\.\d+\.\d+(?:[-+].+)?)$/,
      // Pattern for version numbers anywhere
      /(\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)/
    ];

    for (const pattern of patterns) {
      const match = id.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private getVersionFromSection($: CheerioAPI, $section: cheerio.Cheerio<Element>): string | null {
    // Try button pattern first
    const $versionButton = $section.find('button.devsite-heading-link');
    const buttonId = $versionButton.attr('data-id');
    if (buttonId) {
      const version = this.extractVersionFromId(buttonId);
      if (version) return version;
    }

    // Try direct id pattern
    const sectionId = $section.attr('id');
    if (sectionId) {
      const version = this.extractVersionFromId(sectionId);
      if (version) return version;
    }

    // Try extracting from text content as last resort
    const headerText = $section.text().trim();
    const version = this.extractVersionFromId(headerText);
    if (version) return version;

    return null;
  }

  private extractVersionInfo($: CheerioAPI, versionSection: Element, libraryId: string): VersionInfo | null {
    const $section = $(versionSection);
    const versionText = this.getVersionFromSection($, $section);

    if (!versionText) {
      // Log more details about the failed section
      const sectionInfo = {
        id: $section.attr('id'),
        buttonId: $section.find('button.devsite-heading-link').attr('data-id'),
        text: $section.text().trim()
      };

      log(`Failed to extract version from section:`, sectionInfo);

      this.warnings.push({
        library: libraryId,
        message: `Version section found but couldn't extract version number. Section ID: "${sectionInfo.id}", Button ID: "${sectionInfo.buttonId}", Text: "${sectionInfo.text}"`,
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
        /\w+ \d{1,2},? \d{4}/,                   // March 13, 2019
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

    // Find next version section (checking both patterns)
    while ($current.length &&
    !this.getVersionFromSection($, $current)) {

      const html = $current.toString();
      const text = $current.text().trim();

      if (text) {
        content.push(html);
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

  private getLibraryIdFromUrl(url: string): string {
    // Parse URL to get path segments
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');

      // Find the position after 'releases' in the path
      const releasesIndex = pathParts.indexOf('releases');
      if (releasesIndex === -1) {
        throw new Error(`Invalid changelog URL format: ${url}`);
      }

      // Get all parts after 'releases'
      const libraryParts = pathParts.slice(releasesIndex + 1);

      // Join parts with dots to form proper libraryId
      return libraryParts.join('.');
    } catch (error) {
      // Fallback to simple parsing if URL is malformed
      const matches = url.match(/releases\/(.+?)(?:\/|$)/);
      return matches?.[1] || '';
    }
  }

  private async processChangelog(url: string, groupId: string): Promise<void> {
    const libraryId = this.getLibraryIdFromUrl(url);
    if (!libraryId) {
      log(`Failed to parse library ID from URL: ${url}`);
      this.warnings.push({
        library: url,  // Use URL as identifier since we couldn't parse libraryId
        message: `Could not determine library ID from URL`,
      });
      return;
    }

    log(`Processing changelog for ${libraryId}`);

    try {
      const $ = await this.fetchPage(url);

      // Find all version sections using both patterns
      const versionSections = $('h3').filter((_, el) => {
        const $section = $(el);
        return this.getVersionFromSection($, $section) !== null;
      });

      if (versionSections.length === 0) {
        if (!expectedMissingChangelogs.has(libraryId)) {
          this.warnings.push({
            library: libraryId,
            message: "No version sections found in changelog. The page might have a different structure or might be empty.",
          });
          log(`Warning: No versions found for ${libraryId}`);
        }
        return;
      }

      log(`Found ${versionSections.length} version sections for ${libraryId}`);
      let processedVersions = 0;

      // Process each version section
      for (const section of versionSections.toArray()) {
        const versionInfo = this.extractVersionInfo($, section, libraryId);

        if (versionInfo) {
          const changelog: LibraryChangelog = {
            libraryId,
            groupId,
            version: versionInfo.version,
            releaseDate: format(versionInfo.date, 'yyyy-MM-dd'),
            changelogHtml: versionInfo.content,
            commitsUrl: versionInfo.commitsUrl,
          };

          await this.storage.saveChangelog(changelog);
          processedVersions++;
          log(`Saved changelog for ${libraryId} version ${versionInfo.version}`);
        }
      }

      // Log processing summary
      if (processedVersions === 0) {
        this.warnings.push({
          library: libraryId,
          message: "Found version sections but failed to process any versions successfully",
        });
      } else if (processedVersions < versionSections.length) {
        this.warnings.push({
          library: libraryId,
          message: `Only processed ${processedVersions} out of ${versionSections.length} versions successfully`,
        });
      }

      log(`Completed processing ${libraryId}: ${processedVersions}/${versionSections.length} versions processed`);

    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.warnings.push({
        library: libraryId,
        message: `Failed to process changelog: ${message}`,
      });
      log(`Error processing ${libraryId}: ${message}`);
    }
  }

  async syncChangelogs(): Promise<void> {
    this.warnings = [];
    const urlToGroup = await this.storage.getUrlToGroupMapping();
    const urls = Object.keys(urlToGroup);

    if (urls.length === 0) {
      console.log('No changelog URLs found. Please run sync-groups first.');
      return;
    }

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
