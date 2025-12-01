import { Empty } from 'antd';

export function EmptyState() {
    return (
        <div className="py-8">
            <Empty description="未找到匹配的套餐" />
        </div>
    );
}
