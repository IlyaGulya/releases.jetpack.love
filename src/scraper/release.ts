import * as cheerio from 'cheerio';
import type {CheerioAPI} from 'cheerio';
import type {LibraryRelease} from './types';
import {parseDate, parseLibraryInfo} from './utils';
import {Element} from "domhandler";
import {format} from 'date-fns';
import {FsStorage} from "./storage";

const BASE_URL = 'https://developer.android.com/jetpack/androidx/versions/all-channel';

export class ReleaseScraper {
  constructor(private storage: FsStorage) {
  }

  async scrapeReleases(): Promise<void> {
    try {
      const $ = await cheerio.fromURL(BASE_URL);

      const releasesSection = $('.releases');
      if (!releasesSection.length) {
        throw new Error('Releases section not found');
      }

      for (const dateHeader of releasesSection.find('h3').toArray()) {
        await this.processReleaseDate($, dateHeader);
      }

      console.log('Scraping completed successfully.');
    } catch (error) {
      if (error instanceof Error) {
        console.error('Error scraping releases:', error.message);
      } else {
        console.error('Unknown error occurred while scraping');
      }
      throw error;
    }
  }

  private async processReleaseDate($: CheerioAPI, dateHeader: Element): Promise<void> {
    const releaseDate = $(dateHeader).text().trim();
    const libraryList = $(dateHeader).next('ul');
    const parsedDate = parseDate(releaseDate);
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');

    // Process each library release
    const libraryReleases = libraryList
      .find('li')
      .map((_, lib) => {
        const linkElement = $(lib).find('a');
        const href = linkElement.attr('href');
        const fullText = linkElement.text();

        if (!href) {
          console.warn(`Missing href for library: ${fullText}`);
          return null;
        }

        const libraryInfo = parseLibraryInfo(fullText, href);
        if (libraryInfo) {
          return {
            ...libraryInfo,
            processed: false,
          };
        }
        return null;
      })
      .get()
      .filter((release: LibraryRelease) => release !== null);

    // Check if we already have releases for this date
    const existingReleases = await this.storage.getReleasesByDate(formattedDate);
    if (!existingReleases) {
      // If no releases exist for this date, save all new releases
      await this.storage.saveRelease(formattedDate, libraryReleases);
    } else {
      // If releases exist, merge new releases with existing ones
      const mergedReleases = [...existingReleases.releases];

      for (const newRelease of libraryReleases) {
        const existingIndex = mergedReleases.findIndex(
          r => r.libraryId === newRelease.libraryId && r.version === newRelease.version,
        );

        if (existingIndex === -1) {
          mergedReleases.push(newRelease);
        }
      }

      await this.storage.saveRelease(formattedDate, mergedReleases);
    }
  }
}
