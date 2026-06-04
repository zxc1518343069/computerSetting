/* eslint-disable @typescript-eslint/no-explicit-any */
import api from '@/lib/request/axios';
import {
    InboundOrder,
    InventoryItem,
    OperatingCost,
    Product,
    PurchaseOrder,
    PurchaseReturn,
    SalesOrder,
    Supplier,
    Customer,
    AdminRole,
} from '@/const/types';

export const fetchSuppliers = (params?: { search?: string }) => {
    return api.get<any, Supplier[]>('/suppliers', { params });
};

export interface CustomerOrderSummary {
    id: number;
    order_no: string;
    customer_name: string;
    customer_phone?: string | null;
    final_amount: number;
    cost_amount: number;
    profit_amount: number;
    status: SalesOrder['status'];
    is_paid: boolean;
    line_count: number;
    total_quantity: number;
    created_at?: string;
    sold_at?: string | null;
}

export const fetchCustomers = (params?: { search?: string }) => {
    return api.get<any, Customer[]>('/customers', { params });
};

export const saveCustomer = (data: Partial<Customer>, id?: number) => {
    if (id) {
        return api.put<any, Customer>(`/customers/${id}`, data);
    }
    return api.post<any, Customer>('/customers', data);
};

export const deleteCustomer = (id: number) => {
    return api.delete<any, void>(`/customers/${id}`);
};

export const fetchCustomerOrders = (id: number) => {
    return api.get<any, CustomerOrderSummary[]>(`/customers/${id}/orders`);
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

export const fetchInboundOrderReturns = (id: number) => {
    return api.get<any, PurchaseReturn[]>(`/inbound-orders/${id}/returns`);
};

export const returnInboundOrder = (
    id: number,
    data: { reason: string; inventory_item_ids?: number[] }
) => {
    return api.post<any, PurchaseReturn>(`/inbound-orders/${id}/returns`, data);
};

export const fetchPurchaseOrders = (params?: { search?: string; status?: string }) => {
    return api.get<any, PurchaseOrder[]>('/purchase-orders', { params });
};

export const fetchPurchaseOrder = (id: number) => {
    return api.get<any, PurchaseOrder>(`/purchase-orders/${id}`);
};

export const savePurchaseOrder = (data: any, id?: number) => {
    if (id) {
        return api.put<any, PurchaseOrder>(`/purchase-orders/${id}`, data);
    }
    return api.post<any, PurchaseOrder>('/purchase-orders', data);
};

export const cancelPurchaseOrder = (id: number) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/cancel`);
};

export const receivePurchaseOrder = (id: number, data: any) => {
    return api.post<any, { inbound_order_id: number; purchase_order: PurchaseOrder }>(
        `/purchase-orders/${id}/receive`,
        data
    );
};

export const createPurchasePayment = (id: number, data: any) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/payments`, data);
};

export const voidPurchasePayment = (id: number, paymentId: number, void_reason: string) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/payments/${paymentId}/void`, {
        void_reason,
    });
};

export const createPurchaseRefund = (id: number, data: any) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/refunds`, data);
};

export const voidPurchaseRefund = (id: number, refundId: number, void_reason: string) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/refunds/${refundId}/void`, {
        void_reason,
    });
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

export interface OrderHandlerUser {
    id: number;
    username: string;
    role: AdminRole;
}

export const fetchActiveAdminUsers = () => {
    return api.get<any, OrderHandlerUser[]>('/admin-users/active');
};

export interface AccountPayableDetail {
    id: number;
    supplier_id?: number;
    supplier_name: string;
    contact_name?: string | null;
    phone?: string | null;
    line_count: number;
    total_quantity: number;
    received_quantity: number;
    remaining_quantity: number;
    goods_amount: number;
    return_amount: number;
    shipping_fee: number;
    misc_fee: number;
    payable_amount: number;
    paid_amount: number;
    refunded_amount: number;
    net_paid: number;
    pending_payment: number;
    pending_refund: number;
    amount: number;
    payment_status: string;
    ordered_at?: string;
    note?: string | null;
    created_at?: string;
}

export interface AccountReceivableDetail {
    id: number;
    customer_id?: number | null;
    customer_key: string;
    order_no: string;
    customer_name: string;
    customer_phone?: string | null;
    line_count: number;
    total_quantity: number;
    amount: number;
    status: SalesOrder['status'];
    created_at?: string;
}

export interface AccountsOverview {
    supplier_accounts: Array<{
        supplier_id?: number;
        supplier_name: string;
        contact_name?: string | null;
        phone?: string | null;
        order_count: number;
        line_count: number;
        payable_amount: number;
        paid_amount: number;
        refunded_amount: number;
        pending_payment: number;
        pending_refund: number;
        latest_ordered_at?: string;
        orders: AccountPayableDetail[];
    }>;
    customer_accounts: Array<{
        customer_key: string;
        customer_id?: number | null;
        customer_name: string;
        customer_phone?: string | null;
        order_count: number;
        line_count: number;
        total_quantity: number;
        receivable_amount: number;
        latest_order_at?: string;
        orders: AccountReceivableDetail[];
    }>;
    payables: AccountPayableDetail[];
    receivables: AccountReceivableDetail[];
    summary: {
        payable_count: number;
        refund_count: number;
        receivable_count: number;
        payable_amount: number;
        refund_amount: number;
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

export const updateOrder = (
    id: number,
    data: Partial<SalesOrder> & { save_customer?: boolean }
) => {
    return api.put<any, SalesOrder>(`/orders/${id}`, data);
};

export const updateOrderConfigAdjustment = (id: number, data: any) => {
    return api.put<any, { id: number }>(`/orders/${id}/config-adjustment`, data);
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
