import React from 'react';
import { Select, Input, Button, Divider, Space, InputRef } from 'antd';
import { PlusOutlined } from '@ant-design/icons';

interface ProductSelectProps {
    value?: number;
    onChange: (value: number) => void;
    options: { value: number; label: string; price?: number }[];
    placeholder?: string;
    disabled?: boolean;
    allowCustomInput?: boolean;
    customInputValue?: string;
    onCustomInputChange?: (value: string) => void;
}

export const ProductSelect: React.FC<ProductSelectProps> = ({
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

    // Handle selection change
    const handleChange = (val: number | string) => {
        if (typeof val === 'number') {
            onChange(val);
        } else {
            // It's a custom input (if Select supports tags mode, but we are using custom dropdown)
            // Actually, with standard Select, the value is usually key.
            // Here we treat value=0 as custom.
        }
    };

    const handleAddItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
        e.preventDefault();
        if (name.trim()) {
            onCustomInputChange?.(name);
            // Reset to custom mode
            onChange(0);
            setName('');
        }
    };

    return (
        <Select
            value={displayValue}
            onChange={handleChange}
            options={options}
            placeholder={placeholder}
            disabled={disabled}
            showSearch
            variant="outlined"
            filterOption={(input, option) =>
                (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
            }
            className="w-full"
            dropdownRender={(menu) => (
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
            // If value is string (custom name), we need to handle it visually if it's not in options
            // But `value` prop is `number`. `displayValue` can be string.
            // Antd Select `value` accepts string | number.
            // If customInputValue is present and value is 0, we show the text.
        />
    );
};
