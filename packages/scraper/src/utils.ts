import type {LibraryInfo} from "@jetpack.love/common";
import debug from 'debug';

const log = debug('jetpack:parser');

export const cleanVersionString = (version: string): string | null => {
  // Remove library prefixes like "annotation-", "compose-", etc
  const cleanVersion = version.replace(/^[a-zA-Z-]+-(\d)/, '$1');

  // Ensure the version starts with a number
  if (!/^\d/.test(cleanVersion)) {
    return null;
  }

  return cleanVersion;
};

export const normalizeDate = (dateText: string): string => {
  // Remove ordinal indicators and clean up text
  return (
    dateText
      .replace(/(\d+)(st|nd|rd|th)/, '$1')  // Remove ordinal indicators
      .split('\n')[0]  // Take only first line
      .replace(/\s+is released.*$/, '')  // Remove "is released" and following text
      .trim()
  );
};

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
  variants: string[];
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
      variants: [baseLibrary],
    };
  }

  // Parse the full fragment (like "core-ktx-1.0.1" or "compose-material3-1.2.0")
  const parts = fragment.split('-');
  const versionIndex = parts.findIndex(part => /^\d/.test(part));

  if (versionIndex === -1) return null;

  const version = parts.slice(versionIndex).join('-');
  const libraryId = parts.slice(0, versionIndex).join('-');

  // Generate variants
  const variants = [libraryId];

  // Handle camera variants
  if (baseLibrary === 'camera') {
    variants.push(`camera-${libraryId}`);
  }

  // Handle experimental variant
  if (libraryId === 'experimental') {
    variants.push(baseLibrary);
    variants.push(`${baseLibrary}-${libraryId}`);
  }

  // Handle extension variants
  if (libraryId === 'ext') {
    variants.push(baseLibrary);
    variants.push(`${baseLibrary}-${libraryId}`);
  }

  return {
    libraryId,
    version,
    variants,
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
    variants: urlInfo.variants,
  };
};
