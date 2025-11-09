'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PACKAGE_CATEGORIES } from '@/const';

export interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
}

export interface EditablePartRow {
    category: string;
    product_id: number;
    quantity: number;
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

interface EditablePackageTableProps {
    items: EditablePartRow[];
    onProductChange: (category: string, productId: number) => void;
    onQuantityChange: (category: string, quantity: number) => void;
    disabled?: boolean;
    pricing?: boolean; // true: 显示溢价后价格，false: 显示原价+售价两列
}

export default function EditablePackageTable({
    items,
    onProductChange,
    onQuantityChange,
    disabled = false,
    pricing = false,
}: EditablePackageTableProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [pricingConfig, setPricingConfig] = useState<PricingConfigData | null>(null);
    const [loading, setLoading] = useState(false);

    // 加载产品数据和溢价配置
    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                // 并行加载产品数据和溢价配置
                const [productsRes, pricingRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/pricing'),
                ]);

                const productsData = await productsRes.json();
                const pricingData = await pricingRes.json();

                if (productsData.success) {
                    setProducts(productsData.data);
                }

                // 溢价配置数据，将百分比转换为倍率（除以100再加1）
                if (pricingData) {
                    setPricingConfig({
                        unifiedPricing: pricingData.unifiedPricing,
                        unifiedRate: 1 + pricingData.unifiedRate / 100,
                        cpu: 1 + pricingData.cpu / 100,
                        motherboard: 1 + pricingData.motherboard / 100,
                        ram: 1 + pricingData.ram / 100,
                        gpu: 1 + pricingData.gpu / 100,
                        storage: 1 + pricingData.storage / 100,
                        psu: 1 + pricingData.psu / 100,
                        case: 1 + pricingData.case / 100,
                        cooling: 1 + pricingData.cooling / 100,
                    });
                }
            } catch (err) {
                console.error('加载数据失败:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    // 缓存分类后的产品
    const productsByCategory = useMemo(() => {
        const map: Record<string, Product[]> = {};
        PACKAGE_CATEGORIES.forEach((cat) => {
            map[cat.key] = products.filter((p) => p.category === cat.key);
        });
        return map;
    }, [products]);

    // 获取溢价率
    const getPricingRate = useCallback(
        (category: string): number => {
            if (!pricingConfig) return 1;

            // 统一溢价模式
            if (pricingConfig.unifiedPricing) {
                return pricingConfig.unifiedRate;
            }

            // 按类型溢价
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

    // 计算商品价格（含溢价）
    const getProductPrice = useCallback(
        (product: Product): number => {
            return product.price * getPricingRate(product.category);
        },
        [getPricingRate]
    );

    // 计算行项目小计
    const getItemPrice = useCallback(
        (item: EditablePartRow): number => {
            if (!item.product_id) return 0;
            const product = products.find((p) => p.id === item.product_id);
            return product ? getProductPrice(product) * item.quantity : 0;
        },
        [products, getProductPrice]
    );

    // 计算总价
    const totalPrice = useMemo(() => {
        return items.reduce((sum, item) => sum + getItemPrice(item), 0);
    }, [items, getItemPrice]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                <p className="text-gray-600 font-medium">加载产品数据中...</p>
            </div>
        );
    }

    return (
        <div className="overflow-x-auto">
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
                        {pricing ? (
                            // 溢价模式：只显示溢价后的单价
                            <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                单价
                            </th>
                        ) : (
                            // 原价+售价模式：显示原价和售价两列
                            <>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    原价
                                </th>
                                <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                                    售价
                                </th>
                            </>
                        )}
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            小计
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        const item = items.find((i) => i.category === cat.key);
                        const categoryProducts = productsByCategory[cat.key] || [];
                        const itemPrice = item ? getItemPrice(item) : 0;
                        const selectedProduct = item?.product_id
                            ? products.find((p) => p.id === item.product_id)
                            : null;

                        return (
                            <tr
                                key={cat.key}
                                className="hover:bg-gray-50 transition-colors duration-150"
                            >
                                <td className="px-4 py-3">
                                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {cat.name}
                                    </span>
                                </td>
                                <td className="px-4 py-3">
                                    <select
                                        className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={item?.product_id || 0}
                                        onChange={(e) =>
                                            onProductChange(cat.key, parseInt(e.target.value))
                                        }
                                        disabled={disabled}
                                    >
                                        <option value={0}>选择{cat.name}</option>
                                        {categoryProducts.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <input
                                        type="number"
                                        min="1"
                                        className="w-16 h-9 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={item?.quantity || 1}
                                        onChange={(e) =>
                                            onQuantityChange(cat.key, parseInt(e.target.value) || 1)
                                        }
                                        disabled={disabled || !item?.product_id}
                                    />
                                </td>
                                {pricing ? (
                                    // 溢价模式：只显示溢价后价格
                                    <td className="px-4 py-3 text-right text-sm text-gray-700">
                                        {selectedProduct ? (
                                            <span className="font-medium text-gray-900">
                                                ${getProductPrice(selectedProduct).toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                ) : (
                                    // 原价+售价模式：显示两列
                                    <>
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                                            {selectedProduct ? (
                                                <span className="font-medium text-gray-600">
                                                    ${selectedProduct.price.toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                                            {selectedProduct ? (
                                                <span className="font-semibold text-green-600">
                                                    ${getProductPrice(selectedProduct).toFixed(2)}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    </>
                                )}
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                    {itemPrice > 0 ? (
                                        <span className="inline-flex items-center px-3 py-1 rounded-md bg-green-50 text-green-700">
                                            ${itemPrice.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
                <tfoot>
                    <tr className="bg-gradient-to-r from-blue-50 to-purple-50 border-t-2 border-gray-200">
                        <td className="px-4 py-4" colSpan={pricing ? 4 : 5}>
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-5 h-5 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                                    />
                                </svg>
                                <span className="text-sm font-semibold text-gray-700">
                                    套餐总价
                                </span>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                            <div className="inline-flex items-center px-4 py-2 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                                <span className="text-xl font-bold">${totalPrice.toFixed(2)}</span>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
