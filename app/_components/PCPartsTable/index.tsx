// components/PCPartsTable.tsx
'use client';
import EditablePackageTable, {
    EditablePartRow,
} from '@/app/admin/dashboard/packages/_components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useState, useEffect } from 'react';

// 初始化items数据
const initialItems: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
    category: cat.key,
    product_id: 0,
    quantity: 1,
}));

interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

interface Package {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}

const PCPartsTable: React.FC = () => {
    const [items, setItems] = useState<EditablePartRow[]>(initialItems);
    const [packages, setPackages] = useState<Package[]>([]);
    const [loadingPackages, setLoadingPackages] = useState(true);

    // 获取推荐套餐
    useEffect(() => {
        const fetchPackages = async () => {
            try {
                const response = await fetch('/api/packages');
                const result = await response.json();
                if (result.success && result.data) {
                    setPackages(result.data);
                }
            } catch (error) {
                console.error('获取套餐失败:', error);
            } finally {
                setLoadingPackages(false);
            }
        };

        fetchPackages();
    }, []);

    // 处理产品选择变化
    const handleProductChange = (category: string, productId: number) => {
        setItems((prev) =>
            prev.map((item) =>
                item.category === category ? { ...item, product_id: productId } : item
            )
        );
    };

    // 处理数量变化
    const handleQuantityChange = (category: string, quantity: number) => {
        setItems((prev) =>
            prev.map((item) => (item.category === category ? { ...item, quantity } : item))
        );
    };

    // 重置表单
    const handleReset = () => {
        setItems(initialItems);
    };

    // 应用套餐
    const applyPackage = (pkg: Package) => {
        const newItems = PACKAGE_CATEGORIES.map((cat) => {
            // 找到该分类对应的套餐项
            const packageItem = pkg.items.find((item) => item.product_category === cat.key);

            if (packageItem) {
                return {
                    category: cat.key,
                    product_id: packageItem.product_id,
                    quantity: packageItem.quantity,
                };
            }

            // 如果套餐中没有该分类，返回初始值
            return {
                category: cat.key,
                product_id: 0,
                quantity: 1,
            };
        });

        setItems(newItems);
    };

    // 获取核心配件描述（CPU、显卡、主板）
    const getCoreSpecs = (pkg: Package) => {
        const coreCategories = ['cpu', 'gpu', 'motherboard'];
        const coreItems = pkg.items.filter((item) => coreCategories.includes(item.product_category));

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

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6">
            <div className="max-w-7xl mx-auto">
                {/* 页面标题 */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                        电脑配件报价系统
                    </h1>
                    <p className="text-gray-600">选择配件，实时计算价格</p>
                </div>

                {/* 推荐套餐区域 */}
                {!loadingPackages && packages.length > 0 && (
                    <div className="mb-8">
                        <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mr-3 shadow-lg">
                                <svg
                                    className="w-5 h-5 text-white"
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
                            推荐套餐配置
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                            {packages.map((pkg) => {
                                const coreSpecs = getCoreSpecs(pkg);
                                return (
                                    <div
                                        key={pkg.id}
                                        className="group relative border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-500 transition-all hover:shadow-xl cursor-pointer bg-white overflow-hidden"
                                        onClick={() => applyPackage(pkg)}
                                    >
                                        {/* 背景装饰 */}
                                        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />

                                        <div className="relative">
                                            {/* 标题和价格 */}
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-bold text-gray-900 text-lg pr-2">
                                                    {pkg.name}
                                                </h3>
                                                <div className="flex flex-col items-end">
                                                    <span className="text-blue-600 font-bold text-xl">
                                                        ¥{pkg.total_price.toFixed(2)}
                                                    </span>
                                                    <span className="text-xs text-gray-500 mt-1">
                                                        含{pkg.items.length}件配件
                                                    </span>
                                                </div>
                                            </div>

                                            {/* 核心配件信息 */}
                                            <div className="space-y-3 mb-4">
                                                {coreSpecs.map((spec) => (
                                                    <div
                                                        key={spec.id}
                                                        className="flex items-start gap-2 text-sm"
                                                    >
                                                        <span className="text-lg">{spec.icon}</span>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="text-gray-700 truncate font-medium">
                                                                {spec.product_name}
                                                            </p>
                                                            <p className="text-xs text-gray-500">
                                                                ¥{spec.product_price.toFixed(2)} × {spec.quantity}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            {/* 按钮 */}
                                            <button className="w-full py-3 px-4 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-medium rounded-xl hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg group-hover:scale-[1.02]">
                                                <span className="flex items-center justify-center">
                                                    <svg
                                                        className="w-5 h-5 mr-2"
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
                                                    使用此配置
                                                </span>
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* 配件选择表格 */}
                <div className="bg-white shadow-xl rounded-2xl p-6 mb-6">
                    <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                        <svg
                            className="w-6 h-6 mr-2 text-blue-600"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                            />
                        </svg>
                        配件清单
                    </h2>
                    <EditablePackageTable
                        items={items}
                        onProductChange={handleProductChange}
                        onQuantityChange={handleQuantityChange}
                        pricing={true}
                    />
                </div>

                {/* 说明和操作 */}
                <div className="flex justify-between items-center">
                    <div className="text-sm text-gray-600 space-y-1">
                        <p className="flex items-center">
                            <svg
                                className="w-4 h-4 mr-1 text-blue-600"
                                fill="currentColor"
                                viewBox="0 0 20 20"
                            >
                                <path
                                    fillRule="evenodd"
                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                    clipRule="evenodd"
                                />
                            </svg>
                            选择产品并设置数量，价格自动计算
                        </p>
                        {packages.length > 0 && (
                            <p className="flex items-center">
                                <svg
                                    className="w-4 h-4 mr-1 text-blue-600"
                                    fill="currentColor"
                                    viewBox="0 0 20 20"
                                >
                                    <path
                                        fillRule="evenodd"
                                        d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                        clipRule="evenodd"
                                    />
                                </svg>
                                点击推荐套餐可快速填充配件信息
                            </p>
                        )}
                    </div>
                    <button
                        onClick={handleReset}
                        className="px-6 py-3 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all shadow-md hover:shadow-lg"
                    >
                        <span className="flex items-center">
                            <svg
                                className="w-5 h-5 mr-2"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                                />
                            </svg>
                            重置
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PCPartsTable;
