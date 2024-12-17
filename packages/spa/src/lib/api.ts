import {useQuery} from '@tanstack/react-query';
import {Library} from './types.ts';

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
