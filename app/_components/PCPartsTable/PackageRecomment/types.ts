export interface PackageItem {
    id: number;
    product_id: number;
    quantity: number;
    product_name: string;
    product_price: number;
    product_category: string;
}

export interface Package {
    id: number;
    name: string;
    description: string;
    total_price: number;
    items: PackageItem[];
}
