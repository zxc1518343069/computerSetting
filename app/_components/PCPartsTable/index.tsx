// components/PCPartsTable.tsx
"use client"
import React, {useState} from 'react';
import * as XLSX from 'xlsx';
import {saveAs} from 'file-saver';

// 定义配件类别枚举
enum PartCategory {
    CPU = 'CPU',
    Motherboard = 'Motherboard',
    RAM = 'RAM',
    GPU = 'GPU',
    Storage = 'Storage',
    PSU = 'PSU',
    Case = 'Case',
    Cooling = 'Cooling'
}

// 定义类别显示名称映射
const categoryDisplayNames: Record<PartCategory, string> = {
    [PartCategory.CPU]: '处理器',
    [PartCategory.Motherboard]: '主板',
    [PartCategory.RAM]: '内存',
    [PartCategory.GPU]: '显卡',
    [PartCategory.Storage]: '存储',
    [PartCategory.PSU]: '电源',
    [PartCategory.Case]: '机箱',
    [PartCategory.Cooling]: '散热'
};

// 定义产品接口
interface Product {
    id: number;
    name: string;
    price: number;
}

// 定义配件行数据接口
interface PartRow {
    id: number;
    category: PartCategory;
    productId: number | null;
    name: string;
    price: number;
    quantity: number;
}

// 定义所有产品数据接口
type AllProducts = Record<PartCategory, Product[]>;

// 所有可选产品数据
const initProducts: AllProducts = {
    [PartCategory.CPU]: [
        {id: 1, name: 'Intel Core i9-13900K', price: 589.99},
        {id: 2, name: 'AMD Ryzen 9 7950X', price: 549.99},
        {id: 3, name: 'Intel Core i7-13700K', price: 419.99},
    ],
    [PartCategory.Motherboard]: [
        {id: 4, name: 'ASUS ROG Maximus Z790 Hero', price: 599.99},
        {id: 5, name: 'MSI MEG X670E ACE', price: 499.99},
        {id: 6, name: 'Gigabyte B650 AORUS Elite AX', price: 229.99},
    ],
    [PartCategory.RAM]: [
        {id: 7, name: 'Corsair Dominator Platinum RGB 32GB DDR5 6000MHz', price: 249.99},
        {id: 8, name: 'G.Skill Trident Z5 RGB 32GB DDR5 6000MHz', price: 219.99},
        {id: 9, name: 'Kingston Fury Beast 32GB DDR5 5200MHz', price: 149.99},
    ],
    [PartCategory.GPU]: [
        {id: 10, name: 'NVIDIA GeForce RTX 4090 Founders Edition', price: 1599.99},
        {id: 11, name: 'AMD Radeon RX 7900 XTX', price: 999.99},
        {id: 12, name: 'NVIDIA GeForce RTX 4080', price: 1199.99},
    ],
    [PartCategory.Storage]: [
        {id: 13, name: 'Samsung 990 Pro 2TB NVMe SSD', price: 249.99},
        {id: 14, name: 'WD Black SN850X 2TB NVMe SSD', price: 229.99},
        {id: 15, name: 'Crucial P5 Plus 2TB NVMe SSD', price: 199.99},
    ],
    [PartCategory.PSU]: [
        {id: 16, name: 'Corsair HX1200 Platinum 1200W', price: 299.99},
        {id: 17, name: 'Seasonic PRIME TX-1000 1000W', price: 279.99},
        {id: 18, name: 'EVGA SuperNOVA 850 G6 850W', price: 159.99},
    ],
    [PartCategory.Case]: [
        {id: 19, name: 'Lian Li PC-O11 Dynamic', price: 149.99},
        {id: 20, name: 'Fractal Design Torrent', price: 199.99},
        {id: 21, name: 'NZXT H7 Flow', price: 129.99},
    ],
    [PartCategory.Cooling]: [
        {id: 22, name: 'NZXT Kraken Z73 RGB 360mm', price: 279.99},
        {id: 23, name: 'Corsair iCUE H150i ELITE LCD', price: 249.99},
        {id: 24, name: 'Noctua NH-D15 chromax.black', price: 109.99},
    ],
};

const initialParts: PartRow[] = Object.values(PartCategory).map((category, index) => ({
    id: index + 1,
    category,
    productId: null,
    name: '',
    price: 0,
    quantity: 1,
}));

