/**
 * A no-op implementation of progress bar for non-interactive environments.
 * Implements the same interface as @opentf/cli-pbar's ProgressBar.
 */
export class NoopProgressBar {
  start() {}
  inc() {}
  stop() {}
} 