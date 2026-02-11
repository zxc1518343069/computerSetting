/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import { Product } from '../config/types';

export interface ImportProductData {
    name: string;
    price: number;
    category: string;
    selling_price?: number;
    is_use_premium?: boolean;
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

/**
 * 获取所有产品数据用于导出
 */
export const fetchAllProductsService = () => {
    return api.get<any, Product[]>('/products');
};
