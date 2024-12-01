import {ChangelogScraper} from "./changelog";
import {ReleaseScraper} from "./release";
import path from 'path';
import {FsStorage} from "./storage";
import {fileURLToPath} from "node:url";

const storage = new FsStorage(path.join(process.cwd(), 'data'));
const releaseScraper = new ReleaseScraper(storage);
const changelogScraper = new ChangelogScraper(storage);

async function syncReleases() {
  try {
    await releaseScraper.scrapeReleases();
    console.log('Release sync completed successfully.');
  } catch (error) {
    console.error('Error in release sync:', error);
    throw error;
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
        await changelogScraper.syncPendingChangelogs();
        break;

      case 'all':
        await syncReleases();
        await changelogScraper.syncPendingChangelogs();
        break;

      default:
        console.error('Please specify a command: releases, changelogs, or all');
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
