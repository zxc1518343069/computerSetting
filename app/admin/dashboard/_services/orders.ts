/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SalesOrder } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchOrders = (params?: {
    search?: string;
    status?: string;
    payment_status?: string;
    delivery_status?: string;
    source_type?: SalesOrder['source_type'] | 'all';
    scope?: string;
}) => {
    return api.get<any, SalesOrder[]>('/orders', { params });
};
