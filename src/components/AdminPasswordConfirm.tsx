import React, { useState } from 'react';
import { Modal, Input, Button, Alert, Space } from 'antd';
import { LockOutlined, WarningOutlined } from '@ant-design/icons';
import { SecurityService } from '../services/securityService';

interface AdminPasswordConfirmProps {
  visible: boolean;
  title: string;
  description: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}

const AdminPasswordConfirm: React.FC<AdminPasswordConfirmProps> = ({
  visible,
  title,
  description,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [verifying, setVerifying] = useState(false);

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError('Vui lòng nhập mật khẩu admin');
      return;
    }

    setVerifying(true);
    setError('');

    try {
      // Verify admin password using Firebase
      const isValid = await SecurityService.verifyAdminCode(password);
      
      if (isValid) {
        // Log the password verification
        SecurityService.logAdminAction('ADMIN_PASSWORD_VERIFIED', {
          action: 'DANGEROUS_OPERATION_CONFIRMED',
          operation: title,
          verifiedAt: new Date().toISOString()
        });

        // Clear password and close modal
        setPassword('');
        setError('');
        onConfirm();
      } else {
        setError('Mật khẩu admin không đúng!');
        
        // Log failed verification
        SecurityService.logSecurityEvent('ADMIN_PASSWORD_VERIFICATION_FAILED', {
          operation: title,
          attemptedAt: new Date().toISOString(),
          userAgent: navigator.userAgent,
          url: window.location.href
        });
      }
    } catch (error) {
      setError('Lỗi khi xác thực mật khẩu: ' + (error as Error).message);
    } finally {
      setVerifying(false);
    }
  };

  const handleCancel = () => {
    setPassword('');
    setError('');
    onCancel();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm();
    }
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: '#ff4d4f' }} />
          <span>Xác nhận mật khẩu Admin</span>
        </Space>
      }
      open={visible}
      onCancel={handleCancel}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={verifying || loading}>
          Hủy
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          onClick={handleConfirm}
          loading={verifying || loading}
          disabled={!password.trim()}
        >
          Xác nhận
        </Button>
      ]}
      width={500}
      maskClosable={false}
      keyboard={false}
    >
      <div style={{ marginBottom: 16 }}>
        <Alert
          message={title}
          description={description}
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
        />
        
        <div style={{ marginBottom: 16 }}>
          <label style={{ 
            display: 'block', 
            marginBottom: 8, 
            fontWeight: 600,
            color: '#ff4d4f'
          }}>
            Nhập lại mật khẩu Admin để xác nhận:
          </label>
          <Input.Password
            prefix={<LockOutlined />}
            placeholder="Mật khẩu Admin"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError(''); // Clear error when typing
            }}
            onKeyPress={handleKeyPress}
            size="large"
            autoFocus
            disabled={verifying || loading}
          />
        </div>

        {error && (
          <Alert
            message={error}
            type="error"
            showIcon
            style={{ marginBottom: 16 }}
          />
        )}

        <Alert
          message="⚠️ Cảnh báo bảo mật"
          description="Hành động này sẽ được ghi log đầy đủ cho mục đích audit và bảo mật. Chỉ thực hiện nếu bạn hoàn toàn chắc chắn."
          type="info"
          showIcon
        />
      </div>
    </Modal>
  );
};

export default AdminPasswordConfirm;
