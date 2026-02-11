'use client';

'use client';

import React from 'react';
import { Upload, Button } from 'antd';
import {
    CloudUploadOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    ImportOutlined,
    ExportOutlined,
} from '@ant-design/icons';
import { useImport } from './hooks/useImport';
import { ImportActionCard } from './components/ImportActionCard';
import { Instructions } from './components/Instructions';

export default function ImportPage() {
    const {
        uploading,
        exporting,
        fileList,
        setFileList,
        handleUpload,
        handleDownloadTemplate,
        handleExport,
    } = useImport();

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 relative overflow-hidden">
            {/* Background Grid Pattern */}
            <div
                className="absolute inset-0 opacity-[0.03] pointer-events-none"
                style={{
                    backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                    backgroundSize: '40px 40px',
                }}
            />

            {/* Ambient Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-200/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-[1200px] mx-auto space-y-10 relative z-10">
                {/* Page Header */}
                <div className="flex flex-col items-center text-center space-y-4 py-8">
                    <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm border border-gray-100 mb-2">
                        <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
                            <ImportOutlined style={{ fontSize: 24 }} />
                        </div>
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
                            数据交换中心
                        </h1>
                        <p className="text-gray-500 max-w-lg mx-auto text-base">
                            高效管理您的产品数据库。支持批量导入、导出及模板生成，
                            确保数据流转的准确性与时效性。
                        </p>
                    </div>
                </div>

                {/* Actions Area */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="h-full">
                        <ImportActionCard
                            title="下载模板"
                            description="获取标准 Excel 结构文件，包含预设的硬件分类工作表。"
                            icon={<FileExcelOutlined />}
                            color="blue"
                        >
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                size="large"
                                onClick={handleDownloadTemplate}
                                className="w-full h-11 bg-blue-600 hover:bg-blue-500 border-none shadow-lg shadow-blue-600/20 rounded-lg font-medium"
                            >
                                下载模板
                            </Button>
                        </ImportActionCard>
                    </div>

                    <div className="h-full">
                        <ImportActionCard
                            title="导出数据"
                            description="生成包含完整产品信息与溢价配置的备份文件。"
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
                            description="解析 Excel 文件并批量更新数据库，支持自动去重。"
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
