export interface LibraryInfo {
  libraryId: string;
  version: string;
  changelogUrl: string;
  groupId?: string;
  variants: string[];
}

export interface LibraryRelease extends LibraryInfo {
  processed: boolean;
}

export interface LibraryChangelog {
  libraryId: string;
  groupId?: string;
  version: string;
  releaseDate: string;
  changelogHtml: string;
  commitsUrl?: string | null;
}

export interface ReleaseDate {
  releaseDate: string;
  releases: LibraryRelease[];
}

// Website-specific types
export interface Version {
  version: string;
  date: string;
}

export interface Library {
  id: string;
  groupId?: string;
  versions: Version[];
}

export interface VersionDetails {
  version: string;
  date: string;
  changelogHtml: string;
  commitsUrl?: string | null;
}
