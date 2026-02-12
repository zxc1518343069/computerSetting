import { error, success } from '@/lib/request/apiResponse';
import { supabase } from '@/lib/supabase';
import { NextRequest } from 'next/server';

// GET - 获取溢价配置
export async function GET() {
    try {
        const { data, error: fetchError } = await supabase
            .from('pricing_config')
            .select('*')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
            // PGRST116 是 "no rows returned" 错误
            throw fetchError;
        }

        if (!data) {
            // 如果没有配置,返回默认值
            return success(
                {
                    unifiedPricing: true,
                    unifiedRate: 0,
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

        return success(
            {
                unifiedPricing: data.unified_pricing,
                unifiedRate: parseFloat(data.unified_rate),
                cpu: parseFloat(data.cpu_rate),
                motherboard: parseFloat(data.motherboard_rate),
                ram: parseFloat(data.ram_rate),
                gpu: parseFloat(data.gpu_rate),
                storage: parseFloat(data.storage_rate),
                psu: parseFloat(data.psu_rate),
                case: parseFloat(data.case_rate),
                cooling: parseFloat(data.cooling_rate),
                monitor: parseFloat(data.monitor_rate),
                roundingType: data.rounding_type,
            },
            '获取溢价配置成功'
        );
    } catch (e) {
        console.error('Get pricing config error:', e);
        return error(500, '获取溢价配置失败');
    }
}

// POST/PUT - 更新溢价配置
export async function POST(request: NextRequest) {
    try {
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
            roundingType,
        } = config;

        // 检查是否已存在配置
        const { data: existingConfig } = await supabase
            .from('pricing_config')
            .select('id')
            .order('id', { ascending: false })
            .limit(1)
            .single();

        let result;
        if (existingConfig) {
            // 更新现有配置
            const { data, error: updateError } = await supabase
                .from('pricing_config')
                .update({
                    unified_pricing: unifiedPricing,
                    unified_rate: unifiedRate,
                    cpu_rate: cpu,
                    motherboard_rate: motherboard,
                    ram_rate: ram,
                    gpu_rate: gpu,
                    storage_rate: storage,
                    psu_rate: psu,
                    case_rate: caseRate,
                    cooling_rate: cooling,
                    rounding_type: roundingType,
                    updated_at: new Date().toISOString(),
                })
                .eq('id', existingConfig.id)
                .select()
                .single();

            if (updateError) throw updateError;
            result = data;
        } else {
            // 创建新配置
            const { data, error: insertError } = await supabase
                .from('pricing_config')
                .insert([
                    {
                        unified_pricing: unifiedPricing,
                        unified_rate: unifiedRate,
                        cpu_rate: cpu,
                        motherboard_rate: motherboard,
                        ram_rate: ram,
                        gpu_rate: gpu,
                        storage_rate: storage,
                        psu_rate: psu,
                        case_rate: caseRate,
                        cooling_rate: cooling,
                        rounding_type: roundingType,
                    },
                ])
                .select()
                .single();

            if (insertError) throw insertError;
            result = data;
        }

        return success(result, '溢价配置已保存');
    } catch (e) {
        console.error('Update pricing config error:', e);
        return error(500, '保存溢价配置失败');
    }
}
