/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PurchaseOrder } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchPurchaseOrders = (params?: {
    search?: string;
    status?: string;
    goods_status?: string;
    payment_status?: string;
}) => {
    return api.get<any, PurchaseOrder[]>('/purchase-orders', { params });
};

export const receivePurchaseOrder = (id: number, data: any) => {
    return api.post<any, { inbound_order_id: number; purchase_order: PurchaseOrder }>(
        `/purchase-orders/${id}/receive`,
        data
    );
};
