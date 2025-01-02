import fs from 'fs/promises';
import path from 'path';
import {LibraryChangelog} from "@jetpack.love/common";
import {Document, parse, stringify, Pair, YAMLMap, Scalar} from 'yaml';
import * as prettier from "prettier";

interface UnprocessedNodesData {
  libraryId: string;
  groupId: string;
  url: string;
  timestamp: string;
  nodeGroups: Array<{
    type: string;
    html: string;
    location: {
      startIndex: number;
      endIndex: number;
    };
  }>;
}

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
    await this.ensureDir(path.join(this.dataDir, 'unprocessed'));
  }

  async saveUnprocessedNodes(data: UnprocessedNodesData) {
    const dir = path.join(this.dataDir, 'unprocessed', data.libraryId);
    await this.ensureDir(dir);

    // Create a filename with timestamp
    const timestamp = data.timestamp.replace(/[:.]/g, '-');
    const filePath = path.join(dir, `unprocessed-${timestamp}.yaml`);

    // Format HTML in each node group
    const formattedData = {
      libraryId: data.libraryId,
      groupId: data.groupId,
      url: data.url,
      timestamp: data.timestamp,
    };

    const doc = new Document(formattedData);

    const nodeGroups = await Promise.all(data.nodeGroups.map(async group => {
      const groupDoc = new Document({
        type: group.type,
        location: group.location,
      });
      const node = groupDoc.createPair("html", await this.formatHtml(group.html));
      node.key.commentBefore = "language=html";
      if (node.value instanceof Scalar) {
        node.value.type = 'BLOCK_LITERAL';
      }
      groupDoc.add(node);
      return groupDoc;
    }));

    const nodeGroupsPair = doc.createPair("nodeGroups", nodeGroups);
    doc.add(nodeGroupsPair);

    await fs.writeFile(filePath, doc.toString());
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

    const node = doc.createPair("changelogHtml", await this.formatHtml(changelog.changelogHtml));
    node.key.commentBefore = "language=html";
    if (node.value instanceof Scalar) {
      node.value.type = 'BLOCK_LITERAL';
    }
    doc.add(node);

    const filePath = path.join(dir, `${changelog.version}.yaml`);
    await fs.writeFile(filePath, doc.toString());
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
