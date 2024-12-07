<script lang="ts">
  import { onMount } from 'svelte';
  import Fuse from 'fuse.js';
  import { Input } from './ui/input';

  export let libraries: Array<{
    id: string;
    groupId?: string;
  }>;
  export let onSelect: (library: any) => void;

  let search = '';
  let fuse: Fuse<any>;
  let results = libraries;

  onMount(() => {
    fuse = new Fuse(libraries, {
      keys: ['id', 'groupId'],
      threshold: 0.3,
      includeScore: true
    });
  });

  $: {
    if (search.trim() && fuse) {
      const searchResults = fuse.search(search);
      results = searchResults.map(result => result.item);
    } else {
      results = libraries;
    }
  }
</script>

<div class="w-full space-y-2">
    <Input
            type="search"
            placeholder="Search libraries..."
            bind:value={search}
            class="w-full"
    />

    <div class="h-[60vh] overflow-y-auto">
        <div class="space-y-1">
            {#each results as library}
                <button
                        on:click={() => onSelect(library)}
                        class="w-full p-2 text-left hover:bg-accent rounded-md transition-colors"
                >
                    <div class="font-medium">{library.id}</div>
                    {#if library.groupId}
                        <div class="text-sm text-muted-foreground">
                            {library.groupId}
                        </div>
                    {/if}
                </button>
            {/each}
        </div>
    </div>
</div>
