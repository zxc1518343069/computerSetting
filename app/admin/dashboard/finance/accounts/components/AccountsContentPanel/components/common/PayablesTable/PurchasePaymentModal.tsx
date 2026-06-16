import { formatPrice } from '@/utils';
import { DatePicker, Form, Input, InputNumber, Modal } from 'antd';
import type { FormInstance } from 'antd/es/form';
import { ReadonlyCell } from '../ReadonlyCell';
import type { Payable } from '../../../../../types';

interface PurchasePaymentModalProps {
    target: Payable | null;
    form: FormInstance;
    loading: boolean;
    submit: () => Promise<void>;
    close: () => void;
}

export function PurchasePaymentModal({
    target,
    form,
    loading,
    submit,
    close,
}: PurchasePaymentModalProps) {
    return (
        <Modal
            title={target ? `登记 JH-${target.id} 付款` : '登记付款'}
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
                                label="商家应付款"
                                value={formatPrice(target.payable_amount)}
                                strong
                            />
                            <ReadonlyCell
                                label="待付款"
                                value={formatPrice(target.pending_payment)}
                                strong
                            />
                        </div>
                    </div>
                )}
                <Form.Item
                    name="amount"
                    label="本次付款金额"
                    rules={[{ required: true, message: '请输入本次付款金额' }]}
                >
                    <InputNumber
                        min={0.01}
                        max={target?.pending_payment}
                        precision={2}
                        prefix="¥"
                        className="w-full"
                    />
                </Form.Item>
                <Form.Item name="payment_account" label="付款账号">
                    <Input />
                </Form.Item>
                <Form.Item
                    name="paid_at"
                    label="付款时间"
                    rules={[{ required: true, message: '请选择付款时间' }]}
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
