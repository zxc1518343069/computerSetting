import { Customer } from '@/const/types';
import { OrderHandlerUser } from '@/app/admin/dashboard/services';
import { Checkbox, Form, FormInstance, Input, InputNumber, Modal, Segmented, Select } from 'antd';
import React from 'react';

interface RetailOrderModalProps {
    open: boolean;
    form: FormInstance;
    saving?: boolean;
    customers: Customer[];
    handlerUsers: OrderHandlerUser[];
    loadingHandlerUsers?: boolean;
    onCancel: () => void;
    onOk: () => void;
}

export function RetailOrderModal({
    open,
    form,
    saving,
    customers,
    handlerUsers,
    loadingHandlerUsers,
    onCancel,
    onOk,
}: RetailOrderModalProps) {
    const customerSource = Form.useWatch('customer_source', form) || 'new';
    const shouldSaveCustomer = Form.useWatch('save_customer', form);

    const customerOptions = customers.map((customer) => ({
        label: `${customer.name} / ${customer.phone}`,
        value: customer.id,
    }));

    const handlerUserOptions = handlerUsers.map((user) => ({
        label: user.username,
        value: user.id,
    }));

    return (
        <Modal
            title="保存零售订单"
            open={open}
            onCancel={onCancel}
            onOk={onOk}
            confirmLoading={saving}
            destroyOnHidden
            width={680}
        >
            <Form form={form} layout="vertical" className="pt-4">
                <Form.Item name="customer_source" label="客户来源">
                    <Segmented
                        options={[
                            { label: '已有客户', value: 'existing' },
                            { label: '新客户', value: 'new' },
                        ]}
                    />
                </Form.Item>
                {customerSource === 'existing' ? (
                    <Form.Item
                        name="customer_id"
                        label="选择客户"
                        rules={[{ required: true, message: '请选择客户' }]}
                    >
                        <Select
                            showSearch
                            placeholder="请选择已有客户"
                            optionFilterProp="label"
                            options={customerOptions}
                            onChange={(id) => {
                                const customer = customers.find((item) => item.id === id);
                                form.setFieldsValue({
                                    customer_name: customer?.name,
                                    customer_phone: customer?.phone,
                                });
                            }}
                        />
                    </Form.Item>
                ) : (
                    <>
                        <Form.Item
                            name="customer_name"
                            label="客户名称"
                            rules={[{ required: true, message: '请输入客户名称' }]}
                        >
                            <Input placeholder="请输入客户名称" />
                        </Form.Item>
                        <Form.Item
                            name="customer_phone"
                            label="手机号"
                            rules={[
                                {
                                    required: Boolean(shouldSaveCustomer),
                                    message: '保存客户信息时请输入手机号',
                                },
                            ]}
                        >
                            <Input placeholder="保存客户信息时必填" />
                        </Form.Item>
                        <Form.Item name="save_customer" valuePropName="checked">
                            <Checkbox>是否保存客户信息</Checkbox>
                        </Form.Item>
                    </>
                )}
                <Form.Item
                    name="handler_user_id"
                    label="经手人"
                    rules={[{ required: true, message: '请选择经手人' }]}
                >
                    <Select
                        showSearch
                        placeholder="请选择经手人"
                        loading={loadingHandlerUsers}
                        optionFilterProp="label"
                        options={handlerUserOptions}
                    />
                </Form.Item>
                <Form.Item
                    name="final_amount"
                    label="最终成交金额"
                    rules={[{ required: true, message: '请输入最终成交金额' }]}
                >
                    <InputNumber min={0} precision={2} prefix="¥" className="w-full" />
                </Form.Item>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} placeholder="订单备注" />
                </Form.Item>
                <div className="text-xs text-gray-400">
                    保存后不会扣减库存，需在后台订单列表中结算并绑定具体库存物品。
                </div>
            </Form>
        </Modal>
    );
}
