// components/PCPartsTable.tsx
'use client';
import ContactInfo from '@/app/admin/dashboard/packages/_components/ContactInfo';
import EditablePackageTable, {
    EditablePartRow,
} from '@/app/admin/dashboard/packages/_components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useState, useEffect, useRef } from 'react';

// 初始化items数据
const initialItems: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
    id: `${cat.key}-1`,
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
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTime, setCurrentTime] = useState('');
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);

    const exportRef = useRef<HTMLDivElement>(null);
    const tableExportRef = useRef<HTMLDivElement>(null);

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

    // 更新中国时区当前时间
    useEffect(() => {
        const updateTime = () => {
            const now = new Date();
            const chinaTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Shanghai' }));
            const year = chinaTime.getFullYear();
            const month = String(chinaTime.getMonth() + 1).padStart(2, '0');
            const day = String(chinaTime.getDate()).padStart(2, '0');
            const hours = String(chinaTime.getHours()).padStart(2, '0');
            const minutes = String(chinaTime.getMinutes()).padStart(2, '0');
            const seconds = String(chinaTime.getSeconds()).padStart(2, '0');
            setCurrentTime(`${year}-${month}-${day} ${hours}:${minutes}:${seconds}`);
        };

        updateTime();
        const timer = setInterval(updateTime, 1000);

        return () => clearInterval(timer);
    }, []);

    // 处理产品选择变化
    const handleProductChange = (id: string, productId: number) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, product_id: productId } : item))
        );
    };

    // 处理数量变化
    const handleQuantityChange = (id: string, quantity: number) => {
        setItems((prev) => prev.map((item) => (item.id === id ? { ...item, quantity } : item)));
    };

    // 处理自定义产品名称变化
    const handleCustomNameChange = (id: string, name: string) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, custom_name: name } : item))
        );
    };

    // 处理自定义产品价格变化
    const handleCustomPriceChange = (id: string, price: number) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, custom_price: price } : item))
        );
    };

    // 添加新行
    const handleAddRow = (category: string) => {
        setItems((prev) => {
            // 找出该类别已有的最大编号
            const categoryItems = prev.filter((item) => item.category === category);
            const maxNum = categoryItems.length;

            // 创建新行
            const newRow: EditablePartRow = {
                id: `${category}-${maxNum + 1}`,
                category: category,
                product_id: 0,
                quantity: 1,
            };

            // 插入到该类别的最后一行之后
            const lastIndex = prev.map((item) => item.category).lastIndexOf(category);
            const newItems = [...prev];
            newItems.splice(lastIndex + 1, 0, newRow);

            return newItems;
        });
    };

    // 删除行
    const handleRemoveRow = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    // 重置表单
    const handleReset = () => {
        setItems(initialItems);
        setDiscountedPrice(0);
    };

    // 应用套餐
    const applyPackage = (pkg: Package) => {
        // 按类别分组套餐项
        const itemsByCategory: Record<string, PackageItem[]> = {};
        pkg.items.forEach((item) => {
            if (!itemsByCategory[item.product_category]) {
                itemsByCategory[item.product_category] = [];
            }
            itemsByCategory[item.product_category].push(item);
        });

        const newItems: EditablePartRow[] = [];

        PACKAGE_CATEGORIES.forEach((cat) => {
            const categoryItems = itemsByCategory[cat.key] || [];

            if (categoryItems.length > 0) {
                // 有套餐项，创建对应数量的行
                categoryItems.forEach((packageItem, index) => {
                    newItems.push({
                        id: `${cat.key}-${index + 1}`,
                        category: cat.key,
                        product_id: packageItem.product_id,
                        quantity: packageItem.quantity,
                    });
                });
            } else {
                // 没有套餐项，创建一个空行
                newItems.push({
                    id: `${cat.key}-1`,
                    category: cat.key,
                    product_id: 0,
                    quantity: 1,
                });
            }
        });

        setItems(newItems);
    };

    // 获取核心配件描述（CPU、显卡、主板）
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
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-4 sm:p-6"
            ref={exportRef}
        >
            <div className="max-w-[1800px] mx-auto">
                {/* 页面标题 */}
                <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-10 animate-fadeIn">
                    <div className="text-center space-y-4">
                        {/* 标题 */}
                        <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
                            巩义明远 DIY装机报价系统
                        </h1>

                        {/* 时间显示 */}
                        {currentTime && (
                            <div className="flex justify-center">
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm shadow-md">
                                    <svg
                                        className="w-4 h-4"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                        />
                                    </svg>
                                    {currentTime}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 主要内容区域：响应式布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
                    {/* 左侧：推荐套餐区域 */}
                    {!loadingPackages && packages.length > 0 && (
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
                                                    onClick={() => applyPackage(pkg)}
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

                    {/* 加载套餐数据时的占位 */}
                    {loadingPackages && (
                        <div className="lg:col-span-3 xl:col-span-3 order-2 lg:order-1">
                            <div className="bg-white shadow-xl rounded-2xl p-5 lg:sticky lg:top-6">
                                <div className="flex flex-col items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                                    <p className="text-gray-600 font-medium text-sm">
                                        加载套餐中...
                                    </p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* 中间：配件选择表格 */}
                    <div
                        className={`${
                            !loadingPackages && packages.length > 0
                                ? 'lg:col-span-7 xl:col-span-7 order-1 lg:order-2'
                                : loadingPackages
                                  ? 'lg:col-span-7 xl:col-span-7 order-1 lg:order-2'
                                  : 'lg:col-span-10 xl:col-span-10 order-1 lg:order-2'
                        }`}
                    >
                        <div
                            className="bg-white shadow-xl rounded-2xl p-4 sm:p-5 lg:p-6 mb-6"
                            ref={tableExportRef}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                                <h2 className="text-lg lg:text-xl font-bold text-gray-800 flex items-center">
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
                            </div>

                            <EditablePackageTable
                                items={items}
                                onProductChange={handleProductChange}
                                onQuantityChange={handleQuantityChange}
                                onCustomNameChange={handleCustomNameChange}
                                onCustomPriceChange={handleCustomPriceChange}
                                onAddRow={handleAddRow}
                                onRemoveRow={handleRemoveRow}
                                pricing={true}
                                showDiscountedPrice={true}
                                discountedPrice={discountedPrice}
                                onDiscountedPriceChange={setDiscountedPrice}
                            />
                        </div>

                        {/* 说明和操作 */}
                        <div className="space-y-4">
                            {/* 提示信息 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="flex items-start">
                                        <svg
                                            className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fillRule="evenodd"
                                                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                clipRule="evenodd"
                                            />
                                        </svg>
                                        <span>
                                            选择产品并设置数量，价格自动计算。支持自定义产品名称和价格。
                                        </span>
                                    </p>
                                    {!loadingPackages && packages.length > 0 && (
                                        <p className="flex items-start">
                                            <svg
                                                className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0 mt-0.5"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            <span>点击左侧推荐套餐可快速填充配件信息。</span>
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 价格说明 */}
                            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                                <div className="flex items-start">
                                    <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
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
                                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                            />
                                        </svg>
                                    </div>
                                    <div className="ml-4">
                                        <p className="font-semibold text-gray-800 text-base">
                                            价格说明
                                        </p>
                                        <p className="text-sm text-gray-600 leading-relaxed mt-1">
                                            硬件价格随市场行情波动，报价仅当日有效。
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* 重置按钮 */}
                            <div className="flex justify-center sm:justify-end">
                                <button
                                    onClick={handleReset}
                                    className="px-6 py-2.5 bg-gradient-to-r from-gray-500 to-gray-600 text-white font-medium rounded-xl hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-md hover:shadow-lg transform hover:-translate-y-0.5 active:scale-95"
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
                                        重置配置
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* 右侧：联系方式 */}
                    <div className="lg:col-span-2 xl:col-span-2 order-3">
                        <ContactInfo />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PCPartsTable;
