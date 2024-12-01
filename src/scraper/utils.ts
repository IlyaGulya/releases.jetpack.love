import type {LibraryInfo} from "./types";
import debug from 'debug';

const log = debug('jetpack:parser');

export const parseDate = (dateString: string): Date => {
  const date = new Date(dateString);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid date string: ${dateString}`);
  }
  return date;
};

interface ParsedUrlInfo {
  libraryId: string;
  version: string;
}

export const parseLibraryFromUrl = (url: string): ParsedUrlInfo | null => {
  // First get the base path part after /releases/
  const pathMatch = url.match(/\/releases\/([^/#]+)/);
  if (!pathMatch) return null;

  const baseLibrary = pathMatch[1];
  const fragment = url.split('#')[1];

  if (!fragment) return null;

  // If the fragment has a version number directly (like "1.1.0-alpha01")
  if (/^\d/.test(fragment)) {
    return {
      libraryId: baseLibrary,
      version: fragment,
    };
  }

  // Otherwise, parse the full fragment (like "core-ktx-1.0.1" or "compose-material3-1.2.0")
  const parts = fragment.split('-');
  const versionIndex = parts.findIndex(part => /^\d/.test(part));

  if (versionIndex === -1) return null;

  const version = parts.slice(versionIndex).join('-');
  const libraryId = parts.slice(0, versionIndex).join('-');

  return {
    libraryId,
    version,
  };
};

export const parseLibraryInfo = (text: string, href: string): LibraryInfo | null => {
  // Get libraryId and version from URL
  const urlInfo = parseLibraryFromUrl(href);
  if (!urlInfo) {
    log(`Could not parse library info from href: ${href}`);
    return null;
  }

  return {
    libraryId: urlInfo.libraryId,
    version: urlInfo.version,
    changelogUrl: `https://developer.android.com${href}`,
  };
};
