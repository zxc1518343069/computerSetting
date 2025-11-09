'use client';
import React from 'react';
import { packageCategoryDisplayNames } from '@/const';

export interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

interface PackageItemsTableProps {
    items: PackageItem[];
    className?: string;
}

export default function PackageItemsTable({ items, className = '' }: PackageItemsTableProps) {
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
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">
                            单价
                        </th>
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
                                <td className="px-4 py-3 text-right text-sm text-gray-700">
                                    ${parseFloat(item.product_price.toString()).toFixed(2)}
                                </td>
                                <td className="px-4 py-3 text-right text-sm font-medium text-gray-900">
                                    $
                                    {(
                                        parseFloat(item.product_price.toString()) * item.quantity
                                    ).toFixed(2)}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                暂无配件
                            </td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    );
}
