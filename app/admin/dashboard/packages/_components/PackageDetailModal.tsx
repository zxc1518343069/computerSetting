'use client';
import React, { useState, useEffect, useCallback } from 'react';
import PackageItemsTable, { PackageItem } from './PackageItemsTable';

interface PackageData {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}

interface PackageDetailModalProps {
    package: PackageData | null;
    isOpen: boolean;
    onClose: () => void;
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

export default function PackageDetailModal({
    package: pkg,
    isOpen,
    onClose,
}: PackageDetailModalProps) {
    const [pricingConfig, setPricingConfig] = useState<PricingConfigData | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadPricingConfig();
        }
    }, [isOpen]);

    const loadPricingConfig = async () => {
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
        }
    };

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

    const calculateTotalPrice = useCallback(() => {
        if (!pkg?.items) return 0;
        return pkg.items.reduce((total, item) => {
            const rate = getPricingRate(item.product_category);
            const salePrice = item.product_price * rate;
            return total + salePrice * item.quantity;
        }, 0);
    }, [pkg, getPricingRate]);

    if (!isOpen || !pkg) return null;

    const totalSalePrice = calculateTotalPrice();

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden animate-slideUp">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 px-6 py-4 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold">{pkg.name}</h2>
                            {pkg.description && (
                                <p className="text-blue-100 mt-1">{pkg.description}</p>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-all duration-200"
                        >
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Body */}
                <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
                    <PackageItemsTable items={pkg.items || []} />
                </div>

                {/* Footer */}
                <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
                    <div className="flex items-center justify-between">
                        <div className="text-sm text-gray-600">
                            共 {pkg.items?.length || 0} 个配件
                        </div>
                        <div className="text-right">
                            <div className="text-sm text-gray-600 mb-1">套餐售价</div>
                            <div className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                                ${totalSalePrice.toFixed(2)}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
