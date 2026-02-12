import { usePricingConfig } from '@/app/hooks/usePricingConfig';
import {
    FireFilled,
    HistoryOutlined,
    LeftOutlined,
    RightOutlined,
    SearchOutlined,
} from '@ant-design/icons';
import { Empty, Segmented, Tooltip } from 'antd';
import React, { useState } from 'react';
import { LoadingState } from './components/LoadingState';
import { PackageList } from './components/PackageList';
import { SearchBox } from './components/SearchBox';
import { usePackages } from './hooks/usePackages';
import { usePackageSearch } from './hooks/usePackageSearch';
import { Package } from './types';

export * from './types';

export interface PackageRecommentProps {
    onApplyPackage: (pkg: Package) => void;
    collapsed: boolean;
    onToggle: () => void;
    tempPackages?: Package[];
    onDeleteTempPackage?: (id: string | number) => void;
    mode?: 'popular' | 'temporary';
    onModeChange?: (mode: 'popular' | 'temporary') => void;
}

function PackageRecomment(props: PackageRecommentProps) {
    const {
        onApplyPackage,
        collapsed,
        onToggle,
        tempPackages = [],
        onDeleteTempPackage,
        mode: controlledMode,
        onModeChange,
    } = props;
    const { packages, loading: loadingPackages } = usePackages();
    const [internalMode, setInternalMode] = useState<'popular' | 'temporary'>('popular');

    const mode = controlledMode ?? internalMode;
    const setMode = (newMode: 'popular' | 'temporary') => {
        if (onModeChange) {
            onModeChange(newMode);
        } else {
            setInternalMode(newMode);
        }
    };

    const { searchQuery, setSearchQuery, filteredPackages } = usePackageSearch(
        mode === 'popular' ? packages : tempPackages
    );
    const { config: pricingConfig } = usePricingConfig();

    return (
        <div className="flex flex-col h-full w-full relative">
            {/* Toggle Button - Adjusted position to prevent clipping */}
            <div className="absolute -right-3 top-8 z-50 cursor-pointer group" onClick={onToggle}>
                <div className="w-6 h-6 bg-white border border-gray-200 rounded-full flex items-center justify-center shadow-md text-gray-400 group-hover:text-blue-600 group-hover:border-blue-200 transition-all transform hover:scale-110">
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
                    <div className="flex flex-col items-center py-6 space-y-6 h-full overflow-hidden">
                        <Tooltip
                            title={mode === 'popular' ? '热门方案' : '临时方案'}
                            placement="right"
                        >
                            <div
                                className={`w-10 h-10 rounded-xl bg-gradient-to-br ${mode === 'popular' ? 'from-orange-400 to-red-500 shadow-orange-500/20' : 'from-blue-400 to-indigo-500 shadow-blue-500/20'} text-white shadow-lg flex items-center justify-center cursor-pointer hover:scale-105 transition-transform`}
                                onClick={() =>
                                    setMode(mode === 'popular' ? 'temporary' : 'popular')
                                }
                            >
                                {mode === 'popular' ? (
                                    <FireFilled className="text-lg" />
                                ) : (
                                    <HistoryOutlined className="text-lg" />
                                )}
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

                        <div className="writing-vertical-rl text-gray-400 text-xs font-medium tracking-widest opacity-50 select-none pb-4">
                            RECOMMEND
                        </div>
                    </div>
                ) : (
                    // Full Mode
                    <>
                        {/* Header */}
                        <div className="px-5 py-5 border-b border-gray-100 bg-white/50 sticky top-0 z-10 backdrop-blur-xl">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div
                                        className={`flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br ${mode === 'popular' ? 'from-orange-400 to-red-500 shadow-orange-500/20 ring-orange-100' : 'from-blue-400 to-indigo-500 shadow-blue-500/20 ring-blue-100'} text-white shadow-lg ring-1`}
                                    >
                                        {mode === 'popular' ? (
                                            <FireFilled className="text-lg" />
                                        ) : (
                                            <HistoryOutlined className="text-lg" />
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-gray-800 m-0 leading-tight">
                                            {mode === 'popular' ? '热门方案' : '临时方案'}
                                        </h3>
                                        <p className="text-xs text-gray-400 m-0 font-medium mt-0.5">
                                            {mode === 'popular' ? '精选高性价比配置' : ''}
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="mb-4">
                                <Segmented
                                    block
                                    value={mode}
                                    onChange={(v) => setMode(v as 'popular' | 'temporary')}
                                    options={[
                                        {
                                            label: '热门',
                                            value: 'popular',
                                            icon: <FireFilled style={{ color: 'red' }} />,
                                        },
                                        {
                                            label: '临时',
                                            value: 'temporary',
                                            icon: <HistoryOutlined />,
                                        },
                                    ]}
                                    className="bg-gray-100/50 p-1 rounded-xl"
                                />
                            </div>
                            <SearchBox
                                searchQuery={searchQuery}
                                onSearchChange={setSearchQuery}
                                resultCount={filteredPackages.length}
                            />
                        </div>

                        {/* List Area - Added overflow-x-hidden to prevent horizontal scroll */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 scrollbar-thin scrollbar-thumb-gray-200 hover:scrollbar-thumb-gray-300 scrollbar-track-transparent">
                            {loadingPackages && mode === 'popular' ? (
                                <LoadingState />
                            ) : mode === 'temporary' && tempPackages.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-12">
                                    <Empty
                                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                                        description={
                                            <span className="text-gray-400 text-xs">
                                                暂无临时方案
                                                <br />
                                                在配置工坊点击“临时保存”添加
                                            </span>
                                        }
                                    />
                                </div>
                            ) : (
                                <div className="space-y-4 pb-4">
                                    {mode === 'temporary' ? (
                                        <div className="space-y-4">
                                            {tempPackages.map((pkg) => (
                                                <div key={pkg.id} className="relative group/item">
                                                    <PackageList
                                                        packages={[pkg]}
                                                        onApplyPackage={onApplyPackage}
                                                        pricingConfig={pricingConfig}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <>
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
                                        </>
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
