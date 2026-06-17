/* eslint-disable @typescript-eslint/no-explicit-any */
import type { PurchaseReturn } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchPurchaseReturns = (params?: {
    search?: string;
    purchase_order_id?: number;
    inbound_order_id?: number;
    supplier_id?: number;
    goods_status?: string;
    refund_status?: string;
}) => {
    return api.get<any, PurchaseReturn[]>('/purchase-returns', { params });
};