const PCPartsTable: React.FC = () => {
    // 初始配件数据
    const [parts, setParts] = useState<PartRow[]>(initialParts);
    const [allProducts, setAllProducts] = useState<AllProducts>(initProducts)
    const downloadExcelTemplate = () => {
        const workbook = XLSX.utils.book_new();

        Object.values(PartCategory).forEach(category => {
            const products = allProducts[category];
            const worksheetData = [
                ['产品名称', '产品价格'], // 表头
                ...products.map(product => [product.name, product.price])
            ];

            const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
            XLSX.utils.book_append_sheet(workbook, worksheet, categoryDisplayNames[category]);
        });

        const excelBuffer = XLSX.write(workbook, {bookType: 'xlsx', type: 'array'});
        const data = new Blob([excelBuffer], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
        saveAs(data, '电脑配件模板.xlsx');
    };

    // 处理Excel文件上传 (完整解析逻辑)
    const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target?.result as ArrayBuffer);
                const workbook = XLSX.read(data, {type: 'array'});

                const newProducts: AllProducts = {...allProducts};
                let hasChanges = false;

                // 遍历所有分类
                Object.values(PartCategory).forEach(category => {
                    const sheetName = categoryDisplayNames[category];
                    const worksheet = workbook.Sheets[sheetName];

                    if (worksheet) {
                        const jsonData: never[] = XLSX.utils.sheet_to_json(worksheet);
                        if (jsonData.length > 0) {
                            // 解析Excel数据
                            const parsedProducts = jsonData
                                .filter(row => row['产品名称'] && row['产品价格'])
                                .map((row, index) => ({
                                    id: index + 1, // 生成新ID
                                    name: String(row['产品名称']),
                                    price: Number(row['产品价格']) || 0
                                }));

                            if (parsedProducts.length > 0) {
                                newProducts[category] = parsedProducts;
                                hasChanges = true;
                            }
                        }
                    }
                });

                if (hasChanges) {
                    setAllProducts(newProducts);
                    // 重置表单以反映新数据
                    setParts(initialParts);
                    alert('Excel数据已成功导入并覆盖原有产品数据！');
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


    // 处理产品选择变化
    const handleProductChange = (id: number, category: PartCategory, e: React.ChangeEvent<HTMLSelectElement>) => {
        const productId = e.target.value ? parseInt(e.target.value) : null;

        if (!productId) {
            // 清空选择
            setParts(parts.map(part =>
                part.id === id ? {...part, productId: null, name: '', price: 0} : part
            ));
            return;
        }

        const selectedProduct = allProducts[category].find(p => p.id === productId);
        if (!selectedProduct) return;

        setParts(parts.map(part =>
            part.id === id ? {
                ...part,
                productId: selectedProduct.id,
                name: selectedProduct.name,
                price: selectedProduct.price
            } : part
        ));
    };

    // 处理数量变化
    const handleQuantityChange = (id: number, e: React.ChangeEvent<HTMLInputElement>) => {
        const quantity = parseInt(e.target.value) || 0;
        setParts(parts.map(part =>
            part.id === id ? {...part, quantity} : part
        ));
    };

    // 计算总价
    const totalPrice = parts.reduce((sum, part) => sum + (part.price * part.quantity), 0);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold text-gray-800 mb-6">电脑配件报价单</h1>

            <div className="overflow-x-auto shadow-md rounded-lg">
                <table className="w-full text-sm text-left text-gray-500 table-fixed">
                    <thead className="text-xs text-gray-700 uppercase bg-gray-50">
                    <tr>
                        <th scope="col" className="px-6 py-3 w-[15%]">类型分类</th>
                        <th scope="col" className="px-6 py-3 w-[45%]">产品名称</th>
                        <th scope="col" className="px-6 py-3 w-[15%]">数量</th>
                        <th scope="col" className="px-6 py-3 w-[25%]">价格</th>
                    </tr>
                    </thead>
                    <tbody>
                    {parts.map((part) => (
                        <tr key={part.id} className="bg-white border-b hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                                {categoryDisplayNames[part.category]}
                            </td>
                            <td className="px-6 py-4">
                                <select
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 w-full"
                                    value={part.productId || ''}
                                    onChange={(e) => handleProductChange(part.id, part.category, e)}
                                >
                                    <option value="">选择{categoryDisplayNames[part.category]}</option>
                                    {allProducts[part.category].map(product => (
                                        <option key={product.id} value={product.id}>
                                            {product.name} (${product.price.toFixed(2)})
                                        </option>
                                    ))}
                                </select>
                            </td>
                            <td className="px-6 py-4">
                                <input
                                    type="number"
                                    min="1"
                                    className="bg-gray-50 border border-gray-300 text-gray-900 rounded-lg focus:ring-blue-500 focus:border-blue-500 p-2 w-20"
                                    value={part.quantity}
                                    onChange={(e) => handleQuantityChange(part.id, e)}
                                />
                            </td>
                            <td className="px-6 py-4 font-medium text-nowrap overflow-x-auto">
                                ${(part.price * part.quantity).toFixed(2)}
                            </td>
                        </tr>
                    ))}
                    <tr className="bg-gray-100 font-semibold">
                        <td className="px-6 py-4" colSpan={3}>总价</td>
                        <td className="px-6 py-4 text-nowrap overflow-x-auto">${totalPrice.toFixed(2)}</td>
                    </tr>
                    </tbody>
                </table>
            </div>

            <div className="mt-4 text-sm text-gray-500">
                <p>* 选择产品并设置数量后，价格会自动计算</p>
            </div>

            <div className="mt-6 flex justify-end gap-6">
                <label
                    className="px-4 py-2 bg-blue-100 text-blue-800 rounded-lg hover:bg-blue-200 transition-colors cursor-pointer">
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

                <button
                    onClick={() => setParts(initialParts)}
                    className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                    重置
                </button>
            </div>
        </div>
    );
};

export default PCPartsTable;