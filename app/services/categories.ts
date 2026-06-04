/* eslint-disable @typescript-eslint/no-explicit-any */
import type { ProductCategory } from '@/const/types';
import api from '@/lib/request/axios';

export interface ProductCategoryPayload {
    name: string;
    label?: string;
    tag_color?: string;
    sort_order?: number;
    is_active?: boolean;
}

export const fetchProductCategories = (params?: { includeInactive?: boolean }) => {
    return api.get<any, ProductCategory[]>('/product-categories', { params });
};

export const createProductCategory = (data: ProductCategoryPayload) => {
    return api.post<any, ProductCategory>('/product-categories', data);
};

export const updateProductCategory = (id: number, data: ProductCategoryPayload) => {
    return api.put<any, ProductCategory>(`/product-categories/${id}`, data);
};

export const deleteProductCategory = (id: number) => {
    return api.delete<any, void>(`/product-categories/${id}`);
};
