/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Customer, SalesOrder } from '@/const/types';
import api from '@/lib/request/axios';

export { fetchCustomers } from '@/app/services/customers';

export interface CustomerOrderSummary {
    id: number;
    order_no: string;
    customer_name: string;
    customer_phone?: string | null;
    final_amount: number;
    cost_amount: number;
    profit_amount: number;
    status: SalesOrder['status'];
    payment_status: SalesOrder['payment_status'];
    delivery_status: SalesOrder['delivery_status'];
    is_paid: boolean;
    line_count: number;
    total_quantity: number;
    created_at?: string;
    sold_at?: string | null;
    delivered_at?: string | null;
}

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
