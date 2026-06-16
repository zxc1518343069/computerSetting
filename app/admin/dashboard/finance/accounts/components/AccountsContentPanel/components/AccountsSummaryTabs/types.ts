export type AccountSummaryType = 'supplier' | 'logistics' | 'customer';

export interface AccountNavigationActions {
    showSupplierDetails: (supplierId?: number | null) => void;
    showLogisticsDetails: (companyId?: number | null) => void;
    showCustomerDetails: (customerId?: number | null, customerKey?: string | null) => void;
}
