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
    };

    /** 价格相关数据 */
    priceData: {
        itemPrice: number;
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
    const { categoryName, isFirst, canRemove, isMultiSelect, disabled, pricing } = config;
    const { itemPrice, getProductPrice } = priceData;
    const { onUpdate, onAddRow, onRemoveRow } = actions;

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

            {/* Pricing Columns */}
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
                        <span className="text-gray-500 text-sm font-medium bg-gray-50 px-2 py-1 rounded-md">
                            ¥{getProductPrice(selectedProduct).toFixed(2)}
                        </span>
                    ) : (
                        <span className="text-gray-200">-</span>
                    )}
                </td>
            )}

            {/* Subtotal - Bold & Highlighted */}
            <td className="px-6 py-4 align-middle text-right w-36 tabular-nums">
                {itemPrice > 0 ? (
                    <div className="inline-block px-3 py-1 bg-blue-50 text-blue-600 rounded-lg border border-blue-100 font-bold shadow-sm transform transition-transform group-hover:scale-105">
                        ¥{itemPrice.toFixed(2)}
                    </div>
                ) : (
                    <span className="text-gray-200">-</span>
                )}
            </td>
        </tr>
    );
};
