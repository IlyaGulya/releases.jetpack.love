export interface LibraryInfo {
  libraryId: string;
  version: string;
  changelogUrl: string;
  groupId?: string;
  variants: string[];
}

export interface LibraryChangelog {
  libraryId: string;
  groupId?: string;
  version: string;
  releaseDate: string;
  changelogHtml: string;
  commitsUrl?: string | null;
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
