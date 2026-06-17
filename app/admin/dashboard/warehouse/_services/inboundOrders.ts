/* eslint-disable @typescript-eslint/no-explicit-any */
import type { InboundOrder } from '@/const/types';
import api from '@/lib/request/axios';

export const fetchInboundOrders = (params?: {
    purchase_order_id?: number;
    inbound_order_id?: number;
    supplier_id?: number;
    search?: string;
    record_status?: string;
    source_type?: string;
}) => {
    return api.get<any, InboundOrder[]>('/inbound-orders', { params });
};
