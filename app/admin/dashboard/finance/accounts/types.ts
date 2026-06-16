import type { AccountsOverview } from '../../services';

export type Payable = AccountsOverview['payables'][number];
export type MerchantRefund = AccountsOverview['merchant_refunds'][number];
export type ReturnRefund = AccountsOverview['purchase_return_refunds'][number];
export type Receivable = AccountsOverview['receivables'][number];
export type LogisticsPayable = AccountsOverview['logistics_payables'][number];
export type SupplierAccount = AccountsOverview['supplier_accounts'][number];
export type LogisticsAccount = AccountsOverview['logistics_accounts'][number];
export type CustomerAccount = AccountsOverview['customer_accounts'][number];

export const emptyAccountsOverview: AccountsOverview = {
    supplier_accounts: [],
    logistics_accounts: [],
    customer_accounts: [],
    payables: [],
    logistics_payables: [],
    purchase_return_refunds: [],
    merchant_refunds: [],
    receivables: [],
    summary: {
        merchant_payable_count: 0,
        merchant_payable_amount: 0,
        logistics_payable_count: 0,
        logistics_payable_amount: 0,
        payable_count: 0,
        refund_count: 0,
        merchant_refund_count: 0,
        receivable_count: 0,
        payable_amount: 0,
        refund_amount: 0,
        merchant_refund_amount: 0,
        receivable_amount: 0,
    },
};
