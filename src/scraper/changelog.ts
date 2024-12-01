import type {CheerioAPI} from "cheerio";
import * as cheerio from 'cheerio';
import {Element} from "domhandler";
import {ProgressBar} from '@opentf/cli-pbar';
import {URL} from 'node:url';
import debug from "debug";
import {format} from 'date-fns';
import {FsStorage} from "./storage";
import type {LibraryChangelog} from "./types";

const BASE_URL = 'https://developer.android.com';
const log = debug('jetpack:changelog');

interface PendingLibrary {
  libraryId: string;
  changelogUrl: string;
  versions: Set<string>;
}

export class ChangelogScraper {
  private progressBar: ProgressBar;

  constructor(private storage: FsStorage) {
    this.progressBar = new ProgressBar({
      size: 'DEFAULT',
      color: 'cyan',
      bgColor: 'gray',
      variant: 'STANDARD',
      showPercent: true,
      showCount: true,
      prefix: '📚 Processing',
      suffix: '',
    });
  }

  private normalizeUrl(urlString: string): string {
    // Handle relative URLs
    const fullUrl = urlString.startsWith('http') ? urlString : `${BASE_URL}${urlString}`;

    try {
      const url = new URL(fullUrl);
      // Remove hash/fragment from URL
      url.hash = '';
      return url.toString();
    } catch (error) {
      console.warn(`Invalid URL: ${urlString}`);
      return fullUrl;
    }
  }

  async scrapeChangelog(library: PendingLibrary): Promise<void> {
    try {
      const normalizedUrl = this.normalizeUrl(library.changelogUrl);
      log(`Scraping changelog for ${library.libraryId} from ${normalizedUrl}`);

      const $ = await cheerio.fromURL(normalizedUrl);

      // First find the main article container
      const articleContainer = $('#gc-wrapper > main > devsite-content > article');
      if (!articleContainer.length) {
        log(`Error: Missing article container for ${library.libraryId}`);
        return;
      }

      // Find the feedback section
      const feedbackSection = articleContainer.find('#feedback');
      if (!feedbackSection.length) {
        log(`Error: Missing feedback section for ${library.libraryId}`);
        return;
      }

      // Get all elements after the feedback section
      const changelogContent = $('<div></div>');
      feedbackSection.nextAll().each((_, elem) => {
        changelogContent.append($(elem));
      });

      log(`Found changelog content for ${library.libraryId}, first h3: ${changelogContent.find('h3').first().text()}`);

      // Find all version sections within this content
      const versionSections = changelogContent.find('h3').filter((_, elem) => {
        const text = $(elem).text().trim();
        return /^Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc)\d+)?$/.test(text);
      });

      this.progressBar.update({
        suffix: `| ${library.libraryId} (${library.versions.size} pending versions)`,
      });

