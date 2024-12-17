export const cleanVersionString = (version: string): string | null => {
  // Remove library prefixes like "annotation-", "compose-", etc
  const cleanVersion = version.replace(/^[a-zA-Z-]+-(\d)/, '$1');

  // Ensure the version starts with a number
  if (!/^\d/.test(cleanVersion)) {
    return null;
  }

  return cleanVersion;
};
