/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Product, SalesOrder } from '@/const/types';
import api from '@/lib/request/axios';

export { fetchCustomers } from '@/app/services/customers';
export { fetchInventoryItems, fetchOrders, updateAccountPayment } from '../../_services';

export interface SalesProduct extends Product {
    has_stock: boolean;
    min_cost_price: number | null;
    max_cost_price: number | null;
    quote_base_price: number;
    suggested_price: number;
    inventory_items: Array<{
        id: number;
        serial_number?: string | null;
        cost_price: number;
        supplier_name?: string | null;
        warranty_enabled: boolean;
        warranty_until?: string | null;
        inbound_at?: string;
        status: string;
    }>;
}

export const fetchSalesProducts = (params?: {
    search?: string;
    category?: string;
    category_id?: number;
}) => {
    return api.get<any, SalesProduct[]>('/sales-products', { params });
};

export const updateOrderConfigAdjustment = (id: number, data: any) => {
    return api.put<any, { id: number }>(`/orders/${id}/config-adjustment`, data);
};

export const updateOrder = (
    id: number,
    data: Partial<SalesOrder> & { save_customer?: boolean }
) => {
    return api.put<any, SalesOrder>(`/orders/${id}`, data);
};

export const settleOrder = (id: number, data: any) => {
    return api.post<any, SalesOrder>(`/orders/${id}/settle`, data);
};

export const completeAfterSalesOrder = (id: number, data?: { completed_note?: string }) => {
    return api.post<any, SalesOrder>(`/after-sales/orders/${id}/complete`, data || {});
};

export const updateAfterSalesOrderAdjustment = (id: number, data: any) => {
    return api.put<any, SalesOrder>(`/after-sales/orders/${id}/adjustment`, data);
};

export const cancelOrder = (
    id: number,
    data: { refund_confirmed?: boolean; cancel_reason?: string }
) => {
    return api.post<any, SalesOrder>(`/orders/${id}/cancel`, data);
};

export const markOrderRefunded = (id: number, data?: { refund_note?: string }) => {
    return api.post<any, SalesOrder>(`/orders/${id}/refund`, data || {});
};
