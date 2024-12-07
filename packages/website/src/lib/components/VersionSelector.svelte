<script lang="ts">
  import { onMount } from 'svelte';
  import Fuse from 'fuse.js';
  import { Input } from './ui/input';
  import semver from 'semver';
  import { ArrowUpDown } from 'lucide-svelte';

  export let versions: Array<{
    version: string;
    date: string;
  }>;
  export let onCompare: (fromVersion: string, toVersion: string, includeVersions: string[], ascending: boolean) => void;

  let search = '';
  let fuse: Fuse<any>;
  let results = versions;
  let selected = {
    from: null,
    to: null
  };
  let ascending = false; // Default to newest first

  function sortVersions(vers: typeof versions, asc: boolean) {
    return [...vers].sort((a, b) => {
      const comparison = semver.compare(a.version, b.version);
      return asc ? comparison : -comparison;
    });
  }

  onMount(() => {
    fuse = new Fuse(versions, {
      keys: ['version'],
      threshold: 0.2
    });

    results = sortVersions(versions, ascending);
  });

  $: {
    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      results = sortVersions(searchResults.map(result => result.item), ascending);
    } else {
      results = sortVersions(versions, ascending);
    }
  }

  function toggleSort() {
    ascending = !ascending;
    results = sortVersions(results, ascending);
  }

  function getVersionsInRange(fromVersion: string, toVersion: string) {
    const sortedVersions = versions
      .map(v => v.version)
      .filter(v => semver.valid(v))
      .sort((a, b) => semver.compare(a, b));

    const fromIndex = sortedVersions.indexOf(fromVersion);
    const toIndex = sortedVersions.indexOf(toVersion);

    if (fromIndex === -1 || toIndex === -1) return [];

    const start = Math.min(fromIndex, toIndex);
    const end = Math.max(fromIndex, toIndex);

    return sortedVersions.slice(start, end + 1);
  }

  function isVersionInRange(version: string) {
    if (!selected.from || !selected.to) return false;

    const range = getVersionsInRange(selected.from.version, selected.to.version);
    return range.includes(version);
  }

  function handleVersionSelect(version) {
    if (!selected.from) {
      selected.from = version;
    } else if (!selected.to) {
      selected.to = version;
      const versionsInRange = getVersionsInRange(
        selected.from.version,
        version.version
      );
      onCompare(selected.from.version, version.version, versionsInRange, ascending);
    } else {
      selected = {
        from: version,
        to: null
      };
    }
  }

  function clearSelection() {
    selected = {
      from: null,
      to: null
    };
  }
</script>

<div class="space-y-4">
    <div class="flex gap-2">
        <Input
                type="search"
                placeholder="Search versions..."
                bind:value={search}
                class="flex-1"
        />
        <button
                class="px-3 py-2 border rounded-md hover:bg-accent transition-colors flex items-center gap-2"
                on:click={toggleSort}
                title={ascending ? "Newest Last" : "Newest First"}
        >
            <ArrowUpDown
                    class="w-4 h-4"
                    style={ascending ? "transform: rotate(180deg)" : ""}
            />
            {ascending ? "Oldest First" : "Newest First"}
        </button>
    </div>

    <div class="flex gap-2 items-center">
        <div class="text-sm">
            From: {selected.from?.version || 'Select version'}
        </div>
        <div class="text-sm">
            To: {selected.to?.version || 'Select version'}
        </div>
        {#if selected.from}
            <button
                    class="text-sm text-blue-500 hover:text-blue-700"
                    on:click={clearSelection}
            >
                Clear
            </button>
        {/if}
    </div>

    <div class="h-[40vh] overflow-y-auto">
        <div class="space-y-1">
            {#each results as version}
                {@const isSelected = selected.from?.version === version.version || selected.to?.version === version.version}
                {@const isInRange = isVersionInRange(version.version)}
                <button
                        on:click={() => handleVersionSelect(version)}
                        class="w-full p-2 text-left rounded-md transition-colors"
                        class:bg-primary={selected.from?.version === version.version}
                        class:text-primary-foreground={selected.from?.version === version.version}
                        class:bg-secondary={selected.to?.version === version.version}
                        class:text-secondary-foreground={selected.to?.version === version.version}
                        class:bg-accent={isInRange && !isSelected}
                        class:hover:bg-accent={!isSelected && !isInRange}
                        class:text-accent-foreground={isInRange && !isSelected}
                >
                    <div class="font-medium">{version.version}</div>
                    <div class="text-sm text-muted-foreground">
                        {version.date}
                    </div>
                </button>
            {/each}
        </div>
    </div>
</div>
