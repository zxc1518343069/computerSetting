'use client';
import React, { useState, useEffect, useCallback } from 'react';
import { packageCategoryDisplayNames } from '@/const';

export interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

interface PricingConfigData {
    unifiedPricing: boolean;
    unifiedRate: number;
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
}

interface PackageItemsTableProps {
    items: PackageItem[];
    className?: string;
    showPricing?: boolean; // 是否显示原价和售价
}

export default function PackageItemsTable({
    items,
    className = '',
    showPricing = true,
}: PackageItemsTableProps) {
    const [pricingConfig, setPricingConfig] = useState<PricingConfigData | null>(null);
    const [loading, setLoading] = useState(false);

    // 加载溢价配置
    useEffect(() => {
        if (showPricing) {
            loadPricingConfig();
        }
    }, [showPricing]);

    const loadPricingConfig = async () => {
        setLoading(true);
        try {
            const response = await fetch('/api/pricing');
            const data = await response.json();
            if (data) {
                setPricingConfig({
                    unifiedPricing: data.unifiedPricing,
                    unifiedRate: 1 + data.unifiedRate / 100,
                    cpu: 1 + data.cpu / 100,
                    motherboard: 1 + data.motherboard / 100,
                    ram: 1 + data.ram / 100,
                    gpu: 1 + data.gpu / 100,
                    storage: 1 + data.storage / 100,
                    psu: 1 + data.psu / 100,
                    case: 1 + data.case / 100,
                    cooling: 1 + data.cooling / 100,
                });
            }
        } catch (error) {
            console.error('加载溢价配置失败:', error);
        } finally {
            setLoading(false);
        }
    };

    // 获取溢价率
    const getPricingRate = useCallback(
        (category: string): number => {
            if (!pricingConfig) return 1;

            if (pricingConfig.unifiedPricing) {
                return pricingConfig.unifiedRate;
            }

            const rateMap: Record<string, number> = {
                cpu: pricingConfig.cpu,
                motherboard: pricingConfig.motherboard,
                ram: pricingConfig.ram,
                gpu: pricingConfig.gpu,
                storage: pricingConfig.storage,
                psu: pricingConfig.psu,
                case: pricingConfig.case,
                cooling: pricingConfig.cooling,
            };
            return rateMap[category] || 1;
        },
        [pricingConfig]
    );

    // 计算售价
    const getSalePrice = (item: PackageItem): number => {
        const rate = getPricingRate(item.product_category);
        return item.product_price * rate;
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }
    return (
        <div className={`overflow-x-auto ${className}`}>
            <table className="w-full">
                <thead>
                    <tr className="border-b-2 border-gray-200">
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            类型
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">
                            产品名称
                        </th>
                        <th className="px-4 py-3 text-center text-sm font-semibold text-gray-700">
                            数量
                        </th>
                        {showPricing ? (
                            <>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    原价
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    售价
                                </th>
                            </>
                        ) : (
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                单价
                            </th>
                        )}
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            小计
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {items && items.length > 0 ? (
                        items.map((item, index) => (
                            <tr
                                key={item.id || index}
                                className="hover:bg-gray-50 transition-colors duration-150"
                            >
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {packageCategoryDisplayNames[item.product_category] ||
                                            item.product_category}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">
                                    {item.product_name}
                                </td>
                                <td className="px-4 py-3 text-center text-sm text-gray-700">
                                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-gray-100 font-medium">
                                        {item.quantity}
                                    </span>
                                </td>
                                {showPricing ? (
                                    <>
                                        <td className="px-4 py-3 text-right text-sm text-gray-600">
                                            ${parseFloat(item.product_price.toString()).toFixed(2)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm font-semibold text-green-600">
                                            ${getSalePrice(item).toFixed(2)}
                                        </td>
                                    </>
                                ) : (
                                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                                        ${parseFloat(item.product_price.toString()).toFixed(2)}
                                    </td>
                                )}
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                    ${(getSalePrice(item) * item.quantity).toFixed(2)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td
                                colSpan={showPricing ? 6 : 5}
                                className="px-4 py-8 text-center text-gray-500"
                            >
                                暂无配件
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
