import {ChangelogScraper} from "./changelog";
import {FsStorage} from "./storage";
import {fileURLToPath} from "node:url";
import {LibraryGroupParser} from "./groups";
import NodeFetchCache, {FileSystemCache} from 'node-fetch-cache';
import {monorepoRootSync} from "monorepo-root";
import path from "path";

const fetchCached = NodeFetchCache.create({
  cache: new FileSystemCache({
    cacheDirectory: path.join(monorepoRootSync()!, 'data', 'cache'),
    ttl: 24 * 60 * 60 * 1000, // 24 hours
  }),
  shouldCacheResponse: (response) => response.ok,
});

const baseDir = path.join(monorepoRootSync()!, 'data');
const storage = new FsStorage(baseDir);
const changelogScraper = new ChangelogScraper(storage, fetchCached);

async function syncGroups() {
  try {
    console.log('Starting library groups sync...');
    const hierarchy = await new LibraryGroupParser(fetchCached).parseGroups();
    await storage.saveUrlToGroupMapping(hierarchy);

    console.log('Library groups sync completed successfully.');
  } catch (error) {
    console.error('Error in groups sync:', error);
    throw error;
  }
}

async function syncChangelogs() {
  try {
    await changelogScraper.syncChangelogs();
  } catch (error) {
    console.error('Error in changelog sync:', error);
    throw error;
  }
}

async function runAllTasks() {
  try {
    console.log('Running all sync operations...');
    await syncGroups();
    await syncChangelogs();
    console.log('\nAll operations completed successfully.');
  } catch (error) {
    console.error('Error in combined sync:', error);
    throw error;
  }
}

// Main CLI handler
async function main() {
  try {
    // Initialize storage
    await storage.init();

    const command = process.argv[2]?.toLowerCase();

    switch (command) {
      case 'changelogs':
        await syncChangelogs();
        break;

      case 'groups':
        await syncGroups();
        break;

      case 'all':
        await runAllTasks();
        break;

      default:
        console.log('\nAvailable commands:');
        console.log('  changelogs   Sync changelogs');
        console.log('  groups       Sync library groups');
        console.log('  all          Run all sync operations');
        console.log('\nExample usage:');
        console.log('  bun run src/index.ts patterns');
        process.exitCode = 1;
        return;
    }
  } catch (error) {
    console.error('\nFatal error:', error);
    process.exitCode = 1;
  }
}

// Run if called directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main().catch(error => {
    console.error('Unhandled error:', error);
    process.exit(1);
  });
}
