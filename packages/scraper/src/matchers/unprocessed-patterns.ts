// src/matchers/unprocessed-patterns.ts

interface Pattern {
  name: string;
  regex: RegExp;
  description: string;
}

export class UnprocessedContentMatcher {
  private patterns: Pattern[] = [
    // Version Headers
    {
      name: 'versionHeader',
      regex: /<h\d[^>]*?(?:id="[^"]*?version|data-text=".*?(?:(?:[A-Za-z][A-Za-z\s-]*\s+Version\s+\d)|(?:Version\s+\d+\.\d+(?:\.\d+)?(?:\s+[A-Za-z])))).*?<\/h\d>/i,
      description: 'Version header - processed elsewhere in changelog extraction'
    },
    // Build and Dependency Patterns
    {
      name: 'dependencyConfiguration',
      regex: /<div[^>]*class="ds-selector-tabs"[^>]*>(?![\s\S]*?<h2[^>]*>Version)[\s\S]*?<\/div>/i,
      description: 'Gradle/Maven dependency configuration blocks'
    },
    {
      name: 'setupInstructions',
      regex: /<p[^>]*>\s*(?:To add|Make sure|To use|For more information about|Read)\s+(?:<code[^>]*>[^<]+<\/code>|.*?dependency|.*?Maven)[\s\S]*?<\/p>/i,
      description: 'Setup and dependency instructions'
    },

    // Documentation Structure Patterns
    {
      name: 'groupStructure',
      regex: /<p[^>]*>[\s\S]*?(?:Compose is a combination|Maven Group|Each Group contains)[\s\S]*?(?:functionality|release notes)[\s\S]*?<\/p>/i,
      description: 'Maven group and library structure descriptions'
    },
    {
      name: 'libraryDescription',
      regex: /<div[^>]*style="[^"]*?(?:text-align:\s*left|padding-left)[^"]*?">\s*(?:The\s+(?:<code[^>]*>[^<]+<\/code>)?\s*library|The\s+[\w\s]+\s*library|Compose\s+is|Dependencies\s+for)[\s\S]*?<\/div>/i,
      description: 'Library description blocks'
    },
    {
      name: 'libraryIntroduction',
      regex: /<p[^>]*>(?:This|The)\s+library\s+(?:provides|defines|enables|helps|allows|makes|offers|supports|implements)[\s\S]*?<\/p>/i,
      description: 'Library introduction and overview paragraphs'
    },

    // Implementation Documentation Pattern - UPDATED
    {
      name: 'implementationDocs',
      regex: /<p[^>]*>\s*(?:There are (?:two|multiple|several) implementations|Different implementations|Implementation types)[\s\S]*?<\/p>/i,
      description: 'Implementation documentation sections'
    },

    // Documentation Headers
    {
      name: 'buildSection',
      regex: /<h\d[^>]*>(?:Build|Setup|Installation|Getting Started|Dependencies)[^<]*<\/h\d>/i,
      description: 'Build and setup section headers'
    },
    {
      name: 'artifactHeader',
      regex: /<h\d[^>]*>(?!.*?Version\s+\d)(?!.*?Release)(?!.*?Build|.*?Setup|.*?Installation|.*?Getting Started|.*?Dependencies)([^<]*)<\/h\d>/i,
      description: 'Non-version artifact headers'
    },

    // Documentation Reference Links
    {
      name: 'referenceDocLinks',
      regex: /<p[^>]*>\s*(?:Dependencies for [^<]+include|There are \w+ implementations of|For [^<]+ see)\s*<a[^>]*>[^<]*<\/a>.*?<\/p>/i,
      description: 'Documentation reference and implementation links'
    },

    // Other Documentation Elements
    {
      name: 'artifactTableDescription',
      regex: /<p[^>]*>[\s\S]*?This table (?:lists|explains)[\s\S]*?(?:artifacts|groups)[\s\S]*?<\/p>/i,
      description: 'Artifact and group table descriptions'
    },
    {
      name: 'notesTable',
      regex: /<table[^>]*>[\s\S]*?<\/table>/i,
      description: 'Tables containing metadata'
    },
    {
      name: 'aside',
      regex: /<aside[^>]*>[\s\S]*?<\/aside>/i,
      description: 'Note and aside blocks'
    },
    {
      name: 'documentationNav',
      regex: /<div[^>]*style="[^"]*text-align:\s*right[^"]*">\s*(?:<a[^>]*>User Guide<\/a>|<a[^>]*>Code\s*Sample<\/a>)[\s\S]*?<\/div>/i,
      description: 'Documentation navigation links'
    },
    {
      name: 'codeSample',
      regex: /<a[^>]*href="[^"]*\/samples\/[^"]*"[^>]*>(?!.*?bug|.*?issue)[^<]*<\/a>/i,
      description: 'Code sample links (excluding bug/issue references)'
    },

    // Feedback and Support
    {
      name: 'buildDependencies',
      regex: /For more information about dependencies,\s+see\s+Add Build Dependencies/i,
      description: 'Build dependencies help text'
    },
    {
      name: 'feedbackText',
      regex: /<p[^>]*>Your feedback helps make Jetpack better[^>]*<\/p>/i,
      description: 'Feedback text'
    },
    {
      name: 'createIssue',
      regex: /<p[^>]*><a[^>]*>Create a new issue<\/a><\/p>/i,
      description: 'Create issue link'
    },
    {
      name: 'noReleaseNotes',
      regex: /<p[^>]*>There are no release notes for this artifact\.<\/p>/i,
      description: 'No release notes message'
    },
    {
      name: 'feedbackSection',
      regex: /<p[^>]*>(?:Your feedback helps|Please report)[^>]*?(?:issue tracker|feedback)[^>]*<\/p>/i,
      description: 'Feedback and issue tracker sections'
    },

    // Empty and Structural
    {
      name: 'emptyStructure',
      regex: /<p[^>]*>\s*{\s*}\s*{\s*}\s*<\/p>/i,
      description: 'Empty structural content'
    }
  ];

  isIntentionallyUnprocessed(html: string): boolean {
    // Handle mixed content case - if it contains changelog version content, don't skip it
    if (html.includes('<div class="devsite-article-body">') &&
      /<h\d[^>]*>Version\s+\d+\.\d+\.\d+<\/h\d>/i.test(html)) {
      return false;
    }

    // Version headers should be marked as unprocessed since they are handled by the changelog extractor
    const isVersionHeader = /<h\d[^>]*>(?:.*?Version\s+\d+\.\d+(?:\.\d+)?|Version\s+\d+\.\d+(?:\.\d+)?.*?)<\/h\d>/i.test(html);
    if (isVersionHeader) {
      return true;
    }

    // For all other content, check against our patterns
    return this.patterns.some(pattern => pattern.regex.test(html));
  }


  getMatchDetails(html: string): Array<{ pattern: string; description: string }> {
    return this.patterns
      .filter(pattern => pattern.regex.test(html))
      .map(({ name, description }) => ({ pattern: name, description }));
  }
}
