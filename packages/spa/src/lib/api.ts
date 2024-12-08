import { useQuery } from '@tanstack/react-query';
import { Library } from './types.ts';

export interface VersionDetails {
  version: string;
  date: string;
  changelogHtml: string;
  commitsUrl: string;
}

export interface LibraryIndex {
  [key: string]: Library;
}

const API_BASE = '/data';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  return response.json();
}

export const useLibraryIndex = () => {
  return useQuery<LibraryIndex>({
    queryKey: ['libraries'],
    queryFn: () => fetchJson(`${API_BASE}/libraries/index.json`),
  });
};

export const useLibraryDetails = (libraryId: string) => {
  return useQuery<Library>({
    queryKey: ['library', libraryId],
    queryFn: () => fetchJson(`${API_BASE}/libraries/${libraryId}.json`),
    enabled: !!libraryId,
  });
};

export const useVersionDetails = (libraryId: string, version: string) => {
  return useQuery<VersionDetails>({
    queryKey: ['version', libraryId, version],
    queryFn: () => fetchJson(`${API_BASE}/versions/${libraryId}-${version}.json`),
    enabled: !!libraryId && !!version,
  });
};