// Common version suffixes
const VERSION_SUFFIX = '(?:-(?:alpha|beta|rc|dev)(?:\\d+)?)?';

// Common version number pattern
const VERSION_NUMBER = '\\d+\\.\\d+\\.\\d+' + VERSION_SUFFIX;

// Date patterns used across the project
export const DATE_PATTERNS = {
  // Basic date formats
  STANDARD_DATE: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:st|nd|rd|th)?,? \d{4}$/,
  SHORT_DATE: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) \d{1,2}(?:,| )? \d{4}$/,
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
  SLASH_DATE: /^\d{2}\/\d{2}\/\d{4}$/,
  // Date with additional content
  DATE_WITH_CONTENT: /^(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) \d{1,2}(?:st|nd|rd|th)?,? \d{4}(?:[\s\S]+)?$/,
  // Standalone date in paragraph
  PARAGRAPH_DATE: /(?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) \d{1,2}(?:st|nd|rd|th)?,? \d{4}/,
  // Reverse date format (day month year)
  REVERSE_DATE: /^\d{1,2}(?:st|nd|rd|th)? (?:January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec),? \d{4}$/,
};

// Known date format exclusions - these are valid dates that don't match our patterns
export const DATE_EXCLUSIONS = new Set<string>([
  // Add specific date strings that should be considered valid but don't match patterns
  "February 22nd 2023",
  "February 22nd, 2023",
  "22nd February 2023",
  "22nd February, 2023",
]);

// Version patterns used across the project
export const VERSION_PATTERNS = {
  // Basic version formats
  STANDARD: new RegExp('^Version ' + VERSION_NUMBER + '$', 'i'),
  PLAIN: new RegExp('^' + VERSION_NUMBER + '$'),

  // Component-based formats with any text before "Version"
  WITH_VERSION: new RegExp('^[\\w\\s,&-]+ Version ' + VERSION_NUMBER + '$', 'i'),

  // Framework-specific formats
  ANDROIDX: new RegExp('^androidx\\.[a-z][a-z0-9-]+(?:-[a-z]+)? ' + VERSION_NUMBER + '$'),
  EXT: new RegExp('^ext\\.[a-z]+ ' + VERSION_NUMBER + '$'),

  // Simple component format (for components without "Version" keyword)
  SIMPLE: new RegExp('^[\\w\\s-]+ ' + VERSION_NUMBER + '$', 'i'),
};

// Known version format exclusions - these are valid version headers that don't match our patterns
export const VERSION_EXCLUSIONS = new Set<string>([
  // Keep only truly exceptional cases that don't match our patterns
]);

export function isExpectedDateFormat(text: string): boolean {
  const trimmedText = text.trim();
  // First check exclusions
  if (DATE_EXCLUSIONS.has(trimmedText)) {
    return true;
  }
  // Then check patterns
  return Object.values(DATE_PATTERNS).some(pattern => pattern.test(trimmedText));
}

export function isExpectedVersionFormat(text: string): boolean {
  const trimmedText = text.trim();
  // First check exclusions
  if (VERSION_EXCLUSIONS.has(trimmedText)) {
    return true;
  }
  // Then check patterns
  return Object.values(VERSION_PATTERNS).some(pattern => pattern.test(trimmedText));
}
