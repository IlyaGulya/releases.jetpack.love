import * as cheerio from 'cheerio';
import {type CheerioAPI} from 'cheerio';
import {Element} from "domhandler";

export class LibraryGroupParser {
  private static readonly BASE_URL = 'https://developer.android.com';

  constructor(private fetch: typeof global.fetch) {
  }

  private async fetchNavigation(): Promise<CheerioAPI> {
    const response = await this.fetch(`${LibraryGroupParser.BASE_URL}/jetpack/androidx/explorer`, {
      headers: {
        'accept-language': 'en',
      },
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch navigation: ${response.status}`);
    }
    return cheerio.load(await response.text());
  }

  async parseGroups(): Promise<Record<string, string>> {
    const $ = await this.fetchNavigation();
    const urlToGroup: Record<string, string> = {};

    // Find the "Release Notes" section and process all library links
    $('span.devsite-nav-text:contains("Release Notes")')
      .closest('.devsite-nav-item')
      .find('a.devsite-nav-title')
      .each(function (_, elem: Element) {
        const link = $(elem);
        const name = link.find('.devsite-nav-text').text().trim();
        const href = link.attr('href');

        if (href && name.startsWith('androidx.')) {
          const url = `${LibraryGroupParser.BASE_URL}${href}`;
          urlToGroup[url] = name.split('.').slice(0, 2).join('.');
        }
      });

    return urlToGroup;
  }
}
