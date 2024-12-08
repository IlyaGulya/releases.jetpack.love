export interface Library {
  id: string;
  groupId?: string;
  versions: Array<{
    version: string;
    date: string;
  }>;
}

export interface LibraryChangelog {
  version: string;
  releaseDate: string;
  changelogHtml: string;
  commitsUrl?: string;
  groupId?: string;
} 