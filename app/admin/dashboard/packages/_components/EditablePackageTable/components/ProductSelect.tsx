'use client';

import { PlusOutlined } from '@ant-design/icons';
import { Select, Input, Divider, Space, Button, InputRef } from 'antd';
import { useRef, useState } from 'react';

interface ProductOption {
    value: number;
    label: string;
}

interface ProductSelectProps {
    value: number;
    onChange: (value: number) => void;
    options: ProductOption[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    allowCustomInput?: boolean;
    customInputValue?: string;
    onCustomInputChange?: (value: string) => void;
}

export function ProductSelect({
    value,
    onChange,
    options,
    placeholder = '请选择',
    disabled = false,
    className = '',
    allowCustomInput = false,
    customInputValue = '',
    onCustomInputChange,
}: ProductSelectProps) {
    const [name, setName] = useState('');
    const [customOptions, setCustomOptions] = useState(options);
    const inputRef = useRef<InputRef>(null);

    const onNameChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        setName(event.target.value || '');
    };

    const addItem = (e: React.MouseEvent<HTMLButtonElement | HTMLAnchorElement>) => {
        e.preventDefault();
        onCustomInputChange?.(name);
        setCustomOptions([...customOptions, { label: name, value: 0 }]);
        setName('');
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };

    console.log('value', value);
    // 标准选择模式
    return (
        <div className={`flex items-center gap-2 ${className}`}>
            <Select
                value={value || undefined}
                onChange={onChange}
                maxCount={1}
                options={customOptions}
                allowClear
                placeholder={placeholder}
                disabled={disabled}
                showSearch
                filterOption={(input, option) =>
                    (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
                className="flex-1"
                size="middle"
                popupRender={(menu) => (
                    <>
                        {menu}
                        <Divider style={{ margin: '8px 0' }} />
                        <Space style={{ padding: '0 8px 4px' }}>
                            <Input
                                placeholder="Please enter item"
                                ref={inputRef}
                                value={name}
                                onChange={onNameChange}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                            <Button type="text" icon={<PlusOutlined />} onClick={addItem}>
                                添加
                            </Button>
                        </Space>
                    </>
                )}
            />
        </div>
    );
}
