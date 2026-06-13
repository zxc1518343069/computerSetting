import { EditablePartRow } from '@/app/admin/dashboard/packages/types';
import { useMemo, useState } from 'react';

const createRetailRowId = () => {
    if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
        return `retail-${crypto.randomUUID()}`;
    }
    return `retail-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const createEmptyRetailRow = (): EditablePartRow => ({
    id: createRetailRowId(),
    category: '',
    product_id: 0,
    quantity: 1,
});

export function useRetailTableControl() {
    const [tableData, setTableData] = useState<EditablePartRow[]>(() => [createEmptyRetailRow()]);
    const [discountedPrice, setDiscountedPrice] = useState<number>(0);

    const handleAddRow = () => {
        setTableData((prev) => [...prev, createEmptyRetailRow()]);
    };

    const handleTableDataChange = (id: string, changes: Partial<EditablePartRow>) => {
        setTableData((prev) =>
            prev.map((item) => {
                if (item.id !== id) return item;

                const nextItem = { ...item, ...changes };
                if (changes.category && changes.category !== item.category) {
                    nextItem.product_id = 0;
                    nextItem.custom_name = undefined;
                    nextItem.custom_price = undefined;
                }

                return nextItem;
            })
        );
    };

    const handleRemoveRow = (id: string) => {
        setTableData((prev) => {
            const nextItems = prev.filter((item) => item.id !== id);
            return nextItems.length > 0 ? nextItems : [createEmptyRetailRow()];
        });
    };

    const handleReset = () => {
        setTableData([createEmptyRetailRow()]);
        setDiscountedPrice(0);
    };

    const validProductItems = useMemo(
        () => tableData.filter((item) => item.product_id && item.product_id > 0),
        [tableData]
    );

    return {
        tableData,
        setTableData,
        validProductItems,
        discountedPrice,
        setDiscountedPrice,
        handleAddRow,
        handleTableDataChange,
        handleRemoveRow,
        handleReset,
    };
}
