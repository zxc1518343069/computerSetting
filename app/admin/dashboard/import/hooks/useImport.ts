import { useRequest } from 'ahooks';
import { message, Modal, UploadFile } from 'antd';
import { useState } from 'react';
import { fetchDataExchangeWorkbook, importDataExchangeWorkbook } from '../services';
import { downloadDataExchangeWorkbook, parseDataExchangeFile } from '../utils';

const confirmRestore = () =>
    new Promise<boolean>((resolve) => {
        Modal.confirm({
            title: '确认恢复数据？',
            content: '上传备份会覆盖当前产品、库存、订单和财务数据，建议先导出现有数据。',
            okText: '确认覆盖',
            okType: 'danger',
            cancelText: '取消',
            onOk: () => resolve(true),
            onCancel: () => resolve(false),
        });
    });

export const useImport = () => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    const { runAsync: importData, loading: uploading } = useRequest(
        async (file: File) => {
            const payload = await parseDataExchangeFile(file);
            const sheetNames = Object.keys(payload.sheets);

            if (sheetNames.length === 0) {
                throw new Error('未找到有效工作表，请检查 Excel 文件格式');
            }

            await importDataExchangeWorkbook(payload);
            return sheetNames.length;
        },
        {
            manual: true,
            onSuccess: (count) => {
                message.success(`数据恢复成功，共处理 ${count} 个工作表`);
                setFileList([]);
            },
            onError: (error) => {
                message.error(error.message || '数据恢复失败，请重试');
            },
        }
    );

    const { run: handleExport, loading: exporting } = useRequest(
        async () => {
            const workbook = await fetchDataExchangeWorkbook('export');
            downloadDataExchangeWorkbook(workbook);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('数据导出成功');
            },
            onError: (error) => {
                message.error(error.message || '导出失败，请重试');
            },
        }
    );

    const handleUpload = async (file: File) => {
        const confirmed = await confirmRestore();
        if (!confirmed) return false;

        await importData(file);
        return false;
    };

    const { run: handleDownloadTemplate, loading: downloadingTemplate } = useRequest(
        async () => {
            const workbook = await fetchDataExchangeWorkbook('template');
            downloadDataExchangeWorkbook(workbook);
        },
        {
            manual: true,
            onSuccess: () => {
                message.success('模板下载成功');
            },
            onError: (error) => {
                message.error(error.message || '模板生成失败');
            },
        }
    );

    return {
        uploading,
        exporting,
        downloadingTemplate,
        fileList,
        setFileList,
        handleUpload,
        handleDownloadTemplate,
        handleExport,
    };
};
