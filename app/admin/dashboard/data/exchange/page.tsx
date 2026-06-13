'use client';

import {
    CheckCircleOutlined,
    CloudDownloadOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    ReloadOutlined,
} from '@ant-design/icons';
import { useRequest } from 'ahooks';
import { Button, Checkbox, Empty, message, Spin, Tag, Tooltip } from 'antd';
import React, { useMemo, useState } from 'react';
import { fetchDataExchangeWorkbook } from './services';
import { downloadDataExchangeWorkbook } from './utils';

const getErrorMessage = (error: unknown, fallback: string) => {
    if (error instanceof Error) return error.message;
    if (error && typeof error === 'object' && 'message' in error) {
        return String((error as { message?: unknown }).message || fallback);
    }
    return fallback;
};

export default function DataExchangePage() {
    const [selectedTables, setSelectedTables] = useState<string[]>([]);

    const {
        data: metadata,
        loading: loadingMetadata,
        refresh,
    } = useRequest(() => fetchDataExchangeWorkbook({ includeRows: false }), {
        onSuccess: (workbook) => {
            setSelectedTables(workbook.sheets.map((sheet) => sheet.table));
        },
        onError: (error) => {
            message.error(getErrorMessage(error, '获取导出工作表失败'));
        },
    });

    const sheets = useMemo(() => metadata?.sheets || [], [metadata]);
    const selectedSheetNames = useMemo(() => new Set(selectedTables), [selectedTables]);
    const selectedCount = selectedTables.length;
    const totalColumns = useMemo(
        () =>
            sheets
                .filter((sheet) => selectedSheetNames.has(sheet.table))
                .reduce((count, sheet) => count + sheet.columns.length, 0),
        [sheets, selectedSheetNames]
    );

    const { run: handleExport, loading: exporting } = useRequest(
        async () => {
            const workbook = await fetchDataExchangeWorkbook({ tables: selectedTables });
            downloadDataExchangeWorkbook(workbook);
            return workbook.sheets.length;
        },
        {
            manual: true,
            onSuccess: (count) => {
                message.success(`已导出 ${count} 个工作表`);
            },
            onError: (error) => {
                message.error(getErrorMessage(error, '导出失败，请重试'));
            },
        }
    );

    const selectAll = () => setSelectedTables(sheets.map((sheet) => sheet.table));
    const clearSelection = () => setSelectedTables([]);
    const toggleSheet = (table: string, checked: boolean) => {
        setSelectedTables((prev) =>
            checked ? [...prev, table] : prev.filter((selectedTable) => selectedTable !== table)
        );
    };

    const isBusy = loadingMetadata || exporting;

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 dark:bg-black md:p-10">
            <div className="mx-auto max-w-[1400px] space-y-8">
                <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                    <div>
                        <div className="mb-2 flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                            <CloudDownloadOutlined />
                            <span className="text-[10px] font-black uppercase tracking-[0.3em]">
                                Data Export
                            </span>
                        </div>
                        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-100">
                            数据导出中心
                        </h1>
                        <p className="mt-2 max-w-2xl text-gray-500 dark:text-gray-400">
                            选择需要导出的业务工作表，生成中文表头的 Excel 数据文件。
                        </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                        <Tooltip title="刷新工作表列表">
                            <Button
                                icon={<ReloadOutlined />}
                                onClick={() => refresh()}
                                disabled={isBusy}
                                className="h-10"
                            />
                        </Tooltip>
                        <Button onClick={selectAll} disabled={isBusy || sheets.length === 0}>
                            全选
                        </Button>
                        <Button onClick={clearSelection} disabled={isBusy || selectedCount === 0}>
                            清空
                        </Button>
                        <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            loading={exporting}
                            disabled={loadingMetadata || selectedCount === 0}
                            onClick={() => handleExport()}
                            className="h-10 bg-emerald-600 shadow-lg shadow-emerald-600/20 hover:bg-emerald-500"
                        >
                            {selectedCount > 0 ? `导出 ${selectedCount} 个工作表` : '导出数据'}
                        </Button>
                    </div>
                </div>

                <div className="grid gap-4 md:grid-cols-3">
                    <StatItem label="可导出工作表" value={`${sheets.length} 个`} />
                    <StatItem label="已选择" value={`${selectedCount} 个`} tone="green" />
                    <StatItem label="导出字段" value={`${totalColumns} 项`} tone="blue" />
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f]">
                    <div className="mb-5 flex flex-col justify-between gap-3 md:flex-row md:items-center">
                        <div>
                            <h2 className="text-lg font-black text-gray-900 dark:text-gray-100">
                                工作表选择
                            </h2>
                            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                                导出文件只包含已勾选的工作表，所有字段表头均使用中文映射。
                            </p>
                        </div>
                        <Tag color={selectedCount === sheets.length ? 'green' : 'blue'}>
                            {selectedCount === sheets.length ? '已全选' : `已选 ${selectedCount}`}
                        </Tag>
                    </div>

                    <Spin spinning={loadingMetadata}>
                        {sheets.length === 0 && !loadingMetadata ? (
                            <Empty description="暂无可导出的工作表" />
                        ) : (
                            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                                {sheets.map((sheet) => {
                                    const checked = selectedSheetNames.has(sheet.table);
                                    return (
                                        <label
                                            key={sheet.table}
                                            className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                                                checked
                                                    ? 'border-emerald-200 bg-emerald-50/70 dark:border-emerald-900/60 dark:bg-emerald-900/10'
                                                    : 'border-gray-100 bg-gray-50/60 hover:border-gray-200 dark:border-gray-800 dark:bg-[#141414] dark:hover:border-gray-700'
                                            }`}
                                        >
                                            <Checkbox
                                                checked={checked}
                                                disabled={isBusy}
                                                onChange={(event) =>
                                                    toggleSheet(sheet.table, event.target.checked)
                                                }
                                                className="mt-1"
                                            />
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <FileExcelOutlined className="text-emerald-600 dark:text-emerald-400" />
                                                    <span className="truncate font-bold text-gray-900 dark:text-gray-100">
                                                        {sheet.sheet}
                                                    </span>
                                                </div>
                                                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                                                    <span>{sheet.columns.length} 个字段</span>
                                                    {checked && (
                                                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
                                                            <CheckCircleOutlined /> 已选择
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </label>
                                    );
                                })}
                            </div>
                        )}
                    </Spin>
                </div>
            </div>
        </div>
    );
}

function StatItem({
    label,
    value,
    tone = 'gray',
}: {
    label: string;
    value: string;
    tone?: 'gray' | 'green' | 'blue';
}) {
    const toneClass = {
        gray: 'bg-gray-50 text-gray-700 dark:bg-[#141414] dark:text-gray-200',
        green: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300',
        blue: 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300',
    }[tone];

    return (
        <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-[#1f1f1f]">
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</div>
            <div
                className={`mt-3 inline-flex rounded-xl px-3 py-1 text-2xl font-black ${toneClass}`}
            >
                {value}
            </div>
        </div>
    );
}
