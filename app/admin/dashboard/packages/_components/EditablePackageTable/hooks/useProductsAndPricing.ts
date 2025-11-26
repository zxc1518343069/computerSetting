import { useState, useEffect } from 'react';
import { Product, PricingConfigData } from '../types';

export function useProductsAndPricing() {
    const [products, setProducts] = useState<Product[]>([]);
    const [pricingConfig, setPricingConfig] = useState<PricingConfigData | null>(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            setLoading(true);
            try {
                const [productsRes, pricingRes] = await Promise.all([
                    fetch('/api/products'),
                    fetch('/api/pricing'),
                ]);

                const productsData = await productsRes.json();
                const pricingData = await pricingRes.json();

                if (productsData.success) {
                    setProducts(productsData.data);
                }

                if (pricingData) {
                    setPricingConfig({
                        unifiedPricing: pricingData.unifiedPricing,
                        unifiedRate: 1 + pricingData.unifiedRate / 100,
                        cpu: 1 + pricingData.cpu / 100,
                        motherboard: 1 + pricingData.motherboard / 100,
                        ram: 1 + pricingData.ram / 100,
                        gpu: 1 + pricingData.gpu / 100,
                        storage: 1 + pricingData.storage / 100,
                        psu: 1 + pricingData.psu / 100,
                        case: 1 + pricingData.case / 100,
                        cooling: 1 + pricingData.cooling / 100,
                        monitor: 1 + pricingData.monitor / 100,
                    });
                }
            } catch (err) {
                console.error('加载数据失败:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    return { products, pricingConfig, loading };
}
