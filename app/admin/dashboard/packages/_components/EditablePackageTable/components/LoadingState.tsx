import { Spin } from 'antd';

export function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-12 bg-gray-50 rounded-lg">
            <Spin size="large" />
            <p className="text-gray-600 font-medium mt-4">加载产品数据中...</p>
        </div>
    );
}
