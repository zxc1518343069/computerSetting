import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { categoryDisplayMap, exampleData, PartCategory } from '@/const';
import { ImportProductData } from './services';
import { Product } from '../config/types';

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
    [PartCategory.Monitor]: 'monitor',
};

interface ExcelRow {
    产品名称?: string | number;
    产品价格?: string | number;
    最终售价?: string | number;
    是否使用溢价?: string | boolean;
}

/**
 * 解析上传的 Excel 文件
 */
export const parseExcelFile = (file: File): Promise<ImportProductData[]> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, { type: 'array' });
                const productsToImport: ImportProductData[] = [];

                // 遍历所有分类
                Object.values(PartCategory).forEach((category) => {
                    const mappedKey = categoryMapping[category];
                    const sheetName = categoryDisplayMap[mappedKey];
                    const worksheet = workbook.Sheets[sheetName];

                    if (worksheet) {
                        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
                        if (jsonData.length > 0) {
                            const parsedProducts = jsonData
                                .filter((row) => row['产品名称'] && row['产品价格'])
                                .map((row) => ({
                                    name: String(row['产品名称']),
                                    price: Number(row['产品价格']) || 0,
                                    category: category.toLowerCase(),
                                    // 尝试读取新字段，如果不存在则使用默认值
                                    selling_price: row['最终售价']
                                        ? Number(row['最终售价'])
                                        : undefined,
                                    is_use_premium:
                                        row['是否使用溢价'] !== undefined
                                            ? row['是否使用溢价'] === '是' ||
                                              row['是否使用溢价'] === true
                                            : undefined,
                                }));

                            productsToImport.push(...parsedProducts);
                        }
                    }
                });
                resolve(productsToImport);
            } catch (error) {
                reject(error);
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsArrayBuffer(file);
    });
};

/**
 * 生成并下载 Excel 模板
 */
export const generateTemplate = () => {
    const workbook = XLSX.utils.book_new();

    Object.values(PartCategory).forEach((category) => {
        const products = exampleData[category];
        const worksheetData = [
            ['产品名称', '产品价格', '最终售价', '是否使用溢价'],
            ...products.map((product) => [product.name, product.price, '', '是']),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        const mappedKey = categoryMapping[category];
        XLSX.utils.book_append_sheet(workbook, worksheet, categoryDisplayMap[mappedKey]);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(data, '电脑配件导入模板.xlsx');
};

/**
 * 导出所有产品数据到 Excel
 */
export const exportData = (products: Product[]) => {
    const workbook = XLSX.utils.book_new();

    // 按分类分组
    const groupedProducts: Record<string, Product[]> = {};
    products.forEach((product) => {
        if (!groupedProducts[product.category]) {
            groupedProducts[product.category] = [];
        }
        groupedProducts[product.category].push(product);
    });

    // 遍历所有定义的分类，确保即使没有数据的分类也有 Sheet
    Object.values(PartCategory).forEach((categoryEnum) => {
        const categoryKey = categoryMapping[categoryEnum];
        const categoryProducts = groupedProducts[categoryKey] || [];
        const sheetName = categoryDisplayMap[categoryKey];

        const worksheetData = [
            ['ID', '产品名称', '基础价格', '最终售价(手动)', '是否使用溢价', '创建时间'],
            ...categoryProducts.map((product) => [
                product.id,
                product.name,
                product.price,
                product.selling_price ?? '', // 如果是 null/undefined 显示为空
                product.is_use_premium ? '是' : '否',
                product.created_at ? new Date(product.created_at).toLocaleDateString() : '',
            ]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

        // 设置列宽
        worksheet['!cols'] = [
            { wch: 8 }, // ID
            { wch: 40 }, // Name
            { wch: 12 }, // Price
            { wch: 15 }, // Selling Price
            { wch: 12 }, // Is Premium
            { wch: 15 }, // Created At
        ];

        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(data, `电脑配件数据导出_${new Date().toISOString().split('T')[0]}.xlsx`);
};
