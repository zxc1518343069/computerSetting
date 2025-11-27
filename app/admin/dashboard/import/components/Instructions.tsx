import React from 'react';
import { Alert, Space } from 'antd';
import { InfoCircleOutlined } from '@ant-design/icons';

export const Instructions: React.FC = () => {
    return (
        <Alert
            message={
                <Space align="center" className="mb-2">
                    <InfoCircleOutlined />
                    <span className="font-semibold">使用说明</span>
                </Space>
            }
            description={
                <ul className="list-disc pl-5 space-y-1 text-gray-600">
                    <li>首次使用请先下载模板，了解所需的数据格式。</li>
                    <li>
                        模板包含8个工作表，分别对应：CPU、主板、内存、显卡、存储、电源、机箱、散热器。
                    </li>
                    <li>每个工作表需包含&ldquo;产品名称&rdquo;和&ldquo;产品价格&rdquo;两列。</li>
                    <li>请确保价格为数字格式，产品名称不为空。</li>
                    <li>上传成功后，系统将自动解析并批量添加产品数据。</li>
                </ul>
            }
            type="info"
            showIcon={false}
            className="rounded-xl border-blue-100 bg-blue-50/50 p-6"
        />
    );
};
