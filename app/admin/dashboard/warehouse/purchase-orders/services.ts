/* eslint-disable @typescript-eslint/no-explicit-any */
import type {
    PurchaseMerchantRefund,
    PurchaseMerchantRefundContext,
    PurchaseOrder,
    PurchaseReturn,
} from '@/const/types';
import api from '@/lib/request/axios';

export {
    createPurchaseMerchantRefundSettlement,
    createPurchasePayment,
} from '../../_services/purchaseOrders';
export { createPurchaseReturnRefund } from '../../_services/purchaseReturns';
export {
    fetchDashboardProducts,
    fetchInboundOrders,
    fetchLogisticsCompanies,
    fetchPurchaseOrders,
    fetchPurchaseReturns,
    fetchSuppliers,
    receivePurchaseOrder,
} from '../_services';

export const savePurchaseOrder = (data: any, id?: number) => {
    if (id) {
        return api.put<any, PurchaseOrder>(`/purchase-orders/${id}`, data);
    }
    return api.post<any, PurchaseOrder>('/purchase-orders', data);
};

export const cancelPurchaseOrder = (id: number) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/cancel`);
};

export const confirmPurchaseOrder = (id: number) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/confirm`);
};

export const voidPurchasePayment = (id: number, paymentId: number, void_reason: string) => {
    return api.post<any, PurchaseOrder>(`/purchase-orders/${id}/payments/${paymentId}/void`, {
        void_reason,
    });
};

export const fetchPurchaseMerchantRefundContext = (id: number) => {
    return api.get<any, PurchaseMerchantRefundContext>(
        `/purchase-orders/${id}/merchant-refunds/context`
    );
};

export const createPurchaseMerchantRefund = (id: number, data: any) => {
    return api.post<any, PurchaseMerchantRefund>(`/purchase-orders/${id}/merchant-refunds`, data);
};

export const voidPurchaseMerchantRefund = (id: number, refundId: number, void_reason: string) => {
    return api.post<any, PurchaseMerchantRefund>(
        `/purchase-orders/${id}/merchant-refunds/${refundId}/void`,
        { void_reason }
    );
};

export const fetchInboundOrderReturnableItems = (id: number) => {
    return api.get<any, any>(`/inbound-orders/${id}/returnable-items`);
};

export const createPurchaseReturn = (data: any) => {
    return api.post<any, PurchaseReturn>('/purchase-returns', data);
};

export const updatePurchaseReturn = (id: number, data: any) => {
    return api.put<any, PurchaseReturn>(`/purchase-returns/${id}`, data);
};

export const shipPurchaseReturn = (id: number, data: any) => {
    return api.post<any, PurchaseReturn>(`/purchase-returns/${id}/ship`, data);
};

export const receivePurchaseReturnByMerchant = (id: number, data: any) => {
    return api.post<any, PurchaseReturn>(`/purchase-returns/${id}/merchant-receive`, data);
};

export const cancelPurchaseReturn = (id: number, data: any) => {
    return api.post<any, PurchaseReturn>(`/purchase-returns/${id}/cancel`, data);
};
