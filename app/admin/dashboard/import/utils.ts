import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { categoryDisplayNames, exampleData, PartCategory } from '@/const';
import { ImportProductData } from './services';

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
                    const sheetName = categoryDisplayNames[category];
                    const worksheet = workbook.Sheets[sheetName];

                    if (worksheet) {
                        const jsonData = XLSX.utils.sheet_to_json<ExcelRow>(worksheet);
                        if (jsonData.length > 0) {
                            const parsedProducts = jsonData
                                .filter((row) => row['产品名称'] && row['产品价格'])
                                .map((row) => ({
                                    name: String(row['产品名称']),
                                    price: Number(row['产品价格']) || 0,
                                    category: categoryMapping[category as PartCategory],
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
            ['产品名称', '产品价格'],
            ...products.map((product) => [product.name, product.price]),
        ];

        const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
        XLSX.utils.book_append_sheet(workbook, worksheet, categoryDisplayNames[category]);
    });

    const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const data = new Blob([excelBuffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    saveAs(data, '电脑配件导入模板.xlsx');
};
