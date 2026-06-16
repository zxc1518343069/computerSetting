import { useRequest } from 'ahooks';
import { Button, Tabs } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { fetchAccountsOverview } from '../../../../../../services';
import { emptyAccountsOverview } from '../../../../types';
import type { AccountNavigationActions, AccountSummaryType } from './types';
import { CustomerAccountsTable } from './components/CustomerAccountsTable';
import { LogisticsAccountsTable } from './components/LogisticsAccountsTable';
import { SupplierAccountsTable } from './components/SupplierAccountsTable';

interface SummaryFilterValues {
    supplierFilter: number | null;
    logisticsCompanyFilter: number | null;
    customerFilter: number | null;
    customerKeyFilter: string | null;
}

const emptySummaryFilters: SummaryFilterValues = {
    supplierFilter: null,
    logisticsCompanyFilter: null,
    customerFilter: null,
    customerKeyFilter: null,
};

interface InitialSummaryState {
    activeKey: AccountSummaryType;
    filters: SummaryFilterValues;
}

interface AccountsSummaryTabsProps {
    navigationActions: AccountNavigationActions;
    onSettled: () => void;
}

export interface AccountsSummaryTabsRef {
    refresh: () => void;
}

export const AccountsSummaryTabs = forwardRef<AccountsSummaryTabsRef, AccountsSummaryTabsProps>(
    function AccountsSummaryTabs({ navigationActions, onSettled }, ref) {
        const [activeKey, setActiveKey] = useState<AccountSummaryType>('supplier');
        const [filters, setFilters] = useState<SummaryFilterValues>(emptySummaryFilters);
        const [tableResetKey, setTableResetKey] = useState(0);

        useEffect(() => {
            const initialState = getInitialSummaryState();

            setActiveKey(initialState.activeKey);
            setFilters(initialState.filters);
        }, []);

        const {
            data = emptyAccountsOverview,
            loading,
            refresh,
        } = useRequest(fetchAccountsOverview, {
            refreshDeps: [
                activeKey,
                filters.supplierFilter,
                filters.logisticsCompanyFilter,
                filters.customerFilter,
                filters.customerKeyFilter,
            ],
        });
        const refreshSummaryTabs = () => {
            setTableResetKey((key) => key + 1);
            refresh();
        };

        useImperativeHandle(ref, () => ({ refresh: refreshSummaryTabs }));

        const supplierAccounts = filters.supplierFilter
            ? data.supplier_accounts.filter((item) => item.supplier_id === filters.supplierFilter)
            : data.supplier_accounts;
        const logisticsAccounts = filters.logisticsCompanyFilter
            ? data.logistics_accounts.filter(
                  (item) => item.company_id === filters.logisticsCompanyFilter
              )
            : data.logistics_accounts;
        const customerAccounts = filters.customerFilter
            ? data.customer_accounts.filter((item) => item.customer_id === filters.customerFilter)
            : filters.customerKeyFilter
              ? data.customer_accounts.filter(
                    (item) => item.customer_key === filters.customerKeyFilter
                )
              : data.customer_accounts;
        const hasActiveFilter = Boolean(
            filters.supplierFilter ||
                filters.logisticsCompanyFilter ||
                filters.customerFilter ||
                filters.customerKeyFilter
        );
        const clearFilters = () => setFilters(emptySummaryFilters);

        return (
            <Tabs
                key={tableResetKey}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as AccountSummaryType)}
                tabBarExtraContent={
                    hasActiveFilter ? (
                        <Button size="small" onClick={clearFilters}>
                            清除筛选
                        </Button>
                    ) : null
                }
                items={[
                    {
                        key: 'supplier',
                        label: `应付商家 ${supplierAccounts.length}`,
                        children: (
                            <SupplierAccountsTable
                                loading={loading}
                                data={supplierAccounts}
                                navigationActions={navigationActions}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'logistics',
                        label: `应付物流 ${logisticsAccounts.length}`,
                        children: (
                            <LogisticsAccountsTable
                                loading={loading}
                                data={logisticsAccounts}
                                navigationActions={navigationActions}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'customer',
                        label: `应收客户 ${customerAccounts.length}`,
                        children: (
                            <CustomerAccountsTable
                                loading={loading}
                                data={customerAccounts}
                                navigationActions={navigationActions}
                                onSettled={onSettled}
                            />
                        ),
                    },
                ]}
            />
        );
    }
);

function isAccountSummaryType(value: string | null): value is AccountSummaryType {
    return value === 'supplier' || value === 'logistics' || value === 'customer';
}

function getInitialSummaryState(): InitialSummaryState {
    const params = new URLSearchParams(window.location.search);
    const nextType = params.get('type');
    const supplierId = Number(params.get('supplier_id') || 0);
    const companyId = Number(params.get('logistics_company_id') || params.get('company_id') || 0);
    const customerId = Number(params.get('customer_id') || 0);
    const customerKey = params.get('customer_key');
    const activeKey = isAccountSummaryType(nextType) ? nextType : getSummaryTypeFromParams(params);

    return {
        activeKey,
        filters: getSummaryFilters({ supplierId, companyId, customerId, customerKey }),
    };
}

function getSummaryTypeFromParams(params: URLSearchParams): AccountSummaryType {
    if (params.get('customer_id') || params.get('customer_key')) return 'customer';
    if (params.get('logistics_company_id') || params.get('company_id')) return 'logistics';
    return 'supplier';
}

function getSummaryFilters({
    supplierId,
    companyId,
    customerId,
    customerKey,
}: {
    supplierId: number;
    companyId: number;
    customerId: number;
    customerKey: string | null;
}): SummaryFilterValues {
    if (customerId || customerKey) {
        return {
            ...emptySummaryFilters,
            customerFilter: customerId || null,
            customerKeyFilter: customerId ? null : customerKey,
        };
    }
    if (companyId) return { ...emptySummaryFilters, logisticsCompanyFilter: companyId };
    if (supplierId) return { ...emptySummaryFilters, supplierFilter: supplierId };

    return emptySummaryFilters;
}
