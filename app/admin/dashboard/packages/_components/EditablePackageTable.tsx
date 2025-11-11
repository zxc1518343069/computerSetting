'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { PACKAGE_CATEGORIES } from '@/const';
import SearchableSelect from './SearchableSelect';

export interface Product {
    id: number;
    name: string;
    price: number;
    category: string;
}

export interface EditablePartRow {
    id: string; // 唯一标识符，用于支持同类别多行
    category: string;
    product_id: number;
    quantity: number;
    custom_name?: string; // 自定义产品名称（当 product_id 为 0 时使用）
    custom_price?: number; // 自定义产品单价（当 product_id 为 0 时使用）
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
    monitor: number;
}

interface EditablePackageTableProps {
    items: EditablePartRow[];
    onProductChange: (id: string, productId: number) => void;
    onQuantityChange: (id: string, quantity: number) => void;
    onAddRow?: (category: string) => void; // 添加新行
    onRemoveRow?: (id: string) => void; // 删除行
    onCustomNameChange?: (id: string, name: string) => void; // 自定义产品名称变化
    onCustomPriceChange?: (id: string, price: number) => void; // 自定义产品价格变化
    disabled?: boolean;
    pricing?: boolean; // true: 显示溢价后价格，false: 显示原价+售价两列

    showDiscountedPrice?: boolean; // 是否显示优惠后价格行
    discountedPrice?: number; // 优惠后价格
    onDiscountedPriceChange?: (price: number) => void; // 优惠后价格变化回调
}

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
    // 支持多选的类别
    const multiSelectCategories = ['ram', 'storage', 'cooling', 'monitor'];
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
                        monitor: 1 + pricingData.monitor / 100,
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
                monitor: pricingConfig.monitor,
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
            // 如果是自定义产品（product_id 为 0）
            if (item.product_id === 0 && item.custom_price !== undefined) {
                return item.custom_price * item.quantity;
            }
            // 如果是普通产品
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
                    <tr className="bg-gradient-to-r from-gray-50 to-gray-100 border-b-2 border-gray-300">
                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 text-blue-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                    />
                                </svg>
                                类型
                            </div>
                        </th>
                        <th className="px-4 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center gap-2">
                                <svg
                                    className="w-4 h-4 text-purple-600"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                                    />
                                </svg>
                                产品名称
                            </div>
                        </th>
                        <th className="px-4 py-4 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">
                            数量
                        </th>
                        {pricing ? (
                            // 溢价模式：只显示溢价后的单价
                            <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                单价
                            </th>
                        ) : (
                            // 原价+售价模式：显示原价和售价两列
                            <>
                                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    原价
                                </th>
                                <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                                    售价
                                </th>
                            </>
                        )}
                        <th className="px-4 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                            <div className="flex items-center justify-end gap-2">
                                <svg
                                    className="w-4 h-4 text-green-600"
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
                                小计
                            </div>
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        // 获取该类别的所有行
                        const categoryItems = items.filter((i) => i.category === cat.key);
                        const categoryProducts = productsByCategory[cat.key] || [];
                        const isMultiSelect = multiSelectCategories.includes(cat.key);

                        // 如果该类别没有行,创建一个空行
                        const rowsToRender = categoryItems.length > 0 ? categoryItems : [null];

                        return rowsToRender.map((item, index) => {
                            const itemPrice = item ? getItemPrice(item) : 0;
                            const selectedProduct = item?.product_id
                                ? products.find((p) => p.id === item.product_id)
                                : null;
                            const isFirstRow = index === 0;
                            const canRemove = isMultiSelect && categoryItems.length > 1;

                            return (
                                <tr
                                    key={item?.id || `${cat.key}-empty`}
                                    className="hover:bg-gray-50 transition-colors duration-150"
                                >
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            {isFirstRow && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    {cat.name}
                                                </span>
                                            )}
                                            {!isFirstRow && (
                                                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                                    {cat.name} #{index + 1}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3">
                                        <div className="flex items-center gap-2">
                                            <SearchableSelect
                                                value={item?.product_id || 0}
                                                onChange={(value) =>
                                                    item && onProductChange(item.id, value)
                                                }
                                                options={[
                                                    ...categoryProducts.map((product) => ({
                                                        value: product.id,
                                                        label: product.name,
                                                    })),
                                                ]}
                                                placeholder={`选择${cat.name}`}
                                                disabled={disabled}
                                                className="flex-1"
                                                allowCustomInput={true}
                                                customInputValue={item?.custom_name || ''}
                                                onCustomInputChange={(name) => {
                                                    if (item && onCustomNameChange) {
                                                        onCustomNameChange(item.id, name);
                                                    }
                                                }}
                                            />
                                            {/* 操作按钮 */}
                                            {isMultiSelect && (
                                                <div className="flex items-center gap-1">
                                                    {/* 添加按钮 - 只在第一行显示 */}
                                                    {isFirstRow && onAddRow && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onAddRow(cat.key)}
                                                            disabled={disabled}
                                                            className="p-1.5 rounded-lg bg-green-100 text-green-600 hover:bg-green-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={`添加${cat.name}`}
                                                        >
                                                            <svg
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {/* 删除按钮 - 在非第一行或有多行时显示 */}
                                                    {canRemove && onRemoveRow && item && (
                                                        <button
                                                            type="button"
                                                            onClick={() => onRemoveRow(item.id)}
                                                            disabled={disabled}
                                                            className="p-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                            title={`删除此${cat.name}`}
                                                        >
                                                            <svg
                                                                className="w-4 h-4"
                                                                fill="none"
                                                                stroke="currentColor"
                                                                viewBox="0 0 24 24"
                                                            >
                                                                <path
                                                                    strokeLinecap="round"
                                                                    strokeLinejoin="round"
                                                                    strokeWidth={2}
                                                                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-3 text-center">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-16 h-9 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item?.quantity || 1}
                                            onChange={(e) =>
                                                item &&
                                                onQuantityChange(
                                                    item.id,
                                                    parseInt(e.target.value) || 1
                                                )
                                            }
                                            disabled={
                                                disabled ||
                                                (!item?.product_id && !item?.custom_name)
                                            }
                                        />
                                    </td>
                                    {pricing ? (
                                        // 溢价模式：只显示溢价后价格
                                        <td className="px-4 py-3 text-right text-sm text-gray-700">
                                            {item?.product_id === 0 ? (
                                                // 自定义产品：显示可编辑的价格输入框
                                                <div className="flex items-center justify-end gap-1">
                                                    <span className="text-gray-600">¥</span>
                                                    <input
                                                        type="number"
                                                        min="0"
                                                        step="0.01"
                                                        className="w-24 h-9 text-right text-sm font-medium text-gray-900 border border-green-300 rounded-lg bg-green-50 hover:border-green-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={item?.custom_price || 0}
                                                        onChange={(e) => {
                                                            if (item && onCustomPriceChange) {
                                                                onCustomPriceChange(
                                                                    item.id,
                                                                    parseFloat(e.target.value) || 0
                                                                );
                                                            }
                                                        }}
                                                        placeholder="输入单价"
                                                        disabled={disabled}
                                                    />
                                                </div>
                                            ) : selectedProduct ? (
                                                Number(getProductPrice(selectedProduct)) === 0 ? (
                                                    <span className="text-amber-600 font-medium">
                                                        暂无价格
                                                    </span>
                                                ) : (
                                                    <span className="font-semibold text-gray-900">
                                                        ¥
                                                        {getProductPrice(selectedProduct).toFixed(
                                                            2
                                                        )}
                                                    </span>
                                                )
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                    ) : (
                                        // 原价+售价模式：显示两列
                                        <>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                {item?.product_id === 0 ? (
                                                    // 自定义产品：原价列显示 "-"
                                                    <span className="text-gray-400">-</span>
                                                ) : selectedProduct ? (
                                                    <span className="font-medium text-gray-600 line-through">
                                                        ¥{selectedProduct.price.toFixed(2)}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-right text-sm text-gray-700">
                                                {item?.product_id === 0 ? (
                                                    // 自定义产品：显示可编辑的价格输入框
                                                    <div className="flex items-center justify-end gap-1">
                                                        <span className="text-gray-600">¥</span>
                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-24 h-9 text-right text-sm font-medium text-gray-900 border border-green-300 rounded-lg bg-green-50 hover:border-green-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                                            value={item?.custom_price || 0}
                                                            onChange={(e) => {
                                                                if (item && onCustomPriceChange) {
                                                                    onCustomPriceChange(
                                                                        item.id,
                                                                        parseFloat(
                                                                            e.target.value
                                                                        ) || 0
                                                                    );
                                                                }
                                                            }}
                                                            placeholder="输入单价"
                                                            disabled={disabled}
                                                        />
                                                    </div>
                                                ) : selectedProduct ? (
                                                    <span className="font-bold text-green-600">
                                                        ¥
                                                        {getProductPrice(selectedProduct).toFixed(
                                                            2
                                                        )}
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">-</span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                    <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                        {itemPrice > 0 ? (
                                            <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 font-semibold border border-green-200">
                                                ¥{itemPrice.toFixed(2)}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        });
                    }).flat()}

                    {/* 其他项目行 */}
                    <tr className="hover:bg-amber-50 transition-colors duration-150 border-t-2 border-amber-200">
                        <td className="px-4 py-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                                    />
                                </svg>
                                其他
                            </span>
                        </td>
                        <td className="px-4 py-3" colSpan={pricing ? 4 : 5}>
                            <input
                                type="text"
                                placeholder="输入其他配件或服务（如：装机服务费、延保等）"
                                className="w-full px-3 py-2 text-sm border border-amber-300 rounded-lg bg-white hover:border-amber-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                disabled={disabled}
                            />
                        </td>
                    </tr>

                    {/* 赠品行 */}
                    <tr className="hover:bg-pink-50 transition-colors duration-150">
                        <td className="px-4 py-3">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-pink-100 text-pink-800">
                                <svg
                                    className="w-3 h-3 mr-1"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-5.5-2.5l7.51-3.49L17.5 6.5 9.99 9.99 6.5 17.5zm5.5-6.6c.61 0 1.1.49 1.1 1.1s-.49 1.1-1.1 1.1-1.1-.49-1.1-1.1.49-1.1 1.1-1.1z" />
                                </svg>
                                赠品
                            </span>
                        </td>
                        <td className="px-4 py-3" colSpan={pricing ? 4 : 5}>
                            <div className="flex items-center gap-2">
                                <input
                                    type="text"
                                    placeholder="输入赠品信息（如：鼠标垫、清洁套装、游戏激活码等）"
                                    className="flex-1 px-3 py-2 text-sm border border-pink-300 rounded-lg bg-white hover:border-pink-400 focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all placeholder:text-gray-400"
                                    disabled={disabled}
                                />
                                <span className="inline-flex items-center px-2 py-1 rounded-md bg-pink-100 text-pink-700 text-xs font-medium whitespace-nowrap">
                                    免费
                                </span>
                            </div>
                        </td>
                    </tr>
                </tbody>
                <tfoot>
                    {/* 自动计算总价行 */}
                    <tr className="bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 border-t-4 border-indigo-200">
                        <td className="px-4 py-4" colSpan={pricing ? 4 : 5}>
                            <div className="flex items-center gap-3">
                                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg">
                                    <svg
                                        className="w-5 h-5 text-white"
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
                                </div>
                                <div>
                                    <p className="text-xs text-gray-600 mb-0.5">配置</p>
                                    <p className="text-base font-bold text-gray-800">总价</p>
                                </div>
                            </div>
                        </td>
                        <td className="px-4 py-4 text-right">
                            <div className="inline-flex flex-col items-end gap-1">
                                <div
                                    className={`inline-flex items-baseline px-5 py-2.5 rounded-xl ${
                                        discountedPrice && discountedPrice > 0
                                            ? 'bg-gray-400 text-white'
                                            : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white shadow-lg hover:shadow-xl'
                                    } transition-all`}
                                >
                                    <span className="text-sm font-medium mr-1">¥</span>
                                    <span
                                        className={`text-2xl font-bold tracking-tight ${
                                            discountedPrice && discountedPrice > 0
                                                ? 'line-through'
                                                : ''
                                        }`}
                                    >
                                        {totalPrice.toFixed(2)}
                                    </span>
                                </div>
                                {discountedPrice && discountedPrice > 0 && (
                                    <span className="text-xs text-gray-500 font-medium">原价</span>
                                )}
                            </div>
                        </td>
                    </tr>

                    {/* 优惠后价格行 */}
                    {showDiscountedPrice && (
                        <tr className="bg-gradient-to-r from-green-50 via-emerald-50 to-teal-50 border-t-2 border-green-200">
                            <td className="px-4 py-4" colSpan={pricing ? 4 : 5}>
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 shadow-lg">
                                        <svg
                                            className="w-5 h-5 text-white"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <div>
                                        <p className="text-xs text-gray-600 mb-0.5">优惠</p>
                                        <p className="text-base font-bold text-gray-800">
                                            实付价格
                                        </p>
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-4 text-right">
                                <div className="inline-flex flex-col items-end gap-2">
                                    {/* 优惠后价格输入框 */}
                                    <div className="flex items-center gap-2">
                                        <span className="text-sm font-medium text-gray-600">¥</span>
                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            value={discountedPrice || ''}
                                            onChange={(e) => {
                                                const value = parseFloat(e.target.value) || 0;
                                                onDiscountedPriceChange?.(value);
                                            }}
                                            placeholder="输入优惠价"
                                            disabled={disabled}
                                            className="w-40 px-4 py-2.5 text-right text-xl font-bold text-green-700 border-2 border-green-300 rounded-xl bg-white hover:border-green-400 focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed placeholder:text-gray-400 placeholder:text-base placeholder:font-normal"
                                        />
                                    </div>
                                    {!!discountedPrice && discountedPrice > 0 && totalPrice > 0 && (
                                        <div className="flex items-center gap-2 text-xs">
                                            <span className="px-2 py-1 rounded-full bg-red-100 text-red-600 font-semibold">
                                                优惠 ¥{(totalPrice - discountedPrice).toFixed(2)}
                                            </span>
                                            <span className="px-2 py-1 rounded-full bg-green-100 text-green-600 font-semibold">
                                                {((1 - discountedPrice / totalPrice) * 100).toFixed(
                                                    1
                                                )}
                                                % OFF
                                            </span>
                                        </div>
                                    )}
                                    {(!discountedPrice || discountedPrice === 0) && (
                                        <span className="text-xs text-gray-500">
                                            可选：输入优惠后价格
                                        </span>
                                    )}
                                </div>
                            </td>
                        </tr>
                    )}
                </tfoot>
            </table>
        </div>
    );
}
