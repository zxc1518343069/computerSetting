import { PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import { Button, Tooltip } from 'antd';
import React from 'react';

interface RetailToolbarProps {
    loading?: boolean;
    disabled?: boolean;
    onAddRow: () => void;
    onReset: () => void;
}

export function RetailToolbar({
    loading,
    disabled,
    onAddRow,
    onReset,
}: RetailToolbarProps) {
    return (
        <div className="flex flex-col gap-3 rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-white/10 dark:bg-[#1f1f1f]/70 md:flex-row md:items-center md:justify-between">
            <div className="flex min-w-0 flex-1 items-center">
                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={onAddRow}
                    disabled={disabled || loading}
                    className="h-10 rounded-xl bg-slate-900 px-5 font-bold shadow-md shadow-slate-200 hover:bg-blue-600 dark:bg-blue-600 dark:shadow-none"
                >
                    添加一行
                </Button>
            </div>
            <Tooltip title="清空零售清单">
                <Button
                    icon={<ReloadOutlined />}
                    onClick={onReset}
                    disabled={disabled}
                    className="h-10 rounded-xl border-slate-200 font-bold text-slate-500 hover:border-red-200 hover:text-red-500 dark:border-gray-700 dark:text-gray-400 dark:hover:border-red-800 dark:hover:text-red-400"
                >
                    重置
                </Button>
            </Tooltip>
        </div>
    );
}
