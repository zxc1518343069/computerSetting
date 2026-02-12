'use client';

import React, { useState } from 'react';
import { Button, Dropdown, message, App } from 'antd';
import type { MenuProps } from 'antd';
import {
    DownloadOutlined,
    PictureOutlined,
    CopyOutlined,
    FileImageOutlined,
    LoadingOutlined,
} from '@ant-design/icons';
import { downloadQuoteImage, copyQuoteImageToClipboard, QuoteExportData } from '@/utils/canvasExport';

interface ExportButtonProps {
    data: QuoteExportData;
    disabled?: boolean;
}

export const ExportButton: React.FC<ExportButtonProps> = ({ data, disabled }) => {
    const { message: messageApi } = App.useApp();
    const [loading, setLoading] = useState(false);
    const [copyLoading, setCopyLoading] = useState(false);

    const handleDownload = async () => {
        if (disabled || loading) return;
        
        setLoading(true);
        try {
            // 生成文件名
            const timestamp = new Date().toISOString().slice(0, 10);
            const filename = `明远装机报价单_${timestamp}.png`;
            
            downloadQuoteImage(data, filename);
            messageApi.success('报价单已下载');
        } catch (error) {
            console.error('导出失败:', error);
            messageApi.error('导出失败，请重试');
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        if (disabled || copyLoading) return;
        
        setCopyLoading(true);
        try {
            const success = await copyQuoteImageToClipboard(data);
            if (success) {
                messageApi.success('报价单已复制到剪贴板');
            } else {
                messageApi.error('复制失败，请尝试下载');
            }
        } catch (error) {
            console.error('复制失败:', error);
            messageApi.error('复制失败，请尝试下载');
        } finally {
            setCopyLoading(false);
        }
    };

    const menuItems: MenuProps['items'] = [
        {
            key: 'download',
            icon: <DownloadOutlined />,
            label: '下载图片',
            onClick: handleDownload,
        },
        {
            key: 'copy',
            icon: <CopyOutlined />,
            label: copyLoading ? '复制中...' : '复制到剪贴板',
            onClick: handleCopy,
            disabled: copyLoading,
        },
    ];

    return (
        <Dropdown
            menu={{ items: menuItems }}
            trigger={['click']}
            disabled={disabled}
        >
            <Button
                type="primary"
                icon={loading ? <LoadingOutlined /> : <FileImageOutlined />}
                loading={loading}
                disabled={disabled}
                className="h-10 px-5 bg-gradient-to-r from-blue-600 to-indigo-600 border-none rounded-xl shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 transition-all font-medium"
            >
                导出报价单
            </Button>
        </Dropdown>
    );
};

export default ExportButton;
