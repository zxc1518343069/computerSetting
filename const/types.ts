export interface Product {
    id: number;
    category: string;
    name: string;
    barcode?: string | null;
    price: number;
    stock_quantity?: number;
    selling_price?: number | null;
    is_use_premium?: boolean;
    created_at?: string;
    updated_at?: string;
}

export interface PricingConfig {
    id?: number;
    unifiedPricing: boolean;
    unifiedRate: number;
    roundingType: 'none' | 'integer' | 'ten';
    cpu: number;
    motherboard: number;
    ram: number;
    gpu: number;
    storage: number;
    psu: number;
    case: number;
    cooling: number;
    monitor: number;
    created_at?: string;
    updated_at?: string;
}

// 兼容旧代码的别名
export type PricingConfigFrontend = PricingConfig;

export interface Package {
    id: number;
    name: string;
    description?: string;
    total_price: number;
    items: PackageItem[];
    created_at: string;
    updated_at: string;
}

export interface PackageItem {
    id?: number;
    package_id?: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
    custom_name?: string;
    custom_price?: number;
    created_at?: string;
}

export interface Supplier {
    id: number;
    name: string;
    contact_name?: string | null;
    phone?: string | null;
    address?: string | null;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface InventoryItem {
    id: number;
    product_id: number;
    supplier_id?: number | null;
    supplier_name?: string | null;
    inbound_order_id?: number | null;
    inbound_order_item_id?: number | null;
    cost_price: number;
    serial_number?: string | null;
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    inbound_at?: string;
    status: 'in_stock' | 'sold' | 'returned';
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    product?: Product;
}

export interface InboundOrder {
    id: number;
    supplier_id: number;
    shipping_fee: number;
    misc_fee: number;
    is_paid: boolean;
    inbound_at: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
    supplier?: Supplier;
    items?: InboundOrderItem[];
}

export interface InboundOrderItem {
    id: number;
    inbound_order_id: number;
    product_id: number;
    quantity: number;
    purchase_price: number;
    warranty_enabled?: boolean;
    warranty_until?: string | null;
    note?: string | null;
    created_at?: string;
    product?: Product;
    inventory_items?: InventoryItem[];
}

export interface SalesOrder {
    id: number;
    order_no: string;
    customer_name: string;
    customer_phone?: string | null;
    original_amount: number;
    final_amount: number;
    discount_amount: number;
    cost_amount: number;
    profit_amount: number;
    status: 'pending' | 'completed' | 'cancelled';
    is_paid?: boolean;
    source?: string | null;
    note?: string | null;
    sold_at?: string | null;
    created_at?: string;
    updated_at?: string;
    items?: SalesOrderItem[];
}

export interface SalesOrderItem {
    id: number;
    order_id: number;
    product_id: number;
    product_name: string;
    product_category: string;
    quantity: number;
    cost_price?: number | null;
    sale_price: number;
    created_at?: string;
    product?: Product;
    inventory_bindings?: OrderInventoryItem[];
}

export interface OrderInventoryItem {
    id: number;
    order_id: number;
    order_item_id: number;
    inventory_item_id: number;
    cost_price: number;
    created_at?: string;
    inventory_item?: InventoryItem;
}

export interface OperatingCost {
    id: number;
    type: 'rent' | 'salary' | 'utilities' | 'misc' | 'shipping' | 'purchase_misc';
    name: string;
    amount: number;
    cost_date: string;
    note?: string | null;
    created_at?: string;
    updated_at?: string;
}

export interface AdminUser {
    id: number;
    username: string;
    password_hash: string;
    created_at?: string;
    updated_at?: string;
}

export interface Game {
    id: string | number;
    name: string;
    icon: string;
    type: 'online' | 'single';
}

// 带category字段的Product接口 (兼容旧代码)
export interface ProductWithCategory extends Product {
    category: string;
}
