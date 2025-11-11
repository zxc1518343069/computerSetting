'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';

interface Option {
    value: number;
    label: string;
}

interface SearchableSelectProps {
    value: number;
    onChange: (value: number) => void;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    className?: string;
    allowCustomInput?: boolean; // 是否允许自定义输入
    customInputValue?: string; // 自定义输入的值
    onCustomInputChange?: (value: string) => void; // 自定义输入变化回调
}

export default function SearchableSelect({
    value,
    onChange,
    options,
    placeholder = '请选择',
    disabled = false,
    className = '',
    allowCustomInput = false,
    customInputValue = '',
    onCustomInputChange,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // 过滤选项（模糊搜索）
    const filteredOptions = useMemo(() => {
        if (!searchQuery.trim()) return options;
        const query = searchQuery.toLowerCase();
        return options.filter((option) => option.label.toLowerCase().includes(query));
    }, [options, searchQuery]);

    // 选中的选项
    const selectedOption = options.find((opt) => opt.value === value);

    // 点击外部关闭下拉框
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // 当下拉框打开时，自动滚动到选中项
    useEffect(() => {
        if (isOpen && dropdownRef.current && selectedOption) {
            const selectedIndex = filteredOptions.findIndex((opt) => opt.value === value);
            if (selectedIndex !== -1) {
                setHighlightedIndex(selectedIndex);
                const optionElement = dropdownRef.current.children[selectedIndex] as HTMLElement;
                if (optionElement) {
                    optionElement.scrollIntoView({ block: 'nearest' });
                }
            }
        }
    }, [isOpen, selectedOption, value, filteredOptions]);

    // 键盘导航
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;

        switch (e.key) {
            case 'Enter':
                e.preventDefault();
                if (isOpen && highlightedIndex >= 0) {
                    handleSelect(filteredOptions[highlightedIndex].value);
                } else if (isOpen && allowCustomInput && searchQuery.trim()) {
                    // 如果允许自定义输入且有输入内容，确认自定义输入
                    handleCustomInput();
                } else {
                    setIsOpen(true);
                }
                break;
            case 'ArrowDown':
                e.preventDefault();
                if (!isOpen) {
                    setIsOpen(true);
                } else {
                    setHighlightedIndex((prev) =>
                        prev < filteredOptions.length - 1 ? prev + 1 : prev
                    );
                }
                break;
            case 'ArrowUp':
                e.preventDefault();
                if (isOpen) {
                    setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
                }
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSearchQuery('');
                break;
            case 'Tab':
                setIsOpen(false);
                setSearchQuery('');
                break;
        }
    };

    // 自动滚动到高亮项
    useEffect(() => {
        if (highlightedIndex >= 0 && dropdownRef.current) {
            const optionElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
            if (optionElement) {
                optionElement.scrollIntoView({ block: 'nearest' });
            }
        }
    }, [highlightedIndex]);

    const handleSelect = (optionValue: number) => {
        onChange(optionValue);
        setIsOpen(false);
        setSearchQuery('');
        setHighlightedIndex(-1);
    };

    const handleCustomInput = () => {
        if (onCustomInputChange && searchQuery.trim()) {
            const customValue = searchQuery.trim();
            onCustomInputChange(customValue);
            onChange(0); // 使用 0 表示自定义输入
            setIsOpen(false);
            setTimeout(() => setSearchQuery(''), 0); // 延迟清空，确保状态更新完成
            setHighlightedIndex(-1);
        }
    };

    const handleToggle = () => {
        if (disabled) return;
        if (!isOpen) {
            setIsOpen(true);
            // 延迟聚焦，确保输入框已渲染
            setTimeout(() => inputRef.current?.focus(), 0);
        } else {
            setIsOpen(false);
            setSearchQuery('');
        }
    };

    return (
        <div ref={containerRef} className={`relative ${className}`} onKeyDown={handleKeyDown}>
            {/* 选择框主体 */}
            <div
                className={`
                    w-full px-3 py-2 text-sm text-gray-900 border rounded-lg bg-white
                    transition-all cursor-pointer
                    ${
                        disabled
                            ? 'bg-gray-100 cursor-not-allowed opacity-50'
                            : 'hover:border-blue-400'
                    }
                    ${isOpen ? 'border-blue-500 ring-2 ring-blue-500' : 'border-gray-300'}
                `}
                onClick={handleToggle}
            >
                <div className="flex items-center justify-between">
                    {isOpen ? (
                        <input
                            ref={inputRef}
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setHighlightedIndex(0);
                            }}
                            placeholder={selectedOption?.label || customInputValue || placeholder}
                            className="flex-1 outline-none bg-transparent"
                            onClick={(e) => e.stopPropagation()}
                            disabled={disabled}
                        />
                    ) : (
                        <span className={selectedOption || customInputValue ? 'text-gray-900' : 'text-gray-400'}>
                            {selectedOption?.label || customInputValue || placeholder}
                        </span>
                    )}
                    {/* 下拉箭头 */}
                    <svg
                        className={`w-4 h-4 text-gray-400 transition-transform ${
                            isOpen ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 9l-7 7-7-7"
                        />
                    </svg>
                </div>
            </div>

            {/* 下拉菜单 */}
            {isOpen && (
                <div
                    ref={dropdownRef}
                    className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-auto"
                >
                    {filteredOptions.length > 0 ? (
                        <>
                            {filteredOptions.map((option, index) => (
                                <div
                                    key={option.value}
                                    className={`
                                        px-3 py-2 text-sm cursor-pointer transition-colors
                                        ${
                                            option.value === value
                                                ? 'bg-blue-50 text-blue-600 font-medium'
                                                : 'text-gray-700'
                                        }
                                        ${
                                            index === highlightedIndex
                                                ? 'bg-gray-100'
                                                : 'hover:bg-gray-50'
                                        }
                                    `}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelect(option.value);
                                    }}
                                    onMouseEnter={() => setHighlightedIndex(index)}
                                >
                                    <div className="flex items-center justify-between">
                                        <span>{option.label}</span>
                                        {option.value === value && (
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
                                                    d="M5 13l4 4L19 7"
                                                />
                                            </svg>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {allowCustomInput && searchQuery.trim() && !filteredOptions.some(opt => opt.label.toLowerCase() === searchQuery.toLowerCase()) && (
                                <div
                                    className="px-3 py-2 text-sm cursor-pointer transition-colors bg-green-50 hover:bg-green-100 border-t border-gray-200"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleCustomInput();
                                    }}
                                >
                                    <div className="flex items-center gap-2">
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
                                                d="M12 4v16m8-8H4"
                                            />
                                        </svg>
                                        <span className="text-green-700 font-medium">
                                            使用自定义: &quot;{searchQuery}&quot;
                                        </span>
                                    </div>
                                </div>
                            )}
                        </>
                    ) : allowCustomInput && searchQuery.trim() ? (
                        <div
                            className="px-3 py-3 text-sm cursor-pointer transition-colors hover:bg-green-50"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleCustomInput();
                            }}
                        >
                            <div className="flex items-center gap-2 justify-center text-green-600">
                                <svg
                                    className="w-5 h-5"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 4v16m8-8H4"
                                    />
                                </svg>
                                <span className="font-medium">
                                    添加自定义产品: &quot;{searchQuery}&quot;
                                </span>
                            </div>
                        </div>
                    ) : (
                        <div className="px-3 py-8 text-sm text-center text-gray-400">
                            <svg
                                className="w-12 h-12 mx-auto mb-2 text-gray-300"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            <p>无匹配结果</p>
                            {allowCustomInput && (
                                <p className="text-xs mt-1 text-gray-500">输入后按回车创建自定义产品</p>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
