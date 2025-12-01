import { EditablePartRow, Product } from '@/app/admin/dashboard/packages/types';
import React from 'react';
import { Button, InputNumber, Tooltip } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProductSelect } from './ProductSelect';
import { CATEGORY_CONFIG } from '@/const';

interface ProductRowProps {
    item: EditablePartRow;
    products: Product[];

    /** 行状态配置 */
    config: {
        categoryName: string;
        isFirst: boolean;
        canRemove: boolean;
        isMultiSelect: boolean;
        disabled: boolean;
        pricing: boolean;
        showProfit?: boolean;
    };

    /** 价格相关数据 */
    priceData: {
        getItemMetrics: (item: EditablePartRow) => {
            unitCost: number;
            unitSellPrice: number;
            totalCost: number;
            totalSellPrice: number;
            totalProfit: number;
            profitRate: number;
        };
        getProductPrice: (p: Product) => number;
    };

    /** 操作回调 */
    actions: {
        onUpdate: (id: string, changes: Partial<EditablePartRow>) => void;
        onAddRow?: (category: string) => void;
        onRemoveRow?: (id: string) => void;
    };
}

export const ProductRow: React.FC<ProductRowProps> = ({
    item,
    products,
    config,
    priceData,
    actions,
}) => {
    const { categoryName, isFirst, canRemove, isMultiSelect, disabled, pricing, showProfit } =
        config;
    const { getItemMetrics } = priceData;
    const { onUpdate, onAddRow, onRemoveRow } = actions;

    const metrics = getItemMetrics(item);
    const selectedProduct = products.find((p) => p.id === item.product_id);

    const options = products.map((p) => ({
        value: p.id,
        label: p.name,
        price: p.price,
    }));

    const categoryColor = CATEGORY_CONFIG[item.category]?.solidColor || 'bg-gray-400';

    return (
        <tr className="group hover:bg-blue-50/20 transition-all duration-300 ease-in-out hover:scale-[1.002] hover:shadow-sm relative">
            {/* Category Label - Minimalist Indicator */}
            <td className="px-6 py-4 align-middle w-32 relative">
                {isFirst && (
                    <div className="flex items-center gap-3">
                        <div
                            className={`w-1.5 h-8 rounded-full ${categoryColor} shadow-sm ring-2 ring-white`}
                        ></div>
                        <span className="text-sm font-bold text-gray-700 tracking-wide whitespace-nowrap">
                            {categoryName}
                        </span>
                    </div>
                )}
            </td>

            {/* Product Select */}
            <td className="px-6 py-4 align-middle">
                <div className="flex items-center gap-3">
                    {/* Visual dot for sub-items */}
                    {!isFirst && (
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-300 ml-0.5"></div>
                    )}

                    <div className="flex-1 relative">
                        <ProductSelect
                            value={item.product_id}
                            onChange={(val) => onUpdate(item.id, { product_id: val })}
                            options={options}
                            disabled={disabled}
                            placeholder={isFirst ? `请选择${categoryName}...` : '添加更多...'}
                            allowCustomInput
                            customInputValue={item.custom_name}
                            onCustomInputChange={(val) => onUpdate(item.id, { custom_name: val })}
                        />
                    </div>

                    {/* Actions (Add/Remove) - Always Visible */}
                    {!disabled && (
                        <div className="flex items-center w-16 justify-end gap-1">
                            {isMultiSelect && isFirst && onAddRow && (
                                <Tooltip title="添加">
                                    <Button
                                        type="dashed"
                                        size="small"
                                        icon={<PlusOutlined className="text-blue-500" />}
                                        onClick={() => onAddRow(item.category)}
                                        className="flex items-center justify-center w-7 h-7 rounded-full border-blue-200 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 transition-all"
                                    />
                                </Tooltip>
                            )}
                            {canRemove && onRemoveRow && (
                                <Tooltip title="移除">
                                    <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<DeleteOutlined />}
                                        onClick={() => onRemoveRow(item.id)}
                                        className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-red-50 transition-all opacity-60 hover:opacity-100"
                                    />
                                </Tooltip>
                            )}
                        </div>
                    )}
                </div>
            </td>

            {/* Quantity */}
            <td className="px-6 py-4 align-middle text-center w-28">
                <InputNumber
                    min={1}
                    max={99}
                    value={item.quantity}
                    onChange={(val) => onUpdate(item.id, { quantity: val || 1 })}
                    disabled={disabled || (!item.product_id && !item.custom_name)}
                    className={`w-full text-center font-medium rounded-lg transition-all ${
                        item.quantity > 1
                            ? 'border-blue-200 bg-blue-50 text-blue-600 shadow-inner'
                            : 'border-gray-200 hover:border-blue-300'
                    }`}
                />
            </td>

            {/* Pricing Columns (Unit Price) */}
            {pricing && (
                <td className="px-6 py-4 align-middle text-right w-36 tabular-nums">
                    {item.product_id === 0 ? (
                        <InputNumber
                            min={0}
                            step={0.01}
                            placeholder="0.00"
                            value={item.custom_price}
                            onChange={(val) => onUpdate(item.id, { custom_price: val || 0 })}
                            disabled={disabled}
                            className="w-full text-right rounded-lg border-gray-200 hover:border-blue-300 focus:border-blue-500"
                            size="small"
                            formatter={(value) => `¥ ${value}`}
                        />
                    ) : selectedProduct ? (
                        <div className="flex flex-col items-end">
                            <span className="text-gray-700 text-sm font-medium">
                                ¥{metrics.unitSellPrice.toFixed(2)}
                            </span>
                            {showProfit && (
                                <span className="text-[10px] text-gray-400 scale-90 origin-right">
                                    进: ¥{metrics.unitCost.toFixed(2)}
                                </span>
                            )}
                        </div>
                    ) : (
                        <span className="text-gray-200">-</span>
                    )}
                </td>
            )}

            {/* Subtotal & Profit */}
            <td className="px-6 py-4 align-middle text-right w-36 tabular-nums">
                {metrics.totalSellPrice > 0 ? (
                    <div className="flex flex-col items-end">
                        <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 font-bold shadow-sm transform transition-transform group-hover:scale-105 mb-1">
                            ¥{metrics.totalSellPrice.toFixed(2)}
                        </div>
                        {/* Profit Indicator */}
                        {showProfit && (
                            <div
                                className={`text-[10px] font-medium flex items-center gap-1 ${metrics.totalProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                            >
                                <span>利: ¥{metrics.totalProfit.toFixed(0)}</span>
                                <span
                                    className={`px-1 rounded-sm ${metrics.profitRate > 0.15 ? 'bg-emerald-100 text-emerald-700' : metrics.profitRate > 0.05 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}
                                >
                                    {(metrics.profitRate * 100).toFixed(0)}%
                                </span>
                            </div>
                        )}
                    </div>
                ) : (
                    <span className="text-gray-200">-</span>
                )}
            </td>
        </tr>
    );
};
