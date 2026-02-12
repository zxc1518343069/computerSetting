import { useRequest } from 'ahooks';
import { App } from 'antd'; // Import App to use its context hook
import { useState } from 'react';
import { deletePackageService, fetchPackagesService } from '../services';
import { PackageQueryParams } from '../types';

export const usePackageList = () => {
    const [queryParams, setQueryParams] = useState<PackageQueryParams>({});
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const { message } = App.useApp(); // Get message instance from App context

    const {
        data: packages = [],
        loading,
        refresh,
    } = useRequest(() => fetchPackagesService(queryParams), {
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
        loading,
        queryParams,
        deletingId,
        handleSearch,
        handleReset,
        deletePackage,
        refresh,
    };
};
