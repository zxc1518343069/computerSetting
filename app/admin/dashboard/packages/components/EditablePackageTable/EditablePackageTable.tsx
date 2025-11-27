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
    onProductChange: (id: string, productId: number) => void;
    onQuantityChange: (id: string, quantity: number) => void;
    onAddRow?: (category: string) => void;
    onRemoveRow?: (id: string) => void;
    onCustomNameChange?: (id: string, name: string) => void;
    onCustomPriceChange?: (id: string, price: number) => void;
    disabled?: boolean;
    pricing?: boolean;
    showDiscountedPrice?: boolean;
    discountedPrice?: number;
    onDiscountedPriceChange?: (price: number) => void;
}

const EditablePackageTable: React.FC<EditablePackageTableProps> = ({
    items,
    onProductChange,
    onQuantityChange,
    onAddRow,
    onRemoveRow,
    onCustomNameChange,
    onCustomPriceChange,
    disabled = false,
    pricing = false,
    showDiscountedPrice,
    discountedPrice,
    onDiscountedPriceChange,
}) => {
    const { products, pricingConfig, loading } = usePackageTableData();
    const { getProductPrice, getItemPrice, totalPrice } = usePackageCalculator(
        products,
        pricingConfig,
        items
    );

    if (loading) {
        return (
            <div className="flex justify-center py-12 bg-gray-50/30 rounded-xl">
                <Spin tip="加载产品数据..." />
            </div>
        );
    }

    if (!products.length) {
        return <Empty description="暂无产品数据" />;
    }

    return (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-gray-100">
            <table className="w-full border-collapse">
                <TableHeader pricing={pricing} />
                <tbody className="divide-y divide-gray-50">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        const categoryItems = items.filter((item) => item.category === cat.key);
                        // Ensure at least one row exists for structure (handled by parent usually, but good to check)
                        // But here we rely on `items` passed from parent.

                        return categoryItems.map((item, index) => {
                            const itemPrice = getItemPrice(item);
                            const isMultiSelect = ['ram', 'storage', 'cooling', 'monitor'].includes(
                                cat.key
                            );

                            return (
                                <ProductRow
                                    key={item.id}
                                    item={item}
                                    products={products.filter((p) => p.category === cat.key)}
                                    categoryName={cat.name}
                                    isFirst={index === 0}
                                    canRemove={isMultiSelect && categoryItems.length > 1}
                                    isMultiSelect={isMultiSelect}
                                    disabled={disabled}
                                    pricing={pricing}
                                    itemPrice={itemPrice}
                                    getProductPrice={getProductPrice}
                                    onProductChange={onProductChange}
                                    onQuantityChange={onQuantityChange}
                                    onCustomNameChange={onCustomNameChange}
                                    onCustomPriceChange={onCustomPriceChange}
                                    onAddRow={onAddRow}
                                    onRemoveRow={onRemoveRow}
                                />
                            );
                        });
                    })}
                    <ExtraRows pricing={pricing} disabled={disabled} />
                </tbody>
                <TableFooter
                    totalPrice={totalPrice}
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
