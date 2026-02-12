import { PricingConfig, Product } from '@/const';

export type { Product, PricingConfig };

export interface PackageItem {
    id?: number;
    product_id: number;
    quantity: number;
    product_name?: string;
    product_price?: number;
    product_category?: string;
    custom_name?: string;
    custom_price?: number;
    // Frontend specific for EditableTable
    category?: string; // Used in EditablePartRow, but PackageItem from API might not have it directly on root or it's product_category
}

export interface EditablePartRow extends Omit<PackageItem, 'id'> {
    id: string;
    category: string;
}

export interface Package {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
    created_at: string;
    updated_at: string;
}

export interface PackageQueryParams {
    search?: string;
    id?: string;
}

export interface PackageModalRef {
    open: (mode: 'create' | 'edit' | 'view', pkg?: Package) => void;
    close: () => void;
}

export interface PackageFormValues {
    name: string;
    description: string;
    items: PackageItem[];
}
