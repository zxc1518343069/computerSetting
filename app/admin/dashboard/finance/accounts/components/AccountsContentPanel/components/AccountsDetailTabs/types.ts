export type AccountDetailType =
    | 'payables'
    | 'logistics_payables'
    | 'return_refunds'
    | 'merchant_refunds'
    | 'receivables';

export interface AccountDetailFilterValues {
    supplierFilter: number | null;
    logisticsCompanyFilter: number | null;
    customerFilter: number | null;
    customerKeyFilter: string | null;
}

export type AccountDetailNavigationIntent =
    | {
          kind: 'supplier';
          supplierId?: number | null;
      }
    | {
          kind: 'logistics';
          companyId?: number | null;
      }
    | {
          kind: 'customer';
          customerId?: number | null;
          customerKey?: string | null;
      };
