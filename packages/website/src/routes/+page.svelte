<script lang="ts">
  import LibrarySearch from '$lib/components/LibrarySearch.svelte';
  import VersionSelector from '$lib/components/VersionSelector.svelte';

  export let data;

  let selectedLibrary = null;
  let versions = [];
  let changelogData = [];
  let loading = false;

  async function loadVersionChangelog(libraryId: string, version: string) {
    const response = await fetch(`/data/versions/${libraryId}-${version}.json`);
    return await response.json();
  }

  async function handleCompare(fromVersion: string, toVersion: string, versionsToLoad: string[], ascending: boolean) {
    loading = true;
    try {
      const changelogs = await Promise.all(
        versionsToLoad.map(version =>
          loadVersionChangelog(selectedLibrary.id, version)
        )
      );

      // Sort based on user preference
      if (!ascending) {
        changelogs.reverse();
      }

      changelogData = changelogs;
    } catch (error) {
      console.error('Error loading changelogs:', error);
    } finally {
      loading = false;
    }
  }

  function handleLibrarySelect(library) {
    selectedLibrary = library;
    versions = library.versions;
    changelogData = [];
  }
</script>

<div class="container mx-auto p-4">
    <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div class="md:col-span-1">
            <LibrarySearch
                    libraries={data.libraries}
                    onSelect={handleLibrarySelect}
            />
        </div>

        <div class="md:col-span-3">
            {#if selectedLibrary}
                <VersionSelector
                        versions={versions}
                        onCompare={handleCompare}
                />

                {#if loading}
                    <div class="mt-8 text-center">
                        Loading changelogs...
                    </div>
                {:else if changelogData.length > 0}
                    <div class="mt-8 space-y-8">
                        <div class="prose max-w-none">
                            <h2>Changes between versions</h2>

                            {#each changelogData as version}
                                <div class="border-l-4 border-primary p-4 mb-8">
                                    <div class="flex items-center justify-between mb-4">
                                        <h3 class="m-0">Version {version.version}</h3>
                                        <div class="text-sm text-gray-600">
                                            Released: {version.date}
                                        </div>
                                    </div>

                                    {#if version.commitsUrl}
                                        <a
                                                href={version.commitsUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                class="text-sm text-blue-500 hover:text-blue-700 mb-4 inline-block"
                                        >
                                            View Commits →
                                        </a>
                                    {/if}

                                    <div class="changelog-content">
                                        {@html version.changelogHtml}
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {:else}
                    <div class="text-center text-muted-foreground mt-8">
                        Select two versions to compare changelogs
                    </div>
                {/if}
            {:else}
                <div class="text-center text-muted-foreground">
                    Select a library to begin
                </div>
            {/if}
        </div>
    </div>
</div>

<style>
    :global(.changelog-content ul) {
        list-style-type: disc;
        margin-left: 1.5rem;
    }

    :global(.changelog-content h1),
    :global(.changelog-content h2),
    :global(.changelog-content h3),
    :global(.changelog-content h4) {
        margin-top: 1.5rem;
        margin-bottom: 0.75rem;
    }
</style>
