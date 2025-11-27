'use client';

import React from 'react';
import { Upload, Button, Typography, Space, Row, Col } from 'antd';
import {
    CloudUploadOutlined,
    DownloadOutlined,
    FileExcelOutlined,
    ImportOutlined,
} from '@ant-design/icons';
import { useImport } from './hooks/useImport';
import { ImportActionCard } from './components/ImportActionCard';
import { Instructions } from './components/Instructions';

const { Title, Text } = Typography;

export default function ImportPage() {
    const { uploading, fileList, setFileList, handleUpload, handleDownloadTemplate } = useImport();

    return (
        <div className="p-6 min-h-screen bg-gray-50/50">
            <div className="max-w-[1200px] mx-auto space-y-8">
                {/* Page Header */}
                <div>
                    <Title level={2} style={{ marginBottom: 0, fontSize: '24px', fontWeight: 600 }}>
                        <Space>
                            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
                                <ImportOutlined style={{ fontSize: 20 }} />
                            </div>
                            <span>数据导入导出</span>
                        </Space>
                    </Title>
                    <Text type="secondary" className="mt-1 block pl-[52px]">
                        批量导入产品数据，支持 Excel 模板下载与解析
                    </Text>
                </div>

                {/* Actions Area */}
                <Row gutter={[24, 24]}>
                    <Col xs={24} md={12}>
                        <ImportActionCard
                            title="下载模板"
                            description="获取包含所有硬件分类的标准 Excel 模板文件，按格式填写后上传。"
                            icon={<FileExcelOutlined />}
                            color="blue"
                        >
                            <Button
                                type="primary"
                                icon={<DownloadOutlined />}
                                size="large"
                                onClick={handleDownloadTemplate}
                                className="w-full max-w-[200px] h-10 bg-blue-600"
                            >
                                下载模板
                            </Button>
                        </ImportActionCard>
                    </Col>
                    <Col xs={24} md={12}>
                        <ImportActionCard
                            title="上传数据"
                            description="选择填写好的 Excel 文件上传，系统将自动解析并导入数据。"
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
                                    className="w-full max-w-[200px] h-10 bg-purple-600 border-purple-600 hover:bg-purple-500"
                                >
                                    {uploading ? '导入中...' : '选择文件上传'}
                                </Button>
                            </Upload>
                        </ImportActionCard>
                    </Col>
                </Row>

                {/* Instructions */}
                <Instructions />
            </div>
        </div>
    );
}
