import { useRequest } from 'ahooks';
import { Product } from '../types';
import { fetchPricingConfigService } from '../services';

export const usePricing = () => {
    // 获取定价配置
    const { data: config, loading } = useRequest(fetchPricingConfigService);

    // 计算售价
    const getSellingPriceInfo = (product: Product) => {
        if (!config) return { price: product.price, rate: 0 };

        let rate = 0;
        if (config.unifiedPricing) {
            rate = config.unifiedRate;
        } else {
            // 动态获取分类对应的溢价率
            // 注意：确保 config 中的 key 类型安全，这里做简单映射
            const categoryRateMap: Record<string, number> = {
                cpu: config.cpu,
                motherboard: config.motherboard,
                ram: config.ram,
                gpu: config.gpu,
                storage: config.storage,
                psu: config.psu,
                case: config.case,
                cooling: config.cooling,
            };
            rate = categoryRateMap[product.category] || 0;
        }

        const finalPrice = product.price * (1 + rate / 100);
        return { price: finalPrice, rate };
    };

    return {
        config,
        loading,
        getSellingPriceInfo,
    };
};
