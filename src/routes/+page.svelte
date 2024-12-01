<script lang="ts">
  import semver from 'semver';

  export let data;

  let selectedLibrary: string | null = null;
  let currentVersion: string | null = null;
  let targetVersion: string | null = null;

  $: library = data.libraries.find(lib => lib.id === selectedLibrary);

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

  function getSourceUrl(libraryId: string): string {
    return `https://developer.android.com/jetpack/androidx/releases/${libraryId}`;
  }
</script>

<main class="container mx-auto px-4 py-8">
  <h1 class="text-3xl font-bold mb-8">Jetpack Library Changelog</h1>

  <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
    <!-- Library Selection -->
    <div class="md:col-span-1">
      <h2 class="text-xl font-semibold mb-4">Libraries</h2>
      <div class="space-y-2">
        {#each data.libraries as lib}
          <button
            class="w-full text-left px-4 py-2 rounded transition-colors duration-200
              {selectedLibrary === lib.id ? 'bg-blue-100 text-blue-900' : 'hover:bg-gray-100'}"
            on:click={() => {
              selectedLibrary = lib.id;
              resetVersions();
            }}
          >
            {lib.id}
          </button>
        {/each}
      </div>
    </div>

    <!-- Version Selection and Changelogs -->
    <div class="md:col-span-3">
      {#if library}
        <div class="mb-8">
          <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-semibold">Select Versions</h2>
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
