'use client';

import {
    CloudUploadOutlined,
    DownloadOutlined,
    ExportOutlined,
    FileExcelOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { Button, Upload } from 'antd';
import React from 'react';
import { ImportActionCard } from './components/ImportActionCard';
import { Instructions } from './components/Instructions';
import { useImport } from './hooks/useImport';

export default function ImportPage() {
    const {
        uploading,
        exporting,
        fileList,
        setFileList,
        handleUpload,
        handleDownloadTemplate,
        handleExport,
        downloadingTemplate,
    } = useImport();

    return (
        <div className="min-h-screen bg-[#F8FAFC] dark:bg-black p-6 relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-200/20 dark:bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto space-y-10 relative z-10">
                {/* Page Header */}
                <div className="flex flex-col items-center text-center space-y-4 py-8">
                    <div className="inline-flex items-center justify-center p-3 bg-white dark:bg-[#1f1f1f] rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <ImportOutlined style={{ fontSize: 24 }} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 tracking-tight mb-2">
                            数据交换中心
                        </h1>
                        <p className="text-gray-500 dark:text-gray-400 max-w-lg mx-auto text-base">
                            管理本机 SQLite 业务数据。支持模板下载、全量导出与备份恢复，
                            方便本地部署、迁移和临时演示。
                        </p>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-full">
                        <ImportActionCard
                            title="下载模板"
                            description="获取完整业务表结构，用于确认每个工作表和字段。"
                            icon={<FileExcelOutlined />}
                            color="blue"
                        >
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                size="large"
                                onClick={handleDownloadTemplate}
                                loading={downloadingTemplate}
                                className="w-full h-11 bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-600/20 rounded-lg font-medium"
                            >
                                {downloadingTemplate ? '生成中...' : '下载模板'}
                            </Button>
                        </ImportActionCard>
                    </div>

                    <div className="h-full">
                        <ImportActionCard
                            title="导出数据"
                            description="导出产品、库存、入库、订单、财务等全量备份文件。"
                            icon={<ExportOutlined />}
                            color="green"
                        >
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                size="large"
                                onClick={handleExport}
                                loading={exporting}
                                className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 border-none shadow-lg shadow-emerald-600/20 rounded-lg font-medium"
                            >
                                {exporting ? '导出中...' : '导出数据'}
                            </Button>
                        </ImportActionCard>
                    </div>

                    <div className="h-full">
                        <ImportActionCard
                            title="上传数据"
                            description="恢复 Excel 备份并覆盖当前数据库，请先确认已保存旧数据。"
                            icon={<CloudUploadOutlined />}
                            color="purple"
                        >
                            <Upload
                                beforeUpload={handleUpload}
                                fileList={fileList}
                                onChange={({ fileList }) => setFileList(fileList)}
                                showUploadList={false}
                                accept=".xlsx,.xls"
                                maxCount={1}
                            >
                                <Button
                                    type="primary"
                                    icon={<CloudUploadOutlined />}
                                    size="large"
                                    loading={uploading}
                                    className="w-full h-11 bg-violet-600 hover:bg-violet-500 border-none shadow-lg shadow-violet-600/20 rounded-lg font-medium"
                                >
                                    {uploading ? '处理中...' : '选择文件'}
                                </Button>
                            </Upload>
                        </ImportActionCard>
                    </div>
                </div>

                {/* Instructions */}
                <Instructions />
            </div>
        </div>
    );
}
