import { Tag } from 'antd';
import type { Receivable } from '../../../../../types';

export function SourceTypeTag({ sourceType }: { sourceType: Receivable['source_type'] }) {
    const map = {
        diy: { label: 'DIY整机', color: 'blue' },
        retail: { label: '零售', color: 'green' },
        after_sales: { label: '售后服务', color: 'cyan' },
        manual: { label: '手动/其他', color: 'default' },
    } as const;
    const config = map[sourceType] || map.manual;
    return <Tag color={config.color}>{config.label}</Tag>;
}

export function DeliveryStatusTag({
    status,
    sourceType,
}: {
    status: Receivable['delivery_status'];
    sourceType: Receivable['source_type'];
}) {
    const map =
        sourceType === 'after_sales'
            ? {
                  undelivered: { label: '未完成', color: 'orange' },
                  delivered: { label: '已完成', color: 'green' },
                  cancelled: { label: '已取消', color: 'default' },
              }
            : {
                  undelivered: { label: '未交付', color: 'orange' },
                  delivered: { label: '已交付', color: 'green' },
                  cancelled: { label: '已取消', color: 'default' },
              };
    const config = map[status] || map.undelivered;
    return <Tag color={config.color}>{config.label}</Tag>;
}
