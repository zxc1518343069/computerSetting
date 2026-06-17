import { useRequest } from 'ahooks';
import { Button, Tabs } from 'antd';
import { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import { fetchAccountsOverview } from '@/app/admin/dashboard/finance/accounts/services';
import { emptyAccountsOverview } from '../../../../types';
import { LogisticsPayablesTable } from '../common/LogisticsPayablesTable';
import { MerchantRefundsTable } from '../common/MerchantRefundsTable';
import { PayablesTable } from '../common/PayablesTable';
import { ReceivablesTable } from '../common/ReceivablesTable';
import { ReturnRefundsTable } from '../common/ReturnRefundsTable';
import type {
    AccountDetailFilterValues,
    AccountDetailNavigationIntent,
    AccountDetailType,
} from './types';

const emptyDetailFilters: AccountDetailFilterValues = {
    supplierFilter: null,
    logisticsCompanyFilter: null,
    customerFilter: null,
    customerKeyFilter: null,
};

interface DetailState {
    activeKey: AccountDetailType;
    filters: AccountDetailFilterValues;
}

interface AccountsDetailTabsProps {
    navigationIntent?: AccountDetailNavigationIntent | null;
    onSettled: () => void;
}

export interface AccountsDetailTabsRef {
    refresh: () => void;
}

export const AccountsDetailTabs = forwardRef<AccountsDetailTabsRef, AccountsDetailTabsProps>(
    function AccountsDetailTabs({ navigationIntent, onSettled }, ref) {
        const [activeKey, setActiveKey] = useState<AccountDetailType>('payables');
        const [filters, setFilters] = useState<AccountDetailFilterValues>(emptyDetailFilters);
        const [tableResetKey, setTableResetKey] = useState(0);

        useEffect(() => {
            const initialState = getInitialDetailState();

            setActiveKey(initialState.activeKey);
            setFilters(initialState.filters);
        }, []);

        useEffect(() => {
            if (!navigationIntent) return;
            const nextState = getDetailStateFromNavigationIntent(navigationIntent);

            setActiveKey(nextState.activeKey);
            setFilters(nextState.filters);
        }, [navigationIntent]);

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
        const refreshDetailTabs = () => {
            setTableResetKey((key) => key + 1);
            refresh();
        };

        useImperativeHandle(ref, () => ({ refresh: refreshDetailTabs }));

        const payables = filters.supplierFilter
            ? data.payables.filter((item) => item.supplier_id === filters.supplierFilter)
            : data.payables;
        const logisticsPayables = filters.logisticsCompanyFilter
            ? data.logistics_payables.filter(
                  (item) => item.company_id === filters.logisticsCompanyFilter
              )
            : data.logistics_payables;
        const returnRefunds = filters.supplierFilter
            ? data.purchase_return_refunds.filter(
                  (item) => item.supplier_id === filters.supplierFilter
              )
            : data.purchase_return_refunds;
        const merchantRefunds = filters.supplierFilter
            ? data.merchant_refunds.filter((item) => item.supplier_id === filters.supplierFilter)
            : data.merchant_refunds;
        const receivables = filters.customerFilter
            ? data.receivables.filter((item) => item.customer_id === filters.customerFilter)
            : filters.customerKeyFilter
              ? data.receivables.filter((item) => item.customer_key === filters.customerKeyFilter)
              : data.receivables;
        const hasActiveFilter = Boolean(
            filters.supplierFilter ||
                filters.logisticsCompanyFilter ||
                filters.customerFilter ||
                filters.customerKeyFilter
        );
        const clearFilters = () => setFilters(emptyDetailFilters);

        return (
            <Tabs
                key={tableResetKey}
                activeKey={activeKey}
                onChange={(key) => setActiveKey(key as AccountDetailType)}
                tabBarExtraContent={
                    hasActiveFilter ? (
                        <Button size="small" onClick={clearFilters}>
                            清除筛选
                        </Button>
                    ) : null
                }
                items={[
                    {
                        key: 'payables',
                        label: `商家应付 ${payables.length}`,
                        children: (
                            <PayablesTable
                                loading={loading}
                                data={payables}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'logistics_payables',
                        label: `物流待付款 ${logisticsPayables.length}`,
                        children: (
                            <LogisticsPayablesTable
                                loading={loading}
                                data={logisticsPayables}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'return_refunds',
                        label: `退货待收 ${returnRefunds.length}`,
                        children: (
                            <ReturnRefundsTable
                                loading={loading}
                                data={returnRefunds}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'merchant_refunds',
                        label: `商家返款 ${merchantRefunds.length}`,
                        children: (
                            <MerchantRefundsTable
                                loading={loading}
                                data={merchantRefunds}
                                onSettled={onSettled}
                            />
                        ),
                    },
                    {
                        key: 'receivables',
                        label: `销售待收 ${receivables.length}`,
                        children: (
                            <ReceivablesTable
                                loading={loading}
                                data={receivables}
                                onSettled={onSettled}
                            />
                        ),
                    },
                ]}
            />
        );
    }
);

function getInitialDetailState(): DetailState {
    const params = new URLSearchParams(window.location.search);
    const nextType = params.get('type');
    const supplierId = Number(params.get('supplier_id') || 0);
    const companyId = Number(params.get('logistics_company_id') || params.get('company_id') || 0);
    const customerId = Number(params.get('customer_id') || 0);
    const customerKey = params.get('customer_key');
    const filters = getDetailFilters({ supplierId, companyId, customerId, customerKey });

    return {
        activeKey: getDetailTypeFromParams(nextType, filters),
        filters,
    };
}

function getDetailStateFromNavigationIntent(
    navigationIntent: AccountDetailNavigationIntent
): DetailState {
    if (navigationIntent.kind === 'supplier') {
        return {
            activeKey: 'payables',
            filters: { ...emptyDetailFilters, supplierFilter: navigationIntent.supplierId || null },
        };
    }
    if (navigationIntent.kind === 'logistics') {
        return {
            activeKey: 'logistics_payables',
            filters: {
                ...emptyDetailFilters,
                logisticsCompanyFilter: navigationIntent.companyId || null,
            },
        };
    }

    return {
        activeKey: 'receivables',
        filters: {
            ...emptyDetailFilters,
            customerFilter: navigationIntent.customerId || null,
            customerKeyFilter: navigationIntent.customerId
                ? null
                : navigationIntent.customerKey || null,
        },
    };
}

function getDetailTypeFromParams(
    nextType: string | null,
    filters: AccountDetailFilterValues
): AccountDetailType {
    if (nextType === 'customer') return 'receivables';
    if (nextType === 'logistics') return 'logistics_payables';
    if (nextType === 'supplier') return 'payables';
    if (filters.customerFilter || filters.customerKeyFilter) return 'receivables';
    if (filters.logisticsCompanyFilter) return 'logistics_payables';

    return 'payables';
}

function getDetailFilters({
    supplierId,
    companyId,
    customerId,
    customerKey,
}: {
    supplierId: number;
    companyId: number;
    customerId: number;
    customerKey: string | null;
}): AccountDetailFilterValues {
    if (customerId || customerKey) {
        return {
            ...emptyDetailFilters,
            customerFilter: customerId || null,
            customerKeyFilter: customerId ? null : customerKey,
        };
    }
    if (companyId) return { ...emptyDetailFilters, logisticsCompanyFilter: companyId };
    if (supplierId) return { ...emptyDetailFilters, supplierFilter: supplierId };

    return emptyDetailFilters;
}
