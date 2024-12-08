import { Metadata } from 'next';
import LibrarySearch from '@/components/LibrarySearch';
import { buildStaticData } from '@/lib/build-data';
import { Library } from '@/lib/types';

export const metadata: Metadata = {
  title: 'Releases.Jetpack.Love',
  description: 'Compare changelogs between different versions of popular libraries',
};

export async function generateStaticParams() {
  // Build data during static generation
  await buildStaticData(process.cwd());
  return [];
}

async function getLibraries(): Promise<Library[]> {
  const libraryIndex = await buildStaticData(process.cwd());
  return Object.values(libraryIndex);
}

export const dynamic = 'force-static';
export const revalidate = false;

export default async function Home() {
  const libraries = await getLibraries();

  return (
    <main className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Compare Library Versions</h1>
          <p className="text-lg text-muted-foreground">
            Search for a library and compare changelogs between different versions
          </p>
        </div>
        <LibrarySearch libraries={libraries} />
      </div>
    </main>
  );
}

