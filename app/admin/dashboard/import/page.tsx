'use client';
import { AllProducts, categoryDisplayNames, exampleData, PartCategory } from '@/const';
import React from 'react';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export default function Import() {
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });

                const newProducts: AllProducts = { ...exampleData };
                let hasChanges = false;

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
                                .map((row, index) => ({
                                    id: index + 1, // 生成新ID
                                    name: String(row['产品名称']),
                                    price: Number(row['产品价格']) || 0,
                                }));

                            if (parsedProducts.length > 0) {
                                newProducts[category] = parsedProducts;
                                hasChanges = true;
                            }
                        }
                    }
                });

                if (hasChanges) {
                    // 重置表单以反映新数据
                    alert('Excel数据已成功导入');
                } else {
                    alert('未找到有效数据，请检查Excel格式是否符合模板要求');
                }
            } catch (error) {
                console.error('Excel解析错误:', error);
                alert('Excel解析失败，请检查文件格式');
            } finally {
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
    };

    return (
        <div className="flex items-center justify-center h-full">
            <label className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
                上传Excel
                <input
                    type="file"
                    className="hidden"
                    accept=".xlsx,.xls"
                    onChange={handleExcelUpload}
                />
            </label>

            {/* 下载模板按钮 */}
            <button
                onClick={downloadExcelTemplate}
                className="px-4 py-2 bg-green-100 text-green-800 rounded-lg hover:bg-green-200 transition-colors"
            >
                下载Excel模板
            </button>
        </div>
    );
}
