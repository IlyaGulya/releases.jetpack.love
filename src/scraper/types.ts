export type ReleaseDate = {
  releaseDate: string;
  releases: LibraryRelease[];
}
export type LibraryInfo = {
  libraryId: string;
  version: string;
  changelogUrl: string;
  groupId?: string;
  variants: string[];
}

export type LibraryRelease = LibraryInfo & {
  processed: boolean;
}

export type LibraryChangelog = {
  libraryId: string;
  groupId?: string;
  version: string;
  releaseDate: string;
  changelogHtml: string;
  commitsUrl?: string | null;
}
