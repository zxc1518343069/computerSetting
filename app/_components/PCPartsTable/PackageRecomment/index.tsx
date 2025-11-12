import axios from '@/lib/request/axios';
import { useRequest } from 'ahooks';
import React, { useState } from 'react';

export interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

export interface Package {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}

export interface PackageRecommentProps {
    onApplyPackage: (pkg: Package) => void;
}

function PackageRecomment(props: PackageRecommentProps) {
    const { onApplyPackage } = props;
    const { packages, loading: loadingPackages } = useInit();
    const [searchQuery, setSearchQuery] = useState('');

    const getCoreSpecs = (pkg: Package) => {
        const coreCategories = ['cpu', 'gpu', 'motherboard'];
        const coreItems = pkg.items.filter((item) =>
            coreCategories.includes(item.product_category)
        );

        const categoryIcons: Record<string, string> = {
            cpu: '🖥️',
            gpu: '🎮',
            motherboard: '⚡',
        };

        return coreItems.map((item) => ({
            ...item,
            icon: categoryIcons[item.product_category] || '•',
        }));
    };

    // 过滤套餐 - 支持套餐名称、描述和产品名称搜索
    const filteredPackages = packages.filter((pkg) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();

        // 搜索套餐名称
        if (pkg.name.toLowerCase().includes(query)) return true;

        // 搜索套餐描述
        if (pkg.description?.toLowerCase().includes(query)) return true;

        // 搜索产品名称
        return pkg.items.some((item) => item.product_name.toLowerCase().includes(query));
    });

    return (
        <>
            {loadingPackages && (
                <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
                    <div className="bg-white shadow-xl rounded-2xl p-5 lg:sticky lg:top-6">
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                            <p className="text-gray-600 font-medium text-sm">加载套餐中...</p>
                        </div>
                    </div>
                </div>
            )}

            {!loadingPackages && (
                <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
                    <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-5 lg:sticky lg:top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
                            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-2 shadow-lg">
                                <svg
                                    className="w-4 h-4 text-white"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
                                    />
                                </svg>
                            </div>
                            推荐套餐
                        </h2>

                        {/* 搜索框 */}
                        <div className="mb-4">
                            <div className="relative">
                                <input
                                    type="text"
                                    placeholder="搜索套餐或产品..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-full px-4 py-2 pl-10 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                />
                                <svg
                                    className="absolute left-3 top-2.5 w-5 h-5 text-gray-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                                    />
                                </svg>
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                    >
                                        <svg
                                            className="w-5 h-5"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M6 18L18 6M6 6l12 12"
                                            />
                                        </svg>
                                    </button>
                                )}
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                                找到 {filteredPackages.length} 个套餐
                            </p>
                        </div>

                        {/* 套餐列表 */}
                        <div className="space-y-3 max-h-[500px] lg:max-h-[calc(100vh-300px)] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                            {filteredPackages.length > 0 ? (
                                filteredPackages.map((pkg) => {
                                    const coreSpecs = getCoreSpecs(pkg);
                                    return (
                                        <div
                                            key={pkg.id}
                                            className="group relative border-2 border-gray-200 rounded-xl p-3 sm:p-4 hover:border-blue-500 transition-all duration-300 hover:shadow-xl cursor-pointer bg-gradient-to-br from-white to-gray-50 overflow-hidden transform hover:-translate-y-1"
                                            onClick={() => onApplyPackage(pkg)}
                                        >
                                            {/* 背景装饰 */}
                                            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-2xl opacity-0 group-hover:opacity-100 transition-all duration-300" />

                                            {/* 徽章装饰 */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                                <div className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                    点击使用
                                                </div>
                                            </div>

                                            <div className="relative">
                                                {/* 标题和价格 */}
                                                <div className="mb-3">
                                                    <h3 className="font-bold text-gray-900 text-sm sm:text-base mb-2 pr-12">
                                                        {pkg.name}
                                                    </h3>
                                                    <div className="flex items-baseline justify-between">
                                                        <span className="text-blue-600 font-bold text-base sm:text-lg">
                                                            ¥{pkg.total_price.toFixed(2)}
                                                        </span>
                                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                                            {pkg.items.length}件
                                                        </span>
                                                    </div>
                                                </div>

                                                {/* 核心配件信息 */}
                                                {coreSpecs.length > 0 && (
                                                    <div className="space-y-2 mb-3">
                                                        {coreSpecs.map((spec) => (
                                                            <div
                                                                key={spec.id}
                                                                className="flex items-start gap-2 text-xs"
                                                            >
                                                                <span className="text-base">
                                                                    {spec.icon}
                                                                </span>
                                                                <div className="flex-1 min-w-0">
                                                                    <p className="text-gray-700 truncate font-medium">
                                                                        {spec.product_name}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}

                                                {/* 按钮 */}
                                                <button className="w-full py-2 px-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs sm:text-sm font-medium rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-300 shadow-sm hover:shadow-md group-hover:scale-[1.02] transform">
                                                    <span className="flex items-center justify-center">
                                                        <svg
                                                            className="w-4 h-4 mr-1.5 group-hover:animate-pulse"
                                                            fill="none"
                                                            stroke="currentColor"
                                                            viewBox="0 0 24 24"
                                                        >
                                                            <path
                                                                strokeLinecap="round"
                                                                strokeLinejoin="round"
                                                                strokeWidth={2}
                                                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                                                            />
                                                        </svg>
                                                        使用配置
                                                    </span>
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center py-8 text-gray-500">
                                    <svg
                                        className="w-12 h-12 mx-auto mb-3 text-gray-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    <p className="text-sm">未找到匹配的套餐</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default PackageRecomment;

function useInit() {
    const { packages, loading } = useGetPackages();
    return { packages, loading };
}

function useGetPackages() {
    const [packages, setPackages] = useState<Package[]>([]);
    const { loading } = useRequest(getPackAges, {
        onSuccess: (result) => {
            if (result.data) {
                setPackages(result.data);
            }
        },
    });

    return {
        packages,
        loading,
    };
}

function getPackAges() {
    return axios.get<Package[]>('/packages');
}
