/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    AfterSalesCategory,
    AfterSalesNotice,
    AfterSalesPriceType,
    AfterSalesService,
    AfterSalesServiceListResponse,
    SalesOrder,
} from '@/const/types';
import api from '@/lib/request/axios';

export interface AfterSalesServicePayload {
    code?: string | null;
    category_id: number;
    name: string;
    description?: string | null;
    price_type: AfterSalesPriceType;
    price?: number | null;
    price_label?: string;
    unit?: string | null;
    includes?: string | null;
    excludes?: string | null;
    sort_order?: number;
    is_featured?: boolean;
    is_active?: boolean;
}

export interface AfterSalesCategoryPayload {
    code?: string | null;
    name: string;
    description?: string | null;
    sort_order?: number;
    is_active?: boolean;
}

export interface AfterSalesNoticePayload {
    code?: string | null;
    content: string;
    sort_order?: number;
    is_active?: boolean;
}

export interface AfterSalesServiceQuery {
    includeInactive?: boolean;
    keyword?: string;
    categoryId?: number;
    status?: 'active' | 'inactive';
}

export interface AfterSalesCheckoutPayload {
    customer_id?: number | null;
    customer_name?: string | null;
    customer_phone?: string | null;
    save_customer?: boolean;
    handler_user_id?: number | null;
    note?: string | null;
    device_model?: string | null;
    fault_description?: string | null;
    service_note?: string | null;
    final_amount?: number | null;
    services: Array<{
        service_id: number;
        quantity: number;
        sale_price?: number | null;
        note?: string | null;
        name?: string;
        price_label?: string;
    }>;
    total_amount?: number;
}

export interface AfterSalesOrderResponse extends SalesOrder {
    checkout_no: string;
}

export const fetchPublicAfterSalesServices = () => {
    return api.get<any, AfterSalesServiceListResponse>('/after-sales/services');
};

export const submitAfterSalesCheckout = (data: AfterSalesCheckoutPayload) => {
    return api.post<any, AfterSalesOrderResponse>('/after-sales/orders', data);
};

export const createAfterSalesOrder = submitAfterSalesCheckout;

export const fetchAdminAfterSalesServices = (params?: AfterSalesServiceQuery) => {
    return api.get<any, AfterSalesService[]>('/after-sales/admin/services', { params });
};

export const createAfterSalesService = (data: AfterSalesServicePayload) => {
    return api.post<any, AfterSalesService>('/after-sales/admin/services', data);
};

export const updateAfterSalesService = (id: number, data: AfterSalesServicePayload) => {
    return api.put<any, AfterSalesService>(`/after-sales/admin/services/${id}`, data);
};

export const deleteAfterSalesService = (id: number) => {
    return api.delete<any, void>(`/after-sales/admin/services/${id}`);
};

export const fetchAdminAfterSalesCategories = (params?: { includeInactive?: boolean }) => {
    return api.get<any, AfterSalesCategory[]>('/after-sales/admin/categories', { params });
};

export const createAfterSalesCategory = (data: AfterSalesCategoryPayload) => {
    return api.post<any, AfterSalesCategory>('/after-sales/admin/categories', data);
};

export const updateAfterSalesCategory = (id: number, data: AfterSalesCategoryPayload) => {
    return api.put<any, AfterSalesCategory>(`/after-sales/admin/categories/${id}`, data);
};

export const deleteAfterSalesCategory = (id: number) => {
    return api.delete<any, void>(`/after-sales/admin/categories/${id}`);
};

export const fetchAdminAfterSalesNotices = (params?: { includeInactive?: boolean }) => {
    return api.get<any, AfterSalesNotice[]>('/after-sales/admin/notices', { params });
};

export const createAfterSalesNotice = (data: AfterSalesNoticePayload) => {
    return api.post<any, AfterSalesNotice>('/after-sales/admin/notices', data);
};

export const updateAfterSalesNotice = (id: number, data: AfterSalesNoticePayload) => {
    return api.put<any, AfterSalesNotice>(`/after-sales/admin/notices/${id}`, data);
};

export const deleteAfterSalesNotice = (id: number) => {
    return api.delete<any, void>(`/after-sales/admin/notices/${id}`);
};
