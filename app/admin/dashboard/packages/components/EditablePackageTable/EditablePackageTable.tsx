'use client';

import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import React from 'react';
import { Spin, Empty } from 'antd';
import { usePackageTableData } from './hooks/usePackageTableData';
import { usePackageCalculator } from './hooks/usePackageCalculator';
import { TableHeader } from './components/TableHeader';
import { ProductRow } from './components/ProductRow';
import { ExtraRows } from './components/ExtraRows';
import { TableFooter } from './components/TableFooter';
import { PACKAGE_CATEGORIES } from '@/const';

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
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50/30 rounded-xl gap-3">
                <Spin size="large" />
                <span className="text-gray-400 text-sm">加载产品数据...</span>
            </div>
        );
    }

    if (!products.length) {
        return <Empty description="暂无产品数据" />;
    }

    // Only pass metrics if showProfit is explicitly enabled
    const metrics = showProfit ? { totalCost, totalProfit, profitRate } : undefined;

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full border-collapse">
                <TableHeader pricing={pricing} showTips={showProfit} />
                <tbody className="divide-y divide-gray-50">
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
