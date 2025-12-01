import { Spin } from 'antd';

export function LoadingState() {
    return (
        <div className="flex flex-col items-center justify-center py-12">
            <Spin size="large" />
            <p className="text-gray-600 font-medium text-sm mt-4">加载套餐中...</p>
        </div>
    );
}
