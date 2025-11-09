'use client';

import React from 'react';
import { ProductWithCategory, PACKAGE_CATEGORIES } from '@/const';

export type Product = ProductWithCategory;

export interface EditablePartRow {
    category: string;
    product_id: number;
    quantity: number;
}

interface EditablePackageTableProps {
    items: EditablePartRow[];
    products: Product[];
    onProductChange: (category: string, productId: number) => void;
    onQuantityChange: (category: string, quantity: number) => void;
    getTotalPrice: () => number;
}

export default function EditablePackageTable({
    items,
    products,
    onProductChange,
    onQuantityChange,
    getTotalPrice,
}: EditablePackageTableProps) {
    const getProductsByCategory = (category: string) => {
        return products.filter((p) => p.category === category);
    };

    const getItemPrice = (item: EditablePartRow) => {
        if (item.product_id === 0) return 0;
        const product = products.find((p) => p.id === item.product_id);
        return product ? product.price * item.quantity : 0;
    };

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
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            单价
                        </th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            小计
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {PACKAGE_CATEGORIES.map((cat) => {
                        const item = items.find((i) => i.category === cat.key);
                        const categoryProducts = getProductsByCategory(cat.key);
                        const itemPrice = item ? getItemPrice(item) : 0;
                        const selectedProduct =
                            item && item.product_id > 0
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
                                        className="w-full px-3 py-2 text-sm text-gray-900 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all cursor-pointer"
                                        value={item?.product_id || 0}
                                        onChange={(e) =>
                                            onProductChange(cat.key, parseInt(e.target.value))
                                        }
                                    >
                                        <option value={0}>选择{cat.name}</option>
                                        {categoryProducts.map((product) => (
                                            <option key={product.id} value={product.id}>
                                                {product.name} (${product.price.toFixed(2)})
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex items-center justify-center">
                                        <input
                                            type="number"
                                            min="1"
                                            className="w-16 h-9 text-center text-sm font-medium text-gray-900 border border-gray-300 rounded-lg bg-white hover:border-blue-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                                            value={item?.quantity || 1}
                                            onChange={(e) =>
                                                onQuantityChange(
                                                    cat.key,
                                                    parseInt(e.target.value) || 1
                                                )
                                            }
                                            disabled={!item?.product_id || item.product_id === 0}
                                        />
                                    </div>
                                </td>
                                <td className="px-4 py-3 text-right text-sm text-gray-700">
                                    {selectedProduct ? (
                                        <span className="font-medium">
                                            ${selectedProduct.price.toFixed(2)}
                                        </span>
                                    ) : (
                                        <span className="text-gray-400">-</span>
                                    )}
                                </td>
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
                        <td className="px-4 py-4" colSpan={4}>
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
                                <span className="text-xl font-bold">
                                    ${getTotalPrice().toFixed(2)}
                                </span>
                            </div>
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
}
