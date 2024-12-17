// Date patterns used across the project
export const DATE_PATTERNS = {
  // January 1, 2020
  MONTH_DAY_YEAR: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}, \d{4}$/,
  // January 1st, 2020
  MONTH_DAY_ORDINAL_YEAR: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2}(?:st|nd|rd|th), \d{4}$/,
  // 2020-01-01
  ISO_DATE: /^\d{4}-\d{2}-\d{2}$/,
  // 01/01/2020
  SLASH_DATE: /^\d{2}\/\d{2}\/\d{4}$/,
  // Oct 4, 2021
  SHORT_MONTH_DAY_YEAR: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) \d{1,2},? \d{4}$/,
  // Apr 1, 2020 androidx.camera:camera-view:1.0.0-alpha09 is released.
  RELEASE_DATE: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec|January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}(?:\s+androidx\..+?\s+is released\.)$/,
  // April 19, 2018 Paging Release Candidate
  RELEASE_CANDIDATE_DATE: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}(?:\s+[A-Za-z\s]+)$/,
  // May 16, 2018 We highly recommend using Room...
  RECOMMENDATION_DATE: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}(?:\s+We highly recommend.+)$/,
  // Feb 11 2022 (no comma)
  SHORT_DATE_NO_COMMA: /^(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec) \d{1,2} \d{4}$/,
  // February 7, 2024 androidx.compose.ui:ui-*:1.6.1 is released. Version 1.6.1 contains these commits.
  RELEASE_WITH_COMMITS: /^(?:January|February|March|April|May|June|July|August|September|October|November|December) \d{1,2},? \d{4}(?:\s+androidx\..+?\s+is released\.\s+Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)? contains these commits\.)$/
};

export function isExpectedDateFormat(text: string): boolean {
  return Object.values(DATE_PATTERNS).some(pattern => pattern.test(text.trim()));
}

// Version patterns used across the project
export const VERSION_PATTERNS = {
  // Version X.X.X
  STANDARD: /^Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // Annotation-Experimental Version X.X.X
  PREFIXED: /^[A-Za-z][A-Za-z0-9-]+ Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // X.X.X
  PLAIN: /^\d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // androidx.recyclerview 1.1.0-alpha01
  ANDROIDX: /^androidx\.[a-z][a-z0-9-]+ \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // Multiple components in one version
  MULTI_COMPONENT: /^(?:[A-Za-z][A-Za-z0-9-]+(?:(?:,| &| and | & ) [A-Za-z][A-Za-z0-9-]+)*) Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // Component name with version
  COMPONENT: /^[A-Za-z][A-Za-z0-9-]+ \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // ext.junit 1.1.4-alpha01
  EXT_COMPONENT: /^ext\.[a-z]+ \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // androidx.recyclerview-selection 1.1.0-alpha01
  ANDROIDX_SELECTION: /^androidx\.[a-z][a-z0-9-]+-[a-z]+ \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/,
  // Camera Camera2, Core, & Lifecycle Version 1.0.0-beta12
  MULTI_COMPONENT_WITH_COMMA: /^(?:[A-Za-z][A-Za-z0-9-]+(?:(?:,| &| and | & |, ) [A-Za-z][A-Za-z0-9-]+(?:\d+)?)*) Version \d+\.\d+\.\d+(?:-(?:alpha|beta|rc|dev)\d+)?$/
};

export function isExpectedVersionFormat(text: string): boolean {
  return Object.values(VERSION_PATTERNS).some(pattern => pattern.test(text.trim()));
}