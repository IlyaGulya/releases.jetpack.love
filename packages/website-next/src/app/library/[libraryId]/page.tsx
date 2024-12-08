import { Metadata } from 'next';
import VersionSelector from '@/components/VersionSelector';
import { buildStaticData } from '@/lib/build-data';

export async function generateStaticParams() {
  const libraryIndex = await buildStaticData(process.cwd());
  return Object.keys(libraryIndex).map(libraryId => ({
    libraryId,
  }));
}

type Params = Promise<{ libraryId: string }>

export async function generateMetadata(props: { params: Params }): Promise<Metadata> {
  const libraryIndex = await buildStaticData(process.cwd());
  const { libraryId } = await props.params;
  const library = libraryIndex[libraryId];

  if (!library) {
    throw new Error(`Library ${libraryId} not found`);
  }

  return {
    title: `${library.id} - Releases.Jetpack.Love`,
    description: `Compare changelogs between different versions of ${library.id}`,
  };
}

export const dynamic = 'force-static';
export const revalidate = false;

export default async function LibraryPage(props: { params: Params }) {
  const libraryIndex = await buildStaticData(process.cwd());
  const { libraryId } = await props.params;
  const library = libraryIndex[libraryId];

  if (!library) {
    throw new Error(`Library ${libraryId} not found`);
  }

  return (
    <main className="container mx-auto p-4">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-4">{library.id}</h1>
        <VersionSelector library={library} />
      </div>
    </main>
  );
} 