import { getDb } from '@/lib/db';
import { serializePricingConfig } from '@/lib/db/serializers';
import { error, success } from '@/lib/request/apiResponse';
import { NextRequest } from 'next/server';

export async function GET() {
    try {
        const db = getDb();
        const row = db.prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1').get() as
            | Parameters<typeof serializePricingConfig>[0]
            | undefined;

        if (!row) {
            return success(
                {
                    unifiedPricing: true,
                    unifiedRate: 0,
                    roundingType: 'none',
                    cpu: 0,
                    motherboard: 0,
                    ram: 0,
                    gpu: 0,
                    storage: 0,
                    psu: 0,
                    case: 0,
                    cooling: 0,
                    monitor: 0,
                },
                '获取默认溢价配置成功'
            );
        }

        return success(serializePricingConfig(row), '获取溢价配置成功');
    } catch (e) {
        console.error('Get pricing config error:', e);
        return error(500, '获取溢价配置失败');
    }
}

export async function POST(request: NextRequest) {
    try {
        const db = getDb();
        const config = await request.json();

        const {
            unifiedPricing,
            unifiedRate,
            cpu,
            motherboard,
            ram,
            gpu,
            storage,
            psu,
            case: caseRate,
            cooling,
            monitor,
            roundingType,
        } = config;

        const existing = db
            .prepare('SELECT id FROM pricing_config ORDER BY id DESC LIMIT 1')
            .get() as { id: number } | undefined;

        if (existing) {
            db.prepare(
                `
                UPDATE pricing_config
                SET unified_pricing = @unified_pricing,
                    unified_rate = @unified_rate,
                    rounding_type = @rounding_type,
                    cpu_rate = @cpu_rate,
                    motherboard_rate = @motherboard_rate,
                    ram_rate = @ram_rate,
                    gpu_rate = @gpu_rate,
                    storage_rate = @storage_rate,
                    psu_rate = @psu_rate,
                    case_rate = @case_rate,
                    cooling_rate = @cooling_rate,
                    monitor_rate = @monitor_rate,
                    updated_at = CURRENT_TIMESTAMP
                WHERE id = @id
            `
            ).run({
                id: existing.id,
                unified_pricing: unifiedPricing ? 1 : 0,
                unified_rate: unifiedRate || 0,
                rounding_type: roundingType || 'none',
                cpu_rate: cpu || 0,
                motherboard_rate: motherboard || 0,
                ram_rate: ram || 0,
                gpu_rate: gpu || 0,
                storage_rate: storage || 0,
                psu_rate: psu || 0,
                case_rate: caseRate || 0,
                cooling_rate: cooling || 0,
                monitor_rate: monitor || 0,
            });
        }

        const row = db
            .prepare('SELECT * FROM pricing_config ORDER BY id DESC LIMIT 1')
            .get() as Parameters<typeof serializePricingConfig>[0];

        return success(serializePricingConfig(row), '溢价配置已保存');
    } catch (e) {
        console.error('Update pricing config error:', e);
        return error(500, '保存溢价配置失败');
    }
}
