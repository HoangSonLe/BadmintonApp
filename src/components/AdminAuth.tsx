import React, { useState } from 'react';
import { Modal, Input, Button, Typography, Space, Alert } from 'antd';
import { LockOutlined, KeyOutlined } from '@ant-design/icons';
import { SecurityService } from '../services/securityService';

const { Title, Text } = Typography;

interface AdminAuthProps {
  visible: boolean;
  onSuccess: () => void;
  onCancel: () => void;
}

const AdminAuth: React.FC<AdminAuthProps> = ({ visible, onSuccess, onCancel }) => {
  const [adminCode, setAdminCode] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Mã admin từ environment variable
  const ADMIN_CODE = import.meta.env.VITE_ADMIN_CODE || 'admin123';

  const handleSubmit = () => {
    setLoading(true);
    setError('');

    // Simulate authentication delay
    setTimeout(() => {
      if (SecurityService.verifyAdmin(adminCode.trim())) {
        // Set admin session using SecurityService
        SecurityService.setAdminSession();
        onSuccess();
        setAdminCode('');
      } else {
        setError('🚨 Mã admin không đúng! Hành động này đã được ghi lại.');
      }
      setLoading(false);
    }, 500);
  };

  const handleCancel = () => {
    setAdminCode('');
    setError('');
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSubmit();
    }
  };

  return (
    <Modal
      title={
        <div style={{ textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <div style={{
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(135deg, #ff4d4f 0%, #ff7875 100%)',
              borderRadius: '50%',
              color: 'white',
              fontSize: '24px',
              margin: '0 auto'
            }}>
              <LockOutlined />
            </div>
            <Title level={3} style={{ margin: 0, color: '#ff4d4f' }}>
              Xác thực Admin
            </Title>
          </Space>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      centered
      width={400}
      maskClosable={false}
      closable={true}
    >
      <Space direction="vertical" size="large" style={{ width: '100%', marginTop: '16px' }}>
        <Alert
          message="Yêu cầu quyền Admin"
          description="Để truy cập các tính năng quản trị (Cài đặt, Dữ liệu, Demo DB), vui lòng nhập mã admin."
          type="warning"
          showIcon
          style={{
            background: 'linear-gradient(135deg, #fff7e6 0%, #ffd591 100%)',
            border: '1px solid #ffa940',
            borderRadius: '8px'
          }}
        />

        <div>
          <Text strong style={{ color: '#595959', marginBottom: '8px', display: 'block' }}>
            Mã Admin:
          </Text>
          <Input.Password
            value={adminCode}
            onChange={(e) => setAdminCode(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Nhập mã admin"
            prefix={<KeyOutlined style={{ color: '#bfbfbf' }} />}
            size="large"
            autoFocus
            style={{
              borderRadius: '8px'
            }}
          />
          {error && (
            <Text type="danger" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
              {error}
            </Text>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <Button
            onClick={handleCancel}
            size="large"
            style={{
              borderRadius: '8px',
              minWidth: '80px'
            }}
          >
            Hủy
          </Button>
          <Button
            type="primary"
            onClick={handleSubmit}
            loading={loading}
            disabled={!adminCode.trim()}
            size="large"
            style={{
              borderRadius: '8px',
              minWidth: '80px',
              background: 'linear-gradient(135deg, #1890ff 0%, #40a9ff 100%)',
              border: 'none'
            }}
          >
            Xác thực
          </Button>
        </div>

        {/* <div style={{ textAlign: 'center', marginTop: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            💡 Mã admin mặc định: <code>{ADMIN_CODE}</code>
          </Text>
        </div> */}
      </Space>
    </Modal>
  );
};

export default AdminAuth;
