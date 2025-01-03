import fs from 'fs/promises';
import path from 'path';
import {LibraryChangelog} from "@jetpack.love/common";
import {Document, parse, stringify, Pair, YAMLMap, Scalar} from 'yaml';
import * as prettier from "prettier";
import { UnprocessedContentMatcher } from './matchers/unprocessed-patterns';

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

  async saveUnprocessedNodes(data: UnprocessedNodesData) {
    const matcher = new UnprocessedContentMatcher();

    // Analyze each node group
    const analyzedGroups = data.nodeGroups.map(group => {
      const isIntentionallySkipped = matcher.isIntentionallyUnprocessed(group.html);
      return {
        ...group,
        intentionallySkipped: isIntentionallySkipped,
        skipReason: isIntentionallySkipped ? matcher.getMatchDetails(group.html) : undefined,
      };
    });

    // Only save truly unprocessed content
    const hasUnintentionallySkippedContent = analyzedGroups.some(
      group => !group.intentionallySkipped,
    );

    if (hasUnintentionallySkippedContent) {
      const dir = path.join(this.dataDir, 'unprocessed', data.libraryId);
      await this.ensureDir(dir);

      const timestamp = data.timestamp.replace(/[:.]/g, '-');
      const filePath = path.join(dir, `unprocessed-${timestamp}.yaml`);

      // Create YAML document with analysis results
      const doc = new Document({
        libraryId: data.libraryId,
        groupId: data.groupId,
        url: data.url,
        timestamp: data.timestamp,
        summary: {
          totalNodes: analyzedGroups.length,
          intentionallySkipped: analyzedGroups.filter(g => g.intentionallySkipped).length,
          requiresReview: analyzedGroups.filter(g => !g.intentionallySkipped).length,
        },
      });

      // Only include nodes that weren't intentionally skipped
      const formattedGroups = await Promise.all(
        analyzedGroups
          .filter(group => !group.intentionallySkipped)
          .map(async group => {
            const formattedHtml = await this.formatHtml(group.html);
            return {
              type: group.type,
              location: group.location,
              html: formattedHtml
            };
          })
      );

      const nodeGroups = formattedGroups.map(group => {
        const groupDoc = new Document();
        Object.entries(group).forEach(([key, value]) => {
          const pair = groupDoc.createPair(key, value);
          if (key === 'html') {
            pair.key.commentBefore = 'language=html';
            if (pair.value instanceof Scalar) {
              pair.value.type = 'BLOCK_LITERAL';
            }
          }
        });
        return groupDoc;
      });

      if (formattedGroups.length > 0) {
        const nodeGroupsPair = doc.createPair("nodeGroups", formattedGroups);
        doc.add(nodeGroupsPair);
        await fs.writeFile(filePath, doc.toString());
      }
    }
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

    const formattedHtml = await this.formatHtml(changelog.changelogHtml);
    const node = doc.createPair("changelogHtml", formattedHtml);
    node.key.commentBefore = "language=html";
    if (node.value instanceof Scalar) {
      node.value.type = 'BLOCK_LITERAL';
    }
    doc.add(node);

    const filePath = path.join(dir, `${changelog.version}.yaml`);
    await fs.writeFile(filePath, doc.toString());
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
