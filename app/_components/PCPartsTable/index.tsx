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

    const [isExporting, setIsExporting] = useState(false);
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
            prev.map((item) =>
                item.id === id ? { ...item, product_id: productId } : item
            )
        );
    };

    // 处理数量变化
    const handleQuantityChange = (id: string, quantity: number) => {
        setItems((prev) =>
            prev.map((item) => (item.id === id ? { ...item, quantity } : item))
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
            const lastIndex = prev.map(item => item.category).lastIndexOf(category);
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
    };

    // 应用套餐
    const applyPackage = (pkg: Package) => {
        // 按类别分组套餐项
        const itemsByCategory: Record<string, PackageItem[]> = {};
        pkg.items.forEach(item => {
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

    const handleExportImage = async () => {
        if (!tableExportRef.current) return;

        setIsExporting(true);

        try {
            // 使用 html2canvas
            const html2canvas = (await import('html2canvas')).default;

            // 创建一个包装元素用于导出
            const wrapper = document.createElement('div');
            wrapper.style.cssText = `
                position: absolute;
                left: -9999px;
                top: 0;
                background: white;
                padding: 40px;
                width: ${tableExportRef.current.offsetWidth}px;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            `;

            // 添加标题
            const header = document.createElement('div');
            header.style.cssText = `
                margin-bottom: 30px;
                text-align: center;
                padding: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                border-radius: 12px;
                color: white;
            `;
            header.innerHTML = `
                <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 10px;">
                    巩义明远 DIY装机报价系统
                </h1>
                <p style="font-size: 14px; opacity: 0.9;">
                    ${currentTime || ''}
                </p>
            `;

            wrapper.appendChild(header);

            // 递归函数：复制元素并内联样式
            const cloneWithStyles = (source: Element): HTMLElement => {
                const clone = source.cloneNode(false) as HTMLElement;
                const computedStyle = window.getComputedStyle(source);

                // 复制所有计算后的样式
                Array.from(computedStyle).forEach((key) => {
                    const value = computedStyle.getPropertyValue(key);
                    // 跳过 oklch 颜色
                    if (value && !value.includes('oklch')) {
                        try {
                            clone.style.setProperty(key, value);
                        } catch (e) {
                            // 某些属性可能无法设置，忽略
                        }
                    } else if (value && value.includes('oklch')) {
                        // 对于 oklch 颜色，使用备用颜色
                        if (key === 'color') {
                            clone.style.color = '#1f2937'; // gray-800
                        } else if (key === 'background-color') {
                            clone.style.backgroundColor = '#ffffff';
                        } else if (key.includes('border') && key.includes('color')) {
                            clone.style.setProperty(key, '#e5e7eb'); // gray-200
                        }
                    }
                });

                // 递归处理子元素
                Array.from(source.children).forEach((child) => {
                    clone.appendChild(cloneWithStyles(child));
                });

                // 复制文本节点
                Array.from(source.childNodes).forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        clone.appendChild(node.cloneNode(true));
                    }
                });

                return clone;
            };

            // 克隆表格并内联样式
            const cloned = cloneWithStyles(tableExportRef.current);
            wrapper.appendChild(cloned);
            document.body.appendChild(wrapper);

            // 等待渲染
            await new Promise((resolve) => setTimeout(resolve, 300));

            // 使用html2canvas渲染
            const canvas = await html2canvas(wrapper, {
                scale: 2,
                useCORS: true,
                allowTaint: true,
                backgroundColor: '#ffffff',
                logging: false,
            });

            // 移除临时元素
            document.body.removeChild(wrapper);

            // 下载图片
            const link = document.createElement('a');
            link.download = `电脑配置_${new Date().getTime()}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
            link.click();
        } catch (error) {
            console.error('导出图片失败:', error);
            alert(`导出图片失败: ${(error as Error).message}`);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6"
            ref={exportRef}
        >
            <div className="max-w-[1800px] mx-auto">
                {/* 页面标题和时间 */}
                <div className="max-w-6xl mx-auto px-6 py-10 animate-fadeIn">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                        {/* 左侧：标题 + 时间 */}
                        <div className="space-y-6">
                            <h1 className="text-5xl font-extrabold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent tracking-tight drop-shadow-lg">
                                巩义明远
                                <br />
                                DIY装机报价系统
                            </h1>

                            {currentTime && (
                                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white text-sm shadow-md animate-pulse">
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
                            )}
                        </div>

                        {/* 右侧：价格说明卡片 */}
                        <div className="bg-white/80 backdrop-blur-md border border-gray-200 rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-start">
                                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 text-white shadow-md">
                                    <svg
                                        className="w-6 h-6"
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
                                    <p className="font-semibold text-gray-800 text-lg">价格说明</p>
                                    <p className="text-sm text-gray-600 leading-relaxed mt-1">
                                        以上价格为预估溢价后的售价，实际购买价格可能会因市场波动有所不同，请以最终结算价格为准。
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 主要内容区域：左中右三栏布局 */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* 左侧：推荐套餐区域 */}
                    {!loadingPackages && packages.length > 0 && (
                        <div className="lg:col-span-2 xl:col-span-2 order-2 lg:order-1">
                            <div className="bg-white shadow-xl rounded-2xl p-5 lg:sticky lg:top-6">
                                <h2 className="text-lg lg:text-xl font-bold text-gray-800 mb-4 flex items-center">
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

                    {/* 中间：配件选择表格 */}
                    <div
                        className={`${
                            !loadingPackages && packages.length > 0
                                ? 'lg:col-span-8 xl:col-span-8 order-1 lg:order-2'
                                : 'lg:col-span-11 xl:col-span-11 order-1 lg:order-2'
                        }`}
                    >
                        <div
                            className="bg-white shadow-xl rounded-2xl p-5 lg:p-6 mb-6"
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

                                {/*/!* 导出图片按钮 *!/*/}
                                {/*<button*/}
                                {/*    onClick={handleExportImage}*/}
                                {/*    disabled={isExporting}*/}
                                {/*    className="flex items-center justify-center gap-2 bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white px-3 sm:px-4 py-2 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base w-full sm:w-auto"*/}
                                {/*>*/}
                                {/*    {isExporting ? (*/}
                                {/*        <>*/}
                                {/*            <svg*/}
                                {/*                className="animate-spin h-5 w-5"*/}
                                {/*                fill="none"*/}
                                {/*                viewBox="0 0 24 24"*/}
                                {/*            >*/}
                                {/*                <circle*/}
                                {/*                    className="opacity-25"*/}
                                {/*                    cx="12"*/}
                                {/*                    cy="12"*/}
                                {/*                    r="10"*/}
                                {/*                    stroke="currentColor"*/}
                                {/*                    strokeWidth="4"*/}
                                {/*                ></circle>*/}
                                {/*                <path*/}
                                {/*                    className="opacity-75"*/}
                                {/*                    fill="currentColor"*/}
                                {/*                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"*/}
                                {/*                ></path>*/}
                                {/*            </svg>*/}
                                {/*            <span className="text-sm">导出中...</span>*/}
                                {/*        </>*/}
                                {/*    ) : (*/}
                                {/*        <>*/}
                                {/*            <svg*/}
                                {/*                className="w-5 h-5"*/}
                                {/*                fill="none"*/}
                                {/*                stroke="currentColor"*/}
                                {/*                viewBox="0 0 24 24"*/}
                                {/*            >*/}
                                {/*                <path*/}
                                {/*                    strokeLinecap="round"*/}
                                {/*                    strokeLinejoin="round"*/}
                                {/*                    strokeWidth={2}*/}
                                {/*                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"*/}
                                {/*                />*/}
                                {/*            </svg>*/}
                                {/*            <span className="text-sm font-medium">导出图片</span>*/}
                                {/*        </>*/}
                                {/*    )}*/}
                                {/*</button>*/}
                            </div>

                            <EditablePackageTable
                                items={items}
                                onProductChange={handleProductChange}
                                onQuantityChange={handleQuantityChange}
                                onAddRow={handleAddRow}
                                onRemoveRow={handleRemoveRow}
                                pricing={true}
                            />
                        </div>

                        {/* 说明和操作 */}
                        <div className="space-y-4">
                            {/* 提示信息 */}
                            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                                <div className="text-sm text-gray-700 space-y-2">
                                    <p className="flex items-center">
                                        <svg
                                            className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0"
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
                                                className="w-4 h-4 mr-2 text-blue-600 flex-shrink-0"
                                                fill="currentColor"
                                                viewBox="0 0 20 20"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                            点击左侧套餐可快速填充配件信息
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* 价格提醒 */}

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
