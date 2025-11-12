// components/PCPartsTable.tsx
'use client';
import EditablePackageTable, {
    EditablePartRow,
} from '@/app/admin/dashboard/packages/_components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useImperativeHandle, useState } from 'react';
import { Package, PackageItem } from '@/app/_components/PCPartsTable/PackageRecomment';

// 初始化items数据
const initTableData: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
    id: `${cat.key}-1`,
    category: cat.key,
    product_id: 0,
    quantity: 1,
}));

export interface CustomRef {
    processPkgToTableData: (pkg: Package) => void;
}
export interface ContentProps {
    customRef: React.RefObject<CustomRef | null>;
}

export function Content(props: ContentProps) {
    const {
        handleReset,
        handleTableDataChange,
        tableData,
        handleAddRow,
        handleRemoveRow,
        setTableData,
    } = useTableControl();

    useImperativeHandle(props.customRef, () => ({
        processPkgToTableData: (pkg: Package) => {
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
            setTableData(newItems);
        },
    }));

    const [discountedPrice, setDiscountedPrice] = useState<number>(0);

    return (
        <>
            <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-5 lg:p-6 mb-6">
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
                    items={tableData}
                    onProductChange={(id, quantity) => {
                        handleTableDataChange(id, 'product_id', quantity);
                    }}
                    onQuantityChange={(id, quantity) => {
                        handleTableDataChange(id, 'quantity', quantity);
                    }}
                    onCustomNameChange={(id, name) => handleTableDataChange(id, 'name', name)}
                    onCustomPriceChange={(id, price) => handleTableDataChange(id, 'price', price)}
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
                            <p className="font-semibold text-gray-800 text-base">价格说明</p>
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
        </>
    );
}

function useTableControl() {
    const [tableData, setTableData] = useState<EditablePartRow[]>(initTableData);
    const [searchQuery, setSearchQuery] = useState('');
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);

    const handleTableDataChange = (
        id: string,
        key: 'quantity' | 'name' | 'price' | 'product_id',
        value: number | string
    ) => {
        setTableData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, [key]: value } : item))
        );
    };
    // 处理产品选择变化
    const handleProductChange = (id: string, productId: number) => {
        setTableData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, product_id: productId } : item))
        );
    };

    // 添加新行
    const handleAddRow = (category: string) => {
        setTableData((prev) => {
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
        setTableData((prev) => prev.filter((item) => item.id !== id));
    };

    // 重置表单
    const handleReset = () => {
        setTableData(initTableData);
        setDiscountedPrice(0);
    };

    return {
        tableData,
        setTableData,
        searchQuery,
        setSearchQuery,
        discountedPrice,
        setDiscountedPrice,
        handleTableDataChange,
        handleProductChange,
        handleAddRow,
        handleRemoveRow,
        handleReset,
    };
}
