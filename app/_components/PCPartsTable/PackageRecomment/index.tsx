import React from 'react';
import { usePackages } from './hooks/usePackages';
import { usePackageSearch } from './hooks/usePackageSearch';
import { LoadingState } from './components/LoadingState';
import { PackageHeader } from './components/PackageHeader';
import { SearchBox } from './components/SearchBox';
import { PackageList } from './components/PackageList';
import { Package } from './types';

export * from './types';

export interface PackageRecommentProps {
    onApplyPackage: (pkg: Package) => void;
}

function PackageRecomment(props: PackageRecommentProps) {
    const { onApplyPackage } = props;
    const { packages, loading: loadingPackages } = usePackages();
    const { searchQuery, setSearchQuery, filteredPackages } = usePackageSearch(packages);

    if (loadingPackages) {
        return (
            <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
                <div className="bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 rounded-3xl p-5 sm:p-6 lg:sticky lg:top-8 transition-all duration-300">
                    <LoadingState />
                </div>
            </div>
        );
    }

    return (
        <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
            <div className="bg-white/80 backdrop-blur-xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/60 rounded-3xl p-5 sm:p-6 lg:sticky lg:top-8 transition-all duration-300">
                <PackageHeader />

                <SearchBox
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultCount={filteredPackages.length}
                />

                <PackageList packages={filteredPackages} onApplyPackage={onApplyPackage} />
            </div>
        </div>
    );
}

export default PackageRecomment;
