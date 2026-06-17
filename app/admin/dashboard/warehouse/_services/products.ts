/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchDashboardProducts = (params?: {
    search?: string;
    category?: string;
    category_id?: number;
}) => {
    return api.get<any, Product[]>('/products', { params });
};
