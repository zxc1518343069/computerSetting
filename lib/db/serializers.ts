import { centsToYuan, yuanToCents } from './money';

export interface ProductRow {
    id: number;
    category: string;
    name: string;
    barcode?: string | null;
    price_cents: number;
    stock_quantity: number;
    selling_price_cents: number | null;
    is_use_premium: number;
    created_at?: string;
    updated_at?: string;
}

export const serializeProduct = (row: ProductRow) => ({
    id: row.id,
    category: row.category,
    name: row.name,
    barcode: row.barcode || null,
    price: centsToYuan(row.price_cents),
    stock_quantity: row.stock_quantity,
    selling_price:
        row.selling_price_cents === null || row.selling_price_cents === undefined
            ? null
            : centsToYuan(row.selling_price_cents),
    is_use_premium: Boolean(row.is_use_premium),
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const serializePricingConfig = (row: {
    id?: number;
    unified_pricing: number;
    unified_rate: number;
    rounding_type?: string;
    cpu_rate: number;
    motherboard_rate: number;
    ram_rate: number;
    gpu_rate: number;
    storage_rate: number;
    psu_rate: number;
    case_rate: number;
    cooling_rate: number;
    monitor_rate: number;
}) => ({
    id: row.id,
    unifiedPricing: Boolean(row.unified_pricing),
    unifiedRate: Number(row.unified_rate || 0),
    roundingType: row.rounding_type || 'none',
    cpu: Number(row.cpu_rate || 0),
    motherboard: Number(row.motherboard_rate || 0),
    ram: Number(row.ram_rate || 0),
    gpu: Number(row.gpu_rate || 0),
    storage: Number(row.storage_rate || 0),
    psu: Number(row.psu_rate || 0),
    case: Number(row.case_rate || 0),
    cooling: Number(row.cooling_rate || 0),
    monitor: Number(row.monitor_rate || 0),
});

export interface InventoryItemRow {
    id: number;
    product_id: number;
    supplier_id?: number | null;
    inbound_order_id?: number | null;
    inbound_order_item_id?: number | null;
    cost_price_cents: number;
    serial_number?: string | null;
    warranty_enabled?: number;
    warranty_until?: string | null;
    inbound_at?: string;
    status: 'in_stock' | 'sold' | 'returned';
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export const serializeInventoryItem = (row: InventoryItemRow) => ({
    id: row.id,
    product_id: row.product_id,
    supplier_id: row.supplier_id,
    inbound_order_id: row.inbound_order_id,
    inbound_order_item_id: row.inbound_order_item_id,
    cost_price: centsToYuan(row.cost_price_cents),
    serial_number: row.serial_number,
    warranty_enabled: Boolean(row.warranty_enabled),
    warranty_until: row.warranty_until,
    inbound_at: row.inbound_at,
    status: row.status,
    note: row.note,
    created_at: row.created_at,
    updated_at: row.updated_at,
});

export const toCents = yuanToCents;
export const toYuan = centsToYuan;
