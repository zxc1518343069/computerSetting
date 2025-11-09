'use client';
import { categoryDisplayNames, exampleData, PartCategory } from '@/const';
import React, { useState } from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

// PartCategory 到数据库 category 的映射
const categoryMapping: Record<PartCategory, string> = {
    [PartCategory.CPU]: 'cpu',
    [PartCategory.Motherboard]: 'motherboard',
    [PartCategory.RAM]: 'ram',
    [PartCategory.GPU]: 'gpu',
    [PartCategory.Storage]: 'storage',
    [PartCategory.PSU]: 'psu',
    [PartCategory.Case]: 'case',
    [PartCategory.Cooling]: 'cooling',
};

export default function Import() {
    const [uploading, setUploading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState<string | null>(null);
    const [toast, setToast] = useState<{
        show: boolean;
        message: string;
        type: 'success' | 'error' | 'warning';
    }>({ show: false, message: '', type: 'success' });

    const showToast = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };

    const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setUploading(true);
        setUploadedFile(file.name);

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const productsToImport: Array<{ name: string; price: number; category: string }> =
                    [];

                // 遍历所有分类
                Object.values(PartCategory).forEach((category) => {
                    const sheetName = categoryDisplayNames[category];
                    const worksheet = workbook.Sheets[sheetName];

                    if (worksheet) {
                        const jsonData: never[] = XLSX.utils.sheet_to_json(worksheet);
                        if (jsonData.length > 0) {
                            // 解析Excel数据
                            const parsedProducts = jsonData
                                .filter((row) => row['产品名称'] && row['产品价格'])
                                .map((row) => ({
                                    name: String(row['产品名称']),
                                    price: Number(row['产品价格']) || 0,
                                    category: categoryMapping[category], // 使用映射后的小写category
                                }));

                            productsToImport.push(...parsedProducts);
                        }
                    }
                });

                if (productsToImport.length === 0) {
                    showToast('未找到有效数据，请检查Excel格式是否符合模板要求', 'warning');
                    return;
                }

                // 调用API批量导入
                const response = await fetch('/api/products/import', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ products: productsToImport }),
                });

                const result = await response.json();

                if (response.ok && result.success) {
                    showToast(`成功导入 ${result.count} 条产品数据`, 'success');
                } else {
                    showToast(result.error || '导入失败', 'error');
                }
            } catch (error) {
                console.error('Excel解析错误:', error);
                showToast('Excel解析失败，请检查文件格式', 'error');
            } finally {
                setUploading(false);
                // 重置input值，允许重复上传同一文件
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-expect-error
                if (e?.target?.value) {
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-expect-error
                    e.target.value = undefined;
                }
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const downloadExcelTemplate = () => {
        const workbook = XLSX.utils.book_new();

        Object.values(PartCategory).forEach((category) => {
            const products = exampleData[category];
            const worksheetData = [
                ['产品名称', '产品价格'], // 表头
                ...products.map((product) => [product.name, product.price]),
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, categoryDisplayNames[category]);
        });

        const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const data = new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(data, '电脑配件模板.xlsx');
        showToast('模板下载成功', 'success');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 p-8">
            <div className="max-w-4xl mx-auto">
                {/* 页面标题 */}
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-3">
                        数据导入导出
                    </h1>
                    <p className="text-gray-600">批量管理产品数据，支持Excel格式导入导出</p>
                </div>

                {/* 主卡片 */}
                <div className="bg-white rounded-2xl shadow-xl p-8 mb-6">
                    {/* 操作区域 */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        {/* 下载模板卡片 */}
                        <div className="border-2 border-dashed border-blue-200 rounded-xl p-6 hover:border-blue-400 transition-all hover:shadow-md">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                                    <svg
                                        className="w-8 h-8 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    下载模板
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    下载包含所有分类的Excel模板文件
                                </p>
                                <button
                                    onClick={downloadExcelTemplate}
                                    className="px-6 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all shadow-md hover:shadow-lg font-medium"
                                >
                                    下载模板
                                </button>
                            </div>
                        </div>

                        {/* 上传文件卡片 */}
                        <div className="border-2 border-dashed border-purple-200 rounded-xl p-6 hover:border-purple-400 transition-all hover:shadow-md">
                            <div className="flex flex-col items-center text-center">
                                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4 shadow-lg">
                                    <svg
                                        className="w-8 h-8 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                                        />
                                    </svg>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                                    上传数据
                                </h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    {uploadedFile
                                        ? `已选择: ${uploadedFile}`
                                        : '选择Excel文件导入产品数据'}
                                </p>
                                <label className="px-6 py-2.5 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 transition-all shadow-md hover:shadow-lg font-medium cursor-pointer">
                                    {uploading ? (
                                        <span className="flex items-center">
                                            <svg
                                                className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                            >
                                                <circle
                                                    className="opacity-25"
                                                    cx="12"
                                                    cy="12"
                                                    r="10"
                                                    stroke="currentColor"
                                                    strokeWidth="4"
                                                />
                                                <path
                                                    className="opacity-75"
                                                    fill="currentColor"
                                                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                                />
                                            </svg>
                                            导入中...
                                        </span>
                                    ) : (
                                        '选择文件'
                                    )}
                                    <input
                                        type="file"
                                        className="hidden"
                                        accept=".xlsx,.xls"
                                        onChange={handleExcelUpload}
                                        disabled={uploading}
                                    />
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* 说明信息 */}
                    <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-100">
                        <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                            <svg
                                className="w-5 h-5 mr-2 text-blue-600"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            使用说明
                        </h4>
                        <ul className="space-y-2 text-sm text-gray-700">
                            <li className="flex items-start">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span>首次使用请先下载模板，了解所需的数据格式</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span>
                                    模板包含8个工作表，分别对应：CPU、主板、内存、显卡、存储、电源、机箱、散热器
                                </span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span>
                                    每个工作表需包含&#34;产品名称&#34;和&#34;产品价格&#34;两列
                                </span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span>请确保价格为数字格式，产品名称不为空</span>
                            </li>
                            <li className="flex items-start">
                                <span className="text-blue-600 mr-2 mt-0.5">•</span>
                                <span>上传成功后，系统将自动解析并更新产品数据</span>
                            </li>
                        </ul>
                    </div>
                </div>

                {/* 支持的文件格式 */}
                <div className="text-center text-sm text-gray-500">
                    <p className="flex items-center justify-center">
                        <svg
                            className="w-4 h-4 mr-1"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            />
                        </svg>
                        支持的文件格式：.xlsx、.xls
                    </p>
                </div>
            </div>

            {/* Toast 通知 */}
            {toast.show && (
                <div
                    className={`fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg animate-slide-in-right ${
                        toast.type === 'success'
                            ? 'bg-green-500 text-white'
                            : toast.type === 'error'
                              ? 'bg-red-500 text-white'
                              : 'bg-yellow-500 text-white'
                    }`}
                >
                    <div className="flex items-center">
                        {toast.type === 'success' && (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                        {toast.type === 'error' && (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                        {toast.type === 'warning' && (
                            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                <path
                                    fillRule="evenodd"
                                    d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        )}
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
