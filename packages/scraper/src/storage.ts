import fs from 'fs/promises';
import path from 'path';
import {LibraryChangelog} from "@jetpack.love/common";
import {Document, parse, stringify} from 'yaml';
import * as prettier from "prettier";

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
    await this.ensureDir(path.join(this.dataDir, 'changelogs'));
  }

  async saveChangelog(changelog: LibraryChangelog) {
    const dir = path.join(this.dataDir, 'changelogs', changelog.libraryId);
    await this.ensureDir(dir);

    const doc = new Document({
      libraryId: changelog.libraryId,
      groupId: changelog.groupId,
      version: changelog.version,
      releaseDate: changelog.releaseDate,
    });

    const node = doc.createPair("changelogHtml", await this.formatHtml(changelog.changelogHtml))
    node.key.commentBefore = "language=html"
    doc.add(node)

    const filePath = path.join(dir, `${changelog.version}.yaml`);
    const yamlContent = doc.toString({
      blockQuote: 'literal',
    });
    await fs.writeFile(filePath, yamlContent);
  }

  private async formatHtml(html: string): Promise<string> {
    try {
      return await prettier.format(html, {
        parser: 'html',
        printWidth: 3000,
        tabWidth: 2,
        htmlWhitespaceSensitivity: 'ignore',
      });
    } catch {
      // Fallback to original HTML if formatting fails
      return html;
    }
  }

  async saveUrlToGroupMapping(mapping: Record<string, string>) {
    const filePath = path.join(this.dataDir, 'url-groups.yaml');
    const yamlContent = stringify(mapping, {
      indent: 2,
      defaultStringType: 'QUOTE_DOUBLE',
    });
    await fs.writeFile(filePath, yamlContent);
  }

  async getUrlToGroupMapping(): Promise<Record<string, string>> {
    try {
      const filePath = path.join(this.dataDir, 'url-groups.yaml');
      const content = await fs.readFile(filePath, 'utf-8');
      return parse(content) as Record<string, string>;
    } catch (error) {
      return {};
    }
  }
}