      // Process each version section
      for (const section of versionSections.toArray()) {
        const entry = await this.processVersionSection($, section, library.libraryId, normalizedUrl);
        if (entry && library.versions.has(entry.version)) {
          await this.storage.saveChangelog(entry);
          await this.storage.markReleaseAsProcessed(library.libraryId, entry.version);
        }
      }

    } catch (error) {
      log(`Error scraping ${library.libraryId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }

  async syncPendingChangelogs(): Promise<void> {
    const pendingReleases = await this.storage.getAllUnprocessedReleases();

    // Group releases by normalized URL
    const libraryMap = new Map<string, PendingLibrary>();

    for (const release of pendingReleases) {
      const normalizedUrl = this.normalizeUrl(release.changelogUrl);
      const version = release.version;

      if (!libraryMap.has(normalizedUrl)) {
        libraryMap.set(normalizedUrl, {
          libraryId: release.libraryId,
          changelogUrl: normalizedUrl,
          versions: new Set([version]),
        });
      } else {
        libraryMap.get(normalizedUrl)!.versions.add(version);
      }
    }

    const pendingLibraries = Array.from(libraryMap.values());
    const totalLibraries = pendingLibraries.length;

    console.log(`Found ${totalLibraries} unique changelog URLs to process (${pendingReleases.length} total versions)\n`);

    this.progressBar.start({
      total: totalLibraries,
      value: 0,
    });

    for (const library of pendingLibraries) {
      try {
        await this.scrapeChangelog(library);
      } catch (error) {
        console.error(`Failed to sync changelog for ${library.libraryId}:`, error);
      }

      this.progressBar.inc();
    }

    this.progressBar.stop('✨ Changelog sync completed');
  }

  private parseDateWithOrdinal(dateStr: string): Date | null {
    // Remove ordinal suffixes (st, nd, rd, th) from day numbers
    const normalized = dateStr.replace(/(\d+)(st|nd|rd|th)/, '$1');
    const date = new Date(normalized);
    return isNaN(date.getTime()) ? null : date;
  }

  private findDateInElements($: CheerioAPI, startElem: any): Date | null {
    let currentElem = startElem;
    const datePattern = /(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i;

    // Look through next few elements for a date
    for (let i = 0; i < 3; i++) {
      if (!currentElem || !currentElem.length) break;

      const text = currentElem.text().trim();
      const match = text.match(datePattern);

      if (match) {
        return this.parseDateWithOrdinal(match[0]);
      }

      currentElem = currentElem.next();
    }

    // Try finding date in a recent commits section
    const recentCommitsMatch = startElem.text().match(/Version .+ contains these commits/i);
    if (recentCommitsMatch) {
      // If it's a recent commit message, use today's date
      return new Date();
    }

    return null;
  }

  private isDateOnlyParagraph($: CheerioAPI, elem: any): boolean {
    const text = $(elem).text().trim();
    // If there's nothing but a date in this element
    return !!this.findDateInElements($, $(elem)) && text === text.match(/(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4}/i)?.[0];
  }

  private async processVersionSection($: CheerioAPI, section: Element, libraryId: string, fullUrl: string): Promise<LibraryChangelog | null> {
    const $section = $(section);
    const versionText = $section.text().replace('Version ', '').trim();

    // Try to find the release date in nearby elements
    const releaseDate = this.findDateInElements($, $section.next());

    if (!versionText || !releaseDate) {
      log(`Failed to parse version or date for ${libraryId}: ${versionText} (${$section.next().text().trim()})`);
      return null;
    }

    // Collect changelog content until next version section or end
    const changelogContent = $('<div></div>');
    let currentElement = $section.next();
    let commitsUrl: string | null = null;

    while (currentElement.length && !currentElement.is('h3')) {
      const elem = currentElement.clone();

      // Skip date-only paragraphs
      if (!this.isDateOnlyParagraph($, elem)) {
        // Extract commits URL if present
        const commitLink = elem.find('a').filter(function(_, link) {
          const href = $(link).attr('href');
          const text = $(link).text();
          return href?.includes('android.googlesource.com') && text.includes('contains these commits') || false;
        });

        if (commitLink.length > 0) {
          commitsUrl = commitLink.attr('href') || null;
        }

        // Clean up any devsite-specific elements/attributes
        elem.find('.devsite-heading-link').remove();
        elem.find('[role="presentation"]').removeAttr('role');
        elem.find('[tabindex="-1"]').removeAttr('tabindex');
        elem.find('[data-text]').removeAttr('data-text');
        elem.find('[data-title]').removeAttr('data-title');
        elem.find('[data-id]').removeAttr('data-id');

        changelogContent.append(elem);
      }

      currentElement = currentElement.next();
    }

    return {
      libraryId,
      version: versionText,
      releaseDate: format(releaseDate, 'yyyy-MM-dd'),
      changelogHtml: changelogContent.html() || '',
      sourceUrl: fullUrl,
      commitsUrl: commitsUrl,
    };
  }
}
