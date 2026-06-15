export type SalesPaymentStatus = 'unpaid' | 'paid' | 'refund_pending' | 'refunded';
export type SalesDeliveryStatus = 'undelivered' | 'delivered' | 'cancelled';
export type SalesOrderSourceType = 'diy' | 'retail' | 'after_sales' | 'manual';

const paymentStatuses = new Set<SalesPaymentStatus>([
    'unpaid',
    'paid',
    'refund_pending',
    'refunded',
]);

const deliveryStatuses = new Set<SalesDeliveryStatus>(['undelivered', 'delivered', 'cancelled']);
const sourceTypes = new Set<SalesOrderSourceType>(['diy', 'retail', 'after_sales', 'manual']);

export const normalizeSalesPaymentStatus = (
    value: unknown,
    fallback: SalesPaymentStatus = 'unpaid'
): SalesPaymentStatus => {
    const status = String(value || '');
    return paymentStatuses.has(status as SalesPaymentStatus)
        ? (status as SalesPaymentStatus)
        : fallback;
};

export const normalizeSalesDeliveryStatus = (
    value: unknown,
    fallback: SalesDeliveryStatus = 'undelivered'
): SalesDeliveryStatus => {
    const status = String(value || '');
    return deliveryStatuses.has(status as SalesDeliveryStatus)
        ? (status as SalesDeliveryStatus)
        : fallback;
};

export const normalizeSalesOrderSourceType = (
    value: unknown,
    fallback: SalesOrderSourceType = 'manual'
): SalesOrderSourceType => {
    const sourceType = String(value || '');
    return sourceTypes.has(sourceType as SalesOrderSourceType)
        ? (sourceType as SalesOrderSourceType)
        : fallback;
};

export const inferSalesOrderSourceType = (source: unknown): SalesOrderSourceType => {
    if (source === 'frontend_quote') return 'diy';
    if (source === 'frontend_retail') return 'retail';
    return 'manual';
};

export const salesOrderSourceTypeLabels: Record<SalesOrderSourceType, string> = {
    diy: 'DIY整机',
    retail: '零售',
    after_sales: '售后服务',
    manual: '手动/其他',
};

export const legacyOrderStatusFromDeliveryStatus = (status: SalesDeliveryStatus) => {
    if (status === 'delivered') return 'completed';
    if (status === 'cancelled') return 'cancelled';
    return 'pending';
};

export const legacyPaidFromPaymentStatus = (status: SalesPaymentStatus) =>
    status === 'paid' || status === 'refund_pending';

export const legacyPaymentStatusFromPaid = (
    isPaid: unknown,
    deliveryStatus: SalesDeliveryStatus
): SalesPaymentStatus => {
    if (!Boolean(isPaid)) return 'unpaid';
    return deliveryStatus === 'cancelled' ? 'refund_pending' : 'paid';
};

export const legacyDeliveryStatusFromOrderStatus = (status: unknown): SalesDeliveryStatus => {
    if (status === 'completed') return 'delivered';
    if (status === 'cancelled') return 'cancelled';
    return 'undelivered';
};

export const resolveSalesOrderStatuses = (row: Record<string, unknown>) => {
    const deliveryFallback = legacyDeliveryStatusFromOrderStatus(row.status);
    const deliveryStatus = normalizeSalesDeliveryStatus(row.delivery_status, deliveryFallback);
    const paymentFallback = legacyPaymentStatusFromPaid(row.is_paid, deliveryStatus);
    const paymentStatus = normalizeSalesPaymentStatus(row.payment_status, paymentFallback);

    return {
        paymentStatus,
        deliveryStatus,
    };
};

export const isValidSalesStatusCombination = (
    paymentStatus: SalesPaymentStatus,
    deliveryStatus: SalesDeliveryStatus
) => {
    if (deliveryStatus === 'cancelled') {
        return ['unpaid', 'refund_pending', 'refunded'].includes(paymentStatus);
    }

    return paymentStatus === 'unpaid' || paymentStatus === 'paid';
};
