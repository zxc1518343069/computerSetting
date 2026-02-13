import { useRequest } from 'ahooks';
import { message } from 'antd';
import { useState } from 'react';
import { deleteProductService, fetchProductsService } from '../services';
import { ProductQueryParams } from '../types';
import { useAuth } from '@/app/_components/AuthProvider';
import { MOCK_PRODUCTS } from '@/const/mockData';

export const useProductList = () => {
    const { isLoggedIn } = useAuth();
    // 合并搜索状态
    const [queryParams, setQueryParams] = useState<ProductQueryParams>({});

    // 获取列表数据
    const {
        data: products = isLoggedIn ? [] : MOCK_PRODUCTS,
        loading,
        refresh,
    } = useRequest(() => fetchProductsService(queryParams), {
        ready: isLoggedIn, // 仅在登录时发起请求
        refreshDeps: [queryParams], // 依赖变化自动请求
        debounceWait: 300,
        onError: (error) => {
            message.error(error.message);
        },
    });

    // 删除逻辑
    const { runAsync: deleteProduct, loading: deleteLoading } = useRequest(deleteProductService, {
        manual: true,
        onSuccess: () => {
            message.success('产品删除成功');
            refresh(); // 刷新当前列表
        },
        onError: (error) => {
            if (error.message === 'IN_USE') {
                message.warning('该产品正在被某个套餐使用，无法删除');
            } else {
                message.error(error.message);
            }
        },
    });

    // 搜索操作
    const handleSearch = (key: keyof ProductQueryParams, value: string | undefined) => {
        setQueryParams((prev) => ({ ...prev, [key]: value }));
    };

    // 重置操作
    const handleReset = () => {
        setQueryParams({});
    };

    return {
        products,
        loading: isLoggedIn ? loading : false,
        queryParams,
        handleSearch, // 统一的搜索处理函数
        handleReset,
        deleteProduct,
        deleteLoading,
        refresh,
    };
};
