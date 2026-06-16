import { formatPrice } from '@/utils';
import { DatePicker, Form, Input, InputNumber, Modal, Select } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ReadonlyCell } from '../ReadonlyCell';
import type { MerchantRefund } from '../../../../../types';

interface MerchantRefundSettlementModalProps {
    target: MerchantRefund | null;
    form: FormInstance;
    loading: boolean;
    submit: () => Promise<void>;
    close: () => void;
}

export function MerchantRefundSettlementModal({
    target,
    form,
    loading,
    submit,
    close,
}: MerchantRefundSettlementModalProps) {
    const settlementType = Form.useWatch('settlement_type', form) as string | undefined;

    return (
        <Modal
            title={target ? `登记 FK-${target.id} 结算` : '登记商家返款结算'}
            open={Boolean(target)}
            onCancel={close}
            onOk={submit}
            confirmLoading={loading}
            destroyOnHidden
            width={620}
        >
            <Form form={form} layout="vertical" className="pt-4">
                {target && (
                    <div className="mb-4 rounded-2xl border border-gray-100 bg-gray-50/70 p-4 dark:border-gray-800 dark:bg-black/20">
                        <div className="grid grid-cols-2 gap-3">
                            <ReadonlyCell
                                label="返款金额"
                                value={formatPrice(target.amount)}
                                strong
                            />
                            <ReadonlyCell
                                label="已结算"
                                value={formatPrice(target.settled_amount)}
                            />
                            <ReadonlyCell
                                label="待结算"
                                value={formatPrice(target.pending_amount)}
                                strong
                            />
                        </div>
                    </div>
                )}
                <Form.Item
                    name="settlement_type"
                    label="结算方式"
                    rules={[{ required: true, message: '请选择结算方式' }]}
                >
                    <Select
                        options={[
                            { label: '实际收款', value: 'cash' },
                            { label: '抵扣应付', value: 'payable_offset' },
                        ]}
                    />
                </Form.Item>
                <Form.Item
                    name="amount"
                    label="本次结算金额"
                    rules={[{ required: true, message: '请输入本次结算金额' }]}
                >
                    <InputNumber
                        min={0.01}
                        max={target?.pending_amount}
                        precision={2}
                        prefix="¥"
                        className="w-full"
                    />
                </Form.Item>
                {settlementType === 'cash' && (
                    <Form.Item name="account" label="收款账号">
                        <Input />
                    </Form.Item>
                )}
                <Form.Item
                    name="settled_at"
                    label="结算时间"
                    rules={[{ required: true, message: '请选择结算时间' }]}
                >
                    <DatePicker showTime className="w-full" />
                </Form.Item>
                <Form.Item name="note" label="备注">
                    <Input.TextArea rows={3} />
                </Form.Item>
            </Form>
        </Modal>
    );
}
