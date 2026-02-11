import React from 'react';
import { usePackages } from './hooks/usePackages';
import { usePackageSearch } from './hooks/usePackageSearch';
import { LoadingState } from './components/LoadingState';
import { SearchBox } from './components/SearchBox';
import { PackageList } from './components/PackageList';
import { Package } from './types';
import { Tooltip } from 'antd';
import { FireFilled, LeftOutlined, RightOutlined, SearchOutlined } from '@ant-design/icons';
import { usePricingConfig } from '@/app/hooks/usePricingConfig';

export * from './types';

export interface PackageRecommentProps {
    onApplyPackage: (pkg: Package) => void;
    collapsed: boolean;
    onToggle: () => void;
}

function PackageRecomment(props: PackageRecommentProps) {
    const { onApplyPackage, collapsed, onToggle } = props;
    const { packages, loading: loadingPackages } = usePackages();
    const { searchQuery, setSearchQuery, filteredPackages } = usePackageSearch(packages);
    const { config: pricingConfig } = usePricingConfig();

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Toggle Button on Border */}
            <div
                className="absolute right-0 top-8 z-50 cursor-pointer group translate-x-1/2"
                onClick={onToggle}
            >
                <div className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-sm text-gray-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all">
                    {collapsed ? (
                        <RightOutlined className="text-[10px]" />
                    ) : (
                        <LeftOutlined className="text-[10px]" />
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {collapsed ? (
                    // Mini Mode
                    <div className="flex flex-col items-center py-6 space-y-6 h-full">
                        <Tooltip title="热门方案" placement="right">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-500/20 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform">
                                <FireFilled className="text-lg" />
                            </div>
                        </Tooltip>

                        <Tooltip title="点击展开搜索" placement="right">
                            <div
                                className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 flex items-center justify-center cursor-pointer transition-colors"
                                onClick={onToggle}
                            >
                                <SearchOutlined className="text-lg" />
                            </div>
                        </Tooltip>

                        <div className="flex-1 w-full flex justify-center">
                            <div className="w-px h-full bg-gradient-to-b from-gray-100 via-gray-200 to-transparent" />
                        </div>

                        <div className="writing-vertical-rl text-gray-400 text-xs font-medium tracking-widest opacity-50 select-none">
                            RECOMMEND
                        </div>
                    </div>
                ) : (
                    // Full Mode
                    <>
                        {/* Header */}
                        <div className="px-5 py-5 border-b border-gray-100 bg-white/50 sticky top-0 z-10 backdrop-blur-xl">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-red-500 text-white shadow-lg shadow-orange-500/20 ring-1 ring-orange-100">
                                    <FireFilled className="text-lg" />
                                </div>
                                <div>
                                    <h3 className="text-base font-bold text-gray-800 m-0 leading-tight">
                                        热门方案
                                    </h3>
                                    <p className="text-xs text-gray-400 m-0 font-medium mt-0.5">
                                        精选高性价比配置
                                    </p>
                                </div>
                            </div>
                            <SearchBox
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                resultCount={filteredPackages.length}
                            />
                        </div>

                        {/* List Area */}
                        <div className="flex-1 overflow-y-auto p-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {loadingPackages ? (
                                <LoadingState />
                            ) : (
                                <div className="space-y-4 pb-4">
                                    <PackageList
                                        packages={filteredPackages}
                                        onApplyPackage={onApplyPackage}
                                        pricingConfig={pricingConfig}
                                    />
                                    {!loadingPackages && filteredPackages.length > 0 && (
                                        <div className="text-center py-4">
                                            <span className="text-[10px] text-gray-300 bg-gray-50 px-3 py-1 rounded-full">
                                                到底了
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

export default PackageRecomment;
