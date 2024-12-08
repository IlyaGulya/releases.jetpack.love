import { buildStaticData } from '@/lib/build-data';
import { Metadata } from 'next';
import MainContent from '@/components/MainContent';

export const metadata: Metadata = {
  title: 'Releases.Jetpack.Love',
  description: 'Compare changelogs between different versions of popular libraries',
};

export const dynamic = 'force-static';
export const revalidate = false;

export default async function Home() {
  const libraryIndex = await buildStaticData(process.cwd());
  const libraries = Object.values(libraryIndex);

  return <MainContent libraries={libraries} />;
}

