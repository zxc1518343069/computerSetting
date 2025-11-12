'use client';
import EditablePackageTable from '@/app/admin/dashboard/packages/_components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useImperativeHandle } from 'react';
import { Package, PackageItem } from '@/app/_components/PCPartsTable/PackageRecomment';
import { useTableControl } from './hooks/useTableControl';
import { TableHeader } from './components/TableHeader';
import { InfoSection } from './components/InfoSection';

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
        discountedPrice,
        setDiscountedPrice,
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
            const newItems = PACKAGE_CATEGORIES.flatMap((cat) => {
                const categoryItems = itemsByCategory[cat.key] || [];
                if (categoryItems.length > 0) {
                    return categoryItems.map((packageItem, index) => ({
                        id: `${cat.key}-${index + 1}`,
                        category: cat.key,
                        product_id: packageItem.product_id,
                        quantity: packageItem.quantity,
                    }));
                }
                return [
                    {
                        id: `${cat.key}-1`,
                        category: cat.key,
                        product_id: 0,
                        quantity: 1,
                    },
                ];
            });
            setTableData(newItems);
        },
    }));

    return (
        <>
            <div className="bg-white shadow-xl rounded-2xl p-4 sm:p-5 lg:p-6 mb-6">
                <TableHeader />

                <EditablePackageTable
                    items={tableData}
                    onProductChange={(id, quantity) => {
                        handleTableDataChange(id, 'product_id', quantity);
                    }}
                    onQuantityChange={(id, quantity) => {
                        handleTableDataChange(id, 'quantity', quantity);
                    }}
                    onCustomNameChange={(id, name) =>
                        handleTableDataChange(id, 'custom_name', name)
                    }
                    onCustomPriceChange={(id, price) =>
                        handleTableDataChange(id, 'custom_price', price)
                    }
                    onAddRow={handleAddRow}
                    onRemoveRow={handleRemoveRow}
                    pricing={true}
                    showDiscountedPrice={true}
                    discountedPrice={discountedPrice}
                    onDiscountedPriceChange={setDiscountedPrice}
                />
            </div>

            <InfoSection onReset={handleReset} />
        </>
    );
}
