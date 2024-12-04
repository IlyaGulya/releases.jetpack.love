<script lang="ts">
  import semver from 'semver';
  import { Input } from '$lib/components/ui/input';
  import { Tabs, TabsContent, TabsList, TabsTrigger } from '$lib/components/ui/tabs';

  export let data;

  let searchTerm = '';
  let selectedLibrary: string | null = null;
  let currentVersion: string | null = null;
  let targetVersion: string | null = null;
  let activeTab = 'all';

  $: library = data.libraries.find(lib => lib.id === selectedLibrary);

  // Filter libraries based on search term
  $: filteredLibraries = data.libraries.filter(lib => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return lib.id.toLowerCase().includes(term) ||
           lib.groupId?.toLowerCase().includes(term);
  });

  // Group libraries by their groupId
  $: libraryGroups = data.groups.map(group => ({
    ...group,
    libraries: data.libraries.filter(lib => lib.groupId === group.groupId)
  }));

  // Sort versions in descending order (newest first)
  $: versions = library?.versions.sort((a, b) =>
    semver.rcompare(a.version, b.version),
  );

  // Get all versions between current and target (exclusive of current version)
  $: relevantVersions = versions?.filter(v => {
    if (!currentVersion || !targetVersion) return false;

    const current = semver.clean(currentVersion);
    const target = semver.clean(targetVersion);
    const version = semver.clean(v.version);

    if (!current || !target || !version) return false;

    // If upgrading
    if (semver.gt(target, current)) {
      return semver.gt(version, current) && semver.lte(version, target);
    }
    // If downgrading
    else {
      return semver.lt(version, current) && semver.gte(version, target);
    }
  }).sort((a, b) =>
    // Always show versions in chronological order
    semver.compare(a.version, b.version),
  );

  function resetVersions() {
    currentVersion = null;
    targetVersion = null;
  }

  function selectLibrary(id: string) {
    selectedLibrary = id;
    resetVersions();
  }

  function getSourceUrl(libraryId: string): string {
    return `https://developer.android.com/jetpack/androidx/releases/${libraryId}`;
  }
</script>

<main class="container mx-auto px-4 py-8">
  <div class="flex flex-col gap-4 mb-8">
    <h1 class="text-3xl font-bold">Jetpack Library Changelog</h1>
    <div class="max-w-sm">
      <Input
        type="search"
        placeholder="Search libraries..."
        bind:value={searchTerm}
      />
    </div>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <!-- Library Selection -->
    <div class="md:col-span-1">
      <Tabs bind:value={activeTab} class="w-full">
        <TabsList class="w-full">
          <TabsTrigger value="all" class="flex-1">All</TabsTrigger>
          <TabsTrigger value="groups" class="flex-1">Groups</TabsTrigger>
        </TabsList>

        <TabsContent value="all" class="mt-4">
          <div class="space-y-2 max-h-[70vh] overflow-y-auto pr-2">
            {#each filteredLibraries as lib}
              <button
                class="w-full text-left px-4 py-2 rounded transition-colors duration-200
                  {selectedLibrary === lib.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}"
                on:click={() => selectLibrary(lib.id)}
              >
                <div>{lib.id}</div>
                {#if lib.groupId}
                  <div class="text-sm text-gray-500">Group: {lib.groupId}</div>
                {/if}
              </button>
            {/each}
          </div>
        </TabsContent>

        <TabsContent value="groups" class="mt-4">
          <div class="space-y-6 max-h-[70vh] overflow-y-auto pr-2">
            {#each libraryGroups as group}
              <div>
                <h3 class="font-semibold mb-2">{group.groupId}</h3>
                <div class="space-y-1">
                  {#each group.libraries as lib}
                    <button
                      class="w-full text-left px-4 py-2 rounded transition-colors duration-200
                        {selectedLibrary === lib.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}"
                      on:click={() => selectLibrary(lib.id)}
                    >
                      {lib.id}
                    </button>
                  {/each}
                </div>
              </div>
            {/each}
          </div>
        </TabsContent>
      </Tabs>
    </div>

    <!-- Version Selection and Changelogs -->
    <div class="md:col-span-3">
      {#if library}
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">{library.id}</h2>
            <a
              href={getSourceUrl(library.id)}
              target="_blank"
              rel="noopener noreferrer"
              class="text-blue-600 hover:text-blue-800 text-sm"
            >
              View Official Documentation →
            </a>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <!-- Current Version -->
            <div>
              <label class="block text-sm font-medium mb-2" for="current-version">
                Current Version
              </label>
              <select
                id="current-version"
                class="w-full p-2 border rounded"
                bind:value={currentVersion}
              >
                <option value={null}>Select version...</option>
                {#each versions || [] as v}
                  <option value={v.version}>
                    {v.version} ({v.date})
                  </option>
                {/each}
              </select>
            </div>

            <!-- Target Version -->
            <div>
              <label class="block text-sm font-medium mb-2" for="target-version">
                Target Version
              </label>
              <select
                id="target-version"
                class="w-full p-2 border rounded"
                bind:value={targetVersion}
                disabled={!currentVersion}
              >
                <option value={null}>Select version...</option>
                {#each versions || [] as v}
                  <option value={v.version}>
                    {v.version} ({v.date})
                  </option>
                {/each}
              </select>
            </div>
          </div>
        </div>

        {#if currentVersion && targetVersion}
          <div class="mb-6">
            <h2 class="text-xl font-semibold mb-4">
              Migration Path: {currentVersion} → {targetVersion}
            </h2>
            {#if relevantVersions?.length}
              <div class="space-y-8">
                {#each relevantVersions as version}
                  <div class="border-l-4 border-blue-500 pl-4">
                    <div class="flex items-center justify-between mb-2">
                      <h3 class="text-lg font-semibold">
                        Version {version.version}
                        <span class="text-sm font-normal text-gray-600">
                          ({version.date})
                        </span>
                      </h3>
                      {#if version.commitsUrl}
                        <a
                          href={version.commitsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          class="inline-flex items-center px-3 py-1 text-sm font-medium text-blue-700 bg-blue-100 rounded-full hover:bg-blue-200 transition-colors duration-200"
                        >
                          View Commits
                        </a>
                      {/if}
                    </div>
                    <div class="prose prose-blue max-w-none">
                      {@html version.changelogHtml}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <p class="text-gray-600">
                No changelog entries found between these versions.
              </p>
            {/if}
          </div>
        {:else}
          <p class="text-gray-500">
            Select both current and target versions to see the migration path.
          </p>
        {/if}
      {:else}
        <div class="bg-gray-50 rounded-lg p-8 text-center">
          <p class="text-gray-500">
            Select a library from the list to begin exploring its changelog.
          </p>
        </div>
      {/if}
    </div>
  </div>
</main>
