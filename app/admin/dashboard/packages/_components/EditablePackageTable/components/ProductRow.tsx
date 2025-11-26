import { Button, InputNumber } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { ProductSelect } from './ProductSelect';
import { Product, EditablePartRow } from '../types';

interface ProductRowProps {
    item: EditablePartRow | null;
    category: { key: string; name: string };
    index: number;
    products: Product[];
    selectedProduct: Product | null;
    isFirstRow: boolean;
    canRemove: boolean;
    isMultiSelect: boolean;
    itemPrice: number;
    pricing: boolean;
    disabled: boolean;
    getProductPrice: (product: Product) => number;
    handlers: {
        onProductChange: (id: string, productId: number) => void;
        onQuantityChange: (id: string, quantity: number) => void;
        onCustomNameChange?: (id: string, name: string) => void;
        onCustomPriceChange?: (id: string, price: number) => void;
        onAddRow?: (category: string) => void;
        onRemoveRow?: (id: string) => void;
    };
}

export function ProductRow({
    item,
    category,
    index,
    products,
    selectedProduct,
    isFirstRow,
    canRemove,
    isMultiSelect,
    itemPrice,
    pricing,
    disabled,
    getProductPrice,
    handlers,
}: ProductRowProps) {
    const {
        onProductChange,
        onQuantityChange,
        onCustomNameChange,
        onCustomPriceChange,
        onAddRow,
        onRemoveRow,
    } = handlers;

    console.log('item', item, getProductPrice);
    return (
        <tr className="hover:bg-gray-50 transition-colors duration-150">
            {/* 类型列 */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    {isFirstRow ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {category.name}
                        </span>
                    ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            {category.name} #{index + 1}
                        </span>
                    )}
                </div>
            </td>

            {/* 产品名称列 */}
            <td className="px-4 py-3">
                <div className="flex items-center gap-2">
                    <ProductSelect
                        value={item?.product_id || 0}
                        onChange={(value) => item && onProductChange(item.id, value)}
                        options={products.map((product) => ({
                            value: product.id,
                            label: product.name,
                        }))}
                        placeholder={`选择${category.name}`}
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
                            {isFirstRow && onAddRow && (
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={() => onAddRow(category.key)}
                                    disabled={disabled}
                                    size="small"
                                    className="bg-green-500 hover:bg-green-600"
                                    title={`添加${category.name}`}
                                />
                            )}
                            {canRemove && onRemoveRow && item && (
                                <Button
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => onRemoveRow(item.id)}
                                    disabled={disabled}
                                    size="small"
                                    title={`删除此${category.name}`}
                                />
                            )}
                        </div>
                    )}
                </div>
            </td>

            {/* 数量列 */}
            <td className="px-4 py-3 text-center">
                <InputNumber
                    min={1}
                    value={item?.quantity || 1}
                    onChange={(value) => item && onQuantityChange(item.id, value || 1)}
                    disabled={disabled || (!item?.product_id && !item?.custom_name)}
                    className="w-16"
                    size="small"
                />
            </td>

            {/* 价格列 */}
            {pricing ? (
                <PriceCellSingle
                    item={item}
                    selectedProduct={selectedProduct}
                    disabled={disabled}
                    getProductPrice={getProductPrice}
                    onCustomPriceChange={onCustomPriceChange}
                />
            ) : (
                <PriceCellDual
                    item={item}
                    selectedProduct={selectedProduct}
                    disabled={disabled}
                    getProductPrice={getProductPrice}
                    onCustomPriceChange={onCustomPriceChange}
                />
            )}

            {/* 小计列 */}
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
}

// 单价格列 (溢价模式)
function PriceCellSingle({
    item,
    selectedProduct,
    disabled,
    getProductPrice,
    onCustomPriceChange,
}: {
    item: EditablePartRow | null;
    selectedProduct: Product | null;
    disabled: boolean;
    getProductPrice: (product: Product) => number;
    onCustomPriceChange?: (id: string, price: number) => void;
}) {
    return (
        <td className="px-4 py-3 text-right text-sm text-gray-700">
            {item?.product_id === 0 ? (
                <div className="flex items-center justify-end gap-1">
                    <span className="text-gray-600">¥</span>
                    <InputNumber
                        min={0}
                        step={0.01}
                        value={item?.custom_price || 0}
                        onChange={(value) => {
                            if (item && onCustomPriceChange) {
                                onCustomPriceChange(item.id, value || 0);
                            }
                        }}
                        placeholder="输入单价"
                        disabled={disabled}
                        className="w-24"
                        size="small"
                    />
                </div>
            ) : selectedProduct ? (
                Number(getProductPrice(selectedProduct)) === 0 ? (
                    <span className="text-amber-600 font-medium">暂无价格</span>
                ) : (
                    <span className="font-semibold text-gray-900">
                        ¥{getProductPrice(selectedProduct).toFixed(2)}
                    </span>
                )
            ) : (
                <span className="text-gray-400">-</span>
            )}
        </td>
    );
}

// 双价格列 (原价+售价模式)
function PriceCellDual({
    item,
    selectedProduct,
    disabled,
    getProductPrice,
    onCustomPriceChange,
}: {
    item: EditablePartRow | null;
    selectedProduct: Product | null;
    disabled: boolean;
    getProductPrice: (product: Product) => number;
    onCustomPriceChange?: (id: string, price: number) => void;
}) {
    return (
        <>
            <td className="px-4 py-3 text-right text-sm text-gray-700">
                {item?.product_id === 0 ? (
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
                    <div className="flex items-center justify-end gap-1">
                        <span className="text-gray-600">¥</span>
                        <InputNumber
                            min={0}
                            step={0.01}
                            value={item?.custom_price || 0}
                            onChange={(value) => {
                                if (item && onCustomPriceChange) {
                                    onCustomPriceChange(item.id, value || 0);
                                }
                            }}
                            placeholder="输入单价"
                            disabled={disabled}
                            className="w-24"
                            size="small"
                        />
                    </div>
                ) : selectedProduct ? (
                    <span className="font-bold text-green-600">
                        ¥{getProductPrice(selectedProduct).toFixed(2)}
                    </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
            </td>
        </>
    );
}
