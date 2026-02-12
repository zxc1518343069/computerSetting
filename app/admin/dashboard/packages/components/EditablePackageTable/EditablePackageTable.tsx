'use client';

import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import { PACKAGE_CATEGORIES } from '@/const';
import { Empty } from 'antd';
import React from 'react';
import { ExtraRows } from './components/ExtraRows';
import { ProductRow } from './components/ProductRow';
import { TableFooter } from './components/TableFooter';
import { TableHeader } from './components/TableHeader';
import { usePackageCalculator } from './hooks/usePackageCalculator';
import { usePackageTableData } from './hooks/usePackageTableData';

interface EditablePackageTableProps {
    items: EditablePartRow[];
    /** 统一的行更新回调 */
    onRowUpdate: (id: string, changes: Partial<EditablePartRow>) => void;
    onAddRow?: (category: string) => void;
    onRemoveRow?: (id: string) => void;
    disabled?: boolean;
    pricing?: boolean;
    showProfit?: boolean;
    showDiscountedPrice?: boolean;
    discountedPrice?: number;
    onDiscountedPriceChange?: (price: number) => void;
}

const EditablePackageTable: React.FC<EditablePackageTableProps> = ({
    items,
    onRowUpdate,
    onAddRow,
    onRemoveRow,
    disabled = false,
    pricing = false,
    showProfit = false,
    showDiscountedPrice,
    discountedPrice,
    onDiscountedPriceChange,
}) => {
    const { products, pricingConfig, loading } = usePackageTableData();
    const { getProductPrice, getItemMetrics, totalPrice, totalCost, totalProfit, profitRate } =
        usePackageCalculator(products, pricingConfig, items);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-24 bg-slate-50/50 rounded-3xl gap-6 border border-slate-100">
                <div className="w-10 h-10 border-2 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div>
                <span className="text-slate-400 text-xs font-bold uppercase tracking-widest">
                    正在同步配置数据...
                </span>
            </div>
        );
    }

    if (!products.length) {
        return (
            <div className="py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center">
                <Empty
                    description={<span className="text-slate-400 font-medium">暂无硬件数据</span>}
                />
            </div>
        );
    }

    const metrics = showProfit ? { totalCost, totalProfit, profitRate } : undefined;

    // 容器样式：增加 overflow-x-auto 解决展示不全问题
    const containerClasses = disabled
        ? 'w-full bg-white rounded-2xl border border-slate-100 shadow-sm overflow-x-auto scrollbar-hide'
        : 'w-full bg-white/60 backdrop-blur-xl rounded-[2rem] border border-white shadow-md overflow-x-auto scrollbar-hide';

    return (
        <div className={containerClasses}>
            {/* 设置 min-w 确保在窄容器中内容不被挤压 */}
            <table className="w-full border-collapse table-auto min-w-[800px]">
                <TableHeader pricing={pricing} />
                <tbody className="divide-y divide-gray-100/50">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        const categoryItems = items.filter((item) => item.category === cat.key);

                        return categoryItems.map((item, index) => {
                            const isMultiSelect = ['ram', 'storage', 'cooling', 'monitor'].includes(
                                cat.key
                            );

                            return (
                                <ProductRow
                                    key={item.id}
                                    item={item}
                                    products={products.filter((p) => p.category === cat.key)}
                                    config={{
                                        categoryName: cat.name,
                                        isFirst: index === 0,
                                        canRemove: isMultiSelect && categoryItems.length > 1,
                                        isMultiSelect: isMultiSelect,
                                        disabled: disabled,
                                        pricing: pricing,
                                        showProfit: showProfit,
                                    }}
                                    priceData={{
                                        getItemMetrics: getItemMetrics,
                                        getProductPrice: getProductPrice,
                                    }}
                                    actions={{
                                        onUpdate: onRowUpdate,
                                        onAddRow: onAddRow,
                                        onRemoveRow: onRemoveRow,
                                    }}
                                />
                            );
                        });
                    })}
                    <ExtraRows pricing={pricing} disabled={disabled} />
                </tbody>
                <TableFooter
                    totalPrice={totalPrice}
                    metrics={metrics}
                    pricing={pricing}
                    discount={{
                        show: !!showDiscountedPrice,
                        price: discountedPrice,
                        onChange: onDiscountedPriceChange,
                    }}
                    disabled={disabled}
                />
            </table>
        </div>
    );
};

export default EditablePackageTable;
