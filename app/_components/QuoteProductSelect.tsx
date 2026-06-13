'use client';

import { CheckCircleFilled, CloseCircleFilled, PlusOutlined } from '@ant-design/icons';
import { Button, Divider, Input, InputRef, Select, Space } from 'antd';
import React from 'react';

export interface QuoteProductOption {
    value: number;
    label: string;
    barcode?: string | null;
    price?: number;
    stock_quantity?: number;
}

interface QuoteProductSelectProps {
    value?: number;
    onChange: (value: number) => void;
    options: QuoteProductOption[];
    placeholder?: string;
    disabled?: boolean;
    allowCustomInput?: boolean;
    customInputValue?: string;
    onCustomInputChange?: (value: string) => void;
}

export const QuoteProductSelect: React.FC<QuoteProductSelectProps> = ({
    value,
    onChange,
    options,
    placeholder,
    disabled,
    allowCustomInput,
    customInputValue,
    onCustomInputChange,
}) => {
    const [name, setName] = React.useState('');
    const inputRef = React.useRef<InputRef>(null);

    const displayValue =
        value && value > 0 ? value : customInputValue ? customInputValue : undefined;

    const optionMap = React.useMemo(
        () => new Map(options.map((option) => [option.value, option])),
        [options]
    );

    const renderInventoryIcon = (stock?: number) => {
        const hasStock = Number(stock || 0) > 0;
        return hasStock ? (
            <CheckCircleFilled className="text-emerald-500 text-xs" />
        ) : (
            <CloseCircleFilled className="text-rose-500 text-xs" />
        );
    };

    const handleChange = (val: number | string) => {
        if (typeof val === 'number') {
            onChange(val);
        }
    };

    const handleAddItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
        e.preventDefault();
        if (name.trim()) {
            onCustomInputChange?.(name.trim());
            onChange(0);
            setName('');
        }
    };

    return (
        <Select
            value={displayValue}
            onChange={handleChange}
            options={options.map((option) => ({
                ...option,
                label: (
                    <div className="flex items-center gap-2">
                        {renderInventoryIcon(option.stock_quantity)}
                        <div className="min-w-0">
                            <div className="truncate">{option.label}</div>
                            {option.barcode && (
                                <div className="font-mono text-[11px] text-gray-400">
                                    条形码 {option.barcode}
                                </div>
                            )}
                        </div>
                    </div>
                ),
            }))}
            placeholder={placeholder}
            disabled={disabled}
            showSearch
            variant="outlined"
            filterOption={(input, option) => {
                const selectedOption = optionMap.get(option?.value as number);
                const keyword = input.toLowerCase();
                return (
                    String(selectedOption?.label || '')
                        .toLowerCase()
                        .includes(keyword) ||
                    String(selectedOption?.barcode || '')
                        .toLowerCase()
                        .includes(keyword)
                );
            }}
            labelRender={(props) => {
                const option = optionMap.get(props.value as number);
                if (!option) return props.label;
                return (
                    <div className="flex items-center gap-2">
                        {renderInventoryIcon(option.stock_quantity)}
                        <span>{option.label}</span>
                    </div>
                );
            }}
            className="w-full"
            popupRender={(menu) => (
                <>
                    {menu}
                    {allowCustomInput && (
                        <>
                            <Divider style={{ margin: '8px 0' }} />
                            <Space style={{ padding: '0 8px 4px' }}>
                                <Input
                                    placeholder="输入自定义名称"
                                    ref={inputRef}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    onKeyDown={(e) => e.stopPropagation()}
                                />
                                <Button type="text" icon={<PlusOutlined />} onClick={handleAddItem}>
                                    添加
                                </Button>
                            </Space>
                        </>
                    )}
                </>
            )}
        />
    );
};

export default QuoteProductSelect;
