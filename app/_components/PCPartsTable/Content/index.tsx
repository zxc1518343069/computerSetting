'use client';
import EditablePackageTable from '@/app/admin/dashboard/packages/components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useImperativeHandle } from 'react';
import { Package, PackageItem } from '@/app/_components/PCPartsTable/PackageRecomment';
import { useTableControl } from './hooks/useTableControl';
import { InfoSection } from './components/InfoSection';
import { Typography } from 'antd';
import { BuildOutlined } from '@ant-design/icons';

const { Title } = Typography;

export interface CustomRef {
    processPkgToTableData: (pkg: Package) => void;
}

export interface ContentProps {
    customRef: React.MutableRefObject<CustomRef | null>;
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

    useImperativeHandle(
        props.customRef,
        () => ({
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
        }),
        [setTableData]
    );

    return (
        <div className="flex flex-col gap-4 h-full">
            {/* Header Area */}
            <div className="flex items-center justify-between px-1">
                <div>
                    <Title
                        level={4}
                        style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}
                    >
                        <BuildOutlined className="text-blue-600" />
                        配置工坊
                    </Title>
                    <p className="text-xs text-gray-400 mt-1">自定义您的专属电脑配置清单</p>
                </div>
            </div>

            {/* Main Table Area */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                {/* 
                    Wrapping EditablePackageTable to ensure it fits nicely.
                    Since EditablePackageTable is now a clean card-like component, 
                    we can just render it or wrap it for padding if needed.
                    The EditablePackageTable itself has rounded corners and shadow, 
                    so we might want to strip that if we are already in a card,
                    OR just let it be.
                    Let's just render it directly but maybe customize via props if it supported className.
                    Currently it doesn't support className prop in the interface I updated.
                    So we rely on its internal style. It has `rounded-2xl bg-white shadow-sm ring-1`.
                    This matches our theme nicely.
                */}
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
        </div>
    );
}
