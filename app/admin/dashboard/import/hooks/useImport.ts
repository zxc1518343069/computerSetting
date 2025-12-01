import { useState } from 'react';
import { message, UploadFile } from 'antd';
import { useRequest } from 'ahooks';
import { importProductsService } from '../services';
import { parseExcelFile, generateTemplate } from '../utils';

export const useImport = () => {
    const [fileList, setFileList] = useState<UploadFile[]>([]);

    // 导入逻辑
    const { runAsync: importData, loading: uploading } = useRequest(
        async (file: File) => {
            const products = await parseExcelFile(file);
            if (products.length === 0) {
                throw new Error('未找到有效数据，请检查Excel格式');
            }
            const result = await importProductsService(products);
            if (!result.success) {
                throw new Error(result.error || '导入失败');
            }
            return result.count;
        },
        {
            manual: true,
            onSuccess: (count) => {
                message.success(`成功导入 ${count} 条数据`);
                setFileList([]); // 清空上传列表
            },
            onError: (error) => {
                message.error(error.message || '导入失败，请重试');
            },
        }
    );

    // 处理文件上传
    const handleUpload = async (file: File) => {
        await importData(file);
        return false; // 阻止默认上传行为
    };

    // 处理模板下载
    const handleDownloadTemplate = () => {
        try {
            generateTemplate();
            message.success('模板下载成功');
        } catch (error) {
            console.error(error);
            message.error('模板生成失败');
        }
    };

    return {
        uploading,
        fileList,
        setFileList,
        handleUpload,
        handleDownloadTemplate,
    };
};
