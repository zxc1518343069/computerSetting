'use client';
import EditablePackageTable from '@/app/admin/dashboard/packages/components/EditablePackageTable';
import { PACKAGE_CATEGORIES } from '@/const';
import React, { useImperativeHandle, useState, useMemo } from 'react';
import { Package, PackageItem } from '@/app/_components/PCPartsTable/PackageRecomment';
import { useTableControl } from './hooks/useTableControl';
import { InfoSection } from './components/InfoSection';
import { Button } from 'antd';
import { BuildOutlined, ExperimentOutlined } from '@ant-design/icons';
import { TestConfigModal } from './components/TestConfigModal';
import { ExportButton } from './components/ExportButton';
import { usePackageTableData } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageTableData';
import { usePackageCalculator } from '@/app/admin/dashboard/packages/components/EditablePackageTable/hooks/usePackageCalculator';

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

    const [testModalVisible, setTestModalVisible] = useState(false);

    // 获取产品和定价数据
    const { products, pricingConfig, loading } = usePackageTableData();
    const { getItemMetrics, totalPrice } = usePackageCalculator(products, pricingConfig, tableData);

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

    // 导出数据
    const exportData = useMemo(() => ({
        items: tableData,
        products,
        totalPrice,
        discountedPrice: discountedPrice > 0 ? discountedPrice : undefined,
        getItemMetrics,
    }), [tableData, products, totalPrice, discountedPrice, getItemMetrics]);

    // 是否有有效配置
    const hasValidItems = useMemo(() => {
        return tableData.some(item => item.product_id && item.product_id > 0);
    }, [tableData]);

    return (
        <div className="flex flex-col gap-6 h-full">
            {/* Header Area: 科技感标题与操作 */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 px-1">
                <div className="relative">
                    <div className="flex items-center gap-3 mb-1">
                        <div className="px-2 py-0.5 rounded-md bg-blue-50 text-[10px] font-bold text-blue-600 uppercase tracking-widest border border-blue-100">
                            Configuration
                        </div>
                        <div className="w-1 h-1 rounded-full bg-gray-300" />
                        <div className="text-[10px] font-medium text-gray-400 uppercase tracking-widest">
                            v2.0.4
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <BuildOutlined className="text-xl" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-gray-800 m-0 tracking-tight">
                                配置工坊
                            </h2>
                            <p className="text-xs text-gray-400 m-0 font-medium">
                                自定义您的专属电脑配置清单 · 实时价格计算
                            </p>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <ExportButton 
                        data={exportData} 
                        disabled={!hasValidItems || loading}
                    />
                    <Button
                        type="primary"
                        size="large"
                        icon={<ExperimentOutlined />}
                        onClick={() => setTestModalVisible(true)}
                        className="h-12 px-6 bg-gray-900 hover:bg-blue-600 border-none shadow-xl shadow-gray-200 hover:shadow-blue-200 rounded-2xl transition-all duration-300 font-bold text-sm"
                    >
                        测试配置
                    </Button>
                </div>
            </div>

            {/* Main Table Area */}
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
                onRowUpdate={handleTableDataChange}
                onAddRow={handleAddRow}
                onRemoveRow={handleRemoveRow}
                pricing={true}
                showProfit={false}
                showDiscountedPrice={true}
                discountedPrice={discountedPrice}
                onDiscountedPriceChange={setDiscountedPrice}
            />

            <InfoSection onReset={handleReset} />

            <TestConfigModal
                visible={testModalVisible}
                onClose={() => setTestModalVisible(false)}
                items={tableData}
            />
        </div>
    );
}
