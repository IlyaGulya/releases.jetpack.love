export const prerender = true;

export async function load({ fetch }) {
  const response = await fetch('/data/libraries/index.json');
  const libraries = await response.json();

  return {
    libraries: Object.values(libraries),
  };
}
