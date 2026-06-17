/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    LogisticsRecord,
    PurchaseMerchantRefund,
    PurchaseReturn,
    SalesOrder,
} from '@/const/types';
import api from '@/lib/request/axios';

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
    merchant_refund_amount: number;
    merchant_refund_settled_amount: number;
    merchant_refund_pending_amount: number;
    merchant_refund_cash_amount: number;
    merchant_refund_offset_amount: number;
    net_paid: number;
    pending_payment: number;
    pending_refund: number;
    amount: number;
    payment_status: string;
    ordered_at?: string;
    note?: string | null;
    created_at?: string;
}

export interface AccountMerchantRefundDetail {
    id: number;
    purchase_order_id: number;
    supplier_id?: number;
    supplier_name: string;
    contact_name?: string | null;
    phone?: string | null;
    type: PurchaseMerchantRefund['type'];
    status: PurchaseMerchantRefund['status'];
    amount: number;
    settled_amount: number;
    pending_amount: number;
    cash_amount: number;
    offset_amount: number;
    reason?: string | null;
    occurred_at?: string;
    created_at?: string;
}

export interface AccountPurchaseReturnRefundDetail {
    id: number;
    purchase_order_id: number;
    inbound_order_id: number;
    supplier_id?: number;
    supplier_name: string;
    contact_name?: string | null;
    phone?: string | null;
    item_count: number;
    amount: number;
    return_amount: number;
    shipping_fee: number;
    merchant_shipping_fee: number;
    receivable_amount: number;
    refunded_amount: number;
    pending_refund: number;
    goods_status: PurchaseReturn['goods_status'];
    refund_status: PurchaseReturn['refund_status'];
    reason: string;
    created_at?: string;
}

export interface AccountReceivableDetail {
    id: number;
    customer_id?: number | null;
    customer_key: string;
    order_no: string;
    customer_name: string;
    customer_phone?: string | null;
    source_type: SalesOrder['source_type'];
    source_type_label?: string;
    line_count: number;
    total_quantity: number;
    detail_summary?: string;
    amount: number;
    status: SalesOrder['status'];
    payment_status: SalesOrder['payment_status'];
    delivery_status: SalesOrder['delivery_status'];
    created_at?: string;
}

export type AccountLogisticsPayableDetail = LogisticsRecord;

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
        merchant_refund_amount: number;
        merchant_refund_settled_amount: number;
        merchant_refund_pending_amount: number;
        merchant_refund_cash_amount: number;
        merchant_refund_offset_amount: number;
        latest_ordered_at?: string;
        latest_return_at?: string;
        latest_merchant_refund_at?: string;
        orders: AccountPayableDetail[];
        returns: AccountPurchaseReturnRefundDetail[];
        merchant_refunds: AccountMerchantRefundDetail[];
    }>;
    logistics_accounts: Array<{
        company_id?: number | null;
        company_name: string;
        contact?: string | null;
        record_count: number;
        payable_amount: number;
        latest_occurred_at?: string;
        records: AccountLogisticsPayableDetail[];
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
    logistics_payables: AccountLogisticsPayableDetail[];
    purchase_return_refunds: AccountPurchaseReturnRefundDetail[];
    merchant_refunds: AccountMerchantRefundDetail[];
    receivables: AccountReceivableDetail[];
    summary: {
        merchant_payable_count: number;
        merchant_payable_amount: number;
        logistics_payable_count: number;
        logistics_payable_amount: number;
        payable_count: number;
        refund_count: number;
        merchant_refund_count: number;
        receivable_count: number;
        payable_amount: number;
        refund_amount: number;
        merchant_refund_amount: number;
        receivable_amount: number;
    };
}

export const fetchAccountsOverview = () => {
    return api.get<any, AccountsOverview>('/accounts');
};

export const updateAccountPayment = (
    type: 'payable' | 'purchase-return-refund' | 'receivable',
    id: number,
    isPaid = true
) => {
    return api.put<any, void>(`/accounts/${type}/${id}`, { is_paid: isPaid });
};
