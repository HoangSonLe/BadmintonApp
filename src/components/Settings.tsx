import React, { useState } from 'react';
import { Card, Form, InputNumber, Button, Typography, Switch, Input, Alert } from 'antd';
import { HomeOutlined, UserOutlined, DollarOutlined, ControlOutlined, LockOutlined, EnvironmentOutlined, ShopOutlined, InfoCircleOutlined } from '@ant-design/icons';
import type { AppSettings } from '../types';
import CustomLabel from './CustomLabel';

const { Title } = Typography;

interface SettingsProps {
  settings: AppSettings;
  onSettingsChange: (settings: AppSettings) => Promise<void>;
}

const Settings: React.FC<SettingsProps> = ({ settings, onSettingsChange }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: AppSettings) => {
    setLoading(true);
    try {
      await onSettingsChange(values);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="fade-in-up">
      <div style={{
        display: 'flex',
        alignItems: 'center',
        marginBottom: '24px',
        gap: '16px'
      }}>
        <div style={{
          width: '44px',
          height: '44px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #722ed1 0%, #9254de 100%)',
          borderRadius: '12px',
          color: 'white',
          fontSize: '22px',
          boxShadow: '0 4px 12px rgba(114, 46, 209, 0.3)'
        }}>
          <ControlOutlined />
        </div>
        <Title level={2} className="mb-0" style={{
          color: '#722ed1',
          fontSize: '26px',
          fontWeight: 600,
          lineHeight: 1.2,
          marginTop: '2px'
        }}>
          Cài đặt hệ thống
        </Title>
      </div>

      <Alert
        message="📋 Lưu ý về cài đặt"
        description="Các thay đổi cài đặt chỉ áp dụng cho tuần đang được đăng ký hiện tại, không ảnh hưởng đến các tuần đã đăng ký trước đó."
        type="info"
        showIcon
        icon={<InfoCircleOutlined />}
        style={{ marginBottom: '24px' }}
      />

      <Form
        form={form}
        layout="vertical"
        initialValues={settings}
        onFinish={handleSubmit}
        className="max-w-md"
      >
        <Form.Item
          label={
            <CustomLabel icon={<HomeOutlined />}>
              Số sân mặc định
            </CustomLabel>
          }
          name="courtsCount"
          rules={[
            { required: true, message: 'Vui lòng nhập số sân!' },
            { type: 'number', min: 1, message: 'Số sân phải lớn hơn 0!' }
          ]}
        >
          <InputNumber
            min={1}
            size="large"
            style={{ width: '100%' }}
            placeholder="Nhập số sân mặc định"
          />
        </Form.Item>

        <Form.Item
          label={
            <CustomLabel icon={<UserOutlined />}>
              Số người/sân
            </CustomLabel>
          }
          name="playersPerCourt"
          rules={[
            { required: true, message: 'Vui lòng nhập số người/sân!' },
            { type: 'number', min: 1, message: 'Số người/sân phải lớn hơn 0!' }
          ]}
        >
          <InputNumber
            min={1}
            size="large"
            style={{ width: '100%' }}
            placeholder="Nhập số người/sân"
          />
        </Form.Item>

        <Form.Item
          label={
            <CustomLabel icon={<DollarOutlined />}>
              Phí thuê thêm sân (VNĐ)
            </CustomLabel>
          }
          name="extraCourtFee"
          rules={[
            { required: true, message: 'Vui lòng nhập phí thuê thêm sân!' },
            { type: 'number', min: 0, message: 'Phí không được âm!' }
          ]}
        >
          <InputNumber<number>
            min={0}
            step={1000}
            size="large"
            style={{ width: '100%' }}
            placeholder="Nhập phí thuê thêm sân"
            formatter={value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
            parser={value => parseInt(value!.replace(/\$\s?|(,*)/g, ''), 10) || 0}
          />
        </Form.Item>

        <Form.Item
          label={
            <CustomLabel icon={<ShopOutlined />}>
              Tên sân cầu lông
            </CustomLabel>
          }
          name="courtName"
        >
          <Input
            size="large"
            placeholder="Nhập tên sân cầu lông"
          />
        </Form.Item>

        <Form.Item
          label={
            <CustomLabel icon={<EnvironmentOutlined />}>
              Địa chỉ sân
            </CustomLabel>
          }
          name="courtAddress"
        >
          <Input.TextArea
            size="large"
            rows={3}
            placeholder="Nhập địa chỉ sân cầu lông"
          />
        </Form.Item>

        <Form.Item
          name="registrationEnabled"
          label={
            <CustomLabel icon={<LockOutlined />}>
              Trạng thái đăng ký
            </CustomLabel>
          }
          valuePropName="checked"
        >
          <Switch
            checkedChildren="Mở"
            unCheckedChildren="Khóa"
            size="default"
          />
        </Form.Item>

        <Form.Item>
          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
          >
            {loading ? 'Đang lưu...' : 'Lưu cài đặt'}
          </Button>
        </Form.Item>
      </Form>
    </Card>
  );
};

export default Settings;
