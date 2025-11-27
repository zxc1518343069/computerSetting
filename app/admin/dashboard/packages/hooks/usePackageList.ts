import { useState } from 'react';
import { useRequest } from 'ahooks';
import { message } from 'antd';
import { deletePackageService, fetchPackagesService } from '../services';
import { PackageQueryParams } from '../types';

export const usePackageList = () => {
    const [queryParams, setQueryParams] = useState<PackageQueryParams>({});

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
        onSuccess: () => {
            message.success('删除成功');
            refresh();
        },
        onError: (error) => {
            message.error(error.message);
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
        handleSearch,
        handleReset,
        deletePackage,
        refresh,
    };
};
