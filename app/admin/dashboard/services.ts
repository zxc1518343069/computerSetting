/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import {
    InboundOrder,
    InventoryItem,
    OperatingCost,
    Product,
    SalesOrder,
    Supplier,
} from '@/const/types';

export const fetchSuppliers = (params?: { search?: string }) => {
    return api.get<any, Supplier[]>('/suppliers', { params });
};

export const fetchDashboardProducts = (params?: { search?: string; category?: string }) => {
    return api.get<any, Product[]>('/products', { params });
};

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

export const fetchSalesProducts = (params?: { search?: string; category?: string }) => {
    return api.get<any, SalesProduct[]>('/sales-products', { params });
};

export const saveSupplier = (data: Partial<Supplier>, id?: number) => {
    if (id) {
        return api.put<any, Supplier>(`/suppliers/${id}`, data);
    }
    return api.post<any, Supplier>('/suppliers', data);
};

export const deleteSupplier = (id: number) => {
    return api.delete<any, void>(`/suppliers/${id}`);
};

export const fetchInboundOrders = () => {
    return api.get<any, InboundOrder[]>('/inbound-orders');
};

export const saveInboundOrder = (data: any) => {
    return api.post<any, InboundOrder>('/inbound-orders', data);
};

export const updateInboundOrder = (id: number, data: Partial<InboundOrder>) => {
    return api.put<any, InboundOrder>(`/inbound-orders/${id}`, data);
};

export const returnInboundOrder = (id: number) => {
    return api.post<any, void>(`/inbound-orders/${id}/return`);
};

export const fetchInventoryItems = (params?: {
    product_id?: number;
    status?: string;
    category?: string;
    search?: string;
}) => {
    return api.get<any, InventoryItem[]>('/inventory-items', { params });
};

export const fetchOrders = (params?: { search?: string; status?: string }) => {
    return api.get<any, SalesOrder[]>('/orders', { params });
};

export interface AccountsOverview {
    payables: Array<{
        id: number;
        supplier_id?: number;
        supplier_name: string;
        line_count: number;
        total_quantity: number;
        goods_amount: number;
        shipping_fee: number;
        misc_fee: number;
        amount: number;
        inbound_at?: string;
        note?: string | null;
        created_at?: string;
    }>;
    receivables: Array<{
        id: number;
        order_no: string;
        customer_name: string;
        customer_phone?: string | null;
        line_count: number;
        total_quantity: number;
        amount: number;
        status: SalesOrder['status'];
        created_at?: string;
    }>;
    summary: {
        payable_count: number;
        receivable_count: number;
        payable_amount: number;
        receivable_amount: number;
    };
}

export const fetchAccountsOverview = () => {
    return api.get<any, AccountsOverview>('/accounts');
};

export const updateAccountPayment = (type: 'payable' | 'receivable', id: number, isPaid = true) => {
    return api.put<any, void>(`/accounts/${type}/${id}`, { is_paid: isPaid });
};

export const saveOrder = (data: any) => {
    return api.post<any, SalesOrder>('/orders', data);
};

export const updateOrder = (id: number, data: Partial<SalesOrder>) => {
    return api.put<any, SalesOrder>(`/orders/${id}`, data);
};

export const settleOrder = (id: number, data: any) => {
    return api.post<any, SalesOrder>(`/orders/${id}/settle`, data);
};

export const fetchOperatingCosts = (params?: {
    search?: string;
    type?: string;
    month?: string;
}) => {
    return api.get<any, OperatingCost[]>('/operating-costs', { params });
};

export const saveOperatingCost = (data: Partial<OperatingCost>, id?: number) => {
    if (id) {
        return api.put<any, OperatingCost>(`/operating-costs/${id}`, data);
    }
    return api.post<any, OperatingCost>('/operating-costs', data);
};

export const deleteOperatingCost = (id: number) => {
    return api.delete<any, void>(`/operating-costs/${id}`);
};
