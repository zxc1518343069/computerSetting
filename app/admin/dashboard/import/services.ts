/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';

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
export const importProductsService = (products: ImportProductData[]) => {
    return api.post<any, ImportResult>('/products/import', { products });
};
