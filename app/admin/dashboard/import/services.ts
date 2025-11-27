export interface ImportProductData {
    name: string;
    price: number;
    category: string;
}

export interface ImportResult {
    success: boolean;
    count?: number;
    error?: string;
}

/**
 * 批量导入产品数据
 */
export const importProductsService = async (
    products: ImportProductData[]
): Promise<ImportResult> => {
    const response = await fetch('/api/products/import', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products }),
    });

    const result = await response.json();
    return result;
};
