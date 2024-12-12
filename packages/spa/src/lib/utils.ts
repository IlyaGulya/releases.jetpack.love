import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

interface IssueContext {
  library?: string;
  fromVersion?: string;
  toVersion?: string;
  sessionId?: string;
  recording?: string;
  userAgent: string;
  url: string;
}

export function getIssueUrl(context: IssueContext): string {
  const baseUrl = 'https://github.com/ilyagulya/releases.jetpack.love/issues/new';

  const template = `
### Context
${context.library ? `**Library:** ${context.library}` : ''}
${context.fromVersion && context.toVersion ? `**Changelog Range:** ${context.fromVersion} → ${context.toVersion}` : ''}
**Browser:** ${context.userAgent}
**URL:** ${context.url}
${context.sessionId ? `**Session:** ${context.sessionId}` : ''}
${context.recording ? `**Session Recording:** ${context.recording}` : ''}

### Issue Description
<!-- Please describe the issue you're experiencing -->

### Expected Behavior
<!-- What did you expect to happen? -->

### Steps to Reproduce
1. <!-- Step 1 -->
2. <!-- Step 2 -->
3. <!-- Step 3 -->
`.trim();

  const params = new URLSearchParams({
    title: '[Bug Report] ',
    body: template,
    labels: 'bug'
  });

  return `${baseUrl}?${params.toString()}`;
}
