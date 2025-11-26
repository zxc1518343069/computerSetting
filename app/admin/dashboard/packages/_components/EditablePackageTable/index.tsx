'use client';

import React, { useMemo } from 'react';
import { PACKAGE_CATEGORIES } from '@/const';
import { EditablePackageTableProps } from './types';
import { useProductsAndPricing } from './hooks/useProductsAndPricing';
import { usePricing } from './hooks/usePricing';
import { LoadingState } from './components/LoadingState';
import { TableHeader } from './components/TableHeader';
import { ProductRow } from './components/ProductRow';
import { ExtraRows } from './components/ExtraRows';
import { TableFooter } from './components/TableFooter';

export * from './types';

export default function EditablePackageTable({
    items,
    onProductChange,
    onQuantityChange,
    onAddRow,
    onRemoveRow,
    onCustomNameChange,
    onCustomPriceChange,
    disabled = false,
    pricing = false,
    showDiscountedPrice = false,
    discountedPrice,
    onDiscountedPriceChange,
}: EditablePackageTableProps) {
    const multiSelectCategories = ['ram', 'storage', 'cooling', 'monitor'];
    const { products, pricingConfig, loading } = useProductsAndPricing();
    const { getProductPrice, getItemPrice, totalPrice } = usePricing(
        products,
        pricingConfig,
        items
    );

    const productsByCategory = useMemo(() => {
        const map: Record<string, typeof products> = {};
        PACKAGE_CATEGORIES.forEach((cat) => {
            map[cat.key] = products.filter((p) => p.category === cat.key);
        });
        return map;
    }, [products]);

    // 聚合所有处理函数
    const handlers = useMemo(
        () => ({
            onProductChange,
            onQuantityChange,
            onCustomNameChange,
            onCustomPriceChange,
            onAddRow,
            onRemoveRow,
        }),
        [
            onProductChange,
            onQuantityChange,
            onCustomNameChange,
            onCustomPriceChange,
            onAddRow,
            onRemoveRow,
        ]
    );

    if (loading) {
        return <LoadingState />;
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full">
                <TableHeader pricing={pricing} />

                <tbody className="divide-y divide-gray-100">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        const categoryItems = items.filter((i) => i.category === cat.key);
                        const categoryProducts = productsByCategory[cat.key] || [];
                        const isMultiSelect = multiSelectCategories.includes(cat.key);
                        const rowsToRender = categoryItems.length > 0 ? categoryItems : [null];

                        return rowsToRender.map((item, index) => {
                            const itemPrice = item ? getItemPrice(item) : 0;
                            const selectedProduct = item?.product_id
                                ? products.find((p) => p.id === item.product_id)
                                : null;
                            const isFirstRow = index === 0;
                            const canRemove = isMultiSelect && categoryItems.length > 1;

                            return (
                                <ProductRow
                                    key={item?.id || `${cat.key}-empty`}
                                    item={item}
                                    category={cat}
                                    index={index}
                                    products={categoryProducts}
                                    selectedProduct={selectedProduct || null}
                                    isFirstRow={isFirstRow}
                                    canRemove={canRemove}
                                    isMultiSelect={isMultiSelect}
                                    itemPrice={itemPrice}
                                    pricing={pricing}
                                    disabled={disabled}
                                    getProductPrice={getProductPrice}
                                    handlers={handlers}
                                />
                            );
                        });
                    }).flat()}

                    <ExtraRows pricing={pricing} disabled={disabled} />
                </tbody>

                <TableFooter
                    pricing={pricing}
                    totalPrice={totalPrice}
                    discount={{
                        show: showDiscountedPrice,
                        price: discountedPrice,
                        onChange: onDiscountedPriceChange,
                    }}
                    disabled={disabled}
                />
            </table>
        </div>
    );
}
