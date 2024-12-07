import fs from 'fs/promises';
import path from 'path';
import {LibraryChangelog} from "@jetpack.love/common";

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

  async saveChangelog(changelog: LibraryChangelog) {
    const dir = path.join(this.dataDir, 'changelogs', changelog.libraryId);
    await this.ensureDir(dir);

    const filePath = path.join(dir, `${changelog.version}.json`);
    await fs.writeFile(filePath, JSON.stringify(changelog, null, 2));
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
