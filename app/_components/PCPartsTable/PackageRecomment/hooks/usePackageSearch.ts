import { useState } from 'react';
import { Package } from '../types';

export function usePackageSearch(packages: Package[]) {
    const [searchQuery, setSearchQuery] = useState('');

    const filteredPackages = packages.filter((pkg) => {
        if (!searchQuery.trim()) return true;
        const query = searchQuery.toLowerCase();

        // 搜索套餐名称
        if (pkg.name.toLowerCase().includes(query)) return true;

        // 搜索套餐描述
        if (pkg.description?.toLowerCase().includes(query)) return true;

        // 搜索产品名称
        return pkg.items.some((item) => item.product_name.toLowerCase().includes(query));
    });

    return {
        searchQuery,
        setSearchQuery,
        filteredPackages,
    };
}
