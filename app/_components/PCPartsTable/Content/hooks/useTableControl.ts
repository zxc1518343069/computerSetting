import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import { PACKAGE_CATEGORIES } from '@/const';
import { useState } from 'react';

// 初始化items数据
const initTableData: EditablePartRow[] = PACKAGE_CATEGORIES.map((cat) => ({
    id: `${cat.key}-1`,
    category: cat.key,
    product_id: 0,
    quantity: 1,
}));

export function useTableControl() {
    const [tableData, setTableData] = useState<EditablePartRow[]>(initTableData);
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);

    const handleTableDataChange = (id: string, changes: Partial<EditablePartRow>) => {
        setTableData((prev) =>
            prev.map((item) => (item.id === id ? { ...item, ...changes } : item))
        );
    };

    // 添加新行
    const handleAddRow = (category: string) => {
        setTableData((prev) => {
            // 找出该类别已有的最大编号
            const categoryItems = prev.filter((item) => item.category === category);
            const maxNum = categoryItems.length;

            // 创建新行
            const newRow: EditablePartRow = {
                id: `${category}-${maxNum + 1}`,
                category: category,
                product_id: 0,
                quantity: 1,
            };

            // 插入到该类别的最后一行之后
            const lastIndex = prev.map((item) => item.category).lastIndexOf(category);
            const newItems = [...prev];
            newItems.splice(lastIndex + 1, 0, newRow);

            return newItems;
        });
    };

    // 删除行
    const handleRemoveRow = (id: string) => {
        setTableData((prev) => prev.filter((item) => item.id !== id));
    };

    // 重置表单
    const handleReset = () => {
        setTableData(initTableData);
        setDiscountedPrice(0);
    };

    return {
        tableData,
        setTableData,
        discountedPrice,
        setDiscountedPrice,
        handleTableDataChange,
        handleAddRow,
        handleRemoveRow,
        handleReset,
    };
}
