import type {CheerioAPI} from "cheerio";
import * as cheerio from 'cheerio';
import {Element} from "domhandler";
import {ProgressBar} from '@opentf/cli-pbar';
import debug from "debug";
import {format} from 'date-fns';
import {FsStorage} from "./storage";
import type {PageCache} from "./cache";
import {cleanVersionString, normalizeDate} from "./utils";
import {LibraryChangelog} from "@jetpack.love/common";

const log = debug('jetpack:changelog');

interface PagePattern {
  name: string;
  detect: ($: CheerioAPI) => boolean;
  extractVersionSections: ($: CheerioAPI) => cheerio.Cheerio<Element>;
}

interface ChangelogPattern {
  name: string;
  detect: ($: CheerioAPI, $section: cheerio.Cheerio<Element>) => boolean;
  extractVersion: ($: CheerioAPI, $section: cheerio.Cheerio<Element>) => string | null;
  extractDate: ($: CheerioAPI, $section: cheerio.Cheerio<Element>) => Date | null;
  extractContent: ($: CheerioAPI, $section: cheerio.Cheerio<Element>) => string | null;
}

const expectedMissingChangelogs = new Set<string>([
  "car",
  "cardview",
  "compose", // umbrella page
  "contentpager",
  "credentials.registry",
  "cursoradapter",
  "databinding",
  "interpolator",
  "legacy",
  "palette",
  "percentlayout",
  "recommendation",
]);

// Page patterns for different types of changelog pages
const PAGE_PATTERNS: PagePattern[] = [
  {
    name: 'Android Docs Changelog',
    detect: ($) => {
      const $content = $('.devsite-article-body');

      // Debug logging for page structure
      log('Page structure:', {
        hasArticleBody: $content.length > 0,
        h2Count: $content.find('h2').length,
        h3Count: $content.find('h3').length,
        firstH2Text: $content.find('h2').first().text().trim(),
        firstH3Text: $content.find('h3').first().text().trim(),
        hasVersionButtons: $content.find('button.devsite-heading-link').length > 0,
        articleText: $content.text().trim().substring(0, 200) + '...' // First 200 chars
      });

      // Check if we have the article body and any version-like headers
      return $content.length > 0 && (
        // Look for any version-like headers in h2 or h3
        $content.find('h2,h3').filter((_, el) => {
          const $el = $(el);
          const text = $el.text().trim();
          const hasVersionText = /Version \d+\.\d+\.\d+|^\d+\.\d+\.\d+/.test(text);
          const hasVersionButton = $el.find('button.devsite-heading-link[data-id*="version"]').length > 0;
          const hasVersionId = $el.attr('id')?.includes('version') || false;

          // Debug logging for version detection
          if (hasVersionText || hasVersionButton || hasVersionId) {
            log('Found version section:', {
              text,
              hasVersionText,
              hasVersionButton,
              hasVersionId,
              elementType: el.tagName,
              id: $el.attr('id')
            });
          }

          return hasVersionText || hasVersionButton || hasVersionId;
        }).length > 0
      );
    },
    extractVersionSections: ($) => {
      const $content = $('.devsite-article-body');
      const $sections = $content.find('h2,h3').filter((_, el) => {
        const $el = $(el);

        // Check for version number in text
        const text = $el.text().trim();
        if (/Version \d+\.\d+\.\d+|^\d+\.\d+\.\d+/.test(text)) {
          return true;
        }

        // Check for version in button id
        const $button = $el.find('button.devsite-heading-link');
        if ($button.length > 0) {
          const id = $button.attr('data-id') || '';
          const dataText = $button.attr('data-text') || '';
          return /-\d+\.\d+\.\d+/.test(id) ||
                 /Version \d+\.\d+\.\d+/.test(dataText);
        }

        // Check for version in section id
        const sectionId = $el.attr('id') || '';
        return /version-\d+\.\d+\.\d+/.test(sectionId);
      });

      // Debug logging for found sections
      log('Found version sections:', {
        count: $sections.length,
        sections: $sections.map((_, el) => ({
          type: el.tagName,
          id: $(el).attr('id'),
          text: $(el).text().trim(),
          buttonId: $(el).find('button.devsite-heading-link').attr('data-id')
        })).get()
      });

      return $sections;
    }
  }
];

