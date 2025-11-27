import React from 'react';
import { usePackages } from './hooks/usePackages';
import { usePackageSearch } from './hooks/usePackageSearch';
import { LoadingState } from './components/LoadingState';
import { SearchBox } from './components/SearchBox';
import { PackageList } from './components/PackageList';
import { Package } from './types';
import { Typography } from 'antd';
import { FireFilled } from '@ant-design/icons';

export * from './types';

const { Title } = Typography;

export interface PackageRecommentProps {
    onApplyPackage: (pkg: Package) => void;
}

function PackageRecomment(props: PackageRecommentProps) {
    const { onApplyPackage } = props;
    const { packages, loading: loadingPackages } = usePackages();
    const { searchQuery, setSearchQuery, filteredPackages } = usePackageSearch(packages);

    return (
        <div className="flex flex-col h-full bg-white/50 backdrop-blur-sm border-r border-gray-200 w-80 flex-shrink-0">
            {/* Header */}
            <div className="p-4 border-b border-gray-100 bg-white/80 sticky top-0 z-10">
                <div className="flex items-center gap-2 mb-3">
                    <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-200">
                        <FireFilled />
                    </span>
                    <div>
                        <Title level={5} style={{ margin: 0, fontSize: '14px' }}>
                            热门方案
                        </Title>
                    </div>
                </div>
                <SearchBox
                    searchQuery={searchQuery}
                    onSearchChange={setSearchQuery}
                    resultCount={filteredPackages.length}
                />
            </div>

            {/* List Area */}
            <div className="flex-1 overflow-y-auto p-3 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300">
                {loadingPackages ? (
                    <LoadingState />
                ) : (
                    <PackageList packages={filteredPackages} onApplyPackage={onApplyPackage} />
                )}
            </div>
        </div>
    );
}

export default PackageRecomment;
