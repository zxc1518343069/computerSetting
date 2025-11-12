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
                <div className="bg-white shadow-xl rounded-2xl p-5 lg:sticky lg:top-6">
                    <LoadingState />
                </div>
            </div>
        );
    }

    return (
        <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
            <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-5 lg:sticky lg:top-6">
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
