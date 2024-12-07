import {dev} from '$app/environment';
import {error} from '@sveltejs/kit';
import type {PageServerLoad} from "./$types";
import {buildStaticData} from "$lib/server/build-data";

export const prerender = true;

export const load: PageServerLoad = async ({fetch}) => {
  try {
    // During development, build data on each request
    // In production, this will use pre-built data
    if (dev) {
      await buildStaticData(process.cwd() + '/static');
    }

    const librariesRes = await fetch('/data/libraries/index.json');
    const libraries = await librariesRes.json();

    return {
      libraries: Object.values(libraries),
    };
  } catch (e) {
    console.error('Failed to load library data:', e);
    throw error(500, 'Failed to load library data');
  }
};
