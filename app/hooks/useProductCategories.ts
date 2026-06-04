'use client';

import { fetchProductCategories } from '@/app/services/categories';
import { ProductCategory } from '@/const/types';
import { useRequest } from 'ahooks';
import { useMemo } from 'react';

export const CATEGORY_TAG_COLOR_CLASS: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800',
    purple: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-300 dark:border-purple-800',
    orange: 'bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-900/20 dark:text-orange-300 dark:border-orange-800',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-900/20 dark:text-cyan-300 dark:border-cyan-800',
    magenta: 'bg-pink-50 text-pink-600 border-pink-100 dark:bg-pink-900/20 dark:text-pink-300 dark:border-pink-800',
    gold: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800',
    red: 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800',
    lime: 'bg-lime-50 text-lime-600 border-lime-100 dark:bg-lime-900/20 dark:text-lime-300 dark:border-lime-800',
    geekblue: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-300 dark:border-indigo-800',
    volcano: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-300 dark:border-rose-800',
};

export const CATEGORY_TAG_COLORS = Object.keys(CATEGORY_TAG_COLOR_CLASS);

export const getCategoryTagClass = (color?: string | null) =>
    CATEGORY_TAG_COLOR_CLASS[color || ''] ||
    'bg-slate-50 text-slate-600 border-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

export const useProductCategories = (options?: { includeInactive?: boolean }) => {
    const includeInactive = options?.includeInactive ?? true;
    const {
        data: categories = [],
        loading,
        refresh,
    } = useRequest(() => fetchProductCategories({ includeInactive }), {
        refreshDeps: [includeInactive],
    });

    const activeCategories = useMemo(
        () => categories.filter((category) => category.is_active),
        [categories]
    );

    const categoryOptions = useMemo(
        () =>
            activeCategories.map((category) => ({
                label: category.label || category.name,
                value: category.id,
            })),
        [activeCategories]
    );

    const categoryMap = useMemo(
        () =>
            categories.reduce<Record<number, ProductCategory>>((acc, category) => {
                acc[category.id] = category;
                return acc;
            }, {}),
        [categories]
    );

    const categoryCodeMap = useMemo(
        () =>
            categories.reduce<Record<string, ProductCategory>>((acc, category) => {
                if (category.code) acc[category.code] = category;
                return acc;
            }, {}),
        [categories]
    );

    return {
        categories,
        activeCategories,
        categoryOptions,
        categoryMap,
        categoryCodeMap,
        loading,
        refresh,
    };
};
