import fs from 'fs/promises';
import path from 'path';
import type {LibraryChangelog, LibraryRelease, ReleaseDate} from './types';

export class FsStorage {
  constructor(
    private readonly dataDir: string = 'data',
  ) {
  }

  private async ensureDir(dir: string) {
    await fs.mkdir(dir, {recursive: true});
  }

  async init() {
    await this.ensureDir(this.dataDir);
    await this.ensureDir(path.join(this.dataDir, 'releases'));
    await this.ensureDir(path.join(this.dataDir, 'changelogs'));
  }

  async saveRelease(date: string, releases: LibraryRelease[]) {
    const releaseDate: ReleaseDate = {
      releaseDate: date,
      releases,
    };

    const filePath = path.join(this.dataDir, 'releases', `${date}.json`);
    await fs.writeFile(filePath, JSON.stringify(releaseDate, null, 2));
  }

  async saveChangelog(changelog: LibraryChangelog) {
    const dir = path.join(this.dataDir, 'changelogs', changelog.libraryId);
    await this.ensureDir(dir);

    const filePath = path.join(dir, `${changelog.version}.json`);
    await fs.writeFile(filePath, JSON.stringify(changelog, null, 2));
  }

  async getReleasesByDate(date: string): Promise<ReleaseDate | null> {
    try {
      const filePath = path.join(this.dataDir, 'releases', `${date}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async getChangelog(libraryId: string, version: string): Promise<LibraryChangelog | null> {
    try {
      const filePath = path.join(this.dataDir, 'changelogs', libraryId, `${version}.json`);
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return null;
    }
  }

  async getAllUnprocessedReleases(): Promise<LibraryRelease[]> {
    const releases: LibraryRelease[] = [];
    const releaseFiles = await fs.readdir(path.join(this.dataDir, 'releases'));

    for (const file of releaseFiles) {
      const releaseDate = await this.getReleasesByDate(file.replace('.json', ''));
      if (releaseDate) {
        releases.push(...releaseDate.releases.filter(r => !r.processed));
      }
    }

    return releases;
  }

  async markReleaseAsProcessed(libraryId: string, version: string) {
    const releaseFiles = await fs.readdir(path.join(this.dataDir, 'releases'));

    for (const file of releaseFiles) {
      const filePath = path.join(this.dataDir, 'releases', file);
      const releaseDate: ReleaseDate = JSON.parse(await fs.readFile(filePath, 'utf-8'));

      let modified = false;
      releaseDate.releases = releaseDate.releases.map(release => {
        if (release.libraryId === libraryId && release.version === version) {
          modified = true;
          return {...release, processed: true};
        }
        return release;
      });

      if (modified) {
        await fs.writeFile(filePath, JSON.stringify(releaseDate, null, 2));
      }
    }
  }

  async saveUrlToGroupMapping(mapping: Record<string, string>) {
    const filePath = path.join(this.dataDir, 'url-groups.json');
    await fs.writeFile(filePath, JSON.stringify(mapping, null, 2));
  }

  async getUrlToGroupMapping(): Promise<Record<string, string>> {
    try {
      const filePath = path.join(this.dataDir, 'url-groups.json');
      const content = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      return {};
    }
  }
}
