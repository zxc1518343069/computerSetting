import { useRequest } from 'ahooks';
import { App } from 'antd'; // Import App to use its context hook
import { useState } from 'react';
import { deletePackageService, fetchPackagesService } from '../services';
import { PackageQueryParams } from '../types';
import { useAuth } from '@/app/_components/AuthProvider';
import { MOCK_PACKAGES } from '@/const/mockData';

export const usePackageList = () => {
    const { isLoggedIn } = useAuth();
    const [queryParams, setQueryParams] = useState<PackageQueryParams>({});
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const { message } = App.useApp(); // Get message instance from App context

    const {
        data: packages = isLoggedIn ? [] : MOCK_PACKAGES,
        loading,
        refresh,
    } = useRequest(() => fetchPackagesService(queryParams), {
        ready: isLoggedIn, // 仅在登录时发起请求
        refreshDeps: [queryParams],
        debounceWait: 300,
        onError: (error) => {
            message.error(error.message);
        },
    });

    const { runAsync: deletePackage } = useRequest(deletePackageService, {
        manual: true,
        onBefore: ([id]) => {
            setDeletingId(id);
        },
        onSuccess: () => {
            message.success('删除成功');
            refresh();
        },
        onError: (error) => {
            message.error(error.message);
        },
        onFinally: () => {
            setDeletingId(null);
        },
    });

    const handleSearch = (key: keyof PackageQueryParams, value: string) => {
        setQueryParams((prev) => ({ ...prev, [key]: value }));
    };

    const handleReset = () => {
        setQueryParams({});
    };

    return {
        packages,
        loading: isLoggedIn ? loading : false,
        queryParams,
        deletingId,
        handleSearch,
        handleReset,
        deletePackage,
        refresh,
    };
};
