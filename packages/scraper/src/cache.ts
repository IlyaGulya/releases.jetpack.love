// cache.ts
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import debug from 'debug';

const log = debug('jetpack:cache');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

interface CacheEntry {
  content: string;
  url: string;
  timestamp: number;
}

export class PageCache {
  private cacheDir: string;

  constructor(baseDir: string) {
    this.cacheDir = path.join(baseDir, 'cache', 'pages');
  }

  private getCacheKey(url: string): string {
    return crypto.createHash('md5').update(url).digest('hex');
  }

  private async ensureCacheDir(): Promise<void> {
    await fs.mkdir(this.cacheDir, {recursive: true});
  }

  private getCachePath(key: string): string {
    return path.join(this.cacheDir, `${key}.json`);
  }

  async get(url: string): Promise<string | null> {
    try {
      const key = this.getCacheKey(url);
      const cachePath = this.getCachePath(key);

      const content = await fs.readFile(cachePath, 'utf-8');
      const entry: CacheEntry = JSON.parse(content);

      // Check if cache is still valid
      if (Date.now() - entry.timestamp <= CACHE_DURATION) {
        log(`Cache hit for ${url}`);
        return entry.content;
      }

      log(`Cache expired for ${url}`);
      await fs.unlink(cachePath); // Clean up expired cache
      return null;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
        log(`Cache error for ${url}:`, error);
      }
      return null;
    }
  }

  async set(url: string, content: string): Promise<void> {
    try {
      await this.ensureCacheDir();

      const key = this.getCacheKey(url);
      const entry: CacheEntry = {
        content,
        url: url,
        timestamp: Date.now(),
      };

      await fs.writeFile(
        this.getCachePath(key),
        JSON.stringify(entry),
        'utf-8',
      );

      log(`Cached content for ${url}`);
    } catch (error) {
      log(`Failed to cache content for ${url}:`, error);
    }
  }

  async clear(): Promise<void> {
    try {
      await fs.rm(this.cacheDir, {recursive: true, force: true});
      await this.ensureCacheDir();
      log('Cache cleared');
    } catch (error) {
      log('Failed to clear cache:', error);
    }
  }
}
