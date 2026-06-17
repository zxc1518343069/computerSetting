/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InventoryItem } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchInventoryItems = (params?: {
    product_id?: number;
    status?: string;
    category?: string;
    category_id?: number;
    search?: string;
}) => {
    return api.get<any, InventoryItem[]>('/inventory-items', { params });
};
