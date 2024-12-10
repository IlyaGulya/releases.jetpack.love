import LibrarySearch from './LibrarySearch.tsx';
import VersionSelector from './VersionSelector.tsx';
import {Library} from '@/lib/types.ts';
import {useEffect, useState} from 'react';
import {Button} from '@/components/ui/button';

interface MainContentProps {
  libraries: Library[];
  selectedLibrary: Library | null;
  onSelectLibrary: (library: Library | null) => void;
  selectedVersions: {
    from: string | null;
    to: string | null;
  };
  onSelectVersions: (versions: { from: string | null; to: string | null }) => void;
}

export default function MainContent({
                                      libraries,
                                      selectedLibrary,
                                      onSelectLibrary,
                                      selectedVersions,
                                      onSelectVersions,
                                    }: MainContentProps) {
  const [step, setStep] = useState<'library' | 'versions' | 'changelog'>('library');
  const [isMobileView, setIsMobileView] = useState(false);

  // Check if we're in mobile view on mount and window resize
  useEffect(() => {
    const checkMobileView = () => {
      setIsMobileView(window.innerWidth < 768); // 768px is the md breakpoint in Tailwind
    };
    checkMobileView();
    window.addEventListener('resize', checkMobileView);
    return () => window.removeEventListener('resize', checkMobileView);
  }, []);

  useEffect(() => {
    if (!isMobileView) {
      // Desktop behavior - update step based on selection
      if (selectedLibrary && !selectedVersions.from && !selectedVersions.to) {
        setStep('versions');
      } else if (selectedLibrary && selectedVersions.from && selectedVersions.to) {
        setStep('changelog');
      } else {
        setStep('library');
      }
    }
  }, [selectedLibrary, selectedVersions, isMobileView]);

  // Handle back button
  useEffect(() => {
    const handlePopState = () => {
      if (step !== 'library') {
        handleBack();
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [step]);

  const handleBack = () => {
    if (step === 'changelog') {
      if (isMobileView) {
        setStep('versions');
        onSelectVersions({from: null, to: null});
      }
    } else if (step === 'versions') {
      if (isMobileView) {
        setStep('library');
        onSelectLibrary(null);
      }
    }
  };

  const handleLibrarySelect = (library: Library | null) => {
    onSelectLibrary(library);
    if (isMobileView && library) {
      setStep('versions');
    }
  };

  const handleVersionSelect = (versions: { from: string | null; to: string | null }) => {
    onSelectVersions(versions);
    if (isMobileView && versions.from && versions.to) {
      setStep('changelog');
    }
  };

  return (
    <div className="h-full md:overflow-hidden"> {/* Full height container */}
      <div className="container mx-auto p-2 md:p-0 pt-8 h-full">
        {/* Mobile Wizard Header */}
        <div className="md:hidden mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {step !== 'library' && (
              <Button variant="ghost" size="sm" onClick={handleBack}>
                ← Back
              </Button>
            )}
            <h2 className="text-lg font-medium">
              {step === 'library' && 'Select Library'}
              {step === 'versions' && selectedLibrary?.id}
              {step === 'changelog' && `${selectedLibrary?.id} Changes`}
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Step {step === 'library' ? '1' : step === 'versions' ? '2' : '3'} of 3
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden md:grid md:grid-cols-4 gap-4 pt-4 h-full">
          <div className="md:col-span-1 h-full overflow-hidden">
            <LibrarySearch
              libraries={libraries}
              onSelect={handleLibrarySelect}
              selectedLibrary={selectedLibrary}
            />
          </div>

          <div className="md:col-span-3 h-full overflow-hidden">
            {selectedLibrary ? (
              <VersionSelector
                library={selectedLibrary}
                selectedVersions={selectedVersions}
                onSelectVersions={handleVersionSelect}
              />
            ) : (
              <div className="text-center text-muted-foreground flex items-center justify-center h-full">
                <h2 className="text-2xl font-medium">Select a library to begin</h2>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Wizard Steps */}
        <div className="md:hidden">
          {step === 'library' && (
            <div className="h-full">
              <LibrarySearch
                libraries={libraries}
                onSelect={handleLibrarySelect}
                selectedLibrary={selectedLibrary}
              />
            </div>
          )}

          {step === 'versions' && selectedLibrary && (
            <div className="h-full">
              <VersionSelector
                library={selectedLibrary}
                selectedVersions={selectedVersions}
                onSelectVersions={handleVersionSelect}
              />
            </div>
          )}

          {step === 'changelog' && selectedLibrary && (
            <div className="h-full">
              <VersionSelector
                library={selectedLibrary}
                selectedVersions={selectedVersions}
                onSelectVersions={handleVersionSelect}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