// Changelog patterns for different version section formats
const CHANGELOG_PATTERNS: ChangelogPattern[] = [
  {
    name: 'Standard Version Format',
    detect: ($, $section) => {
      const text = $section.text().trim();
      return /Version \d+\.\d+\.\d+|^\d+\.\d+\.\d+/.test(text);
    },
    extractVersion: ($, $section) => {
      const text = $section.text().trim();
      // Try different version patterns
      const patterns = [
        /Version (\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)/,
        /^(\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)/
      ];

      for (const pattern of patterns) {
        const match = text.match(pattern);
        if (match) {
          return cleanVersionString(match[1]);
        }
      }
      return null;
    },
    extractDate: ($, $section) => {
      // First, try to find date in the data-release-date attribute
      const releaseDate = $section.attr('data-release-date');
      if (releaseDate) {
        const parsedDate = new Date(releaseDate);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      }

      // Look for date in the next paragraph after the version header
      let $nextP = $section.next('p');
      if ($nextP.length && !$nextP.find('code').length) {
        const pText = $nextP.text().trim();
        // Try to parse various date formats
        const datePatterns = [
          // April 3rd, 2019
          /([A-Z][a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(\d{4})/,
          // July 2, 2019
          /([A-Z][a-z]+)\s+(\d{1,2}),?\s+(\d{4})/,
          // 2019-04-03
          /(\d{4})-(\d{2})-(\d{2})/,
          // 03/04/2019
          /(\d{2})\/(\d{2})\/(\d{4})/
        ];

        for (const pattern of datePatterns) {
          const match = pText.match(pattern);
          if (match) {
            if (match[1].length === 4) {
              // Handle YYYY-MM-DD format
              const [_, year, month, day] = match;
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              if (!isNaN(date.getTime())) {
                return date;
              }
            } else if (match[3].length === 4) {
              // Handle Month Day, Year format
              const monthMap: Record<string, number> = {
                'January': 0, 'February': 1, 'March': 2, 'April': 3,
                'May': 4, 'June': 5, 'July': 6, 'August': 7,
                'September': 8, 'October': 9, 'November': 10, 'December': 11
              };
              const month = monthMap[match[1]];
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              if (month !== undefined && !isNaN(day) && !isNaN(year)) {
                const date = new Date(year, month, day);
                if (!isNaN(date.getTime())) {
                  return date;
                }
              }
            }
          }
        }
      }

      // If no date found in next paragraph, search in surrounding elements
      let $current = $section.next();
      let searchCount = 0;
      const maxSearchElements = 5;

      while ($current.length && searchCount < maxSearchElements) {
        const text = $current.text().trim();
        if (text) {
          const normalizedDate = normalizeDate(text);
          if (normalizedDate) {
            const date = new Date(normalizedDate);
            if (!isNaN(date.getTime())) {
              return date;
            }
          }
        }
        $current = $current.next();
        searchCount++;
      }

      log('Failed to find date for version section:', {
        sectionId: $section.attr('id'),
        sectionText: $section.text().trim(),
        nextParagraph: $nextP.text().trim()
      });

      return null;
    },
    extractContent: ($, $section) => {
      const content: string[] = [$section.toString()];
      let $current = $section.next();

      while ($current.length) {
        // Stop if we hit another version section
        if ($current.is('h2,h3') && (
          /Version \d+\.\d+\.\d+|^\d+\.\d+\.\d+/.test($current.text().trim()) ||
          $current.find('button.devsite-heading-link').length > 0
        )) {
          break;
        }

        const html = $current.toString();
        if (html.trim()) {
          content.push(html);
        }
        $current = $current.next();
      }

      return content.join('\n');
    }
  },
  {
    name: 'Button-Based Version Format',
    detect: ($, $section) => {
      return $section.find('button.devsite-heading-link').length > 0;
    },
    extractVersion: ($, $section) => {
      const $button = $section.find('button.devsite-heading-link');
      const id = $button.attr('data-id') || '';
      const patterns = [
        /-(\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)/,
        /(\d+\.\d+\.\d+(?:[-+][a-zA-Z0-9.-]+)?)/
      ];

      for (const pattern of patterns) {
        const match = id.match(pattern);
        if (match) {
          return cleanVersionString(match[1]);
        }
      }
      return null;
    },
    extractDate: ($, $section) => {
      // Use the same enhanced date extraction logic as Standard Version Format
      return CHANGELOG_PATTERNS[0].extractDate($, $section);
    },
    extractContent: ($, $section) => {
      // Use the same content extraction logic as Standard Version Format
      return CHANGELOG_PATTERNS[0].extractContent($, $section);
    }
  }
];

export class ChangelogScraper {
  private progressBar: ProgressBar;
  private warnings: Array<{ library: string; message: string; context?: any }> = [];

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

  private getLibraryIdFromUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      const releasesIndex = pathParts.indexOf('releases');
      if (releasesIndex === -1) {
        throw new Error(`Invalid changelog URL format: ${url}`);
      }
      return pathParts.slice(releasesIndex + 1).join('.');
    } catch (error) {
      const matches = url.match(/releases\/(.+?)(?:\/|$)/);
      return matches?.[1] || '';
    }
  }

  private async processChangelog(url: string, groupId: string): Promise<void> {
    const libraryId = this.getLibraryIdFromUrl(url);
    if (!libraryId) {
      this.warnings.push({
        library: url,
        message: `Could not determine library ID from URL`,
        context: { url }
      });
      return;
    }

    // Skip processing if this is an expected missing changelog
    if (expectedMissingChangelogs.has(libraryId)) {
      log(`Skipping expected missing changelog: ${libraryId}`);
      return;
    }

    log(`Processing changelog for ${libraryId}`);

    try {
      const $ = await this.fetchPage(url);

      // Detect page pattern
      const pagePattern = PAGE_PATTERNS.find(pattern => pattern.detect($));
      if (!pagePattern) {
        // Only add warning if it's not an expected missing changelog
        if (!expectedMissingChangelogs.has(libraryId)) {
          this.warnings.push({
            library: libraryId,
            message: "Unknown page pattern detected",
            context: {
              url,
              pageTitle: $('title').text(),
              h1Text: $('h1').map((_, el) => $(el).text()).get(),
              articleBody: {
                exists: $('.devsite-article-body').length > 0,
                headers: $('.devsite-article-body h2, .devsite-article-body h3')
                  .map((_, el) => ({
                    type: el.tagName,
                    id: $(el).attr('id'),
                    text: $(el).text().trim(),
                    hasVersionButton: $(el).find('button.devsite-heading-link').length > 0
                  })).get()
              }
            }
          });
        }
        return;
      }

      log(`Detected page pattern: ${pagePattern.name} for ${libraryId}`);
      const versionSections = pagePattern.extractVersionSections($);

      if (versionSections.length === 0) {
        if (!expectedMissingChangelogs.has(libraryId)) {
          this.warnings.push({
            library: libraryId,
            message: "No version sections found",
            context: {
              pattern: pagePattern.name,
              url,
              pageStructure: {
                headers: $('h1,h2,h3').map((_, el) => ({
                  level: el.tagName,
                  text: $(el).text().trim()
                })).get()
              }
            }
          });
        }
        return;
      }

      log(`Found ${versionSections.length} version sections for ${libraryId}`);
      let processedVersions = 0;

      // Process each version section
      for (const section of versionSections.toArray()) {
        const $section = $(section);

        // Detect changelog pattern
        const changelogPattern = CHANGELOG_PATTERNS.find(pattern => pattern.detect($, $section));
        if (!changelogPattern) {
          this.warnings.push({
            library: libraryId,
            message: "Unknown changelog pattern detected",
            context: {
              sectionHtml: $section.toString(),
              sectionText: $section.text().trim()
            }
          });
          continue;
        }

        const version = changelogPattern.extractVersion($, $section);
        const date = changelogPattern.extractDate($, $section);
        const content = changelogPattern.extractContent($, $section);

        if (!version || !date || !content) {
          this.warnings.push({
            library: libraryId,
            message: "Failed to extract version information",
            context: {
              pattern: changelogPattern.name,
              extracted: { version, date, contentLength: content?.length },
              sectionHtml: $section.toString()
            }
          });
          continue;
        }

        const changelog: LibraryChangelog = {
          libraryId,
          groupId,
          version,
          releaseDate: format(date, 'yyyy-MM-dd'),
          changelogHtml: content,
        };

        await this.storage.saveChangelog(changelog);
        processedVersions++;
        log(`Saved changelog for ${libraryId} version ${version}`);
      }

      // Log processing summary
      if (processedVersions === 0) {
        this.warnings.push({
          library: libraryId,
          message: "Found version sections but failed to process any versions successfully",
          context: {
            totalSections: versionSections.length,
            pagePattern: pagePattern.name
          }
        });
      } else if (processedVersions < versionSections.length) {
        this.warnings.push({
          library: libraryId,
          message: `Only processed ${processedVersions} out of ${versionSections.length} versions successfully`,
          context: {
            processedVersions,
            totalSections: versionSections.length,
            pagePattern: pagePattern.name
          }
        });
      }

      log(`Completed processing ${libraryId}: ${processedVersions}/${versionSections.length} versions processed`);

    } catch (error) {
      // Only add warning if it's not an expected missing changelog
      if (!expectedMissingChangelogs.has(libraryId)) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        this.warnings.push({
          library: libraryId,
          message: `Failed to process changelog: ${message}`,
          context: { error }
        });
        log(`Error processing ${libraryId}: ${message}`);
      }
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
          context: { error }
        });
      }
      this.progressBar.inc();
    }

    this.progressBar.stop('✨ Changelog sync completed');

    // Show warnings if any
    if (this.warnings.length > 0) {
      console.log('\n⚠️  Warnings found during processing:');

      // Group warnings by library
      const warningsByLibrary = this.warnings.reduce((acc, {library, message, context}) => {
        if (!acc[library]) {
          acc[library] = [];
        }
        acc[library].push({ message, context });
        return acc;
      }, {} as Record<string, Array<{ message: string; context?: any }>>);

      // Print warnings grouped by library with context
      Object.entries(warningsByLibrary).forEach(([library, warnings]) => {
        console.log(`\n${library}:`);
        warnings.forEach(({message, context}) => {
          console.log(`  - ${message}`);
          if (context) {
            console.log('    Context:', JSON.stringify(context, null, 2));
          }
        });
      });
    }
  }
}
