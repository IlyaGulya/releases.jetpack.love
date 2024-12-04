import {ChangelogScraper} from "./changelog";
import {ReleaseScraper} from "./release";
import path from 'path';
import {FsStorage} from "./storage";
import {fileURLToPath} from "node:url";
import {PageCache} from "./cache";
import {LibraryGroupParser} from "./groups";

const baseDir = path.join(process.cwd(), 'data');
const storage = new FsStorage(baseDir);
const pageCache = new PageCache(baseDir);
const releaseScraper = new ReleaseScraper(storage);
const changelogScraper = new ChangelogScraper(storage, pageCache);

async function syncReleases() {
  try {
    await releaseScraper.scrapeReleases();
    console.log('Release sync completed successfully.');
  } catch (error) {
    console.error('Error in release sync:', error);
    throw error;
  }
}

async function syncGroups() {
  try {
    const hierarchy = await LibraryGroupParser.parseGroups();
    await LibraryGroupParser.updateStorage(storage, hierarchy);

    console.log('Library groups sync completed successfully.');
  } catch (error) {
    console.error('Error in groups sync:', error);
    throw error;
  }
}

async function manageCacheOperation(operation: string) {
  switch (operation) {
    case '--clear':
      await pageCache.clear();
      console.log('Cache cleared successfully.');
      break;
    default:
      console.error('Unknown cache operation. Available operations: --clear');
      process.exitCode = 1;
  }
}

async function main() {
  try {
    // Initialize storage
    await storage.init();

    const command = process.argv[2];

    switch (command) {
      case 'releases':
        await syncReleases();
        break;

      case 'changelogs':
        await changelogScraper.syncChangelogs();
        break;

      case 'cache':
        const operation = process.argv[3];
        if (!operation) {
          console.error('Please specify a cache operation: --clear or --stats');
          process.exitCode = 1;
          return;
        }
        await manageCacheOperation(operation);
        break;

      case 'groups':
        await syncGroups();
        break;

      case 'all':
        await syncGroups();  // Add this line
        await syncReleases();
        await changelogScraper.syncChangelogs();
        break;

      default:
        console.error('Available commands:');
        console.error('  releases     Sync releases');
        console.error('  changelogs   Sync changelogs');
        console.error('  cache        Manage cache (--clear, --stats)');
        console.error('  all          Sync both releases and changelogs');
        process.exitCode = 1;
        return;
    }
  } catch (error) {
    process.exitCode = 1;
  }
}

// Check if this file is being run directly
const isMainModule = process.argv[1] === fileURLToPath(import.meta.url);
if (isMainModule) {
  main();
}
