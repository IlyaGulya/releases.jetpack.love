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
