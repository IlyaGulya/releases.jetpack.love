import { expect, test, describe } from "bun:test";
import { UnprocessedContentMatcher } from "../matchers/unprocessed-patterns";

describe("UnprocessedContentMatcher", () => {
  const matcher = new UnprocessedContentMatcher();

  describe("dependency configurations", () => {
    test("should match Groovy dependencies", () => {
      const content = `
        <div class="ds-selector-tabs">
          <section>
            <h3 id="groovy" data-text="Groovy">Groovy</h3>
            <devsite-code>
              <pre class="devsite-click-to-copy">dependencies {
                implementation 'androidx.annotation:annotation:1.9.1'
              }</pre>
            </devsite-code>
          </section>
        </div>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match Kotlin dependencies", () => {
      const content = `
        <div class="ds-selector-tabs">
          <section>
            <h3 id="kts" data-text="Kotlin">Kotlin</h3>
            <devsite-code>
              <pre class="devsite-click-to-copy">dependencies {
                implementation("androidx.annotation:annotation:1.9.1")
              }</pre>
            </devsite-code>
          </section>
        </div>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });
  });

  describe("documentation elements", () => {
    test("should match user guide links", () => {
      const content = `
        <div style="align: right; text-align: right; padding-bottom: 21px; margin-top: -45px;">
          <a href="/guide/components/activities/intro-activities">User Guide</a>
        </div>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match library descriptions", () => {
      const content = `
        <div style="text-align: left; padding-left: 10px;">
          The Advertising ID library defines an interface to interact with system-level ad providers.
        </div>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match feedback sections", () => {
      const content = `
        <p>Your feedback helps make Jetpack better. Let us know if you discover new issues</p>
        <p><a href="https://issuetracker.google.com/issues/new" class="button">Create a new issue</a></p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match code sample links", () => {
      const content = `<a href="/samples/xyz">Code Sample</a>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match artifact table descriptions", () => {
      const content = `
        <p>This table lists all the artifacts in the <code>androidx.annotation</code> group.</p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match no release notes message", () => {
      const content = `<p>There are no release notes for this artifact.</p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match artifact section headers", () => {
      const content = '<h3 id="macrobenchmark" data-text="Macrobenchmark" tabindex="-1">Macrobenchmark</h3>';
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match build dependencies help text", () => {
      const content = 'For more information about dependencies, see Add Build Dependencies';
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match aside blocks", () => {
      const content = `
        <aside class="note">
          <strong>Note:</strong> Important information about setup or configuration.
        </aside>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });
  });

  describe("version and changelog content", () => {
    test("should mark version headers as intentionally unprocessed", () => {
      const content = '<h2 id="version-1.0.2">Version 1.0.2</h2>';
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should mark complex version headers as intentionally unprocessed", () => {
      const headers = [
        '<h2 id="version_100_2" data-text="Version 1.0.0" tabindex="-1">Version 1.0.0</h2>',
        '<h2 id="health_connect_client_version_10_2" data-text="Health Connect Client Version 1.0" tabindex="-1">Health Connect Client Version 1.0</h2>'
      ];
      headers.forEach(header => {
        expect(matcher.isIntentionallyUnprocessed(header)).toBe(true);
      });
    });

    test("should NOT skip release dates", () => {
      const content = '<p>January 15, 2024</p>';
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(false);
    });

    test("should NOT skip changelog lists", () => {
      const content = `
        <ul>
          <li>Added support for new Android 14 features</li>
          <li>Deprecated legacy APIs in preparation for the next major version</li>
          <li>Fixed several race conditions in concurrent operations</li>
        </ul>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(false);
    });

    test("should NOT skip bug references", () => {
      const content = `<p>Fixed critical issue (<a href="https://issuetracker.google.com/123456">#123456</a>)</p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(false);
    });
  });

  describe("documentation structure", () => {
    test("should match Compose structure descriptions", () => {
      const content = `
        <p>
          Compose is a combination of 7 Maven group IDs within
          <code translate="no" dir="ltr">androidx</code>
          . Each group contains a targeted subset of functionality.
        </p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });

    test("should match setup instructions", () => {
      const content = `
        <p>
          To add a dependency on the Car App Library, you must add the Google Maven repository to your project. Read
          <a href="/studio/build/dependencies#google-maven">Google's Maven repository</a>
          for more information.
        </p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });
  });

  describe("complex cases", () => {
    test("should handle mixed content correctly", () => {
      const content = `
        <div class="devsite-article-body">
          <h2>Version 1.0.2</h2>
          <p>January 15, 2024</p>
          <ul>
            <li>Added new features</li>
          </ul>
          <div class="ds-selector-tabs">
            <pre>implementation 'androidx.compose:compose-ui:1.0.0'</pre>
          </div>
        </div>`;

      // The whole block shouldn't be skipped just because it contains a dependency section
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(false);
    });

    test("should identify documentation setup content", () => {
      const content = `
        <p>
          To add a dependency, read
          <a href="/studio/build/dependencies#google-maven">Google's Maven repository</a>
          for more information.
        </p>`;
      expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
    });
  });

  describe("getMatchDetails", () => {
    test("should return pattern details for matching content", () => {
      const content = `<p>There are no release notes for this artifact.</p>`;
      const details = matcher.getMatchDetails(content);
      expect(details).toEqual([{
        pattern: 'noReleaseNotes',
        description: 'No release notes message'
      }]);
    });

    test("should return multiple pattern details when content matches multiple patterns", () => {
      const content = `
        <div class="ds-selector-tabs">Dependencies here</div>
        <p>Your feedback helps make Jetpack better.</p>
        <p><a>Create a new issue</a></p>`;
      const details = matcher.getMatchDetails(content);
      expect(details.length).toBeGreaterThan(1);
    });

    test("should return empty array for non-matching content", () => {
      const content = `<p>Some actual changelog content</p>`;
      const details = matcher.getMatchDetails(content);
      expect(details).toEqual([]);
    });
  });
});

describe("UnprocessedContentMatcher - Version Headers", () => {
  const matcher = new UnprocessedContentMatcher();

  test("should mark version headers as intentionally unprocessed", () => {
    const headers = [
      '<h2 id="version_18_2" data-text="Version 1.8" tabindex="-1">Version 1.8</h2>',
      '<h2 id="version_14_2" data-text="Version 1.4" tabindex="-1">Version 1.4</h2>',
      '<h2 id="version_110_4" data-text="Version 1.10" tabindex="-1">Version 1.10</h2>',
      '<h2 id="version_22_2" data-text="Version 2.2" tabindex="-1">Version 2.2</h2>',
      '<h2 id="version_33_2" data-text="Version 3.3" tabindex="-1">Version 3.3</h2>',
      '<h2 id="wear_compose_material3_version_10_2" data-text="Wear Compose Material3 Version 1.0" tabindex="-1">Wear Compose Material3 Version 1.0</h2>',
      '<h2 id="compose_material3_common_version_10_2" data-text="Compose Material3 Common Version 1.0" tabindex="-1">Compose Material3 Common Version 1.0</h2>'
    ];

    headers.forEach(header => {
      expect(matcher.isIntentionallyUnprocessed(header)).toBe(true);
      const details = matcher.getMatchDetails(header);
      expect(details).toContainEqual({
        pattern: 'versionHeader',
        description: 'Version header - processed elsewhere in changelog extraction'
      });
    });
  });

  test("should still identify non-version headers", () => {
    const headers = [
      '<h2>Getting Started</h2>',
      '<h2>Setup Instructions</h2>',
      '<h2>Dependencies</h2>',
      '<h2>Installation</h2>'
    ];

    headers.forEach(header => {
      expect(matcher.isIntentionallyUnprocessed(header)).toBe(true);
      const details = matcher.getMatchDetails(header);
      expect(details[0].pattern).toBe('buildSection');
    });
  });

  test("should handle library descriptions and documentation links", () => {
    const content = [
      '<div style="text-align: left; padding-left: 10px">The Paging Library makes it easier for you to load data gradually</div>',
      '<div style="align: right; text-align: right"><a href="/guide">User Guide</a></div>',
      '<p>Your feedback helps make Jetpack better</p>'
    ];

    content.forEach(html => {
      expect(matcher.isIntentionallyUnprocessed(html)).toBe(true);
    });
  });

  test("should correctly identify version headers with various formats", () => {
    const headers = [
      '<h2 id="core-viewtree_version_10_2" data-text="Core-Viewtree Version 1.0" tabindex="-1">Core-Viewtree Version 1.0</h2>',
      '<h2 id="version_100_2" data-text="Version 1.0.0" tabindex="-1">Version 1.0.0</h2>',
      '<h2 id="health_connect_client_version_10_2" data-text="Health Connect Client Version 1.0" tabindex="-1">Health Connect Client Version 1.0</h2>'
    ];

    headers.forEach(header => {
      expect(matcher.isIntentionallyUnprocessed(header)).toBe(true);
      const details = matcher.getMatchDetails(header);
      expect(details).toContainEqual({
        pattern: 'versionHeader',
        description: 'Version header - processed elsewhere in changelog extraction'
      });
    });
  });
});

describe("UnprocessedContentMatcher - Documentation and Navigation", () => {
  const matcher = new UnprocessedContentMatcher();

  test("should match documentation reference links", () => {
    const content = `<p>Dependencies for Room include 
      <a href="/training/data-storage/room#db-migration-testing">testing Room migrations</a></p>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
  });

  test("should match library descriptions with code references", () => {
    const content = `<div style="text-align: left">The <code>androidx.sqlite</code> 
      library contains abstract interfaces...</div>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
  });

  test("should match implementation documentation", () => {
    const content = `<p>There are two implementations of DataStore: 
      <a href="/topic/libraries/architecture/datastore">Preferences and Proto</a></p>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
  });

  test("should match setup instructions with code blocks", () => {
    const content = `<p>Make sure <code>gradle.properties</code> contains the following lines:</p>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
  });

  test("should NOT match changelog content", () => {
    const content = `<ul>
      <li>Added new database migration support</li>
      <li>Fixed bug in query processing</li>
    </ul>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(false);
  });

  test("should mark version information as intentionally unprocessed", () => {
    const content = `<h2>Version 1.0.0-alpha01</h2>
      <p>Initial release with basic functionality</p>`;
    expect(matcher.isIntentionallyUnprocessed(content)).toBe(true);
  });
});

describe("UnprocessedContentMatcher - Version Headers", () => {
  const testHeaders = [
    {
      name: "Wear Compose Material3",
      html: '<h2 id="wear_compose_material3_version_10_2" data-text="Wear Compose Material3 Version 1.0" tabindex="-1">Wear Compose Material3 Version 1.0</h2>'
    },
    {
      name: "Compose Material3 Common",
      html: '<h2 id="compose_material3_common_version_10_2" data-text="Compose Material3 Common Version 1.0" tabindex="-1">Compose Material3 Common Version 1.0</h2>'
    },
    {
      name: "Version with semver",
      html: '<h2 id="version_100_2" data-text="Version 1.0.0" tabindex="-1">Version 1.0.0</h2>'
    },
    {
      name: "Health Connect Client",
      html: '<h2 id="health_connect_client_version_10_2" data-text="Health Connect Client Version 1.0" tabindex="-1">Health Connect Client Version 1.0</h2>'
    }
  ];

  test.each(testHeaders)("should handle $name version header correctly", ({ html }) => {
    const matcher = new UnprocessedContentMatcher();
    const result = matcher.isIntentionallyUnprocessed(html);
    const matches = matcher.getMatchDetails(html);

    console.log("\nTesting header:", {
      html,
      isUnprocessed: result,
      matchingPatterns: matches,
      changelogVersionMatch: html.match(/Version\s+\d+\.\d+\.\d+(?!\s*[A-Za-z])/),
      dataTextMatch: html.match(/data-text="Version\s+\d+\.\d+\.\d+(?!\s*[A-Za-z])"/),
      versionIdMatch: html.match(/id="version_\d+_\d+(?:_\d+)?"\s+data-text="Version\s+\d+\.\d+\.\d+(?!\s*[A-Za-z])"/)
    });

    expect(result).toBe(true);
  });
});

describe("UnprocessedContentMatcher - Content Before First Version", () => {
  const matcher = new UnprocessedContentMatcher();

  test("should handle content before first version section", () => {
    const content = `
      <div class="devsite-article-body">
        <p>This library provides essential functionality for Android apps.</p>
        <p>Getting started with the library is easy.</p>
        <h2 id="version_100_2" data-text="Version 1.0.0" tabindex="-1">Version 1.0.0</h2>
        <ul>
          <li>Initial release</li>
        </ul>
      </div>`;
    
    // The introductory paragraphs should be treated as intentionally unprocessed
    const introParagraph = '<p>This library provides essential functionality for Android apps.</p>';
    expect(matcher.isIntentionallyUnprocessed(introParagraph)).toBe(true);

    // The version section and its content should be processed normally
    const versionSection = '<h2 id="version_100_2" data-text="Version 1.0.0" tabindex="-1">Version 1.0.0</h2>';
    expect(matcher.isIntentionallyUnprocessed(versionSection)).toBe(true); // Version headers are always marked as unprocessed

    const changelogContent = '<ul><li>Initial release</li></ul>';
    expect(matcher.isIntentionallyUnprocessed(changelogContent)).toBe(false);
  });

  test("should handle mixed content before first version", () => {
    const content = `
      <div class="devsite-article-body">
        <h1>Library Overview</h1>
        <p>Welcome to the library documentation.</p>
        <div class="setup-section">
          <h2>Setup</h2>
          <p>Add the dependency to your build.gradle:</p>
          <pre><code>implementation 'androidx.library:library:1.0.0'</code></pre>
        </div>
        <h2 id="version_100" data-text="Version 1.0.0">Version 1.0.0</h2>
        <p>Release date: January 15, 2024</p>
        <ul>
          <li>Initial stable release</li>
        </ul>
      </div>`;

    // All content before the version section should be treated as intentionally unprocessed
    const setupSection = '<div class="setup-section"><h2>Setup</h2><p>Add the dependency to your build.gradle:</p></div>';
    expect(matcher.isIntentionallyUnprocessed(setupSection)).toBe(true);

    // Release date and changelog content should be processed normally
    const releaseDate = '<p>Release date: January 15, 2024</p>';
    expect(matcher.isIntentionallyUnprocessed(releaseDate)).toBe(false);
  });
});
